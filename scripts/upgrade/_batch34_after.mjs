import fs from 'node:fs';

const MODULES = [
  ['goal', /学习目标|学完之后|你将能够|本节目标/],
  ['prereq', /前置知识|预备知识|先修|前置要求|需要先掌握/],
  ['why', /问题背景|为什么.{0,6}(重要|需要|学)|背景与动机|动机/],
  ['intuition', /直觉|直观理解|类比|打个比方|形象/],
  ['concept', /核心概念|定义|什么是|概念/],
  ['principle', /原理|机制|工作方式|逐步.{0,4}(解释|拆解)|详解/],
  ['derivation', /推导|证明|一步步.{0,4}算|手算|逐步计算/],
  ['case', /案例|示例|例题|实例|实战案例/],
  ['code', /代码|实现|编程|Python|程序/],
  ['diagram', /<Diagram|<TensorFlow|<Heatmap|<Slider|图示|示意图|图解/],
  ['misconception', /误区|易错|常见错误|混淆|陷阱|注意.{0,4}区别|小心/],
  ['connection', /知识关联|与.{0,12}(关系|联系|区别|对比)|前一章|后一节|承上启下/],
  ['summary', /总结|要点回顾|核心结论|关键结论|记住/],
  ['reference', /参考|来源|文献|出处|延伸阅读|Reference/],
];

function gradeLesson(c, lesson, chapter) {
  const len = c.length;
  const mathBlocks = (c.match(/\$\$/g) || []).length / 2;
  const inlineMath = (c.match(/(?<!\$)\$(?!\$)[^$\n]+(?<!\$)\$(?!\$)/g) || []).length;
  const codeBlocks = (c.match(/```/g) || []).length / 2;
  const diagrams = (c.match(/<(Diagram|TensorFlow|Heatmap|Slider)\b/g) || []).length;
  const hasDemo = (lesson.demos || []).length > 0;
  const hasTips = (lesson.tips || []).length > 0;
  const mods = {};
  for (const [, re] of MODULES) {
    const m = String(re).replace(/\\|/g, '|');
    mods[re] = re.test(c);
  }
  const modCount = Object.values(mods).filter(Boolean).length;
  const exPer = chapter.exercises.length / (chapter.lessons.length || 1);
  let score = Math.min(30, (len / 3000) * 30);
  score += (modCount / MODULES.length) * 40;
  score += Math.min(15, (mathBlocks + codeBlocks) * 3);
  score += Math.min(8, exPer * 2);
  score += (hasDemo ? 3 : 0) + (hasTips ? 2 : 0) + (diagrams > 0 ? 2 : 0);
  score = Math.round(score);
  const grade = score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'D';
  return { score, grade, len };
}

const before = JSON.parse(fs.readFileSync('scripts/upgrade/_batch34_before.json', 'utf8'));
const out = [];
const counts = { A: 0, B: 0, C: 0, D: 0 };
for (const f of ['llm-a1', 'python', 'deep-learning']) {
  const c = JSON.parse(fs.readFileSync(`content-data/courses/${f}.json`, 'utf8'));
  for (const ch of c.chapters) {
    for (const l of ch.lessons) {
      if (before[l.id] === undefined) continue;
      const { score, grade, len } = gradeLesson(l.content, l, ch);
      counts[grade]++;
      out.push(`${f} ${l.id}: ${before[l.id]} -> ${grade}(${score}) len=${len}`);
    }
  }
}
console.log('after grade counts:', counts, 'total', out.length);
console.log(out.join('\n'));
