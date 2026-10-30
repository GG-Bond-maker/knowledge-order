import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  GUPPY_COMMIT,
  GUPPY_DEMO_URL,
  GUPPY_PROJECT_META,
  GUPPY_REPO_URL,
  GUPPY_TASKS,
  type GuppyTask,
  type GuppyTaskId,
} from '../content/projects/guppylm';
import { GuppyVisual } from '../components/guppylm/GuppyDiagrams';
import './guppy-project.css';

const STORAGE_KEY = 'knowledge-order:guppylm-project:v1';

function parseTaskId(value: string | null): GuppyTaskId {
  const parsed = Number(value ?? '1');
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 8 ? (parsed as GuppyTaskId) : 1;
}

function readProgress(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
    );
  } catch {
    return {};
  }
}

function useGuppyProgress() {
  const [checked, setChecked] = useState<Record<string, boolean>>(readProgress);
  const acceptanceIds = useMemo(
    () => new Set(GUPPY_TASKS.flatMap((task) => task.acceptance.map((item) => item.id))),
    [],
  );

  const toggle = (id: string) => {
    setChecked((previous) => {
      const next = { ...previous, [id]: !previous[id] };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // The UI still works when storage is unavailable; only persistence is lost.
      }
      return next;
    });
  };

  const totalChecked = Object.entries(checked).filter(([id, value]) => value && acceptanceIds.has(id)).length;
  const completedTaskCount = GUPPY_TASKS.filter((task) => task.acceptance.every((item) => checked[item.id])).length;

  return { checked, toggle, totalChecked, completedTaskCount };
}

function CopyableCode({ code, label }: { code: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const copy = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(code);
      ok = true;
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      ok = document.execCommand('copy');
      textarea.remove();
    }

    if (!ok) return;
    setCopied(true);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="guppy-code">
      <div className="guppy-code-head">
        <span>{label}</span>
        <button type="button" className="guppy-copy" onClick={copy}>
          {copied ? '已复制' : '复制代码'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
      <span className="sr-only" aria-live="polite">
        {copied ? '代码已复制到剪贴板' : ''}
      </span>
    </div>
  );
}

function TaskSection({ id, title, lead, children }: { id: string; title: string; lead: string; children: ReactNode }) {
  return (
    <section className="guppy-section" data-testid={`guppy-section-${id}`}>
      <div className="guppy-section-heading">
        <h2>{title}</h2>
        <p>{lead}</p>
      </div>
      {children}
    </section>
  );
}

function TaskContent({
  task,
  checked,
  toggle,
}: {
  task: GuppyTask;
  checked: Record<string, boolean>;
  toggle: (id: string) => void;
}) {
  return (
    <>
      <TaskSection id="principle" title="原理" lead="先建立为什么这样设计的直觉，再看代码。">
        <div className="guppy-principles">
          {task.principles.map((principle, index) => (
            <article className="guppy-principle" key={principle.title}>
              <span className="guppy-index" aria-hidden="true">
                {String(index + 1).padStart(2, '0')}
              </span>
              <div>
                <h3>{principle.title}</h3>
                <p>{principle.body}</p>
                <p className="guppy-takeaway">{principle.takeaway}</p>
              </div>
            </article>
          ))}
        </div>
      </TaskSection>

      <TaskSection id="source" title="源码" lead="固定到真实提交。先看文件职责，再看关键片段实际做了什么。">
        <div className="guppy-source-list">
          {task.sources.map((item) => (
            <article className="guppy-source" key={item.path}>
              <div className="guppy-source-head">
                <div>
                  <h3>{item.path}</h3>
                  <p>{item.note}</p>
                </div>
                <a href={item.url} target="_blank" rel="noreferrer">
                  打开固定提交 ↗
                </a>
              </div>
              <CopyableCode code={item.code} label={item.path} />
            </article>
          ))}
        </div>
      </TaskSection>

      <TaskSection id="experiment" title="实验" lead="不要只看结论。运行命令，对照输出，再解释你观察到了什么。">
        <div className="guppy-experiments">
          {task.experiments.map((experiment) => (
            <article className="guppy-experiment" key={experiment.title}>
              <h3>{experiment.title}</h3>
              <CopyableCode code={experiment.command} label="运行命令" />
              <div className="guppy-result">
                <span>实测 / 预期输出</span>
                <pre>{experiment.result}</pre>
              </div>
              <p>{experiment.observation}</p>
            </article>
          ))}
        </div>
      </TaskSection>

      <TaskSection id="thinking" title="思考" lead="先自己回答，再展开提示和参考答案。">
        <div className="guppy-questions">
          {task.questions.map((question, index) => (
            <details className="guppy-question" key={question.question}>
              <summary>
                <span>{String(index + 1).padStart(2, '0')}</span>
                {question.question}
              </summary>
              <div>
                <p>
                  <b>提示：</b>
                  {question.hint}
                </p>
                <p>
                  <b>参考：</b>
                  {question.answer}
                </p>
              </div>
            </details>
          ))}
        </div>
      </TaskSection>

      <TaskSection id="extension" title="拓展" lead="把“看懂了”变成“改得动”。至少选一项动手。">
        <ol className="guppy-extensions">
          {task.extensions.map((extension) => (
            <li key={extension}>{extension}</li>
          ))}
        </ol>
      </TaskSection>

      <TaskSection id="acceptance" title="验收" lead="勾选不是装饰。每一项都要有可以拿出来看的完成证据。">
        <div className="guppy-acceptance">
          {task.acceptance.map((item, index) => (
            <label className="guppy-check" key={item.id}>
              <input
                type="checkbox"
                checked={Boolean(checked[item.id])}
                onChange={() => toggle(item.id)}
                data-testid={`guppy-acceptance-${task.id}-${index + 1}`}
              />
              <span>
                <b>{item.label}</b>
                <small>证据：{item.evidence}</small>
              </span>
            </label>
          ))}
        </div>
      </TaskSection>
    </>
  );
}

export function GuppyProjectPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeId = parseTaskId(searchParams.get('task'));
  const activeIndex = GUPPY_TASKS.findIndex((task) => task.id === activeId);
  const activeTask = GUPPY_TASKS[activeIndex] ?? GUPPY_TASKS[0];
  const { checked, toggle, totalChecked, completedTaskCount } = useGuppyProgress();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const focusedTaskId = useRef<GuppyTaskId>(1);

  useEffect(() => {
    if (focusedTaskId.current === activeTask.id) return;
    focusedTaskId.current = activeTask.id;
    titleRef.current?.focus();
  }, [activeTask.id]);

  useEffect(() => {
    if (searchParams.get('task') !== String(activeTask.id)) {
      setSearchParams({ task: String(activeTask.id) }, { replace: true });
    }
  }, [activeTask.id, searchParams, setSearchParams]);

  const totalAcceptance = useMemo(() => GUPPY_TASKS.reduce((total, task) => total + task.acceptance.length, 0), []);

  const selectTask = (id: GuppyTaskId) => {
    setSearchParams({ task: String(id) }, { replace: true });
  };

  const previous = activeIndex > 0 ? GUPPY_TASKS[activeIndex - 1] : null;
  const next = activeIndex < GUPPY_TASKS.length - 1 ? GUPPY_TASKS[activeIndex + 1] : null;

  return (
    <div className="guppy-project" data-testid="guppy-project">
      <header className="guppy-hero">
        <div className="guppy-hero-copy">
          <h1>{GUPPY_PROJECT_META.title}</h1>
          <p className="guppy-hero-sub">{GUPPY_PROJECT_META.subtitle}</p>
          <p className="guppy-hero-summary">{GUPPY_PROJECT_META.summary}</p>
          <div className="guppy-hero-badges">
            <span>{GUPPY_PROJECT_META.courseLabel}</span>
            <span>固定提交 {GUPPY_COMMIT.slice(0, 7)}</span>
            <span>8 个可验收任务</span>
          </div>
          <div className="guppy-hero-actions">
            <a href={GUPPY_REPO_URL} target="_blank" rel="noreferrer" className="guppy-button guppy-button-primary">
              查看 GitHub 源码
            </a>
            <a href={GUPPY_DEMO_URL} target="_blank" rel="noreferrer" className="guppy-button">
              打开官方浏览器 Demo
            </a>
            <Link to="/course/llm-a1" className="guppy-button guppy-button-quiet">
              返回 A1 课程
            </Link>
          </div>
        </div>
        <div className="guppy-hero-aside" aria-label="项目提醒">
          <span>先看这个</span>
          <strong>77.3% 的测试样本与训练集精确重叠</strong>
          <p>本项目不会把低 PPL 直接解释成强泛化，而会把数据泄漏做成任务 2 的核心实验。</p>
          <Link to="/project/guppylm?task=2">直接进入数据审计 →</Link>
        </div>
      </header>

      <dl className="guppy-facts">
        {GUPPY_PROJECT_META.metrics.map((metric) => (
          <div key={metric.label}>
            <dt>{metric.label}</dt>
            <dd>{metric.value}</dd>
            <span>{metric.note}</span>
          </div>
        ))}
      </dl>

      <div className="guppy-layout">
        <aside className="guppy-nav-wrap">
          <div className="guppy-progress-card">
            <div>
              <span>项目验收</span>
              <strong data-testid="guppy-progress">{completedTaskCount}/8 任务</strong>
            </div>
            <div className="guppy-progress-track" aria-hidden="true">
              <span style={{ width: `${(completedTaskCount / GUPPY_TASKS.length) * 100}%` }} />
            </div>
            <p>
              已勾选 {totalChecked}/{totalAcceptance} 条证据
            </p>
          </div>

          <nav className="guppy-task-nav" aria-label="GuppyLM 八项任务" data-testid="guppy-task-nav">
            {GUPPY_TASKS.map((task) => {
              const complete = task.acceptance.every((item) => checked[item.id]);
              return (
                <button
                  type="button"
                  key={task.id}
                  className={task.id === activeTask.id ? 'active' : ''}
                  aria-current={task.id === activeTask.id ? 'step' : undefined}
                  onClick={() => selectTask(task.id)}
                >
                  <span className="guppy-nav-number">{String(task.id).padStart(2, '0')}</span>
                  <span className="guppy-nav-label">
                    <b>{task.title}</b>
                    <small>{complete ? '验收完成' : task.level}</small>
                  </span>
                  <span className={complete ? 'guppy-nav-dot complete' : 'guppy-nav-dot'} aria-hidden="true" />
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="guppy-workbench" aria-label="GuppyLM 任务内容">
          <article className="guppy-task" key={activeTask.id}>
            <header className="guppy-task-head">
              <h2 className="guppy-task-title" data-testid="guppy-task-title" tabIndex={-1} ref={titleRef}>
                {activeTask.title}
              </h2>
              <div className="guppy-task-title-row">
                <span className="guppy-task-tag">{activeTask.eyebrow}</span>
                <span className="guppy-task-meta">
                  {activeTask.duration} · {activeTask.level}
                </span>
              </div>
              <p>{activeTask.summary}</p>
            </header>

            <div className="guppy-visual" data-testid="guppy-visual">
              <GuppyVisual kind={activeTask.visual} />
            </div>

            <TaskContent task={activeTask} checked={checked} toggle={toggle} />

            <nav className="guppy-task-footer" aria-label="任务翻页">
              {previous ? (
                <button type="button" onClick={() => selectTask(previous.id)}>
                  <span>上一任务</span>
                  <b>{previous.title}</b>
                </button>
              ) : (
                <span />
              )}
              {next ? (
                <button type="button" onClick={() => selectTask(next.id)}>
                  <span>下一任务</span>
                  <b>{next.title}</b>
                </button>
              ) : (
                <span />
              )}
            </nav>
          </article>

          <footer className="guppy-next-steps">
            <div>
              <h2>接下来学什么</h2>
              <p>GuppyLM 给你一条完整链路，下一步可以沿着训练理论或部署工程继续深入。</p>
            </div>
            <div className="guppy-next-links">
              <Link to="/course/llm-a2">
                <span>A2</span>
                <b>大模型训练原理</b>
              </Link>
              <Link to="/course/llm-b3">
                <span>B3</span>
                <b>推理与部署工程</b>
              </Link>
            </div>
          </footer>
        </section>
      </div>
    </div>
  );
}
