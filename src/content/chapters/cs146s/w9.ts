import type { Chapter } from '../../../types';

/* ============================================================
 *  CS146S Fall 2026 · Week 9：部署后运维与可观测性
 *
 *  结构依据：Stanford CS146S Fall 2026 官方大纲（themodernsoftware.dev，
 *  官方作业仓库 mihail911/modern-software-dev-assignments）。
 *  本课程为参照官方大纲组织的自学教材，讲义内容为自主扩展编写。
 *
 *  来源：
 *  - 官方：CS146S 课程站 Week 9 主题（Post-Deployment Operations：
 *    monitoring/observability for AI systems、automated incident
 *    response、triage；嘉宾 Mayank Agarwal & Milind Ganjoo，Resolve AI）
 *  - 官方指定阅读：Google SRE（sre.google 在线全文：golden signals、
 *    alerting on SLOs、managing incidents、postmortem culture）、
 *    Observability Basics（logs/metrics/traces）、Resolve AI
 *    agentic DevOps 博客系列
 *  - 本文件：l1 三支柱 / l2 AI 可观测性 / l3 告警设计
 *    （l4 事件响应与 l5 运维原型在 w9b.ts 中）
 *  - 原创：框架、示例、图示、全部习题与 demo
 * ============================================================ */

export const cs146sW9Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'cs146s-w9-c1',
    title: 'Week 9 · 部署后运维与可观测性',
    goal: '让 AI 构建的软件可被运营：掌握可观测性三支柱与告警设计，理解 AI 系统特有的度量（token/成本/质量漂移），建立事件响应工作流与 Agent 辅助分诊的安全边界，并亲手装配一个带度量闭环的最小运维原型。',
    lessons: [
      /* ─────────────────────────── l1 ─────────────────────────── */
      {
        id: 'cs146s-w9-l1',
        title: '可观测性三支柱：logs、metrics、traces',
        difficulty: 2,
        content: `
### 学习目标

学完本节，你应该能够：
1. 把「出了什么事 / 系统健康吗 / 请求走过哪里」三个排障问题分别映射到 logs / metrics / traces 三支柱，并说明为什么任何单一支柱都不足以完成排障；
2. 把一条自由文本日志改写成结构化日志（时间戳/级别/事件名/关联 ID/业务属性五要素），并说清这与 w5 的 --json 双模式输出是同一个设计原则；
3. 用计数器、直方图、比率三种度量基元表达一个服务的健康问题，并按 Google SRE 的四个 golden signals（延迟/流量/错误/饱和度）列出一个服务的最小监控清单。

### 前置知识

- w5-l2：脚本的双模式输出（--json）——「数据走 stdout、日志走 stderr、机器模式 schema 稳定」三条规则是结构化日志的前奏；
- w6b-l4：测试评估的指标思维（通过率、误报率）——本节把「度量」从测试域搬进生产域；
- 基本的 Web 服务概念：请求、状态码、QPS。

### 问题背景

部署不是终点，是另一场考试的开始。周五凌晨两点告警响起，你面对的永远是同样的三个问题：**出了什么事？影响多大？从哪修起？**没有可观测性体系的团队回答它们的方式是：登服务器、tail 日志、翻聊天记录、靠猜——业界复盘里 MTTR（平均恢复时间）的大头通常花在「搞清楚发生了什么」而不是「修复」上。

AI 原生开发让这个问题更尖锐：w8 之后你一天能产出过去一周的代码，部署频率上升、变更面变大，「人盯」彻底失效。官方 Week 9 把 monitoring / observability 列为核心主题，指定阅读 Google SRE 与 Observability Basics——因为 **AI 加速的不只是写代码的速度，也是把问题送进生产的速度**；唯一能跟上这个速度的只有自动化度量。

### 直觉理解

把一个线上服务想象成一家 24 小时医院，三支柱就是医院的三套信息系统：

- **Metrics 是体检仪**：体温、血压、心率——数值化、采集便宜、每秒都能测。它回答「健康吗」，但病人晕倒时它只会说「血压低了」，说不清为什么。
- **Logs 是病历与监控录像**：每一次诊疗都有记录，出事后可以回放细节。它回答「出了什么事」，但太贵——不可能全天候人工翻录像。
- **Traces 是转诊路径单**：病人从挂号→抽血→影像→专科走了多久、哪一站堵了 40 分钟。它回答「时间花在哪」，是跨科室排障的唯一手段。

好医生不会只用一套系统：先看体征（metrics）发现异常，再用转诊单（traces）定位堵点，最后调病历（logs）取证细节。**三支柱是互补关系，不是三选一。**

### 核心概念与原理详解

## 三支柱各自回答什么问题

| 支柱 | 数据形态 | 回答的问题 | 典型消费方式 | 成本特征 |
| --- | --- | --- | --- | --- |
| Logs 日志 | 离散事件记录（一行一事件） | 出了什么事？——事后回放细节 | 出事时人查 / 机器检索 | 写入贵、量大、通常限保留期 |
| Metrics 指标 | 数值时间序列 | 系统健康吗？趋势如何？ | 告警、仪表盘 | 最便宜、可长期保留 |
| Traces 追踪 | 请求级因果链 | 请求走过哪里、时间花在哪？ | 延迟归因、瓶颈定位 | 中等、通常采样 |

一个实用记法：**metrics 负责发现（便宜，适合 7×24 睁着眼），traces 负责定位（把请求切开看），logs 负责取证（最细粒度的证据）**。排障的标准动线就是发现→定位→取证。

## 结构化日志 vs 文本日志

文本日志是给人读的：「[ERROR] 2026-10-24 02:14:03 checkout 下单超时」——人眼扫着舒服，但程序想统计「过去 1 小时 checkout 超时多少次」就得正则抠字段，格式一变全崩。

结构化日志是给机器读的：一行一个 JSON 事件，字段 schema 稳定——ts、level、event、service、trace_id、业务属性。这正是 w5-l2 双模式输出原则在生产日志上的延续：**同一语义，人读文本、机器读结构**。

AI 时代又多了一条理由：l4 会讲 Agent 辅助分诊的第一步就是把日志喂给模型做摘要——**机器可读是 Agent 分诊的前提**。结构化日志的五要素：时间戳（建议 UTC）、级别、事件名、关联 ID（trace_id / request_id）、业务属性。

## 度量基元：计数器、直方图、比率

| 基元 | 性质 | 例 | 用法要点 |
| --- | --- | --- | --- |
| Counter 计数器 | 只增不减 | 请求总数、错误总数 | 看速率（每分钟增量）而非绝对值 |
| Histogram 直方图 | 分桶记录分布 | 延迟分布、响应大小分布 | 才能算 P50/P95/P99 |
| Ratio 比率 | 两个 counter 相除 | 错误率 = 错误数/请求数 | 告警的主角（l3 展开） |

**平均数会说谎**：1000 个请求里 990 个 50ms、10 个 10 秒，平均 149ms 看着还行，但 P99 = 10 秒——最惨的 1% 用户（也许恰恰是付钱最多的那个）体验到的是「产品坏了」。这就是「延迟必须用直方图存」的原因：**分布信息一旦 averaged 掉就不可重建**。

## Golden signals（Google SRE）

Google SRE 手册《Monitoring Distributed Systems》一章给出四个应最先监控的信号：

| 信号 | 含义 | 常见坑 |
| --- | --- | --- |
| 延迟 Latency | 服务处理请求的耗时 | 成功与失败请求的延迟必须分开看——失败常伴随超时级延迟，混在一起会稀释真信号 |
| 流量 Traffic | 每秒请求量 / 并发 | 区分用户流量与重试流量（l2 会讲到重试风暴） |
| 错误 Errors | 失败请求的比例 | 显式错误（5xx）之外还有隐式错误：返回 200 但内容错误（AI 应用里这是重灾区，l2 展开） |
| 饱和度 Saturation | 资源有多「满」 | CPU/内存/连接池/队列深度——饱和度是容量告警的依据 |

l2 会给出 LLM 应用版的改造；l3 的告警设计将全部建立在这四个信号上。

## 分布式追踪（概念级）

三个术语：**trace** 是一次请求经过全部服务的完整因果树；**span** 是其中一个有名字、有耗时、可嵌套的工作单元（「处理下单」包含「查库存」再包含「调缓存」）；**上下文传播**是让同一请求的所有 span 共享一个 trace_id 的机制——trace_id 塞进 HTTP header（或消息属性）跨服务传递，各服务把它写进自己的 span 与日志。

<Diagram type="trace" />

图里是一次 AI 应用的请求瀑布：检索、LLM 调用、工具调用各自是一个 span。注意 **LLM 调用占了总耗时的大头**——这不是偶然，l2 的延迟长尾会展开这个观察。日志里带上 trace_id 之后，「按 trace_id 查日志」就把三支柱缝在了一起：metrics 发现异常 → trace 定位到 span → logs 用 trace_id 取证。

### 完整案例

故障：周五 02:14，「下单接口变慢」。看三支柱如何按顺序走完这次排障。

1. **metrics 发现**（为什么先撒网？——它最便宜、7×24 在跑）：P99 从 200ms 涨到 2.4s，错误率从 0.01% 涨到 3%，流量正常。结论：系统真的不健康了，但不知道为什么。
2. **traces 定位**（为什么现在看瀑布？——已经锁定「慢」，把慢请求切开来找堵点）：对比健康请求与慢请求的 span，慢请求 90% 的时间卡在 inventory-service 的 span 上，其余 span 正常。
3. **logs 取证**（为什么最后查日志？——有了 trace_id 才能精确到行）：用 inventory 慢 span 的 trace_id 查该服务日志，发现大量「库存锁等待超时」，起始时间 02:09——与当晚运维的一次库存迁移脚本时间吻合，根因方向确定。

**自解释提示**：顺序不能反。先查日志等于在十亿行里大海捞针；metrics 撒网确认「有病」、traces 把范围缩到一个服务、logs 才精确到行——每一步都在给下一步缩小搜索空间。这条「发现→定位→取证」的动线在 l4 会被 Agent 自动化成分诊流水线。

### 代码实践

下面的演示做两件事：用 200 个模拟请求展示「平均数 vs P50/P99」的差距；打印同一事件的文本日志与结构化日志两种形态。跑完后把随机种子改掉再跑一次，观察长尾如何拉高 P99 而对平均值影响不大。

### 常见误区与安全风险

- **误区一：「日志越多越可观测。」** 数 TB 的无结构日志检索不动、读不完，等于黑盒。可观测性来自「结构 + 关联 ID」，不是来自体量——与 w3 上下文工程的「删除」纪律同构：不能回答问题的数据不该被记录。
- **误区二：「平均延迟是健康指标。」** 平均值会吞掉长尾。所有面向用户体感的度量一律用分位数（P50/P95/P99）。
- **误区三：「可观测性是运维团队的事。」** 告警的输入是你（开发者）在代码里埋的信号。AI 写代码时，「埋点需求」必须写进 Spec 的验收标准（w3 的 AC）——AI 不会替你想到「这里将来要能排障」。
- **安全提示：日志是敏感数据的永久档案。** 密码、token、用户隐私一旦进日志，就会被复制进聚合系统、备份与值班员屏幕——脱敏必须在写入前做；日志聚合平台能读到全公司数据，它本身就是最高价值的攻击目标之一；l4 还会讲日志内容本身可能就是注入载荷。

### 知识关联：承上启下

- 承上：w5-l2 的 --json 双模式是「给人看 vs 给机器看」的前奏；w6b-l4 的指标思维（通过率/误报率）在测试域，本节把它搬进生产域；
- 启下：l2 把三支柱扩展出 AI 特有的三类新度量；l3 用 metrics + golden signals 设计告警；l4 用 logs + traces 做事件分诊；l5 把三支柱收拢进最小运维原型；cs146s-final 的项目 E 需要你为 Software Factory 装上这层度量。

### 动手实验

1. 运行下方演示，记下 avg / P50 / P99 三个数；把随机种子改成 42 再跑一次，观察哪个指标波动最大；
2. 给你最近写的任何一个脚本（哪怕 20 行）补三条结构化日志（ts/level/event），再想想：如果它半夜坏了，你还需要哪条 metrics 才能第一时间知道？

### 本节总结

1. 三支柱分工：metrics 发现（便宜）、traces 定位（切请求）、logs 取证（最细粒度）——排障动线是发现→定位→取证；
2. 结构化日志五要素（ts/level/event/关联 ID/属性），与 w5 的 --json 双模式同源；机器可读是 l4 Agent 分诊的前提；
3. 度量三基元：计数器看速率、直方图看分布（平均值会说谎）、比率做告警；
4. golden signals 四件套：延迟、流量、错误、饱和度——AI 应用的改造版在 l2；
5. trace/span/上下文传播：trace_id 跨服务传递，把三支柱缝在一起。

### 参考资料与延伸阅读

- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)（官方 Week 9 指定阅读，sre.google 在线全文）——golden signals 的原始出处：对应「golden signals」模块；
- [Google SRE Book — Alerting on SLOs](https://sre.google/sre-book/alerting-on-slos/)——l3 告警设计的方法源头：对应「度量基元」与「golden signals」模块；
- Observability Basics（官方 Week 9 阅读清单；OpenTelemetry 官方文档的 logs/metrics/traces 概念部分与之同源）——对应「三支柱」模块；
- [Prometheus 官方文档 — Concepts](https://prometheus.io/docs/introduction/overview/)（counter/histogram/gauge 的工程定义）——对应「度量基元」模块；
- 官方 Week 9 嘉宾为 Resolve AI（Mayank Agarwal & Milind Ganjoo，agentic DevOps 方向），其博客系列在本课对应 l4 的分诊话题；
- 本节三支柱分工表、排障动线、完整案例与全部习题均为自主设计的原创教学内容（与官方 week9 的锚点关系：主题对应，讲义与题目自研）。

### 本节习题导引

single/fill 校准三支柱分工与 golden signals；code 题实现最近邻秩百分位与错误率（P99 计算的积木）；open 题为一个真实服务设计三支柱埋点清单。
`,
        tips: [
          { kind: 'pitfall', text: '平均值是长尾的稀释剂：上线前先问「这个指标存的是分布还是平均」——只有直方图能事后算 P99，平均值一旦算出就不可恢复。' },
          { kind: 'performance', text: 'metrics 最便宜所以负责发现，logs 最贵所以负责取证：把「出事才查日志」变成纪律，日志量可以降一个量级。' },
          { kind: 'interview', text: '"三支柱各解决什么问题、为什么缺一不可？"——答发现/定位/取证动线并举例 P99 与 trace_id 串联，是运维面试的标准开场题。' },
          { kind: 'note', text: '给每个服务定三个日志事件名起步：request_done、error、slow_call——事件名稳定后，统计与告警才有抓手。' },
        ],
        demos: [
          {
            title: '三支柱微缩实验：分位数、错误率与两种日志形态',
            lang: 'python',
            code: `import json, math, random

random.seed(7)

# ── 1. 模拟 200 个请求: 延迟分布与错误 ──
latencies, errors = [], 0
for _ in range(200):
    r = random.random()
    if r < 0.03:                      # 3% 出错(常伴随超时级延迟)
        errors += 1
        latencies.append(random.uniform(1800, 2500))
    elif r < 0.05:                    # 2% 慢请求(长尾)
        latencies.append(random.uniform(900, 1500))
    else:
        latencies.append(random.uniform(60, 160))

def nearest_rank(sorted_vals, p):
    """最近邻秩法: rank = ceil(p/100 * n), 返回第 rank 小"""
    return sorted_vals[math.ceil(p / 100 * len(sorted_vals)) - 1]

srt = sorted(latencies)
avg = sum(latencies) / len(latencies)
print(f"n=200  avg={avg:.0f}ms  P50={nearest_rank(srt, 50):.0f}ms  "
      f"P99={nearest_rank(srt, 99):.0f}ms  max={srt[-1]:.0f}ms")
print(f"error_rate={errors / 200:.2%}  <- 比率: 告警的主角(l3)")
print()

# ── 2. 同一事件的两种日志形态 (w5 --json 双模式的生产版) ──
event = {"ts": "2026-10-24T02:14:03Z", "level": "ERROR",
         "event": "checkout_timeout", "service": "checkout",
         "trace_id": "9f2c-a41d", "upstream": "inventory",
         "elapsed_ms": 2103}
print("[文本日志|给人读]")
print("[ERROR] 2026-10-24 02:14:03 checkout 下单超时, 上游=inventory, 耗时=2103ms, trace=9f2c-a41d")
print("[结构化日志|给机器读]")
print(json.dumps(event, ensure_ascii=False))

# 观察点: avg 只有百来毫秒看似健康, P99 却是四位数毫秒 --
# 长尾用户在平均值里隐身, 这就是"延迟必须用直方图存"的原因`,
          },
        ],
      },

      /* ─────────────────────────── l2 ─────────────────────────── */
      {
        id: 'cs146s-w9-l2',
        title: 'AI 系统的可观测性：token、成本与质量漂移',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说出 LLM 应用在传统三支柱之外的三类新度量（token/成本、质量漂移、AI 特有故障信号），并为每类给出采集点与典型指标；
2. 用「按任务分型的成本画像」定位成本异常（复用 w1-l2 的计费模型），并为一个任务类设计预算熔断（阈值 + 自动降级动作，呼应 w6b-l5 的资源维度）；
3. 为「模型版本更新/提示词变更」设计质量漂移回归监测（固定回测集 + 基线 + 阈值 + 回滚动作），并说明幻觉率抽检的抽样逻辑。

### 前置知识

- w1-l2：token 计费模型与长会话成本结构（本节直接复用其公式）；
- w1-l5：固定测试集 + 客观指标的评估协议（本节把它变成生产上的回测集）；
- w6b-l6：规则漂移与回测治理（AI 初裁会退化，模型输出同样会）；
- l1：三支柱与 golden signals。

### 问题背景

传统可观测性有一个隐含假设：**同一个输入永远产生同一个输出**。部署之后，系统行为只随流量与代码变化——所以盯住流量、延迟、错误率就基本够用。LLM 应用打破了这个假设：模型供应商会静默更新模型、你自己会微调提示词、温度参数随手一改行为就变——**代码一行没动，系统行为却漂了**。

真实失败路径：某团队的数据抽取服务周二起格式有效率从 98% 滑到 89%，但所有响应都是 HTTP 200——按 l1 的说法这是「隐式错误」，golden signals 一项都没报警。三天后运营发现下游解析崩了才回溯。教训：**AI 应用必须给「输出质量」本身装度量，否则你在监控一个说谎的系统**。官方 Week 9 的嘉宾（Resolve AI）做的正是「AI 系统的运维自动化」这个方向——而它的前提就是你先把这些量度出来。

### 直觉理解

传统服务像一台固定的机器：今天产量多少、废品率多少，明天大概率一样。LLM 应用像雇了一个**手艺会悄悄变化的外包团队**：同样的活，这个月又快又好，下个月突然格式全变、话变多、偶尔一本正经地胡写。

所以除了传统监控（考勤：QPS/延迟），你要加三本新账：

- **墨水账（token）**：他这个月写了多少字？哪类活最费墨水？
- **钱账（成本）**：换算成账单是多少？哪类活最烧钱？
- **手艺账（质量）**：活儿还合格吗？跟上周比退步了吗？

三本账缺一本，都会在某天早上给你惊喜（惊吓）。

### 核心概念与原理详解

## 三类新度量总览

| 度量类 | 回答的问题 | 典型指标 | 采集点 |
| --- | --- | --- | --- |
| token / 成本 | 钱花在哪、花得值吗 | 每请求 token、每任务成本、任务分型占比 | API 响应的 usage 字段 → 计量管道 |
| 质量漂移 | 输出还合格吗 | 回测通过率、格式有效率、幻觉抽检命中数 | 固定回测集 + 线上抽样 |
| AI 故障信号 | 系统怎么坏的 | 延迟长尾（P99/P50 比）、首 token 延迟、超时重试率、空响应率 | 客户端 SDK 指标 + 网关日志 |

## token 消耗分布与成本画像

计费公式沿用 w1-l2：成本 = 输入 token × 输入单价 + 输出 token × 输出单价（按百万 token 计价）。单看平均值会掩盖结构：把请求按任务类型（抽取/摘要/审查）分桶统计后，常见结论是**少数「重任务」吃掉大半成本**——审查类可能只占 8% 的请求，却烧掉近一半的钱。

画像的用法：某类任务的 P95 单次成本环比翻倍 → 一定是提示词膨胀（上下文塞多了）或模型换版（输出啰嗦了）——两者都指向可修的根因。**成本指标在这里不只是花钱多少，还是行为变化的探测器。**

## 质量漂移监测：把 w1-l5 的测试集搬进生产

w1-l5 的评估协议（固定测试集 + 指标 + 控制变量）在生产上的名字叫**回测**：

1. **固定回测集**：20-50 个代表性输入 + 期望（格式/要点/判分规则），与代码一起进版本控制；
2. **触发时机**：模型版本变更（包括供应商静默更新——所以要监控响应里的 model 字段）、提示词修改、温度/参数调整——三者都按「部署」对待，都要跑回测；
3. **基线与阈值**：全量跑一遍，通过率/格式有效率与基线比较，掉超过 5 个百分点即触发回滚或人工评审；
4. **线上补充：幻觉抽检**——每天随机抽 N 条输出（如 50 条），规则校验（格式、引用是否存在）+ 评分模型初筛 + 人工复核，记录命中率趋势。**趋势比绝对值重要。**

这与 w6b-l6 的规则漂移回测是同一个思想在不同层的应用：**凡是「软规则」（提示词、模型、告警阈值）都会漂移，都要有回测。**

## AI 特有故障信号

- **延迟长尾**：生成是逐 token 进行的，P99 可能是 P50 的 10 倍；流式应用要单独监控**首 token 延迟（TTFT）**——用户体感的「快不快」主要由它决定；
- **超时重试风暴**：上游变慢 → 客户端超时重试 → 有效流量翻倍 → 更慢 → 更多重试。重试必须配指数退避 + 抖动 + 熔断；监控上要区分「重试流量」与「真实流量」（l1 流量信号的坑）；
- **空响应/截断**：max_tokens 设小了或模型输出空串——错误率不会动，质量会塌。

## LLM 应用的 golden signals 改造版

| 传统信号 | LLM 应用改造版 |
| --- | --- |
| 延迟 | P50/P99 + TTFT（首 token 延迟） |
| 流量 | QPS + token 吞吐（TPM）+ 重试流量占比 |
| 错误 | API 错误率 + **隐式错误率**（格式无效/空响应/抽检幻觉率） |
| 饱和度 | 预算消耗率（当日已花/日上限）、并发配额占用、上下文窗口占用率 |

## 成本熔断：预算上限 + 自动降级

w6b-l5 的资源维度（token 预算上限）在运维侧的完整形态：

- 给每个任务类设**日预算**（基于成本画像而不是拍脑袋）；
- 消耗达 80% → 告警（ticket）；达 100% → **自动降级**：切换小模型、缩短注入上下文、非关键任务进队列；
- 熔断不是失败，是**设计出来的行为**——降级路径要提前演练（就像消防演习）。

<Diagram type="factoryloop" />

把本节放回这张 Software Factory 闭环图看：线上度量（成本/质量/故障信号）是「度量」站点的输入，回测定位是「验证」，改提示词/换模型/调预算是「改进」，重新部署后再被度量。**注意 l2 的用法是单系统视角**：一个服务内部的度量闭环；l5 会回到这张图，展示全生命周期视角（生成→验证→运行的完整闭环），届时对照两处用法。

### 完整案例

服务：客服工单字段抽取（从工单文本抽日期/金额/诉求）。一周监控数据（简化）：

| 日期 | 请求数 | 平均输入 token | 平均输出 token | 格式有效率 |
| --- | --- | --- | --- | --- |
| 周一 | 5200 | 900 | 210 | 98.2% |
| 周二 | 5400 | 920 | 215 | 98.4% |
| 周三 | 5100 | 910 | 212 | 98.3% |
| 周四 | 5300 | 905 | 300 | 89.1% |
| 周五 | 5450 | 930 | 310 | 88.6% |

排查步骤：

1. **先问「变了吗」**（为什么先问这个？——质量漂移的三种来源里，供应商静默更新最常见也最容易被忽略）：查 API 响应里的 model 字段，发现周二深夜供应商把后端模型从 vX 升到了 vY——代码与提示词零变更；
2. **回测集定位**（为什么用回测集而不是看线上样本？——回测集有期望答案，能分类失败模式）：20 条回测样本通过率从 95% 掉到 70%，失败模式单一：输出前多了一段「好的，以下是抽取结果：」——新模型更「健谈」（输出 token +43% 是佐证）；
3. **修复**：提示词加硬约束「只输出 JSON，不要任何解释文字」，重跑回测集全绿后重新部署；把该失败模式加入回测集防复发；
4. **制度固化**：给 model 字段建监控（变化即 ticket）；格式有效率进 l3 的告警清单。

**自解释提示**：注意「输出 token +43%」这个信号——成本度量在这里帮质量定位了根因（模型变啰嗦了）。三本账互相佐证，比单看有效率定位快得多。

### 代码实践

下面的演示跑两部分：五天的成本与有效率漂移检测（复现上面的案例）；按任务分型的成本画像（展示「8% 请求烧一半钱」的结构）。

### 常见误区与安全风险

- **误区一：「API 返回 200 就是成功。」** 隐式错误（格式坏/空响应/幻觉）状态码都是 200。LLM 应用的错误率必须包含内容级判定，否则你监控的是传输层不是业务。
- **误区二：「质量抽检太主观，没法做。」** 三层抽样（规则校验格式 → 评分模型初筛 → 人工复核）把主观变成可执行；且趋势比绝对值重要——你不需要知道幻觉率是 1.2% 还是 1.5%，你需要知道它在涨。
- **误区三：「成本监控 = 月底看账单。」** 月账单是验尸报告。小时级、分任务型的画像才能在失控当天止血；日预算熔断才能在失控当小时止损。
- **安全提示**：为度量而记录的用户输入/输出日志本身就是敏感数据仓（PII）——采集范围与保留期要有边界；提示词与回复的日志是 l4 的取证材料，也可能成为注入载荷的载体；熔断与预算参数是运维配置，改它要走评审与权限（w6b-l5）——「把日预算改成 999999」本身就是一条高危变更。

### 知识关联：承上启下

- 承上：w1-l2 的计费模型、w1-l5 的评估协议、w6b-l6 的回测治理、l1 的三支柱与 golden signals；
- 启下：l3 把本节的质量/成本指标变成告警规则；l5 把度量收拢进运维原型并接上复盘；w4-l5 的信任校准在 l5 会用到本节攒下的运维数据。

### 动手实验

1. 运行下方演示，把周四的平均输出 token 从 300 改成 260 再跑，观察漂移判定如何变化；
2. 给你手头（或想象中的）一个 LLM 功能写出回测集的 5 条样本（输入 + 期望），并定一条漂移阈值。

### 本节总结

1. LLM 应用要加三本新账：token/成本、质量漂移、AI 故障信号——传统三支柱看不见它们；
2. 成本画像按任务分型：平均会掩盖「8% 请求烧一半钱」的结构；P95 成本突变指向提示词膨胀或模型换版；
3. 质量漂移靠回测：固定回测集 + 基线 + 阈值 + 回滚动作；模型字段变更、提示词变更都按「部署」对待；
4. golden signals 的 LLM 版：TTFT、重试流量、隐式错误率、预算消耗率；
5. 成本熔断（80% 告警 / 100% 自动降级）是设计出来的行为，降级路径要提前演练。

### 参考资料与延伸阅读

- [Google SRE Book](https://sre.google/sre-book/table-of-contents/)（官方 Week 9 指定阅读）——监控原则与 SLI/SLO：对应「golden signals 改造版」的传统侧依据；
- Observability Basics（官方 Week 9 阅读清单）——对应「三类新度量」的采集方法论；
- Resolve AI 博客（agentic DevOps 系列，官方 Week 9 嘉宾公司）——AI 系统运维自动化的工业实践：对应「问题背景」与 l4 的分诊话题；
- OpenAI / Anthropic 官方文档中 usage 字段与 rate limit 章节——token 计量与配额的采集点：对应「token/成本」模块；
- 本节三本账框架、五天漂移案例、分型画像与全部习题均为自主设计的原创教学内容（官方 week9 主题锚点：monitoring/observability for AI systems）。

### 本节习题导引

fill 校准三类新度量；single/judge 训练「隐式错误」眼光；code 题实现成本计算与有效率统计（空数据不装作全有效）；open 题设计完整的漂移监测方案。
`,
        tips: [
          { kind: 'pitfall', text: '模型输出 200 不等于成功：给「隐式错误率」（格式无效+空响应+抽检命中）单独建指标，它才是 AI 应用的真实错误率。' },
          { kind: 'performance', text: '监控响应里的 model 字段：供应商静默更新是质量漂移的头号来源，一行正则就能把「三天后才发现」变成「当天 ticket」。' },
          { kind: 'interview', text: '"AI 应用的运维和传统应用差在哪？"——答三本账（token/成本/质量漂移）+ 隐式错误 + 熔断降级，比背 golden signals 高一个档次。' },
          { kind: 'note', text: '回测集要跟着失败样本长大：每次线上失败模式分类后，挑代表样本进回测集——它是会呼吸的资产（w1-l5 协议的生产版）。' },
        ],
        demos: [
          {
            title: '成本画像与质量漂移检测（三本账的最小实现）',
            lang: 'python',
            code: `# ── 账本 1+2: 五天的成本与有效率漂移 (复现完整案例) ──
DAYS = [
    # (日期, 请求数, 平均输入token, 平均输出token, 格式有效率%)
    ("周一", 5200, 900, 210, 98.2),
    ("周二", 5400, 920, 215, 98.4),
    ("周三", 5100, 910, 212, 98.3),
    ("周四", 5300, 905, 300, 89.1),   # 异常: 输出token +43%, 有效率掉 9 个点
    ("周五", 5450, 930, 310, 88.6),
]
IN_PRICE, OUT_PRICE = 1.0, 3.0     # $/百万token (w1-l2 计费模型)
BASELINE, THRESHOLD = 98.2, 5.0    # 漂移判定: 低于基线 5 个点

print("日期   日成本($)  有效率   漂移判定")
for day, n, tin, tout, valid in DAYS:
    cost = n * tin / 1e6 * IN_PRICE + n * tout / 1e6 * OUT_PRICE
    flag = ""
    if valid < BASELINE - THRESHOLD:
        flag = "  <-- 质量漂移! 先查 model 字段, 再跑回测集"
    elif tout > 260:
        flag = "  <-- 输出膨胀, 检查提示词/模型版本"
    print(f"{day}  {cost:7.2f}  {valid:5.1f}%  {flag}")
print()

# ── 账本 3: 按任务分型的成本画像 (平均会掩盖结构) ──
TASKS = [
    # (任务类型, 请求占比, 单次平均成本$)
    ("抽取", 0.62, 0.0009),
    ("摘要", 0.30, 0.0016),
    ("审查", 0.08, 0.0120),
]
total = sum(share * unit for _, share, unit in TASKS)
print("任务类型  请求占比   成本占比")
for name, share, unit in TASKS:
    cost_share = share * unit / total
    bar = "#" * round(cost_share * 30)
    print(f"{name}      {share:>5.0%}     {cost_share:>5.0%}   {bar}")
print("审查类只占 8% 请求, 却烧掉近半成本 -- 分型画像才看得见这种结构")

# 观察点: 周四有效率跌破 93.2% 触发漂移判定, 同时输出 token 暴涨 --
# 两本账互相佐证, 根因指向"模型变啰嗦"(见完整案例)`,
          },
        ],
      },

      /* ─────────────────────────── l3 ─────────────────────────── */
      {
        id: 'cs146s-w9-l3',
        title: '告警设计：别让值班员学会忽略你',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 用告警三要素（症状优先于原因、可执行性、静默期）评审一条坏告警并完成改写；
2. 解释告警疲劳的形成机制，用「行动率/误报率」量化它，并给出治理动作（与 w6b-l6 的规则漂移治理同构）；
3. 定义 SLI / SLO / error budget，写出错误预算耗尽时的动作约定，并按 page / ticket / log 三级为一批告警分级、设计升级链。

### 前置知识

- l1：golden signals（告警的对象）与直方图/比率基元；
- l2：LLM 应用的隐式错误率与预算消耗率（它们会出现在你的告警规则里）；
- w6b-l6：规则漂移与回测治理——告警规则也是「软规则」，也会漂移。

### 问题背景

告警系统有个悖论：**它最吵的时候最危险**。值班员被「CPU 超过 80%」的告警骚扰 20 次而每次都没事之后，第 21 次（真着火）也会顺手划掉——这不是态度问题，是条件反射，是统计必然。Google SRE 对此的立场极其明确：**每一次 page 都在打断一个人的生活，所以每条 page 都必须值得这次打断**。

失败路径很固定：团队把「所有看起来重要的指标」都配上告警 → 值班员学会忽略 → 真告警被淹没在噪音里 → 大事故。修复方案不是调灵敏度，而是把告警当产品来设计：有要素、有分级、有预算、有治理。

### 直觉理解

家庭烟雾报警器的教训：装在炒菜灶正上方的报警器，每炒一次辣椒就尖叫一次——三个月后你拔掉电池，深夜真起火时全楼在睡。**报警器没坏，坏的是它对噪音和对火灾一样大声。**

大楼消防系统的做法值得抄：

- 真烟（多个探测器同时确认 + 持续一段时间）→ 全楼警铃（page）；
- 单个探测器误报 → 物业巡检单（ticket）；
- 一切读数 → 后台记录（log）。

对应到服务：**多窗口确认 = 静默期，症状 = 烟而不是温度，分级 = 警铃 / 巡检单 / 记录**。

### 核心概念与原理详解

## 告警三要素

| 要素 | 判据 | 反例 |
| --- | --- | --- |
| 症状优先于原因 | 告警「用户可感知的症状」（错误率、延迟、有效率）；原因信号只做辅助定位 | 「CPU > 80% 就 page」——CPU 高可能只是编译任务，用户毫无感知 |
| 可执行性 | 响警的人有明确动作：查 runbook、回滚、扩容 | 「磁盘增长异常」（然后呢？）——没有动作的告警删掉 |
| 静默期（for/duration） | 瞬时抖动不 page，持续 N 分钟才响 | 单分钟尖峰直接打电话——大部分是抖动 |

快速自查：**「这条告警半夜把人叫醒后，他做的第一件事是什么？」**答不出具体动作 → 不配是 page（降级或删除）。

## 告警疲劳的量化与治理

把告警规则当成一个分类器来度量：

- **行动率（action rate）**：过去 30 天里，响了的告警中有多少比例真的需要人动手？低于约 50% 说明规则在「狼来了」；
- **误报率漂移**：系统演化（流量结构变了、容量扩了）会让昨天准确的阈值今天失准——这与 w6b-l6 的规则漂移完全同构，治理动作也同构：**记录每次 page 的处置结果 → 月度回测 → 行动率低的规则修剪**。

治理四动作：**删**（无动作价值）、**降级**（page→ticket）、**合并**（同一根因的多个告警）、**调静默期**（抖动源）。给告警做减法是值班员的福利，也是真告警的生存权。

## SLO / SLI / error budget 入门

- **SLI（服务等级指标）**：你度量的成功比例，如「5 分钟窗口内非 5xx 请求占比」「格式有效率」；
- **SLO（目标）**：给 SLI 定的目标，如 99.9%；
- **error budget（错误预算）**：100% − SLO = 0.1%，28 天折合约 40 分钟的完全不可用——这是「允许失败」的额度。

错误预算的价值在**耗尽时的动作约定**：预算烧完 → 冻结功能发布，工程时间全部投向可靠性，直到预算回正。这条约定要提前由产品与工程共同签认——它是决策规则，不是心情，更不是 KPI。反过来，预算充足时团队应当大胆发布：**预算是给创新花的钱，不是给运维背的锅。**

## 告警分级与升级链

| 级别 | 触发标准 | 通知方式 | 响应时限 | 例子 |
| --- | --- | --- | --- | --- |
| page | 用户正在受损（错误率烧穿预算、数据丢失风险） | 电话/强推送 | 立即认领 | 错误率 10 倍燃烧率持续 5 分钟 |
| ticket | 需要今天处理，但不烧预算 | 工单/群消息 | 当天 | 磁盘 70% 且增长趋势；预算消耗 80% |
| log | 仅供排查与统计 | 仪表盘 | 无 | 单次重试成功、单分钟抖动 |

升级链：page 发出 15 分钟无人认领 → 自动升级到备份值班 → 30 分钟 → 升级到主管。**升级链的意义：让「没人管」变成系统的属性，而不是个人的失职。**

## AI 应用的告警特别条款

l2 的指标直接进入分级：格式有效率跌破基线 5 个点 → page（隐式错误是用户可感知的症状）；日预算消耗 80% → ticket；单次幻觉抽检命中 → log（样本太小，看趋势不告警）。

### 完整案例

同一个故障（数据库连接池耗尽 → 错误率 5%）的两套告警方案对比。

**坏方案（02:14 的三连响）**：

1. CPU > 80% → page。实际 CPU 60%，没响——白配；
2. 内存 > 70% → page。响了，但内存高是结果不是原因，值班员看了十分钟没有任何动作；
3. 「连接数异常」→ page。响了，但「异常」没有定义，runbook 里没有这个条目。

结果：三个 page，零个可执行，真症状（用户报错）反而没有告警——是第二天客服转来的。

**好方案**：

1. **症状 page**：「5 分钟窗口 5xx 错误率 > 1%（SLO 99.9% 的 10 倍燃烧率）持续 5 分钟」→ 响，附 runbook 链接（第一步：查连接池使用率）；
2. **原因 ticket**：「连接池使用率 > 90% 持续 10 分钟」→ 工单，供定位，不叫醒人；
3. **静默期生效**：02:09 的一次单分钟尖峰被 5 分钟静默期吞掉，没有 page。

**自解释提示**：为什么原因告警不删而降级？——它对定位有价值，只是不值得半夜叫醒人。分级本质上是在给信号定价：page 的价格是一次人生打断，症状配得上，原因配不上。

### 代码实践

下面的「告警评估器」把三要素落成代码：症状规则（错误率对 10 倍燃烧率）、静默期（连续 N 个窗口超标才响）、错误预算用量统计。输入是一串每分钟窗口，输出每次评估的动作——注意单分钟尖峰如何被静默期吞掉。

### 常见误区与安全风险

- **误区一：「告警越灵敏越安全。」** 灵敏 = 吵 = 被忽略。安全来自分级与静默期，不是全局调高敏感度。
- **误区二：「错误预算是 SRE 团队的 KPI。」** 它是产品与工程共同签认的决策规则（预算内快跑，预算外冻结发布）。把它变成单团队 KPI 会催生「藏错误」的行为——与 w6b-l6「指标被考核就会表演」是同一个陷阱。
- **误区三：「AI 应用不稳定，没法定 SLO。」** 更需要。SLO 定义在「下游可用的成功」上（格式有效率、抽检合格率），而不是「模型说了话」。不稳定恰恰是你要度量和收敛的东西。
- **安全提示：告警通道是注入面。** 告警正文里拼接用户输入（失败的请求 URL、消息内容）= 把载荷送进值班员的终端、手机与后续的 Agent 分诊上下文（l4 展开）——告警模板要白名单字段化；告警 webhook 凭据泄漏可被用来制造「狼来了」疲劳攻击：先人为制造噪音让团队麻木，再发动真攻击——告警通道的凭据按生产凭据管理。

### 知识关联：承上启下

- 承上：l1 的 golden signals 与比率/直方图、l2 的质量与成本指标、w6b-l6 的规则漂移治理；
- 启下：l4 的事件响应从「告警已响」开始——分诊流水线的第一站消费的就是本节分好级的告警；l5 原型里的 AlertEvaluator 是本节评估器的组件化。

### 动手实验

1. 运行下方评估器，找到 page 触发的那一分钟，数一数静默期此前吞掉了几次瞬时尖峰；
2. 翻一翻你（或所在团队）现在收到的告警，用三要素逐条评审：几条能活下来？把结论写进学习笔记。

### 本节总结

1. 告警三要素：症状优先于原因、可执行性（答不出第一动作就删）、静默期；
2. 告警疲劳可量化：行动率低于约 50% 的规则要修剪——治理与 w6b-l6 规则漂移同构（记录→回测→修剪）；
3. SLI 定度量、SLO 定目标、error budget 定「允许失败」额度；预算耗尽 → 冻结发布，这是提前签认的决策规则；
4. 分级 page / ticket / log 是给信号定价；升级链让「没人管」变成系统属性；
5. AI 应用特别条款：隐式错误率可 page，预算消耗 80% 是 ticket，单次抽检命中只记 log。

### 参考资料与延伸阅读

- [Google SRE Book — Alerting on SLOs](https://sre.google/sre-book/alerting-on-slos/)（官方 Week 9 指定阅读）——多窗口燃烧率告警的原始方法：对应「错误预算」与「症状优先」模块；
- [Google SRE Book — Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/)——「每条 page 都必须值得打断」的立场：对应全节；
- [Prometheus 官方文档 — Alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)（for 子句即静默期的工程实现）——对应「静默期」模块；
- Observability Basics（官方 Week 9 阅读清单）——对应「告警的对象」；
- 本节三要素表、双方案对比案例、评估器 demo 与全部习题均为自主设计的原创教学内容。

### 本节习题导引

fill 校准三要素与错误预算；single/judge 训练「症状 vs 原因」的分辨力；code 题实现窗口评估器（分级 + 预算余量）；open 题为一个 AI API 设计完整告警方案。
`,
        tips: [
          { kind: 'pitfall', text: '给每条 page 告警写「响后第一动作」：写不出就降级或删除——可执行性不是锦上添花，是告警的准入门槛。' },
          { kind: 'performance', text: '症状规则用「多窗口 + 燃烧率」（错误率超 SLO 的 10 倍持续 5 分钟）比绝对阈值抗噪得多：抖动过不去静默期，真故障跑不掉。' },
          { kind: 'interview', text: '"错误预算是什么、烧完了怎么办？"——答 100%-SLO 的失败额度 + 预先签认的冻结发布约定，并补一句"预算充足时应鼓励发布"，是完整的 SRE 答案。' },
          { kind: 'leak', text: '告警模板里拼用户输入（URL/消息体）等于把注入载荷送进值班员手机与 Agent 分诊上下文：告警文案一律白名单字段化。' },
        ],
        demos: [
          {
            title: '告警评估器：症状规则 + 静默期 + 错误预算',
            lang: 'python',
            code: `# 症状规则 + 静默期 + 错误预算的最小评估器
SLO = 0.999                    # 目标: 99.9% 成功
BURN = 10                      # 10 倍燃烧率: 错误率 > (1-SLO)*10 才算超标
QUIET = 5                      # 静默期: 连续 5 个窗口超标才 page
ALLOW_RATE = 1 - SLO           # 0.001

# 每分钟窗口: (请求数, 错误数)
STREAM = [
    (10000, 3), (10000, 2), (10000, 4), (10000, 2),   # 健康
    (10000, 300),                                     # 单分钟尖峰(抖动)
    (10000, 2), (10000, 3),                           # 恢复
    (10000, 420), (10000, 450), (10000, 430),         # 持续超标...
    (10000, 440), (10000, 410),                       # ...第 5 个窗口触发
    (10000, 2),                                       # 缓解后恢复
]

run = 0        # 连续超标计数(静默期)
fired = False
for i, (total, errors) in enumerate(STREAM, 1):
    rate = errors / total
    if rate > ALLOW_RATE * BURN:              # 症状规则: 错误率
        run += 1
        if run >= QUIET and not fired:
            print(f"min{i:02d}  rate={rate:.1%}  连续超标 {run} 窗口 -> PAGE (附 runbook 链接)")
            fired = True
        else:
            print(f"min{i:02d}  rate={rate:.1%}  静默期计数 {run}/{QUIET}")
    else:
        if run:
            print(f"min{i:02d}  rate={rate:.1%}  恢复, 静默期计数清零")
        run = 0

tot = sum(t for t, _ in STREAM)
err = sum(e for _, e in STREAM)
used = err / (tot * ALLOW_RATE)
print()
print(f"本期总请求 {tot}, 总错误 {err}")
print(f"错误预算用量: {used:.1f} 倍 (28 天预算折算允许 {tot * ALLOW_RATE:.0f} 个错误)")
print("预算已透支 -> 按约定: 冻结功能发布, 全力可靠性 (l3 正文)")

# 观察点: min05 的单分钟尖峰只让计数走到 1/5 就被清零 -- 静默期吞掉抖动;
# min12 连续第 5 个窗口超标才 PAGE -- 症状 + 多窗口确认, 一次人生打断都值得`,
          },
        ],
      },
    ],
    exercises: [
      /* ───────── l1 习题（6 题）───────── */
      {
        id: 'cs146s-w9-l1-e1', type: 'single', difficulty: 1, relatedLessonId: 'cs146s-w9-l1', tags: ['K', 'observability'],
        question: '排障时，「请求在哪个服务上多花了时间」这个问题主要由哪根支柱回答？',
        options: [
          { value: 'a', text: 'metrics——数值时间序列，负责发现' },
          { value: 'b', text: 'logs——离散事件记录，负责取证' },
          { value: 'c', text: 'traces——请求级因果链，负责定位' },
          { value: 'd', text: '三根支柱都回答不了，只能重启' },
        ],
        answer: 'c',
        explanation: '「时间花在哪」是 traces 的主场：把请求切开成 span 瀑布，堵点一目了然。metrics 只能告诉你「慢了」，logs 只能在已知范围内取证。',
      },
      {
        id: 'cs146s-w9-l1-e2', type: 'judge', difficulty: 1, relatedLessonId: 'cs146s-w9-l1', tags: ['U', 'observability'],
        question: '平均延迟是最能反映用户体验的延迟指标。',
        answer: false,
        explanation: '平均值会吞掉长尾：990 个 50ms + 10 个 10s 的平均只有 149ms，但 P99 = 10s——最惨的 1% 用户在平均值里隐身。用户体感一律看分位数（P50/P95/P99），这要求延迟必须用直方图存储。',
      },
      {
        id: 'cs146s-w9-l1-e3', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w9-l1', tags: ['K', 'slo'],
        question: 'Google SRE 的四个 golden signals：______、流量、______、饱和度。',
        blanks: [['延迟', 'latency'], ['错误', '错误率', 'errors']],
        explanation: '四件套覆盖了用户可感知症状的全部主面：多快（延迟）、多少（流量）、坏多少（错误）、资源多满（饱和度）。l2 会给出 LLM 应用的改造版。',
      },
      {
        id: 'cs146s-w9-l1-e4', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-w9-l1', tags: ['U', 'observability'],
        question: '关于结构化日志，下列说法正确的有？',
        options: [
          { value: 'a', text: '一行一个 JSON 事件、字段 schema 稳定，适合机器消费' },
          { value: 'b', text: '带 trace_id 等关联 ID，能把日志与追踪缝在一起' },
          { value: 'c', text: '内容越全越好，敏感信息先记下来再说' },
          { value: 'd', text: '是 l4 Agent 辅助分诊的前提输入' },
        ],
        answer: ['a', 'b', 'd'],
        explanation: 'c 是安全反模式：日志是敏感数据的永久档案（会被复制进聚合系统与备份），脱敏必须在写入前完成。a/b/d 分别对应结构化日志的价值、关联能力与 AI 时代的新理由。',
      },
      {
        id: 'cs146s-w9-l1-e5', type: 'code', difficulty: 2, relatedLessonId: 'cs146s-w9-l1', tags: ['D', 'observability'],
        question: '实现 `nearest_rank(sorted_vals, p)`：最近邻秩法取百分位（rank = ceil(p/100 × n)，返回第 rank 小的元素，输入已升序）；实现 `error_rate(total, errors)`：errors/total，total 为 0 时返回 0.0（不能除零），结果保留 4 位小数。',
        lang: 'python',
        starterCode: `import math

def nearest_rank(sorted_vals, p):
    # rank = ceil(p/100 * n), 返回第 rank 小(1-based)
    pass

def error_rate(total, errors):
    # total=0 时返回 0.0; 结果保留 4 位小数
    pass

lat = [60, 80, 95, 120, 900, 1100, 1300]
print(nearest_rank(lat, 50))
print(nearest_rank(lat, 99))
print(error_rate(10000, 25))
print(error_rate(0, 0))`,
        expectedOutput: `120
1300
0.0025
0.0`,
        tests: `import math
assert nearest_rank([1, 2, 3, 4], 50) == 2, "rank=ceil(2)=2, 取第2小"
assert nearest_rank([10, 20, 30], 99) == 30, "rank=ceil(2.97)=3"
assert nearest_rank([5], 50) == 5, "单元素边界"
assert error_rate(1000, 5) == 0.005
assert error_rate(0, 0) == 0.0, "无请求时不能除零"
assert error_rate(3, 1) == 0.3333, "保留4位小数"`,
        allowedModules: ['math'],
        explanation: '最近邻秩法的核心是 rank 从 1 数起（ceil 后减 1 再索引）；error_rate 的 total=0 分支是运维工具的基本素养——「没有请求」和「错误率 0%」必须显式区分，不能靠异常兜底。',
        answer: `import math

def nearest_rank(sorted_vals, p):
    rank = math.ceil(p / 100 * len(sorted_vals))
    return sorted_vals[rank - 1]

def error_rate(total, errors):
    if total == 0:
        return 0.0
    return round(errors / total, 4)

lat = [60, 80, 95, 120, 900, 1100, 1300]
print(nearest_rank(lat, 50))
print(nearest_rank(lat, 99))
print(error_rate(10000, 25))
print(error_rate(0, 0))`,
      },
      {
        id: 'cs146s-w9-l1-e6', type: 'open', difficulty: 3, relatedLessonId: 'cs146s-w9-l1', tags: ['D', 'observability'],
        question: '为「图片上传服务」（客户端上传 → 病毒扫描 → 缩略图生成 → 写对象存储）设计三支柱埋点清单：logs 事件至少 3 条、metrics 指标至少 3 条（其中必须含一个直方图与一个比率）、traces span 至少 3 个；最后写出排障动线（发现/定位/取证各用什么）。要求至少一处体现「隐式错误」意识。',
        referenceAnswer: `埋点清单（示例，答案不唯一但结构须完整）：

| 支柱 | 清单项 |
| --- | --- |
| logs 事件 | ① upload_done（ts/level/event/user_id/file_size/trace_id）；② scan_reject（病毒扫描拒绝原因分类）；③ thumbnail_failed（失败原因/重试次数/trace_id） |
| metrics 指标 | ① 直方图：上传端到端耗时分布（算 P50/P95/P99）；② 直方图或 counter：文件大小分布；③ 比率：上传成功率 = 成功数/总请求数；④ 比率：缩略图成功率（隐式错误主战场） |
| traces span | upload接收 → 病毒扫描 → 缩略图生成 → 对象存储写入，四个 span 挂在同一 trace 下 |

排障动线：metrics 发现——成功率与 P99 仪表盘先报警（发现）；traces 定位——慢/失败请求的瀑布里看堵在扫描还是缩略图（定位）；logs 取证——用 span 的 trace_id 查 thumbnail_failed 的事件详情（取证）。

隐式错误示范：病毒扫描通过、返回 200，但缩略图生成失败/产出 0 字节文件——传输层全绿、业务已坏。所以「缩略图成功率」必须作为独立比率存在，否则这类故障不可见。`,
        rubric: [
          { point: '三支柱各给出至少 3 项且与上传链路的各环节匹配（不是泛泛的「记日志」）', score: 4 },
          { point: 'metrics 正确用上直方图（耗时/大小分布）与比率（成功率）', score: 2 },
          { point: '排障动线按发现→定位→取证组织，且每步指明支柱与理由', score: 2 },
          { point: '至少一处显式处理隐式错误（如缩略图损坏但状态码 200）', score: 2 },
        ],
        keywords: ['metrics', 'logs', 'traces', '直方图', 'trace_id'],
        explanation: '判卷要点看两项：埋点是否与业务环节一一对应（泛化清单不得分），以及有没有跳出「状态码 = 健康」的传输层视角——隐式错误意识是 l2 的伏笔。',
      },

      /* ───────── l2 习题（8 题）───────── */
      {
        id: 'cs146s-w9-l2-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w9-l2', tags: ['K', 'cost'],
        question: 'LLM 应用的三类新度量：token 消耗与______画像、质量______监测（回测集 + 基线 + 阈值）、AI 特有______信号（延迟长尾/超时重试/空响应）。',
        blanks: [['成本', '费用', 'cost'], ['漂移', 'drift'], ['故障', 'failure']],
        explanation: '三本账：墨水账（token）、钱账（成本）、手艺账（质量）。传统三支柱看不见它们，必须从 usage 字段、回测集与 SDK 指标另行采集。',
      },
      {
        id: 'cs146s-w9-l2-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w9-l2', tags: ['U', 'observability'],
        question: '下列哪个属于「隐式错误」？',
        options: [
          { value: 'a', text: '网关返回 502 Bad Gateway' },
          { value: 'b', text: '模型返回 HTTP 200，但输出不是合法 JSON，下游解析失败' },
          { value: 'c', text: '数据库连接超时抛出异常' },
          { value: 'd', text: '进程内存耗尽崩溃重启' },
        ],
        answer: 'b',
        explanation: '隐式错误的定义：传输层成功（200）但内容不达标。a/c/d 都是显式错误，会被传统错误率捕捉；b 恰恰是 AI 应用错误率的主体，必须靠内容级判定才能看见。',
      },
      {
        id: 'cs146s-w9-l2-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w9-l2', tags: ['U', 'cost'],
        question: '成本监控月底看一次账单就够了。',
        answer: false,
        explanation: '月账单是验尸报告：发现失控时损失已成定局。必须做小时级、按任务分型的画像（失控当天止血），并配日预算熔断（失控当小时止损）。',
      },
      {
        id: 'cs146s-w9-l2-e4', type: 'multiple', difficulty: 3, relatedLessonId: 'cs146s-w9-l2', tags: ['U', 'slo'],
        question: '关于 golden signals 的 LLM 应用改造版，下列说法正确的有？',
        options: [
          { value: 'a', text: '流式应用的「快」主要由首 token 延迟（TTFT）决定，要单独监控' },
          { value: 'b', text: '错误率必须包含隐式错误率（格式无效/空响应/抽检幻觉率）' },
          { value: 'c', text: '饱和度可以用「当日预算消耗率」表达' },
          { value: 'd', text: '重试流量应计入真实用户流量，不必区分' },
        ],
        answer: ['a', 'b', 'c'],
        explanation: 'd 反了：重试风暴会把流量放大数倍，混入真实流量会让容量判断与告警全部失真——必须区分。a/b/c 分别对应延迟、错误、饱和度三个信号的改造。',
      },
      {
        id: 'cs146s-w9-l2-e5', type: 'code', difficulty: 2, relatedLessonId: 'cs146s-w9-l2', tags: ['D', 'cost'],
        question: '实现 `cost_of(requests, tokens_in_avg, tokens_out_avg, in_price=1.0, out_price=3.0)`：按 w1-l2 计费模型（输入/输出分别按百万 token 单价计）计算一批请求的美元成本，保留 4 位小数；实现 `valid_rate(flags)`：flags 是 True/False 列表，返回格式有效率（保留 4 位小数），空列表返回 None（没有数据不等于全部有效）。',
        lang: 'python',
        starterCode: `def cost_of(requests, tokens_in_avg, tokens_out_avg, in_price=1.0, out_price=3.0):
    # 成本 = 输入token总量/1e6*in_price + 输出token总量/1e6*out_price
    pass

def valid_rate(flags):
    # flags: [True/False]; 空列表返回 None(没有数据 != 全部有效)
    pass

print(cost_of(1000, 900, 210))
print(cost_of(1, 500, 100, in_price=2.0, out_price=6.0))
print(valid_rate([True, True, False, True]))
print(valid_rate([]))`,
        expectedOutput: `1.53
0.0016
0.75
None`,
        tests: `assert cost_of(1000, 900, 210) == 1.53, "1000请求x(900入/210出)按1/3美元每百万"
assert cost_of(1, 500, 100, in_price=2.0, out_price=6.0) == 0.0016
assert valid_rate([True, True, False, True]) == 0.75
assert valid_rate([]) is None, "没有数据不能装作 100% 有效"
assert valid_rate([False]) == 0.0`,
        allowedModules: [],
        explanation: '计费公式是 w1-l2 成本模型的批量化：requests × 平均 token / 1e6 × 单价。valid_rate 的空列表分支呼应 l5 的「没有数据 ≠ 数据正常」：监控函数对空输入装作全绿是最危险的假阴性。',
        answer: `def cost_of(requests, tokens_in_avg, tokens_out_avg, in_price=1.0, out_price=3.0):
    total_in = requests * tokens_in_avg
    total_out = requests * tokens_out_avg
    return round(total_in / 1e6 * in_price + total_out / 1e6 * out_price, 4)

def valid_rate(flags):
    if not flags:
        return None
    return round(sum(1 for f in flags if f) / len(flags), 4)

print(cost_of(1000, 900, 210))
print(cost_of(1, 500, 100, in_price=2.0, out_price=6.0))
print(valid_rate([True, True, False, True]))
print(valid_rate([]))`,
      },
      {
        id: 'cs146s-w9-l2-e6', type: 'fill', difficulty: 2, relatedLessonId: 'cs146s-w9-l2', tags: ['K', 'ops'],
        question: '成本熔断的两档动作：某任务类日预算消耗达 ______% 触发告警（ticket），达 ______% 自动降级（换小模型/缩短上下文/进队列）。',
        blanks: [['80', '八十'], ['100', '百']],
        explanation: '80/100 两档来自「留缓冲 + 硬闸门」：80% 时人还有介入窗口，100% 时系统自动降级不等人。降级路径要提前演练——熔断是设计出来的行为，不是事故。',
      },
      {
        id: 'cs146s-w9-l2-e7', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w9-l2', tags: ['U', 'observability'],
        question: '格式有效率从 98% 滑到 89%，而你的代码与提示词本周零变更。值班工程师的第一步应该是什么？',
        options: [
          { value: 'a', text: '立刻回滚自己上一版代码' },
          { value: 'b', text: '查 API 响应里的 model 字段确认供应商是否换了模型，然后跑固定回测集分类失败模式' },
          { value: 'c', text: '把 temperature 调高试试' },
          { value: 'd', text: '在群里通知用户系统不稳定' },
        ],
        answer: 'b',
        explanation: '质量漂移三大来源：供应商静默更新、提示词变更、参数调整。零变更时首选怀疑前者——model 字段是唯一证据，回测集（有期望答案）是唯一的失败模式分类器。a 无的可回滚，c 是玄学，d 是甩锅。',
      },
      {
        id: 'cs146s-w9-l2-e8', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w9-l2', tags: ['D', 'observability'],
        question: '为「会议纪要摘要服务」（输入长文本，输出结构化摘要）设计质量漂移监测方案：① 回测集构成（条数、选取标准、存放在哪）；② 两个可自动判定的质量指标（名称 + 判定方法）；③ 漂移阈值与触发后的动作序列；④ 幻觉抽检的抽样与分层判定流程。',
        referenceAnswer: `① 回测集：30 条左右；选取标准覆盖——典型会议（站会/评审/全员大会）、多说话人纠缠、含数字与决议项、故意含无关闲聊的干扰样本；每条附期望要点清单；与代码一起进版本控制（改动要走 PR）——它是资产不是临时文件。

② 指标（均可自动判定）：
- 格式有效率：输出能被 schema 解析（json schema 校验通过率）；
- 要点召回率：人工标注每条样本的 3-5 个关键决议点，自动比对输出是否覆盖（关键词/语义匹配均可），算平均召回。

③ 阈值与动作：任一指标较基线（回测集历史均值）下降超过 5 个百分点 → 动作序列：查 model 字段与近 72h 变更清单 → 失败样本分类（格式坏/要点漏/编造）→ 按类别修（提示词约束/换模型/加后处理校验）→ 重跑回测集全绿 → 记录变更与数据（w1-l5 纪律）。修复期间可回滚上一版提示词。

④ 幻觉抽检：每天随机抽 50 条线上输出；分层判定——第一层规则（输出中的决议项、时间、人名是否在原文出现过，机器可判）→ 第二层评分模型初筛「是否有原文不支持的断言」→ 第三层人对第二层命中的复核；记录日命中率趋势，连续 3 天上升即 ticket（单日波动不告警）。`,
        rubric: [
          { point: '回测集构成具体：数量、选取标准覆盖边界样本、进版本控制', score: 2 },
          { point: '两个指标均可自动判定（写明判定方法，不是「看输出好不好」）', score: 2 },
          { point: '阈值明确且动作序列完整（定位→分类修复→回测验证→记录）', score: 3 },
          { point: '抽检流程含抽样量、三层判定与趋势视角（不告警单日波动）', score: 3 },
        ],
        keywords: ['回测集', '基线', '阈值', '抽检', '回滚'],
        explanation: '方案的灵魂是「可自动判定」与「趋势视角」：凡是写「人工评估质量」而无判定方法的、写「命中率超阈值就告警」而不看趋势的，都停留在感觉层。',
      },

      /* ───────── l3 习题（8 题）───────── */
      {
        id: 'cs146s-w9-l3-e1', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w9-l3', tags: ['K', 'alert'],
        question: '告警三要素：______优先于原因、可执行性、______期（瞬时抖动不告警）。',
        blanks: [['症状', 'symptom'], ['静默', 'silence']],
        explanation: '三要素是告警的准入门槛：症状保证「响了就值得看」，可执行性保证「看了有动作」，静默期保证「动作不被抖动消耗」。',
      },
      {
        id: 'cs146s-w9-l3-e2', type: 'single', difficulty: 2, relatedLessonId: 'cs146s-w9-l3', tags: ['U', 'alert'],
        question: '下列哪条是合格的「症状告警」？',
        options: [
          { value: 'a', text: 'CPU 使用率超过 80%' },
          { value: 'b', text: '连接池使用率 90%' },
          { value: 'c', text: '5 分钟窗口 5xx 错误率 2%（SLO 允许 0.1%）' },
          { value: 'd', text: '每日构建耗时上升 10%' },
        ],
        answer: 'c',
        explanation: '症状 = 用户可感知（错误率直接描述「用户正在受损」）。a/b/d 都是原因或趋势信号：它们对定位有价值，但配置成 page 就是把「可能有问题」当成「用户在受损」。',
      },
      {
        id: 'cs146s-w9-l3-e3', type: 'judge', difficulty: 2, relatedLessonId: 'cs146s-w9-l3', tags: ['U', 'alert'],
        question: 'CPU 使用率高说明系统可能有问题，所以 CPU 超过 80% 就应该直接 page 值班员。',
        answer: false,
        explanation: 'CPU 高是原因信号不是症状：可能只是编译任务。原因是辅助定位用的，配 ticket 甚至只记 log；page 必须留给用户可感知的症状（错误率/延迟），否则就是告警疲劳的起点。',
      },
      {
        id: 'cs146s-w9-l3-e4', type: 'multiple', difficulty: 2, relatedLessonId: 'cs146s-w9-l3', tags: ['U', 'alert'],
        question: '治理告警疲劳的正确动作有哪些？',
        options: [
          { value: 'a', text: '记录每次 page 的处置结果，月度统计行动率' },
          { value: 'b', text: '行动率低于约 50% 的规则修剪：调静默期、降级或删除' },
          { value: 'c', text: '把所有告警阈值调得更敏感，确保不漏报' },
          { value: 'd', text: '同一根因触发的多个告警合并成一个' },
        ],
        answer: ['a', 'b', 'd'],
        explanation: 'c 恰恰是疲劳的制造机：更敏感 = 更吵 = 更多真告警被忽略。治理的方向是给告警做减法（删/降级/合并/调静默期），用行动率数据驱动。',
      },
      {
        id: 'cs146s-w9-l3-e5', type: 'code', difficulty: 3, relatedLessonId: 'cs146s-w9-l3', tags: ['D', 'slo'],
        question: '实现 `evaluate_window(total, errors, slo=0.999)`，返回元组 (level, error_rate, budget_left)：error_rate = errors/total 保留 4 位小数（total=0 时为 0.0）；allowed = total × (1 - slo) 为该窗口按 SLO 允许的错误数；budget_left = round(allowed - errors, 1)（负数表示超支）；分级：errors > allowed 为 page，errors > allowed/2 为 ticket，否则 log（total=0 时恒为 log）。',
        lang: 'python',
        starterCode: `def evaluate_window(total, errors, slo=0.999):
    # 返回 (level, error_rate, budget_left)
    pass

print(evaluate_window(10000, 200))
print(evaluate_window(10000, 8))
print(evaluate_window(10000, 3))
print(evaluate_window(0, 0))`,
        expectedOutput: `('page', 0.02, -190.0)
('ticket', 0.0008, 2.0)
('log', 0.0003, 7.0)
('log', 0.0, 0.0)`,
        tests: `assert evaluate_window(10000, 200) == ('page', 0.02, -190.0), "200>10: page, 预算超支190"
assert evaluate_window(10000, 8) == ('ticket', 0.0008, 2.0), "8>允许额一半5: ticket"
assert evaluate_window(10000, 3) == ('log', 0.0003, 7.0)
assert evaluate_window(0, 0) == ('log', 0.0, 0.0), "无请求: 不告警也不除零"
assert evaluate_window(100, 2, slo=0.99) == ('page', 0.02, -1.0), "自定义SLO: allowed=1, errors=2"`,
        allowedModules: [],
        explanation: '分级规则把「SLO 相对量」变成「绝对可判」：page 意味着错误数已超 SLO 允许额，ticket 意味着过半——这与 demo 里 10 倍燃烧率的思想同源（症状相对预算而非绝对阈值）。total=0 的分支再次强调：没有数据 ≠ 正常。',
        answer: `def evaluate_window(total, errors, slo=0.999):
    if total == 0:
        return ('log', 0.0, 0.0)
    rate = round(errors / total, 4)
    allowed = total * (1 - slo)
    left = round(allowed - errors, 1)
    if errors > allowed:
        level = 'page'
    elif errors > allowed / 2:
        level = 'ticket'
    else:
        level = 'log'
    return (level, rate, left)

print(evaluate_window(10000, 200))
print(evaluate_window(10000, 8))
print(evaluate_window(10000, 3))
print(evaluate_window(0, 0))`,
      },
      {
        id: 'cs146s-w9-l3-e6', type: 'fill', difficulty: 1, relatedLessonId: 'cs146s-w9-l3', tags: ['K', 'slo'],
        question: 'SLO 99.9% 对应 28 天错误预算约 ______ 分钟的完全不可用；预算耗尽后的约定动作是______功能发布，工程时间全力投向可靠性。',
        blanks: [['40', '40分钟', '四十'], ['冻结', '暂停', '停止']],
        explanation: '28 天 × 24 × 60 × 0.1% ≈ 40 分钟。关键不是数字而是「约定在先」：冻结发布是产品与工程提前签认的决策规则，不是事故后的临时心情。',
      },
      {
        id: 'cs146s-w9-l3-e7', type: 'single', difficulty: 3, relatedLessonId: 'cs146s-w9-l3', tags: ['U', 'ops'],
        question: '「磁盘使用率 70%，且每小时增长 2%」应该归入哪一级告警？',
        options: [
          { value: 'a', text: 'page——磁盘满会引发故障' },
          { value: 'b', text: 'ticket——数小时内需要处理，但当下不烧错误预算' },
          { value: 'c', text: 'log——仅记录即可' },
          { value: 'd', text: '不告警——还有 30% 余量' },
        ],
        answer: 'b',
        explanation: '按速率外推，约 15 小时后磁盘满，属于「需要今天处理」但用户当下无感——ticket。page 的标准是「用户正在受损」；如果换成「写入已开始失败」，那才是 page。',
      },
      {
        id: 'cs146s-w9-l3-e8', type: 'open', difficulty: 4, relatedLessonId: 'cs146s-w9-l3', tags: ['D', 'alert'],
        question: '为「AI 摘要 API」（可测：API 错误率、格式有效率、日预算消耗）设计告警方案：① 列出 3 条候选告警（指标 + 阈值 + 静默期）；② 逐条用三要素评审，标注保留级别（page/ticket/log）或删除并说明理由；③ 写出升级链；④ 写出错误预算耗尽时的动作约定。',
        referenceAnswer: `① 候选与评审（示例）：

| 候选 | 三要素评审 | 保留级别 |
| --- | --- | --- |
| A：格式有效率 5 分钟窗口跌破基线 5 个点，持续 10 分钟 | 症状（下游解析受损）；可执行（查 model 字段 + 跑回测集，runbook 有对应条目）；静默期 10 分钟滤抖动 | page——隐式错误是用户可感知症状 |
| B：API 5xx 错误率 > 1% 持续 5 分钟 | 症状；可执行（查供应商状态页 + 切换备用 key）；静默期 5 分钟 | page |
| C：日预算消耗达 80% | 原因/趋势信号（不直接损伤用户）；可执行（检查任务分型 + 准备降级参数）；无静默期需求（日级指标天然平滑） | ticket——定位与准备价值，不值得半夜叫醒 |
| D（对照组）：单次幻觉抽检命中 | 样本量为 1，无统计意义，无对应动作 | 删除——只在趋势层看（l2） |

② 升级链：page 发出 15 分钟无人认领 → 备份值班；30 分钟 → 主管；AI 摘要类故障追加一条：确认是供应商侧后通知对接人（升级链含「找谁」）。

③ 错误预算约定：以「格式有效率」为 SLI，SLO 99%（按月）；预算耗尽 → 冻结提示词/模型/参数变更，工程时间只做质量修复，直到预算回正——该约定由产品与工程提前签认。`,
        rubric: [
          { point: '3 条候选告警均有指标、阈值与静默期', score: 2 },
          { point: '逐条用三要素评审，级别分配合理（症状 page、原因/趋势 ticket、噪声删除）', score: 4 },
          { point: '升级链有认领时限与升级对象', score: 2 },
          { point: '错误预算耗尽动作明确且强调「事先签认」', score: 2 },
        ],
        keywords: ['症状', '静默期', 'page', 'ticket', '错误预算'],
        explanation: '判卷看点：有没有把「幻觉抽检单次命中」这类噪声识别出来并删掉——敢删是三要素评审的真功夫；以及 SLO 是否定义在「下游可用的成功」（格式有效率）而非「API 通了」。',
      },
    ],
  },
];
