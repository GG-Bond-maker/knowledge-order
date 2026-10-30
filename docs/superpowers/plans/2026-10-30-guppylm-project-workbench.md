# GuppyLM Project Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a detailed, approachable `/project/guppylm` workbench with eight task-based lessons, explanatory diagrams, persistent acceptance progress, and a verified A1 course entry.

**Architecture:** Add one content module for all task copy and evidence, one page for task navigation and progress, one focused diagram component module for native SVG/CSS explanations, and one page-level stylesheet. Reuse the existing app shell, route structure, localStorage patterns, and visual tokens; do not add a charting dependency or embed the ONNX model.

**Tech Stack:** React 18, TypeScript, React Router 6, CSS, inline SVG, Playwright Core, Vite, pnpm, existing Python virtual environment for GuppyLM source verification.

**Spec:** `docs/superpowers/specs/2026-10-30-guppylm-project-workbench-design.md`

## Global Constraints

- The page route is exactly `/project/guppylm`.
- The task query parameter is `?task=1` through `?task=8`.
- The progress key is exactly `knowledge-order:guppylm-project:v1`.
- Every task must render sections for 原理、源码、实验、思考、拓展、验收.
- Every task must include a relevant visual; diagrams must be accessible SVG or an accessible labeled figure.
- Do not embed `docs/model.onnx`; link the official browser demo and model sources.
- Preserve the known facts: 8,726,016 parameters; 57,000 train / 3,000 test; 2,320 overlapping test pairs; 77.3%; 4,096 configured vocabulary; 2,418 actual tokenizer entries.
- Do not invent a training curve. The learning-rate chart is computed from the repository's configured schedule.
- Do not claim quantized ONNX is lossless or that the page reproduces 10,000 training steps.
- Do not create commits; the worktree already contains unrelated user changes.
- Do not revert or rewrite unrelated files, including the pre-existing literal `n` text node in `src/App.tsx`; remove only that stray node when touching the route block if it remains present.

## Review Focus

- Direct navigation to `/project/guppylm?task=7` must render task 7 without first visiting another task.
- Switching tasks must update the query string, move focus to the new title, and preserve acceptance progress.
- A phone-width viewport must not produce page-level horizontal overflow; wide diagrams and code may scroll locally.
- All eight task visuals must remain understandable without color alone, with accessible names and visible labels.
- The GuppyLM source snippets used by the page must be backed by runnable Python checks for tokenizer, model shape, parameter count, and ONNX availability.

---

### Task 1: Add the failing browser contract test

**Files:**
- Create: `scripts/e2e-guppylm-project.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: the future route `/project/guppylm`, the selectors below, and the existing Chrome executable path.
- Produces: `pnpm test:guppylm`, which exits `0` only when the page contract passes.

- [ ] **Step 1: Write the failing test**

Create `scripts/e2e-guppylm-project.mjs` with these checks:

```js
const taskTitles = [
  '认识项目',
  '理解训练数据',
  '训练分词器',
  '阅读 Transformer',
  '理解训练过程',
  '运行模型推理',
  '导出并部署模型',
  '完成拓展实验',
];

// After page.goto(`${base}/project/guppylm`):
// - `.guppy-project` exists
// - `.guppy-task-nav button` count is 8
// - every task title appears in the navigation
// - `.guppy-task-title` is 认识项目
// - clicking task 2 updates the URL to task=2 and shows 77.3% and 2,320
// - clicking task 3 shows 2,418 and the tokenizer diagram
// - task 4 shows a Transformer diagram
// - task 5 shows a learning-rate figure
// - task 6 shows a sampling result matrix
// - task 7 shows the deployment chain
// - task 8 shows the experiment design panel
// - each task has `.guppy-section` labels for 原理, 源码, 实验, 思考, 拓展, 验收
// - checking the first acceptance box, reloading, and reopening task 2 preserves checked state
// - `/course/llm-a1` contains a link to `/project/guppylm`
// - no page errors occur
// - at 390px viewport, document.scrollWidth <= viewport width + 1
// - all visible `svg[role="img"]` have `aria-labelledby` and a `<title>`
```

Use `data-testid` hooks on the page:

- `guppy-project`
- `guppy-task-nav`
- `guppy-task-title`
- `guppy-progress`
- `guppy-visual`
- `guppy-section-principle`
- `guppy-section-source`
- `guppy-section-experiment`
- `guppy-section-thinking`
- `guppy-section-extension`
- `guppy-section-acceptance`
- `guppy-acceptance-2-1`

Add to `package.json`:

```json
"test:guppylm": "node scripts/e2e-guppylm-project.mjs"
```

- [ ] **Step 2: Run the test to verify it fails**

Start the existing Vite dev server on port `5175`, then run:

```powershell
pnpm test:guppylm http://127.0.0.1:5175
```

Expected: FAIL because `.guppy-project` and the route do not exist.

- [ ] **Step 3: Keep the test unchanged**

Do not weaken the assertions to match a 404 page. The red result is the contract for the implementation.

---

### Task 2: Add the typed task content and verified evidence

**Files:**
- Create: `src/content/projects/guppylm.ts`

**Interfaces:**
- Produces:

```ts
export type GuppyTaskId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
export type GuppyVisualKind =
  | 'pipeline'
  | 'data-leak'
  | 'tokenizer'
  | 'transformer'
  | 'schedule'
  | 'sampling'
  | 'deployment'
  | 'experiment';

export interface GuppyCodeSource {
  path: string;
  url: string;
  code: string;
  note: string;
}

export interface GuppyExperiment {
  title: string;
  command: string;
  result: string;
  observation: string;
}

export interface GuppyQuestion {
  question: string;
  hint: string;
  answer: string;
}

export interface GuppyAcceptanceItem {
  id: string;
  label: string;
  evidence: string;
}

export interface GuppyTask {
  id: GuppyTaskId;
  slug: string;
  title: string;
  eyebrow: string;
  summary: string;
  duration: string;
  level: string;
  visual: GuppyVisualKind;
  principles: Array<{ title: string; body: string; takeaway: string }>;
  sources: GuppyCodeSource[];
  experiments: GuppyExperiment[];
  questions: GuppyQuestion[];
  extensions: string[];
  acceptance: GuppyAcceptanceItem[];
}

export const GUPPY_REPO_URL: string;
export const GUPPY_DEMO_URL: string;
export const GUPPY_COMMIT: string;
export const GUPPY_TASKS: GuppyTask[];
```

- [ ] **Step 1: Add task 1 content**

Write “认识项目” with:

- the end-to-end data flow;
- the role of `guppylm/`, `tools/`, `docs/`, and notebooks;
- the environment command and the `(2, 32) → (2, 32, 4096)` forward check;
- the 8,726,016 parameter result;
- a code source for `guppylm/config.py`;
- acceptance evidence for directory, shape, and parameter count.

- [ ] **Step 2: Add task 2 content**

Write “理解训练数据” with:

- the `input/output/category` schema;
- train/test responsibility;
- the exact-overlap method;
- 57,000 train, 3,000 test, 2,320 overlapping pairs, 77.3%;
- the three measured losses/PPLs;
- an explicit “名义测试集 ≠ 真正未见样本” warning;
- a code source for `generate_data.py`, `prepare_data.py`, and `dataset.py`.

- [ ] **Step 3: Add task 3 content**

Write “训练分词器” with:

- BPE merge intuition;
- `hi guppy` → `[779, 278]`;
- `['hi', 'Ġguppy']`;
- 4,096 configured rows vs 2,418 actual vocabulary entries;
- 2,352 merges;
- special token IDs 0/1/2;
- a code source for `prepare_data.py` and `dataset.py`.

- [ ] **Step 4: Add task 4 content**

Write “阅读 Transformer” with:

- token embedding and learned positional embedding;
- six heads, six layers, width 384, FFN 768;
- Q/K/V, causal mask, residual, LayerNorm, FFN, tied weights;
- 1,183,872 parameters per block and 7,103,232 across six blocks;
- a code source for `guppylm/model.py`.

- [ ] **Step 5: Add task 5 content**

Write “理解训练过程” with:

- the next-token x/y shift;
- cross entropy and PPL;
- AdamW betas `(0.9, 0.95)`, weight decay `0.1`, gradient clip `1.0`;
- batch 32, LR `3e-4`, min LR `3e-5`, warmup 200, total 10,000;
- the actual LR observations at steps 0, 100, 200, 1,000, 5,000, 9,999;
- a code source for `dataset.py`, `model.py`, and `train.py`.

- [ ] **Step 6: Add task 6 content**

Write “运行模型推理” with:

- autoregressive sampling;
- temperature scaling and top-k filtering;
- the nine fixed-seed result rows from the spec;
- the note that outputs are examples, not a guarantee;
- a code source for `model.py::generate` and `inference.py`.

- [ ] **Step 7: Add task 7 content**

Write “导出并部署模型” with:

- PyTorch → ONNX → QUInt8 dynamic quantization → ONNX Runtime Web/WASM;
- opset 17, dynamic batch/sequence axes;
- `model.onnx` 10,469,869 bytes and SHA256 `96DD79D233662B65BC0FAE1773821479551D1C1257CA5BBD12FA3E6623AE4835`;
- `onnxruntime-web 1.21.0`;
- a code source for `tools/export_onnx.py` and `docs/index.html`;
- a caution that quantization can change output.

- [ ] **Step 8: Add task 8 content**

Write “完成拓展实验” with:

- one-variable experiment rules;
- the parameter table for baseline, 3/8 layers, width 256, sequence 64/256, and 3 layers + sequence 64;
- data and sequence-length extension choices;
- acceptance requiring hypothesis, control, metric, command, result, and limitation.

- [ ] **Step 9: Add content-level guard tests**

In `scripts/e2e-guppylm-project.mjs`, assert that:

- `GUPPY_TASKS.length === 8`;
- each task has at least one principle, source, experiment, question, extension, and acceptance item;
- task 2 includes `77.3` and `2,320`;
- task 3 includes `2,418` and `4,096`;
- task 7 includes `10,469,869` and `96DD79D233662B65BC0FAE1773821479551D1C1257CA5BBD12FA3E6623AE4835`.

Because this is a TypeScript module, use the rendered page for browser assertions and keep the data module's types explicit.

- [ ] **Step 10: Run typecheck**

```powershell
pnpm typecheck
```

Expected: PASS with no TypeScript errors.

---

### Task 3: Add the task-focused page shell and progress behavior

**Files:**
- Create: `src/pages/GuppyProjectPage.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `GUPPY_TASKS`, `GuppyTask`, `GuppyTaskId`, and the visual components from Task 4.
- Produces: `export function GuppyProjectPage(): JSX.Element` at route `/project/guppylm`.

- [ ] **Step 1: Implement route and direct-load behavior**

Import the page in `src/App.tsx` and add:

```tsx
<Route path="/project/guppylm" element={<GuppyProjectPage />} />
```

If the existing stray `n` text node remains between the learning-map routes, remove only that text node as part of this route edit.

- [ ] **Step 2: Implement task state**

Use `useSearchParams()`:

- parse `task`;
- accept only 1–8;
- default to 1;
- write `task=N` on navigation;
- use `replace: true` so task switching does not spam browser history;
- focus the task heading after a switch with a `useEffect`.

- [ ] **Step 3: Implement persistent acceptance state**

Create a local hook in the page file:

```ts
function useGuppyProgress() {
  // Reads/writes knowledge-order:guppylm-project:v1.
  // Returns checked ids, toggle(id), completedTaskCount, and totalChecked.
}
```

The stored shape is:

```ts
Record<string, boolean>
```

Keys are acceptance item IDs such as `2-1`. Guard malformed JSON and unavailable localStorage.

- [ ] **Step 4: Render the page shell**

Render:

- project cover with A1 course label, 8-task label, 8.73M parameter metric, 128 context metric, source/demo links, and the leakage warning;
- a sticky task navigation with all eight titles and completion markers;
- one active task at a time;
- a footer with previous/next task controls;
- the task title, duration, level, and summary;
- six `.guppy-section` blocks with the required `data-testid` values;
- acceptance checkboxes with `data-testid="guppy-acceptance-${taskId}-${index + 1}"`;
- overall progress text with `data-testid="guppy-progress"`.

- [ ] **Step 5: Render source, experiment, and question content**

- Source cards show the repository path, fixed-commit URL, code, and behavior note.
- Experiment cards show the command, observed result, and what to look for.
- Questions use `<details>` with a hint and answer; the question remains visible before expansion.
- Extensions render as short numbered challenges.
- Acceptance items show label and evidence.

- [ ] **Step 6: Add copy behavior**

Each code block gets a copy button:

- uses `navigator.clipboard.writeText`;
- changes label to “已复制” for 1.5 seconds;
- falls back to a temporary textarea when clipboard access fails;
- has an `aria-live="polite"` status.

- [ ] **Step 7: Run the focused test**

```powershell
pnpm test:guppylm http://127.0.0.1:5175
```

Expected: the route, eight-task navigation, query switching, content sections, and acceptance persistence checks pass. Visual-specific checks may still fail until Task 4.

---

### Task 4: Add the eight explanatory visuals and responsive styling

**Files:**
- Create: `src/components/guppylm/GuppyDiagrams.tsx`
- Create: `src/pages/guppy-project.css`
- Modify: `src/pages/GuppyProjectPage.tsx`

**Interfaces:**
- Consumes: `GuppyVisualKind`.
- Produces: `export function GuppyVisual({ kind }: { kind: GuppyVisualKind })`.

Visual types:

1. `pipeline`: architecture/data-flow diagram with `text → tokenizer → model → training → generation → ONNX → browser`.
2. `data-leak`: train/test overlap bar and the three PPL values.
3. `tokenizer`: selectable sample chips showing text, BPE pieces, and IDs.
4. `transformer`: six-block layer stack with an expanded block showing attention → residual → FFN → residual.
5. `schedule`: SVG line chart of the real warmup/cosine learning-rate observations.
6. `sampling`: prompt × temperature/top-k result matrix with an observation note.
7. `deployment`: PyTorch → ONNX → QUInt8 → WASM chain with artifact sizes.
8. `experiment`: parameter-count comparison bars and a one-variable experiment checklist.

- [ ] **Step 1: Implement accessible diagrams**

For every SVG:

- add `role="img"`;
- add `aria-labelledby` pointing to unique `<title>` and `<desc>` IDs;
- put `<title>` first;
- use visible text labels, not color-only meaning;
- keep labels outside connector strokes;
- put wide diagrams in a local `overflow-x: auto` wrapper.

- [ ] **Step 2: Implement interactive tokenizer and experiment visuals**

- Tokenizer presets: `hi guppy`, a full ChatML prompt, and a rare word.
- Buttons update the displayed pieces and IDs.
- Experiment visual lets the learner choose baseline, 3 layers, 8 layers, width 256, sequence 64, or sequence 256 and shows the corresponding parameter count.
- No chart library is needed.

- [ ] **Step 3: Implement the page visual system**

Use the existing site tokens plus a local “Guppy Lab” layer:

- teal/peacock accent `#0f766e`;
- coral focal accent `#f9735b`;
- warm paper background `#fbfaf6`;
- ink `#17313a`;
- serif display fallback for project headings;
- subtle grid/bubble background;
- no heavy shadows, no purple-on-white, no dark-mode switch.

- [ ] **Step 4: Implement responsive behavior**

- Desktop: 280px sticky task rail + flexible work area.
- Tablet: navigation becomes a horizontal scroll strip.
- Mobile: single column, stacked sections, local scrolling for tables and SVG.
- Add `@media (prefers-reduced-motion: reduce)` to disable transitions and entry animations.

- [ ] **Step 5: Verify browser visuals**

Run:

```powershell
pnpm test:guppylm http://127.0.0.1:5175
```

Then take screenshots at:

- `qa/guppylm-desktop-task1.png`
- `qa/guppylm-desktop-task2.png`
- `qa/guppylm-desktop-task4.png`
- `qa/guppylm-mobile-task1.png`
- `qa/guppylm-mobile-task2.png`

Expected: all contract checks pass and no page-level horizontal overflow.

---

### Task 5: Add the A1 core-project entry

**Files:**
- Modify: `src/pages/CoursePage.tsx`
- Reuse: `src/pages/guppy-project.css`

**Interfaces:**
- Consumes: the existing `course.id` value.
- Produces: a visible `llm-a1` only link to `/project/guppylm`.

- [ ] **Step 1: Add the entry card**

When `course.id === 'llm-a1'`, render a compact project strip above the chapter list:

- eyebrow: “核心综合项目”
- title: “GuppyLM：把 8.7M 参数的小鱼跑通”
- copy: “八个任务串起 BPE、Transformer、训练、生成与 ONNX 部署”
- badges: `08 个任务`, `真实源码`, `可复现实验`
- link: `/project/guppylm`

- [ ] **Step 2: Add responsive styles**

Use `.guppy-course-entry` and make it stack at 640px without changing the existing chapter cards.

- [ ] **Step 3: Verify the entry**

```powershell
pnpm test:guppylm http://127.0.0.1:5175
```

Expected: `/course/llm-a1` contains a link to `/project/guppylm`, and no other course shows the entry.

---

### Task 6: Verify the external GuppyLM code paths

**Files:**
- Read: `C:\Users\HY\AppData\Local\Temp\guppylm-codex-20261030\guppylm\config.py`
- Read: `C:\Users\HY\AppData\Local\Temp\guppylm-codex-20261030\guppylm\model.py`
- Read: `C:\Users\HY\AppData\Local\Temp\guppylm-codex-20261030\guppylm\dataset.py`
- Read: `C:\Users\HY\AppData\Local\Temp\guppylm-codex-20261030\docs\tokenizer.json`
- Read: `C:\Users\HY\AppData\Local\Temp\guppylm-codex-20261030\docs\model.onnx`

**Interfaces:**
- Consumes: the fixed repository commit and the workspace `.venv-pytorch`.
- Produces: fresh command output proving the page's tokenizer/model/ONNX claims.

- [ ] **Step 1: Verify model construction and forward shape**

Run from the GuppyLM clone with the workspace virtual environment:

```powershell
& 'D:\Python_Project\knowledge-order\.venv-pytorch\Scripts\python.exe' -c "import torch; from guppylm.config import GuppyConfig; from guppylm.model import GuppyLM; m=GuppyLM(GuppyConfig()); x=torch.randint(0,4096,(2,32)); print(sum(p.numel() for p in m.parameters())); print(m(x)[0].shape); print(m.lm_head.weight is m.tok_emb.weight)"
```

Expected: `8726016`, `torch.Size([2, 32, 4096])`, `True`.

- [ ] **Step 2: Verify tokenizer values**

Run:

```powershell
& 'D:\Python_Project\knowledge-order\.venv-pytorch\Scripts\python.exe' -c "from tokenizers import Tokenizer; t=Tokenizer.from_file('docs/tokenizer.json'); print(len(t.get_vocab())); print(t.encode('hi guppy').ids); print(t.encode('hi guppy').tokens)"
```

Expected: `2418`, `[779, 278]`, `['hi', 'Ġguppy']`.

- [ ] **Step 3: Verify ONNX artifact and runtime availability**

Run:

```powershell
Get-FileHash 'docs\model.onnx' -Algorithm SHA256
```

Expected: `96DD79D233662B65BC0FAE1773821479551D1C1257CA5BBD12FA3E6623AE4835`.

If `onnxruntime` is absent, install it only into `.venv-pytorch`:

```powershell
& 'D:\Python_Project\knowledge-order\.venv-pytorch\Scripts\python.exe' -m pip install onnxruntime
```

Then run a minimal session check:

```powershell
& 'D:\Python_Project\knowledge-order\.venv-pytorch\Scripts\python.exe' -c "import onnxruntime as ort; s=ort.InferenceSession('docs/model.onnx', providers=['CPUExecutionProvider']); print([i.name for i in s.get_inputs()]); print([o.name for o in s.get_outputs()])"
```

Expected: an `input_ids` input and a logits output, with no load error.

- [ ] **Step 4: Verify the page's displayed values against the command output**

Check task 1, 3, 5, and 7 in the browser. If any displayed number differs from fresh output, correct the content module and rerun the test.

---

### Task 7: Run full project verification

**Files:**
- Modify only if verification exposes a defect.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: fresh evidence for typecheck, build, browser contract, and responsive screenshots.

- [ ] **Step 1: Run typecheck**

```powershell
pnpm typecheck
```

Expected: exit `0`.

- [ ] **Step 2: Run build**

```powershell
pnpm build
```

Expected: exit `0`; Vite reports a successful production build.

- [ ] **Step 3: Run the focused browser test**

```powershell
pnpm test:guppylm http://127.0.0.1:5175
```

Expected: all checks pass, exit `0`, no JS page errors.

- [ ] **Step 4: Run the existing navigation regression**

```powershell
pnpm test:nav http://127.0.0.1:5175
```

Expected: existing navigation checks still pass. If the pre-existing test count assumes 9 LLM courses, record the actual output and do not change unrelated navigation behavior.

- [ ] **Step 5: Inspect screenshots**

Open the desktop and mobile screenshots from Task 4. Check:

- no clipped titles;
- no page-level horizontal scroll;
- task rail remains usable;
- diagrams have readable labels at both widths;
- code blocks scroll locally;
- acceptance controls have visible focus states.

- [ ] **Step 6: Report exact evidence**

Report the commands, exit status, number of passing checks, build result, and any remaining gaps. Do not claim completion before these commands have been run.
