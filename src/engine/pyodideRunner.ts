/**
 * Pyodide（CPython on WebAssembly）执行引擎。
 *
 * 设计要点：
 * 1. 全站懒加载、单例复用：第一次进入 Python/Pandas 练习页时才下载运行时。
 * 2. 每次执行在独立的命名空间（module globals）中跑，互不污染；
 *    自动展示最后一个非赋值语句 / 末尾表达式的值（类似 Jupyter）。
 * 3. 自动捕获 matplotlib 图形、DataFrame/Series 结果并结构化回传。
 * 4. 支持"隔离训练场"：习题判分时可限制内置函数，防止作弊。
 */

import type { RunResult, TableData } from './result';
import { clip } from './result';

interface PyodideAPI {
  runPythonAsync: (code: string, options?: Record<string, unknown>) => Promise<unknown>;
  runPython: (code: string, options?: Record<string, unknown>) => unknown;
  loadPackage: (pkgs: string | string[]) => Promise<void>;
  setStdout: (opts: { batched: (s: string) => void }) => void;
  setStderr: (opts: { batched: (s: string) => void }) => void;
  toPy: (js: unknown) => unknown;
  globals: { get: (name: string) => unknown; set: (name: string, v: unknown) => void };
  FS: unknown;
  version?: string;
}

type ProgressCb = (stage: string, loaded?: number, total?: number) => void;

const PYODIDE_VERSION = '0.29.5';
const CDN_BASES = [
  `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
  `https://fastly.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
  `https://unpkg.com/pyodide@${PYODIDE_VERSION}/`,
];

let pyodidePromise: Promise<PyodideAPI> | null = null;
let loadStage = '未加载';
const listeners = new Set<(stage: string) => void>();

function emit(stage: string) {
  loadStage = stage;
  listeners.forEach((fn) => fn(stage));
}

export function onPyodideStage(fn: (stage: string) => void): () => void {
  listeners.add(fn);
  fn(loadStage);
  return () => listeners.delete(fn);
}

export function getPyodideStage(): string {
  return loadStage;
}

/** Python 侧辅助代码：统一的结果捕获、表格转换、画布输出 */
const HELPER_CODE = String.raw`
import sys, io, json, traceback, base64, builtins, contextlib

_DA_STATE = {"stdout": "", "stderr": "", "table": None, "value": None}

def _da_to_jsonable(obj, depth=0):
    """把 Python 对象转成可 JSON 序列化的结构，供前端渲染。"""
    if depth > 6:
        return str(obj)
    try:
        import math
        import datetime as _dt
        import decimal as _dec
        import numpy as _np
        import pandas as _pd
    except Exception:  # noqa
        _np = None
        _pd = None

    if obj is None or isinstance(obj, (bool, str, int)):
        return obj
    if isinstance(obj, float):
        if obj != obj or obj in (float("inf"), float("-inf")):
            return str(obj)
        return obj
    if _pd is not None and isinstance(obj, _pd.DataFrame):
        df = obj
        if len(df.index.names) > 1 or (df.index.name is not None and df.index.name not in (None,)):
            cols = ([""] if df.index.name is None else [str(df.index.name)]) + [str(c) for c in df.columns]
            rows = []
            for idx, row in df.iterrows():
                idx_val = idx if not isinstance(idx, tuple) else idx
                rows.append([_da_scalar(idx_val)] + [_da_scalar(v) for v in row.tolist()])
        else:
            cols = [str(c) for c in df.columns]
            rows = [[_da_scalar(v) for v in r] for r in df.to_numpy().tolist()]
        dtypes = [str(t) for t in df.dtypes.tolist()]
        return {"__table__": True, "columns": cols, "rows": rows, "dtypes": dtypes,
                "shape": list(df.shape)}
    if _pd is not None and isinstance(obj, _pd.Series):
        return {"__series__": True, "name": str(obj.name), "values": [_da_scalar(v) for v in obj.tolist()],
                "index": [_da_scalar(i) for i in obj.index.tolist()], "dtype": str(obj.dtype)}
    if _np is not None and isinstance(obj, _np.ndarray):
        return {"__ndarray__": True, "shape": list(obj.shape), "values": _da_to_jsonable(obj.tolist(), depth + 1)}
    if _np is not None and isinstance(obj, _np.generic):
        return _da_scalar(obj)
    if isinstance(obj, (list, tuple)):
        return [_da_to_jsonable(x, depth + 1) for x in obj]
    if isinstance(obj, dict):
        return {str(k): _da_to_jsonable(v, depth + 1) for k, v in obj.items()}
    if isinstance(obj, (set, frozenset)):
        return [_da_to_jsonable(x, depth + 1) for x in obj]
    return str(obj)

def _da_scalar(v):
    try:
        import numpy as _np
        import pandas as _pd
        if _pd is not None and v is _pd.NA:
            return None
        if _pd is not None and v is _pd.NaT:
            return None
        if _np is not None and isinstance(v, _np.generic):
            v = v.item()
    except Exception:  # noqa
        pass
    if v is None:
        return None
    if isinstance(v, float):
        if v != v:
            return None
        return round(v, 10)
    if isinstance(v, (bool, int, str)):
        return v
    if isinstance(v, (__import__("datetime").date, __import__("datetime").datetime, __import__("datetime").timedelta)):
        return str(v)
    if isinstance(v, (list, tuple)):
        return [_da_scalar(x) for x in v]
    return str(v)

async def _da_execute(user_code, namespace, allow_import=True, max_stdout=200000):
    """执行用户代码，返回 dict。"""
    import ast
    out_buf = io.StringIO()
    err_buf = io.StringIO()
    result = {"ok": True, "stdout": "", "stderr": "", "table": None, "value": None, "error": None,
              "images": []}

    if not allow_import:
        ns_builtins = dict(builtins.__dict__)
        real_import = builtins.__import__
        BLOCKED = {"os", "sys", "subprocess", "socket", "shutil", "pathlib", "ctypes", "requests",
                   "urllib", "http", "importlib", "multiprocessing", "threading", "builtins", "io"}
        def guarded_import(name, globals=None, locals=None, fromlist=(), level=0):
            root = name.split(".")[0]
            if root in BLOCKED:
                raise ImportError(f"[训练场] 出于安全限制，不允许导入 {name}")
            return real_import(name, globals, locals, fromlist, level)
        ns_builtins["__import__"] = guarded_import
        namespace["__builtins__"] = ns_builtins

    _matplot_patch_applied = False
    try:
        tree = ast.parse(user_code, mode="exec")
    except SyntaxError as e:  # noqa
        result["ok"] = False
        result["error"] = f"SyntaxError: {e.msg} (第 {e.lineno} 行)"
        result["stdout"] = ""
        return result

    # 拆分最后一条表达式语句，以便回显
    last_expr = None
    body = tree.body
    if body and isinstance(body[-1], ast.Expr):
        last_expr = body[-1]
        body = body[:-1]

    try:
        # 捕获 matplotlib 图形：如果用户用了 matplotlib 且没 show，也输出为图片
        def _capture_images():
            imgs = []
            try:
                plt = sys.modules.get("matplotlib.pyplot")
                if plt is not None:
                    for num in plt.get_fignums():
                        fig = plt.figure(num)
                        buf = io.BytesIO()
                        fig.savefig(buf, format="png", bbox_inches="tight", dpi=90)
                        imgs.append(base64.b64encode(buf.getvalue()).decode())
                    plt.close("all")
            except Exception:  # noqa
                pass
            return imgs

        with contextlib.redirect_stdout(out_buf), contextlib.redirect_stderr(err_buf):
            if body:
                exec(compile(ast.Module(body=body, type_ignores=[]), "<cell>", "exec"), namespace)
            if last_expr is not None:
                val = eval(compile(ast.Expression(last_expr.value), "<cell>", "eval"), namespace)
                result["value_raw"] = _da_to_jsonable(val)
                if val is not None:
                    if hasattr(val, "_repr_html_") or type(val).__name__ in ("DataFrame", "Series", "Styler"):
                        result["table"] = _da_to_jsonable(val)
                    else:
                        result["value"] = _da_to_jsonable(val)
        result["images"] = _capture_images()
    except Exception as e:  # noqa
        result["ok"] = False
        tb = traceback.format_exc()
        # 精简 traceback：去掉本辅助函数自身的两帧
        lines = [l for l in tb.splitlines() if "exec(compile" not in l and "eval(compile" not in l]
        result["error"] = "\n".join(lines)[-4000:]
    result["stdout"] = out_buf.getvalue()[:max_stdout]
    result["stderr"] = err_buf.getvalue()[:max_stdout]
    return result
`;

async function loadScript(url: string): Promise<void> {
  if ((window as unknown as Record<string, unknown>).loadPyodide) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`无法加载 ${url}`));
    document.head.appendChild(s);
  });
}

async function bootPyodide(progress?: ProgressCb): Promise<PyodideAPI> {
  progress?.('正在加载 Python 运行时（首次约 20MB，之后走浏览器缓存）…');
  emit('正在加载 Python 运行时…');

  // 优先使用本地拷贝的 pyodide（public/pyodide/），失败再回退到 CDN
  const base = `${import.meta.env.BASE_URL}pyodide/`;
  const candidates = [base, ...CDN_BASES];
  let lastErr: unknown = null;

  for (const b of candidates) {
    try {
      progress?.(`正在${b.startsWith(base) ? '本地' : 'CDN '}加载 pyodide.js…`);
      await loadScript(`${b}pyodide.js`);
      const loader = (window as unknown as { loadPyodide: (o: { indexURL: string }) => Promise<PyodideAPI> }).loadPyodide;
      progress?.('正在初始化 Python 解释器…');
      const py = await loader({ indexURL: b });
      return py;
    } catch (e) {
      lastErr = e;
      // 清理失败的 script 标签，尝试下一个源
      document.querySelectorAll('script[src$="pyodide.js"]').forEach((n) => n.remove());
      (window as unknown as Record<string, unknown>).loadPyodide = undefined;
    }
  }
  throw new Error(`Python 运行时加载失败，请检查网络后重试。${lastErr instanceof Error ? lastErr.message : ''}`);
}

/** 获取（或初始化）Pyodide 单例 */
export function getPyodide(progress?: ProgressCb): Promise<PyodideAPI> {
  if (pyodidePromise) return pyodidePromise;
  pyodidePromise = (async () => {
    try {
      const py = await bootPyodide(progress);
      progress?.('正在加载 numpy / pandas / matplotlib…');
      emit('正在加载 numpy / pandas / matplotlib…');
      // matplotlib 是数据可视化课程的核心依赖；若下载失败不影响 pandas 类练习
      try {
        await py.loadPackage(['numpy', 'pandas', 'matplotlib']);
      } catch (e) {
        console.warn('matplotlib 加载失败，将只加载 numpy / pandas', e);
        await py.loadPackage(['numpy', 'pandas']);
      }
      progress?.('正在应用 pandas 中文显示设置…');
      py.runPython(HELPER_CODE);
      py.runPython(`
import pandas as pd, numpy as np
pd.set_option("display.max_rows", 200)
pd.set_option("display.max_columns", 60)
pd.set_option("display.width", 160)
pd.set_option("display.unicode.east_asian_width", True)
`);
      emit('就绪');
      progress?.('Python 运行时就绪');
      return py;
    } catch (e) {
      pyodidePromise = null;
      emit('加载失败');
      throw e;
    }
  })();
  return pyodidePromise;
}

export function isPyodideReady(): boolean {
  return loadStage === '就绪';
}

interface RawPyResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  error: string | null;
  table: unknown;
  value_raw: unknown;
  images?: string[];
}

function normalizePyResult(raw: RawPyResult, durationMs: number): RunResult & { images?: string[] } {
  let table: TableData | undefined;
  let valueText: string | undefined;

  if (raw.table && typeof raw.table === 'object') {
    const t = raw.table as Record<string, unknown>;
    if (t.__table__) {
      table = {
        columns: t.columns as string[],
        rows: t.rows as TableData['rows'],
        dtypes: t.dtypes as string[],
      };
      const shape = t.shape as number[] | undefined;
      valueText = shape ? `shape = ${shape.join(' × ')}` : undefined;
    } else if (t.__series__) {
      const name = (t.name as string) ?? 'Series';
      table = {
        columns: ['index', name],
        rows: (t.index as unknown[]).map((idx, i) => [idx as string | number, (t.values as unknown[])[i] as string | number]),
        dtypes: [String(t.dtype ?? '')],
      };
      valueText = `${name}，共 ${(t.values as unknown[]).length} 项，dtype=${String(t.dtype ?? '')}`;
    }
  } else if (raw.value_raw !== undefined && raw.value_raw !== null) {
    const v = raw.value_raw;
    valueText = typeof v === 'string' ? v : JSON.stringify(v, null, 2);
  }

  return {
    ok: raw.ok,
    stdout: clip(raw.stdout ?? ''),
    error: raw.error ?? (raw.stderr ? clip(raw.stderr) : undefined),
    table,
    valueText,
    durationMs,
    images: raw.images,
  };
}

/**
 * 在浏览器中执行一段 Python 代码。
 * @param code 用户代码
 * @param opts.namespace 命名空间名称，同名重复执行会保留变量（同一"会话"）
 * @param opts.allowImport false 时启用训练场（禁用 os/sys 等危险模块）
 */
export async function runPython(
  code: string,
  opts: { namespace?: string; allowImport?: boolean; timeoutMs?: number } = {},
): Promise<RunResult & { images?: string[] }> {
  const t0 = performance.now();
  let py: PyodideAPI;
  try {
    py = await getPyodide();
  } catch (e) {
    return {
      ok: false,
      stdout: '',
      error: e instanceof Error ? e.message : String(e),
      durationMs: performance.now() - t0,
    };
  }

  const nsName = opts.namespace ?? 'default';
  py.globals.set('_da_user_code', code);
  py.globals.set('_da_ns_name', nsName);
  py.globals.set('_da_allow_import', opts.allowImport !== false);

  // 预先创建/复用命名空间
  py.runPython(`
import builtins as _b
_DA_NAMESPACES = getattr(_b, "_DA_NAMESPACES", {})
if _da_ns_name not in _DA_NAMESPACES:
    _DA_NAMESPACES[_da_ns_name] = {"__name__": "__main__"}
_b._DA_NAMESPACES = _DA_NAMESPACES
`);

  let raw: RawPyResult;
  try {
    // 注意：runPythonAsync 会自动 await 协程，直接返回 JS 代理对象（dict），
    // 不能再调用 .to_py()（代理对象上没有该方法）。
    const res = await py.runPythonAsync(
      `_da_execute(_da_user_code, _DA_NAMESPACES[_da_ns_name], allow_import=_da_allow_import)`,
    );
    raw = res as RawPyResult;
  } catch (e) {
    return {
      ok: false,
      stdout: '',
      error: e instanceof Error ? e.message : String(e),
      durationMs: performance.now() - t0,
    };
  }

  return normalizePyResult(raw, performance.now() - t0);
}

/** 重置某个命名空间（例如切换题目时） */
export async function resetNamespace(ns: string): Promise<void> {
  const py = await getPyodide().catch(() => null);
  if (!py) return;
  py.globals.set('_da_ns_name', ns);
  py.runPython(`
import builtins as _b
_DA_NAMESPACES = getattr(_b, "_DA_NAMESPACES", {})
_DA_NAMESPACES.pop(_da_ns_name, None)
_b._DA_NAMESPACES = _DA_NAMESPACES
`);
}

/**
 * 代码题判分：在隔离命名空间中重新执行用户代码，并运行测试断言。
 * 返回每个断言的结果。
 */
export async function judgePython(
  code: string,
  tests: string,
  opts: { setupCode?: string } = {},
): Promise<{ passed: boolean; details: { label: string; passed: boolean; actual?: string; expected?: string }[]; error?: string }> {
  const py = await getPyodide();
  // 每个题目使用全新命名空间，避免上次的变量残留影响判分
  const nsName = `judge_${Math.random().toString(36).slice(2)}`;
  py.globals.set('_da_user_code', code);
  py.globals.set('_da_test_code', tests);
  py.globals.set('_da_setup_code', opts.setupCode ?? '');
  py.globals.set('_da_ns_name', nsName);

  py.runPython(String.raw`
import json as _json
_NS = {"__name__": "__main__"}
_judge_out = {"passed": False, "details": [], "error": None}
try:
    if _da_setup_code:
        exec(_da_setup_code, _NS)
    import ast as _ast
    _tree = _ast.parse(_da_user_code, mode="exec")
    _last = None
    _body = _tree.body
    if _body and isinstance(_body[-1], _ast.Expr):
        _last = _body[-1]
        _body = _body[:-1]
    if _body:
        exec(compile(_ast.Module(body=_body, type_ignores=[]), "<solution>", "exec"), _NS)
    _NS["out"] = eval(compile(_ast.Expression(_last.value), "<solution>", "eval"), _NS) if _last is not None else None
    _tests = _ast.parse(_da_test_code, mode="exec")
    _n = 0
    for _node in _tests.body:
        # 每条 assert（或 Top-level Expr 形式的断言）单独计为一个测试用例
        if isinstance(_node, (_ast.Assert, _ast.Expr)):
            _n += 1
            try:
                exec(compile(_ast.Module(body=[_node], type_ignores=[]), "<test>", "exec"), _NS)
                _judge_out["details"].append({"label": f"测试 {_n}", "passed": True})
            except AssertionError as _e:
                _judge_out["details"].append({"label": f"测试 {_n}", "passed": False,
                    "actual": str(_e)[:500] if str(_e) else "断言失败"})
            except Exception as _e:
                import traceback as _tb
                _judge_out["details"].append({"label": f"测试 {_n}", "passed": False,
                    "actual": f"{type(_e).__name__}: {_e}"[:500]})
        else:
            exec(compile(_ast.Module(body=[_node], type_ignores=[]), "<test>", "exec"), _NS)
    _judge_out["passed"] = len(_judge_out["details"]) > 0 and all(d["passed"] for d in _judge_out["details"])
except Exception as _e:
    import traceback as _tb
    _judge_out["error"] = _tb.format_exc()[-3000:]
`);
  // 用 JSON 序列化再解析：比 .to_py() 更稳妥，不受 Python 代理对象行为影响
  const jsonStr = py.runPython('import json as _json; _json.dumps(_judge_out, ensure_ascii=False)');
  const result = JSON.parse(String(jsonStr)) as {
    passed: boolean;
    details: { label: string; passed: boolean; actual?: string }[];
    error: string | null;
  };
  return {
    passed: Boolean(result.passed),
    details: result.details ?? [],
    error: result.error ?? undefined,
  };
}

/** 预加载 Python 运行时（右上角按钮可手动触发） */
export function preloadPython(progress?: ProgressCb): Promise<void> {
  return getPyodide(progress).then(() => undefined);
}
