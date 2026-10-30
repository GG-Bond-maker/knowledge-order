# c13-c16 生产规格（推理模型 4 章）

> 依据：[reasoning-from-scratch](https://github.com/rasbt/reasoning-from-scratch)（Raschka, *Build a Reasoning Model (From Scratch)*, Manning 2025）
> 前置：[xquant-batch-spec.md](xquant-batch-spec.md) 的写作风格与 13 模块要求全部适用，本文件只写**差异与专属约束**。

---

## 0. 章节结构（4 章 14 节）

| 章 | id | 标题 | 节 | 题 |
| --- | --- | --- | --- | --- |
| c13 | `llm-a1-c13` | 推理模型是什么：从 GPT 到会思考 | 4 | 38 |
| c14 | `llm-a1-c14` | 怎么知道它会推理：评估与判分 | 3 | 28 |
| c15 | `llm-a1-c15` | 推理时扩展：不训练也能变强 | 4 | 38 |
| c16 | `llm-a1-c16` | 用强化学习训练推理：GRPO 与蒸馏 | 3 | 28 |

合计 **14 节 / 132 题**。

### 逐节明细

**c13 推理模型是什么**
| 节 | 标题 | 难度 | 核心 |
| --- | --- | --- | --- |
| c13-l1 | 推理不是预测：base 模型为什么会「答得很快但答错」 | 2 | 系统1/系统2、token 预算、CoT 的本质是「用 token 换计算」 |
| c13-l2 | Qwen3-0.6B 解剖：对比你手写的 GPT | 3 | 28 层/1024 维/16 头 8 KV/词表 151936/RoPE/SwiGLU/GQA，与 GPT-2 逐项对照 |
| c13-l3 | 加载预训练权重与第一次推理 | 3 | `from_pretrained`、dtype、eval()、tokenizer、第一个 `\boxed{}` |
| c13-l4 | base vs reasoning：两种模型的分工 | 3 | base 续写 vs instruct 对话；`<think>` 标签；何时该用哪个 |

**c14 怎么知道它会推理**
| 节 | 标题 | 难度 | 核心 |
| --- | --- | --- | --- |
| c14-l1 | MATH-500：为什么需要一个基准 | 2 | 数据集结构、为什么用数学（可验证）、pass@1 vs pass@k |
| c14-l2 | `\boxed{}` 解析：从自由文本里捞出答案 | 3 | 正则、嵌套括号、LaTeX 归一化（`\dfrac`→`\frac`、`\left`、上标）、最后一个匹配 |
| c14-l3 | 判分：字符串相等为什么不够 | 3 | 数值容差、分数等价、SymPy 符号判等、`1/2` vs `0.5` |

**c15 推理时扩展**
| 节 | 标题 | 难度 | 核心 |
| --- | --- | --- | --- |
| c15-l1 | CoT 提示：一句「step by step」的威力 | 2 | 实测 12→83；为什么有效；什么时候无效 |
| c15-l2 | 温度与 top-p：控制探索的旋钮 | 3 | T=0 贪心、T 高更多样、top-p 截断；对推理的影响 |
| c15-l3 | Self-consistency：多采样再投票 | 4 | 采样 N 个、提取答案、多数投票；边际收益递减 |
| c15-l4 | Best-of-N 与自反思 | 4 | 用打分选最优；critique→revise 循环；何时会变差 |

**c16 用强化学习训练推理**
| 节 | 标题 | 难度 | 核心 |
| --- | --- | --- | --- |
| c16-l1 | RLVR：用规则当裁判 | 3 | 可验证奖励、防 reward hack、格式奖励 |
| c16-l2 | GRPO：不要 Critic 的强化学习 | 4 | 组内相对优势、为什么砍 Critic、全对/全错组梯度为 0 |
| c16-l3 | 蒸馏：把大模型的思考教给小模型 | 3 | 教师输出、交叉熵、长度过滤、蒸馏 vs 自训 RL |

---

## 1. 执行环境（关键差异）

本站有**两条 Python 执行路径**（`src/engine/hybridRunner.ts` 自动选择）：

| 路径 | 触发条件 | 可用包 |
| --- | --- | --- |
| Pyodide（浏览器内） | 无重型 import | numpy / pandas / matplotlib |
| **本地后端**（`.venv-pytorch`） | `import torch` 等 | **torch 2.14 / transformers 5.20 / numpy / scipy** |

### 1.1 模型服务（方案 B，必须用）

Qwen3-0.6B 加载需 **8-10 秒**。若每个 demo 都重新加载，体验不可接受。因此后端提供**常驻模型服务**：

```
GET  /api/model/status     服务状态
POST /api/model/load       显式加载（首次约 10-22 秒）
GET  /api/model/info       模型配置（参数量/层数/词表）
POST /api/model/generate   生成文本
POST /api/model/score      计算平均 logprob
```

**demo 里必须优先调用模型服务，而不是每次 `from_pretrained`。**

但 demo 是在 Python 里跑的，不能直接发 HTTP 请求（Pyodide 无网络，后端环境可用 urllib 但没必要）。因此 demo 采用**混合策略**：

| demo 类型 | 写法 | 说明 |
| --- | --- | --- |
| **需要真实推理**（c13/c15） | 直接 `from_pretrained`，并在注释里说明「首次加载约 10 秒，本站已启用模型常驻缓存」 | 后端 `modelService` 已在服务端缓存，但 demo 子进程仍需自加载 —— **接受这一点**，控制 demo 生成量 |
| **不需要模型**（c14 解析、c16 GRPO） | 纯 Python/numpy/torch，用小模型或纯字符串处理 | 秒级完成 |

> **重要约束**：后端单次执行上限 **120 秒**。因此：
> - 需要真实 Qwen3 的 demo，**总生成 token 数 ≤ 400**（约 35-40 秒）；
> - self-consistency 这类多次采样，**样本数 ≤ 3，每题 ≤ 120 token**（约 25-30 秒）；
> - 超过预算的部分，改用「预跑好结果 + 让读者本地跑」的方式。

### 1.2 实测基线数字（必须与 demo 一致）

以下是我在本机实测的数字，**正文与 demo 必须使用同一组**：

| 项 | 数值 |
| --- | --- |
| Qwen3-0.6B 参数量 | 596.0 M |
| 层数 / 隐藏维 / 头数 / KV 头 | 28 / 1024 / 16 / 8 |
| 词表 / 上下文 | 151936 / 40960 |
| FFN 中间维 | 3072 |
| 权重共享 | `tie_word_embeddings=True` |
| 冷加载耗时 | 8.6 - 10.0 秒 |
| 生成速度 | 约 10-13 token/s |
| 简单题（17+25 / 12×4 / 100−37）base | **全对**（42 / 48 / 63） |
| 中等题（Half the value of 3x−9 is x+37）base | **12**（错，正确 83） |
| 同题 + CoT | **83**（对） |
| 同题 + CoT，T=0.8，5 样本投票 | 全不一致（83/13/49/11/None）→ **投票失效** |
| 简单题 + CoT，T=0.7，5 样本投票 | **42（4/4）→ 投票正确** |

**这两组 self-consistency 结果必须都写进 c15-l3**：它说明「投票不是万能的」——模型能力不足时，多采样只会得到更多不同的错误答案。

---

## 2. 写作要求（与 xquant 一致，此处只列强化项）

### 2.1 13 模块（锚点词必须出现）

`## 学习目标` / `## 前置知识` / `## 问题背景` / `## 直觉理解` / `## 核心概念与原理详解` / `## 机制图解` / `## 完整案例` / `## 代码实践` / `## 常见误区与安全风险` / `## 与其他知识点的关联` / `## 本节总结` / `## 参考资料与延伸阅读` / `## 动手实验`

### 2.2 硬线

- 每节 **≥ 4500 字符**（比 xquant 高，因为要讲清模型细节）
- `tips` **恰好 4 条**，`kind` 覆盖 `pitfall` / `note` / `interview` / `performance`
- `demos` **至少 1 条**，必须是可跑的 Python
- 每节至少 1 张**带具体数字的表**
- 每节「机制图解」必须有 `<Diagram type="..." />`

### 2.3 可用的 Diagram 类型

只能从已注册的类型里选（见 `DiagramRenderer.tsx` 的 `REGISTERED_DIAGRAMS`）。安全选择：
`arch`（需 name）/ `flow`（需 name）/ `transformer-block` / `self-attention` / `specfour` / `dojudge` / `paramsaw` / `isoos` / `monitor3` / `underwater` / `equitycurve` / `fattail` / `pipeline`

**若需新增图**，必须同时在 4 处注册：`DiagramKind` union、`DiagramRenderer` switch、`REGISTERED_DIAGRAMS`、`Markdown.tsx` 白名单。

### 2.4 参考资料格式

```markdown
> **来源类型：权威教材**
> - Raschka, S. *Build a Reasoning Model (From Scratch)*. Manning, 2025. ISBN 9781633434677——第 N 章 XXX；本课程在 XXX 上做了 XXX（自主实现/改写）。
```

**必须注明**：原书代码为 Apache 2.0 许可；本课程代码为自主编写，仅参考章节结构与教学方法。

---

## 3. 习题规格

| 节难度 | 题量 |
| --- | --- |
| 2 | 8 |
| 3 | 10 |
| 4 | 13 |

题型金字塔：single 2-3 / judge 2-3 / fill 1-2 / multiple 1-2 / code 1-2 / open 1-2。

**code 题特别要求**：
- 必须能在**后端**跑（`import torch` 会触发后端）；
- 若不需要模型，就别 import torch（走 Pyodide，秒级）；
- `tests` 里禁止下载模型或联网。

---

## 4. 转义红线（违反必打回）

1. TS 模板字符串内：反引号写 `` \` ``，`${` 写 `\${`。
2. **代码围栏必须是三个反引号**：`` \`\`\` ``。常见错误是写成两个（`\`\``）导致解析失败。
3. Python f-string 里的 `{}` 在 TS 模板里**不需要**转义（不是 `${`），但 `f"{k}"` 若紧跟 `$` 需注意。
4. `tips`/`demos` 必须是数组。
5. 写完立刻用 esbuild 检查语法。

---

## 5. 验证

```bash
cd /d/Python_Project/knowledge-order
# 语法
node -e "require('esbuild').buildSync({entryPoints:['src/content/chapters/llm-a1-c13.ts'],loader:{'.ts':'ts'},outfile:'.tmp-check/x.js'})"
# 内容同步 + 审计
node scripts/sync-content.mjs
node scripts/content-audit.mjs
# 类型
npx tsc -b --noEmit
```

demo 实测（需要模型的）：
```bash
.venv-pytorch/Scripts/python.exe <导出的 demo.py>
```
**注意**：模型类 demo 单次约 20-40 秒，别串太多。

---

## 6. 与既有课程的分工（避免重复）

| 内容 | 已有课程 | c13-c16 怎么处理 |
| --- | --- | --- |
| Transformer 零件细节 | llm-a1 c3-c9 | 只在 c13-l2 **对照**（Qwen3 改了哪几处），不重讲原理 |
| 预训练/反向传播/优化器 | llm-a2 | 一句话点名，不展开 |
| RoPE / RMSNorm / SwiGLU / GQA | llm-a3 | c13-l2 列对照表，细节回指 a3 |
| SFT / RLHF / DPO | llm-b4 c1-c2 | 不重复 |
| **GRPO 数学推导 / R1-Zero / 工业流水线** | llm-b4 c3 | c16-l2 **只做代码实现**，公式与涌现现象回指 b4-c3 |
| **CoT / self-consistency / Best-of-N / 自反思** | ❌ 无 | c15 全新 |
| **MATH-500 / `\boxed{}` 解析 / SymPy 判等** | ❌ 无 | c14 全新 |
| **GRPO 可运行代码 + 奖励曲线** | ❌ 无 | c16 全新 |
| **蒸馏代码** | 概念提及 | c16-l3 代码全新 |

---

## 7. 交付清单

- [ ] `src/content/chapters/llm-a1-c13.ts` + `llm-a1-c13-ex.ts`
- [ ] `src/content/chapters/llm-a1-c14.ts` + `llm-a1-c14-ex.ts`
- [ ] `src/content/chapters/llm-a1-c15.ts` + `llm-a1-c15-ex.ts`
- [ ] `src/content/chapters/llm-a1-c16.ts` + `llm-a1-c16-ex.ts`
- [ ] Lead 负责接入 `src/content/chapters/llm-a1.ts` 的 `...llmA1Extra2` 之后
- [ ] 全量验证通过
