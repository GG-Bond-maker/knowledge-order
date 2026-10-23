import type { Demo, Tip, TipKind } from '../types';
import { Markdown } from './Markdown';
import { CodeEditor } from './CodeEditor';
import { OutputView } from './OutputView';
import { useDemoRunner } from '../hooks/useDemoRunner';
import './LessonView.css';

const TIP_META: Record<TipKind, { icon: string; label: string }> = {
  pitfall: { icon: '⚠️', label: '易错点' },
  leak: { icon: '✅', label: '最佳实践' },
  interview: { icon: '🎯', label: '面试高频' },
  performance: { icon: '⚡', label: '性能提示' },
  note: { icon: '💡', label: '补充说明' },
};

export function TipBox({ tip }: { tip: Tip }) {
  const meta = TIP_META[tip.kind] ?? TIP_META.note;
  return (
    <div className={`tip tip-${tip.kind}`}>
      <span className="tip-icon">{meta.icon}</span>
      <div>
        <strong style={{ marginRight: 6 }}>{meta.label}：</strong>
        <Markdown text={tip.text} className="prose-tight" />
      </div>
    </div>
  );
}

export function DemoBox({ demo }: { demo: Demo }) {
  const runner = useDemoRunner(demo);
  return (
    <div className="demo-box">
      <div className="demo-head">
        <div className="demo-title">
          <span className="demo-tag">{demo.lang === 'python' ? 'PYTHON' : demo.lang === 'sql' ? 'SQL' : 'TEXT'}</span>
          {demo.title ?? '动手试试'}
        </div>
        <div className="row">
          <button className="btn btn-ghost btn-sm" onClick={runner.reset} title="恢复初始代码">
            重置
          </button>
          <button className="btn btn-primary btn-sm" onClick={runner.run} disabled={runner.running}>
            {runner.running ? '运行中…' : '▶ 运行'}
          </button>
        </div>
      </div>
      <CodeEditor
        value={runner.code}
        onChange={runner.setCode}
        lang={demo.lang === 'sql' ? 'sql' : 'python'}
        height={Math.min(360, Math.max(110, demo.code.split('\n').length * 21 + 20))}
        onRun={runner.run}
      />
      {runner.stage && !runner.result && <div className="demo-stage">{runner.stage}</div>}
      <OutputView result={runner.result} running={runner.running} emptyHint="点击「运行」在线执行这段代码" />
    </div>
  );
}
