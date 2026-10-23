/**
 * 统一判分器：覆盖 7 种题型。
 * 纯函数（除代码/SQL 题需要异步执行引擎外），便于单元测试。
 */

import type {
  Exercise,
  FillExercise,
  CodeExercise,
  SqlExercise,
  JudgeResult,
  JudgeDetail,
  OpenExercise,
} from '../types';
import { runSql } from './sqlRunner';
import { judgePython } from './pyodideRunner';
import { RETAIL_DATASET } from './datasets';

export const SQL_DATASETS: Record<string, typeof RETAIL_DATASET> = {
  retail: RETAIL_DATASET,
};

function normalizeText(s: string, caseSensitive = false, ignoreWs = true): string {
  let out = s.trim();
  if (ignoreWs) out = out.replace(/\s+/g, ' ');
  // 去掉首尾引号与中英文引号差异
  out = out.replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, '');
  out = out.replace(/[，；：]/g, (m) => ({ '，': ',', '；': ';', '：': ':' })[m] ?? m);
  return caseSensitive ? out : out.toLowerCase();
}

/** 判断题/选择题的标准判分 */
export function judgeChoice(ex: Exercise, answer: unknown): JudgeResult {
  if (ex.type === 'single') {
    const ok = String(answer) === ex.answer;
    const chosen = ex.options.find((o) => o.value === String(answer));
    const right = ex.options.find((o) => o.value === ex.answer);
    return {
      correct: ok,
      score: ok ? 1 : 0,
      details: [
        {
          label: '你的答案',
          passed: ok,
          actual: chosen ? `${chosen.value}. ${chosen.text}` : '未作答',
          expected: right ? `${right.value}. ${right.text}` : ex.answer,
        },
      ],
    };
  }
  if (ex.type === 'multiple') {
    const picked = new Set((Array.isArray(answer) ? answer : []).map(String));
    const right = new Set(ex.answer);
    const missing = [...right].filter((v) => !picked.has(v));
    const extra = [...picked].filter((v) => !right.has(v));
    const ok = missing.length === 0 && extra.length === 0;
    const text = (v: string) => {
      const o = ex.options.find((x) => x.value === v);
      return o ? `${o.value}. ${o.text}` : v;
    };
    const details: JudgeDetail[] = [];
    if (missing.length) details.push({ label: '漏选', passed: false, actual: missing.map(text).join('；') });
    if (extra.length) details.push({ label: '多选（错误选项）', passed: false, actual: extra.map(text).join('；') });
    if (!details.length) details.push({ label: '选项集合', passed: true, actual: [...picked].map(text).join('；') });
    return { correct: ok, score: ok ? 1 : 0, details };
  }
  if (ex.type === 'judge') {
    const ok = Boolean(answer) === ex.answer;
    return {
      correct: ok,
      score: ok ? 1 : 0,
      details: [{ label: '判断', passed: ok, actual: answer ? '正确' : '错误', expected: ex.answer ? '正确' : '错误' }],
    };
  }
  return { correct: false, score: 0, details: [], message: '题型不匹配' };
}

/** 填空题判分：每个空独立计分，全部正确才算通过 */
export function judgeFill(ex: FillExercise, answers: string[]): JudgeResult {
  const details: JudgeDetail[] = [];
  let hit = 0;
  ex.blanks.forEach((candidates, i) => {
    const raw = answers[i] ?? '';
    const norm = normalizeText(raw, ex.caseSensitive, ex.ignoreWhitespace);
    const ok = candidates.some((c) => {
      if (c.startsWith('/') && c.lastIndexOf('/') > 0) {
        const lastSlash = c.lastIndexOf('/');
        const pattern = c.slice(1, lastSlash);
        const flags = c.slice(lastSlash + 1);
        try {
          return new RegExp(pattern, flags).test(raw.trim());
        } catch {
          return false;
        }
      }
      return normalizeText(c, ex.caseSensitive, ex.ignoreWhitespace) === norm;
    });
    if (ok) hit += 1;
    details.push({
      label: `第 ${i + 1} 空`,
      passed: ok,
      actual: raw.trim() || '（空）',
      expected: ok ? undefined : candidates.filter((c) => !c.startsWith('/')).join(' / ') || '见解析',
    });
  });
  return { correct: hit === ex.blanks.length, score: hit / ex.blanks.length, details };
}

/** 代码题判分：在隔离环境运行测试断言 */
export async function judgeCode(ex: CodeExercise, code: string): Promise<JudgeResult> {
  if (!code.trim()) return { correct: false, score: 0, details: [], message: '请先编写代码' };
  try {
    const res = await judgePython(code, ex.tests, { setupCode: ex.setupCode });
    if (res.error && res.details.length === 0) {
      return {
        correct: false,
        score: 0,
        details: [{ label: '代码执行', passed: false, actual: res.error.split('\n').slice(-4).join('\n') }],
        message: '代码无法运行或测试断言执行失败',
      };
    }
    const passedCount = res.details.filter((d) => d.passed).length;
    const score = res.details.length ? passedCount / res.details.length : 0;
    return {
      correct: res.passed,
      score,
      details: res.details.map((d) => ({ label: d.label, passed: d.passed, actual: d.actual })),
      message: res.passed ? undefined : `${res.details.length - passedCount} / ${res.details.length} 个测试未通过`,
    };
  } catch (e) {
    return {
      correct: false,
      score: 0,
      details: [],
      message: `判分引擎出错：${e instanceof Error ? e.message : String(e)}`,
    };
  }
}

/* ─────────────── SQL 结果集比对 ─────────────── */

type Cell = string | number | boolean | null;

function normCell(v: Cell): string {
  if (v === null || v === undefined) return '∅';
  if (typeof v === 'number') {
    const r = Math.round(v * 1e6) / 1e6;
    return Number.isInteger(r) ? String(r) : r.toFixed(6).replace(/0+$/, '');
  }
  return String(v).trim();
}

function rowKey(row: Cell[], cols: string[], order: string[]): string {
  return order.map((c) => normCell(row[cols.indexOf(c)] ?? null)).join('\u0001');
}

type Row = Cell[];

function compareResultSets(
  user: { columns: string[]; rows: Row[] },
  ref: { columns: string[]; rows: Row[] },
  ordered: boolean,
  compareColumnOrder: boolean,
): { ok: boolean; reason?: string; missing: number; extra: number } {
  if (compareColumnOrder) {
    if (user.columns.length !== ref.columns.length) {
      return { ok: false, reason: `列数不一致：你的查询返回 ${user.columns.length} 列，期望 ${ref.columns.length} 列`, missing: 0, extra: 0 };
    }
    if (user.columns.some((c, i) => normCell(c).toLowerCase() !== normCell(ref.columns[i]).toLowerCase())) {
      return { ok: false, reason: `列名/列顺序不一致。期望：${ref.columns.join(', ')}`, missing: 0, extra: 0 };
    }
  } else {
    const u = user.columns.map((c) => c.toLowerCase()).slice().sort();
    const r = ref.columns.map((c) => c.toLowerCase()).slice().sort();
    if (u.join('|') !== r.join('|')) {
      return { ok: false, reason: `列名不一致。你的列：${user.columns.join(', ')}；期望列：${ref.columns.join(', ')}`, missing: 0, extra: 0 };
    }
  }
  // 按参考列顺序对齐用户的列
  const order = ref.columns.map((rc) => user.columns.find((uc) => uc.toLowerCase() === rc.toLowerCase())!);
  const userRows = user.rows.map((r) => order.map((oc) => r[user.columns.indexOf(oc)] ?? null));
  const refRows = ref.rows;

  if (!ordered) {
    const refCount = new Map<string, number>();
    for (const r of refRows) {
      const k = rowKey(r, ref.columns, ref.columns);
      refCount.set(k, (refCount.get(k) ?? 0) + 1);
    }
    let extra = 0;
    for (const r of userRows) {
      const k = rowKey(r, ref.columns, ref.columns);
      const c = refCount.get(k);
      if (c && c > 0) refCount.set(k, c - 1);
      else extra += 1;
    }
    let missing = 0;
    refCount.forEach((c) => (missing += c));
    if (missing || extra) {
      return {
        ok: false,
        reason: `结果集不匹配：缺少 ${missing} 行，多出 ${extra} 行（当前忽略了行顺序）`,
        missing,
        extra,
      };
    }
    return { ok: true, missing: 0, extra: 0 };
  }

  if (userRows.length !== refRows.length) {
    return { ok: false, reason: `行数不一致：你的结果 ${userRows.length} 行，期望 ${refRows.length} 行`, missing: 0, extra: 0 };
  }
  for (let i = 0; i < refRows.length; i += 1) {
    const a = rowKey(userRows[i], ref.columns, ref.columns);
    const b = rowKey(refRows[i], ref.columns, ref.columns);
    if (a !== b) {
      return { ok: false, reason: `第 ${i + 1} 行不一致：期望 ${b.replaceAll('\u0001', ' | ')}`, missing: 0, extra: 0 };
    }
  }
  return { ok: true, missing: 0, extra: 0 };
}

export async function judgeSql(ex: SqlExercise, sql: string): Promise<JudgeResult & { userResult?: unknown }> {
  const ds = SQL_DATASETS[ex.dataset ?? 'retail'];
  if (!ds) return { correct: false, score: 0, details: [], message: `未知数据集：${ex.dataset}` };
  if (!sql.trim()) return { correct: false, score: 0, details: [], message: '请先编写 SQL' };

  const ref = await runSql(ds.id, ds.initSql, ex.referenceSql);
  if (!ref.ok || !ref.result) {
    return { correct: false, score: 0, details: [], message: `参考查询执行失败（题目配置问题）：${ref.error}` };
  }
  const user = await runSql(ds.id, ds.initSql, sql);
  if (!user.ok) {
    return { correct: false, score: 0, details: [{ label: 'SQL 执行', passed: false, actual: user.error }], message: 'SQL 语法或运行时错误' };
  }
  if (!user.result) {
    return { correct: false, score: 0, details: [{ label: '结果集', passed: false, actual: '没有返回结果集（只执行了 DML？）' }] };
  }
  if (!ex.allowEmpty && user.result.rows.length === 0 && ref.result.rows.length > 0) {
    return {
      correct: false,
      score: 0,
      details: [{ label: '结果集', passed: false, actual: '你的结果为空，但期望有数据（检查 JOIN / WHERE 条件）' }],
    };
  }
  const cmp = compareResultSets(user.result, ref.result, Boolean(ex.ordered), Boolean(ex.compareColumnOrder));
  return {
    correct: cmp.ok,
    score: cmp.ok ? 1 : 0,
    details: [
      {
        label: '结果集',
        passed: cmp.ok,
        actual: `${user.result.rows.length} 行 × ${user.result.columns.length} 列`,
        expected: `${ref.result.rows.length} 行 × ${ref.result.columns.length} 列`,
      },
    ],
    message: cmp.reason,
  };
}

/** 简答题：关键词预评分，用户再对照要点自评 */
export function autoScoreOpen(ex: OpenExercise, text: string): { hits: string[]; ratio: number } {
  const t = text.toLowerCase();
  const kws = ex.keywords ?? [];
  const hits = kws.filter((k) => t.includes(k.toLowerCase()));
  return { hits, ratio: kws.length ? hits.length / kws.length : 0 };
}

/** 统一入口 */
export async function judgeExercise(ex: Exercise, answer: unknown): Promise<JudgeResult> {
  switch (ex.type) {
    case 'single':
    case 'multiple':
    case 'judge':
      return judgeChoice(ex, answer);
    case 'fill':
      return judgeFill(ex, Array.isArray(answer) ? (answer as string[]) : []);
    case 'code':
      return judgeCode(ex, String(answer ?? ''));
    case 'sql':
      return judgeSql(ex, String(answer ?? ''));
    case 'open':
      return { correct: true, score: 1, details: [], message: '简答题请对照评分要点自评' };
    default:
      return { correct: false, score: 0, details: [], message: '未知题型' };
  }
}
