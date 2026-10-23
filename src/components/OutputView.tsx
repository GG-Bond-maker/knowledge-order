/**
 * 结果展示：stdout 控制台 + 结构化表格 + 值回显 + 图片。
 */

import type { RunResult } from '../engine/result';
import { fmtDuration } from '../engine/result';
import './OutputView.css';

export interface OutputViewProps {
  result: (RunResult & { images?: string[] }) | null;
  running?: boolean;
  /** 表格行数上限，超出提示 */
  maxRows?: number;
  emptyHint?: string;
}

export function DataTable({ columns, rows, maxRows = 300 }: { columns: string[]; rows: (string | number | boolean | null)[][]; maxRows?: number }) {
  const shown = rows.slice(0, maxRows);
  return (
    <>
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((c, i) => (
                <th key={i}>{c || ' '}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map((r, i) => (
              <tr key={i}>
                {r.map((cell, j) => (
                  <td key={j} className={cell === null || cell === undefined ? 'na' : undefined}>
                    {cell === null || cell === undefined ? 'NaN' : String(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="out-meta">
        {rows.length} 行 × {columns.length} 列
        {rows.length > maxRows && `（仅显示前 ${maxRows} 行）`}
      </div>
    </>
  );
}

export function OutputView({ result, running, maxRows = 300, emptyHint = '运行后在此查看输出' }: OutputViewProps) {
  if (running) {
    return <div className="out-loading">⏳ 正在运行…（首次运行需等待 Python 运行时加载）</div>;
  }
  if (!result) {
    return <div className="out-empty">{emptyHint}</div>;
  }
  const hasAnything = result.stdout || result.table || result.valueText || result.error || result.images?.length;
  return (
    <div className="out-root">
      {result.error && (
        <pre className="console error">
          <span className="err-title">✗ 运行出错</span>
          {'\n'}
          {result.error}
        </pre>
      )}
      {result.table && <DataTable columns={result.table.columns} rows={result.table.rows} maxRows={maxRows} />}
      {result.valueText && !result.table && (
        <div className="out-value">
          <div className="out-value-label">返回值</div>
          <pre className="console value">{result.valueText}</pre>
        </div>
      )}
      {result.table && result.valueText && <div className="out-meta">{result.valueText}</div>}
      {result.stdout && (
        <div className="out-block">
          <div className="out-value-label">标准输出</div>
          <pre className="console">{result.stdout}</pre>
        </div>
      )}
      {result.images?.map((img, i) => (
        <img key={i} className="out-image" alt={`输出图 ${i + 1}`} src={`data:image/png;base64,${img}`} />
      ))}
      {!hasAnything && <div className="out-empty">（没有输出）</div>}
      <div className="out-meta out-time">
        {result.ok ? '✓ 执行成功' : '✗ 执行失败'} · 耗时 {fmtDuration(result.durationMs)}
      </div>
    </div>
  );
}
