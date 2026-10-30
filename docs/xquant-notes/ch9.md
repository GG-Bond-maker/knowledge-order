# 第 9 章 持续寻找机会：因子研究入门

- 原页面 URL：https://xingwudao.github.io/xquant-beginner/book/q9-daily-work

## 1. 章级主线（一句话 + 问题链）

一句话：把投资直觉翻译成可计算因子，用 IC 验证其预测力，再把因子弱点改写成策略规则。

问题链：前面决策靠什么（回顾 GDP 与动量）→ 因子好坏怎么量（IC / ICIR / 分组）→ 动量在更大池子还灵吗（25 只标的 × 3 个前向窗口）→ 因子评估能改进策略吗（波动率过滤）→ 研究员的日常节奏。

## 2. 节级目录（逐节）

**9.1 从直觉到因子**
核心问题：因子是什么，怎么判断好不好？
- 回顾：第 2 章 GDP 选国家（宏观因子）、第 3 章风险调整动量定权重（动量因子）。
- IC = 每期因子排名与下期收益排名的 Spearman 相关（−1~+1）；ICIR = IC 均值 / IC 标准差。
- 阈值：|IC| > 0.03 有参考价值、> 0.05 算不错、> 0.1 非常强（实际罕见）。
- GDP 总量因子 IC 均值 0.1272、ICIR 0.3158；增速因子 −0.0390、−0.1177——"增长快"不能预测"股市涨得好"。
- 因子六类：价值、动量、质量、波动率、宏观、另类；后续聚焦动量（日频、样本大）。

**9.2 动量因子：涨得好的会继续涨吗？**
核心问题：3 只 ETF 上有效的动量，扩到 25 只还成立吗？
- 标的池 22 国 ETF + GLD/USO/SLV，2015-01-01~2025-12-31 日频；因子为 20 日动量与 RAM（动量/波动率）；前向窗口 10/20/40 交易日。
- 六组 IC 均值全为负：20 日动量 −0.0263/−0.0290/−0.0436，RAM −0.0161/−0.0193/−0.0335；ICIR 绝对值 0.0589~0.1560；IC>0 占比 43.4%~46.4%。
- 分组 IC：20 日动量整体 −0.0290、高波动 −0.0334、低波动 −0.0119、Spread 0.0215；RAM 整体 −0.0193、高波动 −0.0354、低波动 −0.0011、Spread 0.0343。
- 结论：动量截面预测力接近零，高波动资产上更差；"回测有效"不等于"因子有效"。

**9.3 从因子到策略：让数据说话**
核心问题：知道动量在高波动失灵，能改成什么？
- 三因子（25 只 ETF、20 日前向）：RAM −0.0193/ICIR −0.0714/IC>0 46.4%；波动率 0.0020/0.0076/49.1%；短期反转 0.0183/0.0659/52.6%。
- 基准（三只 ETF 动量排名）：累计 +113.36%、波动 15.01%、回撤 −13.32%、简化夏普 1.09。
- 改进（波动率过滤，高波动权重减半）：+92.96%、11.00%、−10.17%、1.25，回撤改善 23.7%。
- 结论：因子评估的价值不是多赚，而是同等风险下更稳；代价是少赚。

**9.4 量化交易员的一周**
核心问题：这套方法如何变成日常节奏？
- 每日 ≤30 分钟：盘前 5 分钟看仪表盘、盘后 10-15 分钟对账、晚间 10 分钟写迭代记录。
- 每周 2-3 小时：监控扫描 + 诊断分流；周末半天做因子探索或假设实验。
- 每月半天复盘（确认率/推翻原因/下月方向）+ 工具升级；每季度 1-2 天完整体检（第 5、6 章工具全上）+ 视野扩展。
- 结论：节奏比努力重要，迭代速度本身就是竞争力。

**9.5–9.6 总结**：四个阶段、三个环节（做/看/疑）、一种工作方式（写 spec 让 AI 执行）。

## 3. 关键概念与公式

| 中文 | 英文 | 一句话 |
| --- | --- | --- |
| 因子 | Factor | 可计算、可解释或预测的变量 |
| 信息系数 | IC (Information Coefficient) | 因子排名与下期收益排名的相关 |
| IC 信息比率 | ICIR | IC 均值 / 标准差，衡量稳定性 |
| 截面分析 | Cross-sectional Analysis | 同一时点横向比较标的 |
| 前向收益 | Forward Return | 因子时点之后的收益，防穿越 |
| 风险调整动量 | RAM | 动量除以波动率 |
| 分组诊断 | Grouped IC | 按波动率等特征分组再算 IC |
| 两步筛选 | Two-step Screening | 宏观定池 + 动量定权重 |

公式：IC_t = Spearman(rank(F_t), rank(R_{t+1}))，逐期算后取均值；ICIR = mean(IC)/std(IC)；RAM = 动量/波动率；短期反转 = −close.pct_change(5)；前向收益 = close.pct_change(h).shift(−h)；回撤改善 = (13.32 − 10.17)/13.32 ≈ 23.7%（原文称"约 24%"）。IC 标准误 1/√N 属外部知识，本书未出现。

## 4. 动手实验与代码

实验 1 GDP 因子 IC：`WorldBankFetcher()` + `FactorDownloader(fetcher, sub="macro")` + `dl.download("gdp", start="2010", end="2024", countries=...)`；价格用 `YFinanceDownloader()` + `LocalMarketDataProvider().get_bars()`；IC 用 `scipy.stats.spearmanr`，另算增速（`pct_change()`）。输出 1×2 柱状图（正蓝负红 + 均值虚线）、IC 最大年份排名 slope chart（中美红线）、六类因子全景表。

实验 2 动量 IC：`Momentum().compute(df, column="close", period=20)`、`RollingVolatility().compute(...)`；自写 `compute_ic_series(factor_df, fwd_df, min_assets=5)` 与 `compute_grouped_ic(..., min_assets=6)`（交集 ≥12、每组 ≥6）。输出 2×3 子图（柱状 width=2、alpha=0.2、60 日滚动均值、IC 均值红虚线）、分组 IC 表与对比图。

实验 3 因子到策略：补 `rev_df = -df["close"].pct_change(5)`；基准用 `Threshold` 信号 + `TopNRankingOptimizer(score_col="ram", n=3, filter_negative=True)` + `RebalanceFrequencyRule(interval_days=21)`，data_start 2020-06-01；实现 `VolFilteredOptimizer(base_optimizer, vol_threshold, market_vol)`，`optimize()` 末尾查最新波动率、超阈值则权重减半、余额给 CASH，暴露 `name` 与 `required_indicators`。输出三因子 IC 表、指标对比表、净值对比图（蓝 #3498DB / 橙 #E67E22）。

## 5. 图表与类比

- 图 9-1 GDP 总量与增速年度 IC 对比；图 9-2 IC 最高年份排名 slope chart（线越平 IC 越高）；图 9-3 2×3 IC 时间序列网格（日 IC 柱 + 60 日滚动均值 + 均值线）；图 9-4 高/低波动组 IC 对比；图 9-5 基准 vs 过滤净值对比。
- 类比：挑餐厅看评分/距离/价格（因子）；估分准不准、预测前 5 名与实际重合度（IC）；看"班级第几名"而非分数（Spearman）；因子版性价比（ICIR）；先选城市再选餐厅（两步筛选）；同一次考试比较不同学生（截面）。
- 双编码："IC 柱在零附近正负乱跳"建立不稳定直觉，"高波动组 IC 更负"建立弱点定位直觉，构成发现问题→改进策略的视觉链。

## 6. 与知序学院已有量化课程的重叠

- quant-strategy（高度重复）：c3-l3「IC、Rank IC 与分组单调性」与 9.1/9.2 高度重叠且更严格（IC 标准误 1/√N、t 检验、十分组单调性）。本书增量是 25 只跨市场 ETF + 按波动率分组的 Spread 数字 + 把弱点翻译成规则的闭环。
- quant-ml（中度）：结尾的决策树/GBDT/神经网络组合因子与树模型、特征重要性衔接；本书未讲标签构造与 Purged CV。
- quant-portfolio（中度）：波动率目标化与权重减半同源，该书为连续杠杆公式，本章是离散开关。
- quant-backtest（部分）：简化夏普与最大回撤口径重复，本章不涉及引擎与过拟合检验。
- quant-data（部分）：`WorldBankFetcher`、`YFinanceDownloader` 取数属该课范畴，本章未处理复权与 PIT。
- quant-market / quant-live：无重叠。
- 本书独有：`compute_ic_series` / `compute_grouped_ic` 函数签名级模板（含 `min_assets` 阈值）、`VolFilteredOptimizer` 包装范式、因子六类全景表、一周作业日历。

## 7. 可裁剪的低价值内容

- spec 写作教学（"评估工具前置""函数签名点名""教学简化声明"）与十余处「要点」。
- "见配套仓库→复制给 AI→执行"、notebook 单元格逐步创建流程。
- 各 spec 的 11 条任务要求与验收标准原文（保留产物清单）。
- 9.5 速查 5 条 + 核心认知 3 条 + 9.6 励志段落（保留"四阶段/三环节"骨架）。
- Agent 配置（SOUL.md / AGENT.md / TOOLS.md / skill）安装步骤，属工具操作。
- 课堂页导流、路线图、"最新书稿已更新"提示。

## 8. 建议补充的知识点

1. IC 显著性检验：IC 标准误 ≈ 1/√N、Newey-West 调整 t 值。Grinold & Kahn, *Active Portfolio Management*。
2. 因子预处理三部曲：MAD 去极值、Z-score 标准化、行业市值中性化（本章完全缺失）。Qian, Hua & Sorensen (2007)。
3. 十分位分组单调性与多空组合夏普，替代本章的高/低两组 Spread。Fama & French (1993, 2015)。
4. 多重检验下的因子挖掘：FDR / Bonferroni 控制。Harvey, Liu & Zhu (2016)。
5. 因子衰减与换手：IC 期限结构结合交易成本折算净 Alpha。Novy-Marx & Velikov (2016)。
6. 机器学习组合因子：GBDT/神经网络，衔接 quant-ml。Gu, Kelly & Xiu (2020)。
