/**
 * CodeMirror 6 代码编辑器封装：Python / SQL 语法高亮 + 主题。
 */

import CodeMirror from '@uiw/react-codemirror';
import { python } from '@codemirror/lang-python';
import { sql, SQLite } from '@codemirror/lang-sql';
import { EditorView, keymap } from '@codemirror/view';
import { Prec } from '@codemirror/state';

export interface CodeEditorProps {
  value: string;
  onChange?: (v: string) => void;
  lang?: 'python' | 'sql' | 'text';
  height?: number | string;
  readOnly?: boolean;
  /** Ctrl/Cmd+Enter 回调 */
  onRun?: () => void;
  placeholder?: string;
}

const baseTheme = EditorView.theme({
  '&': {
    fontSize: '13px',
    backgroundColor: '#ffffff',
  },
  '.cm-content': {
    fontFamily: "'JetBrains Mono','Cascadia Code',Consolas,monospace",
    padding: '10px 0',
  },
  '.cm-gutters': {
    backgroundColor: '#f8fafc',
    color: '#94a3b8',
    border: 'none',
  },
  '.cm-activeLine': { backgroundColor: '#f1f5ff' },
  '.cm-activeLineGutter': { backgroundColor: '#e8eefc' },
  '&.cm-focused .cm-selectionBackground, .cm-selectionBackground': {
    backgroundColor: '#dbeafe !important',
  },
});

export function CodeEditor({
  value,
  onChange,
  lang = 'python',
  height = 240,
  readOnly = false,
  onRun,
  placeholder,
}: CodeEditorProps) {
  const extensions = [
    lang === 'python' ? python() : lang === 'sql' ? sql({ dialect: SQLite }) : [],
    baseTheme,
    EditorView.lineWrapping,
  ];

  if (onRun) {
    extensions.push(
      Prec.highest(
        keymap.of([
          {
            key: 'Mod-Enter',
            preventDefault: true,
            run: () => {
              onRun();
              return true;
            },
          },
        ]),
      ),
    );
  }

  return (
    <div className="cm-host">
      <CodeMirror
        value={value}
        height={typeof height === 'number' ? `${height}px` : height}
        extensions={extensions}
        onChange={onChange}
        readOnly={readOnly}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLine: !readOnly,
          highlightActiveLineGutter: !readOnly,
          foldGutter: false,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          indentOnInput: true,
          tabSize: 4,
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
