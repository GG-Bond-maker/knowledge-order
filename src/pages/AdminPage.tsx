/**
 * 内容管理后台：可视化录入课程 / 章节 / 知识点 / 习题。
 *
 * 数据保存到后端（content-data/courses/*.json），保存后立即热更新全站内容。
 */

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useContent, apiSaveCourse, apiCreateCourse, apiDeleteCourse, reloadContent } from '../store/contentStore';
import { getCourses } from '../content';
import { TYPE_META } from '../components/ExerciseRunner';
import { CourseIcon } from '../components/CourseIcon';
import type { Chapter, Course, Exercise, ExerciseType, Lesson } from '../types';

type Tab = 'course' | 'chapters' | 'json';

/** 生成唯一 id */
function uid(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}

function newCourse(): Course {
  return {
    id: `course_${Date.now().toString(36)}`,
    title: '新课程',
    subtitle: '一句话副标题',
    description: '课程描述',
    icon: '📘',
    color: '#2f6bff',
    domainId: 'data',
    prerequisites: [],
    targetAudience: '自学者',
    estimatedHours: 5,
    source: 'custom',
    chapters: [],
  };
}

function newChapter(): Omit<Chapter, 'courseId'> {
  return {
    id: uid('ch'),
    order: 1,
    title: '新章节',
    goal: '本章目标',
    lessons: [{ id: uid('lesson'), title: '新知识点', content: '## 标题\n\n这里写正文，支持 Markdown。' }],
    exercises: [],
  };
}

function newExercise(type: ExerciseType): Exercise {
  const base = { id: uid('ex'), type, difficulty: 2 as const, question: '题目描述' };
  switch (type) {
    case 'single':
      return {
        ...base,
        type,
        options: [
          { value: 'A', text: '选项 A' },
          { value: 'B', text: '选项 B' },
        ],
        answer: 'A',
        explanation: '',
      } as Exercise;
    case 'multiple':
      return {
        ...base,
        type,
        options: [
          { value: 'A', text: '选项 A' },
          { value: 'B', text: '选项 B' },
        ],
        answer: ['A'],
        explanation: '',
      } as Exercise;
    case 'judge':
      return { ...base, type, answer: true, explanation: '' } as Exercise;
    case 'fill':
      return { ...base, type, blanks: [['答案']], explanation: '' } as Exercise;
    case 'code':
      return {
        ...base,
        type,
        starterCode: 'x = ___\n',
        setupCode: '',
        expectedOutput: '',
        tests: 'assert x == 1',
        answer: '',
        explanation: '',
      } as Exercise;
    case 'sql':
      return {
        ...base,
        type,
        dataset: 'retail',
        starterSql: '',
        referenceSql: 'SELECT 1',
        explanation: '',
      } as Exercise;
    default:
      return { ...base, type: 'open', referenceAnswer: '参考要点', rubric: [{ point: '要点 1', score: 1 }], explanation: '' } as Exercise;
  }
}

export function AdminPage() {
  const content = useContent();
  const courses = useMemo(() => getCourses(), [content]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Course | null>(null);
  const [tab, setTab] = useState<Tab>('course');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedId && courses.length) setSelectedId(courses[0].id);
  }, [courses, selectedId]);

  useEffect(() => {
    const c = courses.find((x) => x.id === selectedId);
    setDraft(c ? structuredClone(c) : null);
  }, [selectedId, content]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    window.setTimeout(() => setMsg(null), 3500);
  };

  const save = async () => {
    if (!draft) return;
    try {
      await apiSaveCourse(draft);
      flash('ok', '✓ 已保存，全站内容已更新');
    } catch (e) {
      flash('err', `保存失败：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const create = async () => {
    const c = newCourse();
    try {
      await apiCreateCourse(c);
      setSelectedId(c.id);
      flash('ok', '✓ 已创建课程');
    } catch (e) {
      flash('err', `创建失败：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const remove = async () => {
    if (!draft) return;
    if (!window.confirm(`确定删除课程「${draft.title}」吗？删除前会自动备份到 content-data/backups/`)) return;
    try {
      await apiDeleteCourse(draft.id);
      setSelectedId(null);
      flash('ok', '✓ 已删除（已备份）');
    } catch (e) {
      flash('err', `删除失败：${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const patchCourse = (patch: Partial<Course>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const patchChapter = (chId: string, patch: Partial<Chapter>) =>
    setDraft((d) =>
      d ? { ...d, chapters: d.chapters.map((ch) => (ch.id === chId ? { ...ch, ...patch } : ch)) } : d,
    );

  const patchLesson = (chId: string, lessonId: string, patch: Partial<Lesson>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            chapters: d.chapters.map((ch) =>
              ch.id === chId
                ? { ...ch, lessons: ch.lessons.map((l) => (l.id === lessonId ? { ...l, ...patch } : l)) }
                : ch,
            ),
          }
        : d,
    );

  const patchExercise = (chId: string, exId: string, patch: Partial<Exercise>) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            chapters: d.chapters.map((ch) =>
              ch.id === chId
                ? { ...ch, exercises: ch.exercises.map((ex) => (ex.id === exId ? ({ ...ex, ...patch } as Exercise) : ex)) }
                : ch,
            ),
          }
        : d,
    );

  const removeAt = (chId: string, kind: 'lesson' | 'exercise', id: string) =>
    setDraft((d) =>
      d
        ? {
            ...d,
            chapters: d.chapters.map((ch) =>
              ch.id === chId
                ? kind === 'lesson'
                  ? { ...ch, lessons: ch.lessons.filter((l) => l.id !== id) }
                  : { ...ch, exercises: ch.exercises.filter((e) => e.id !== id) }
                : ch,
            ),
          }
        : d,
    );

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <h1 className="practice-title" style={{ margin: 0 }}>
          ✏️ 内容管理
        </h1>
        <span className={`badge ${content.source === 'api' ? 'badge-green' : 'badge-orange'}`}>
          {content.source === 'api' ? '已连接后端' : '使用内置内容（后端未连接）'}
        </span>
        <div className="spacer" />
        <button className="btn btn-sm" onClick={() => reloadContent()}>
          ↻ 重新加载
        </button>
        <button className="btn btn-sm btn-primary" onClick={create}>
          ＋ 新建课程
        </button>
      </div>

      {content.source !== 'api' && (
        <div className="content-hint" style={{ marginBottom: 14 }}>
          当前未连接内容服务，修改无法保存。请在项目目录执行 <code>npm run server</code> 启动后端（端口 3001）。
        </div>
      )}

      {msg && (
        <div
          className={`content-hint`}
          style={{
            marginBottom: 14,
            background: msg.type === 'ok' ? 'var(--success-soft)' : 'var(--danger-soft)',
            borderColor: msg.type === 'ok' ? '#bbf7d0' : '#fecaca',
            color: msg.type === 'ok' ? '#14532d' : '#7f1d1d',
          }}
        >
          {msg.text}
        </div>
      )}

      <div className="admin-layout">
        <aside className="admin-side">
          <div className="admin-side-head">
            <b style={{ fontSize: 13 }}>课程列表</b>
            <span className="muted">{courses.length}</span>
          </div>
          <div className="admin-course-list">
            {courses.map((c) => (
              <div
                key={c.id}
                className={`admin-course-item ${c.id === selectedId ? 'active' : ''}`}
                onClick={() => setSelectedId(c.id)}
              >
                <span style={{ fontSize: 16, display: 'inline-flex', alignItems: 'center' }}>
                  <CourseIcon icon={c.icon} courseId={c.id} color={c.color} size={16} />
                </span>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {c.chapters.length} 章 · {c.chapters.reduce((s, x) => s + x.exercises.length, 0)} 题
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="admin-main">
          {!draft ? (
            <div className="admin-empty">选择左侧课程开始编辑</div>
          ) : (
            <>
              <div className="admin-toolbar">
                <div className="filter-tabs" style={{ marginRight: 'auto' }}>
                  <button className={`filter-tab ${tab === 'course' ? 'active' : ''}`} onClick={() => setTab('course')}>
                    课程信息
                  </button>
                  <button className={`filter-tab ${tab === 'chapters' ? 'active' : ''}`} onClick={() => setTab('chapters')}>
                    章节与习题（{draft.chapters.length}）
                  </button>
                  <button className={`filter-tab ${tab === 'json' ? 'active' : ''}`} onClick={() => setTab('json')}>
                    JSON 源码
                  </button>
                </div>
                <Link to={`/course/${draft.id}`} className="btn btn-sm" target="_blank">
                  👁 预览
                </Link>
                <button className="btn btn-sm" onClick={remove} style={{ color: 'var(--danger)' }}>
                  删除课程
                </button>
                <button className="btn btn-sm btn-primary" onClick={save}>
                  💾 保存
                </button>
              </div>

              {tab === 'course' && (
                <div className="admin-panel">
                  <div className="form-grid">
                    <label className="form-field">
                      <span>课程 id（唯一，建议英文）</span>
                      <input value={draft.id} readOnly style={{ background: '#f7f9fd' }} />
                    </label>
                    <label className="form-field">
                      <span>标题</span>
                      <input value={draft.title} onChange={(e) => patchCourse({ title: e.target.value })} />
                    </label>
                    <label className="form-field">
                      <span>副标题</span>
                      <input value={draft.subtitle} onChange={(e) => patchCourse({ subtitle: e.target.value })} />
                    </label>
                    <label className="form-field">
                      <span>图标 emoji</span>
                      <input value={draft.icon} onChange={(e) => patchCourse({ icon: e.target.value })} />
                    </label>
                    <label className="form-field">
                      <span>主题色</span>
                      <input value={draft.color} onChange={(e) => patchCourse({ color: e.target.value })} />
                    </label>
                    <label className="form-field">
                      <span>所属学科</span>
                      <select value={draft.domainId ?? 'data'} onChange={(e) => patchCourse({ domainId: e.target.value })}>
                        {content.domains.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.icon} {d.title}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-field">
                      <span>预计学时</span>
                      <input
                        type="number"
                        value={draft.estimatedHours}
                        onChange={(e) => patchCourse({ estimatedHours: Number(e.target.value) || 0 })}
                      />
                    </label>
                    <label className="form-field">
                      <span>目标人群</span>
                      <input value={draft.targetAudience} onChange={(e) => patchCourse({ targetAudience: e.target.value })} />
                    </label>
                    <label className="form-field wide">
                      <span>课程描述</span>
                      <textarea value={draft.description} onChange={(e) => patchCourse({ description: e.target.value })} />
                    </label>
                  </div>
                </div>
              )}

              {tab === 'chapters' && (
                <div>
                  <div className="row" style={{ marginBottom: 12 }}>
                    <span className="muted">
                      共 {draft.chapters.length} 章 ·{' '}
                      {draft.chapters.reduce((s, c) => s + c.lessons.length, 0)} 个知识点 ·{' '}
                      {draft.chapters.reduce((s, c) => s + c.exercises.length, 0)} 道习题
                    </span>
                    <div className="spacer" />
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        const ch = newChapter();
                        patchCourse({
                          chapters: [
                            ...draft.chapters,
                            { ...ch, courseId: draft.id, order: draft.chapters.length + 1 },
                          ],
                        });
                        setOpenChapter(ch.id);
                      }}
                    >
                      ＋ 添加章节
                    </button>
                  </div>

                  {draft.chapters.map((ch, ci) => (
                    <div key={ch.id} className="chapter-accordion">
                      <div
                        className={`chapter-acc-head ${openChapter === ch.id ? 'open' : ''}`}
                        onClick={() => setOpenChapter(openChapter === ch.id ? null : ch.id)}
                      >
                        <span className="badge">{ci + 1}</span>
                        <b style={{ fontSize: 13.5 }}>{ch.title}</b>
                        <span className="muted">
                          {ch.lessons.length} 节 · {ch.exercises.length} 题
                        </span>
                        <div className="spacer" />
                        <span className="muted">{openChapter === ch.id ? '▾' : '▸'}</span>
                      </div>

                      {openChapter === ch.id && (
                        <div className="chapter-acc-body">
                          <div className="form-grid">
                            <label className="form-field">
                              <span>章节标题</span>
                              <input value={ch.title} onChange={(e) => patchChapter(ch.id, { title: e.target.value })} />
                            </label>
                            <label className="form-field wide">
                              <span>章节目标</span>
                              <input value={ch.goal} onChange={(e) => patchChapter(ch.id, { goal: e.target.value })} />
                            </label>
                          </div>

                          <div>
                            <div className="row" style={{ marginBottom: 8 }}>
                              <b style={{ fontSize: 13 }}>知识点（{ch.lessons.length}）</b>
                              <div className="spacer" />
                              <button
                                className="btn btn-sm"
                                onClick={() =>
                                  patchChapter(ch.id, {
                                    lessons: [...ch.lessons, { id: uid('lesson'), title: '新知识点', content: '' }],
                                  })
                                }
                              >
                                ＋ 知识点
                              </button>
                            </div>
                            {ch.lessons.map((l) => (
                              <div key={l.id} className="lesson-editor">
                                <div className="lesson-editor-head">
                                  <input
                                    className="plan-input"
                                    value={l.title}
                                    onChange={(e) => patchLesson(ch.id, l.id, { title: e.target.value })}
                                    style={{ flex: 1 }}
                                  />
                                  <button className="btn btn-sm btn-ghost" onClick={() => removeAt(ch.id, 'lesson', l.id)}>
                                    删除
                                  </button>
                                </div>
                                <textarea
                                  className="note-textarea"
                                  value={l.content}
                                  onChange={(e) => patchLesson(ch.id, l.id, { content: e.target.value })}
                                  placeholder="Markdown 正文。行内代码请用反斜杠转义的反引号：\`code\`"
                                  style={{ minHeight: 160, fontFamily: 'var(--font-mono)', fontSize: 12.5 }}
                                />
                              </div>
                            ))}
                          </div>

                          <div>
                            <div className="row" style={{ marginBottom: 8 }}>
                              <b style={{ fontSize: 13 }}>习题（{ch.exercises.length}）</b>
                              <div className="spacer" />
                              {(Object.keys(TYPE_META) as ExerciseType[]).map((t) => (
                                <button
                                  key={t}
                                  className="btn btn-sm"
                                  onClick={() => patchChapter(ch.id, { exercises: [...ch.exercises, newExercise(t)] })}
                                  title={`添加${TYPE_META[t].label}`}
                                  style={{ fontSize: 11.5 }}
                                >
                                  ＋{TYPE_META[t].label}
                                </button>
                              ))}
                            </div>
                            {ch.exercises.map((ex, ei) => (
                              <ExerciseEditor
                                key={ex.id}
                                exercise={ex}
                                index={ei}
                                onChange={(patch) => patchExercise(ch.id, ex.id, patch)}
                                onDelete={() => removeAt(ch.id, 'exercise', ex.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {tab === 'json' && (
                <div className="admin-panel">
                  <div className="muted" style={{ marginBottom: 8 }}>
                    可直接编辑 JSON（适合批量导入）。修改后点「保存」生效。
                  </div>
                  <textarea
                    className="note-textarea"
                    style={{ minHeight: 520, fontFamily: 'var(--font-mono)', fontSize: 12 }}
                    value={JSON.stringify(draft, null, 2)}
                    onChange={(e) => {
                      try {
                        setDraft(JSON.parse(e.target.value));
                        setMsg(null);
                      } catch {
                        setMsg({ type: 'err', text: 'JSON 格式有误，暂未应用' });
                      }
                    }}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 单道习题编辑器 */
function ExerciseEditor({
  exercise,
  index,
  onChange,
  onDelete,
}: {
  exercise: Exercise;
  index: number;
  onChange: (patch: Partial<Exercise>) => void;
  onDelete: () => void;
}) {
  const meta = TYPE_META[exercise.type];
  const anyEx = exercise as unknown as Record<string, unknown>;

  return (
    <div className="exercise-editor">
      <div className="exercise-editor-head">
        <span className="badge">{index + 1}</span>
        <span className="exercise-type-tag" style={{ background: `${meta.color}16`, color: meta.color }}>
          {meta.icon} {meta.label}
        </span>
        <select
          value={exercise.difficulty}
          onChange={(e) => onChange({ difficulty: Number(e.target.value) as 1 | 2 | 3 | 4 | 5 })}
          style={{ padding: '3px 8px', borderRadius: 6, border: '1px solid var(--border-strong)', fontSize: 12 }}
        >
          {[1, 2, 3, 4, 5].map((d) => (
            <option key={d} value={d}>
              难度 {d}
            </option>
          ))}
        </select>
        <div className="spacer" />
        <span className="muted" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
          {exercise.id}
        </span>
        <button className="btn btn-sm btn-ghost" onClick={onDelete}>
          删除
        </button>
      </div>

      <label className="form-field" style={{ marginBottom: 8 }}>
        <span>题干（Markdown）</span>
        <textarea value={exercise.question} onChange={(e) => onChange({ question: e.target.value })} style={{ minHeight: 70 }} />
      </label>

      {(exercise.type === 'single' || exercise.type === 'multiple') && (
        <div className="form-field" style={{ marginBottom: 8 }}>
          <span>选项（勾选正确答案）</span>
          <div className="options-editor">
            {exercise.options.map((o, oi) => {
              const isAnswer =
                exercise.type === 'single' ? exercise.answer === o.value : (exercise.answer as string[]).includes(o.value);
              return (
                <div key={oi} className="option-row">
                  <input
                    type={exercise.type === 'single' ? 'radio' : 'checkbox'}
                    checked={isAnswer}
                    onChange={() => {
                      if (exercise.type === 'single') {
                        onChange({ answer: o.value } as Partial<Exercise>);
                      } else {
                        const cur = exercise.answer as string[];
                        onChange({
                          answer: cur.includes(o.value) ? cur.filter((v) => v !== o.value) : [...cur, o.value],
                        } as Partial<Exercise>);
                      }
                    }}
                  />
                  <input
                    type="text"
                    value={`${o.value}. ${o.text}`}
                    onChange={(e) => {
                      const text = e.target.value.replace(/^[A-Z]\.\s*/, '');
                      onChange({
                        options: exercise.options.map((x, j) => (j === oi ? { ...x, text } : x)),
                      } as Partial<Exercise>);
                    }}
                  />
                </div>
              );
            })}
            <button
              className="btn btn-sm"
              style={{ alignSelf: 'flex-start' }}
              onClick={() => {
                const v = String.fromCharCode(65 + exercise.options.length);
                onChange({ options: [...exercise.options, { value: v, text: '新选项' }] } as Partial<Exercise>);
              }}
            >
              ＋ 选项
            </button>
          </div>
        </div>
      )}

      {exercise.type === 'judge' && (
        <label className="form-field" style={{ marginBottom: 8 }}>
          <span>正确答案</span>
          <select
            value={String(exercise.answer)}
            onChange={(e) => onChange({ answer: e.target.value === 'true' } as Partial<Exercise>)}
          >
            <option value="true">正确</option>
            <option value="false">错误</option>
          </select>
        </label>
      )}

      {exercise.type === 'fill' && (
        <label className="form-field" style={{ marginBottom: 8 }}>
          <span>填空答案（每行一个空，多个候选答案用 | 分隔）</span>
          <textarea
            value={exercise.blanks.map((b) => b.join(' | ')).join('\n')}
            onChange={(e) =>
              onChange({
                blanks: e.target.value.split('\n').map((line) => line.split('|').map((s) => s.trim()).filter(Boolean)),
              } as Partial<Exercise>)
            }
            style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, minHeight: 60 }}
          />
        </label>
      )}

      {exercise.type === 'code' && (
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <label className="form-field wide">
            <span>初始代码（用 ___ 标记填空处）</span>
            <textarea
              value={exercise.starterCode}
              onChange={(e) => onChange({ starterCode: e.target.value } as Partial<Exercise>)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, minHeight: 110 }}
            />
          </label>
          <label className="form-field wide">
            <span>测试用例（每行一个 assert）</span>
            <textarea
              value={exercise.tests}
              onChange={(e) => onChange({ tests: e.target.value } as Partial<Exercise>)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, minHeight: 90 }}
            />
          </label>
          <label className="form-field wide">
            <span>参考解法</span>
            <textarea
              value={typeof anyEx.answer === 'string' ? (anyEx.answer as string) : ''}
              onChange={(e) => onChange({ answer: e.target.value } as Partial<Exercise>)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, minHeight: 90 }}
            />
          </label>
        </div>
      )}

      {exercise.type === 'sql' && (
        <div className="form-grid" style={{ marginBottom: 8 }}>
          <label className="form-field wide">
            <span>参考 SQL</span>
            <textarea
              value={exercise.referenceSql}
              onChange={(e) => onChange({ referenceSql: e.target.value } as Partial<Exercise>)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, minHeight: 80 }}
            />
          </label>
          <label className="form-field wide">
            <span>提示 SQL</span>
            <textarea
              value={exercise.starterSql ?? ''}
              onChange={(e) => onChange({ starterSql: e.target.value } as Partial<Exercise>)}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12.5, minHeight: 60 }}
            />
          </label>
        </div>
      )}

      {exercise.type === 'open' && (
        <label className="form-field" style={{ marginBottom: 8 }}>
          <span>参考答案</span>
          <textarea
            value={exercise.referenceAnswer}
            onChange={(e) => onChange({ referenceAnswer: e.target.value } as Partial<Exercise>)}
            style={{ minHeight: 90 }}
          />
        </label>
      )}

      <label className="form-field">
        <span>解析（判分后展示）</span>
        <textarea
          value={exercise.explanation ?? ''}
          onChange={(e) => onChange({ explanation: e.target.value })}
          style={{ minHeight: 60 }}
        />
      </label>
    </div>
  );
}
