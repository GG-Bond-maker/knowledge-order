/**
 * Python 运行时状态指示器：点击可预加载。
 */

import { useEffect, useState } from 'react';
import { onPyodideStage, preloadPython } from '../engine/pyodideRunner';
import './PyodideStatus.css';

export function PyodideStatus() {
  const [stage, setStage] = useState('未加载');
  const [loading, setLoading] = useState(false);

  useEffect(() => onPyodideStage(setStage), []);

  const ready = stage === '就绪';
  const failed = stage === '加载失败';

  const onClick = async () => {
    if (loading || ready) return;
    setLoading(true);
    try {
      await preloadPython();
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`py-status ${ready ? 'ok' : failed ? 'fail' : loading ? 'loading' : ''}`}
      onClick={onClick}
      title={ready ? 'Python 运行时就绪（numpy / pandas 可用）' : '点击预加载 Python 运行时'}
      type="button"
    >
      <span className="dot" />
      {ready ? 'Python 已就绪' : failed ? '加载失败，点击重试' : loading ? '加载 Python…' : '预加载 Python'}
    </button>
  );
}
