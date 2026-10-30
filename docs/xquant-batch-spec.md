# c6-c10 批量生产规格（子代理必读）

> 唯一规格依据。任何与本文件冲突的做法以本文件为准。

## 0. 你只能写指定的文件

- 章节正文：`src/content/chapters/quant-xquant/cN.ts`
- 习题：`src/content/chapters/quant-xquant/cN-ex.ts`

**绝对不要修改**：`courses.ts` / `series.ts` / `index.ts` / `market.ts` / 其他章节文件。Lead 负责接线。

## 1. 文件骨架（照抄，只换 N 和内容）

### cN.ts
```ts
import type { Chapter } from '../../../types';
import { quantXquantCNExercises } from './cN-ex';
import { XQ_THREE } from './market';

export const quantXquantCNChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'quant-xquant-cN',
    title: '...',
    goal: '...',
    lessons: [
      { id: 'quant-xquant-cN-l1', title: '...', difficulty: 2,
        content: `...`, tips: [...], demos: [...] },
      ...
    ],
    exercises: quantXquantCNExercises,
  },
];
```

### cN-ex.ts
```ts
import type { Exercise } from '../../../types';

const MKT = `...（照抄 market.ts 里 XQ_THREE 的完整内容，见 §4）...`;

export const quantXquantCNExercises: Exercise[] = [
  { id: 'quant-xquant-cN-l1-e1', type: 'single', difficulty: 1,
    relatedLessonId: 'quant-xquant-cN-l1', tags: ['K', '标签'],
    question: '...', options: [{value:'a',text:'...'},...], answer: 'a', explanation: '...' },
  ...
];
```

## 2. 单节 13 模块（锚点词必须出现，depth-audit 靠它打分）

按顺序，每块用 `## ` 二级标题：

1. `## 学习目标` —— 3 条可观察行为动词目标
2. `## 前置知识`
3. `## 问题背景`
4. `## 直觉理解` —— 生活化类比（不要用投资类比讲投资）
5. `## 核心概念与原理详解` —— 含中英术语表 + 公式（$$LaTeX$$）
6. `## 机制图解` —— 一个 `<Diagram type="..." />`
7. `## 完整案例` —— 带具体数字的表
8. `## 代码实践`
9. `## 常见误区与安全风险` —— ≥3 条
10. `## 与其他知识点的关联` —— 向前/向后/平行
11. `## 本节总结` —— 表格
12. `## 参考资料与延伸阅读` —— 按「来源类型」分组（学术来源/权威教材/课程结构参考/原创）
13. `## 动手实验` —— 含验收标准

**篇幅硬线：每节 ≥ 4200 字符**（含 markdown 标记）。低于此值打回。

## 3. tips / demos 硬线

- `tips`：**恰好 4 条**，`kind` 从 `pitfall` / `leak` / `interview` / `performance` / `note` 中选，建议四类各一。每条 40-90 字，必须具体（含数字或可操作动作），不允许「要注意风险」这类空话。
- `demos`：**至少 1 条 python demo**，必须能在 Pyodide（numpy + pandas + matplotlib）跑通。

## 4. 行情代码怎么用

**不要**自己编行情。demo 里的 python 代码第一行写 `${XQ_THREE}`（这是模板插值，编译时会展开成完整的三资产代码），它提供：

```python
PX      # DataFrame，列 A/B/C，收盘价，DatetimeIndex，1300 行（2021-01-04 ~ 2025-12-26）
RET     # PX 的日收益率（fillna(0)）
metrics(r)          # -> {"tot","ann","vol","mdd","sharpe"}（百分比口径）
simulate(w, freq=21, stop=None, take=None)  # -> (日收益 Series, 换手数)
EW      # Series({"A":1/3,"B":1/3,"C":1/3})
ONLY_A  # Series({"A":1.0,"B":0.0,"C":0.0})
```

习题的 `setupCode` 字段直接照抄 `XQ_THREE` 的完整内容（从 market.ts 复制），不要写 `${XQ_THREE}`。

## 5. 数据口径（全课程统一，不得改）

| 项 | 口径 |
| --- | --- |
| A | 沪深300 替代，累计 +0.75%，波动 11.01%，回撤 −37.23% |
| B | 纳指100 替代，累计 +105.00%，波动 13.97%，回撤 −20.31% |
| C | 黄金 替代，累计 +28.33%，波动 7.03%，回撤 −14.38% |
| 相关性 | AB 0.504 / AC 0.246 / BC 0.101 |
| 等权组合（21日再平衡） | 累计 +41.69%，波动 8.02%，回撤 −13.84%，夏普 0.87 |
| 风险平价权重 | A 29.82% / B 23.50% / C 46.68% |
| 动量排名（20日 RAM，21日再平衡） | 累计 +225.09%，换手 48.4 |
| 再平衡频率 | 5天 29.20% / 10天 30.54% / 21天 42.15% / 63天 43.98% / 252天 42.29% |
| 止损（参照建仓） | 5% → +45.11%（触发2次）/ 10% → +42.07% / 15% → 不触发 |
| 止损（参照峰值） | 5% → −8.01%（触发60次）/ 10% → −12.77%（触发59次） |
| 止盈（含−10%止损） | 10% → +35.38% / 20% → +38.45% / 30% → +42.07% |

**成本口径**：c1-c5 主表一律**不含成本**；c6-c10 如需成本，明确标注「单边 Nbp」。

## 6. 转义红线（违反必打回）

1. TS 模板字符串内：反引号写 `` \` ``，`${` 写 `\${`（**唯一例外**：`${XQ_THREE}` 保持原样用于行情插值）。
2. **禁止 heredoc 生成文件**，用 write 工具整文件写出。
3. `tips`/`demos` 必须是**数组**。
4. python 代码里若用 `%` 格式化，字符串中出现的字面 `%` 必须写成 `%%`（例如 `"5%% 止损" % x`）；**更推荐 f-string 或 .format 避免此坑**。
5. 每写完一个文件立刻跑校验（见 §8）。

## 7. 习题规格

按 `scripts/exercise-rules.mjs`：难度 1→6 题、2→8 题、3→10 题、4→13 题、5→16 题。

| 节难度 | 题量 |
| --- | --- |
| 2 | 8 |
| 3 | 10 |
| 4 | 13 |

题型金字塔：`single` 2-3 题、`judge` 2-3 题、`fill` 1-2 题、`multiple` 1-2 题、`code` 1-2 题、`open` 1-2 题。

硬性要求：
- 每题必须有 `id`、`type`、`difficulty`、`question`、`explanation`、`relatedLessonId`、`tags`（含 `K`/`U`/`D` 之一）。
- `single`/`multiple` 必须有 `options` + `answer`（`answer` 必须在 options 里）。
- `fill` 必须有 `blanks`（二维数组，每个空给多个可接受写法）。
- `code` 必须有 `setupCode`（照抄 XQ_THREE）、`starterCode`、`tests`、`answer`、`expectedOutput`。**answer + tests 必须本地实跑通过**。
- `open` 必须有 `referenceAnswer`（含推理链）+ `rubric`（≥4 条，每条带 `score`）+ `keywords`。

## 8. 验证（每写完一章必跑）

```bash
cd /d/Python_Project/knowledge-order
bash scripts/validate-xquant.sh src/content/chapters/quant-xquant/cN.ts
```

必须输出「全部通过」。它会检查：esbuild 语法、13 模块、篇幅、tips/demos、题量、Python demo 实跑、代码题参考答案过 tests。

**其中 demo 与 code 题的 Python 代码由校验器自动展开 `${XQ_THREE}` 后实跑，所以你写的数字必须与真实输出一致。**

## 9. 写作风格（对齐 c1-c5）

- 第二人称，「你应该能够」「你会看到」。
- 每节至少一张**带具体数字的表**。
- 讲完概念必须立刻给「本节实测」数字，不允许只讲理论。
- 常见误区必须包含至少一条**本课程踩过的坑**（数量级、口径、参照点、前视）。
- 结尾「动手实验」必须给可执行的 2-3 个任务 + 一句验收标准。
- **不搬运原书**：这是自主重写的教材级讲义，例子、图、习题都是原创；参考资料里注明「结构参考 xingwudao《人人都是量化交易员》，内容为自主编写」。
