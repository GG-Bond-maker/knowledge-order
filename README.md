# 知序学院 · Knowledge Order

> **知**识有序，循序而进。一个不局限于数据分析的个人多学科学习平台。

**为你自己打造的全学科学习网站**：系统化知识点 + 海量可自动判分的练习 + 艾宾浩斯复习 + 内容管理后台。
不依赖视频，所有代码在浏览器内真实运行；课程内容由后端动态管理，可随时增删课程与习题。

覆盖三个学科方向：

- 📊 **数据分析** —— Python / Pandas / SQL / Excel / 可视化 / 分析方法论
- 💻 **算法与数据结构** —— 复杂度、双指针、链表栈队列、哈希排序、树与图、动态规划
- 🤖 **大模型** —— 从零手写 Transformer → 训练原理 → GPT-2 到 LLaMA → MoE → RAG / Agent / 部署
- 📈 **量化交易** —— 市场微观结构与订单簿 → 金融数学 → 数据复权清洗 → 多因子 Alpha → 策略回测 → 组合风险管理 → 机器学习防泄漏 → 实盘系统与项目实战

## 快速开始

```bash
cd D:\Python_Project\knowledge-order

# 一键初始化（推荐）：检查环境 → 装依赖 → 备运行时 → 同步内容 → 内容体检
pnpm run setup

# 或者手动分步：
pnpm install     # 安装依赖到项目内 node_modules/
pnpm run runtime # 准备离线运行时（Pyodide + sql.js）
pnpm run sync    # 把内置课程同步到 content-data/

# 启动（推荐：一条命令同时起后端与前端）
pnpm run dev:all
#   前端  http://127.0.0.1:5173
#   后端  http://127.0.0.1:3001

# 也可以分开启动：
pnpm run server   # 内容服务（3001）
pnpm run dev      # 前端（5173，/api 自动代理到 3001）
```

生产部署：

```bash
pnpm run build    # 构建前端到 dist/
pnpm start        # 后端同时托管 dist/ 与 API，访问 http://127.0.0.1:3001
```

## 环境隔离（虚拟环境）

本项目使用 **pnpm + 项目内 node_modules** 实现依赖隔离，效果类似 Python 的 venv：

| 特性 | 说明 |
| --- | --- |
| **依赖装在项目内** | `node_modules/` 只属于本项目，不污染全局 |
| **锁文件** | `pnpm-lock.yaml` 精确锁定每个包的版本与哈希，换机器结果一致 |
| **禁止幽灵依赖** | `shamefully-hoist=false`，只能 import 显式声明的包 |
| **Node 版本固定** | `.nvmrc` / `.node-version` 锁定 24.10，`package.json` 的 `engines` 会校验 |
| **一条命令还原** | 删掉 `node_modules/` 后 `pnpm install` 即可完全重建 |

```bash
# 完全重置环境
rm -rf node_modules && pnpm install

# 查看当前 Node 版本（配合 nvm-windows / fnm）
nvm use          # 读取 .nvmrc 自动切换
```

> **为什么不用 npm？** pnpm 用硬链接共享 store，273 MB 的依赖实际只占几十 MB，
> 且天然隔离传递依赖，能提前发现"用了没声明的包"这类问题。

## 工程化配置

| 文件 | 作用 |
| --- | --- |
| `.nvmrc` / `.node-version` | 固定 Node 24.10.0 |
| `.npmrc` | pnpm 镜像源与隔离策略 |
| `.editorconfig` | 跨编辑器统一缩进/换行/编码 |
| `.prettierrc.json` | 代码风格（单引号、120 列、尾逗号） |
| `.env.example` | 环境变量模板（复制为 `.env.local` 后修改） |
| `knowledge-order.code-workspace` | VS Code 工作区：推荐插件 + 一键任务 |
| `scripts/setup.mjs` | 一键初始化脚本 |

VS Code 用户可直接双击 `knowledge-order.code-workspace` 打开，
内置 7 个任务（`Ctrl+Shift+B` 触发）：启动服务、类型检查、内容体检、构建等。

## 功能总览

| 模块 | 说明 |
| --- | --- |
| **多学科课程** | 学科 → 课程 → 章节 → 知识点 → 习题五级结构，按学科分组展示 |
| **7 种题型** | 单选、多选、判断、填空、编程（断言测试）、SQL（结果集比对）、简答（要点自评） |
| **真实执行** | Python/Pandas/算法用 Pyodide 在浏览器运行；SQL 用 sql.js 真实 SQLite；全离线可用 |
| **难度分级** | 每章计算难度画像（入门/进阶/挑战），练习页三档筛选 + 难度递进模式 |
| **艾宾浩斯复习** | 按遗忘曲线（1/2/4/7/15/30/60/120 天）自动调度，答对进阶段、答错回退，预测未来 7 天负荷 |
| **笔记** | 每个知识点/习题旁可直接写笔记，支持本章笔记列表与全站汇总 |
| **学习计划** | 每日目标、学习日选择、提醒时间、达成率与连续打卡 |
| **内容管理后台** | 网页内可视化录入课程/章节/知识点/习题，保存即时生效；支持 JSON 源码编辑 |
| **完整备份** | 一键导出「学习记录 + 笔记 + 计划 + 课程内容」，可整体恢复 |
| **学习大屏** | 深色科技风数据大屏：KPI、课程掌握度、趋势、热力图、雷达图 |
| **数据本地化** | 学习记录存 localStorage，课程内容存本地 JSON 文件，不上传任何服务器 |

## 当前内容规模

**46 门课程 · 230 个章节 · 555 个知识点 · 2964 道习题**

### 数据分析学科（8 门）

| 课程 | 章节 | 知识点 | 习题（编程/SQL） |
| --- | --- | --- | --- |
| Python 数据分析基础 | 6 | 34 | 195（编程 51） |
| Pandas 数据处理 | 5 | 15 | 122（编程 32） |
| SQL 数据库查询 | 6 | 23 | 238（SQL 144） |
| Excel 数据处理与分析 | 5 | 21 | 136（编程 1） |
| 数据可视化 | 3 | 12 | 109（编程 26） |
| 数据分析方法论 | 4 | 12 | 92（编程 7） |
| 概率统计：从直觉到推断 | 11 | 44 | 78（单选/多选/判断/填空/案例简答） |
| 因果推断：从问题到可信识别 | 12 | 48 | 85（单选/多选/判断/填空/案例简答） |

### 编程开发学科（1 门）

| 课程 | 章节 | 知识点 | 习题 |
| --- | --- | --- | --- |
| 算法与数据结构 | 4 | 11 | 59（编程 20） |

### 人工智能学科 · 大模型系列（7 门）

组织参考 nano-ai.tech《大模型学习地铁图》体系，分**地基 / 进阶 / 应用**三个阶段：

| 子课程 | 阶段 | 章节 | 知识点 | 习题（编程） |
| --- | --- | --- | --- | --- |
| 🌱 从零手写大模型 | 地基 | 12 | 34 | 188（编程 56） |
| 🔥 大模型训练原理 | 地基 | 9 | 15 | 88（编程 23） |
| 🚀 从 GPT-2 到 LLaMA | 进阶 | 5 | 17 | 114（编程 28） |
| 🧩 MoE 论文研读 | 进阶 | 3 | 3 | 30（编程 6） |
| 🗄️ 数据工程 | 进阶 | 3 | 3 | 22（编程 6） |
| 📚 RAG 检索增强生成 | 应用 | 6 | 7 | 55（编程 13） |
| 🛠️ AI Agent 工程 | 应用 | 6 | 12 | 65（编程 17） |
| ⚙️ 推理与部署工程 | 应用 | 4 | 8 | 46（编程 13） |
| 🎯 后训练与推理模型 | 应用 | 3 | 3 | 24（编程 6） |

### 量化交易学科（11 门）

参考 MIT、Stanford、Harvard、Princeton、UC Berkeley 公开课及权威经典教材（Larry Harris、John C. Hull、Grinold & Kahn、Marcos Lopez de Prado）：

| 课程 | 阶段 | 章节 | 知识点 | 习题（编程） | 核心依据与学术来源 |
| --- | --- | --- | --- | --- | --- |
| 📊 股票市场与投资基础 | 基础 | 3 | 9 | 30 | MIT 15.401 / Larry Harris《Trading and Exchanges》 |
| 📐 金融数学与概率统计 | 基础 | 3 | 7 | 30 | MIT 18.S096 / Ruey S. Tsay《Analysis of Financial Time Series》 |
| 🐍 Python 量化编程 | 基础 | 3 | 3 | 30 | UC Berkeley Data 8/100 / Yves Hilpisch《Python for Finance》 |
| 🗄️ 金融数据获取与处理 | 基础 | 3 | 9 | 30 | Columbia IEOR / Marcos Lopez de Prado（PIT点时清洗） |
| ⚡ 量化策略与因子研究 | 进阶 | 3 | 9 | 30 | MIT 15.433 / Grinold & Kahn 主动管理基本定律 |
| 🧪 策略回测与绩效评估 | 进阶 | 3 | 9 | 30 | Stanford CME 241 / Bailey et al. (2014) 过拟合检验 |
| 🛡️ 投资组合与风险管理 | 进阶 | 3 | 9 | 30 | MIT 15.401 / Markowitz (1952) / 风险平价 / Hull VaR/CVaR |
| 🤖 机器学习与量化交易 | 进阶 | 3 | 9 | 30 | Stanford CS229 / Marcos Lopez de Prado（三重屏障与Purged CV） |
| ⚙️ 实盘交易系统 | 实战 | 3 | 9 | 30 | MIT 15.433 / Almgren-Chriss TWAP/VWAP 拆单与事前风控 |
| 🏆 量化研究项目实战 | 实战 | 3 | 9 | 30 | MIT Sloan / UC Berkeley MFE 机构级量化全流程报告规范 |
| 🧾 财务报表分析：从会计到企业估值 | 基础-进阶 | 12 | 48 | 85（单选/多选/判断/填空/案例简答） | MIT OCW 15.535 / 15.501 / OpenStax《Principles of Accounting》 |

题型分布：单选 569 · 判断 534 · 多选 388 · 填空 388 · 编程 632 · 简答 299 · SQL 154。

三门新课程的每章通常有 7 道递进练习：基础（难度 1–2）4 题、进阶（难度 3）2 题、挑战（难度 4）1 题；课程最后一章另有 1 道难度 5 的综合项目题。题型覆盖单选、多选、判断、填空和带评分要点的案例简答。

### 大模型系列的内容来源

以 nano-ai.tech 的 **48 篇系列文章**为骨架，并补充权威材料：

- **从零手写大模型**：分词 → 嵌入 → 位置编码 → 自注意力 → 多头 → 残差 → LayerNorm → FFN → Block → 堆叠 → 生成
- **训练原理**：损失函数 / 反向传播 / 梯度下降 / Adam / 学习率调度（参考 CS231n、Deep Learning 教材）
- **从 GPT-2 到 LLaMA**：RMSNorm / SwiGLU / RoPE / GQA / 组装（参考 LLaMA 1/2/3 论文）
- **MoE 论文研读**：Switch Transformer 精读（路由 / 容量 / 负载均衡 / 稳定性）
- **RAG / Agent / 部署**：参考 Lilian Weng Agent 综述、ReAct、Reflexion、RAGAS、vLLM PagedAttention

### 交互式图示与学习地图

- **学习地图**（`/learning-map`）：地铁图式路线图，7 个站点用 SVG 曲线连接，显示进度环，前置课程未完成时灰显锁定
- **交互式图示组件**：在知识点正文中用标签嵌入，全部是内联 SVG + CSS，零额外依赖
  - `<Diagram type="arch" name="transformer-block" />` —— 可 hover 高亮的架构流程图（内置 transformer-block / self-attention / llama-assembly / moe-routing / rag-pipeline / react-loop / kv-cache）
  - `<TensorFlow steps="(1,3,4)|(1,3,1)|broadcast" />` —— 张量形状变换流
  - `<Heatmap name="attention-causal" />` —— 注意力权重热力图（可 hover 查看具体数值）
  - `<Slider name="rmsnorm" />` —— 参数滑块，实时重算（内置 softmax-temperature / rmsnorm / kv-cache-budget）
## 目录结构

```
data-academy/
├── content-data/               课程内容数据（后端持久化，建议 Git 管理）
│   ├── domains.json            学科定义
│   ├── courses/                每门课程一个 JSON 文件
│   └── backups/                删除/导入前的自动备份
├── server/
│   └── index.mjs               内容服务（Express）：CRUD + 导入导出 + 静态托管
├── src/
│   ├── content/                内置课程内容与访问层
│   │   ├── courses.ts          课程元信息装配
│   │   ├── chapters/           各课程章节数据（algo*.ts / llm*.ts 为新课程）
│   │   ├── difficulty.ts       章节难度评估与分层
│   │   └── index.ts            内容访问入口（API 优先，内置回退）
│   ├── store/
│   │   ├── contentStore.ts     内容加载与后端 API 封装
│   │   ├── studyState.ts       学习状态（localStorage，含笔记与计划）
│   │   └── reviewScheduler.ts  艾宾浩斯间隔重复调度
│   ├── engine/                 Pyodide / sql.js 执行与判分引擎
│   ├── components/             Markdown、编辑器、作答器、笔记、布局
│   ├── pages/                  首页、课程、章节、练习、复习、计划、后台、统计、大屏
│   └── styles/                 设计系统
└── scripts/                    构建、校验、端到端测试脚本
```

## 添加自己的课程

**方式一：网页后台（推荐）**

1. 启动 `pnpm run dev:all`
2. 打开侧边栏「✏️ 内容管理」
3. 「＋ 新建课程」→ 填课程信息 → 「章节与习题」页签添加章节、知识点、习题
4. 点「💾 保存」，前端立即生效

**方式二：直接编辑 JSON**

编辑 `content-data/courses/<课程id>.json`，刷新页面即可。

**方式三：新增内置课程（TypeScript）**

1. 在 `src/content/chapters/` 下新建 `yourcourse.ts`，导出 `Omit<Chapter, 'courseId' | 'order'>[]`
2. 在 `courses.ts` 中 `build()` 一份课程元信息
3. 在 `src/content/index.ts` 的 `COURSES` 中加入
4. 运行 `pnpm run sync` 同步到 content-data/

## 内容编写约定（重要）

- 正文/题干/解析中的行内代码写成 `\`代码\``（转义反引号），或使用中文「」。裸反引号会导致模板字符串错配。
- 代码字段（`starterCode` / `tests` / `demo.code` / `answer`）内部不要再出现反引号字符。
- 编程题 `tests` 每行一个 `assert`，逐行计分。
- **判分器语义**：用户代码最后一条**表达式**语句的值会成为 `out`。若最后一行是赋值语句，`out` 为 None。
  因此参考答案的结尾应是裸表达式（如 `f(21)`），而不是 `out = f(21)`。

## 常用脚本

### 环境与启动

| 命令 | 用途 |
| --- | --- |
| `pnpm run setup` | **一键初始化**：检查环境 → 装依赖 → 备运行时 → 同步内容 → 体检 |
| `pnpm run dev:all` | 同时启动内容服务与前端开发服务器 |
| `pnpm run server` | 仅启动内容服务（3001） |
| `pnpm run dev` | 仅启动前端（5173） |
| `pnpm run build` | 生产构建到 `dist/` |
| `pnpm start` | 后端托管 `dist/` + API |
| `pnpm run runtime` | 准备离线运行时（Pyodide + sql.js） |

### 质量检查

| 命令 | 用途 |
| --- | --- |
| `pnpm run typecheck` | TypeScript 类型检查 |
| `pnpm run audit` | 内容体检：规模统计、id 唯一、字段齐全、答案合法 |
| `pnpm run difficulty` | 按章节输出题量与难度分布 |
| `pnpm run verify:sql` | 校验 SQL 参考查询在 SQLite 中可执行 |
| `pnpm run verify:course <id> <url>` | 真实浏览器 Pyodide 中验证该课程全部编程题 |
| `pnpm run format` | Prettier 格式化全部代码 |
| `pnpm run format:check` | 检查格式（CI 用） |

### 端到端测试（需先启动服务）

| 命令 | 用途 |
| --- | --- |
| `pnpm run test:nav` | 导航结构回归（一级分组、子课程、跳转） |
| `pnpm run test:brand` | 品牌信息回归（名称、图标、标签页） |
| `pnpm run test:migrate` | localStorage 迁移回归 |
| `pnpm run test:platform` | 平台功能回归（复习/计划/后台/笔记） |
| `pnpm run test:api` | 后端 CRUD / 备份 / 导入导出接口测试 |

### 内容管理

| 命令 | 用途 |
| --- | --- |
| `pnpm run sync` | 把内置 TS 课程同步为 `content-data/` JSON |

## 备份与迁移

- 学习记录：浏览器 localStorage（key `data-academy:state:v2`，自动从 v1 迁移）
- 课程内容：`content-data/` 目录（建议用 Git 管理）
- 完整备份：统计页「⬇ 导出进度」导出包含内容与学习记录的整体备份 JSON

## 隐私

所有数据仅保存在本机。内容服务只监听 `127.0.0.1`，不对外网开放。
