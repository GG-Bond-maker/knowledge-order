/**
 * sql.js（SQLite 编译到 WebAssembly）执行引擎。
 *
 * - 每个练习数据集使用一个独立的 SQLite 内存库；
 * - 每次执行都从"干净快照"开始，避免用户 DROP/UPDATE 污染后续判分；
 * - 返回结果集用于表格渲染与判分比对。
 */

import type { TableData } from './result';

type SqlJsStatic = {
  Database: new (data?: Uint8Array) => SqlDatabase;
};
type SqlDatabase = {
  exec: (sql: string, params?: unknown[]) => QueryExecResult[];
  prepare: (sql: string, params?: unknown[]) => SqlStatement;
  export: () => Uint8Array;
  close: () => void;
  getRowsModified: () => number;
};
type SqlStatement = {
  step: () => boolean;
  get: () => unknown[];
  getColumnNames: () => string[];
  free: () => void;
};
export type QueryExecResult = {
  columns: string[];
  values: (string | number | Uint8Array | null)[][];
};

let sqlJsPromise: Promise<SqlJsStatic> | null = null;
/** 数据集 id → 干净的初始库二进制 */
const baseSnapshots = new Map<string, Uint8Array>();
/** 数据集 id → 当前可复用的库实例 */
const liveDbs = new Map<string, SqlDatabase>();

async function loadSqlJs(): Promise<SqlJsStatic> {
  if (sqlJsPromise) return sqlJsPromise;
  sqlJsPromise = (async () => {
    const mod = (await import('sql.js')) as unknown as { default: (cfg: { locateFile: (f: string) => string }) => Promise<SqlJsStatic> };
    const initSqlJs = mod.default;
    return initSqlJs({
      locateFile: (file) => `${import.meta.env.BASE_URL}sqljs/${file}`,
    });
  })();
  return sqlJsPromise;
}

export interface DatasetSpec {
  /** 初始化 SQL 脚本：CREATE TABLE + INSERT */
  initSql: string;
  /** 表说明，用于界面上展示字段含义 */
  tables: { name: string; description: string; columns: { name: string; type: string; note?: string }[] }[];
  /** 用于界面展示的示例数据预览表 */
  preview?: string;
}

/**
 * 注册数据集并生成干净快照。
 */
export async function registerDataset(id: string, initSql: string): Promise<void> {
  if (baseSnapshots.has(id)) return;
  const SQL = await loadSqlJs();
  const db = new SQL.Database();
  db.exec(initSql);
  baseSnapshots.set(id, db.export());
  db.close();
}

export function isDatasetRegistered(id: string): boolean {
  return baseSnapshots.has(id);
}

async function acquireDb(dataset: string, initSql: string): Promise<SqlDatabase> {
  if (!baseSnapshots.has(dataset)) await registerDataset(dataset, initSql);
  return new (await loadSqlJs()).Database(baseSnapshots.get(dataset)!);
}

/** 执行 SQL 并返回最后一个有意义的结果集 */
export async function runSql(dataset: string, initSql: string, sql: string): Promise<{
  ok: boolean;
  result?: TableData;
  results: TableData[];
  rowsModified: number;
  error?: string;
  durationMs: number;
}> {
  const t0 = performance.now();
  let db: SqlDatabase | null = null;
  try {
    db = await acquireDb(dataset, initSql);
    const execResult = db.exec(sql);
    const results: TableData[] = execResult.map((r) => ({
      columns: r.columns,
      rows: r.values.map((row) =>
        row.map((v) => {
          if (v instanceof Uint8Array) return `<blob ${v.length}B>`;
          return v as string | number | null;
        }),
      ),
    }));
    return {
      ok: true,
      result: results.length ? results[results.length - 1] : undefined,
      results,
      rowsModified: db.getRowsModified(),
      durationMs: performance.now() - t0,
    };
  } catch (e) {
    return {
      ok: false,
      results: [],
      rowsModified: 0,
      error: e instanceof Error ? e.message : String(e),
      durationMs: performance.now() - t0,
    };
  } finally {
    db?.close();
  }
}
