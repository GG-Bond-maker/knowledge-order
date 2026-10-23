/**
 * 课程内容深度审计：扫描 content-data/courses/*.json，
 * 按知识点评估篇幅、教学模块完整性、公式/代码/图示/来源/练习覆盖，
 * 输出 qa/depth-audit-report.md 供升级排期使用。
 *
 * 用法：node scripts/depth-audit.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const COURSE_DIR = path.join(ROOT, 'content-data', 'courses');
const OUT = path.join(ROOT, 'qa', 'depth-audit-report.md');

/** 教学模块关键词（匹配 ## 标题或加粗短语） */
const MODULES = [
  ['goal', '学习目标', /学习目标|学完之后|你将能够|本节目标/],
  ['prereq', '前置知识', /前置知识|预备知识|先修|前置要求|需要先掌握/],
  ['why', '问题背景', /问题背景|为什么.{0,6}(重要|需要|学)|背景与动机|动机/],
  ['intuition', '直觉理解', /直觉|直观理解|类比|打个比方|形象/],
  ['concept', '核心概念', /核心概念|定义|什么是|概念/],
  ['principle', '原理详解', /原理|机制|工作方式|逐步.{0,4}(解释|拆解)|详解/],
  ['derivation', '数学推导', /推导|证明|一步步.{0,4}算|手算|逐步计算/],
  ['case', '完整案例', /案例|示例|例题|实例|实战案例/],
  ['code', '代码实践', /代码|实现|编程|Python|程序/],
  ['diagram', '图示', /<Diagram|<TensorFlow|<Heatmap|<Slider|图示|示意图|图解/],
  ['misconception', '常见误区', /误区|易错|常见错误|混淆|陷阱|注意.{0,4}区别|小心/],
  ['connection', '知识关联', /知识关联|与.{0,12}(关系|联系|区别|对比)|前一章|后一节|承上启下/],
  ['summary', '本节总结', /总结|要点回顾|核心结论|关键结论|记住/],
  ['reference', '参考资料', /参考|来源|文献|出处|延伸阅读|Reference/],
];

const files = fs.readdirSync(COURSE_DIR).filter((f) => f.endsWith('.json'));
const courses = files
  .map((f) => JSON.parse(fs.readFileSync(path.join(COURSE_DIR, f), 'utf8')))
  .sort((a, b) => (a.domainId || '').localeCompare(b.domainId || '') || a.id.localeCompare(b.id));

/** 单个知识点评估 */
function gradeLesson(lesson, chapter, course) {
  const c = lesson.content || '';
  const len = c.length;
  const sections = (c.match(/^##+ /gm) || []).length;
  const mathBlocks = (c.match(/\$\$/g) || []).length / 2;
  const inlineMath = (c.match(/(?<!\$)\$(?!\$)[^$\n]+(?<!\$)\$(?!\$)/g) || []).length;
  const codeBlocks = (c.match(/```/g) || []).length / 2;
  const diagrams = (c.match(/<(Diagram|TensorFlow|Heatmap|Slider)\b/g) || []).length;
  const hasDemo = (lesson.demos || []).length > 0;
  const hasTips = (lesson.tips || []).length > 0;

  const mods = {};
  for (const [key, , re] of MODULES) mods[key] = re.test(c);
  const modCount = Object.values(mods).filter(Boolean).length;

  // 与本知识点同章节习题（近似：章内题均分到知识点）
  const exCount = chapter.exercises.length;
  const lessonCount = chapter.lessons.length || 1;
  const exPer = exCount / lessonCount;
  const diffs = new Set(chapter.exercises.map((e) => e.difficulty));

  // 严重问题列表
  const issues = [];
  if (len < 400) issues.push('内容极短(<400字)');
  else if (len < 900) issues.push('内容偏短(<900字)');
  if (sections < 2 && len < 2000) issues.push('缺乏分节结构');
  if (!mods.principle && !mods.concept) issues.push('无核心概念/原理讲解');
  if (!mods.case) issues.push('缺少案例');
  if (!mods.misconception) issues.push('缺少常见误区');
  if (!mods.summary) issues.push('缺少总结');
  if (!mods.reference) issues.push('缺少参考资料来源');
  if (mathBlocks === 0 && inlineMath < 3 && /(推导|公式|数学|概率|统计|定价|风险|梯度|分布|期望)/.test(c + lesson.title))
    issues.push('数学型知识点缺公式');
  if (codeBlocks === 0 && !hasDemo && /(代码|编程|实现|Python|算法|函数|回测)/.test(lesson.title))
    issues.push('代码型知识点缺代码');
  if (diagrams === 0 && !hasDemo && /(结构|架构|流程|变换|图|注意力|网络)/.test(lesson.title))
    issues.push('可视化机会未利用');
  if (exPer < 3) issues.push('练习偏少');

  // 评级：按模块数、篇幅、问题数综合
  let score = 0;
  score += Math.min(30, (len / 3000) * 30); // 篇幅 30 分（3000 字满分）
  score += (modCount / MODULES.length) * 40; // 模块 40 分
  score += Math.min(15, (mathBlocks + codeBlocks) * 3); // 公式/代码 15 分
  score += Math.min(8, exPer * 2); // 练习 8 分
  score += (hasDemo ? 3 : 0) + (hasTips ? 2 : 0) + (diagrams > 0 ? 2 : 0); // 交互 7 分
  score = Math.round(score);

  const grade = score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'D';

  return {
    courseId: course.id,
    courseTitle: course.title,
    domainId: course.domainId || 'other',
    chapterId: chapter.id,
    chapterTitle: chapter.title,
    lessonId: lesson.id,
    title: lesson.title,
    len,
    sections,
    mathBlocks,
    inlineMath,
    codeBlocks,
    diagrams,
    hasDemo,
    hasTips,
    mods,
    modCount,
    exPer: Math.round(exPer * 10) / 10,
    diffCoverage: diffs.size,
    issues,
    score,
    grade,
  };
}

const rows = [];
for (const course of courses) {
  for (const ch of course.chapters || []) {
    for (const l of ch.lessons || []) rows.push(gradeLesson(l, ch, course));
  }
}

// 汇总
const byCourse = new Map();
for (const r of rows) {
  if (!byCourse.has(r.courseId)) byCourse.set(r.courseId, { title: r.courseTitle, domain: r.domainId, lessons: [] });
  byCourse.get(r.courseId).lessons.push(r);
}

const courseStats = [...byCourse.entries()]
  .map(([id, v]) => {
    const ls = v.lessons;
    const avg = Math.round(ls.reduce((s, l) => s + l.score, 0) / ls.length);
    return {
      id,
      title: v.title,
      domain: v.domain,
      count: ls.length,
      avg,
      dCount: ls.filter((l) => l.grade === 'D').length,
      cCount: ls.filter((l) => l.grade === 'C').length,
      avgLen: Math.round(ls.reduce((s, l) => s + l.len, 0) / ls.length),
      worst: ls.slice().sort((a, b) => a.score - b.score)[0],
    };
  })
  .sort((a, b) => a.avg - b.avg);

const DOMAIN_NAMES = {
  data: '数据分析',
  python: 'Python',
  'python-track': 'Python 体系',
  coding: '编程开发',
  ai: '人工智能·大模型',
  paper: 'AI 论文导读',
  mining: '数据挖掘',
  'ai-auto': 'AI 自动化',
  quant: '量化交易',
  'data-engineering': '数据工程',
  other: '其他',
};

let md = `# 课程内容深度审计报告

> 生成时间：${new Date().toISOString().slice(0, 19).replace('T', ' ')}
> 审计范围：content-data/courses/ 共 ${courses.length} 门课程、${rows.length} 个知识点
>
> 评级标准（满分 100）：篇幅 30 分 + 教学模块完整性 40 分（14 个模块）+ 公式/代码 15 分 + 练习覆盖 8 分 + 交互组件 7 分。
> A ≥70（达标）· B 55–69（基本可用，可局部增强）· C 40–54（明显不足，需扩写）· D <40（严重不足，优先重写）。

## 一、总览

| 指标 | 数值 |
| --- | --- |
| 知识点总数 | ${rows.length} |
| 平均篇幅 | ${Math.round(rows.reduce((s, r) => s + r.len, 0) / rows.length)} 字 |
| A 级 | ${rows.filter((r) => r.grade === 'A').length}（${Math.round((rows.filter((r) => r.grade === 'A').length / rows.length) * 100)}%） |
| B 级 | ${rows.filter((r) => r.grade === 'B').length}（${Math.round((rows.filter((r) => r.grade === 'B').length / rows.length) * 100)}%） |
| C 级 | ${rows.filter((r) => r.grade === 'C').length}（${Math.round((rows.filter((r) => r.grade === 'C').length / rows.length) * 100)}%） |
| D 级 | ${rows.filter((r) => r.grade === 'D').length}（${Math.round((rows.filter((r) => r.grade === 'D').length / rows.length) * 100)}%） |

## 二、课程级评分（由低到高，前 30 名为优先处理对象）

| 课程 | 学科 | 知识点 | 平均分 | 均篇幅 | C/D 数 | 最弱知识点 |
| --- | --- | --- | --- | --- | --- | --- |
`;

for (const s of courseStats.slice(0, 30)) {
  md += `| ${s.title} | ${DOMAIN_NAMES[s.domain] || s.domain} | ${s.count} | ${s.avg} | ${s.avgLen} | ${s.cCount + s.dCount} | ${s.worst.title}（${s.worst.score} 分） |\n`;
}

md += `\n## 三、共性问题（按出现频次）\n\n| 问题 | 知识点数 | 占比 |\n| --- | --- | --- |\n`;
const issueCount = new Map();
for (const r of rows) for (const i of r.issues) issueCount.set(i, (issueCount.get(i) || 0) + 1);
for (const [issue, n] of [...issueCount.entries()].sort((a, b) => b[1] - a[1])) {
  md += `| ${issue} | ${n} | ${Math.round((n / rows.length) * 100)}% |\n`;
}

md += `\n## 四、D 级知识点全清单（优先重写）\n\n| 学科 | 课程 | 章节 | 知识点 | 分数 | 主要问题 |\n| --- | --- | --- | --- | --- | --- |\n`;
const dRows = rows.filter((r) => r.grade === 'D').sort((a, b) => a.score - b.score);
for (const r of dRows.slice(0, 120)) {
  md += `| ${DOMAIN_NAMES[r.domainId] || r.domainId} | ${r.courseTitle} | ${r.chapterTitle} | ${r.title} | ${r.score} | ${(r.issues.slice(0, 3).join('；')) || '-'} |\n`;
}
if (dRows.length > 120) md += `| … | 共 ${dRows.length - 120} 个 D 级知识点未列出 | | | | |\n`;

md += `\n## 五、C 级知识点清单（第二批扩写）\n\n| 学科 | 课程 | 章节 | 知识点 | 分数 | 篇幅 |\n| --- | --- | --- | --- | --- | --- |\n`;
const cRows = rows.filter((r) => r.grade === 'C').sort((a, b) => a.score - b.score);
for (const r of cRows.slice(0, 100)) {
  md += `| ${DOMAIN_NAMES[r.domainId] || r.domainId} | ${r.courseTitle} | ${r.chapterTitle} | ${r.title} | ${r.score} | ${r.len} |\n`;
}
if (cRows.length > 100) md += `| … | 共 ${cRows.length - 100} 个 C 级知识点未列出 | | | | |\n`;

// 模块覆盖统计
md += `\n## 六、教学模块覆盖统计\n\n| 模块 | 覆盖数 | 覆盖率 |\n| --- | --- | --- |\n`;
for (const [key, name] of MODULES) {
  const n = rows.filter((r) => r.mods[key]).length;
  md += `| ${name} | ${n} | ${Math.round((n / rows.length) * 100)}% |\n`;
}

fs.writeFileSync(OUT, md, 'utf8');

// 控制台摘要
console.log(`审计完成：${rows.length} 个知识点`);
console.log(`评级分布：A ${rows.filter((r) => r.grade === 'A').length} · B ${rows.filter((r) => r.grade === 'B').length} · C ${rows.filter((r) => r.grade === 'C').length} · D ${rows.filter((r) => r.grade === 'D').length}`);
console.log(`报告已写入 ${path.relative(ROOT, OUT)}`);
console.log('\n平均分最低的 15 门课程：');
for (const s of courseStats.slice(0, 15)) {
  console.log(`  ${s.avg}\t${s.title}（${s.count} 知识点，均 ${s.avgLen} 字，C/D ${s.cCount + s.dCount}）`);
}
