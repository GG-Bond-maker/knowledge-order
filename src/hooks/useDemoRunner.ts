import { useCallback, useEffect, useRef, useState } from 'react';
import type { Demo } from '../types';
import type { RunResult } from '../engine/result';
import { runPython, onPyodideStage } from '../engine/pyodideRunner';
import { runSql } from '../engine/sqlRunner';
import { SQL_DATASETS } from '../engine/judge';

const draftKey = (demo: Demo) => `knowledge-order:demo:${demo.lang}:${hash(demo.code)}`;

function hash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(36);
}

export function useDemoRunner(demo: Demo) {
  const [code, setCodeState] = useState(() => {
    try {
      const saved = localStorage.getItem(draftKey(demo));
      return saved ?? demo.code;
    } catch {
      return demo.code;
    }
  });
  const [result, setResult] = useState<(RunResult & { images?: string[] }) | null>(null);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<string>('');
  const mountRef = useRef(true);

  useEffect(() => {
    mountRef.current = true;
    return () => {
      mountRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (demo.lang === 'python') return onPyodideStage((s) => setStage(s));
    return undefined;
  }, [demo.lang]);

  const setCode = useCallback(
    (v: string) => {
      setCodeState(v);
      try {
        localStorage.setItem(draftKey(demo), v);
      } catch {
        /* ignore */
      }
    },
    [demo],
  );

  const reset = useCallback(() => {
    setCode(demo.code);
    setResult(null);
  }, [demo, setCode]);

  const run = useCallback(async () => {
    if (running) return;
    setRunning(true);
    try {
      if (demo.lang === 'python') {
        const res = await runPython(code, { namespace: `demo_${hash(demo.code)}` });
        if (mountRef.current) setResult(res);
      } else if (demo.lang === 'sql') {
        const ds = SQL_DATASETS[demo.dataset ?? 'retail'];
        const r = await runSql(ds.id, ds.initSql, code);
        if (mountRef.current) {
          setResult({
            ok: r.ok,
            stdout: '',
            error: r.error,
            table: r.result,
            durationMs: r.durationMs,
          });
        }
      }
    } finally {
      if (mountRef.current) setRunning(false);
    }
  }, [code, demo, running]);

  return { code, setCode, result, running, stage, run, reset };
}
