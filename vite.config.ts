import { defineConfig, type Connect } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const srcDir = fileURLToPath(new URL('./src', import.meta.url));
const publicDir = fileURLToPath(new URL('./public', import.meta.url));

const MIME: Record<string, string> = {
  '.whl': 'application/zip',
  '.zip': 'application/zip',
  '.wasm': 'application/wasm',
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
};

/**
 * 自定义静态中间件：优先返回 public/pyodide 与 public/sqljs 下的真实文件。
 * 原因：Vite 对未知扩展名（如 .whl）会走 SPA 回退返回 index.html，
 * 导致 Pyodide 的 sha256 完整性校验失败、加载包时报 "No module named"。
 */
function runtimeStaticPlugin() {
  return {
    name: 'knowledge-order:runtime-static',
    configureServer(server: { middlewares: Connect.Server }) {
      server.middlewares.use((req: Connect.IncomingMessage, res: import('node:http').ServerResponse, next: Connect.NextFunction) => {
        const url = (req.url ?? '').split('?')[0];
        if (!url.startsWith('/pyodide/') && !url.startsWith('/sqljs/')) return next();
        const filePath = join(publicDir, decodeURIComponent(url));
        if (!filePath.startsWith(publicDir) || !existsSync(filePath) || !statSync(filePath).isFile()) return next();
        const ext = extname(filePath).toLowerCase();
        res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.end(readFileSync(filePath));
        return undefined;
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), runtimeStaticPlugin()],
  resolve: {
    alias: {
      '@': srcDir,
    },
  },
  server: {
    port: 5173,
    host: '127.0.0.1',
    open: false,
    // 开发模式：把 /api 请求代理到本地内容服务（node server/index.mjs）
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 4000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('echarts')) return 'vendor-echarts';
            if (id.includes('codemirror') || id.includes('@lezer')) return 'vendor-codemirror';
            if (id.includes('sql.js')) return 'vendor-sqljs';
            if (id.includes('antd') || id.includes('@ant-design') || id.includes('rc-')) return 'vendor-antd';
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
