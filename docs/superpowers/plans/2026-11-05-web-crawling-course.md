# 网络爬虫综合课程 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在知序学院新增独立学科「网络爬虫」和一门 12 章、36 个知识点、349 道习题、5 个项目的完整综合课程。

**Architecture:** 课程内容使用现有 `Domain → Course → Chapter → Lesson / Exercise` TypeScript 数据模型；12 个章节文件各承载 3 个知识点和整章习题；12 类原创 SVG 图解复用现有 Markdown `<Diagram>` 管道；站内可运行代码只用 Python 标准库和确定性夹具，第三方库代码与 Playwright 项目只存在于本地实验室资产。

**Tech Stack:** React + TypeScript 内容、Markdown、现有 Pyodide 判分器、内联 SVG/CSS、Python 标准库、`unittest`、现有 `playwright-core` 浏览器验证脚本；不新增站点运行时依赖。

**Spec:** `docs/superpowers/specs/2026-11-05-web-crawling-course-design.md`

## Global Constraints

- 学科：`crawling` /「网络爬虫」/ `🕷️` / `#0f766e` / `order: 12`。
- 课程：`web-crawling` /「网络爬虫：从静态页面到可监控的增量采集系统」/ `🕸️` / `estimatedHours: 72`。
- 课程不得设置 `seriesId`；`prerequisites` 为 `[]`；目标人群必须使用设计稿指定文本。
- 固定 12 章、36 个知识点：每章恰好 3 节；项目课是第 4、7、8、11、12 章的第 3 节。
- 固定 349 道习题：难度 2 知识点各 8 题，难度 3 知识点各 10 题，难度 4 项目知识点各 13 题。
- ID 固定为 `web-crawling-cNN`、`web-crawling-cNN-lNN`、`web-crawling-cNN-lNN-eNN`。
- 每道题必须有非空 `explanation`，并设置所属章节内的 `relatedLessonId`；禁止 `sql` 题。
- 每节正文目标 4000–6000 字符，项目课 5000–8000 字符；必须出现 14 个 `##` 教学模块。
- 每节至少 3 条 `tips`、至少 1 个真实 `<Diagram>` 或结构化表格、至少 1 个代码块或 Demo。
- 每节至少 2 个自我解释提示，并遵循“完整示例 → 半成品 → 独立实现 → 迁移”的淡出结构。
- 站内 `demos`、代码题 `starterCode/setupCode/tests/answer` 不得依赖真实网络，不得导入 `requests`、`bs4`、`lxml`、`scrapy`、`selenium`、`playwright`。
- 第三方库代码必须放在普通 Markdown 代码块中，并明确“本地环境运行，站内不判分”。
- 所有课程正文、练习、图示、夹具和代码为原创；只引用教材/标准/论文/开源文档，不复制原文或仓库实现。
- 禁止 CAPTCHA、登录、付费墙、robots、限流或访问控制的绕过内容，也禁止真实个人数据采集。
- 不修改无关课程、旧习题或平台功能；不新增运行时 package。
- 用户尚未授权 Git 提交：**不要执行 `git commit`**。每个任务的完成证据是验证命令输出与审阅记录。
- 所有命令在 Windows PowerShell 中执行；不要使用 Bash/WSL。

## Review Focus

1. **题量与 ID 完整性**：页面能渲染不代表每节题量正确；`check:web-crawling` 必须逐章核对 8/10/13 的题量与 ID。
2. **图示静默失效**：只写标签、不注册会显示占位或空白；内容检查脚本核对 kind/name，浏览器脚本核对 `.diagram-missing`。
3. **离线代码失真**：Demo 或代码题一旦导入第三方包/真实网络，Pyodide 判分会失败；内容检查脚本扫描可执行字段。
4. **导航被平铺**：单课程学科默认会平铺掉学科名；`test:nav` 必须明确检查「网络爬虫」分组和课程标题。
5. **项目只有“快乐路径”**：采集项目必须在故障注入下证明恢复、幂等和限速；每个项目测试都必须覆盖失败后重跑。

---

## Course Data Contract

### Fixed chapter matrix

| Chapter | Chapter ID | Lessons | Difficulties | Exercise counts | Chapter total |
| --- | --- | ---: | --- | --- | ---: |
| 1 从网页到数据：爬虫是什么 | `web-crawling-c01` | 3 | 2/2/2 | 8/8/8 | 24 |
| 2 HTTP、URL 与网络请求 | `web-crawling-c02` | 3 | 2/3/3 | 8/10/10 | 28 |
| 3 HTML、DOM 与页面结构 | `web-crawling-c03` | 3 | 2/3/3 | 8/10/10 | 28 |
| 4 静态页面抽取 | `web-crawling-c04` | 3 | 2/3/4 | 8/10/13 | 31 |
| 5 链接发现、URL 规范化与 Frontier | `web-crawling-c05` | 3 | 2/3/3 | 8/10/10 | 28 |
| 6 robots.txt、礼貌抓取与限速 | `web-crawling-c06` | 3 | 2/3/3 | 8/10/10 | 28 |
| 7 单机爬虫架构与可恢复性 | `web-crawling-c07` | 3 | 2/3/4 | 8/10/13 | 31 |
| 8 JavaScript 渲染页面 | `web-crawling-c08` | 3 | 2/3/4 | 8/10/13 | 31 |
| 9 数据质量、存储与模式 | `web-crawling-c09` | 3 | 2/2/3 | 8/8/10 | 26 |
| 10 增量采集与变更检测 | `web-crawling-c10` | 3 | 2/3/3 | 8/10/10 | 28 |
| 11 分布式采集、监控与档案 | `web-crawling-c11` | 3 | 3/3/4 | 10/10/13 | 33 |
| 12 合规、安全与毕业项目 | `web-crawling-c12` | 3 | 3/3/4 | 10/10/13 | 33 |
| **合计** | 12 | **36** | 13×2 / 18×3 / 5×4 | — | **349** |

### Fixed lesson registry

Use these IDs and counts exactly:

```text
c01-l01 d2/8   c01-l02 d2/8   c01-l03 d2/8
c02-l01 d2/8   c02-l02 d3/10  c02-l03 d3/10
c03-l01 d2/8   c03-l02 d3/10  c03-l03 d3/10
c04-l01 d2/8   c04-l02 d3/10  c04-l03 d4/13
c05-l01 d2/8   c05-l02 d3/10  c05-l03 d3/10
c06-l01 d2/8   c06-l02 d3/10  c06-l03 d3/10
c07-l01 d2/8   c07-l02 d3/10  c07-l03 d4/13
c08-l01 d2/8   c08-l02 d3/10  c08-l03 d4/13
c09-l01 d2/8   c09-l02 d2/8   c09-l03 d3/10
c10-l01 d2/8   c10-l02 d3/10  c10-l03 d3/10
c11-l01 d3/10  c11-l02 d3/10  c11-l03 d4/13
c12-l01 d3/10  c12-l02 d3/10  c12-l03 d4/13
```

### Exercise type baseline

The whole course starts from this baseline and may rebalance within a chapter while preserving the exact total:

| Lesson difficulty | Single | Judge | Multiple | Fill | Code | Open | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 2 | 2 | 2 | 1 | 1 | 1 | 1 | 8 |
| 3 | 2 | 2 | 1 | 1 | 2 | 2 | 10 |
| 4 | 2 | 2 | 2 | 1 | 3 | 3 | 13 |

Every code exercise must include a complete `answer`, deterministic `tests`, and `allowedModules` limited to standard-library modules used by that exercise.

### Chapter count checklist

| Chapter | Total | 2-point | 3-point | 4-point | 5-point |
| --- | ---: | ---: | ---: | ---: | ---: |
| c01 | 24 | 9 | 11 | 4 | 0 |
| c02 | 28 | 7 | 14 | 7 | 0 |
| c03 | 28 | 7 | 14 | 7 | 0 |
| c04 | 31 | 6 | 14 | 9 | 2 |
| c05 | 28 | 7 | 14 | 7 | 0 |
| c06 | 28 | 7 | 14 | 7 | 0 |
| c07 | 31 | 6 | 14 | 9 | 2 |
| c08 | 31 | 6 | 14 | 9 | 2 |
| c09 | 26 | 8 | 13 | 5 | 0 |
| c10 | 28 | 7 | 14 | 7 | 0 |
| c11 | 33 | 3 | 15 | 10 | 5 |
| c12 | 33 | 3 | 15 | 10 | 5 |

The question-level difficulty distribution is advisory within each lesson; the invariant is the lesson's total count and the presence of real 2/3/4-point work. Project lessons must include at least one 5-point challenge but are not allowed to make every question a 5.

### Standard lesson procedure

Use this procedure in every chapter task:

1. Replace the chapter skeleton's `lessons` with three complete lesson objects.
2. Each lesson starts with the exact title from the spec and uses all 14 `##` headings.
3. Write the first lesson as a fully worked example, the second with faded completion, and the third with independent/transfer practice.
4. Add at least two explicit self-explanation prompts and at least one “predict what will fail” prompt.
5. Add three `tips`, one visual anchor, and one code block or offline Demo.
6. Replace `exercises` with the exact count from the fixed registry.
7. Add `relatedLessonId` to every exercise.
8. Run the chapter-specific checker and `pnpm run typecheck`.
9. Run `pnpm run sync:web-crawling` so the browser/API sees the updated chapter without rewriting unrelated course JSON.
10. Load the chapter page and confirm 3 `.lesson-section-card` sections and zero `.diagram-missing`.

---

## Task 1: Course Shell, Domain, Navigation, and Chapter Skeletons

**Files:**
- Create: `src/content/chapters/web-crawling/index.ts`
- Create: `src/content/chapters/web-crawling/c01.ts` … `c12.ts`
- Modify: `src/content/courses.ts`
- Modify: `src/content/index.ts`
- Modify: `src/store/contentStore.ts`
- Modify: `content-data/domains.json`
- Modify: `src/components/AppLayout.tsx`
- Modify: `scripts/e2e-nav-group.mjs`
- Modify: `scripts/sync-content.mjs`
- Modify: `package.json`

**Interfaces:**
- Each `cNN.ts` exports `webCrawlingChaptersNN: Omit<Chapter, 'courseId' | 'order'>[]` with exactly one chapter.
- `src/content/chapters/web-crawling/index.ts` exports `webCrawlingChapters` by spreading all 12 arrays in chapter order.
- `src/content/courses.ts` imports `webCrawlingChapters` and exports `webCrawlingCourse`.
- `src/content/index.ts` imports `webCrawlingCourse` and appends it to `COURSES`.
- `scripts/sync-content.mjs` accepts `--id web-crawling` and writes only that course; no argument preserves the existing sync-all behavior.

- [ ] **Step 1: Create the 12 chapter skeletons**

Each chapter object must contain the exact ID, title, and goal from the spec, plus:

```ts
lessons: [],
exercises: [],
```

Do not create placeholder lesson prose. Empty arrays make the navigation milestone testable without polluting content quality.

- [ ] **Step 2: Build the chapter aggregator**

`src/content/chapters/web-crawling/index.ts` must import all 12 named exports and return:

```ts
export const webCrawlingChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  ...webCrawlingChapters01,
  // ...through 12
];
```

- [ ] **Step 3: Register the course metadata**

Use the exact course object from spec §5.2. Build it with the existing `build()` helper. Do not add `seriesId`.

- [ ] **Step 4: Register the domain and navigation exception**

Add `crawling` to `DEFAULT_DOMAINS` and `content-data/domains.json`. In `AppLayout.tsx`, add `crawling` to the single-course exception alongside `paper` and `data-engineering`; add `crawling: ['web-crawling']` to `DOMAIN_COURSE_ORDER`.

- [ ] **Step 5: Update navigation regression**

In `scripts/e2e-nav-group.mjs`, add `网络爬虫` after `AI 原生软件工程` and before `人工智能 · 大模型` in `expectedGroups`. Add a check that expanding the group reveals the title `网络爬虫：从静态页面到可监控的增量采集系统` and that the group title still exists after refresh.

- [ ] **Step 6: Add targeted content sync**

Add a `--id` filter to `scripts/sync-content.mjs` and a package script:

```json
"sync:web-crawling": "node scripts/sync-content.mjs --id web-crawling"
```

Verify that running it updates only `content-data/courses/web-crawling.json`; preserve `git status` evidence that unrelated course JSON files did not change.

- [ ] **Step 7: Validate the shell**

Run:

```powershell
pnpm run typecheck
pnpm run audit
pnpm run sync:web-crawling
```

Expected:

- TypeScript passes.
- Content validation reports no duplicate IDs or missing required fields.
- Sync creates only `content-data/courses/web-crawling.json` with 12 chapters, 0 lessons and 0 exercises.

Start the app/API in another terminal, then run:

```powershell
pnpm run test:nav
```

Expected: all nav checks pass, including the new group.

- [ ] **Step 8: Stop before chapter content**

Do not proceed to Task 2 if the sidebar still flattens the course into a standalone link.

---

## Task 2: Twelve Accessible SVG Diagrams

**Files:**
- Create: `src/components/diagrams/webCrawlingDiagramKinds.ts`
- Create: `src/components/diagrams/WebCrawlingDiagrams.tsx`
- Create: `src/components/diagrams/web-crawling-diagrams.css`
- Modify: `src/components/diagrams/DiagramRenderer.tsx`
- Modify: `src/components/Markdown.tsx`

**Interfaces:**

`webCrawlingDiagramKinds.ts` is dependency-free and exports:

```ts
export const WEB_CRAWLING_DIAGRAMS = {
  'crawl-http-journey': ['overview', 'failure'],
  'crawl-pipeline': ['overview', 'static', 'api', 'incremental'],
  'crawl-dom-tree': ['basic', 'selectors'],
  'crawl-canonicalize': ['default'],
  'crawl-frontier': ['bfs', 'priority'],
  'crawl-robots': ['default'],
  'crawl-rate-limit': ['tokens', 'backoff'],
  'crawl-render-timeline': ['ssr', 'csr', 'playwright'],
  'crawl-recrawl': ['default'],
  'crawl-distributed': ['overview', 'failure'],
  'crawl-compliance': ['consent', 'ssrf'],
  'crawl-bloom': ['bloom', 'simhash'],
} as const;

export const WEB_CRAWLING_DIAGRAM_KINDS = Object.keys(WEB_CRAWLING_DIAGRAMS);
export type WebCrawlingDiagramKind = keyof typeof WEB_CRAWLING_DIAGRAMS;
```

`WebCrawlingDiagrams.tsx` exports one component per kind and a `WebCrawlingDiagram` dispatcher.

- [ ] **Step 1: Build the shared kind/name registry**

Use the exact keys and sample names above. These are the only valid names for this course's diagram tags.

- [ ] **Step 2: Implement the twelve diagrams**

Each component must:

- use inline SVG or semantic HTML/CSS;
- render a `figure.diagram-block` with `figcaption`;
- expose a concise `aria-label`/text summary;
- use existing CSS variables for theme compatibility;
- avoid color-only meaning;
- support a `name` prop with the registered variants;
- avoid animation unless it explains a state transition;
- respect `prefers-reduced-motion`.

Diagram content must match spec §11.2; no spider-web decoration without information value.

- [ ] **Step 3: Add accessible interaction**

For interactive nodes:

- support hover and keyboard focus;
- show the same explanatory text in a visible caption;
- do not use a click as the only way to access required information;
- include static fallback content when JavaScript is unavailable.

- [ ] **Step 4: Register in `DiagramRenderer.tsx`**

- Import the new components and the shared type.
- Extend `DiagramKind` with `WebCrawlingDiagramKind`.
- Add one switch case per kind.
- Add all 12 entries to `REGISTERED_DIAGRAMS` using `WEB_CRAWLING_DIAGRAMS`.

- [ ] **Step 5: Register in `Markdown.tsx`**

Import `WEB_CRAWLING_DIAGRAM_KINDS` and allow a `<Diagram>` kind when it is in the existing legacy list **or** the new shared list. Do not paste a second 12-item list into `Markdown.tsx`.

- [ ] **Step 6: Add component-scoped CSS**

Use `src/components/diagrams/web-crawling-diagrams.css` so the new responsive rules do not alter old diagrams. Keep all selectors prefixed with `.crawl-`.

- [ ] **Step 7: Validate**

Run:

```powershell
pnpm run typecheck
pnpm run build
```

Expected: both pass. Do not call the task complete until a later chapter page renders at least one new diagram with no console error.

---

## Task 3: Content Checker and Chapter 1 Quality Benchmark

**Files:**
- Create: `scripts/web-crawling-spec.mjs`
- Create: `scripts/check-web-crawling.mjs`
- Modify: `package.json`
- Modify: `src/content/chapters/web-crawling/c01.ts`

**Interfaces:**

`web-crawling-spec.mjs` exports the fixed chapter/lesson matrix from this plan plus the 14 section headings and diagram registry.

`check-web-crawling.mjs` supports:

```text
node scripts/check-web-crawling.mjs                 # full course
node scripts/check-web-crawling.mjs --chapter c01   # one chapter
```

Exit code 0 only when every enabled check passes.

- [ ] **Step 1: Write the fixed spec module**

Include exact IDs, difficulties, exercise totals, course metadata, heading list, and diagram kinds/names.

- [ ] **Step 2: Write the checker**

The checker bundles `src/content/index.ts` with esbuild, imports `COURSES`, and asserts:

1. `web-crawling` exists and has domain `crawling`, 12 chapters, 72 hours, no `seriesId`.
2. Each enabled chapter has exactly 3 lessons and the exact exercise total.
3. Lesson IDs and difficulties match the fixed matrix.
4. All course-level and chapter-level IDs are unique.
5. Lesson content is at least 4000 characters; difficulty 4 lessons at least 5000.
6. All 14 headings exist as `##`.
7. `tips.length >= 3`.
8. A visual anchor exists: at least one `<Diagram>` or a Markdown table row.
9. A code block exists or `demos.length > 0`.
10. Every `<Diagram>` has a known kind and name.
11. Every exercise has `explanation`, `relatedLessonId`, and the related ID belongs to the same chapter.
12. Every single/multiple answer exists in options; multiple is non-empty.
13. Fill exercises have non-empty `blanks`.
14. Code exercises have non-empty `starterCode`, `expectedOutput`, `tests`, `answer`, and only standard-library modules.
15. Open exercises have `referenceAnswer` and a non-empty rubric.
16. No `sql` exercise exists.
17. Demo code and code-exercise executable fields do not include blocked imports/calls:
    `requests`, `bs4`, `BeautifulSoup`, `lxml`, `scrapy`, `selenium`, `playwright`, `urlopen(`.
18. Each lesson has at least two URLs in its reference section.

Output a compact table per chapter and a list of failures with exact IDs.

- [ ] **Step 3: Add the package script**

Add:

```json
"check:web-crawling": "node scripts/check-web-crawling.mjs"
```

- [ ] **Step 4: Run the checker before chapter content**

Run:

```powershell
node scripts/check-web-crawling.mjs --chapter c01
```

Expected: FAIL because `c01` has no lessons or exercises. Record the failure; this proves the checker is active.

- [ ] **Step 5: Write Chapter 1**

Create 3 lessons:

- `web-crawling-c01-l01` — 网页、浏览器与数据采集：建立正确心智模型 — difficulty 2.
- `web-crawling-c01-l02` — 第一个离线解析实验：从 HTML 字符串到结构化数据 — difficulty 2.
- `web-crawling-c01-l03` — 能抓什么、不该抓什么：范围、伦理与法律边界 — difficulty 2.

Use the required diagrams:

- l01 `<Diagram type="crawl-http-journey" name="overview" />`
- l02 `<Diagram type="crawl-dom-tree" name="basic" />`
- l03 `<Diagram type="crawl-compliance" name="consent" />`

Each lesson must satisfy the standard lesson procedure. Chapter 1's code must stay within `html.parser`, `urllib.parse`, `re`, and plain Python.

- [ ] **Step 6: Write 24 Chapter 1 exercises**

Use 8 exercises per lesson. Cover:

- l01: request/DOM mental model, API-first decision, client vs server, a short calculation about expected pages/requests.
- l02: parsing a fixed card, relative URL resolution, missing fields, debug test.
- l03: permission vs visibility, robots boundary, personal data minimization, a worked risk/threshold calculation.

Every lesson must include at least one code exercise and one open/analysis exercise.

- [ ] **Step 7: Validate Chapter 1 and the shell**

Run:

```powershell
node scripts/check-web-crawling.mjs --chapter c01
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected:

- `24` exercises, `3` lessons, `3` diagrams.
- No blocked package in executable fields.
- All 14 headings and depth thresholds pass.

Start the app/API, open `/course/web-crawling/chapter/web-crawling-c01`, and confirm:

- 3 `.lesson-section-card` sections;
- 3 rendered `.diagram-block` figures;
- 0 `.diagram-missing`;
- no mobile-width horizontal page overflow at 390px.

- [ ] **Step 8: Quality gate**

Reject this chapter if a lesson reads like a glossary rather than a progression through prediction, failure, mechanism, worked example and transfer. Do not use Chapter 1 as a template until this gate passes.

---

## Task 4: Chapter 2 — HTTP, URL 与网络请求

**Files:**
- Modify: `src/content/chapters/web-crawling/c02.ts`

**Interfaces:** Produce the 3 fixed lesson IDs and 28 exercises from the Course Data Contract.

- [ ] **Step 1: Write the three lessons**

Required mechanics:

- l01: URL anatomy, percent encoding, relative URLs, DNS/TCP/TLS/request/response failure points.
- l02: raw HTTP message, headers, status families, redirects, 403/404/410/429/5xx decision table.
- l03: cookies/session, charset detection, connect/read timeout, exponential backoff with jitter, `Retry-After`.

Use a code block or Demo for `urllib.parse`; use a `text` blocks/table for raw HTTP; show a worked three-retry calculation with exact waits.

- [ ] **Step 2: Add visual anchors**

Use:

- l01 `<Diagram type="crawl-http-journey" name="failure" />`;
- l02 a status-code decision table and raw-message comparison;
- l03 `<Diagram type="crawl-rate-limit" name="backoff" />`.

- [ ] **Step 3: Write 28 exercises**

Totals: 8/10/10. Include at least one status-code triage question, one URL resolution code task, one retry-budget calculation, and one “do not retry blindly” case.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c02
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 28 exercises and all chapter checks pass.

---

## Task 5: Chapter 3 — HTML、DOM 与页面结构

**Files:**
- Modify: `src/content/chapters/web-crawling/c03.ts`

**Interfaces:** Produce the 3 fixed lesson IDs and 28 exercises.

- [ ] **Step 1: Write the three lessons**

Required mechanics:

- l01: DOM tree, element/text/attribute,HTML5 recovery, traversal stack.
- l02: CSS selectors, XPath, selector stability, BeautifulSoup/lxml reading examples labeled local-only.
- l03: JSON-LD, Microdata, tables, repeated cards, missing fields, `<base>`, conflict resolution.

Station-runnable code uses `html.parser` and string fixtures only.

- [ ] **Step 2: Add visual anchors**

- l01 `<Diagram type="crawl-dom-tree" name="basic" />`;
- l02 `<Diagram type="crawl-dom-tree" name="selectors" />`;
- l03 a structured-source/field-coverage table.

- [ ] **Step 3: Write 28 exercises**

Totals: 8/10/10. Include at least two extraction code tasks, one malformed-HTML task, one selector-stability review, and one JSON-LD vs HTML conflict case.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c03
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 28 exercises; no third-party import in executable fields.

---

## Task 6: Chapter 4 — 静态页面抽取

**Files:**
- Modify: `src/content/chapters/web-crawling/c04.ts`

**Interfaces:** Produce 3 fixed lesson IDs and 31 exercises. The project lesson links to P1 assets created in Task 7.

- [ ] **Step 1: Write l01 and l02**

- l01: parser tradeoffs (`html.parser`, lxml, html5lib), local-only BeautifulSoup code, selection vs extraction.
- l02: list page → detail page, join keys, duplicates, partial failures, complete/semi-complete/bad records.

Use `<Diagram type="crawl-pipeline" name="static" />` in l02.

- Add a short open-source reading box comparing the official Scrapy selectors/architecture concepts with the course's own standard-library extractor. Link to the docs/GitHub repository; do not copy implementation code.

- [ ] **Step 2: Write the P1 project lesson**

Include:

- scenario and non-goals;
- fixture description;
- architecture;
- file layout under `public/labs/web-crawling/project-01-static/`;
- starter interfaces;
- four milestones;
- acceptance tests;
- failure table;
- Definition of Done and rubric.

Do not embed a full solution in the lesson before the milestone section. Link to the lab folder and show only the interface needed to start.

- [ ] **Step 3: Write 31 exercises**

Totals: 8/10/13. The project lesson's 13 tasks are unit-level: URL resolution, field normalization, dedupe, missing values, stable output, report counts, not “build the whole project”.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c04
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 31 exercises, l03 difficulty 4 and content length at least 5000.

---

## Task 7: Project 1 Local Static Collector Assets

**Files:**
- Create: `public/labs/web-crawling/README.md`
- Create: `public/labs/web-crawling/requirements-web-crawling.txt`
- Create: `public/labs/web-crawling/common/README.md`
- Create: `public/labs/web-crawling/project-01-static/README.md`
- Create: `public/labs/web-crawling/project-01-static/starter.py`
- Create: `public/labs/web-crawling/project-01-static/solution.py`
- Create: `public/labs/web-crawling/project-01-static/fixtures/list.html`
- Create: `public/labs/web-crawling/project-01-static/fixtures/detail-01.html` … `detail-06.html`
- Create: `public/labs/web-crawling/project-01-static/expected/records.jsonl`
- Create: `public/labs/web-crawling/project-01-static/expected/report.json`
- Create: `public/labs/web-crawling/project-01-static/tests/test_project.py`

**Interfaces:**

`starter.py` and `solution.py` expose:

```python
def load_html(path: Path) -> str
def extract_links(list_html: str, base_url: str) -> list[str]
def parse_detail(html: str, source_url: str) -> dict | None
def normalize_record(record: dict) -> dict | None
def collect(fixture_dir: Path) -> tuple[list[dict], dict]
def write_outputs(records: list[dict], report: dict, out_dir: Path) -> None
```

Normalized record:

```python
{
    "sku": "B001",
    "title": "Python 数据清洗实战",
    "price_cents": 1299,
    "available": True,
    "source_url": "https://local.test/books/b001.html"
}
```

`price_cents` is `None` when unknown; never coerce missing to zero.

- [ ] **Step 1: Create deterministic fixtures**

Six detail pages, one duplicate card, one malformed/bad link, one missing price. Keep total assets below 100 KB.

- [ ] **Step 2: Write starter and solution**

Starter functions raise `NotImplementedError` with a short contract in the docstring. Solution is clearly marked “完成后再对照” in the README and must not be referenced by the starter.

- [ ] **Step 3: Write acceptance tests**

Use `unittest` and support:

```powershell
$env:CRAWL_TARGET='starter'; python -m unittest discover -s public/labs/web-crawling/project-01-static/tests -v
$env:CRAWL_TARGET='solution'; python -m unittest discover -s public/labs/web-crawling/project-01-static/tests -v
Remove-Item Env:CRAWL_TARGET
```

Tests assert exact records, stable order, skip reasons, JSONL/CSV round-trip, and no duplicate SKU. Starter run must fail in a clear assertion; solution run must pass.

- [ ] **Step 4: Document the lab**

README must include setup, commands, expected output, troubleshooting, and a statement that the project uses no live network.

- [ ] **Step 5: Verify**

```powershell
$env:CRAWL_TARGET='solution'; python -m unittest discover -s public/labs/web-crawling/project-01-static/tests -v
Remove-Item Env:CRAWL_TARGET
```

Expected: all tests pass.

---

## Task 8: Chapter 5 — 链接发现、URL 规范化与 Frontier

**Files:**
- Modify: `src/content/chapters/web-crawling/c05.ts`

**Interfaces:** Produce 3 fixed lesson IDs and 28 exercises.

- [ ] **Step 1: Write the three lessons**

- l01: `<a>`, `<base>`, `urljoin`, allowed schemes/hosts/paths, query canonicalization cautions.
- l02: deque BFS, `heapq` priority, queue item fields, visited set, 20-URL worked sequence.
- l03: spider traps, soft 404, tracking parameters, depth/page caps, Bloom filter false positives.

- [ ] **Step 2: Add visual anchors**

- l01 `<Diagram type="crawl-canonicalize" name="default" />`;
- l02 `<Diagram type="crawl-frontier" name="bfs" />`;
- l03 `<Diagram type="crawl-bloom" name="bloom" />`.

- [ ] **Step 3: Write 28 exercises**

Totals: 8/10/10. Include a canonicalization code task, queue-order code task, duplicate/valid-page rate calculation, trap identification, and Bloom false-positive reasoning.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c05
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 28 exercises and all diagram tags valid.

---

## Task 9: Chapter 6 — robots.txt、礼貌抓取与限速

**Files:**
- Modify: `src/content/chapters/web-crawling/c06.ts`

**Interfaces:** Produce 3 fixed lesson IDs and 28 exercises.

- [ ] **Step 1: Write the three lessons**

- l01: RFC 9309 matching, longest match, wildcard behavior, unknown groups, non-legal status.
- l02: per-host rate, concurrency, token bucket formula, burst capacity, virtual clock.
- l03: retry classification, exponential backoff with jitter, `Retry-After`, retry amplification, metrics.

Use explicit formulas and numeric worked examples in every lesson containing “风险/公式/统计” triggers.

- [ ] **Step 2: Add visual anchors**

- l01 `<Diagram type="crawl-robots" name="default" />`;
- l02 `<Diagram type="crawl-rate-limit" name="tokens" />`;
- l03 `<Diagram type="crawl-rate-limit" name="backoff" />`.

- [ ] **Step 3: Write 28 exercises**

Totals: 8/10/10. Include robots edge cases, a token-bucket calculation, a retry formula, a metric interpretation, and one “robots is not permission” analysis.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c06
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 28 exercises; Python code samples are standard-library only.

---

## Task 10: Chapter 7 — 单机爬虫架构与可恢复性

**Files:**
- Modify: `src/content/chapters/web-crawling/c07.ts`

**Interfaces:** Produce 3 fixed lesson IDs and 31 exercises. The project lesson links to P2 assets created in Task 11.

- [ ] **Step 1: Write l01 and l02**

- l01: pipeline stages, state machine, failure ownership, status transitions.
- l02: SQLite schema, transactions, UPSERT, checkpoints, at-least-once delivery, idempotent writes.

Use `<Diagram type="crawl-pipeline" name="api" />` and a concrete state table.

Include a Scrapy Engine/Scheduler/Downloader/Spider/Pipeline responsibility comparison, followed by a “what our minimal project deliberately omits” table.

- [ ] **Step 2: Write the P2 project lesson**

Describe cursor pagination, deterministic 503, `Retry-After`, checkpoint, idempotent SQLite writes, and resume. Use the file layout from the spec. Link to `public/labs/web-crawling/project-02-json/`.

- [ ] **Step 3: Write 31 exercises**

Totals: 8/10/13. Include a state-transition table question, a SQLite `UNIQUE`/UPSERT reasoning task, a checkpoint resume code task, an idempotency case, and an “after partial failure” diagnosis.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c07
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 31 exercises and project lesson at least 5000 characters.

---

## Task 11: Project 2 Paginated JSON/API Collector Assets

**Files:**
- Create: `public/labs/web-crawling/common/fake_transport.py`
- Create: `public/labs/web-crawling/common/fake_clock.py`
- Create: `public/labs/web-crawling/project-02-json/README.md`
- Create: `public/labs/web-crawling/project-02-json/starter.py`
- Create: `public/labs/web-crawling/project-02-json/solution.py`
- Create: `public/labs/web-crawling/project-02-json/fixtures/pages.json`
- Create: `public/labs/web-crawling/project-02-json/tests/test_project.py`

**Interfaces:**

The transport is injected so tests never sleep or access a socket:

```python
class Transport(Protocol):
    def get(self, url: str, headers: dict[str, str], timeout: float) -> Response: ...
```

Starter functions:

```python
def fetch_page(transport, cursor: str | None) -> dict
def decode_items(payload: dict) -> list[dict]
def upsert_items(db_path: Path, items: list[dict]) -> int
def save_checkpoint(db_path: Path, cursor: str | None, completed: int) -> None
def run(transport, db_path: Path, clock) -> dict
```

- [ ] **Step 1: Build fixtures**

Four pages, three records each; page 3 returns 503 once, then succeeds; one duplicate across pages; one malformed record. All values synthetic.

- [ ] **Step 2: Implement starter, solution, and tests**

Tests must cover:

- normal baseline;
- first-run failure and resume;
- idempotent second run;
- `Retry-After` respected through fake clock;
- no duplicate rows;
- bounded retries;
- request-count report.

Use `CRAWL_TARGET` as in P1.

- [ ] **Step 3: Add a local server variant**

Provide a standard-library static server option for learners who want to see HTTP semantics, but keep unittest on the injected transport so CI is deterministic.

- [ ] **Step 4: Verify**

```powershell
$env:CRAWL_TARGET='solution'; python -m unittest discover -s public/labs/web-crawling/project-02-json/tests -v
Remove-Item Env:CRAWL_TARGET
```

Expected: all tests pass, including recovery and idempotency.

---

## Task 12: Chapter 8 — JavaScript 渲染页面

**Files:**
- Modify: `src/content/chapters/web-crawling/c08.ts`

**Interfaces:** Produce 3 fixed lesson IDs and 31 exercises. The project lesson links to P3 assets created in Task 13.

- [ ] **Step 1: Write l01 and l02**

- l01: view-source vs DOM, SSR/CSR, fetch/XHR, API-first decision, rendering costs.
- l02: Playwright locators, auto-waiting, `expect`, lazy loading, finite infinite-scroll, no fixed sleeps.

Playwright code is explanatory only and must carry the local-only label.

Add a Playwright official-docs reading check: learners identify the locator, auto-waiting and timeout concepts, then explain why `time.sleep` is not a synchronization primitive.

- [ ] **Step 2: Write the P3 project lesson**

Describe the deterministic dynamic fixture, three batches, DOM markers, timeout diagnosis, stopping conditions and offline acceptance. Link to `public/labs/web-crawling/project-03-dynamic/`.

- [ ] **Step 3: Add visual anchors**

- l01 `<Diagram type="crawl-render-timeline" name="ssr" />`;
- l02 `<Diagram type="crawl-render-timeline" name="playwright" />`;
- l03 `<Diagram type="crawl-render-timeline" name="csr" />` plus project acceptance table.

- [ ] **Step 4: Write 31 exercises**

Totals: 8/10/13. Include a wait-condition selection task, a no-sleep debugging task, a scroll termination calculation, an API-first decision, and an anti-fragile locator review. Do not make Playwright code station-graded.

- [ ] **Step 5: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c08
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: no executable field imports Playwright; project content is marked local-only.

---

## Task 13: Project 3 Dynamic Page Collector Assets

**Files:**
- Create: `public/labs/web-crawling/project-03-dynamic/README.md`
- Create: `public/labs/web-crawling/project-03-dynamic/starter.py`
- Create: `public/labs/web-crawling/project-03-dynamic/solution.py`
- Create: `public/labs/web-crawling/project-03-dynamic/fixture_server.py`
- Create: `public/labs/web-crawling/project-03-dynamic/page.html`
- Create: `public/labs/web-crawling/project-03-dynamic/app.js`
- Create: `public/labs/web-crawling/project-03-dynamic/tests/test_fixture.py`
- Create: `public/labs/web-crawling/project-03-dynamic/tests/smoke_fixture.mjs`

**Interfaces:**

`starter.py` and `solution.py` expose:

```python
def collect_dynamic(url: str, timeout_ms: int = 5000) -> list[dict]
```

Fixture DOM markers:

```html
<main data-app-state="ready">
  <article data-batch="1" data-item-id="D001">…</article>
```

- [ ] **Step 1: Build the deterministic dynamic fixture**

- initial shell present immediately;
- 300 ms deterministic delay before batch 1;
- finite scroll adds batches 2 and 3;
- markers expose batch completion;
- no external fonts, images, APIs or analytics.

- [ ] **Step 2: Implement starter and solution**

Solution uses Playwright Python locators and waits for the third batch marker; it must not contain `time.sleep`. It stops after stable item count and raises a focused timeout error if batch 3 never arrives.

- [ ] **Step 3: Add tests**

`test_fixture.py` uses standard library HTTP to assert the server and shell load. `smoke_fixture.mjs` uses the repository's `playwright-core` to assert batch 1, 2 and 3 markers appear with the fixture's local URL.

Python Playwright acceptance remains local-only and is skipped with a clear message if the learner has not installed the optional requirements.

- [ ] **Step 4: Document**

README includes:

```powershell
python public/labs/web-crawling/project-03-dynamic/fixture_server.py --port 18080
python public/labs/web-crawling/project-03-dynamic/solution.py http://127.0.0.1:18080/
node public/labs/web-crawling/project-03-dynamic/tests/smoke_fixture.mjs
```

- [ ] **Step 5: Verify**

Run the fixture server in one terminal and:

```powershell
python -m unittest discover -s public/labs/web-crawling/project-03-dynamic/tests -v
node public/labs/web-crawling/project-03-dynamic/tests/smoke_fixture.mjs
```

Expected: fixture HTTP test and browser marker smoke test pass. Stop the server afterward.

---

## Task 14: Chapter 9 — 数据质量、存储与模式

**Files:**
- Modify: `src/content/chapters/web-crawling/c09.ts`

**Interfaces:** Produce 3 fixed lesson IDs and 26 exercises.

- [ ] **Step 1: Write the three lessons**

- l01: dataclass contracts, nullability, units, timezone, unknown-vs-empty, JSON Schema concept.
- l02: JSONL/CSV/SQLite, atomic writes, quoting, provenance fields, exact/business-key/near duplicates.
- l03: completeness/validity/uniqueness/timeliness/consistency/traceability; privacy minimization.

Use explicit formulas and a 100-record worked calculation for quality rates.

- [ ] **Step 2: Add visual anchors**

- l01 a field-contract matrix;
- l02 a storage/lineage comparison table;
- l03 a quality-dashboard table with calculated values.

- [ ] **Step 3: Write 26 exercises**

Totals: 8/8/10. Include a dataclass validation code task, JSONL writing task, duplicate-rate calculation, missing vs empty discrimination, and PII retention case.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c09
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 26 exercises; every formula-trigger lesson has visible math.

---

## Task 15: Chapter 10 — 增量采集与变更检测

**Files:**
- Modify: `src/content/chapters/web-crawling/c10.ts`

**Interfaces:** Produce 3 fixed lesson IDs and 28 exercises.

- [ ] **Step 1: Write the three lessons**

- l01: conditional requests, ETag/Last-Modified, 304, validator failure modes.
- l02: SHA-256 exact duplicate, shingling, 64-bit SimHash, Hamming distance, threshold tradeoffs.
- l03: recrawl budget, change frequency, 404/410, tombstones, version summaries, extractor version.

Every formula/risk-triggered lesson includes a worked calculation.

- [ ] **Step 2: Add visual anchors**

- l01 `<Diagram type="crawl-recrawl" name="default" />`;
- l02 `<Diagram type="crawl-bloom" name="simhash" />`;
- l03 a state table plus a version/tombstone flow table.

- [ ] **Step 3: Write 28 exercises**

Totals: 8/10/10. Include a conditional-request code task, SimHash bit calculation, deletion classification, recrawl-priority calculation, and a “304 is not proof of no change” analysis.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c10
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 28 exercises and all math triggers satisfied.

---

## Task 16: Chapter 11 — 分布式采集、监控与档案

**Files:**
- Modify: `src/content/chapters/web-crawling/c11.ts`

**Interfaces:** Produce 3 fixed lesson IDs and 33 exercises. The project lesson links to P4 assets created in Task 17.

- [ ] **Step 1: Write l01 and l02**

- l01: central queue, host sharding, leases, backpressure, throughput/duplicate-work calculation.
- l02: centralized dedupe, Redis/database/Bloom semantics, per-host token buckets, lease recovery, dead letters, metrics.

Use `<Diagram type="crawl-distributed" name="overview" />` and `<Diagram type="crawl-distributed" name="failure" />`.

Add a Crawlee request-queue/storage reading comparison and a table contrasting its production abstractions with this course's SQLite checkpoint model.

- [ ] **Step 2: Write the P4 project lesson**

Describe 3 local origins, robots, allowed paths, per-origin rate, 429, 503, dedupe, persistence, metrics and recovery evidence. Link to `public/labs/web-crawling/project-04-focused/`.

- [ ] **Step 3: Write 33 exercises**

Totals: 10/10/13. Include a worker-crash case, duplicate-work calculation, lease-timeout task, per-host limiter task, metrics interpretation, and a scope-violation case.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c11
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 33 exercises and project lesson at least 5000 characters.

---

## Task 17: Project 4 Polite Focused Crawler Assets

**Files:**
- Create: `public/labs/web-crawling/project-04-focused/README.md`
- Create: `public/labs/web-crawling/project-04-focused/starter.py`
- Create: `public/labs/web-crawling/project-04-focused/solution.py`
- Create: `public/labs/web-crawling/project-04-focused/fixture_server.py`
- Create: `public/labs/web-crawling/project-04-focused/fixtures/robots.txt`
- Create: `public/labs/web-crawling/project-04-focused/fixtures/pages.json`
- Create: `public/labs/web-crawling/project-04-focused/tests/test_project.py`

**Interfaces:**

```python
def canonicalize(url: str, base_url: str) -> str | None
def allowed_by_robots(robots_text: str, url: str, user_agent: str) -> bool
def run(transport, clock, config: dict, db_path: Path) -> dict
```

Required report keys:

```text
requests, fetched, parsed, skipped, duplicates,
robots_denied, retries, dead_letter, per_host_requests
```

- [ ] **Step 1: Build the local fixture**

Three origins on ports 18081–18083, each with robots and in-scope paths. Include out-of-scope URLs, duplicate URLs, one 429, one 503 and one permanently failing page.

- [ ] **Step 2: Implement starter and solution**

Use an injected transport and fake clock. Do not call real hosts. Persist raw records and a checkpoint in SQLite; write a JSONL audit log.

- [ ] **Step 3: Write acceptance tests**

Assert:

- robots-denied and out-of-origin URLs are never sent;
- per-origin intervals satisfy the configured rate;
- retries stop at the configured limit;
- restart does not duplicate completed records;
- metrics come from the transport event log;
- dead-letter contains only the permanent failure.

- [ ] **Step 4: Verify**

```powershell
$env:CRAWL_TARGET='solution'; python -m unittest discover -s public/labs/web-crawling/project-04-focused/tests -v
Remove-Item Env:CRAWL_TARGET
```

Expected: all acceptance tests pass.

---

## Task 18: Chapter 12 — 合规、安全与毕业项目

**Files:**
- Modify: `src/content/chapters/web-crawling/c12.ts`

**Interfaces:** Produce 3 fixed lesson IDs and 33 exercises. The project lesson links to P5 assets created in Task 19.

- [ ] **Step 1: Write l01 and l02**

- l01: compliance decision tree, purpose limitation, minimization, retention, redistribution, “not legal advice”.
- l02: SSRF allow/deny, private/loopback/link-local blocks, redirects rechecked, DNS rebinding, size/decompression limits, malicious HTML, log redaction.

Use `<Diagram type="crawl-compliance" name="consent" />` and `<Diagram type="crawl-compliance" name="ssrf" />`. Include numeric budget formulas for response size, redirects and decompression ratio.

- [ ] **Step 2: Write the P5 project lesson**

Describe T1/T2/T3 snapshots, ETag/Last-Modified, content hashes, schema validation, changes, tombstones, recrawl policy, monitoring report, DoD, rubric and five-minute presentation. Link to `public/labs/web-crawling/project-05-incremental/`.

- [ ] **Step 3: Write 33 exercises**

Totals: 10/10/13. Include an SSRF triage case, redirect revalidation, decompression-bomb calculation, PII minimization, change/deletion classification, and capstone evidence review. Do not provide executable bypass techniques.

- [ ] **Step 4: Verify**

```powershell
node scripts/check-web-crawling.mjs --chapter c12
pnpm run typecheck
pnpm run sync:web-crawling
```

Expected: 33 exercises and project lesson at least 5000 characters.

---

## Task 19: Project 5 Incremental Capstone Assets

**Files:**
- Create: `public/labs/web-crawling/project-05-incremental/README.md`
- Create: `public/labs/web-crawling/project-05-incremental/starter.py`
- Create: `public/labs/web-crawling/project-05-incremental/solution.py`
- Create: `public/labs/web-crawling/project-05-incremental/fixtures/snapshots.json`
- Create: `public/labs/web-crawling/project-05-incremental/tests/test_project.py`

**Interfaces:**

```python
def normalize_text(html: str) -> str
def sha256_text(text: str) -> str
def simhash64(text: str) -> int
def hamming_distance(a: int, b: int) -> int
def upsert_version(db_path: Path, record: dict) -> str
def compare_snapshots(previous: list[dict], current: list[dict]) -> dict
def run(transport, db_path: Path, snapshot_id: str) -> dict
```

Report keys:

```text
new, changed, unchanged, near_duplicate, deleted, invalid,
conditional_hits, requests, retries, versions_written
```

- [ ] **Step 1: Build three synthetic snapshots**

Include:

- page unchanged with 304;
- page changed with a new ETag;
- page changed without validators;
- one near duplicate below the Hamming threshold;
- one deleted page (404);
- one gone page (410);
- one schema-invalid record.

- [ ] **Step 2: Implement starter, solution and tests**

Tests must assert T2 and T3 classifications, tombstone preservation, idempotent rerun, no duplicate versions, and report counts. Use artificial time and injected transport.

- [ ] **Step 3: Document the capstone**

README includes architecture, run commands, expected report, design-question prompts, troubleshooting table and a presentation checklist.

- [ ] **Step 4: Verify**

```powershell
$env:CRAWL_TARGET='solution'; python -m unittest discover -s public/labs/web-crawling/project-05-incremental/tests -v
Remove-Item Env:CRAWL_TARGET
```

Expected: all tests pass and T2/T3 reports contain exact expected counts.

---

## Task 20: Source, License, and Originality Audit

**Files:**
- Create: `qa/web-crawling-source-audit.md`

**Interfaces:** No code interface; produces a reviewable evidence table.

- [ ] **Step 1: Re-check every source**

Use GET, not HEAD-only, for each spec source. Record:

- final URL;
- access date;
- title and publisher;
- version/standard status;
- license or copyright status;
- chapter where used;
- whether any code was copied (must be “否”).

Do not misreport bot-blocked DOI pages as dead; record the redirect/verification path.

- [ ] **Step 2: Re-check open-source licenses**

Verify repository license and current project status for Scrapy, Playwright, Crawlee, Beautiful Soup and lxml. Confirm no third-party implementation code was copied into the course.

- [ ] **Step 3: Check fixture privacy**

Search `public/labs/web-crawling` for emails, phone numbers, tokens, cookies, authorization headers and realistic personal names. All must be clearly synthetic. Remove any accidental secret.

- [ ] **Step 4: Check legal wording**

Confirm every robots/legal/privacy page states:

- robots is not legal authorization;
- public visibility is not unlimited permission;
- the course is not legal advice;
- examples use synthetic data;
- no bypass techniques are present.

- [ ] **Step 5: Record findings**

Write the audit report with a clear PASS/FAIL per source and a list of remediations. Any unverified source must be replaced or marked as a supplementary link, not a primary anchor.

---

## Task 21: Full-Course Validation and Browser QA

**Files:**
- Create: `scripts/e2e-web-crawling.mjs`
- Modify: `package.json`
- Modify: `scripts/check_tpl.py`

**Interfaces:**

Add:

```json
"test:web-crawling": "node scripts/e2e-web-crawling.mjs"
```

`scripts/check_tpl.py` accepts optional paths while preserving its existing default:

```text
python scripts/check_tpl.py
python scripts/check_tpl.py src/content/chapters/web-crawling/c01.ts ...
```

- [ ] **Step 1: Generalize the backtick checker**

Use `argparse` or `sys.argv[1:]`; default to the previous `quant-math.ts` file when no args are supplied. Scan each supplied file and report file name, line and offending text.

- [ ] **Step 2: Write the browser E2E script**

The script must:

1. Open `/course/web-crawling`.
2. Assert the course title, 12 `.chapter-card` elements and 349 total exercises in visible text.
3. Navigate all 12 chapter routes.
4. For each chapter assert 3 `.lesson-section-card` elements.
5. Assert each chapter has at least 1 `.diagram-block` and 0 `.diagram-missing`.
6. Assert each lesson section contains either a `.diagram-block` or a Markdown-rendered table.
7. Assert each `.lesson-body` contains the 14 heading strings.
8. Assert at least one code or demo block per lesson.
9. Assert no horizontal page overflow at 1440px.
10. Spot-check one long chapter at 390px for no full-page horizontal overflow.
11. Collect `pageerror` and console errors; fail on any.
12. Save screenshots to `qa/91-web-crawling-course.png`, `qa/92-web-crawling-chapter.png`, `qa/93-web-crawling-mobile.png`.

- [ ] **Step 3: Run static and content validation**

```powershell
pnpm run typecheck
pnpm run check:web-crawling
pnpm run audit
pnpm run sync:web-crawling
pnpm run build
node scripts/depth-audit.mjs
python scripts/check_tpl.py src/content/chapters/web-crawling/c01.ts src/content/chapters/web-crawling/c02.ts src/content/chapters/web-crawling/c03.ts src/content/chapters/web-crawling/c04.ts src/content/chapters/web-crawling/c05.ts src/content/chapters/web-crawling/c06.ts src/content/chapters/web-crawling/c07.ts src/content/chapters/web-crawling/c08.ts src/content/chapters/web-crawling/c09.ts src/content/chapters/web-crawling/c10.ts src/content/chapters/web-crawling/c11.ts src/content/chapters/web-crawling/c12.ts
```

Expected:

- 12 chapters.
- 36 lessons.
- 349 exercises.
- 0 invalid content.
- Every web-crawling lesson grades A in `qa/depth-audit-report.md`.
- 0 backtick-boundary errors.

- [ ] **Step 4: Verify every runnable code exercise**

Start the app/API and run:

```powershell
pnpm run verify:course web-crawling
```

Expected:

- 0 failed reference solutions.
- Skipped count must be 0 for this course; every code exercise has a complete answer.

If any exercise fails, fix the exercise, test or answer; do not weaken the test to hide the failure.

- [ ] **Step 5: Run browser suites**

With the server running:

```powershell
pnpm run test:nav
pnpm run test:web-crawling
pnpm run test:platform
```

Expected: all checks pass. The crawling group is visible, the course page renders 12 chapters, and all diagrams render.

- [ ] **Step 6: Verify generated data and change hygiene**

```powershell
pnpm run sync:web-crawling
$bytes = (Get-ChildItem 'public/labs/web-crawling' -Recurse -File | Measure-Object Length -Sum).Sum
"$([math]::Round($bytes / 1MB, 2)) MB"
git status --short
git diff --check
```

Expected:

- `content-data/courses/web-crawling.json` is the only generated course payload.
- `public/labs/web-crawling` is below 2 MB total.
- No unrelated source files changed.
- No whitespace errors.
- Do not commit.

- [ ] **Step 7: Final manual review**

Read/review:

- Chapter 1 as the teaching-quality benchmark;
- Chapter 6 l02 for token-bucket math;
- Chapter 10 l02 for SimHash math;
- Chapter 12 l02 for security boundaries;
- P1, P2, P4 and P5 acceptance reports;
- source audit report.

Record any remaining issue in the final handoff. A task with a known accuracy, licensing, privacy or browser-rendering defect is not complete.

---

## Task Dependencies

- Task 1 must finish before any browser navigation check.
- Task 2 must finish before Chapter 1's diagrams can render.
- Task 3 creates the chapter checker used by Tasks 4–18.
- Task 6 links to Task 7's assets; Task 7 must finish before final project acceptance.
- Task 10 links to Task 11; Task 12 links to Task 13; Task 16 links to Task 17; Task 18 links to Task 19.
- Tasks 4–18 may be parallelized only after the Chapter 1 benchmark passes; shared files must not be edited concurrently.
- Task 20 and Task 21 must use the completed Chapter 1–12 and all lab assets.

## Self-Review

### Spec coverage

- Course/domain metadata and navigation: Task 1.
- 12 chapters, 36 lessons, 349 exercises: Tasks 3–18 and Task 21.
- Five projects: Tasks 6–7, 10–11, 12–13, 16–17, 18–19.
- Twelve diagrams and registration: Task 2 plus content tasks and Task 21.
- Source/license/originality: Task 20, with source references written into each lesson.
- Platform constraints, offline demos, third-party labels: Global Constraints, Task 3 checker, Task 21.
- Definition of Done and browser QA: Task 21.

### Test coverage

- Exercise counts and valid answers: Task 3 checker; every chapter task invokes it.
- Diagram registration: shared kind registry in Task 2; content checker in Task 3; browser check in Task 21.
- Offline executable code: Task 3 scanner; `verify:course` in Task 21.
- Navigation: Task 1 `test:nav`; Task 21 full suite.
- Recovery and idempotency: P2/P4/P5 unit tests and P1/P3 acceptance tests.
- Source/licensing: Task 20.

### Type and naming consistency

- `webCrawlingChapters` is the single chapter aggregator.
- `webCrawlingCourse` is the single course export.
- `WEB_CRAWLING_DIAGRAMS`, `WEB_CRAWLING_DIAGRAM_KINDS` and `WebCrawlingDiagramKind` are the single diagram registry.
- All lesson IDs, exercise IDs and project folder names match the design.
- No task assumes a SQL exercise or a real-network station demo.

### Proportion check

The plan is a production and review plan, not a transcript of lesson prose. The actual lessons, exercises, diagrams and lab code are produced in Tasks 3–19; this document fixes their counts, interfaces, failure tests and handoff gates.
