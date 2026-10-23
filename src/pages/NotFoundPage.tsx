import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <div className="panel panel-pad" style={{ textAlign: 'center', padding: 60 }}>
      <div style={{ fontSize: 42 }}>🧭</div>
      <h2 style={{ margin: '12px 0 6px' }}>页面不存在</h2>
      <p className="muted">你访问的课程或章节可能尚未编写完成。</p>
      <Link to="/" className="btn btn-primary" style={{ marginTop: 12 }}>
        返回首页
      </Link>
    </div>
  );
}
