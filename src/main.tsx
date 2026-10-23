import { StrictMode, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { loadContent } from './store/contentStore';
import 'antd/dist/reset.css';
import 'katex/dist/katex.min.css';
import './styles/global.css';
import './styles/pages.css';
import './styles/dashboard.css';
import './styles/difficulty.css';
import './styles/study.css';

function Bootstrap() {
  useEffect(() => {
    // 应用启动时从后端加载内容（失败会自动回退内置内容）
    void loadContent();
  }, []);

  return (
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Bootstrap />
  </StrictMode>,
);
