/**
 * 知序学院 · 本地内容服务
 *
 * 职责：
 *  1. 提供课程内容的读写 API（后台录入用），数据以 JSON 文件持久化到 content-data/ 目录；
 *  2. 提供静态前端产物（生产模式下 dist/）；
 *  3. 开发模式下与 Vite 并存，由 Vite 代理 /api 请求到本服务。
 *
 * 为什么用文件而不是数据库：
 *  - 零依赖、可直接用 Git 管理内容版本；
 *  - 用户可手动编辑 JSON、批量导入导出；
 *  - 个人学习站规模（几百~几千题）文件完全够用。
 *
 * 启动：node server/index.mjs [--port 3001]
 */

import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  renameSync,
  copyFileSync,
} from 'node:fs';
import { resolveInterpreter, probeInterpreter, runPython, getRunnerStatus } from './pythonRunner.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DATA_DIR = join(ROOT, 'content-data');
const COURSES_DIR = join(DATA_DIR, 'courses');
const BACKUP_DIR = join(DATA_DIR, 'backups');
const DIST_DIR = join(ROOT, 'dist');

const PORT = Number(process.env.PORT || process.argv.find((a) => a.startsWith('--port='))?.split('=')[1] || 3001);

/* ─────────────────── 存储工具 ─────────────────── */

function ensureDirs() {
  for (const d of [DATA_DIR, COURSES_DIR, BACKUP_DIR]) {
    if (!existsSync(d)) mkdirSync(d, { recursive: true });
  }
  const indexPath = join(DATA_DIR, 'domains.json');
  if (!existsSync(indexPath)) {
    writeFileSync(
      indexPath,
      JSON.stringify(
        [
          { id: 'data', title: '数据分析', description: 'Python、Pandas、SQL、Excel、可视化与方法论', icon: '📊', color: '#2f6bff', order: 1 },
          { id: 'coding', title: '编程开发', description: '算法与数据结构、工程实践', icon: '💻', color: '#7c5cff', order: 2 },
          { id: 'ai', title: '人工智能', description: 'LLM、Transformer 与 AI Agent', icon: '🤖', color: '#0891b2', order: 3 },
        ],
        null,
        2,
      ),
      'utf8',
    );
  }
}

/** 原子写：先写临时文件再改名，避免写入中断导致文件损坏 */
function atomicWrite(filePath, content) {
  const tmp = `${filePath}.tmp`;
  writeFileSync(tmp, content, 'utf8');
  renameSync(tmp, filePath);
}

function listCourseFiles() {
  if (!existsSync(COURSES_DIR)) return [];
  return readdirSync(COURSES_DIR).filter((f) => f.endsWith('.json'));
}

function readCourse(id) {
  const file = join(COURSES_DIR, `${id}.json`);
  if (!existsSync(file)) return null;
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeCourse(course) {
  if (!course?.id) throw new Error('课程缺少 id');
  if (!/^[a-z0-9][a-z0-9_-]*$/i.test(course.id)) throw new Error('课程 id 只能包含字母、数字、下划线和连字符');
  course.updatedAt = Date.now();
  if (!course.createdAt) course.createdAt = course.updatedAt;
  atomicWrite(join(COURSES_DIR, `${course.id}.json`), JSON.stringify(course, null, 2));
  return course;
}

function deleteCourse(id) {
  const file = join(COURSES_DIR, `${id}.json`);
  if (!existsSync(file)) return false;
  // 删除前先备份到 backups/
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  copyFileSync(file, join(BACKUP_DIR, `${id}-${stamp}.json`));
  renameSync(file, join(BACKUP_DIR, `${id}-deleted-${stamp}.json`));
  return true;
}

/* ─────────────────── 内容校验 ─────────────────── */

const EXERCISE_TYPES = ['single', 'multiple', 'judge', 'fill', 'code', 'sql', 'open'];

function validateCourse(course) {
  const errors = [];
  if (!course || typeof course !== 'object') return ['课程数据格式不正确'];
  if (!course.id) errors.push('缺少 id');
  if (!course.title) errors.push('缺少 title');
  if (!course.icon) errors.push('缺少 icon');
  if (!course.color) errors.push('缺少 color');
  if (!Array.isArray(course.chapters)) {
    errors.push('chapters 必须是数组');
    return errors;
  }
  const seen = new Set();
  course.chapters.forEach((ch, ci) => {
    if (!ch.id) errors.push(`第 ${ci + 1} 章缺少 id`);
    if (seen.has(ch.id)) errors.push(`章节 id 重复：${ch.id}`);
    seen.add(ch.id);
    if (!Array.isArray(ch.lessons) || !ch.lessons.length) errors.push(`章节 ${ch.id} 缺少知识点`);
    if (!Array.isArray(ch.exercises)) errors.push(`章节 ${ch.id} 的 exercises 必须是数组`);
    (ch.exercises ?? []).forEach((ex) => {
      if (!ex.id) errors.push(`章节 ${ch.id} 中有习题缺少 id`);
      if (seen.has(ex.id)) errors.push(`id 重复：${ex.id}`);
      seen.add(ex.id);
      if (!EXERCISE_TYPES.includes(ex.type)) errors.push(`习题 ${ex.id} 的类型无效：${ex.type}`);
      if ((ex.type === 'single' || ex.type === 'multiple') && !(ex.options?.length >= 2)) {
        errors.push(`习题 ${ex.id} 至少需要 2 个选项`);
      }
      if (ex.type === 'fill' && !(ex.blanks?.length >= 1)) errors.push(`习题 ${ex.id} 缺少填空答案`);
      if (ex.type === 'code' && !ex.tests) errors.push(`习题 ${ex.id} 缺少测试用例`);
      if (ex.type === 'sql' && !ex.referenceSql) errors.push(`习题 ${ex.id} 缺少参考 SQL`);
    });
  });
  return errors;
}

/* ─────────────────── 应用 ─────────────────── */

ensureDirs();
const app = express();
app.use(cors());
app.use(express.json({ limit: '20mb' }));

/** 健康检查 */
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString(), dataDir: DATA_DIR });
});

/* ── Python 执行（本地重型依赖：torch / gym / scipy 等） ── */

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** 执行环境状态（含解释器与已安装包） */
app.get('/api/python/status', async (_req, res) => {
  const interpreter = resolveInterpreter(PROJECT_ROOT);
  if (!interpreter) {
    return res.json({
      ok: false,
      interpreter: null,
      error: '未找到 Python 解释器。请创建 .venv-pytorch 并安装 requirements-pytorch.txt',
      runner: getRunnerStatus(),
    });
  }
  const info = await probeInterpreter(interpreter);
  return res.json({ ...info, interpreter, runner: getRunnerStatus() });
});

/** 执行 Python 代码 */
app.post('/api/python/run', async (req, res) => {
  const { code, setupCode, timeoutMs } = req.body ?? {};
  if (typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ ok: false, error: '缺少 code 字段' });
  }
  if (code.length > 200_000) {
    return res.status(413).json({ ok: false, error: '代码过长（上限 200KB）' });
  }
  const interpreter = resolveInterpreter(PROJECT_ROOT);
  const result = await runPython(interpreter, code, {
    setupCode: typeof setupCode === 'string' ? setupCode : undefined,
    timeoutMs: Number.isFinite(timeoutMs) ? timeoutMs : undefined,
  });
  return res.json(result);
});

/* ── 学科 ── */
app.get('/api/domains', (_req, res) => {
  const file = join(DATA_DIR, 'domains.json');
  res.json(existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : []);
});

app.put('/api/domains', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: '需要数组' });
  atomicWrite(join(DATA_DIR, 'domains.json'), JSON.stringify(req.body, null, 2));
  return res.json({ ok: true });
});

/* ── 课程列表（轻量：不含章节明细） ── */
app.get('/api/courses', (_req, res) => {
  const list = listCourseFiles().map((f) => {
    try {
      const c = JSON.parse(readFileSync(join(COURSES_DIR, f), 'utf8'));
      return {
        id: c.id,
        title: c.title,
        subtitle: c.subtitle,
        description: c.description,
        icon: c.icon,
        color: c.color,
        domainId: c.domainId,
        seriesId: c.seriesId,
        prerequisites: c.prerequisites ?? [],
        targetAudience: c.targetAudience,
        estimatedHours: c.estimatedHours,
        chapterCount: c.chapters?.length ?? 0,
        lessonCount: (c.chapters ?? []).reduce((s, ch) => s + (ch.lessons?.length ?? 0), 0),
        exerciseCount: (c.chapters ?? []).reduce((s, ch) => s + (ch.exercises?.length ?? 0), 0),
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    } catch (e) {
      console.error(`课程文件解析失败：${f}`, e.message);
      return { id: f.replace('.json', ''), title: `（损坏：${f}）`, broken: true };
    }
  });
  return res.json(list);
});

/* ── 单个课程 ── */
app.get('/api/courses/:id', (req, res) => {
  const course = readCourse(req.params.id);
  if (!course) return res.status(404).json({ error: '课程不存在' });
  return res.json(course);
});

app.put('/api/courses/:id', (req, res) => {
  const course = { ...req.body, id: req.params.id };
  const errors = validateCourse(course);
  if (errors.length) return res.status(400).json({ error: '校验失败', details: errors });
  try {
    writeCourse(course);
    return res.json({ ok: true, course });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

app.post('/api/courses', (req, res) => {
  const course = req.body;
  const errors = validateCourse(course);
  if (errors.length) return res.status(400).json({ error: '校验失败', details: errors });
  if (readCourse(course.id)) return res.status(409).json({ error: `课程 id 已存在：${course.id}` });
  try {
    writeCourse(course);
    return res.status(201).json({ ok: true, course });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

app.delete('/api/courses/:id', (req, res) => {
  const ok = deleteCourse(req.params.id);
  if (!ok) return res.status(404).json({ error: '课程不存在' });
  return res.json({ ok: true });
});

/* ── 只更新某一章（避免覆盖整门课程，减少并发冲突） ── */
app.put('/api/courses/:id/chapters/:chapterId', (req, res) => {
  const course = readCourse(req.params.id);
  if (!course) return res.status(404).json({ error: '课程不存在' });
  const idx = (course.chapters ?? []).findIndex((c) => c.id === req.params.chapterId);
  if (idx < 0) return res.status(404).json({ error: '章节不存在' });
  course.chapters[idx] = { ...req.body, id: req.params.chapterId };
  const errors = validateCourse(course);
  if (errors.length) return res.status(400).json({ error: '校验失败', details: errors });
  writeCourse(course);
  return res.json({ ok: true, chapter: course.chapters[idx] });
});

/* ── 导入 / 导出 ── */
app.get('/api/export', (_req, res) => {
  const domains = JSON.parse(readFileSync(join(DATA_DIR, 'domains.json'), 'utf8'));
  const courses = listCourseFiles().map((f) => JSON.parse(readFileSync(join(COURSES_DIR, f), 'utf8')));
  res.setHeader('Content-Disposition', `attachment; filename="content-backup-${Date.now()}.json"`);
  res.json({ version: 1, exportedAt: new Date().toISOString(), domains, courses });
});

app.post('/api/import', (req, res) => {
  const { domains, courses } = req.body ?? {};
  if (!Array.isArray(courses)) return res.status(400).json({ error: 'courses 必须是数组' });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  // 先整体备份
  mkdirSync(BACKUP_DIR, { recursive: true });
  for (const f of listCourseFiles()) {
    copyFileSync(join(COURSES_DIR, f), join(BACKUP_DIR, `pre-import-${stamp}-${f}`));
  }
  if (Array.isArray(domains)) {
    atomicWrite(join(DATA_DIR, 'domains.json'), JSON.stringify(domains, null, 2));
  }
  const failed = [];
  for (const c of courses) {
    const errors = validateCourse(c);
    if (errors.length) {
      failed.push({ id: c.id, errors });
      continue;
    }
    writeCourse(c);
  }
  return res.json({ ok: true, imported: courses.length - failed.length, failed });
});

/* ── 备份列表 ── */
app.get('/api/backups', (_req, res) => {
  if (!existsSync(BACKUP_DIR)) return res.json([]);
  const files = readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ name: f, size: readFileSync(join(BACKUP_DIR, f)).length }))
    .sort((a, b) => b.name.localeCompare(a.name));
  return res.json(files);
});

/* ── 生产模式：托管前端静态文件 ── */
if (existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR));
  app.get(/^(?!\/api).*/, (_req, res) => {
    res.sendFile(join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, '127.0.0.1', () => {
  console.log(`[server] 内容服务已启动: http://127.0.0.1:${PORT}`);
  console.log(`[server] 数据目录: ${DATA_DIR}`);
  if (existsSync(DIST_DIR)) console.log('[server] 已托管前端产物 dist/');
});
