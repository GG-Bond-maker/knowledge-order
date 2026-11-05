import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c11';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const workerLesson = makeLesson({
  id: lesson1,
  title: '多 worker、队列与分片',
  difficulty: 3,
  goals: [
    '理解中心队列、静态分片与动态租约各自解决的问题。',
    '用有效吞吐、积压与重复工作计算评估多 worker 是否真的带来收益。',
    '设计同一 host 的顺序性与全局并发之间的约束。',
    '在 worker 崩溃、重复领取和背压发生时保留可诊断状态。',
  ],
  prerequisites: [
    '理解 Frontier、优先级和每 host 限速。',
    '能读写队列、状态表和基本并发概念。',
    '知道项目 2 的检查点与幂等写入。',
  ],
  problem:
    '单进程采集器遇到更多页面时，最直觉的优化是“多开几个 worker”。但工作者越多，重复领取、同 host 并发过高、队列争用和部分写入越多。如果没有租约，worker 崩溃后任务会永远停在 processing；如果没有背压，生产候选的速度会超过消费速度；如果按 host 静态分片，热门 host 仍会把一个 worker 压垮。多 worker 不是把循环包一层线程，而是重新定义任务所有权。',
  intuition:
    '把中心队列想成餐厅点单台：订单进入队列，服务员领取后获得一个有期限的号牌；完成、失败或超时后交还。分片像把固定餐桌分给不同服务员，简单但容易忙闲不均；动态租约像谁空谁领，复杂但更能适应变化。每 host 的请求节奏则像厨房对不同供应商的下单间隔，不能因为服务员多就同时催同一家。',
  concepts: `
### 1. 中心队列

队列保存待抓 URL/任务、优先级、可用时间、尝试次数和租约信息。任务状态至少包括 queued、leased、done、failed、dead。worker 只能从可用状态领取，不能直接遍历共享列表，否则两个 worker 可能同时处理同一 URL。

### 2. 静态分片与动态租约

| 方式 | 优点 | 风险 |
| --- | --- | --- |
| hash(host) 固定分片 | 同 host 顺序简单、无锁 | 热点 host 负载不均，扩容需重分片 |
| 动态领取 + 租约 | 负载更均衡、支持扩容 | 需要过期、续租、幂等与重复处理 |
| 纯随机分配 | 实现简单 | 无法保证同 host 顺序，重复率高 |

分片解决“谁负责哪个 host”，租约解决“谁暂时拥有哪个任务”。两者可以组合：同一 host 的任务串行领取，再由全局 worker 池动态调度。

### 3. 有效吞吐

若单任务平均耗时 t 秒，w 个 worker，成功率 p，则有：

有效吞吐 ≈ w × p / t

实际还要扣除领取、写入和限速等待。若每 host 最小间隔 r 秒，一个 host 的理论上限是 1/r。多 worker 不能突破这个上限，只能把不同 host 的等待并行化。

### 4. 重复工作

若租约在任务完成前过期，第二个 worker 会再次领取。重复请求可能可接受，但必须有幂等键和 duplicate_work 指标。重复率 = 重复处理的唯一任务数 / 总领取数。租约过短会制造重复，过长会拖慢崩溃恢复。

### 5. 背压

当队列增长速度大于消费速度，积压上升、内存或磁盘压力增加。应限制入队速率、设置队列上限、按 host 预算、记录 backlog_age 与 enqueue_rate。不要通过“把所有候选一次性读入内存”解决问题，那只是把背压变成崩溃。

### 6. worker 崩溃

领取后写租约，完成业务写入与任务状态要在一个事务或明确的两阶段边界中。若在写入前崩溃，租约过期后重做；若在写入后、状态更新前崩溃，重做必须命中唯一键，不能重复新增。每次状态变更记录 worker_id、lease_id、attempt 和时间。

### 7. 与 Crawlee 的对照

Crawlee 提供 request queue、storage、autoscaling 等生产抽象，适合快速构建较大规模采集。本课程用 SQLite 队列与检查点展示同样的核心问题：任务身份、租约、限速、幂等和恢复。框架可以替换实现，但不能替你定义授权范围、字段契约和失败语义。
`,
  derivation: `
假设 3 个 worker，每任务平均 2 秒，成功率 0.9，单 host 最小间隔 1 秒：

- 不考虑限速的有效吞吐 ≈ 3×0.9/2=1.35 任务/秒；
- 若所有任务来自同一 host，上限只有 1/1=1 任务/秒；
- 因此盲目增加到 6 个 worker，吞吐仍可能停在 1，只增加队列争用。

若队列有 1000 个任务，单 worker 每任务 2 秒，最理想 2000 秒；3 个 worker 理论上约 667 秒。但若每 10 个任务有 1 个重复领取，重复工作率为 10%，有效完成约 900/1000，且额外消耗 100 次请求。

租约 30 秒、任务平均 2 秒时，正常情况下过期很少；如果某类任务平均 45 秒，就会持续产生重复。应分任务类型设置租约或定期续租，而不是只调大一个全局值。
`,
  diagram: '<Diagram type="crawl-distributed" name="overview" />',
  diagramNote:
    '图展示中心队列、worker 池、租约与持久化写入的关系；worker 不是直接访问共享列表，而是通过领取与状态转换获得有限所有权。',
  caseStudy:
    '三个 origin 各 100 个页面，A host 变化快、B host 稳定、C host 有严格 1 秒间隔。系统把 host 作为限速键，worker 从中心队列领取任务，同 host 同时最多一个请求。worker 2 在写入前崩溃，租约 15 秒后过期，worker 3 重做并命中幂等键；报告 requests=301、duplicate_work=1、completion=300/300。',
  codePractice:
    'Demo 用纯 Python 计算有效吞吐与租约状态；站内练习不创建真实线程或网络。项目 4 会在本地多 origin 夹具上实现完整调度。',
  mistakes: [
    '把共享列表直接分给多个线程，造成重复请求和竞态。',
    'worker 数量超过 per-host 限速允许的有效并发。',
    '租约永不过期，worker 崩溃后任务永久卡住。',
    '不记录领取者、租约和尝试次数，无法解释重复工作。',
    '队列无上限，候选生产速度远高于消费速度。',
  ],
  relations:
    '本节把第 5 章 Frontier 扩展为多 worker，把第 6 章限速应用到 host 维度，并承接第 7 章幂等与检查点；第 11 章后续故障恢复和项目 4 都以租约为核心。',
  summary:
    '多 worker 的收益受成功率、任务耗时和每 host 限速共同限制。静态分片简单但易不均，动态租约灵活但需要过期、续租与幂等；背压和可观测状态决定系统能否稳定运行。',
  references: [
    'Crawlee Python RequestQueue API：<https://crawlee.dev/python/api/class/RequestQueue>',
    'Python queue 模块：<https://docs.python.org/3/library/queue.html>',
    'SQLite WAL：<https://www.sqlite.org/wal.html>',
  ],
  lab: [
    '用 3 个 worker 计算不同成功率与任务耗时下的有效吞吐。',
    '为 host 分片和动态租约各写一个优点与风险。',
    '设计 queued→leased→done/failed 的状态表。',
    '模拟租约过短导致重复领取，并写出幂等键。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么多 worker 不能突破单 host 的最小请求间隔？',
    '**自我解释二**：租约过短与过长分别会带来什么故障？',
  ],
  predictionPrompt:
    '3 个 worker、任务 2 秒、成功率 90%，但所有任务属于同一 host 且间隔 1 秒。你预测吞吐接近 1.35 还是 1.0？先写公式再回答。',
  tips: [
    {
      kind: 'note',
      text: '先算 per-host 上限，再决定 worker 数；吞吐不是线程数的线性函数。',
    },
    {
      kind: 'pitfall',
      text: '租约必须有过期与续租策略；否则崩溃工作永久卡在 processing。',
    },
    {
      kind: 'performance',
      text: '队列积压、领取延迟和重复工作率与吞吐同样重要；只看完成数会掩盖拥塞。',
    },
  ],
  demo: {
    title: '有效吞吐与租约状态',
    lang: 'python',
    code: `def effective_throughput(workers, success_rate, seconds_per_task):
    if seconds_per_task <= 0:
        raise ValueError("task duration must be positive")
    return workers * success_rate / seconds_per_task

def lease_state(expires_at, now, completed=False):
    if completed:
        return "done"
    return "leased" if now < expires_at else "expired"

print(round(effective_throughput(3, 0.9, 2), 3))
print(lease_state(30, 10), lease_state(30, 30))`,
  },
});

const reliabilityLesson = makeLesson({
  id: lesson2,
  title: '集中去重、限速与故障恢复',
  difficulty: 3,
  goals: [
    '比较 Redis、数据库和 Bloom filter 在去重语义上的差别。',
    '按 host 维护令牌桶或最小间隔，并把等待写入可观测事件。',
    '设计租约过期、死信、重放和幂等消费，避免无限重试。',
    '用积压、重复率、失败率和限速命中解释系统状态。',
  ],
  prerequisites: [
    '理解租约、队列和每 host 限速。',
    '知道一致性与最终一致的差别。',
    '能从项目 2/3 的报告中读取请求数和失败数。',
  ],
  problem:
    '多个 worker 同时去重时，“先查再写”之间存在竞态；两个 worker 可能都认为 URL 未见过。Redis 的原子集合、数据库唯一键和 Bloom filter 提供的保证不同；把 Bloom 的“可能存在”当成“一定存在”会误删新 URL。限速也不是全局一个 sleep，而是每个 host 独立预算；worker 崩溃后，租约和死信需要有人接手。',
  intuition:
    '集中去重像前台登记：所有访客先在一个窗口留下身份，不能每个门卫各自记一本本子。Bloom filter 像一张会误报的快速名单：说“没见过”一定不见过，说“见过”仍可能要查原件。令牌桶像每家供应商的配额，配额没到就等待，不能让多个 worker 一起把同一家供应商打爆。',
  concepts: `
### 1. 去重语义

| 机制 | 插入 | 查询 | 结论 |
| --- | --- | --- | --- |
| 数据库唯一键 | 事务内 | 精确 | 适合作为事实源，需处理冲突 |
| Redis set/原子操作 | 原子 | 精确 | 快，但需考虑持久化与失效 |
| Bloom filter | 位数组 | 近似 | 无假阴性，有假阳性；删除困难 |

Bloom 的“可能存在”不能直接删除候选，只能减少一次昂贵查询；最终仍要由数据库唯一约束确认。

### 2. 每 host 限速

按 hostname（或 scheme+host+port）维护令牌桶/最近请求时间。领取任务时检查该 host 是否允许，不允许就延后而不是全局 sleep。记录 rate_wait、rate_denied 和 per_host_requests。重试也必须遵守限速，不能用重试绕过等待。

### 3. 租约与幂等消费

worker 领取任务时写 lease_id、worker_id、expires_at、attempt。完成业务写入与 done 状态最好在事务中；若不能，至少让重复执行收敛到同一业务键。租约过期后其他 worker 可重领，必须记录 duplicate_work。失败超过上限进入 dead_letter，附最后状态、错误类别和尝试次数。

### 4. 死信与重放

死信不是垃圾箱，而是等待人工或延迟重放的队列。重放要保留原始任务身份、清空租约、重置可用时间，并增加 replay_count；不能无限自动复活。永久失败（如 410、明确策略拒绝）不应反复重试。

### 5. 指标

至少报告 queue_depth、oldest_queued_age、leased_count、lease_expired、duplicate_work、success_rate、error_rate、rate_wait、per_host_requests 和 dead_letter。指标要由事件日志聚合，而不是用某个 worker 的局部变量猜全局状态。

### 6. 写入前后崩溃

写入前崩溃：租约过期，任务重做。写入后、状态更新前崩溃：记录已存在，重做命中唯一键，状态最终推进。状态更新后、审计日志写入前崩溃：数据正确但证据缺失，应使用可重建日志或让日志与核心状态同事务。

故障恢复还要处理“已死但未过期”的租约和“过期但仍在运行”的 worker。前者需要心跳或管理端回收，后者可能稍后回传旧状态；所有任务状态更新应带 lease_id 与 expected_version，旧持有者的迟到事件不能覆盖新状态。监控面板应把租约回收、重复领取和死信分开，否则一次短暂拥塞看起来会像永久数据丢失。小规模 SQLite 实现可用条件更新模拟乐观锁；生产队列通常提供更完整的可见性和重放工具。
`,
  derivation: `
设 1000 个任务，3 个 worker，每任务 2 秒，数据库写入 50 ms：

- 理论处理能力约 3/2.05≈1.46 任务/秒；
- 若一个 host 限制 1 秒/请求，该 host 任务再多也只有 1 任务/秒；
- 1000 个任务中有 100 个重复领取，重复率 10%，额外 100 次请求；
- 若 20 个任务超过重试上限进入死信，成功完成 980 个，表面成功率 98%，但按唯一任务应说明 20 个未解决。

租约 30 秒、任务 p95 为 45 秒时，至少一部分任务会在完成前过期。可以把租约拆成心跳续租，或让长任务分批保存，而不是统一把租约调到 1 小时。
`,
  diagram: '<Diagram type="crawl-distributed" name="failure" />',
  diagramNote:
    '图把领取、租约、写入、状态更新和过期重领分开；每个崩溃点都有不同的恢复动作，不能用无条件重试代替状态分析。',
  caseStudy:
    '项目 4 的本地 fixture 中，origin A 返回 429 并带等待时间，origin B 首次 503，origin C 有一个永久失败页面。worker 在 A 的租约过期后重领，先等待 per-host 间隔再请求；B 达到重试上限后进入死信；C 的永久失败不重试。报告显示 robots_denied、out_of_scope、duplicate_work 与 per_host_requests，证明没有越界或无限循环。',
  codePractice:
    'Demo 用纯函数实现令牌桶判断和失败率；站内不启动 Redis 或真实 worker。项目 4 使用注入 transport 与 fake clock，所有网络事件都是本地合成。',
  mistakes: [
    '用 Bloom 的“可能存在”直接删除 URL，误伤新链接。',
    '先查后插没有唯一约束，两个 worker 同时写入重复任务。',
    '重试时忽略 per-host 等待，限速形同虚设。',
    '永久失败与临时失败共用一个重试计数器。',
    '死信自动无限重放，制造隐藏的请求爆炸。',
  ],
  relations:
    '本节承接第 6 章限速与第 11 章队列，直接服务于项目 4；第 12 章会把这些指标放入合规与安全审计，特别是死信、日志脱敏和删除流程。',
  summary:
    '集中去重需要明确精确与近似语义，Bloom 只能减少查询不能替代唯一约束。每 host 限速、租约、幂等消费、死信与事件指标共同构成可恢复的多 worker 系统。',
  references: [
    'Crawlee Python 自动扩缩与并发：<https://crawlee.dev/python/docs/guides/scaling-crawlers>',
    'Redis 原子操作：<https://redis.io/docs/latest/commands/>',
    'OWASP 日志记录备忘单：<https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>',
  ],
  lab: [
    '比较数据库唯一键、Redis set 与 Bloom 的假阴性/假阳性。',
    '实现一个按 host 的令牌桶判断。',
    '画出写入前、写入中、写入后崩溃的恢复路径。',
    '为死信写一个重放上限与人工确认条件。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么 Bloom 说“可能存在”时仍需数据库确认？',
    '**自我解释二**：租约过期重领与幂等键分别解决哪一层问题？',
  ],
  predictionPrompt:
    '两个 worker 同时查到“URL 未见过”，随后都插入。若没有唯一约束会发生什么？先写出竞态，再说明数据库约束如何收敛。',
  tips: [
    {
      kind: 'pitfall',
      text: '“先查再写”不是原子去重；用唯一约束或原子操作作为事实源。',
    },
    {
      kind: 'performance',
      text: '按 host 分配等待，而不是全局限速；不同 host 的等待可以并行。',
    },
    {
      kind: 'leak',
      text: '死信和审计日志可能含敏感 URL 或错误正文；保存最小字段并脱敏。',
    },
  ],
  demo: {
    title: '令牌桶与失败率',
    lang: 'python',
    code: `def token_bucket(tokens, capacity, rate, last_time, now, cost=1):
    tokens = min(capacity, tokens + (now - last_time) * rate)
    if tokens >= cost:
        return True, tokens - cost, now
    return False, tokens, now

def failure_rate(success, failed):
    total = success + failed
    return failed / total if total else 0.0

print(token_bucket(0, 2, 1, 0, 1.5, 1))
print(token_bucket(0, 2, 1, 0, 0.5, 1))
print(failure_rate(95, 5))`,
  },
});

const projectLesson = makeLesson({
  id: lesson3,
  title: '项目 4：礼貌型聚焦爬虫',
  difficulty: 4,
  goals: [
    '在三个本地 origin 上完成 robots、范围、规范化、限速与重试的组合实现。',
    '用 SQLite 保存任务/记录/检查点/死信，用 JSONL 写审计事件。',
    '在注入 transport 与虚拟时钟下证明 429、503、永久失败和恢复到相同结果。',
    '输出每 host 请求、范围拒绝、重复、死信与重试指标，完成 DoD 与 rubric。',
  ],
  prerequisites: [
    '完成第 5–11 章前两节，能设计 Frontier、限速和租约。',
    '会使用 SQLite 基本事务与 URL 规范化。',
    '知道 robots 是自愿协议，不是法律授权。',
  ],
  problem:
    '项目 4 不只是“多抓几个页面”。三个本地 origin 各有 robots、允许路径和不同故障：一个 429 需要等待，一个 503 需要有限重试，一个页面永久失败；列表里还有跨域链接、重复链接和越界路径。若限速只按全局 sleep，某个 host 会拖慢全部；若 robots 在请求后才检查，已经越界；若重试不区分永久错误，任务永远无法结束。项目必须让每个拒绝都有原因，让每个请求都能在事件日志中复现。',
  intuition:
    '把爬虫当成一个有边界的访客：先在门口核对 robots 与允许路径，再按每个 host 的作息预约，不因为其他 host 空闲就闯进去。任务队列是预约簿，检查点是已完成清单，死信是明确无法继续的档案。最后报告不是“抓了多少”，而是“哪些允许、哪些被拒绝、哪些重试后成功、哪些永久失败”。',
  concepts: `
### 1. 夹具与文件

项目位于 \`public/labs/web-crawling/project-04-focused/\`。fixtures/pages.json 保存三个 origin 的页面、robots、状态码和故障计划；fixture_server.py 可在 127.0.0.1 上提供可观察的本地 HTTP。默认测试使用注入 transport，不启动服务器，也不访问真实域名。

### 2. 范围与规范化

canonicalize(url, base_url) 只接受 http/https、规范化默认端口、去除 fragment、移除指定跟踪参数、解析相对路径；返回 None 表示不可处理。allowed_by_robots 先按 user-agent 选择规则，再检查路径；robots 拒绝必须产生 robots_denied，而不是普通 404。跨 origin 的链接不入队；同 origin 但不在允许路径的链接记 out_of_scope。

### 3. 任务与持久化

建议表：

- tasks(task_key PRIMARY KEY, url, host, status, attempts, available_at, lease_id, lease_until, last_error)；
- items(item_key PRIMARY KEY, url, title, content_hash, fetched_at, extractor_version)；
- checkpoints(run_id PRIMARY KEY, cursor, completed, updated_at)；
- dead_letter(task_key, reason, attempts, evidence_json, created_at)。

每页写入 items 与完成状态应有事务边界。JSONL 审计事件记录 event_type、task_key、host、status、attempt、wait_ms、timestamp；不记录 Cookie、token 或完整个人资料。

### 4. 每 host 限速与故障

per-host 最小间隔通过虚拟 clock 计算；429 的 Retry-After 优先于默认退避，503 最多重试两次，410/明确永久失败不重试。每次请求前再次检查范围和 robots；重定向后的最终 origin 也必须检查，不能因为初始 URL 合法就跟随到任意主机。

### 5. 报告

必须输出 requests、fetched、parsed、skipped、duplicates、robots_denied、retries、dead_letter、per_host_requests。补充 out_of_scope、rate_wait、lease_recovered 和 errors。指标从 transport 事件与数据库状态聚合，而不是 worker 局部计数器。

### 6. 恢复与验收

中断后可恢复：已完成 item 不重复，未完成 task 在租约过期后重领；重跑同一夹具应得到相同唯一条目、相同死信集合，requests 可能因重试变化但必须有解释。测试要断言 robots 拒绝与跨域 URL 从未出现在 transport.calls 中，每 host 请求满足间隔，永久失败只进入死信。

### 7. 项目边界

项目只使用合成 origin、公开路径和本地假 transport。若扩展到真实站点，必须重新评估授权、robots、服务条款、隐私和限速；不得加入登录、验证码、付费墙或访问控制绕过。robots 只是排除协议，不替代法律与授权判断。

### 8. DoD

三 origin 的允许页面全部完成；越界与跨域零请求；429/503 有等待和有限重试；永久失败只进死信；重启不重复；报告能由事件与数据库复算；README 记录命令、rubric、故障排查与证据。没有真实凭据、真实个人资料或外部网络。
`,
  derivation: `
设 3 个 origin 各有 5 个允许页面，另各有 2 个越界路径、1 个跨域链接和 1 个重复链接。初始候选 3×9=27 个：

- 6 个越界 → out_of_scope；
- 3 个跨域 → skipped；
- 3 个重复 → duplicates；
- 15 个允许页面进入请求；
- 其中 1 个 429、1 个 503、1 个永久失败；429 等 1 秒后成功，503 重试一次成功，永久失败进入死信。

最终成功 14，死信 1。请求数可能为 15 + 1 次 429 重试 + 1 次 503 重试=17（若 429 首请求计数）；per_host_requests 应能分别说明三个 host 的节奏。若越界也发请求，27 个候选会变成 21 个请求，且 robots_denied/out_of_scope 归零，说明门禁被绕过。

每 host 最小间隔 0.5 秒，有 5 个页面的 host 最少需要约 2 秒；三个 host 可以并行等待，所以总时长不必是 6 秒。报告应记录 rate_wait 而不是把等待隐藏成更长的 wall clock。
`,
  diagram:
    '| 检查点 | 输入 | 动作 | 可观测结果 |\n| --- | --- | --- | --- |\n| 规范化 | 相对/绝对 URL | 去 fragment、统一 host | duplicate 或候选 |\n| 范围 | 候选 URL | origin/允许路径/robots | skipped/robots_denied |\n| 调度 | 候选 | per-host 限速 | rate_wait |\n| 传输 | 请求 | 429/503/永久错误 | retries/dead_letter |\n| 写入 | 解析记录 | UPSERT + checkpoint | fetched/parsed |\n| 报告 | 事件与数据库 | 聚合 | 可复算指标 |',
  diagramNote:
    '项目表把门禁、调度、传输、写入和报告分开；任何越界候选都不应进入请求事件，任何永久失败都应有明确死信证据。',
  caseStudy:
    '运行项目 4 后，origin A 的 5 个允许页面完成，origin B 的 4 个完成、1 个 429 后完成，origin C 的 4 个完成、1 个永久失败进入死信。请求事件没有出现 6 个越界路径与 3 个跨域链接；同 host 请求间隔均不小于配置值。第二次运行复用已完成记录，只重放未完成死信或明确新任务，不重复写入 14 条成功记录。',
  codePractice:
    '站内练习实现 canonicalize、范围判断与指标纯函数；完整项目在本地 tests 中运行。注入 transport 让所有 429/503 和永久故障可重复，绝不访问真实主机。',
  mistakes: [
    '先发请求再检查 robots/范围，造成不可撤销的越界。',
    '只按全局 sleep 限速，某个 host 空闲时仍拖慢其他 host。',
    '重定向后不重新检查 origin，跟随到不受信任主机。',
    '永久失败进入无限重试，任务永远没有终态。',
    '报告只看成功数，不展示越界、死信、等待和重复。',
  ],
  relations:
    '项目 4 汇总第 5–11 章的规范化、Frontier、robots、限速、租约、幂等和监控，是第 12 章毕业项目的前置工程骨架。毕业项目会把快照、版本和隐私审计接到同一套任务与报告上。',
  summary:
    '礼貌型聚焦爬虫的核心是门禁先于请求、host 级限速、状态可恢复、永久失败有死信、指标可复算。项目验收要证明“没有抓什么”和“为什么没抓”，而不只是展示成功页面。',
  references: [
    'Scrapy robots.txt 实践：<https://docs.scrapy.org/en/latest/topics/spider-middleware.html>',
    'RFC 9309 Robots Exclusion Protocol：<https://www.rfc-editor.org/rfc/rfc9309>',
    'Crawlee Python RequestQueue API：<https://crawlee.dev/python/api/class/RequestQueue>',
  ],
  lab: [
    '为三个 origin 建立 robots、允许路径和故障计划。',
    '实现 canonicalize 与范围门禁，先证明越界 URL 未进入 transport。',
    '用 fake clock 实现每 host 间隔和 429/503 重试。',
    '中断后恢复，比较唯一条目、死信和请求事件。',
    '生成报告并解释每个数字来自哪条事件或数据库查询。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么 robots/范围检查必须在请求前完成，而不能等收到响应再过滤？',
    '**自我解释二**：per-host 限速与全局限速在多 origin 场景下有什么不同？',
  ],
  predictionPrompt:
    '三个 host 各有 5 页、间隔 0.5 秒，另有一个跨域链接。你预测总请求数是 15 还是 16，为什么？先画出门禁顺序。',
  tips: [
    {
      kind: 'pitfall',
      text: 'robots 与范围拒绝要在请求前发生；收到页面后再过滤已经造成了越界。',
    },
    {
      kind: 'performance',
      text: '按 host 维护预算与等待，让不同 host 的等待并行；不要用一个全局 sleep 拖慢全部。',
    },
    {
      kind: 'leak',
      text: '审计事件只保留必要字段；URL、错误和 headers 中的 token/个人信息要先脱敏。',
    },
  ],
  demo: {
    title: '范围门禁与每 host 间隔',
    lang: 'python',
    code: `from urllib.parse import urldefrag, urljoin, urlsplit

def canonicalize(url, base_url):
    absolute, _ = urldefrag(urljoin(base_url, url))
    parts = urlsplit(absolute)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        return None
    return absolute

def in_scope(url, allowed_prefix):
    return canonicalize(url, allowed_prefix).startswith(allowed_prefix)

def host_ready(last_at, now, interval, host):
    return now - last_at.get(host, -10**9) >= interval

print(canonicalize("../b1#top", "https://a.test/docs/list"))
print(in_scope("https://a.test/docs/b1", "https://a.test/docs/"))
print(host_ready({"a.test": 1.0}, 1.4, 0.5, "a.test"))`,
  },
});

const workerExercises = makeExercises(chapterId, lesson1, 3, [
  {
    type: 'single',
    question: '中心队列最重要的作用是？',
    options: [
      ['A', '让每个 worker 扫描同一共享列表'],
      ['B', '集中记录任务状态、租约与领取关系'],
      ['C', '自动绕过 robots'],
      ['D', '替代业务字段契约'],
    ],
    answer: 'B',
    explanation: '中心队列让任务所有权与状态可见，避免 worker 各自维护不可合并的队列。',
    tags: ['中心队列'],
  },
  {
    type: 'multiple',
    question: '动态租约需要哪些配套机制？',
    options: [
      ['A', '过期时间'],
      ['B', '续租或重领策略'],
      ['C', '幂等键与重复工作记录'],
      ['D', '永久不释放任务'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '租约过期、重领与幂等共同处理 worker 崩溃和重复领取。',
    tags: ['租约'],
  },
  {
    type: 'judge',
    question: '增加 worker 数量一定能突破单 host 的最小请求间隔。',
    answer: false,
    explanation: 'per-host 限速是外部约束；worker 再多也只能并行不同 host 的等待。',
    tags: ['吞吐上限'],
  },
  {
    type: 'fill',
    question:
      '有效吞吐近似为 worker 数 × ___ / 平均任务耗时；队列积压还应观察最老任务的 ___。',
    blanks: [['成功率', '成功比例', 'success rate'], ['等待时间', '年龄', 'age']],
    explanation: '吞吐不是线程数线性增长；积压年龄能区分“忙”和“堵住”。',
    tags: ['吞吐公式'],
  },
  {
    type: 'code',
    question:
      '实现 `effective_throughput(workers, success_rate, seconds_per_task)`：返回 workers×success_rate/seconds_per_task；workers 与耗时非正时抛出 ValueError。',
    starterCode: `def effective_throughput(workers, success_rate, seconds_per_task):
    pass
`,
    expectedOutput: '有效吞吐',
    tests: `assert effective_throughput(3,0.9,2)==1.35
try:
    effective_throughput(0,0.9,2)
except ValueError:
    pass
else:
    raise AssertionError("workers 应为正")
`,
    answer: `def effective_throughput(workers, success_rate, seconds_per_task):
    if workers <= 0 or seconds_per_task <= 0:
        raise ValueError("workers and duration must be positive")
    return workers * success_rate / seconds_per_task
`,
    explanation: '吞吐公式只作为预算起点，还要受 host 限速、重试与写入成本修正。',
    tags: ['吞吐实现'],
  },
  {
    type: 'code',
    question:
      '实现 `lease_state(expires_at, now, completed=False)`：completed 返回 done；now 小于 expires_at 返回 leased；否则 expired。',
    starterCode: `def lease_state(expires_at, now, completed=False):
    pass
`,
    expectedOutput: '租约状态',
    tests: `assert lease_state(30,10)=="leased"
assert lease_state(30,30)=="expired"
assert lease_state(30,10,True)=="done"
`,
    answer: `def lease_state(expires_at, now, completed=False):
    if completed:
        return "done"
    return "leased" if now < expires_at else "expired"
`,
    explanation: '边界要明确：到期时刻可视为过期；完成状态优先于时间判断。',
    tags: ['租约状态'],
  },
  {
    type: 'open',
    question:
      '3 个 worker、每任务 2 秒、成功率 0.9，所有任务属于同一 host 且 host 间隔 1 秒。请计算有效吞吐上界并解释为何增加 worker 收益有限。',
    referenceAnswer:
      '理论 worker 吞吐为 1.35 任务/秒，但同一 host 上界为 1/1=1 任务/秒，且成功率 0.9 后约 0.9 任务/秒。更多 worker 只会争抢同一 host 的租约和队列，不能突破相隔等待。',
    rubric: [
      { point: 'worker 公式', score: 2 },
      { point: 'host 上限', score: 2 },
      { point: '成功率修正', score: 2 },
      { point: '解释争用', score: 2 },
    ],
    explanation: '两个上界取较小值，才能真正解释多 worker 的边际收益。',
    tags: ['吞吐计算', '开放题'],
    keywords: ['1.35', '1 秒', '0.9', '租约'],
  },
  {
    type: 'judge',
    question: '队列加入速度超过消费速度时，增大内存队列容量是唯一的背压解决方案。',
    answer: false,
    explanation: '无限扩容量只会延迟崩溃；应限制入队、按预算消费并监控积压。',
    tags: ['背压'],
  },
  {
    type: 'single',
    question: 'worker 在写入业务记录前崩溃，最合理的恢复动作是？',
    options: [
      ['A', '永久删除任务'],
      ['B', '租约过期后重领并重做，依赖幂等写入'],
      ['C', '立即降低所有 host 限额为零'],
      ['D', '把任务标为 410'],
    ],
    answer: 'B',
    explanation: '写入前没有业务副作用，重做安全；租约负责发现崩溃，幂等负责收敛重复。',
    tags: ['崩溃恢复'],
  },
  {
    type: 'open',
    question:
      '请为 queued→leased→done/failed/dead 设计至少六个状态字段，并说明 duplicate_work 如何统计。',
    referenceAnswer:
      '字段可含 task_key、url、host、status、attempts、lease_id、lease_until、worker_id、available_at、last_error。duplicate_work 统计同一 task_key 在租约过期后被再次领取的次数，按总领取数或唯一任务数给出明确定义。',
    rubric: [
      { point: '状态与租约字段', score: 2 },
      { point: '尝试与错误字段', score: 2 },
      { point: '重复统计口径', score: 2 },
      { point: '终态保护', score: 2 },
    ],
    explanation: '状态表要能重建“谁在何时拥有任务、为何重领、最终到哪里”。',
    tags: ['状态设计', '开放题'],
    keywords: ['lease_until', 'attempts', 'worker_id', 'duplicate_work'],
  },
]);

const reliabilityExercises = makeExercises(chapterId, lesson2, 3, [
  {
    type: 'single',
    question: 'Bloom filter 的核心查询语义是？',
    options: [
      ['A', '存在一定为真，不存在可能为真'],
      ['B', '可能存在，且不存在一定为假'],
      ['C', '完全精确，无假阳性'],
      ['D', '可以直接删除元素并保证精确'],
    ],
    answer: 'B',
    explanation: 'Bloom 可能有假阳性，但没有假阴性；删除通常困难，最终仍需唯一约束确认。',
    tags: ['Bloom 语义'],
  },
  {
    type: 'multiple',
    question: '集中去重的可行层次包括？',
    options: [
      ['A', '数据库唯一键'],
      ['B', 'Redis 原子集合'],
      ['C', 'Bloom filter 预筛选'],
      ['D', '每个 worker 各自随机去重'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '集中或原子机制才能避免竞态；各自随机会造成重复与不可解释状态。',
    tags: ['去重机制'],
  },
  {
    type: 'judge',
    question: '租约续期可以让所有任务永不进入死信，因此不需要重试上限。',
    answer: false,
    explanation: '续期只维持所有权；永久错误仍需重试上限和死信，否则任务永不终止。',
    tags: ['死信'],
  },
  {
    type: 'fill',
    question:
      'per-host 令牌桶需要容量、补充速率、上次时间与 ___；失败率通常为失败数 /（成功数 + ___）。',
    blanks: [['当前时间', 'now', '时间'], ['失败数', '失败', 'failed']],
    explanation: '令牌桶要按时间补充；失败率分母是总尝试数，而不是总页面数。',
    tags: ['限速与指标'],
  },
  {
    type: 'code',
    question:
      '实现 `token_bucket(tokens, capacity, rate, last_time, now, cost=1)`：返回 (allowed, remaining_tokens, now)；空桶不足时不等待，只返回拒绝。',
    starterCode: `def token_bucket(tokens, capacity, rate, last_time, now, cost=1):
    pass
`,
    expectedOutput: '(allowed, remaining, now)',
    tests: `assert token_bucket(2,2,1,0,0,1)==(True,1,0)
assert token_bucket(0,2,1,0,0.5,1)==(False,0.5,0.5)
assert token_bucket(0,2,1,0,1.5,1)==(True,0.5,1.5)
`,
    answer: `def token_bucket(tokens, capacity, rate, last_time, now, cost=1):
    tokens = min(capacity, tokens + max(0, now - last_time) * rate)
    if tokens >= cost:
        return True, tokens - cost, now
    return False, tokens, now
`,
    explanation: '补充量不能超过容量，拒绝时不推进 last_time，调用方决定虚拟等待策略。',
    tags: ['令牌桶'],
  },
  {
    type: 'code',
    question:
      '实现 `failure_rate(success, failed)`：返回 failed/(success+failed)；总数为 0 返回 0.0；负数抛出 ValueError。',
    starterCode: `def failure_rate(success, failed):
    pass
`,
    expectedOutput: '失败率',
    tests: `assert failure_rate(95,5)==0.05
assert failure_rate(0,0)==0.0
try:
    failure_rate(-1,0)
except ValueError:
    pass
else:
    raise AssertionError("负数非法")
`,
    answer: `def failure_rate(success, failed):
    if success < 0 or failed < 0:
        raise ValueError("counts must be non-negative")
    total = success + failed
    return failed / total if total else 0.0
`,
    explanation: '指标函数要固定分母和空样本行为，避免不同 worker 报出不可比的失败率。',
    tags: ['失败率'],
  },
  {
    type: 'open',
    question:
      '一个 worker 在写入后、状态更新前崩溃。第二个 worker 重领任务时，如何保证数据与报告最终一致？',
    referenceAnswer:
      '业务记录使用稳定唯一键和幂等 UPSERT；重领先检查记录/版本，重复写入收敛到同一行。状态更新与业务写入尽量同事务；若不能，记录 attempt 与 lease，最终以数据库唯一状态和事件日志对账，报告重复工作但不重复计数实体。',
    rubric: [
      { point: '识别写入后崩溃点', score: 2 },
      { point: '唯一键幂等', score: 2 },
      { point: '事务或对账', score: 2 },
      { point: '报告口径', score: 2 },
    ],
    explanation: '恢复不是假设不会重复，而是让重复结果收敛并可解释。',
    tags: ['故障恢复', '开放题'],
    keywords: ['UPSERT', 'lease', 'attempt', '对账'],
  },
  {
    type: 'judge',
    question: '死信队列中的任务可以无限自动重放，只要 worker 还有空余。',
    answer: false,
    explanation: '死信代表永久失败或需人工判断；无限重放会制造重复请求和隐藏故障。',
    tags: ['死信策略'],
  },
  {
    type: 'single',
    question: '以下哪项最能发现“队列很忙但没有有效进展”？',
    options: [
      ['A', '只读 worker 数'],
      ['B', '最老任务等待时间与领取延迟'],
      ['C', '浏览器主题色'],
      ['D', '只读 CPU 温度'],
    ],
    answer: 'B',
    explanation: '积压年龄与领取延迟揭示堵点；worker 数多不等于任务在被完成。',
    tags: ['监控指标'],
  },
  {
    type: 'open',
    question:
      '请写出四个多 worker 指标及各自回答的问题：队列深度、重复率、失败率、per-host 请求数。',
    referenceAnswer:
      '队列深度回答还有多少待处理；重复率回答租约/去重是否失效；失败率回答当前错误占比；per-host 请求数回答是否遵守 host 预算与热点。每个指标还需给时间窗与分母。',
    rubric: [
      { point: '四个指标含义', score: 2 },
      { point: '时间窗/分母', score: 2 },
      { point: '与故障连接', score: 2 },
      { point: '可操作动作', score: 2 },
    ],
    explanation: '指标必须能触发具体调查，而不是堆在仪表盘上。',
    tags: ['指标解释', '开放题'],
    keywords: ['queue_depth', 'duplicate', 'failure', 'per_host'],
  },
]);

const projectExercises = makeExercises(chapterId, lesson3, 4, [
  {
    type: 'single',
    question: '项目 4 中 robots 检查应发生在什么时候？',
    options: [
      ['A', '收到 200 响应后'],
      ['B', '发出请求之前'],
      ['C', '写入数据库后'],
      ['D', '报告生成后'],
    ],
    answer: 'B',
    explanation: '请求前检查才能避免越界；收到内容后再拒绝已经产生了不允许的访问。',
    tags: ['robots 顺序'],
  },
  {
    type: 'multiple',
    question: '项目 4 报告必须包含哪些指标？',
    options: [
      ['A', 'requests 与 per_host_requests'],
      ['B', 'robots_denied 与 skipped'],
      ['C', 'retries 与 dead_letter'],
      ['D', '真实用户 Cookie'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '请求、拒绝、重试和死信证据构成报告；真实 Cookie 不属于合成夹具。',
    tags: ['项目指标'],
  },
  {
    type: 'fill',
    question:
      '项目 4 的三个本地 origin 通常使用 ___–18083 端口；429 应优先读取 ___ 头并等待。',
    blanks: [['18081'], ['Retry-After', 'retry-after']],
    explanation: '端口范围是本地夹具约定；429 的服务端等待优先于客户端猜测。',
    tags: ['夹具边界'],
  },
  {
    type: 'judge',
    question: '跨域链接只要最终页面看起来相关内容，就可以直接加入任务队列。',
    answer: false,
    explanation: '范围先于内容；跨域必须被拒绝或明确纳入新的授权范围，不能因相关就抓。',
    tags: ['范围控制'],
  },
  {
    type: 'single',
    question: 'per-host 最小间隔为 0.5 秒，某 host 上次请求在 t=1.2，当前 t=1.5，应？',
    options: [
      ['A', '立即请求'],
      ['B', '至少再等 0.2 秒，使间隔达到 0.5'],
      ['C', '把间隔改成 0'],
      ['D', '同时发两个请求并行补偿'],
    ],
    answer: 'B',
    explanation: '1.5−1.2=0.3，还差 0.2；等待属于该 host，不阻塞其他 host。',
    tags: ['host 间隔'],
  },
  {
    type: 'open',
    question:
      '请描述项目 4 从候选 URL 到最终报告的完整门禁顺序，并说明每个拒绝原因放在哪里。',
    referenceAnswer:
      '绝对化/规范化 → scheme 与 host 范围 → robots/允许路径 → 去重 → 入队/租约 → per-host 等待 → 请求 → 状态重试/死信 → 解析/校验 → items 与 checkpoint → 报告。越界记 out_of_scope，robots 拒绝记 robots_denied，重复记 duplicates，永久失败进 dead_letter，信息均写入事件与报告。',
    rubric: [
      { point: '门禁顺序正确', score: 2 },
      { point: '拒绝原因分开', score: 2 },
      { point: '租约与限速', score: 2 },
      { point: '报告可追溯', score: 2 },
    ],
    explanation: '顺序保证越界不会先造成网络副作用，分类保证报告能解释每个候选。',
    tags: ['项目架构', '开放题'],
    keywords: ['canonicalize', 'robots', 'out_of_scope', 'dead_letter'],
  },
  {
    type: 'multiple',
    question: '哪些证据能证明重启没有重复已完成记录？',
    options: [
      ['A', '第二次运行 SQLite 唯一行数不变'],
      ['B', 'transport 事件没有再次请求已完成页'],
      ['C', 'checkpoint 与 completed 一致'],
      ['D', '只看终端退出码 0'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '数据行、请求事件与检查点互相印证；退出码不能证明没有重复或跳过。',
    tags: ['恢复验收'],
  },
  {
    type: 'judge',
    question: '永久失败页面应与临时 503 一样进入无限重试队列。',
    answer: false,
    explanation: '永久失败应进入死信并保留原因；无限重试会浪费预算且掩盖终态。',
    tags: ['死信分类'],
  },
  {
    type: 'code',
    question:
      '实现 `canonicalize(url, base_url)`：使用 urljoin 合并相对 URL，去除 fragment；仅允许 http/https 且有 hostname，否则返回 None。',
    starterCode: `def canonicalize(url, base_url):
    pass
`,
    expectedOutput: '规范 URL 或 None',
    tests: `assert canonicalize("../b1#top","https://a.test/docs/list")=="https://a.test/b1"
assert canonicalize("javascript:void(0)","https://a.test/") is None
assert canonicalize("/x","https://a.test/docs/")=="https://a.test/x"
`,
    answer: `from urllib.parse import urldefrag, urljoin, urlsplit

def canonicalize(url, base_url):
    absolute, _ = urldefrag(urljoin(base_url, url))
    parts = urlsplit(absolute)
    if parts.scheme not in {"http", "https"} or not parts.hostname:
        return None
    return absolute
`,
    explanation: '先合并相对地址再检查 scheme；fragment 不影响服务器资源身份。',
    tags: ['URL 规范化'],
  },
  {
    type: 'code',
    question:
      '实现 `host_ready(last_at, now, interval, host)`：host 从未出现返回 True；距离上次请求至少 interval 返回 True，否则 False。',
    starterCode: `def host_ready(last_at, now, interval, host):
    pass
`,
    expectedOutput: '布尔值',
    tests: `assert host_ready({}, 10, 0.5, "a") is True
assert host_ready({"a":1.0}, 1.4, 0.5, "a") is False
assert host_ready({"a":1.0}, 1.5, 0.5, "a") is True
`,
    answer: `def host_ready(last_at, now, interval, host):
    if host not in last_at:
        return True
    return now - last_at[host] >= interval
`,
    explanation: '每 host 单独判断，才能并行不同 host 的等待；边界 0.5 秒应允许。',
    tags: ['per-host 限速'],
  },
  {
    type: 'open',
    question:
      '项目 4 的 3 个 origin 中，一个 429、一个 503、一个永久失败。请写出重试/死信策略与报告中应出现的计数。',
    referenceAnswer:
      '429 读 Retry-After 并在该 host 等待后重试，503 用有限退避重试；永久失败不重试，记录 dead_letter。报告应出现 requests、retries、rate_wait、dead_letter、per_host_requests、robots_denied/out_of_scope（若有）；死信只含永久失败，临时失败成功后不进死信。',
    rubric: [
      { point: '429 等待', score: 2 },
      { point: '503 有限重试', score: 2 },
      { point: '永久失败死信', score: 2 },
      { point: '报告计数完整', score: 2 },
    ],
    explanation: '三类失败必须有不同终态，才能解释预算和最终结果。',
    tags: ['重试与死信', '开放题'],
    keywords: ['429', '503', 'dead_letter', 'Retry-After'],
  },
  {
    type: 'open',
    question:
      '请写项目 4 的 Definition of Done，覆盖三个 origin、范围、robots、限速、重试、恢复、指标与安全。',
    referenceAnswer:
      '三 origin 允许页完成；越界/跨域/robots 拒绝在请求前发生；每 host 间隔满足 fake clock；429/503 有限重试，永久失败仅进死信；重启不重复已完成条；报告可由 transport 与数据库复算；无真实凭据、外部网络、登录或绕过；README 含命令与故障排查。',
    rubric: [
      { point: '范围与 robots', score: 3 },
      { point: '限速与重试', score: 3 },
      { point: '恢复与指标', score: 2 },
      { point: '安全与文档', score: 2 },
    ],
    explanation: 'DoD 的每条都应能找到测试或运行证据。',
    tags: ['DoD', '开放题'],
    keywords: ['robots', 'per_host', 'dead_letter', '唯一'],
  },
  {
    type: 'single',
    question: '以下哪项最明显违反项目 4 的本地与安全边界？',
    options: [
      ['A', '使用 127.0.0.1 的合成 server'],
      ['B', '在默认测试中请求真实第三方站点'],
      ['C', '用 fixture transport 注入 503'],
      ['D', '把标题写入 SQLite'],
    ],
    answer: 'B',
    explanation: '默认验收必须离线；真实站点、登录态和绕过访问控制都不属于项目范围。',
    tags: ['项目边界'],
  },
]);

export const webCrawlingChapters11: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: '分布式采集、监控与档案',
    goal: '理解多 worker、中心队列、集中去重、租约与监控，并完成礼貌型聚焦爬虫项目。',
    lessons: [workerLesson, reliabilityLesson, projectLesson],
    exercises: [...workerExercises, ...reliabilityExercises, ...projectExercises],
  },
];
