/**
 * 常驻模型服务（方案 B）
 *
 * 背景：`pythonRunner` 每次执行都启动独立子进程，因此 PyTorch 模型无法跨请求复用。
 * 对 Qwen3-0.6B 这类需要 8-9 秒加载的模型，每个 demo 都重新加载会让体验不可接受。
 *
 * 本模块启动**一个长驻 Python 进程**，模型只加载一次，后续请求通过
 * JSON-lines 协议（每行一个请求 / 一个响应）复用已加载的模型。
 *
 * 协议（stdin 一行 JSON → stdout 一行 JSON）：
 *   请求  {"id": 1, "op": "generate", "prompt": "...", "max_new_tokens": 128, ...}
 *   响应  {"id": 1, "ok": true, "text": "...", "seconds": 3.2}
 *
 * 支持的操作：
 *   - ping       探活
 *   - info       返回模型配置（参数量、层数、词表大小等）
 *   - load       显式加载模型（不传则首次 generate 时自动加载）
 *   - generate   生成文本（支持 temperature / top_p / do_sample / num_return_sequences）
 *   - score      计算给定文本的 logprob（第 5 章自反思与第 8 章蒸馏会用到）
 *
 * 安全与稳定性：
 *   - 仅监听 127.0.0.1（由 server/index.mjs 保证），不对外暴露；
 *   - 单请求超时 + 空闲自动退出（默认 20 分钟无请求则释放内存）；
 *   - 进程异常退出后自动重启（下次请求时）。
 */

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/** 常驻进程配置 */
const CONFIG = {
  /** 单次请求默认超时（模型已加载时，生成 256 token 约需 20 秒） */
  defaultTimeoutMs: 90_000,
  /** 单次请求最大超时 */
  maxTimeoutMs: 180_000,
  /** 模型加载超时（首次加载含磁盘读取，约 10-20 秒） */
  loadTimeoutMs: 180_000,
  /** 空闲多久后自动退出进程（毫秒），默认 20 分钟 */
  idleTimeoutMs: 20 * 60_000,
  /** 支持的模型（可按需扩展） */
  models: {
    'qwen3-0.6b': 'Qwen/Qwen3-0.6B',
  },
  /** 默认模型键 */
  defaultModel: 'qwen3-0.6b',
};

/**
 * Python 侧驱动脚本：负责加载模型、读 stdin、逐行处理请求。
 * 内嵌为字符串，避免额外文件与打包问题。
 */
const DRIVER_SCRIPT = String.raw`
import sys, os, json, time, traceback

# 抑制 transformers 的权重加载进度条（会污染 stderr）
os.environ.setdefault("HF_HUB_DISABLE_PROGRESS_BARS", "1")
os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from transformers.utils import logging as hf_logging
hf_logging.set_verbosity_error()
hf_logging.disable_progress_bar()

_STATE = {"model": None, "tokenizer": None, "name": None}


def _emit(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def _load(model_id):
    if _STATE["model"] is not None and _STATE["name"] == model_id:
        return
    t0 = time.time()
    tok = AutoTokenizer.from_pretrained(model_id)
    model = AutoModelForCausalLM.from_pretrained(model_id, dtype=torch.float32)
    model.eval()
    _STATE.update(model=model, tokenizer=tok, name=model_id)
    _STATE["load_seconds"] = time.time() - t0


def _info():
    m = _STATE["model"]
    if m is None:
        return {"loaded": False}
    cfg = m.config
    return {
        "loaded": True,
        "name": _STATE["name"],
        "params_m": round(sum(p.numel() for p in m.parameters()) / 1e6, 2),
        "n_layers": getattr(cfg, "num_hidden_layers", None),
        "hidden_size": getattr(cfg, "hidden_size", None),
        "vocab_size": getattr(cfg, "vocab_size", None),
        "n_heads": getattr(cfg, "num_attention_heads", None),
        "n_kv_heads": getattr(cfg, "num_key_value_heads", None),
        "context": getattr(cfg, "max_position_embeddings", None),
        "dtype": str(next(m.parameters()).dtype),
        "load_seconds": round(_STATE.get("load_seconds", 0), 2),
    }


def _generate(req):
    tok, model = _STATE["tokenizer"], _STATE["model"]
    prompt = req["prompt"]
    max_new = int(req.get("max_new_tokens", 128))
    do_sample = bool(req.get("do_sample", False))
    temperature = float(req.get("temperature", 1.0))
    top_p = float(req.get("top_p", 1.0))
    n_return = int(req.get("num_return_sequences", 1))
    seed = req.get("seed")

    if seed is not None:
        torch.manual_seed(int(seed))

    ids = tok(prompt, return_tensors="pt")
    kwargs = dict(
        max_new_tokens=max_new,
        pad_token_id=tok.eos_token_id,
        num_return_sequences=n_return,
    )
    if do_sample:
        kwargs.update(do_sample=True, temperature=temperature, top_p=top_p)
    else:
        kwargs.update(do_sample=False)

    t0 = time.time()
    with torch.no_grad():
        out = model.generate(**ids, **kwargs)
    dt = time.time() - t0

    prompt_len = ids.input_ids.shape[1]
    texts = [
        tok.decode(seq[prompt_len:], skip_special_tokens=True)
        for seq in out
    ]
    n_new = int(out.shape[1] - prompt_len)
    return {
        "texts": texts,
        "text": texts[0],
        "prompt_tokens": int(prompt_len),
        "new_tokens": n_new,
        "seconds": round(dt, 2),
        "tokens_per_sec": round(n_new / dt, 2) if dt > 0 else None,
    }


def _score(req):
    """计算给定文本的平均 logprob（用于自反思/蒸馏章节）"""
    tok, model = _STATE["tokenizer"], _STATE["model"]
    prompt = req["prompt"]
    answer = req["answer"]
    p_ids = tok.encode(prompt)
    a_ids = tok.encode(answer)
    full = torch.tensor([p_ids + a_ids])
    with torch.no_grad():
        logits = model(full).logits[0].float()
    logprobs = torch.log_softmax(logits, dim=-1)
    start = max(len(p_ids) - 1, 0)
    end = full.shape[1] - 1
    if end <= start:
        return {"mean_logprob": None, "sum_logprob": None, "n_tokens": 0}
    idx = torch.arange(start, end)
    targets = full[0, start + 1 : end + 1]
    sel = logprobs[idx, targets]
    return {
        "mean_logprob": float(sel.mean()),
        "sum_logprob": float(sel.sum()),
        "n_tokens": int(sel.numel()),
    }


def main():
    model_id = os.environ.get("XQ_MODEL_ID", "Qwen/Qwen3-0.6B")
    _emit({"ready": True, "model_id": model_id})
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        try:
            req = json.loads(line)
        except Exception:
            continue
        rid = req.get("id")
        op = req.get("op", "ping")
        try:
            if op == "ping":
                _emit({"id": rid, "ok": True, "pong": True})
            elif op == "info":
                _emit({"id": rid, "ok": True, **_info()})
            elif op == "load":
                _load(req.get("model_id") or model_id)
                _emit({"id": rid, "ok": True, **_info()})
            elif op == "generate":
                _load(req.get("model_id") or model_id)
                _emit({"id": rid, "ok": True, **_generate(req)})
            elif op == "score":
                _load(req.get("model_id") or model_id)
                _emit({"id": rid, "ok": True, **_score(req)})
            else:
                _emit({"id": rid, "ok": False, "error": f"unknown op: {op}"})
        except Exception:
            _emit({"id": rid, "ok": False, "error": traceback.format_exc()[-2000:]})


if __name__ == "__main__":
    main()
`;

/** 常驻进程状态 */
let child = null;
let buffer = '';
let nextId = 1;
const pending = new Map();
let idleTimer = null;
let starting = null;
let currentModelId = null;
let lastLoadInfo = null;

/** 重置空闲计时器 */
function touchIdle() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    if (pending.size === 0) shutdown('idle-timeout');
  }, CONFIG.idleTimeoutMs);
  // 允许进程退出时不阻塞 Node
  if (idleTimer.unref) idleTimer.unref();
}

/** 关闭常驻进程 */
export function shutdown(reason = 'manual') {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
  const proc = child;
  child = null;
  starting = null;
  buffer = '';
  for (const [, p] of pending) {
    p.reject(new Error(`常驻模型进程已关闭（${reason}）`));
  }
  pending.clear();
  if (proc) {
    try {
      proc.stdin.end();
      proc.kill();
    } catch {
      /* ignore */
    }
  }
}

/** 处理一行响应 */
function handleLine(line) {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  if (msg.ready) {
    return;
  }
  const p = pending.get(msg.id);
  if (!p) return;
  pending.delete(msg.id);
  if (p.timer) clearTimeout(p.timer);
  if (msg.ok) p.resolve(msg);
  else p.reject(new Error(msg.error || '模型执行失败'));
  touchIdle();
}

/** 启动常驻进程（幂等） */
async function ensureChild(interpreter, projectRoot) {
  if (child && child.exitCode === null) return child;
  if (starting) return starting;

  starting = new Promise((resolvePromise, rejectPromise) => {
    const env = {
      ...process.env,
      PYTHONIOENCODING: 'utf-8',
      PYTHONUNBUFFERED: '1',
      HF_HUB_DISABLE_PROGRESS_BARS: '1',
      TRANSFORMERS_VERBOSITY: 'error',
      TOKENIZERS_PARALLELISM: 'false',
      // 模型缓存目录（与下载时一致）
      HF_HOME: process.env.HF_HOME || join(projectRoot, '.models', 'hf'),
      XQ_MODEL_ID: CONFIG.models[CONFIG.defaultModel],
    };
    // torch 缓存目录需可写
    const torchCache = join(projectRoot, '.cache', 'torch');
    try {
      mkdirSync(torchCache, { recursive: true });
    } catch {
      /* ignore */
    }
    env.TORCHINDUCTOR_CACHE_DIR = torchCache;

    const proc = spawn(interpreter, ['-c', DRIVER_SCRIPT], {
      cwd: projectRoot,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
      env,
    });

    let ready = false;
    const readyTimer = setTimeout(() => {
      if (!ready) {
        rejectPromise(new Error('常驻模型进程启动超时'));
        shutdown('start-timeout');
      }
    }, 30_000);

    proc.stdout.setEncoding('utf8');
    proc.stdout.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n')) >= 0) {
        const line = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 1);
        if (!line) continue;
        if (!ready) {
          try {
            const m = JSON.parse(line);
            if (m.ready) {
              ready = true;
              clearTimeout(readyTimer);
              child = proc;
              currentModelId = m.model_id;
              touchIdle();
              resolvePromise(proc);
              continue;
            }
          } catch {
            /* fall through */
          }
        }
        handleLine(line);
      }
    });

    // stderr 只在调试时记录，避免污染
    proc.stderr.on('data', () => { /* 忽略 transformers 的进度输出 */ });

    proc.on('error', (e) => {
      clearTimeout(readyTimer);
      if (!ready) rejectPromise(e);
      shutdown('spawn-error');
    });

    proc.on('exit', () => {
      clearTimeout(readyTimer);
      const wasReady = ready;
      child = null;
      starting = null;
      buffer = '';
      for (const [, p] of pending) {
        if (p.timer) clearTimeout(p.timer);
        p.reject(new Error('常驻模型进程意外退出'));
      }
      pending.clear();
      if (!wasReady) rejectPromise(new Error('常驻模型进程启动失败'));
    });
  });

  return starting;
}

/** 发送一个请求到常驻进程 */
async function request(interpreter, projectRoot, payload, timeoutMs) {
  await ensureChild(interpreter, projectRoot);
  if (!child) throw new Error('常驻模型进程不可用');

  const id = nextId++;
  const line = JSON.stringify({ id, ...payload }) + '\n';

  return new Promise((resolvePromise, rejectPromise) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      rejectPromise(new Error(`请求超时（${timeoutMs}ms）`));
    }, timeoutMs);
    pending.set(id, { resolve: resolvePromise, reject: rejectPromise, timer });
    try {
      child.stdin.write(line);
    } catch (e) {
      clearTimeout(timer);
      pending.delete(id);
      rejectPromise(e);
    }
  });
}

/** 对外：模型服务状态 */
export function getModelStatus() {
  return {
    running: Boolean(child && child.exitCode === null),
    model: currentModelId,
    pending: pending.size,
    supported: CONFIG.models,
    defaultModel: CONFIG.defaultModel,
    idleTimeoutMs: CONFIG.idleTimeoutMs,
    lastLoad: lastLoadInfo,
  };
}

/** 对外：加载模型（首次会耗时约 10-20 秒） */
export async function loadModel(interpreter, projectRoot, opts = {}) {
  const modelId = opts.modelId || CONFIG.models[CONFIG.defaultModel];
  const r = await request(
    interpreter,
    projectRoot,
    { op: 'load', model_id: modelId },
    CONFIG.loadTimeoutMs,
  );
  lastLoadInfo = r;
  return r;
}

/** 对外：模型信息 */
export async function modelInfo(interpreter, projectRoot) {
  const r = await request(interpreter, projectRoot, { op: 'info' }, 15_000);
  return r;
}

/** 对外：生成文本 */
export async function generate(interpreter, projectRoot, opts) {
  const timeoutMs = Math.min(
    opts.timeoutMs ?? CONFIG.defaultTimeoutMs,
    CONFIG.maxTimeoutMs,
  );
  const payload = {
    op: 'generate',
    prompt: opts.prompt,
    max_new_tokens: opts.maxNewTokens ?? 128,
    do_sample: opts.doSample ?? false,
    temperature: opts.temperature ?? 1.0,
    top_p: opts.topP ?? 1.0,
    num_return_sequences: opts.numReturnSequences ?? 1,
    seed: opts.seed,
    model_id: opts.modelId,
  };
  return request(interpreter, projectRoot, payload, timeoutMs);
}

/** 对外：给文本打分（平均 logprob） */
export async function scoreText(interpreter, projectRoot, opts) {
  return request(
    interpreter,
    projectRoot,
    { op: 'score', prompt: opts.prompt, answer: opts.answer, model_id: opts.modelId },
    Math.min(opts.timeoutMs ?? 60_000, CONFIG.maxTimeoutMs),
  );
}

/** 对外：预加载（服务启动时可调用，避免首次请求等待） */
export async function preloadModel(interpreter, projectRoot) {
  try {
    return await loadModel(interpreter, projectRoot);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export { CONFIG as MODEL_SERVICE_CONFIG };
