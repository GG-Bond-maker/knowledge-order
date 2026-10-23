/**
 * 知序学院 —— 核心数据模型
 *
 * 层级：学科(Domain) → 课程(Course) → 章节(Chapter) → 小节(Lesson，知识点) → 习题(Exercise)
 *
 * 设计要点：
 * - 内容既可以是内置的 TypeScript 数据，也可以由后端 API 动态提供（后台录入）；
 * - 课程 id 是自由字符串，不再硬编码，新增学科无需改代码。
 */

/** 课程 id：自由字符串，由内容作者决定（如 'python'、'algo'、'llm'） */
export type CourseId = string;

/** 学科分类 */
export interface Domain {
  id: string;
  title: string;
  /** 一句话描述 */
  description: string;
  icon: string;
  color: string;
  /** 排序权重，小的在前 */
  order: number;
}

/**
 * 子课程系列：把同一学科下的多门课程归入一条学习路线。
 * 例如「大模型」学科下有 A1 从零手写 / A2 训练原理 / A3 LLaMA / B1 RAG 等系列。
 */
export interface CourseSeries {
  id: string;
  /** 所属学科（默认 ai） */
  domainId?: string;
  title: string;
  /** 系列分组名（如「地基」「进阶」「应用」） */
  group: string;
  icon: string;
  color: string;
  /** 一句话说明这个系列解决什么问题 */
  goal: string;
  /** 排序权重 */
  order: number;
  /** 学习路线上的优先级：1 先学，2 再学，3 后学 */
  stage: 1 | 2 | 3;
}

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export interface Course {
  id: CourseId;
  title: string;
  subtitle: string;
  description: string;
  /** 图标 emoji，避免引入额外图标依赖 */
  icon: string;
  /** 主题色，用于卡片与章节配色 */
  color: string;
  /** 所属学科 id，缺省归入“其他” */
  domainId?: string;
  /** 所属子课程系列 id（可选，用于地铁图式学习路线） */
  seriesId?: string;
  /** 前置课程 id（用于学习路径推荐与解锁判断） */
  prerequisites: CourseId[];
  targetAudience: string;
  estimatedHours: number;
  chapters: Chapter[];
  /** 内容来源：内置代码 / 后台创建 */
  source?: 'builtin' | 'custom';
  createdAt?: number;
  updatedAt?: number;
}

export interface Chapter {
  id: string;
  courseId: CourseId;
  order: number;
  title: string;
  /** 一句话概括本章要达成什么 */
  goal: string;
  lessons: Lesson[];
  exercises: Exercise[];
}

/** 知识点小节 */
export interface Lesson {
  id: string;
  title: string;
  /** 小节正文，Markdown 语法。支持 ``` 代码块 */
  content: string;
  /**
   * 知识点难度（1~5），决定该知识点的目标题量：
   * 1→6, 2→8, 3→10, 4→13, 5→16 题。
   */
  difficulty?: 1 | 2 | 3 | 4 | 5;
  /** 小贴士：易错点、面试考点、性能提示 */
  tips?: Tip[];
  /** 实操演示：可一键在页面内运行的代码片段 */
  demos?: Demo[];
}

export type TipKind = 'pitfall' | 'leak' | 'interview' | 'performance' | 'note';

export interface Tip {
  kind: TipKind;
  text: string;
}

/** 可运行演示 */
export interface Demo {
  title?: string;
  lang: 'python' | 'sql' | 'text';
  code: string;
  /** SQL 演示使用的数据集 id，见 engine/dataSource.ts */
  dataset?: string;
}

/* ─────────────────────────── 习题 ─────────────────────────── */

export type ExerciseType =
  | 'single'
  | 'multiple'
  | 'judge'
  | 'fill'
  | 'code'
  | 'sql'
  | 'open';

interface ExerciseBase {
  id: string;
  type: ExerciseType;
  difficulty: Difficulty;
  /** 题干，Markdown */
  question: string;
  /** 通用解析，判分后展示 */
  explanation?: string;
  /** 相关知识点小节 id，做错时可跳回复习 */
  relatedLessonId?: string;
  /** 标签，用于按知识点筛选练习 */
  tags?: string[];
}

/** 单选 */
export interface SingleChoiceExercise extends ExerciseBase {
  type: 'single';
  /** 正确选项的 value */
  answer: string;
  options: ChoiceOption[];
}

/** 多选 */
export interface MultipleChoiceExercise extends ExerciseBase {
  type: 'multiple';
  /** 正确选项 value 集合 */
  answer: string[];
  options: ChoiceOption[];
}

/** 判断 */
export interface JudgeExercise extends ExerciseBase {
  type: 'judge';
  answer: boolean;
}

/** 填空：代码挖空或概念填空，可能有多个空 */
export interface FillExercise extends ExerciseBase {
  type: 'fill';
  /** 每个空的正确答案候选（任一匹配即得分），支持正则写法 /.../flags */
  blanks: string[][];
  /** 填空前展示的可选，例如代码上下文 */
  prefix?: string;
  suffix?: string;
  /** 是否大小写敏感 */
  caseSensitive?: boolean;
  /** 是否忽略空白 */
  ignoreWhitespace?: boolean;
}

/** 代码编程题：运行测试用例判分 */
export interface CodeExercise extends ExerciseBase {
  type: 'code';
  /** 执行语言，当前仅支持 Python */
  lang?: 'python';
  /** 可选的参考解法（"查看答案"时展示） */
  answer?: string;
  starterCode: string;
  /** 期望用户代码最终如何求值/输出 */
  expectedOutput: string;
  /** Python 断言脚本。可用变量 out（用户代码最后一行表达式的值）；抛出异常即视为失败 */
  tests: string;
  /** 允许用户使用的模块 */
  allowedModules?: string[];
  setupCode?: string;
}

/** SQL 查询题：对结果集判分 */
export interface SqlExercise extends ExerciseBase {
  type: 'sql';
  /** 可选的参考 SQL（"查看答案"时展示），缺省用 referenceSql */
  answer?: string;
  /** 练习数据集 id，默认 'retail' */
  dataset?: string;
  starterSql?: string;
  /** 参考查询。执行后与用户结果集比对（默认忽略行顺序） */
  referenceSql: string;
  /** 是否要求行顺序一致 */
  ordered?: boolean;
  /** 是否比较列的顺序（默认只比较列名集合，再按列名对齐） */
  compareColumnOrder?: boolean;
  /** 结果集为空也视为正确 */
  allowEmpty?: boolean;
}

/** 简答题 / 案例分析题：对照参考答案自评 */
export interface OpenExercise extends ExerciseBase {
  type: 'open';
  /** 可选的答案别名，缺省用 referenceAnswer */
  answer?: string;
  /** 参考答案，可多段 */
  referenceAnswer: string;
  /** 评分要点，用户逐条自评 */
  rubric: { point: string; score: number }[];
  /** 可选：关键词自动初评，命中数量用于预评分 */
  keywords?: string[];
  /** 示例优秀答案 */
  exemplar?: string;
}

export interface ChoiceOption {
  value: string;
  text: string;
}

export type Exercise =
  | SingleChoiceExercise
  | MultipleChoiceExercise
  | JudgeExercise
  | FillExercise
  | CodeExercise
  | SqlExercise
  | OpenExercise;

/* ─────────────────────────── 学习进度 ─────────────────────────── */

/** 一次作答记录 */
export interface AttemptRecord {
  exerciseId: string;
  courseId: CourseId;
  chapterId: string;
  type: ExerciseType;
  correct: boolean;
  /** 0~1，简答题为自评得分比例 */
  score: number;
  /** 作答时耗时毫秒 */
  durationMs: number;
  answer: unknown;
  timestamp: number;
}

/** 题目掌握状态 */
export interface ExerciseMastery {
  exerciseId: string;
  courseId: CourseId;
  chapterId: string;
  attemptCount: number;
  correctCount: number;
  consecutiveCorrect: number;
  lastCorrect: boolean;
  lastAttemptAt: number;
  /** 是否曾被加入错题本 */
  everWrong: boolean;
  /** 用户收藏 */
  bookmarked: boolean;
  /** 艾宾浩斯复习：当前间隔阶段（0 表示未进入复习队列） */
  reviewStage?: number;
  /** 下次复习时间戳 */
  nextReviewAt?: number;
  /** 累计复习次数 */
  reviewCount?: number;
}

/** 每日学习记录，用于连续打卡与正确率曲线 */
export interface DailyStat {
  /** YYYY-MM-DD */
  date: string;
  attempts: number;
  correct: number;
  /** 完成的习题数（去重） */
  solved: number;
  minutes: number;
  /** 当日完成复习数 */
  reviews?: number;
}

/** 小节阅读状态 */
export interface LessonProgress {
  lessonId: string;
  courseId: CourseId;
  chapterId: string;
  read: boolean;
  readAt?: number;
}

/* ─────────────────── 笔记与书签 ─────────────────── */

/** 知识点旁注 */
export interface Note {
  id: string;
  /** 关联对象：小节或习题 */
  targetType: 'lesson' | 'exercise';
  targetId: string;
  courseId: CourseId;
  chapterId: string;
  /** 提示标题便于列表展示 */
  targetTitle: string;
  content: string;
  color?: string;
  createdAt: number;
  updatedAt: number;
}

/* ─────────────────── 学习计划 ─────────────────── */

export interface StudyPlan {
  /** 每日目标题量 */
  dailyGoal: number;
  /** 每周学习天数（0=周日 … 6=周六） */
  activeWeekdays: number[];
  /** 每日提醒时间 HH:mm，留空则不提醒 */
  reminderTime?: string;
  /** 提醒是否开启（仅页面内提醒） */
  reminderEnabled: boolean;
  /** 计划开始日期 YYYY-MM-DD */
  startDate: string;
  /** 备注 */
  note?: string;
}

/** 单日完成情况（用于计划达成度） */
export interface PlanProgress {
  date: string;
  solved: number;
  goalMet: boolean;
}

export interface AppState {
  version: number;
  mastery: Record<string, ExerciseMastery>;
  daily: Record<string, DailyStat>;
  lessons: Record<string, LessonProgress>;
  notes: Record<string, Note>;
  plan: StudyPlan;
  /** 当前进行中的挑战会话 */
  favoriteCourse?: CourseId;
  lastActiveDate?: string;
  streakDays: number;
  longestStreak: number;
}

export interface JudgeResult {
  correct: boolean;
  score: number;
  /** 逐空/逐测试用例反馈 */
  details: JudgeDetail[];
  message?: string;
}

export interface JudgeDetail {
  label: string;
  passed: boolean;
  expected?: string;
  actual?: string;
}
