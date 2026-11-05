import type {
  Chapter,
  CodeExercise,
  Demo,
  Exercise,
  FillExercise,
  JudgeExercise,
  Lesson,
  MultipleChoiceExercise,
  OpenExercise,
  SingleChoiceExercise,
  Tip,
} from '../../../types';

type Choice = [value: string, text: string];

type ExerciseSpec =
  | {
      type: 'single';
      question: string;
      options: Choice[];
      answer: string;
      explanation: string;
      tags: string[];
    }
  | {
      type: 'multiple';
      question: string;
      options: Choice[];
      answer: string[];
      explanation: string;
      tags: string[];
    }
  | {
      type: 'judge';
      question: string;
      answer: boolean;
      explanation: string;
      tags: string[];
    }
  | {
      type: 'fill';
      question: string;
      blanks: string[][];
      explanation: string;
      tags: string[];
      prefix?: string;
      suffix?: string;
    }
  | {
      type: 'code';
      question: string;
      starterCode: string;
      expectedOutput: string;
      tests: string;
      answer: string;
      explanation: string;
      tags: string[];
      allowedModules?: string[];
      setupCode?: string;
    }
  | {
      type: 'open';
      question: string;
      referenceAnswer: string;
      rubric: { point: string; score: number }[];
      explanation: string;
      tags: string[];
      keywords?: string[];
    };

export interface LessonInput {
  id: string;
  title: string;
  difficulty: 2 | 3 | 4;
  goals: string[];
  prerequisites: string[];
  problem: string;
  intuition: string;
  concepts: string;
  derivation: string;
  diagram: string;
  diagramNote: string;
  caseStudy: string;
  codePractice: string;
  mistakes: string[];
  relations: string;
  summary: string;
  references: string[];
  lab: string[];
  selfExplanations: [string, string];
  predictionPrompt: string;
  tips: Tip[];
  demo: Demo;
}

function numbered(items: string[]): string {
  return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
}

function bullets(items: string[]): string {
  return items.map((item) => `- ${item}`).join('\n');
}

export function makeLesson(input: LessonInput): Lesson {
  const selfExplanationBlock = `${input.selfExplanations[0]}\n\n${input.selfExplanations[1]}\n\n**先预测再验证**：${input.predictionPrompt}`;
  const content = `
## 学习目标

${numbered(input.goals)}

学完本节后，不要只记住 API；你应当能从输入、状态变化和失败路径三个层面复述下面的机制，并把同一思路迁移到本地夹具与后续项目。

## 前置知识

${bullets(input.prerequisites)}

如果其中一项不熟悉，先回到对应章节完成代码演示。本节不会把缺失的前提伪装成“配置问题”。

## 问题背景

${input.problem}

## 直觉理解

${input.intuition}

把爬虫想成一条不断缩小不确定性的流水线：先确认“拿到了什么”，再确认“结构在哪里”，最后才抽取字段。跳过前两步，代码常常能跑，却无法解释为什么拿到空值、错字段或重复数据。

## 核心概念与原理详解

${input.concepts}

## 逐步推导与计算

${input.derivation}

推导的目的不是得到漂亮数字，而是让每个决策都有可复核的依据：输入是多少、约束是什么、取整或去重发生在哪一步，以及哪些失败没有进入成功计数。

## 图示与机制图解

${input.diagramNote}

${input.diagram}

阅读图解时，沿着箭头为每个节点写下“输入、输出、可失败点”。图中的分支必须能在代码里找到对应状态，否则它只是装饰。

## 完整案例

${input.caseStudy}

## 代码实践

${input.codePractice}

下面的 Demo 与站内练习只使用 Python 标准库和确定性字符串夹具。第三方解析器或浏览器自动化会在明确标注的本地环境中讨论，不会伪装成浏览器内可联网执行。

## 常见误区与安全风险

${bullets(input.mistakes)}

安全边界与正确性同样重要：只处理任务授权范围内的合成数据或获准数据，不加入登录、验证码、付费墙、限流或访问控制绕过。

## 与其他知识点的关联

${input.relations}

## 本节总结

${input.summary}

检验是否真正理解，不看能否背出定义，而看能否对一个新页面写出字段契约、失败分类和一小组断言。

## 参考资料与延伸阅读

${bullets(input.references)}

资料用于核对术语与机制。课程示例、夹具、图解和解释均为原创；不以教材段落或仓库实现替代自己的推导。

## 动手实验

${numbered(input.lab)}

${selfExplanationBlock}

**合规提醒**：以下实验只使用本地字符串、合成数据或获准的测试目标。\`robots.txt\` 是自愿排除协议，不等于法律授权；页面公开可见也不等于可以无限保存、合并或再分发。
`;

  return {
    id: input.id,
    title: input.title,
    difficulty: input.difficulty,
    content,
    tips: input.tips,
    demos: [input.demo],
  };
}

export function makeExercises(
  chapterId: string,
  lessonId: string,
  difficulty: 2 | 3 | 4,
  specs: ExerciseSpec[],
): Exercise[] {
  return specs.map((spec, index) => {
    const base = {
      id: `${lessonId}-e${String(index + 1).padStart(2, '0')}`,
      difficulty,
      relatedLessonId: lessonId,
      question: spec.question,
      explanation: spec.explanation,
      tags: [chapterId, spec.tags[0] ?? '综合', ...spec.tags.slice(1)],
    };

    switch (spec.type) {
      case 'single':
        return {
          ...base,
          type: 'single',
          options: spec.options.map(([value, text]) => ({ value, text })),
          answer: spec.answer,
        } satisfies SingleChoiceExercise;
      case 'multiple':
        return {
          ...base,
          type: 'multiple',
          options: spec.options.map(([value, text]) => ({ value, text })),
          answer: spec.answer,
        } satisfies MultipleChoiceExercise;
      case 'judge':
        return { ...base, type: 'judge', answer: spec.answer } satisfies JudgeExercise;
      case 'fill':
        return {
          ...base,
          type: 'fill',
          blanks: spec.blanks,
          prefix: spec.prefix,
          suffix: spec.suffix,
          ignoreWhitespace: true,
        } satisfies FillExercise;
      case 'code':
        return {
          ...base,
          type: 'code',
          lang: 'python',
          starterCode: spec.starterCode,
          expectedOutput: spec.expectedOutput,
          tests: spec.tests,
          answer: spec.answer,
          allowedModules: spec.allowedModules,
          setupCode: spec.setupCode,
        } satisfies CodeExercise;
      case 'open':
        return {
          ...base,
          type: 'open',
          referenceAnswer: spec.referenceAnswer,
          rubric: spec.rubric,
          keywords: spec.keywords,
        } satisfies OpenExercise;
    }
  });
}

export function makeChapter(
  chapter: Omit<Chapter, 'courseId' | 'order'>,
): Omit<Chapter, 'courseId' | 'order'> {
  return chapter;
}
