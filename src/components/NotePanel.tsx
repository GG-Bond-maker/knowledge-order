/**
 * 笔记面板：挂在知识点或习题旁边，支持展开编辑与历史笔记列表。
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteNote, getNoteFor, upsertNote, useStudyState } from '../store/studyState';
import type { CourseId, Note } from '../types';

export interface NotePanelProps {
  targetType: 'lesson' | 'exercise';
  targetId: string;
  courseId: CourseId;
  chapterId: string;
  targetTitle: string;
}

export function NotePanel({ targetType, targetId, courseId, chapterId, targetTitle }: NotePanelProps) {
  const state = useStudyState();
  const existing = getNoteFor(targetType, targetId);
  const [open, setOpen] = useState(Boolean(existing?.content));
  const [text, setText] = useState(existing?.content ?? '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const n = Object.values(state.notes).find((x) => x.targetType === targetType && x.targetId === targetId);
    setText(n?.content ?? '');
    if (n?.content) setOpen(true);
  }, [targetId, targetType, state.notes]);

  const relatedNotes = Object.values(state.notes).filter(
    (n) => n.courseId === courseId && n.chapterId === chapterId && n.targetId !== targetId,
  );

  const save = () => {
    if (!text.trim()) {
      if (existing) deleteNote(existing.id);
      setSaved(false);
      return;
    }
    upsertNote({ targetType, targetId, courseId, chapterId, targetTitle, content: text.trim() });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="note-panel">
      <div className="note-head" onClick={() => setOpen((v) => !v)}>
        <span style={{ fontSize: 15 }}>📝</span>
        <span className="note-title">我的笔记</span>
        {existing?.content && <span className="note-count">（已有内容）</span>}
        {relatedNotes.length > 0 && <span className="note-count">· 本章其它笔记 {relatedNotes.length} 条</span>}
        <div className="spacer" />
        <span className="muted">{open ? '收起 ▾' : '展开 ▸'}</span>
      </div>

      {open && (
        <div className="note-body">
          <textarea
            className="note-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="记下你的理解、疑问或总结…例如：这个方法和另一种写法的区别是什么？什么时候该用哪个？"
          />
          <div className="note-actions">
            <button className="btn btn-primary btn-sm" onClick={save}>
              💾 保存笔记
            </button>
            {existing && (
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => {
                  deleteNote(existing.id);
                  setText('');
                }}
              >
                删除
              </button>
            )}
            {saved && <span className="note-saved">✓ 已保存</span>}
            <div className="spacer" />
            {existing && (
              <span className="muted">更新于 {new Date(existing.updatedAt).toLocaleString('zh-CN')}</span>
            )}
          </div>

          {relatedNotes.length > 0 && (
            <>
              <div className="out-value-label" style={{ marginTop: 14 }}>
                本章其它笔记
              </div>
              <div className="note-list">
                {relatedNotes.slice(0, 6).map((n) => (
                  <div key={n.id} className="note-item">
                    <div className="note-item-meta">
                      <b>{n.targetTitle}</b>
                      <span>{new Date(n.updatedAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <div className="note-item-text">{n.content}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** 全站笔记列表页 */
export function NotesList({ notes }: { notes: Note[] }) {
  if (!notes.length) return <div className="loading-block">还没有笔记。学习时在知识点下方展开「我的笔记」即可记录。</div>;
  return (
    <div className="note-list">
      {notes.map((n) => (
        <div key={n.id} className="note-item">
          <div className="note-item-meta">
            <Link to={n.targetType === 'lesson' ? `/course/${n.courseId}/chapter/${n.chapterId}` : `/practice/${n.courseId}/${n.chapterId}`}>
              {n.courseId} / {n.chapterId}
            </Link>
            <b>{n.targetTitle}</b>
            <span>{new Date(n.updatedAt).toLocaleString('zh-CN')}</span>
          </div>
          <div className="note-item-text">{n.content}</div>
        </div>
      ))}
    </div>
  );
}
