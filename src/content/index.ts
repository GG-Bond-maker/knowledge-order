/**
 * 课程内容访问入口（兼容层）。
 *
 * 设计：优先使用后端 API 加载的内容（支持后台随时录入），
 * 若尚未加载或后端不可用，则回退到内置 TypeScript 内容。
 * 页面组件通过这里的函数读取内容，无需关心来源。
 */

import type { Course, CourseId, Chapter, Exercise, Lesson } from '../types';
import {
  pythonCourse,
  pandasCourse,
  sqlCourse,
  excelCourse,
  vizCourse,
  methodologyCourse,
  algoCourse,
  LLM_COURSES,
  MINING_COURSES,
  AI_AUTO_COURSES,
  PAPER_COURSES,
  QUANT_COURSES,
  CS146S_COURSES,
} from './courses';
import { getContent, findCourseSync } from '../store/contentStore';
import statsFoundationsJson from '../../content-data/courses/stats-foundations.json';
import causalInferenceJson from '../../content-data/courses/causal-inference.json';
import financialStatementsJson from '../../content-data/courses/financial-statements.json';
import dbtAnalyticsEngineeringJson from '../../content-data/courses/dbt-analytics-engineering.json';
import airflowDataEngineeringJson from '../../content-data/courses/airflow-data-engineering.json';
import pythonFoundationsDataJson from '../../content-data/courses/python-foundations-data.json';
import pythonEngineeringPracticesJson from '../../content-data/courses/python-engineering-practices.json';
import pythonLlmApplicationsJson from '../../content-data/courses/python-llm-applications.json';
import pythonAgentDevelopmentJson from '../../content-data/courses/python-agent-development.json';
import mlFoundationsJson from '../../content-data/courses/ml-foundations.json';
import mlMathJson from '../../content-data/courses/ml-math.json';
import mlPythonDataJson from '../../content-data/courses/ml-python-data.json';
import mlClassicalAlgorithmsJson from '../../content-data/courses/ml-classical-algorithms.json';
import mlEngineeringJson from '../../content-data/courses/ml-engineering.json';
import mlDeepLearningJson from '../../content-data/courses/ml-deep-learning.json';
import mlTransformerLlmJson from '../../content-data/courses/ml-transformer-llm.json';
import mlLlmApplicationsJson from '../../content-data/courses/ml-llm-applications.json';

const FOUNDATION_COURSES: Course[] = [
  statsFoundationsJson as unknown as Course,
  causalInferenceJson as unknown as Course,
  financialStatementsJson as unknown as Course,
  dbtAnalyticsEngineeringJson as unknown as Course,
  airflowDataEngineeringJson as unknown as Course,
  pythonFoundationsDataJson as unknown as Course,
  pythonEngineeringPracticesJson as unknown as Course,
  pythonLlmApplicationsJson as unknown as Course,
  pythonAgentDevelopmentJson as unknown as Course,
  mlFoundationsJson as unknown as Course,
  mlMathJson as unknown as Course,
  mlPythonDataJson as unknown as Course,
  mlClassicalAlgorithmsJson as unknown as Course,
  mlEngineeringJson as unknown as Course,
  mlDeepLearningJson as unknown as Course,
  mlTransformerLlmJson as unknown as Course,
  mlLlmApplicationsJson as unknown as Course,
];

/** 内置课程（离线回退与校验脚本使用） */
export const COURSES: Course[] = [
  pythonCourse,
  pandasCourse,
  sqlCourse,
  excelCourse,
  vizCourse,
  methodologyCourse,
  algoCourse,
  ...MINING_COURSES,
  ...AI_AUTO_COURSES,
  ...PAPER_COURSES,
  ...LLM_COURSES,
  ...QUANT_COURSES,
  ...FOUNDATION_COURSES,
  ...CS146S_COURSES,
];

/** 全部课程（动态：优先 API，回退内置） */
export function getCourses(): Course[] {
  const c = getContent();
  return c.courses.length ? c.courses : COURSES;
}

export function getCourseMap(): Record<CourseId, Course> {
  return getCourses().reduce(
    (acc, c) => {
      acc[c.id] = c;
      return acc;
    },
    {} as Record<CourseId, Course>,
  );
}

export function findCourse(id: string | undefined): Course | undefined {
  const dynamic = findCourseSync(id);
  if (dynamic) return dynamic;
  return id ? COURSES.find((c) => c.id === id) : undefined;
}

export function findChapter(courseId: string, chapterId: string): Chapter | undefined {
  return findCourse(courseId)?.chapters.find((c) => c.id === chapterId);
}

export function findLesson(lessonId: string): { course: Course; chapter: Chapter; lesson: Lesson } | undefined {
  for (const course of getCourses()) {
    for (const chapter of course.chapters) {
      const lesson = chapter.lessons.find((l) => l.id === lessonId);
      if (lesson) return { course, chapter, lesson };
    }
  }
  return undefined;
}

export function findExercise(exerciseId: string): { course: Course; chapter: Chapter; exercise: Exercise } | undefined {
  for (const course of getCourses()) {
    for (const chapter of course.chapters) {
      const exercise = chapter.exercises.find((e) => e.id === exerciseId);
      if (exercise) return { course, chapter, exercise };
    }
  }
  return undefined;
}

export interface Stats {
  lessons: number;
  exercises: number;
  byType: Record<string, number>;
}

export function courseStats(course: Course): Stats {
  const byType: Record<string, number> = {};
  let lessons = 0;
  let exercises = 0;
  for (const ch of course.chapters) {
    lessons += ch.lessons.length;
    exercises += ch.exercises.length;
    for (const ex of ch.exercises) byType[ex.type] = (byType[ex.type] ?? 0) + 1;
  }
  return { lessons, exercises, byType };
}

export function siteStats() {
  return getCourses().reduce(
    (acc, c) => {
      const s = courseStats(c);
      acc.lessons += s.lessons;
      acc.exercises += s.exercises;
      acc.chapters += c.chapters.length;
      Object.entries(s.byType).forEach(([k, v]) => (acc.byType[k] = (acc.byType[k] ?? 0) + v));
      return acc;
    },
    { lessons: 0, exercises: 0, chapters: 0, byType: {} as Record<string, number> },
  );
}

/** 按学科对课程分组 */
export function coursesByDomain(): { domainId: string; courses: Course[] }[] {
  const { domains } = getContent();
  const map = new Map<string, Course[]>();
  for (const c of getCourses()) {
    const d = c.domainId ?? 'data';
    if (!map.has(d)) map.set(d, []);
    map.get(d)!.push(c);
  }
  return domains
    .filter((d) => map.has(d.id))
    .map((d) => ({ domainId: d.id, courses: map.get(d.id)! }));
}

/** 内容校验（脚本与后台使用） */
export function validateContent(courses: Course[] = getCourses()): string[] {
  const errors: string[] = [];
  const ids = new Set<string>();
  const add = (id: string, label: string) => {
    if (ids.has(id)) errors.push(`${label} id 重复：${id}`);
    ids.add(id);
  };
  for (const course of courses) {
    add(course.id, '课程');
    course.chapters.forEach((ch) => {
      add(ch.id, '章节');
      ch.lessons.forEach((l) => add(l.id, '小节'));
      ch.exercises.forEach((e) => {
        add(e.id, '习题');
        if (e.type === 'fill' && !e.blanks?.length) errors.push(`填空题缺少答案：${e.id}`);
        if (e.type === 'code' && !e.tests) errors.push(`编程题缺少测试：${e.id}`);
        if (e.type === 'sql' && !e.referenceSql) errors.push(`SQL 题缺少参考查询：${e.id}`);
        if ((e.type === 'single' || e.type === 'multiple') && !e.options?.length) errors.push(`选择题缺少选项：${e.id}`);
      });
    });
  }
  return errors;
}
