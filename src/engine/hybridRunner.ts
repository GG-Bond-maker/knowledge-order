/**
 * 混合 Python 执行器（方案 B）
 *
 * 两条执行路径，按代码依赖自动选择：
 *
 *   ① Pyodide（浏览器内）—— 纯 numpy / pandas / matplotlib / scipy
 *      · 零延迟、无需后端、隐私最佳
 *      · 12 篇 30u30 论文走这条路
 *
 *   ② 本地后端（Node → 本地 Python）—— torch / torchvision / gymnasium
 *      · 真正能跑 PyTorch 训练
 *      · 18 篇 30u30 论文走这条路
 *      · 需要本地 .venv-pytorch 已安装依赖
 *
 * 选择策略见 chooseRunner()。
 */

import { runPython as runInPyodide, judgePython } from './pyodideRunner';

/** 只能在后端运行的包（Pyodide 不支持） */
const BACKEND_ONLY_PACKAGES = [
  'torch',
  'torchvision',
  'torchaudio',
  'tensorflow',
  'jax',
  'flax',
  'gym',
  'gymnasium',
  'transformers',
  'datasets',
  'accelerate',
  'peft',
  'triton',
];

/** 执行后端类型 */
export type RunnerKind = 'pyodide' | 'backend';

/** 后端执行结果 */
export interface BackendRunResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
  images: { name: string; dataUrl: string }[];
  durationMs: number;
  killedByTimeout?: boolean;
}

/** 后端环境状态 */
export interface BackendStatus {
  ok: boolean;
  version?: string;
  interpreter?: string | null;
  packages?: Record<string, string | null>;
  error?: string;
  runner?: { running: number; maxConcurrent: number };
}

/**
 * 判断一段代码应该走哪个执行器。
 *
 * 规则：出现 BACKEND_ONLY_PACKAGES 中任一包的 import，就走后端。
 * 使用词边界匹配，避免 "torch" 误匹配 "torchvision" 之类的问题（虽然这里都该走后端）。
 */
export function chooseRunner(code: string): RunnerKind {
  // 匹配 import X / from X import / import X.Y
  const importRe = /(?:^|\n)\s*(?:import|from)\s+([a-zA-Z_][\w.]*)/g;
  let m: RegExpExecArray | null;
  while ((m = importRe.exec(code)) !== null) {
    const top = m[1].split('.')[0].toLowerCase();
    if (BACKEND_ONLY_PACKAGES.includes(top)) return 'backend';
  }
  return 'pyodide';
}

/** 后端状态缓存（避免每次执行都探测） */
let backendStatusCache: BackendStatus | null = null;
let backendStatusPromise: Promise<BackendStatus> | null = null;

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

/**
 * 探测后端 Python 环境（带缓存）。
 * 强制刷新时传 force = true。
 */
export async function getBackendStatus(force = false): Promise<BackendStatus> {
  if (!force && backendStatusCache) return backendStatusCache;
  if (!force && backendStatusPromise) return backendStatusPromise;

  backendStatusPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/python/status`, {
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        const status: BackendStatus = {
          ok: false,
          error: `后端返回 ${res.status}`,
        };
        backendStatusCache = status;
        return status;
      }
      const data = (await res.json()) as BackendStatus;
      backendStatusCache = data;
      return data;
    } catch (e) {
      const status: BackendStatus = {
        ok: false,
        error:
          e instanceof Error && e.name === 'TimeoutError'
            ? '探测超时（后端未启动？）'
            : e instanceof Error
              ? e.message
              : String(e),
      };
      backendStatusCache = status;
      return status;
    } finally {
      backendStatusPromise = null;
    }
  })();

  return backendStatusPromise;
}

/** 清空后端状态缓存 */
export function invalidateBackendStatus(): void {
  backendStatusCache = null;
}

/**
 * 在后端执行 Python 代码。
 */
export async function runInBackend(
  code: string,
  options: { setupCode?: string; timeoutMs?: number } = {},
): Promise<BackendRunResult> {
  try {
    const res = await fetch(`${API_BASE}/python/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        setupCode: options.setupCode,
        timeoutMs: options.timeoutMs,
      }),
      signal: AbortSignal.timeout((options.timeoutMs ?? 30_000) + 10_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        ok: false,
        stdout: '',
        stderr: '',
        error: `后端返回 ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}`,
        images: [],
        durationMs: 0,
      };
    }
    return (await res.json()) as BackendRunResult;
  } catch (e) {
    return {
      ok: false,
      stdout: '',
      stderr: '',
      error:
        e instanceof Error && e.name === 'TimeoutError'
          ? '请求超时（后端可能未启动）'
          : e instanceof Error
            ? e.message
            : String(e),
      images: [],
      durationMs: 0,
    };
  }
}

/**
 * 统一的执行入口：自动选择 Pyodide 或后端。
 *
 * 返回统一结构，便于 UI 直接消费。
 */
export interface UnifiedRunResult {
  ok: boolean;
  runner: RunnerKind;
  stdout: string;
  stderr: string;
  error: string | null;
  images: { name: string; dataUrl: string }[];
  durationMs: number;
  /** Pyodide 专属：结构化结果（DataFrame 等） */
  result?: unknown;
  /** Pyodide 专属：matplotlib 图片 */
  figures?: string[];
}

export async function runPythonSmart(
  code: string,
  options: { setupCode?: string; timeoutMs?: number; namespace?: string } = {},
): Promise<UnifiedRunResult> {
  const kind = chooseRunner(code);

  if (kind === 'pyodide') {
    // Pyodide 路径：setupCode 拼进代码前部（与判分器的语义一致）
    const fullCode = options.setupCode
      ? `${options.setupCode}\n\n${code}`
      : code;
    const r = await runInPyodide(fullCode, {
      namespace: options.namespace,
      timeoutMs: options.timeoutMs,
    });
    return {
      ok: r.ok,
      runner: 'pyodide',
      stdout: r.stdout ?? '',
      stderr: '',
      error: r.error ?? null,
      images: (r.images ?? []).map((f: string, i: number) => ({
        name: `figure-${i + 1}.png`,
        dataUrl: f.startsWith('data:') ? f : `data:image/png;base64,${f}`,
      })),
      durationMs: r.durationMs ?? 0,
      result: r.table ?? r.valueText,
      figures: r.images,
    };
  }

  const r = await runInBackend(code, options);
  return {
    ok: r.ok,
    runner: 'backend',
    stdout: r.stdout,
    stderr: r.stderr,
    error: r.error,
    images: r.images,
    durationMs: r.durationMs,
  };
}

/**
 * 统一的判分入口。
 *
 * Pyodide 路径复用现有 judgePython；
 * 后端路径执行 setup + answer + tests，通过退出码判定。
 */
export async function judgeCodeSmart(
  exercise: { setupCode?: string; tests?: string; answer?: string },
  userCode: string,
): Promise<{ ok: boolean; runner: RunnerKind; output: string }> {
  const probe = `${exercise.setupCode ?? ''}\n${userCode}\n${exercise.tests ?? ''}`;
  const kind = chooseRunner(probe);

  if (kind === 'pyodide') {
    const r = await judgePython(userCode, exercise.tests ?? '', {
      setupCode: exercise.setupCode,
    });
    const output = [
      ...(r.details ?? []).map(
        (d) => `${d.passed ? '✓' : '✗'} ${d.label}${d.actual ? ` (实际: ${d.actual})` : ''}`,
      ),
      r.error,
    ]
      .filter(Boolean)
      .join('\n');
    return { ok: r.passed, runner: 'pyodide', output };
  }

  // 后端：把 setup + 用户代码 + tests 拼成一个脚本，退出码 0 即通过
  const parts = [
    exercise.setupCode ?? '',
    userCode,
    exercise.tests ?? '',
  ].filter(Boolean);
  const script = parts.join('\n\n');

  const r = await runInBackend(script, { timeoutMs: 60_000 });
  const output = [r.stdout, r.stderr, r.error].filter(Boolean).join('\n').trim();
  return { ok: r.ok, runner: 'backend', output };
}
