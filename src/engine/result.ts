/**
 * 运行结果标准化：统一 Python / SQL 两种执行引擎的输出结构。
 */

/** 二维表格数据（用于 DataFrame / SQL 结果集渲染） */
export interface TableData {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  /** 可选的列类型标签 */
  dtypes?: string[];
}

export interface RunResult {
  ok: boolean;
  stdout: string;
  /** 结构化表格结果（若有） */
  table?: TableData;
  /** 其他结构化结果的可读文本（Series、字典、标量等） */
  valueText?: string;
  error?: string;
  /** 耗时毫秒 */
  durationMs: number;
}

export const emptyRunResult = (): RunResult => ({
  ok: true,
  stdout: '',
  durationMs: 0,
});

export function fmtDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(2)} s`;
}

/** 把任意值截断成适合显示的字符串 */
export function clip(s: string, max = 20000): string {
  return s.length > max ? `${s.slice(0, max)}\n…（输出过长已截断，共 ${s.length} 字符）` : s;
}
