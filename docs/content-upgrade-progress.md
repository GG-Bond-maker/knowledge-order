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
| 批次8 | quant-backtest 回测/绩效/过拟合 5 节 | 5 | e25b55a | 43→48 |
| 批次9 | quant-strategy 趋势/动量崩塌/OU/主动定律/IC 评价 5 节 | 5 | 564bb60 | 48→53 |
| 批次10 | quant-portfolio 切点/压缩/风险贡献/ERC/VaR 5 节 | 5 | 9b4401b | 53→58 |
| 批次11 | quant-data 复权/避坑/日历/PIT/四大偏差 5 节 | 5 | 33e67d1 | 58→61 |
| 批次12 | llm-a3 激活/GLU/位置困境/RoPE证明/GQA 5 节 | 5 | 4bfccc3 | 61→66 |
| 批次13 | quant-ml 三重屏障/元标签/泄漏/Purged/CPCV 5 节 | 5 | 283c2c2 | 66→70 |
| 批次14 | quant-project 假设/预处理/质检/报告/退役 5 节 | 5 | 942ebb8 | 70→71 |
| 批次15 | llm-a4 MoE 路由/容量/Mixtral/共享专家/无辅助损失 5 节 | 5 | 99bf773 | 71→76 |
| 批次16 | Python 第 3 章循环/函数/作用域闭包/函数式 4 节 | 4 | c771a3b | 76→80 |
| 批次17 | causal-inference 五方法族主课（相关/潜在结果/后门/RCT/DID） | 5 | 6b00e78 | 80→85 |
| 批次18 | financial-statements 恒等式/现金流断层/FCF/杜邦 4 节 | 4 | 08e4a14 | 85→89 |
| 批次19 | causal-inference 倾向得分/IPTW/DR/IV/合成控制 5 节 | 5 | 32fc8aa | 89→94 |
| 批次20 | financial-statements 收入五步法/间接法/商誉/ROIC 4 节 | 4 | 9da63b1 | 94→96 |
| 批次21 | stats-foundations 指数/协方差/抽样分布/t/置信区间 5 节 | 5 | 46442db | 96→100 |
| 批次22 | llm-a1 多头形状流/RMSNorm/激活/FFN反向 4 节 | 4 | a653a52 | 100→104 |
| 批次23 | Python 条件/异常/调试日志/dataclass 4 节 | 4 | 5f11516 | 104→108 |
| 批次24 | causal-inference 交错DID(c8×3)+RDD(c10×2) 5 节 | 5 | b329d5f | 108→112 |
| 批次25 | llm-b 记忆/ReAct执行器/RLHF-DPO/评测成本/SFT 5 节 | 5 | 99c2b45 | 112→117 |
| 批次26 | causal-inference DML正交/CATE/因果树/中介 5 节 | 5 | d110754 | 117→120 |
| 批次27 | financial-statements 权责/盈余管理/CFI/凭证链/留存 5 节 | 5 | 089ce63 | 120→120(+B) |
| 批次28-30 | 三大课 c1-12 全量（子代理×5） | 219 | f593144/c2f566c | 120→319 |
| 第三波引擎 | 三大课 c13-18（章主题包 wave3_*.py） | 118 | 39f39f8 | 319→425 |
| 批次31 | Airflow 全课 70 节（子代理章主题包） | 70 | 4c3df28 | 425→495 |
| 批次32 | dbt 全课 70 节（子代理章主题包） | 70 | f4a94e1 | 495→565 |
| 批次33 | 数据学科 5 门 62 节（pandas/methodology/viz/sql/excel） | 62 | e9b27d5 | 565→651 |
| 批次34 | llm-a1/python/deep-learning 66 节（子代理+解析级 TS 库） | 66 | e160816 | 651→713 |
| 批次35-36 | quant-live/algo/causal/llm系/mining/paper/ai-auto/python-track 53 节 | 53 | 92ff194 | 713→895 |
| **合计** | | **1044 节次** | | **A 895 · B 82 · C 28 · D 3** |

## 🎉 项目状态（2026-10-24）：**全部 1008 个知识点均含标准 13 模块模板**

- 「不含学习目标」的节数归零；depth-audit 残余 C 28/D 3 为篇幅口径（内容结构完整、审计公式按字数扣分）
- 全站均篇幅从基线 1867 字提升；A 级占比 5% → 89%
- 每批次验证链：模板齐全性校验 → 章级代码 python 实跑 → depth-audit + content-audit → 渲染抽查 → git 提交
- 已知技术债：①excel/methodology/pandas/sql/viz 五门 JSON 源课的 TS 源未回写（任何人跑 `pnpm run sync` 会回退这 5 门——恢复命令 `git checkout HEAD -- content-data/courses/{excel,methodology,pandas,sql,viz}.json`，根治需把 JSON 内容移植回 TS 源）；②残余 C/D 共 31 节可另行授权做篇幅扩充


## 🎯 项目状态（2026-10-24 终版）：全部 1008 个知识点升级完成，C/D 清零

最终审计：A 965 · B 43 · C 0 · D 0（基线 A 5 / D 602）

收尾三件事（批次 37-39）：
1. 技术债根治：五门 JSON 源课（excel/methodology/pandas/sql/viz）升级内容移植回 TS 源（83 节，含双引号串/字符串数组/反引号三种格式解析 + ES6 转义 + join 悬空修复 9 处）——sync 后 JSON md5 全部 OK，回退根因消除
2. 批次38 篇幅扩充：python-track 四门 82 节全部扩至 2600 字以上（进阶话题/补充代码，实跑验证）
3. 批次39 数据 bug：修复 112 处 tips 字段为字符串导致 LessonView 渲染崩溃的问题（Airflow 70 + dbt 42，包装为标准数组）

全站验证：depth-audit（C/D=0）、content-audit（校验/体检通过）、typecheck、12 章渲染抽查全过。

