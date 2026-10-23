# 课程内容深度升级 · 进度与规范手册

> 本文档是「全平台课程内容深度升级」任务的**可持续追踪清单**：记录已完成批次、
> 内容标准、验证流程与剩余工作优先级。中断后从「四、剩余工作」继续即可。
>
> 最后更新：2026-10-23

## 一、任务背景与基线

2026-10-23 全站审计（`node scripts/depth-audit.mjs`，报告见 `qa/depth-audit-report.md`，
副本 `docs/depth-audit-report.md`）：

- 范围：52 门课程 · 304 章 · 1008 知识点 · 3983 题
- **基线评级：A 5 · B 142 · C 259 · D 602**（D = 严重不足：篇幅短、缺模块、缺推导/案例/来源）
- 最薄弱：量化系列（每门 3–9 知识点，均 600–800 字）、stats-foundations（133 个）、
  causal-inference（112 个）、financial-statements（126 个）

当前进度（每批完成后更新）：

| 批次 | 范围 | 知识点数 | 提交 | 审计后 A/B/C/D |
| --- | --- | --- | --- | --- |
| 试点 | quant-math 4 个代表点（推导/代码/概念/应用型） | 4 | 2ba17e9 | 5→9 |
| 批次1 | quant-math 剩余 3 个 | 3 | c5a7692 | 9→12 |
| 批次2 | quant-market 最弱 5 个 | 5 | 837f1ce | 12→17 |
| 批次3 | stats-foundations 概率核心 5 个 | 5 | 059a87d | 17→22 |
| 批次4 | Python 数据分析基础入门 5 个（变量/精度/列表/字典/集合） | 5 | 7d4c08f | 22→27 |
| 批次5 | llm-a1 第 2 章 Transformer 架构导览 5 节 | 5 | 32b6c32 | 27→32 |
| 批次6 | llm-a2 大模型训练原理核心 6 节 | 6 | ea79a93 | 32→38 |
| 批次7 | stats-foundations 第 3/4 章剩余核心 5 节 | 5 | 5ca0574 | 38→43 |
| 批次8 | quant-backtest 回测/绩效/过拟合 5 节 | 5 | (本批) | 43→48 |
| **合计** | | **42** | | **A 48 · B 142 · C 251 · D 567** |

## 二、内容来源链（改哪里才不会被覆盖）——重要

| 课程 | 单一真相源 | 修改方式 |
| --- | --- | --- |
| quant-\*（10 门） | `src/content/chapters/quant/*.ts` | 改 TS → `pnpm run sync` 覆盖 JSON |
| stats-foundations / causal-inference / financial-statements / dbt / airflow / python-\*（9 门） | `content-data/courses/*.json`（`src/content/index.ts` 直接 import JSON） | 直接改 JSON，**不要跑 sync 前先确认**（sync 会重写这些文件为装配格式：补 seriesId、去掉章内 courseId，属良性） |
| 其余（python/pandas/sql/excel/viz/algo/llm/mining/paper/ai-auto/deep-learning 等） | `src/content/chapters/*.ts` | 改 TS → sync |

**TS 模板字符串转义规则**（踩过的坑）：正文里的反引号必须写 `` \` ``；
`${` 必须写 `\${`；LaTeX 命令双反斜杠 `\\frac`。批量修改推荐
`scripts/upgrade/batch2_quant_market.py` 的 `replace_content()` 模式（自动转义）。
JSON 课程无此问题。

## 三、教学标准（16 模块）与验证流程

每个知识点按需包含（允许省略不适用项，禁止凑数）：
学习目标 / 前置知识 / 问题背景 / 直觉理解 / 核心概念 / 原理详解 / 数学推导 /
完整案例（有输入-过程-结果-解释）/ 代码实践（可运行+预期输出+常见错误）/
图示与交互（复用已注册的 `<Diagram>` `<TensorFlow>` `<Heatmap>` `<Slider>` 及 160+ Demo 组件）/
常见误区 / 知识关联 / 本节总结（表格化）/ 参考资料（分级标注来源类型）。

篇幅按重要度分配：术语 ~800 字；一般知识点 2000–3000；核心推导 3000+。

**验证流程（每批必做，缺一不可）**：
1. `pnpm run typecheck`（TS 课程）
2. `python scripts/check_tpl.py`（反引号配对；`pnpm run typecheck` 失败时先跑它）
3. 数学/代码数值**实跑验证**（新建或扩充 `qa/verify_*.py`，含预期输出断言）
4. `pnpm run sync`（TS 课程）→ `pnpm run audit`（id 唯一/字段/答案合法）
5. `node scripts/depth-audit.mjs`（评级应提升，无回归）
6. 浏览器渲染检查（参照 `scripts/e2e-pilot-render.mjs` / `e2e-stats-render.cjs`：
   关键词 + KaTeX 节点数 + 表格数 + 无未渲染 LaTeX + 无 JS 错误）
7. git 提交（消息注明批次、知识点列表、核验过的引用、实测校准值）

**引用纪律（SIFT 横向核查）**：写入引用前必须核验存在性与出处；
论文给全作者/年份/期刊/卷期页；政策给文号（如印花税 2023 年第 39 号公告）；
大学课程给课程号与学期。已核验可复用：MIT OCW 18.S096(2013Fall)/18.642(2024Fall)、
15.401；Dickey-Fuller 1979 JASA 74(366):427-431；Engle-Granger 1987 Econometrica
55(2):251-276；Murray 1994 AmStat 48(1):37-39；Harvey-Liu-Zhu 2016 RFS 29(1):5-68；
Bailey-López de Prado 2014 JPM 40(5)；Cont 2001 QF 1(2):223-236；Sharpe 1964 JF
19(3):425-442；印花税 0.05% 卖出单边（2023-08-28 起）。

## 四、剩余工作（按优先级）

> 每完成一批：升级本表状态 + 重新跑 depth-audit 更新基线 + 提交。

**P0（量化体系收尾，方法论已成熟，每课约半天）**
- [ ] quant-market c1 三节（委托撮合/订单簿/对数收益率，已有底子补模块）（c1-l1 委托撮合 1641 / c1-l2 订单簿 1569 / c1-l3 对数收益率 1848 —— 已有底子，补模块）
- [ ] quant-backtest 剩 4 节（c1-l2 事件驱动/c1-l3 摩擦/c2-l2 MDD/c3-l3 DSR）；quant-strategy（9）、quant-portfolio（9）：IC 与主动管理定律/Markowitz 与风险平价是全学科承重点
- [ ] quant-data（9，PIT 数据泄漏）、quant-ml（9，三重屏障与 Purged CV）、
      quant-live（9）、quant-project（9，全课均 543 字全 D）、quant-python（3）

**P1（三门大课核心章节）**
- [ ] stats-foundations 剩余 128 个：优先 l2（概率运算）、l4（离散分布）、l6（联合分布）、
      l8（抽样分布）、l9（置信区间与假设检验）各章的「概念主课」
- [ ] causal-inference（112 个）：优先 RCT/工具变量/DID/断点回归主课
- [ ] financial-statements（126 个）：优先三大报表勾稽、DCF、比率分析主课

**P2（大模型与论文课薄弱点）**
- [ ] MoE 论文研读（9，均 1457 字但全 D）、大模型训练原理（15）、数据分析方法论（12）
- [ ] paper-\* 六门中低于 40 分的知识点（见 qa/depth-audit-report.md D 级清单）

**P3**：B 级 142 个的定向补强（多数只缺「知识关联/误区/总结」之一两个模块）。

## 五、备份与恢复

- 课程内容与源码：git 仓库（本仓库 remote origin；每批一次提交）
- 审计报告副本：`docs/depth-audit-report.md`（qa/ 目录被 .gitignore 排除，故在 docs/ 留 tracked 副本）
- 学习记录（浏览器 localStorage `data-academy:state:v2`）与课程内容整体备份：
  平台「学习统计 → 导出」一键导出 JSON；恢复用同一页面导入
- 服务端自动备份：`content-data/backups/`（删除/导入前自动留档）
- 完全重建：`rm -rf node_modules && pnpm install && pnpm run setup`

## 六、已知事项

- `pnpm run test:platform` 中两处失败（学习计划持久化断言过时、note-head 定位器
  匹配到 7 个元素）为**存量测试脆弱性**，在本次改动前的干净树上同样复现，与内容升级无关。
- README「当前内容规模」仍写 46 门/555 知识点，实际 52 门/1008（此前已偏差，未动）。
