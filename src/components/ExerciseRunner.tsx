/**
 * 习题作答器：支持 7 种题型的输入、判分与反馈。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { findLesson } from '../content';
import { Markdown } from './Markdown';
import { CodeEditor } from './CodeEditor';
import { DataTable } from './OutputView';
import type {
  CodeExercise,
  Exercise,
  ExerciseType,
  FillExercise,
  JudgeResult,
  OpenExercise,
  SqlExercise,
} from '../types';
import { judgeCode, judgeFill, judgeChoice, judgeSql, autoScoreOpen, SQL_DATASETS } from '../engine/judge';
import { runSql } from '../engine/sqlRunner';
import { runPython } from '../engine/pyodideRunner';
import { useLocalDraft } from '../store/studyState';
import './ExerciseRunner.css';

export const TYPE_META: Record<ExerciseType, { label: string; icon: string; color: string }> = {
  single: { label: '单选题', icon: '○', color: '#2f6bff' },
  multiple: { label: '多选题', icon: '☑', color: '#7c3aed' },
  judge: { label: '判断题', icon: '⚖', color: '#0891b2' },
  fill: { label: '填空题', icon: '✎', color: '#d97706' },
  code: { label: '编程题', icon: '</>', color: '#16a34a' },
  sql: { label: 'SQL 题', icon: '▤', color: '#db2777' },
  open: { label: '简答题', icon: '✍', color: '#4b5563' },
};

export function DifficultyDots({ level }: { level: number }) {
  return (
    <span className="diff-dots" title={`难度 ${level}/5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`diff-dot ${i <= level ? 'on' : ''}`} />
      ))}
    </span>
  );
}

/** 统一的参考答案文本（用于"查看答案"） */
export function answerText(ex: Exercise): string {
  switch (ex.type) {
    case 'single': {
      const o = ex.options.find((x) => x.value === ex.answer);
      return `${ex.answer}. ${o?.text ?? ''}`;
    }
    case 'multiple': {
      const list: string[] = ex.answer;
      return list
        .map((v) => {
          const o = ex.options.find((x) => x.value === v);
          return `${v}. ${o?.text ?? ''}`;
        })
        .join('\n');
    }
    case 'judge':
      return ex.answer ? '正确' : '错误';
    case 'fill':
      return ex.blanks.map((b, i) => `空 ${i + 1}：${b.filter((x) => !x.startsWith('/')).join(' 或 ')}`).join('\n');
    case 'code':
      return ex.answer ?? (ex.starterCode.includes('___') ? '（见解析中的完整代码）' : ex.starterCode);
    case 'sql':
      return ex.answer ?? ex.referenceSql;
    case 'open':
      return ex.answer ?? ex.referenceAnswer;
    default:
      return '';
  }
}

interface RunnerProps {
  exercise: Exercise;
  index: number;
  total: number;
  onJudged: (result: JudgeResult, answer: unknown, durationMs: number) => void;
  onNext: () => void;
  onPrev: () => void;
  isLast: boolean;
}

export function ExerciseRunner({ exercise, index, total, onJudged, onNext, onPrev, isLast }: RunnerProps) {
  const startedAt = useRef(Date.now());
  const [result, setResult] = useState<JudgeResult | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [attemptKey, setAttemptKey] = useState(0);

  useEffect(() => {
    startedAt.current = Date.now();
    setResult(null);
    setShowAnswer(false);
    setAttemptKey((k) => k);
  }, [exercise.id]);

  const meta = TYPE_META[exercise.type];

  const judged = useCallback(
    (r: JudgeResult, answer: unknown) => {
      setResult(r);
      onJudged(r, answer, Date.now() - startedAt.current);
    },
    [onJudged],
  );

  return (
    <div className="ex-runner">
      <div className="ex-head">
        <div className="row-wrap">
          <span className="ex-type" style={{ background: `${meta.color}14`, color: meta.color }}>
            {meta.icon} {meta.label}
          </span>
          <span className="ex-index">
            第 {index + 1} / {total} 题
          </span>
          <DifficultyDots level={exercise.difficulty} />
          {exercise.tags?.slice(0, 3).map((t) => (
            <span key={t} className="badge">
              {t}
            </span>
          ))}
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={onPrev} disabled={index === 0}>
            ← 上一题
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onNext} disabled={isLast}>
            下一题 →
          </button>
        </div>
      </div>

      <div className="ex-question">
        <Markdown text={exercise.question} />
      </div>

      <AnswerArea
        key={`${exercise.id}-${attemptKey}`}
        exercise={exercise}
        result={result}
        locked={Boolean(result)}
        onJudged={judged}
      />

      {result && <Feedback result={result} exercise={exercise} />}

      {showAnswer && !result && (
        <div className="answer-peek">
          <div className="out-value-label">参考答案（看完请记得自己再做一遍）</div>
          <pre className="console value">{answerText(exercise)}</pre>
        </div>
      )}

      <div className="ex-foot">
        <button className="btn btn-ghost btn-sm" onClick={() => setShowAnswer((s) => !s)} disabled={Boolean(result)}>
          {showAnswer ? '隐藏答案' : '👀 查看答案'}
        </button>
        <div className="spacer" />
        {result && !result.correct && (
          <button className="btn btn-sm" onClick={() => setAttemptKey((k) => k + 1)}>
            ↺ 再试一次
          </button>
        )}
        {result && (
          <button className="btn btn-primary btn-sm" onClick={onNext} disabled={isLast}>
            {isLast ? '本章最后一题' : '下一题 →'}
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────── 作答区 ───────────────── */

function AnswerArea({
  exercise,
  result,
  locked,
  onJudged,
}: {
  exercise: Exercise;
  result: JudgeResult | null;
  locked: boolean;
  onJudged: (r: JudgeResult, answer: unknown) => void;
}) {
  switch (exercise.type) {
    case 'single':
    case 'multiple':
    case 'judge':
      return <ChoiceAnswer exercise={exercise} locked={locked} onJudged={onJudged} />;
    case 'fill':
      return <FillAnswer exercise={exercise} result={result} locked={locked} onJudged={onJudged} />;
    case 'code':
      return <CodeAnswer exercise={exercise} locked={locked} onJudged={onJudged} alreadyResult={result} />;
    case 'sql':
      return <SqlAnswer exercise={exercise} locked={locked} onJudged={onJudged} />;
    case 'open':
      return <OpenAnswer exercise={exercise} locked={locked} onJudged={onJudged} />;
    default:
      return null;
  }
}

function ChoiceAnswer({
  exercise,
  locked,
  onJudged,
}: {
  exercise: Extract<Exercise, { type: 'single' | 'multiple' | 'judge' }>;
  locked: boolean;
  onJudged: (r: JudgeResult, answer: unknown) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const isMultiple = exercise.type === 'multiple';

  const options =
    exercise.type === 'judge'
      ? [
          { value: 'true', text: '正确' },
          { value: 'false', text: '错误' },
        ]
      : exercise.options;

  const answerOf = (vals: string[]) =>
    exercise.type === 'judge' ? vals[0] === 'true' : isMultiple ? vals : vals[0];

  const correctSet =
    exercise.type === 'judge' ? [exercise.answer ? 'true' : 'false'] : exercise.type === 'single' ? [exercise.answer] : exercise.answer;

  const pick = (v: string) => {
    if (locked) return;
    if (isMultiple) {
      setSelected((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
      return;
    }
    setSelected([v]);
    onJudged(judgeChoice(exercise, answerOf([v])), answerOf([v]));
  };

  return (
    <div>
      <div className="choice-list">
        {options.map((o) => {
          const isSel = selected.includes(o.value);
          const isRight = correctSet.includes(o.value);
          let cls = 'choice';
          if (isSel) cls += ' selected';
          if (locked) {
            if (isRight) cls += ' correct';
            else if (isSel) cls += ' wrong';
          }
          return (
            <div key={o.value} className={cls} onClick={() => pick(o.value)}>
              <span className="choice-key">
                {exercise.type === 'judge' ? (o.value === 'true' ? '√' : '×') : o.value.toUpperCase()}
              </span>
              <div className="choice-text">
                <Markdown text={o.text} />
              </div>
              {locked && isRight && <span className="choice-mark ok">✓</span>}
              {locked && isSel && !isRight && <span className="choice-mark no">✗</span>}
            </div>
          );
        })}
      </div>
      {!locked && isMultiple && (
        <div className="submit-row">
          <button className="btn btn-primary" onClick={() => onJudged(judgeChoice(exercise, selected), selected)} disabled={!selected.length}>
            提交答案（已选 {selected.length} 项）
          </button>
        </div>
      )}
    </div>
  );
}

function FillAnswer({
  exercise,
  result,
  locked,
  onJudged,
}: {
  exercise: FillExercise;
  result: JudgeResult | null;
  locked: boolean;
  onJudged: (r: JudgeResult, answer: unknown) => void;
}) {
  const [values, setValues] = useState<string[]>(() => exercise.blanks.map(() => ''));
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const submit = () => {
    if (locked) return;
    onJudged(judgeFill(exercise, values), values);
  };

  return (
    <div>
      {exercise.prefix && (
        <pre className="code-block">
          <code>{exercise.prefix}</code>
        </pre>
      )}
      <div className="fill-blanks">
        {exercise.blanks.map((_, i) => (
          <span key={i} className="fill-group">
            <span className="fill-label">空 {i + 1}</span>
            <input
              ref={(el) => {
                inputsRef.current[i] = el;
              }}
              className={`fill-input ${locked ? (result?.details[i]?.passed ? 'ok' : 'no') : ''}`}
              value={values[i]}
              onChange={(e) => setValues((v) => v.map((x, j) => (j === i ? e.target.value : x)))}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                if (i < exercise.blanks.length - 1) inputsRef.current[i + 1]?.focus();
                else submit();
              }}
              disabled={locked}
              placeholder={`第 ${i + 1} 空`}
              spellCheck={false}
              autoComplete="off"
            />
          </span>
        ))}
      </div>
      {exercise.suffix && (
        <pre className="code-block">
          <code>{exercise.suffix}</code>
        </pre>
      )}
      {!locked && (
        <div className="submit-row">
          <button className="btn btn-primary" onClick={submit} disabled={values.every((v) => !v.trim())}>
            提交答案
          </button>
          <span className="muted">忽略首尾空格与引号差异，多个等价写法均可判对</span>
        </div>
      )}
    </div>
  );
}

function CodeAnswer({
  exercise,
  locked,
  onJudged,
}: {
  exercise: CodeExercise;
  locked: boolean;
  onJudged: (r: JudgeResult, answer: unknown) => void;
  alreadyResult: JudgeResult | null;
}) {
  const [code, setCode] = useLocalDraft(`knowledge-order:code:${exercise.id}`, exercise.starterCode);
  const [running, setRunning] = useState(false);
  const [runOut, setRunOut] = useState<{ ok: boolean; text: string } | null>(null);

  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      const r = await runPython(code, { namespace: `ex_${exercise.id}` });
      const parts: string[] = [];
      if (r.stdout) parts.push(r.stdout);
      if (r.table) parts.push(`[表格] ${r.table.rows.length} 行 × ${r.table.columns.length} 列`);
      if (r.valueText) parts.push(`返回值：${r.valueText}`);
      if (r.error) parts.push(r.error);
      setRunOut({ ok: r.ok, text: parts.join('\n') || '（没有输出）' });
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    if (running) return;
    setRunning(true);
    try {
      const r = await judgeCode(exercise, code);
      onJudged(r, code);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <CodeEditor
        value={code}
        onChange={(v) => !locked && setCode(v)}
        lang="python"
        height={Math.min(460, Math.max(150, code.split('\n').length * 21 + 30))}
        readOnly={locked}
        onRun={run}
      />
      <div className="submit-row">
        <button className="btn" onClick={run} disabled={running}>
          ▶ 运行 <span className="kbd">Ctrl+Enter</span>
        </button>
        <button className="btn btn-ghost" onClick={() => setCode(exercise.starterCode)} disabled={running || locked}>
          ↺ 重置代码
        </button>
        {locked ? null : (
          <button className="btn btn-primary" onClick={submit} disabled={running || !code.trim()}>
            {running ? '判分中…' : '✓ 提交判分'}
          </button>
        )}
        <span className="muted">{exercise.expectedOutput ? `期望输出：${exercise.expectedOutput}` : ''}</span>
      </div>
      {runOut && (
        <pre className={`console ${runOut.ok ? '' : 'error'}`} style={{ marginTop: 10 }}>
          {runOut.text}
        </pre>
      )}
    </div>
  );
}

function SqlAnswer({
  exercise,
  locked,
  onJudged,
}: {
  exercise: SqlExercise;
  locked: boolean;
  onJudged: (r: JudgeResult, answer: unknown) => void;
}) {
  const ds = exercise.dataset ? SQL_DATASETS[exercise.dataset] : SQL_DATASETS.retail;
  if (!ds) return <div className="out-empty">未知数据集：{exercise.dataset}</div>;
  const [text, setText] = useLocalDraft(`knowledge-order:sql:${exercise.id}`, exercise.starterSql ?? '');
  const [running, setRunning] = useState(false);
  const [runOut, setRunOut] = useState<{
    ok: boolean;
    error?: string;
    columns?: string[];
    data?: (string | number | boolean | null)[][];
  } | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const [refRows, setRefRows] = useState<{ columns: string[]; rows: (string | number | boolean | null)[][] } | null>(null);
  const [showRef, setShowRef] = useState(false);

  const run = async () => {
    if (running) return;
    setRunning(true);
    try {
      const r = await runSql(ds.id, ds.initSql, text);
      setRunOut({ ok: r.ok, error: r.error, columns: r.result?.columns, data: r.result?.rows });
    } finally {
      setRunning(false);
    }
  };

  const submit = async () => {
    if (running) return;
    setRunning(true);
    try {
      onJudged(await judgeSql(exercise, text), text);
    } finally {
      setRunning(false);
    }
  };

  const toggleRef = async () => {
    setShowRef((s) => !s);
    if (!refRows) {
      const r = await runSql(ds.id, ds.initSql, exercise.referenceSql);
      if (r.result) setRefRows({ columns: r.result.columns, rows: r.result.rows });
    }
  };

  return (
    <div>
      <div className="schema-bar">
        <button className="btn btn-ghost btn-sm" onClick={() => setShowSchema((s) => !s)}>
          {showSchema ? '▾ 收起表结构' : '▸ 表结构'}
        </button>
        <span className="muted">
          数据集：{ds.title}（{ds.tables.map((t) => t.name).join(', ')}）
        </span>
      </div>
      {showSchema && (
        <div className="schema-box">
          {ds.tables.map((t) => (
            <div key={t.name} className="schema-table">
              <div className="schema-name">{t.name}</div>
              <div className="schema-desc">{t.description}</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>字段</th>
                    <th>类型</th>
                    <th>说明</th>
                  </tr>
                </thead>
                <tbody>
                  {t.columns.map((c) => (
                    <tr key={c.name}>
                      <td>{c.name}</td>
                      <td>{c.type}</td>
                      <td>{c.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
      <CodeEditor
        value={text}
        onChange={(v) => !locked && setText(v)}
        lang="sql"
        height={Math.min(320, Math.max(110, text.split('\n').length * 21 + 30))}
        readOnly={locked}
        onRun={run}
        placeholder="SELECT ..."
      />
      <div className="submit-row">
        <button className="btn" onClick={run} disabled={running}>
          ▶ 运行 <span className="kbd">Ctrl+Enter</span>
        </button>
        {!locked && (
          <button className="btn btn-primary" onClick={submit} disabled={running || !text.trim()}>
            {running ? '判分中…' : '✓ 提交判分'}
          </button>
        )}
        <button className="btn btn-ghost" onClick={toggleRef}>
          {showRef ? '隐藏期望结果' : '👁 查看期望结果集'}
        </button>
        <button className="btn btn-ghost" onClick={() => setText(exercise.starterSql ?? '')} disabled={locked || running}>
          ↺ 清空
        </button>
      </div>
      {runOut && (
        <div style={{ marginTop: 10 }}>
          {!runOut.ok ? (
            <pre className="console error">{runOut.error}</pre>
          ) : !runOut.data?.length ? (
            <div className="out-empty">查询没有返回任何行</div>
          ) : (
            <DataTable columns={runOut.columns ?? []} rows={runOut.data} maxRows={100} />
          )}
        </div>
      )}
      {showRef && refRows && (
        <div style={{ marginTop: 10 }}>
          <div className="muted" style={{ marginBottom: 4 }}>
            期望结果集（{refRows.rows.length} 行）：
          </div>
          <DataTable columns={refRows.columns} rows={refRows.rows} maxRows={60} />
        </div>
      )}
    </div>
  );
}

function OpenAnswer({
  exercise,
  locked,
  onJudged,
}: {
  exercise: OpenExercise;
  locked: boolean;
  onJudged: (r: JudgeResult, answer: unknown) => void;
}) {
  const [text, setText] = useLocalDraft(`knowledge-order:open:${exercise.id}`, '');
  const [selfScores, setSelfScores] = useState<number[]>(() => exercise.rubric.map(() => 0));
  const [revealed, setRevealed] = useState(locked);

  const auto = useMemo(() => autoScoreOpen(exercise, text), [exercise, text]);
  const totalPoints = exercise.rubric.reduce((s, r) => s + r.score, 0);
  const myPoints = exercise.rubric.reduce((s, r, i) => s + (selfScores[i] ? r.score : 0), 0);

  if (!revealed) {
    return (
      <div>
        <textarea
          className="open-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="写下你的答案，尽量包含关键概念…"
          rows={7}
        />
        <div className="submit-row">
          <button className="btn btn-primary" onClick={() => setRevealed(true)} disabled={text.trim().length < 2}>
            提交，查看参考答案
          </button>
          <span className="muted">已写 {text.trim().length} 字</span>
        </div>
      </div>
    );
  }

  return (
    <div className="open-review">
      <div className="open-your">
        <div className="out-value-label">你的答案</div>
        <div className="open-your-text">{text.trim() || '（未作答）'}</div>
        {exercise.keywords?.length ? (
          <div className="kw-hits">
            关键词命中 {auto.hits.length}/{exercise.keywords.length}：
            {exercise.keywords.map((k) => (
              <span key={k} className={`kw ${auto.hits.includes(k) ? 'hit' : ''}`}>
                {k}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="open-ref">
        <div className="out-value-label">参考答案</div>
        <Markdown text={exercise.referenceAnswer} />
        {exercise.exemplar && (
          <>
            <div className="out-value-label" style={{ marginTop: 12 }}>
              优秀示例
            </div>
            <Markdown text={exercise.exemplar} />
          </>
        )}
      </div>

      <div className="open-rubric">
        <div className="out-value-label">逐条自评（勾选你答到的要点）</div>
        {exercise.rubric.map((r, i) => (
          <label key={i} className="rubric-item">
            <input
              type="checkbox"
              checked={Boolean(selfScores[i])}
              disabled={locked}
              onChange={(e) => setSelfScores((s) => s.map((v, j) => (j === i ? (e.target.checked ? 1 : 0) : v)))}
            />
            <span>{r.point}</span>
            <span className="rubric-score">{r.score} 分</span>
          </label>
        ))}
        <div className="rubric-total">
          自评得分：<strong>{myPoints}</strong> / {totalPoints}
        </div>
        {!locked && (
          <button
            className="btn btn-primary"
            onClick={() => {
              const ratio = totalPoints ? myPoints / totalPoints : 0;
              onJudged(
                {
                  correct: ratio >= 0.6,
                  score: ratio,
                  details: exercise.rubric.map((r, i) => ({ label: r.point, passed: Boolean(selfScores[i]) })),
                  message: `自评 ${myPoints}/${totalPoints} 分（≥60% 记为通过）`,
                },
                text,
              );
            }}
          >
            ✓ 确认自评结果
          </button>
        )}
      </div>
    </div>
  );
}

/* ───────────────── 反馈 ───────────────── */

function Feedback({ result, exercise }: { result: JudgeResult; exercise: Exercise }) {
  return (
    <div className={`feedback ${result.correct ? 'ok' : 'no'}`}>
      <div className="feedback-head">
        <span className="feedback-icon">{result.correct ? '✓' : '✗'}</span>
        <span>{result.correct ? '回答正确！' : '本题未通过'}</span>
        {result.score > 0 && result.score < 1 && (
          <span className="badge badge-orange" style={{ marginLeft: 'auto' }}>
            得分 {Math.round(result.score * 100)}%
          </span>
        )}
      </div>
      {result.message && <div className="feedback-msg">{result.message}</div>}
      {result.details.length > 0 && (
        <ul className="feedback-list">
          {result.details.map((d, i) => (
            <li key={i} className={d.passed ? 'pass' : 'fail'}>
              <span>{d.passed ? '✓' : '✗'}</span>
              <strong>{d.label}</strong>
              {d.actual && <span className="fb-actual">你：{d.actual}</span>}
              {d.expected && !d.passed && <span className="fb-expected">正确：{d.expected}</span>}
            </li>
          ))}
        </ul>
      )}
      {exercise.explanation && (
        <div className="feedback-expl">
          <div className="out-value-label">解析</div>
          <Markdown text={exercise.explanation} />
        </div>
      )}
      {exercise.relatedLessonId && (() => {
        const found = findLesson(exercise.relatedLessonId);
        if (!found) return null;
        return (
          <div
            className="feedback-related-lesson"
            style={{
              marginTop: 12,
              padding: '10px 14px',
              background: 'rgba(47, 107, 255, 0.05)',
              borderRadius: 8,
              border: '1px solid rgba(47, 107, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>📖</span>
              <span>
                关联知识点：<strong style={{ color: '#0f172a' }}>{found.lesson.title}</strong>
              </span>
            </div>
            <Link
              to={`/course/${found.course.id}/chapter/${found.chapter.id}`}
              className="btn btn-sm btn-outline"
              style={{ whiteSpace: 'nowrap', fontSize: 12 }}
            >
              温习小节 →
            </Link>
          </div>
        );
      })()}
    </div>
  );
}
