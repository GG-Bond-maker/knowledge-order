// 全部课程的剩余(C+D)统计——与 scripts/depth-audit.mjs 完全同口径
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const COURSE_DIR = path.join(ROOT, 'content-data', 'courses');

const MODULES = [
  ['goal', /学习目标|学完之后|学完本节|你将能够|本节目标/],
  ['prereq', /前置知识|预备知识|先修|前置要求|需要先掌握/],
  ['why', /问题背景|为什么.{0,6}(重要|需要|学)|背景与动机|动机/],
  ['intuition', /直觉|直观理解|类比|打个比方|形象/],
  ['concept', /核心概念|定义|什么是|概念/],
  ['principle', /原理|机制|工作方式|逐步.{0,4}(解释|拆解)|详解/],
  ['derivation', /推导|证明|一步步.{0,4}算|手算|逐步计算/],
  ['case', /案例|示例|实例|算例/],
  ['code', /```|代码|实现|编程|程序/],
  ['diagram', /<Diagram|<TensorFlow|<Heatmap|<Slider|图示|示意图|图解/],
  ['misconception', /误区|易错|常见错误|混淆|陷阱|注意.{0,4}区别|小心/],
  ['connection', /知识关联|与.{0,12}(关系|联系|区别|对比)|前一章|后一节|承上启下/],
  ['summary', /总结|要点回顾|核心结论|关键结论|记住/],
  ['reference', /参考|来源|文献|出处|延伸阅读/],
];

const files = fs.readdirSync(COURSE_DIR).filter((f) => f.endsWith('.json'));
const rows = [];
for (const f of files) {
  const c = JSON.parse(fs.readFileSync(path.join(COURSE_DIR, f), 'utf8'));
  const ls = [];
  for (const ch of c.chapters || []) for (const l of ch.lessons || []) {
    const t = l.content || '';
    const len = t.length;
    const sections = (t.match(/^##+ /gm) || []).length;
    const mathBlocks = (t.match(/\$\$/g) || []).length / 2;
    const codeBlocks = (t.match(/```/g) || []).length / 2;
    const diagrams = (t.match(/<(Diagram|TensorFlow|Heatmap|Slider)\b/g) || []).length;
    const hasDemo = (l.demos || []).length > 0;
    const hasTips = (l.tips || []).length > 0;
    const mods = {};
    for (const m of MODULES) mods[m[0]] = m[1].test(t);
    const modCount = Object.values(mods).filter(Boolean).length;
    let score = 0;
    score += Math.min(30, (len / 3000) * 30);
    score += (modCount / 14) * 40;
    score += Math.min(15, (mathBlocks + codeBlocks) * 3);
    score += Math.min(8, (ch.exercises.length / Math.max(1, ch.lessons.length)) * 2);
    score += (hasDemo ? 3 : 0) + (hasTips ? 2 : 0) + (diagrams > 0 ? 2 : 0);
    ls.push(Math.round(score));
  }
  if (!ls.length) continue;
  const avg = Math.round(ls.reduce((s, x) => s + x, 0) / ls.length);
  rows.push({
    title: c.title, domain: c.domainId || 'other', n: ls.length, avg,
    D: ls.filter((x) => x < 40).length,
    C: ls.filter((x) => x >= 40 && x < 55).length,
    B: ls.filter((x) => x >= 55 && x < 70).length,
    A: ls.filter((x) => x >= 70).length,
  });
}
rows.sort((a, b) => b.D + b.C - (a.D + a.C));

console.log('课程 | 学科 | 总节 | A | B | C | D | 未达标(C+D) | 均分');
for (const r of rows) {
  console.log(`${r.title} | ${r.domain} | ${r.n} | ${r.A} | ${r.B} | ${r.C} | ${r.D} | ${r.C + r.D} | ${r.avg}`);
}
const t = rows.reduce((o, r) => ({ A: o.A + r.A, B: o.B + r.B, C: o.C + r.C, D: o.D + r.D }), { A: 0, B: 0, C: 0, D: 0 });
console.log(`合计 | | ${rows.reduce((s, r) => s + r.n, 0)} | ${t.A} | ${t.B} | ${t.C} | ${t.D} | ${t.C + t.D}`);
