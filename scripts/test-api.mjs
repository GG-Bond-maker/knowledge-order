/**
 * 后端 API 端到端测试：创建课程 → 读取 → 更新 → 导出 → 删除 → 验证备份。
 */
const BASE = 'http://127.0.0.1:3001/api';

async function j(url, init) {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

let pass = 0;
let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) {
    pass += 1;
    console.log(`✓ ${name}${detail ? ' — ' + detail : ''}`);
  } else {
    fail += 1;
    console.log(`✗ ${name}${detail ? ' — ' + detail : ''}`);
  }
};

const testId = `test_course_${Date.now()}`;

const course = {
  id: testId,
  title: '测试课程',
  subtitle: '自动化测试用',
  description: '这是 E2E 测试创建的临时课程',
  icon: '🧪',
  color: '#ff0000',
  domainId: 'coding',
  prerequisites: [],
  targetAudience: '测试',
  estimatedHours: 1,
  chapters: [
    {
      id: 'tch1',
      order: 1,
      title: '测试章节',
      goal: '验证',
      lessons: [{ id: 'tles1', title: '知识点', content: '## 内容\n\n正文' }],
      exercises: [
        {
          id: 'tex1',
          type: 'single',
          difficulty: 1,
          question: '1+1=?',
          options: [
            { value: 'A', text: '2' },
            { value: 'B', text: '3' },
          ],
          answer: 'A',
          explanation: '基础算术',
        },
        {
          id: 'tex2',
          type: 'code',
          difficulty: 2,
          question: '返回 42',
          starterCode: 'x = ___',
          setupCode: '',
          expectedOutput: '42',
          tests: 'assert out == 42',
          answer: 'x = 42',
          explanation: '赋值即可',
        },
      ],
    },
  ],
};

// 1. 创建
let r = await j(`${BASE}/courses`, { method: 'POST', body: JSON.stringify(course) });
check('创建课程', r.status === 201, `HTTP ${r.status}`);

// 2. 列表中可见
r = await j(`${BASE}/courses`);
const found = r.data.find((c) => c.id === testId);
check('课程出现在列表', Boolean(found), found ? `${found.chapterCount} 章 / ${found.exerciseCount} 题` : '未找到');

// 3. 读取完整内容
r = await j(`${BASE}/courses/${testId}`);
check('读取课程完整内容', r.status === 200 && r.data.chapters.length === 1, `HTTP ${r.status}`);

// 4. 更新
course.title = '测试课程（已更新）';
r = await j(`${BASE}/courses/${testId}`, { method: 'PUT', body: JSON.stringify(course) });
check('更新课程', r.status === 200 && r.data.course.title.includes('已更新'));

// 5. 校验：非法数据被拒绝
const bad = { ...course, chapters: [{ id: 'bad', lessons: [], exercises: [{ id: 'x', type: 'single' }] }] };
r = await j(`${BASE}/courses/${testId}`, { method: 'PUT', body: JSON.stringify(bad) });
check('非法数据被拒绝', r.status === 400, JSON.stringify(r.data.details ?? r.data).slice(0, 100));

// 6. 重复 id 被拒绝
r = await j(`${BASE}/courses`, { method: 'POST', body: JSON.stringify(course) });
check('重复课程 id 被拒绝', r.status === 409);

// 7. 导出包含该课程
r = await j(`${BASE}/export`);
check('导出包含测试课程', r.data.courses.some((c) => c.id === testId), `共 ${r.data.courses.length} 门`);

// 8. 删除
r = await j(`${BASE}/courses/${testId}`, { method: 'DELETE' });
check('删除课程', r.status === 200);

// 9. 删除后不可见
r = await j(`${BASE}/courses/${testId}`);
check('删除后返回 404', r.status === 404);

// 10. 备份已生成
r = await j(`${BASE}/backups`);
check('删除前已自动备份', r.data.some((b) => b.name.includes(testId)), `${r.data.length} 个备份文件`);

// 11. 导入功能
r = await j(`${BASE}/import`, { method: 'POST', body: JSON.stringify({ courses: [course] }) });
check('导入课程', r.status === 200 && r.data.imported === 1, `imported=${r.data.imported}`);

// 清理
await j(`${BASE}/courses/${testId}`, { method: 'DELETE' });

console.log(`\n结果：${pass}/${pass + fail} 通过`);
process.exitCode = fail === 0 ? 0 : 1;
