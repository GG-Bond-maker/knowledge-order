// 临时:仅对 stats-foundations c13-c18 复刻 depth-audit 评分,输出 A/B/C/D 分布
import fs from 'node:fs';
const c = JSON.parse(fs.readFileSync('content-data/courses/stats-foundations.json', 'utf8'));
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
let dist = { A: 0, B: 0, C: 0, D: 0 };
for (const ch of c.chapters) {
  if (ch.id < 'stats-foundations-c13' || ch.id > 'stats-foundations-c18') continue;
  for (const l of ch.lessons) {
    const s = l.content || '';
    const len = s.length;
    const mathBlocks = (s.match(/\$\$/g) || []).length / 2;
    const codeBlocks = (s.match(/```/g) || []).length / 2;
    const mods = {}; for (const [k, re] of MODULES) mods[k] = re.test(s);
    const modCount = Object.values(mods).filter(Boolean).length;
    const exPer = ch.exercises.length / ch.lessons.length;
    let score = 0;
    score += Math.min(30, (len / 3000) * 30);
    score += (modCount / MODULES.length) * 40;
    score += Math.min(15, (mathBlocks + codeBlocks) * 3);
    score += Math.min(8, exPer * 2);
    score += ((l.demos || []).length > 0 ? 3 : 0) + ((l.tips || []).length > 0 ? 2 : 0);
    const grade = score >= 70 ? 'A' : score >= 55 ? 'B' : score >= 40 ? 'C' : 'D';
    dist[grade]++;
    console.log(l.id, grade, score, len);
  }
}
console.log(JSON.stringify(dist));
