# 「从零手写大模型」课程优化报告

> 依据：[rasbt/reasoning-from-scratch](https://github.com/rasbt/reasoning-from-scratch)（Raschka, *Build a Reasoning Model (From Scratch)*, Manning 2025, ISBN 9781633434677）
> 生产规格：[llm-reasoning-spec.md](llm-reasoning-spec.md)
> 状态：**16 章 44 节 313 题全部完成并验证通过**

---

## 一、优化前的诊断

| 指标 | 优化前 | 优化后 |
| --- | --- | --- |
| 章节 | 12 章 | **16 章** |
| 知识点 | 34 节 | **44 节** |
| 习题 | 188 题 | **313 题** |
| 每节配图 | **12 节无图**（覆盖率 65%） | **44/44 全覆盖** |
| 深度审计 | 34 节全 A、均分 87 | 44 节全 A、**均分 90** |
| 推理模型内容 | **完全缺失** | 4 章 14 节 |

### 发现的两个真问题

**问题 1：第 2 章整章与第 3-5 章重复**

| c2 原节 | 与谁重复 |
| --- | --- |
| c2-l1 自注意力：QKV、缩放点积与掩码 | c4 整章（4 节） |
| c2-l2 多头注意力：并行的多个子空间 | c5 整章（4 节） |
| c2-l3 位置编码：正弦、可学习与 RoPE | c3-l2 / c3-l3 |
| c2-l4 残差、LayerNorm 与 RMSNorm | c6 整章 |
| c2-l5 FFN 与完整 Transformer Block | c7 + c8 |

c2 平均仅 2836 字符（全课最短），是早期内容，后来扩写 c3-c8 时未清理。

**问题 2：完全缺失「推理模型」这条线**

原课程止步于「搭出 GPT + 生成文本 + 可解释性」，没有任何推理能力内容。

---

## 二、做了什么

### 2.1 c2 改造为「Transformer 全景导航页」（5 节 → 1 节）

新 c2 不是删减，而是**换了一种更有价值的内容**：

- 七步数据流（分词 → Embedding → 位置 → N×Block → LN → 输出投影 → Softmax），每步标注形状变化；
- 七个零件的问题-章节对照表（哪个零件解决什么问题、深入第几章）；
- Pre-LN Block 的内部结构图（两条残差旁路）；
- GPT-2 Small 的完整参数账（验证 FFN 占每层 2/3）；
- 可跑的「空壳 GPT」demo（走一遍数据流 + 算参数账 + 验证形状不变性）。

**净效果**：从 5 节重复内容变成 1 节 6091 字符的导航页，腾出的篇幅给了 4 章推理内容。

### 2.2 新增 c13-c16（4 章 14 节）

| 章 | 标题 | 节 | 题 | 对应原书 |
| --- | --- | --- | --- | --- |
| c13 | 推理模型是什么：从 GPT 到会思考 | 4 | 38 | ch1-ch2 |
| c14 | 怎么知道它会推理：评估与判分 | 3 | 28 | ch3 + 附录 F |
| c15 | 推理时扩展：不训练也能变强 | 4 | 38 | ch4-ch5 |
| c16 | 用强化学习训练推理：GRPO 与蒸馏 | 3 | 33 | ch6-ch8 |

### 2.3 补齐 22 个图缺口

原课程 c1/c3/c5/c6/c7 各 4 节、c9-c12 各 1 节、c4 缺 2 节、c6 缺 3 节**完全没有配图**。本次按内容语义为每一节配了合适的交互图（`token` / `tensor` / `attention-heatmap` / `contextwindow` / `arch name="transformer-block"`），并附解读文字。

**覆盖率从 65% 提升到 100%。**

---

## 三、技术基建（本次新增）

### 3.1 后端模型常驻服务（方案 B）

**问题**：`pythonRunner` 每次执行都启动独立子进程，Qwen3-0.6B 加载需 8-10 秒，每个 demo 都重新加载体验不可接受。

**方案**：新增 `server/modelService.mjs`（约 420 行），启动一个**长驻 Python 进程**，模型只加载一次，后续通过 JSON-lines 协议复用。

| 端点 | 功能 |
| --- | --- |
| `GET /api/model/status` | 服务状态（是否运行、模型名、待处理请求数） |
| `POST /api/model/load` | 显式加载（首次约 10-22 秒） |
| `GET /api/model/info` | 模型配置（参数量/层数/词表/头数） |
| `POST /api/model/generate` | 生成文本（支持 temperature/top_p/多返回/seed） |
| `POST /api/model/score` | 计算平均 logprob（自反思/蒸馏用） |

**实测效果**：

| 场景 | 耗时 |
| --- | --- |
| 首次加载（冷启动，含进程启动） | 22.0 秒（模型本身 8.62 秒） |
| 第二次生成（16 token） | **1.3 秒** |
| 第三次生成（8 token） | **0.9 秒** |

即：**从「每次 22 秒」变成「首次 22 秒，之后 1 秒级」**。空闲 20 分钟自动释放内存。

### 3.2 修复 pythonRunner 的 HF_HOME 缺失

**问题**：`from_pretrained` 直接失败，报 `PermissionError at C:\Users\<user>\.cache\huggingface`——因为 `pythonRunner` 没设 `HF_HOME`，transformers 去全局缓存目录（无写权限）。

**修复**：从解释器路径推导项目根，注入 `HF_HOME=<root>/.models/hf` + `HF_HUB_DISABLE_PROGRESS_BARS=1` + `TRANSFORMERS_VERBOSITY=error`。

**验证**：现在 `from_pretrained('Qwen/Qwen3-0.6B')` 无需任何 workaround 直接可用（14.7 秒返回）。

### 3.3 sympy 路由到后端

`hybridRunner.ts` 的 `BACKEND_ONLY_PACKAGES` 加入 `sympy`（Pyodide 未预装、后端已装），并补 `safetensors` / `huggingface_hub` / `tokenizers`。

### 3.4 探活超时与缓存

`/api/python/status` 原本 10 秒超时失败（导入 torch 需 10-25 秒）。修复：超时提到 40 秒 + 5 分钟结果缓存。实测首次 11.7 秒，之后秒级。

---

## 四、实证数据（全部本机跑出，非引用）

### 4.1 Qwen3-0.6B 规格

| 项 | 实测值 |
| --- | --- |
| 参数量 | 596,043,776（596.0 M） |
| 层数 / 隐藏维 | 28 / 1024 |
| Q 头 / KV 头 | 16 / 8（GQA） |
| FFN 中间维 | 3072（= 3d） |
| 词表 / 上下文 | 151936 / 40960 |
| 权重共享 | `tie_word_embeddings=True` |
| 冷加载 | 5.3-10.0 秒（随磁盘缓存浮动） |
| 生成速度 | 约 10-13 token/s |

### 4.2 c13 的核心现象（真实复现）

| 题目 | base 直接答 | + CoT | 正确 |
| --- | --- | --- | --- |
| 17+25 | `42` | `42` | ✅ 都对 |
| 12×4 | `48` | `48` | ✅ 都对 |
| 100−37 | `63` | `63` | ✅ 都对 |
| **Half the value of 3x−9 is x+37** | **`12`** ❌ | **`83`** ✅ | **CoT 救回来了** |

另实测：**48 token 预算 → 抽不到 `\boxed{}`（被截断）；240 token → 实生成 195（自然吐 eos）→ `83` 正确**。同一份权重、同一提示词，唯一变量是计算量。

### 4.3 c14 的判分阶梯

| 实现 | 9 条用例通过率 |
| --- | --- |
| 只用字符串相等 | 4/9 |
| **完整实现（解析+归一化+数值/分数/SymPy）** | **7/9**（另外 2 条是该错的） |

关键失败案例：正则 `\\boxed\{(.*?)\}` 遇到 `\boxed{\frac{1}{2}}` 只得到 `\frac{1`（截断）。pass@1 60% → pass@2 65.7% → pass@4 72.9% → pass@8 80.0%。

### 4.4 c15 的两组 self-consistency（核心教学点）

| 题 | 5 样本投票结果 | 是否成功 |
| --- | --- | --- |
| 简单题（17+25，T=0.7） | 42 / 42 / None / 42 / 42 → **投票 42（4/4）** | ✅ 正确 |
| **中等题（3x−9，T=0.8）** | **83 / 13 / 49 / 11 / None → 全不一致** | ❌ **投票失效** |

**这是本章最重要的教学点**：模型能力不足时，多采样只会得到「更多不同的错误答案」。只讲成功案例是不诚实的。

### 4.5 c16 的 GRPO 实测

| 指标 | 数值 |
| --- | --- |
| 任务 | 看到 X 输出 (9−X)，单 token 输入输出 |
| 模型 | tiny GPT，约 13 万参数，2 层 |
| 训练 | 600 步，group size 8，温度 1.5 |
| 奖励曲线 | 前 1/4 **0.390** → 后 1/4 **0.756** |
| 贪心准确率 | 训练前 10% → 训练后 **70%** |
| 耗时 | 5.4 秒（CPU） |

对照实验（删掉 `if R.std() < 1e-6: continue`）：120 步里有 **65 步**属于「组内全同」（梯度为 0 纯浪费）——量化证明了这一行的必要性。

**蒸馏实测**（c16-l3，任务为 a+b= → 两位和）：

| 配置 | 准确率 |
| --- | --- |
| 蒸馏前 | 0% |
| **有损失掩码** | **65%** |
| **无损失掩码（对照）** | **50%** |

无掩码时 loss 更低（prompt 容易预测），但准确率更差——这正是「必须做掩码」的实证。

---

## 五、验证结果

| 验证项 | 命令 | 结果 |
| --- | --- | --- |
| 类型检查 | `npx tsc -b --noEmit` | ✅ 零错误 |
| 语法 | esbuild（16 个文件） | ✅ 全部通过 |
| 内容审计 | `node scripts/content-audit.mjs` | ✅ 72 门课 / 386 章 / 1244 知识点 / 5375 题 |
| 题目体检 | 同上 | ✅ 解析齐全、答案合法 |
| 深度审计 | 按 depth-audit 规则 | ✅ **44/44 全 A**，均分 90 |
| 前端构建 | `npx vite build` | ✅ 成功 |
| 全章渲染 | playwright e2e（16 章） | ✅ **16/16 通过，零横向溢出** |

各章渲染字符数与图数：c1 30027/6图、c2 7172/1、c3 27965/4、c4 26751/7、c5 22899/5、c6 23700/5、c7 20969/5、c8 7769/2、c9 6897/2、c10 7069/1、c11 7752/2、c12 7759/2、c13 28736/4、c14 23687/3、c15 32968/4、c16 17497/3。

### demo 实跑

| 章 | demo 数 | 状态 |
| --- | --- | --- |
| c1-c12 | 12 | ✅（纯 numpy/pandas） |
| c13 | 4 | ✅ 全部真跑 Qwen3，18-42 秒/个 |
| c14 | 3 | ✅ 纯 Python，<1 秒/个 |
| c15 | 4（含 l4 的 3 个） | ✅ 真跑 Qwen3，24-63 秒/个 |
| c16 | 3 | ✅ tiny 模型，5-70 秒/个 |

---

## 六、与既有课程的分工（避免新重复）

| 内容 | 已有课程 | 本次处理 |
| --- | --- | --- |
| Transformer 零件细节 | llm-a1 c3-c9 | c13-l2 只做**对照**，不重讲 |
| RoPE/RMSNorm/SwiGLU/GQA | llm-a3 | c13-l2 列对照表，细节回指 |
| SFT/RLHF/DPO | llm-b4 c1-c2 | 不重复 |
| **GRPO 数学推导/R1-Zero/工业流水线** | llm-b4 c3 | c16-l2 **只做代码实现**，公式与涌现现象回指 b4-c3 |
| **CoT/self-consistency/Best-of-N/自反思** | ❌ 无 | c15 全新 |
| **MATH-500/`\boxed{}` 解析/SymPy 判等** | ❌ 无 | c14 全新 |
| **GRPO 可运行代码 + 奖励曲线** | ❌ 无 | c16 全新 |
| **蒸馏代码** | 概念提及 | c16-l3 代码全新 |

---

## 七、改动清单

**新增（9 个文件）**
- `server/modelService.mjs`（常驻模型服务，420 行）
- `src/content/chapters/llm-a1-c13.ts` / `-c13-ex.ts`
- `src/content/chapters/llm-a1-c14.ts` / `-c14-ex.ts`
- `src/content/chapters/llm-a1-c15.ts` / `-c15-ex.ts`
- `src/content/chapters/llm-a1-c16.ts` / `-c16-ex.ts`
- `docs/llm-reasoning-spec.md`

**修改（7 个文件）**
- `src/content/chapters/llm-a1.ts`（c2 改为导航页 + 接线 c13-c16）
- `src/content/chapters/llm-a1-extra.ts` / `-extra2.ts`（补 21 个图）
- `server/index.mjs`（5 个模型服务路由）
- `server/pythonRunner.mjs`（HF_HOME + 探活超时/缓存）
- `src/engine/hybridRunner.ts`（sympy 等包路由到后端）
- `.gitignore`（排除 `.models/`）

**依赖变更**
- `.venv-pytorch` 新增：`transformers 5.20.2` / `tokenizers 0.23.3` / `safetensors 0.8.0` / `accelerate 1.15.0` / `huggingface-hub 2.3.0`
- 下载模型权重：`Qwen/Qwen3-0.6B`（约 1.2GB，存于 `.models/hf`，已 gitignore）

---

## 八、后续可选增强

1. **c7-l4 / c13-l2 深度 79 分**（仍在 A 级线 70 之上，但低于均分 90）——可各补一段数学推导。
2. **c15-l4 有 3 个 demo**（其他节 1 个）——因为 Best-of-N + 自反思 + 打分函数拆成了三个，可考虑合并。
3. **模型服务未做前端 UI**——目前只有 API，可加一个「在线试玩」组件让读者不写代码就能试 CoT。
4. **`.models/` 约 1.2GB**——若需多机部署，建议改为启动时自动下载（`modelService` 已支持 `HF_HOME` 环境变量覆盖）。
