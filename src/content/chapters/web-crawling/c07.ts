import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c07';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const stateLesson = makeLesson({
  id: lesson1,
  title: '采集流水线与任务状态机',
  difficulty: 2,
  goals: [
    '把发现、调度、请求、解析、规范化、写入与报告划分为责任清晰的阶段。',
    '用显式状态机描述任务从发现到成功、失败或部分完成的路径。',
    '为每类失败指定归属层、重试策略与持久化字段。',
    '比较 Scrapy 的组件边界与本课程最小实现的职责，不复制其代码。',
  ],
  prerequisites: [
    '已理解 Frontier、robots、限速与重试。',
    '能把函数输入输出与失败类别用数据结构表达。',
    '会使用简单状态转移表和断言。',
  ],
  problem:
    '当采集脚本只有几十行时，任何错误都能在一个函数里随手处理。加入分页、限速、解析和输出后，失败开始出现在不同阶段：URL 规范化失败、robots 拒绝、请求超时、价格格式错误、写数据库冲突。如果所有步骤共享一个 `done` 布尔值，系统无法知道重跑应从哪一步继续，也无法解释记录为什么缺失。',
  intuition:
    '状态机像物流追踪：已下单、已取件、运输中、已签收、退回，每一步有明确前置状态和责任人。任务不是“失败”或“成功”两团黑箱，而是可以在某个阶段停留、重试、转人工或终止。流水线各站只处理一种转换，失败才有地方落。',
  concepts: `
### 1. 七个阶段

1. **发现**：从列表或 API 产生候选与来源；
2. **范围门禁**：规范化、允许域/路径与 robots；
3. **调度**：Frontier、优先级、限速与租约；
4. **传输**：发出请求、处理状态码与错误；
5. **抽取**：把响应变成原始字段；
6. **规范化与校验**：单位、类型、缺失、冲突；
7. **写入与报告**：幂等存储、版本与漏斗。

### 2. 状态与转移

建议状态：\`discovered\`、\`queued\`、\`processing\`、\`fetched\`、\`parsed\`、\`complete\`、\`partial\`、\`failed\`、\`blocked\`、\`dead\`。\`blocked\` 表示等待授权或 robots 未知，\`dead\` 表示永久失败。状态转移必须声明允许的前驱，避免从 \`complete\` 被意外写回 \`queued\`。

### 3. 失败归属

规范失败不重试；robots 拒绝终止但可保留证据；网络超时按上限重试；解析结构变化进入错误分析；价格校验失败可能是 partial 或 invalid；数据库冲突应通过唯一键和 UPSERT 解决。每层只返回本层能解释的错误。

### 4. 与成熟框架的边界

Scrapy 把 Engine、Scheduler、Downloader、Spider、Item Pipeline 等职责分开，便于替换与扩展。本课程的最小项目只实现理解所需的部分，不提供框架级并发、中间件生态或生产部署。相同点是阶段边界与状态显式；不同点是规模、插件与运维能力。

流水线边界还决定了重试成本的归属。发现层重复产生链接只是本地计算，成本低但会膨胀队列；传输层重试会真实增加请求与等待；解析层重试则可能完全没必要，因为同样的 HTML 仍会失败。团队应把每一层的重试预算、日志字段和终止原因写成表，并让测试注入故障验证。

状态进入数据库后，字段名要与报告一致。若数据库叫 \`fetched_at\`，报告却只输出一个布尔 \`success\`，读者仍不知道何时抓到。建议核心状态、阶段时间、尝试次数与最后错误一起持久化；这样既能恢复，也能做延迟、失败率和留存分析。
`,
  derivation: `
以 10 个候选任务为例：

- 1 个 URL 非 HTTP → \`discovered\` 直接 \`dead\`（invalid_scheme）；
- 1 个 robots 禁止 → \`blocked\`（policy_denied）；
- 8 个进入 queued；
- 其中 1 个超时后重试成功，最终 8 个 fetched；
- 6 个 parsed 后 complete，1 个缺价格 partial，1 个结构错误 failed。

最终完整 6、部分 1、失败 1、策略阻塞 1、发现层终止 1。若把 \`blocked\` 算成功，完整率会虚高；若把部分字段失败直接 dead，则丢失可修复信息。状态机的价值正是让这些分流可被计数。

若出现两次同一任务事件，状态转移表要防止时钟倒退。例如一个旧 worker 在任务已被新 worker 完成后才回传 \`processing\`，实现应拒绝该转移并记录 stale event，而不是把完成状态改回处理中。同理，重跑时读取已存在的 complete 任务，只增加 already_done 计数，不再请求页面。状态机的正确性依赖事件版本与终态保护。

用状态计数做守恒检查：发现总数应等于 dead/blocked/queued 之和；fetched 应等于 parsed/failed 之和；parsed 可分解为 complete/partial/invalid。只要某次运行不守恒，就说明有分支未计数或状态被重复推进。这个校验应自动运行，而不是依赖人工看报表。
`,
  diagram: '<Diagram type="crawl-pipeline" name="api" />',
  diagramNote:
    '图中发现、门禁、调度、传输、抽取、校验和写入依次连接；失败分支回到各自责任层，而不是全部堆在末尾。',
  caseStudy:
    '项目 2 的分页 API 返回游标与 3 条记录。第 3 页首次 503，重试后成功。任务状态依次经过 discovered→queued→processing→fetched→parsed→complete。若进程在 fetched 后崩溃，重启可跳过请求，从已保存响应继续解析；若在写入中崩溃，UPSERT 保证再次写入不会重复。报告用状态而非异常栈解释 5 页结果。',
  codePractice:
    'Demo 实现纯状态转移函数，未知转移抛出错误并返回可分类结果。练习要求你按事件推进任务并生成状态计数；不涉及真实网络。',
  mistakes: [
    '用一个 done 布尔值表示所有阶段，重启后无法判断已完成哪一步。',
    '失败只保存异常字符串，没有阶段、类别与是否可重试。',
    '允许任意状态跳转，导致完成记录被旧任务覆盖。',
    '把 robots 拒绝与网络失败都计为同一种“失败”，掩盖应停止的边界。',
  ],
  relations:
    '状态机承接第 5–6 章 Frontier 与门禁，是第 7 章持久化的结构基础，也为第 11 章 worker 租约和第 12 章审计证据提供字段。每个状态都应在数据库和报告中有一致含义。',
  summary:
    '流水线拆解副作用，状态机拆解进度。失败属于具体阶段，任务可在明确前驱与后继之间转换；成熟框架可借边界，不应直接复制其规模。',
  references: [
    'Scrapy 架构概览：<https://docs.scrapy.org/en/latest/topics/architecture.html>',
    'Web Crawling 综述 DOI：<https://doi.org/10.1561/1500000017>',
    'Python `dataclasses`：<https://docs.python.org/3/library/dataclasses.html>',
  ],
  lab: [
    '为 10 个状态写允许转移表，并标出终态。',
    '构造超时、robots 拒绝、缺价格与结构错误四个任务，画出分流。',
    '把一次运行的状态计数写入报告，核对任务总数守恒。',
    '对照 Scrapy 组件，写出本课程最小实现相同与不同各两点。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“任务失败”不足以指导重跑？状态与失败阶段分别补充什么信息？',
    '**自我解释二**：哪些失败应进入 blocked 而不是 failed/dead？',
  ],
  predictionPrompt:
    '若任务从 `complete` 收到旧队列里的 `processing` 事件，你预测合理实现会怎样处理？先写状态表再运行 Demo。',
  tips: [
    {
      kind: 'pitfall',
      text: '把部分完成丢弃会让数据团队误以为没有候选；应保存 partial 与缺失原因。',
    },
    {
      kind: 'note',
      text: '状态转移表是可执行文档；每次新分支都应该同时增加断言与报告计数。',
    },
    {
      kind: 'interview',
      text: '解释采集架构时先说阶段与失败归属，再提框架组件名，能避免把 API 记忆当成系统理解。',
    },
  ],
  demo: {
    title: '可检查的任务状态机',
    lang: 'python',
    code: `TRANSITIONS = {
    ("discovered", "queue"): "queued",
    ("queued", "start"): "processing",
    ("processing", "fetch_ok"): "fetched",
    ("processing", "timeout"): "queued",
    ("processing", "policy_denied"): "blocked",
    ("fetched", "parse_ok"): "parsed",
    ("fetched", "parse_error"): "failed",
    ("parsed", "validate_ok"): "complete",
    ("parsed", "validate_partial"): "partial",
}

def advance(state, event):
    key = (state, event)
    if key not in TRANSITIONS:
        raise ValueError(f"invalid transition: {key}")
    return TRANSITIONS[key]

state = "discovered"
for event in ["queue", "start", "fetch_ok", "parse_ok", "validate_ok"]:
    state = advance(state, event)
    print(event, "->", state)`,
  },
});

const persistenceLesson = makeLesson({
  id: lesson2,
  title: '持久化、断点续抓与幂等',
  difficulty: 3,
  goals: [
    '设计任务表、记录表、检查点与运行日志的最小持久化模型。',
    '理解 at-least-once 与 exactly-once 的差别，并用唯一键 + UPSERT 实现可重入写入。',
    '用事务边界保证“记录写入”和“检查点推进”不会产生难以解释的半状态。',
    '在模拟崩溃后证明重启不会重复已完成工作或丢失未完成工作。',
  ],
  prerequisites: [
    '理解任务状态机与阶段内副作用。',
    '会使用 SQLite 基本 DDL/DML，或能读懂 SQL。',
    '知道 JSON/JSONL 与数据库事务的差异。',
  ],
  problem:
    '爬虫运行到第 3 页时进程被终止。若只在内存保存 cursor，重启会从第 1 页重抓；若每抓一页就写记录但不推进 cursor，重启会重复写入；若先推进 cursor 再写记录，崩溃后这一页永久丢失。单靠 `try/finally` 不能抵御进程被杀，持久化顺序与幂等键才是恢复基础。',
  intuition:
    '把数据库想成飞行记录仪：每个任务到达哪个阶段、已写哪些业务记录、下一个游标是什么，都要能在重启后重建。写入像盖章：同一个幂等键盖十次仍是一枚有效印章，而不是十枚。',
  concepts: `
### 1. 最小表结构

- \`tasks(task_key PRIMARY KEY, url, status, cursor, attempts, last_error, updated_at)\`
- \`items(item_key PRIMARY KEY, payload_json, source_url, version, updated_at)\`
- \`checkpoints(run_id PRIMARY KEY, cursor, completed, updated_at)\`
- \`events(id, task_key, stage, category, created_at)\`

业务键不是自增行号；同一页面重抓应更新同一 item_key，而不是创建新身份。

### 2. 幂等写入

SQLite 使用 \`INSERT ... ON CONFLICT(item_key) DO UPDATE SET ...\`。若只追求“至少一次”交付，重复写入可接受但必须收敛到同一结果；若声称 exactly-once，需要明确事务与外部副作用边界，通常比简单 UPSERT 更强。

### 3. 事务与检查点

一页 3 条记录与 cursor 推进应在一个事务中提交：要么记录与游标都成功，要么都回滚。若外部请求本身无法回滚，则只能保证至少一次并把请求与写入状态显式记录。报告应说明保证级别，不能把“有唯一键”夸大为分布式 exactly-once。

### 4. 恢复测试矩阵

| 中断点 | 重启预期 |
| --- | --- |
| 请求前 | 重新请求 |
| 响应后、解析前 | 复用已存响应或重新请求，视存储而定 |
| 解析后、写入前 | 重新解析并写入 |
| 写入事务中 | 回滚，重复执行 |
| 写入后、检查点前 | 重写同键，检查点再推进 |

用故障注入证明每个格子，而不是只测试正常完成。

日志层常被误当作状态存储。事件日志适合回答“发生过什么”，但重建最新状态仍需项目表或检查点；把唯一事实源同时写在两处，必须定义冲突时相信谁。课程建议核心状态以数据库当前行为准，事件表只追加不覆盖，并用 run_id 将两者关联。
`,
  derivation: `
设 4 页、每页 3 条记录，其中 1 条跨页重复，最终唯一记录 11 条。若系统在页 3 写入前崩溃并重启：

1. 检查点 cursor 指向页 3 开始前；
2. 页 3 的 3 条记录尚未提交，重抓请求；
3. 写入时 1 条跨页重复命中唯一键，UPSERT 更新；2 条新增；
4. 推进 cursor 到页 4 后再次崩溃，页 4 重做；
5. 最终 items 仍为 11，不因重做变成 14。

若失败时先推进 cursor 后写记录，页 3 会被跳过，最终可能只有 8 条。若写入有唯一键但 cursor 推进无事务，重复运行可能不重复行，却把 completed 计数算高，所以报告要基于数据库真实行数与任务状态，而非事件调用次数。

再考虑版本：页 3 第二次返回的数据可能比第一次更新，UPSERT 不能无条件覆盖旧版本。记录版本号、抓取时间和来源；若同一业务键的新响应没有更高版本或可靠更新时间，应进入冲突而不是降级现有数据。恢复测试应覆盖“重做时拿到相同版本”和“拿到更新版本”两种情况。

事务也要有清晰边界：不要在网络请求期间保持写事务，否则连接失败时锁会被长时间占用；也不要把多个独立页面放进一个巨大事务，因为一处失败会让全批重做。更稳妥的模式是“请求完成后再开启短事务，写入该页与检查点后立即提交”，并把失败尝试单独记录。
`,
  diagram:
    '| 写入对象 | 幂等键 | 事务内 | 失败后动作 |\n| --- | --- | --- | --- |\n| item | source + business key | 是 | UPSERT 重写 |\n| checkpoint | run_id | 是 | 回滚后重做 |\n| event | task_key + stage + attempt | 可追加 | 保留用于诊断 |\n| artifact | content hash | 是 | 复用或重新生成 |',
  diagramNote:
    '这张持久化矩阵把业务记录、检查点与日志分开：日志可以追加，核心状态必须收敛；不同对象有不同幂等键。',
  caseStudy:
    '项目 2 的四页 JSON 含重复 SKU。第一次运行在页 3 的 503 后结束，数据库保存前两页与 cursor。第二次运行从该 cursor 恢复，跳过前两页，遵守 Retry-After 重试页 3，最终 UNION 去重后写入 11 条。测试强行在写入后、保存检查点前抛异常，证明重做不会增加行数，completed 也不会被错误重复计数。',
  codePractice:
    'Demo 用纯 Python 模拟“唯一键 + 更新”与检查点，不访问数据库或网络。练习要求你合并已抓条目并计算恢复后的 cursor，重点验证幂等而非 ORM 细节。',
  mistakes: [
    '先推进 cursor 后写记录，崩溃后永久跳过当前页。',
    '用自增主键作为业务键，重抓产生重复实体。',
    '把数据库唯一键等同于 exactly-once 交付，忽略请求与外部副作用。',
    '只记录最后异常，不记录尝试次数、cursor 与已完成条目。',
  ],
  relations:
    '本节把状态机落成持久化表，承接第 5 章 Frontier 与第 6 章重试，为第 10 章版本记录、第 11 章租约恢复与项目 2 提供机制。第 9 章会继续定义数据契约与存储格式。',
  summary:
    '恢复依赖状态、检查点与幂等键共同工作。核心写入与 cursor 必须有一致事务边界；at-least-once 要通过收敛写入和重做测试证明。',
  references: [
    'SQLite UPSERT：<https://www.sqlite.org/lang_upsert.html>',
    'SQLite 事务：<https://www.sqlite.org/lang_transaction.html>',
    'Python `sqlite3`：<https://docs.python.org/3/library/sqlite3.html>',
  ],
  lab: [
    '画出任务、条目、检查点与事件四张表的最小字段。',
    '为 4 页、1 个跨页重复 SKU 的样本计算最终唯一行数。',
    '在写入后、检查点前注入异常，验证重启结果。',
    '在报告中写明 at-least-once 保证与幂等键，不用模糊的 exactly-once 宣称。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“先推进游标再写记录”会导致数据永久缺失，即使用唯一键也无法挽救？',
    '**自我解释二**：at-least-once 与 exactly-once 的关键差别是什么？UPSERT 能自动提供哪一种？',
  ],
  predictionPrompt:
    '若写入 3 条后、cursor 更新前进程被杀，重启从旧 cursor 开始，你预测最终条目数和 completed 计数分别怎样？先写预期再验证。',
  tips: [
    {
      kind: 'pitfall',
      text: '检查点要覆盖“已完成到哪”，并和核心写入采用一致事务边界。',
    },
    {
      kind: 'note',
      text: '唯一键 + UPSERT 让重复执行收敛，但网络请求与外部副作用仍需明确至少一次语义。',
    },
    {
      kind: 'performance',
      text: '批量写入可提高吞吐，但需要限制事务大小；长事务会阻塞恢复与检查点。',
    },
  ],
  demo: {
    title: '幂等写入与检查点恢复',
    lang: 'python',
    code: `items = {}
cursor = "page-1"

def upsert(rows, business_key="sku"):
    for row in rows:
        key = row[business_key]
        current = items.get(key)
        if current is None or row.get("version", 0) >= current.get("version", 0):
            items[key] = row

def save_page(rows, next_cursor):
    global cursor
    upsert(rows)
    cursor = next_cursor

save_page([{"sku":"B1","version":1},{"sku":"B2","version":1}], "page-2")
save_page([{"sku":"B2","version":1},{"sku":"B3","version":1}], "page-3")
# 模拟从 page-2 重做
save_page([{"sku":"B2","version":1},{"sku":"B3","version":1}], "page-3")
print("rows", len(items), sorted(items), "cursor", cursor)`,
  },
});

const projectLesson = makeLesson({
  id: lesson3,
  title: '项目 2：分页 JSON/API 采集器',
  difficulty: 4,
  goals: [
    '完成游标分页 API 的本地离线采集器，支持 503 重试、Retry-After、检查点与恢复。',
    '用注入式传输层和虚拟时钟避免真实网络与 sleep，并让失败可重复。',
    '以 SQLite 唯一键、UPSERT 和事务实现幂等记录，证明重跑不产生重复。',
    '交付请求计数、恢复证据、四页夹具、验收测试和项目说明。',
  ],
  prerequisites: [
    '完成第 7 章前两节，理解状态机与检查点。',
    '会读 JSON 游标结构并使用 `sqlite3` 基础事务。',
    '能通过环境变量选择 starter 或 solution。',
  ],
  problem:
    '项目 2 要采集一个四页的合成 JSON API。每页 3 条记录，第 3 页首次返回 503，随后带 Retry-After 成功；有一 SKU 跨页重复，另有一条格式错误。若脚本只在内存循环，任何一页失败都会从头开始；若重试使用真实 sleep，测试慢且不稳定；若 UPSERT 或 cursor 顺序错误，重跑会出现重复、跳过或计数失真。',
  intuition:
    '把 API 采集拆成四层：注入传输只返回确定性响应，分页控制器只推进游标，写入器只负责幂等存储，运行器在失败点保存状态。这样每个故障都能用虚拟时间重放，不必猜测网络。',
  concepts: `
### 1. 项目边界与文件

项目位于 \`public/labs/web-crawling/project-02-json/\`，包含 README、starter、solution、\`fixtures/pages.json\` 与测试。公共组件 \`common/fake_transport.py\` 和 \`fake_clock.py\` 提供确定性 transport/clock。所有数据为合成内容，不包含真实账号或个人资料。

接口为 \`fetch_page(transport, cursor)\`、\`decode_items(payload)\`、\`upsert_items(db_path, items)\`、\`save_checkpoint(db_path, cursor, completed)\`、\`run(transport, db_path, clock)\`。transport 需要暴露 \`get(url, headers, timeout)\`，测试可替换为夹具，不打开 socket。

starter 只实现安全且无争议的常量和接口骨架，所有关键流程均抛出带契约说明的 \`NotImplementedError\`。solution 只在 README 中明确标为“完成后再对照”，验收测试通过 \`CRAWL_TARGET\` 切换模块；这样既能让学习者看到清晰失败，也能保证参考实现被真实执行。

### 2. 游标与请求语义

第一页用 \`cursor=None\`，响应包含 \`items\`、\`next_cursor\` 与 \`page\`。只有 \`next_cursor=None\` 才表示完成；未拿到明确结束标记不能自行假设。第 3 页首次 503 带 \`Retry-After: 2\`，虚拟时钟应推进 2 秒再重试；重试后成功。重试上限与总请求预算必须固定，避免循环。

### 3. SQLite 事务与幂等

\`items(item_key PRIMARY KEY, payload_json, version, source_url, updated_at)\`。使用唯一键与 UPSERT；跨页重复 SKU 只保留一行，记录计数来自数据库。\`checkpoints(run_id PRIMARY KEY, cursor, completed, request_count, updated_at)\` 与页写入同一事务提交。若进程崩溃，重启从已提交 cursor 恢复。

### 4. 里程碑与验收

1. 让假 transport 返回四页 JSON，并断言首尾 cursor；
2. 解码记录，跳过或标记 malformed 行；
3. 用 SQLite 事务写入 items 与 checkpoint；
4. 注入 503 后验证 Retry-After 与有界重试；
5. 模拟第一次运行中断，第二次恢复并证明无重复。

### 5. 报告与证据

报告包含 requests、retries、rate_wait、pages_committed、rows_seen、rows_written、duplicate_skus、invalid_rows、final_cursor、completed。至少保留 transport 事件序列与数据库行数。验收不能用“脚本退出码 0”替代数据一致性。

项目还应输出每次请求的虚拟时间与状态码，便于证明 Retry-After 确实被遵守。数据库查询报告应包含 \`COUNT(*)\` 与重复键查询；若行数正确但 completed 被高估，说明检查点计数不是基于提交结果。把这些证据存进 README 的运行示例，提交者才能自证完成。

建议为运行结果定义一份不变量清单，并在每次提交前自动核对：

- 第一页必须由 \`cursor=None\` 发起，后续页只能使用服务端返回的游标；
- 每次收到成功响应后，先解码并统计行数与非法行，再进入写入；
- 一页的 items 与 checkpoint 必须同时提交，或明确记录该页尚未提交；
- 完成状态只能来自已提交页，不得用“循环退出”代替；
- 最终唯一业务键行数应等于合法且去重后的集合大小；
- 请求事件数、重试数和提交页数应能由同一份运行记录复算。

这些不变量把“看起来跑通”变成可审计的工程结论。例如脚本可能因网络错误提前结束，但退出码仍为 0；也可能把全部记录写入数据库却忘记推进游标，导致下次重复抓取。只有将页面协议、数据库行、检查点与请求事件四类证据放在一起，才能区分成功、部分成功和静默错误。对初学者而言，先写清不变量，再实现函数，比先堆叠重试装饰器更容易定位错误。

最后，把不变量写成测试名称而不是写在注释里：\`test_resume_does_not_refetch_committed_pages\`、\`test_duplicate_sku_keeps_one_row\` 和 \`test_retry_after_advances_virtual_clock\` 失败时，就能直接指出恢复、幂等或限速中的哪条承诺被破坏。报告中的每个汇总数字最好都能追溯到一条查询或一个 transport 事件；无法追溯的指标应标记为未知，而不是补一个看似合理的估计值。
`,
  derivation: `
设四页各有 3 条，原始 rows_seen=12。跨页重复 1 个 SKU，非法记录 1 条，合法唯一记录计算：

- 先解码 12 条；非法 1 条进入 invalid_rows；
- 11 条参与业务键去重；重复 1 条使唯一 SKU 为 10（若重复也是合法记录）；
- 若重复 SKU 的版本相同，UPSERT 更新为同一状态，不新增行；
- completed 以成功提交的页数计，最终 4 页，即便第 3 页重试。

请求数受重试影响：原本 4 次，页 3 失败后再发一次，若 recovery 重放没有重复请求前两页，则总请求 5。若第二次运行从第一页重新开始，会变成 9 次，说明恢复证据必须包含 cursor 与请求序列。
`,
  diagram: '<Diagram type="crawl-pipeline" name="api" />',
  diagramNote:
    '图中 JSON 页面经过 transport、游标解码、SQLite 事务与检查点，503 分支回到有限重试，成功页才会推进 cursor。',
  caseStudy:
    '第一次运行：请求 4 页，页 3 返回 503，虚拟时钟等待 2 秒，重试成功；随后进程在页 4 写入前被模拟中断。数据库含前 3 页 8 条合法唯一记录，cursor 指向页 4。第二次运行从光标恢复，只请求页 4，最终 10 条唯一记录。两次合计 requests=6、retries=1，而不是从头重抓的 9 次。测试分别断言行数、报告、重试等待与 cursor。',
  codePractice:
    '从 `decode_items` 开始：先验证 payload 结构与行级别错误，再实现 UPSERT，最后接 transport 与虚拟 clock。站内练习只测纯函数；完整 SQLite 与恢复测试在本地项目目录运行。',
  mistakes: [
    '把 next_cursor 为空字符串误当结束条件，而接口实际用 null 表示结束。',
    '先写 checkpoint 再写 items，崩溃后跳过整页记录。',
    '使用自增 id 作为唯一键，重复 SKU 仍产生多行。',
    '把 malformed 行静默丢弃且不计数，报告看起来完全成功。',
    '重试不限制次数，或每次重试都真实 sleep。',
  ],
  relations:
    '项目 2 将状态机与持久化落地，也是第 8 章动态页面的执行骨架、第 10 章增量版本和第 12 章毕业项目的检查点原型。它证明 API-first 优先于浏览器渲染。',
  summary:
    '可恢复采集器需要确定性传输、分页协议、幂等存储与原子检查点。验收要证明正常、失败、重启和重跑四条路径，不能只演示一次成功。',
  references: [
    'SQLite 官方文档：<https://www.sqlite.org/docs.html>',
    'Python `sqlite3` 事务与连接：<https://docs.python.org/3/library/sqlite3.html>',
    'Scrapy Scheduler 概念：<https://docs.scrapy.org/en/latest/topics/architecture.html>',
  ],
  lab: [
    '阅读项目 README 与四页夹具，画出 cursor 生命周期。',
    '实现解码与 UPSERT，先让非法记录与重复 SKU 的单元测试通过。',
    '接入假 transport，模拟页 3 的 503 与 Retry-After。',
    '在页 4 写入前注入中断，完成第一次运行恢复测试。',
    '连续运行两次并比较 SQLite 行数、完成状态与请求事件。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“检查点已推进”不能证明所有记录都已写入？',
    '**自我解释二**：项目中的 `retries`、`requests` 与 `pages_committed` 分别如何受重试影响？',
  ],
  predictionPrompt:
    '页 3 首次失败后重试成功、随后在页 4 写入前崩溃。你预测第二次运行的请求数与最终唯一 SKU 数各是多少？先写假设再运行。',
  tips: [
    {
      kind: 'performance',
      text: '假 transport 与虚拟时钟让 60 秒重试在毫秒内完成；不要把真实 sleep 放入单元测试。',
    },
    {
      kind: 'pitfall',
      text: 'cursor、items 与 completed 必须对应同一事务边界；否则恢复证据会自相矛盾。',
    },
    {
      kind: 'leak',
      text: '项目不保存真实令牌；若扩展到受权 API，凭据只从环境读取，不写入夹具、日志或数据库。',
    },
  ],
  demo: {
    title: '分页响应解码与游标推进',
    lang: 'python',
    code: `import json

pages = {
    None: {"page":1,"items":[{"sku":"B1"},{"sku":"B2"},{"sku":"B3"}],"next_cursor":"p2"},
    "p2": {"page":2,"items":[{"sku":"B3"},{"sku":"B4"},{"sku":"B5"}],"next_cursor":"p3"},
    "p3": {"page":3,"items":[{"sku":"B6"},{"sku":"bad"},{"sku":"B7"}],"next_cursor":"p4"},
    "p4": {"page":4,"items":[{"sku":"B8"},{"sku":"B9"},{"sku":"B10"}],"next_cursor":None},
}

def decode_items(payload):
    rows, invalid = [], 0
    for row in payload.get("items", []):
        sku = row.get("sku")
        if not isinstance(sku, str) or not sku.startswith("B"):
            invalid += 1
            continue
        rows.append({"sku": sku})
    return rows, invalid

cursor, seen, invalid = None, {}, 0
while True:
    payload = pages[cursor]
    rows, bad = decode_items(payload)
    invalid += bad
    for row in rows:
        seen[row["sku"]] = row
    cursor = payload["next_cursor"]
    if cursor is None:
        break
print(json.dumps({"unique":len(seen),"invalid":invalid,"cursor":cursor}, ensure_ascii=False))`,
  },
});

const stateExercises = makeExercises(chapterId, lesson1, 2, [
  {
    type: 'single',
    question: '哪一个状态最适合表示“等待授权或 robots 未知，暂不发出请求”？',
    options: [
      ['A', 'complete'],
      ['B', 'blocked'],
      ['C', 'parsed'],
      ['D', 'partial'],
    ],
    answer: 'B',
    explanation: 'blocked 表示策略或外部条件阻塞，既非成功也非永久解析失败。',
    tags: ['任务状态'],
  },
  {
    type: 'judge',
    question: '状态机允许任意状态跳到 complete，只要最终计数看起来正确。',
    answer: false,
    explanation: '任意跳转会绕过必要处理并掩盖失败；只允许显式前驱到后继的转移。',
    tags: ['转移约束'],
  },
  {
    type: 'fill',
    question:
      '采集阶段通常可拆为发现、___、调度、传输、抽取、___、写入与报告。',
    blanks: [['范围门禁', 'robots 与范围', '门禁'], ['规范化与校验', '校验', '规范化']],
    explanation: '门禁在请求前执行，规范化与校验在写入前执行。',
    tags: ['流水线阶段'],
  },
  {
    type: 'multiple',
    question: '失败记录至少应包含哪些信息？',
    options: [
      ['A', '发生阶段'],
      ['B', '错误类别与是否可重试'],
      ['C', '任务身份与尝试次数'],
      ['D', '用户完整 Cookie'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '阶段、类别、任务身份与次数支持重试和诊断；敏感 Cookie 不应记录。',
    tags: ['失败证据'],
  },
  {
    type: 'code',
    question:
      '实现 `advance(state, event)`，按给定转移表返回新状态；非法转移抛出 ValueError。可用转移：discovered+queue→queued，queued+start→processing，processing+ok→fetched，fetched+parse→parsed，parsed+complete→complete。',
    starterCode: `def advance(state, event):
    pass
`,
    expectedOutput: '新状态字符串',
    tests: `assert advance("queued","start")=="processing"
assert advance("parsed","complete")=="complete"
try:
    advance("complete","start")
except ValueError:
    pass
else:
    raise AssertionError("非法转移应抛出")
`,
    answer: `TRANSITIONS = {
    ("discovered", "queue"): "queued",
    ("queued", "start"): "processing",
    ("processing", "ok"): "fetched",
    ("fetched", "parse"): "parsed",
    ("parsed", "complete"): "complete",
}

def advance(state, event):
    key = (state, event)
    if key not in TRANSITIONS:
        raise ValueError(f"invalid transition: {key}")
    return TRANSITIONS[key]
`,
    explanation: '显式表让允许路径可测试；非法事件不能被静默忽略。',
    tags: ['状态转移'],
  },
  {
    type: 'single',
    question: '网络超时和价格格式非法，最合理的状态归属差异是？',
    options: [
      ['A', '都在发现层'],
      ['B', '超时在传输层，价格问题在规范化/校验层'],
      ['C', '都在 robots 解析'],
      ['D', '都只能进入 complete'],
    ],
    answer: 'B',
    explanation: '错误发生在不同副作用边界；重试与修复动作完全不同。',
    tags: ['错误归属'],
  },
  {
    type: 'judge',
    question: '把 partial 记录删除后，完整记录率会变得更真实。',
    answer: false,
    explanation: '删除部分记录会掩盖已发现但字段缺失的候选，降低可解释性与后续修复能力。',
    tags: ['partial'],
  },
  {
    type: 'open',
    question:
      '10 个候选中有 1 个非法 URL、1 个 robots 拒绝、8 个抓取，最终 6 完整、1 部分、1 失败。请写出至少 6 个状态计数并解释守恒。',
    referenceAnswer:
      'discovered 10；invalid_scheme/dead 1；blocked 1；queued/fetched 8；complete 6；partial 1；failed 1。分流总计 1+1+8=10，抓取层的 8 又分解为 6+1+1。状态计数应满足层级守恒并解释分母。',
    rubric: [
      { point: '候选与门禁计数正确', score: 2 },
      { point: '抓取后分流正确', score: 2 },
      { point: '展示守恒关系', score: 2 },
      { point: '解释不混用成功口径', score: 2 },
    ],
    explanation: '状态报告的价值在于能复算每个阶段留存与流失。',
    tags: ['状态报告', '开放题'],
    keywords: ['10', 'blocked', 'complete', 'partial', '守恒'],
  },
]);

const persistenceExercises = makeExercises(chapterId, lesson2, 3, [
  {
    type: 'single',
    question: '为了保证崩溃后不跳过当前页，记录写入与 cursor 推进应？',
    options: [
      ['A', '先推 cursor，再慢慢写记录'],
      ['B', '在同一事务边界内提交'],
      ['C', '只写内存'],
      ['D', '在日志里承诺已写'],
    ],
    answer: 'B',
    explanation: '同事务提交让“记录已写入”和“检查点已推进”保持一致，避免跳过或半状态。',
    tags: ['事务边界'],
  },
  {
    type: 'multiple',
    question: '实现可重入 SQLite 写入常用的机制包括？',
    options: [
      ['A', '业务键 UNIQUE'],
      ['B', 'UPSERT'],
      ['C', '事务'],
      ['D', '自增 id 当唯一业务身份'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '唯一业务键、UPSERT 与事务支持收敛写入；自增 id 无法识别重复实体。',
    tags: ['幂等键'],
  },
  {
    type: 'fill',
    question:
      '若 4 页各 3 条，1 条跨页重复且去重后不新增，则最终唯一条目为 ___；页 3 重试一次时总请求为 ___。',
    blanks: [['11'], ['5']],
    explanation: '12 条原始记录中重复 1 条，唯一数为 11；4 页加 1 次重试为 5 请求。',
    tags: ['恢复计算'],
  },
  {
    type: 'judge',
    question: 'SQLite 唯一键与 UPSERT 可以自动保证跨网络请求和数据库写入的 exactly-once。',
    answer: false,
    explanation: '唯一键保证数据库行收敛，但外部请求与响应仍可能重复，整体通常至少一次交付。',
    tags: ['交付语义'],
  },
  {
    type: 'code',
    question:
      '实现 `merge_by_key(rows, key, version="version")`：按业务键合并；新行版本不低于旧行才覆盖；保持按业务键排序输出。',
    starterCode: `def merge_by_key(rows, key, version="version"):
    pass
`,
    expectedOutput: '合并后的行列表',
    tests: `rows=[{"sku":"B2","version":1,"x":1},{"sku":"B1","version":1,"x":2},{"sku":"B2","version":2,"x":3}]
assert merge_by_key(rows,"sku")==[{"sku":"B1","version":1,"x":2},{"sku":"B2","version":2,"x":3}]
`,
    answer: `def merge_by_key(rows, key, version="version"):
    merged = {}
    for row in rows:
        identity = row.get(key)
        if identity is None:
            continue
        old = merged.get(identity)
        if old is None or row.get(version, 0) >= old.get(version, 0):
            merged[identity] = dict(row)
    return [merged[identity] for identity in sorted(merged)]
`,
    explanation: '合并必须在业务键层发生，输出排序固定，旧版本不能覆盖新版本。',
    tags: ['幂等合并'],
  },
  {
    type: 'code',
    question:
      '实现 `next_checkpoint(current, committed_cursor, completed, rows_written)`：返回新字典 `{"cursor":..., "completed":..., "rows_written":...}`；committed_cursor 为 None 时保留旧 cursor。',
    starterCode: `def next_checkpoint(current, committed_cursor, completed, rows_written):
    pass
`,
    expectedOutput: '更新后的检查点',
    tests: `old={"cursor":"p1","completed":1,"rows_written":3}
assert next_checkpoint(old,"p2",2,6)=={"cursor":"p2","completed":2,"rows_written":6}
assert next_checkpoint(old,None,1,3)==old
`,
    answer: `def next_checkpoint(current, committed_cursor, completed, rows_written):
    return {
        "cursor": current["cursor"] if committed_cursor is None else committed_cursor,
        "completed": completed,
        "rows_written": rows_written,
    }
`,
    explanation: '检查点更新是纯函数，便于在事务前后比较；None 有明确“不推进”语义。',
    tags: ['检查点'],
  },
  {
    type: 'single',
    question: '“至少一次”交付下，重复执行最重要的防线之一是什么？',
    options: [
      ['A', '忽略第二次运行'],
      ['B', '以稳定业务键 UPSERT 并保留版本'],
      ['C', '使用更多随机数'],
      ['D', '把错误码改为 200'],
    ],
    answer: 'B',
    explanation: '重复无法总被避免，收敛写入让相同输入多次执行得到一致结果。',
    tags: ['at-least-once'],
  },
  {
    type: 'judge',
    question: '检查点只需要保存下一页 cursor，不需要记录已完成数量或请求计数。',
    answer: false,
    explanation: 'cursor 之外还应有 completed、请求数和时间等，才能解释恢复状态与报告。',
    tags: ['检查点字段'],
  },
  {
    type: 'open',
    question:
      '进程在“页 3 记录已写、cursor 尚未更新”时被杀，会有哪些可能结果？如何保证重跑后数据收敛？',
    referenceAnswer:
      '重启会从旧 cursor 重抓页 3；记录可能重复提交，但业务键 UNIQUE + UPSERT 使最终行收敛。items 和 checkpoint 应在同一事务提交，或接受至少一次并确保重复可收敛；测试要注入该中断点并断言行数、completed 与报告一致。',
    rubric: [
      { point: '识别旧 cursor 重抓', score: 2 },
      { point: '说明 UPSERT 收敛', score: 2 },
      { point: '处理事务或至少一次语义', score: 2 },
      { point: '给出失败注入测试', score: 2 },
    ],
    explanation: '恢复不是避免一切重复，而是让重复和中断的结果可预测。',
    tags: ['崩溃恢复', '开放题'],
    keywords: ['旧 cursor', 'UPSERT', '事务', '至少一次'],
  },
  {
    type: 'single',
    question: '以下哪项不能单独作为“恢复成功”的证据？',
    options: [
      ['A', '数据库唯一行数与预期一致'],
      ['B', '第二次运行退出码为 0'],
      ['C', 'cursor 与页数一致'],
      ['D', '请求事件中没有重复抓已完成页'],
    ],
    answer: 'B',
    explanation: '退出码 0 可能隐藏重复、跳过或空结果；需同时验证数据和事件证据。',
    tags: ['验收证据'],
  },
]);

const projectExercises = makeExercises(chapterId, lesson3, 4, [
  {
    type: 'single',
    question: 'API 响应 `next_cursor: null` 在项目中表示？',
    options: [
      ['A', '请求失败'],
      ['B', '没有下一页，分页结束'],
      ['C', '必须回到第一页'],
      ['D', '跳过当前页'],
    ],
    answer: 'B',
    explanation: '固定协议中 null 是结束标记；不能与空字符串或缺失键混同。',
    tags: ['游标协议'],
  },
  {
    type: 'multiple',
    question: '项目 2 的验收至少要覆盖哪些路径？',
    options: [
      ['A', '正常四页完成'],
      ['B', '503 后 Retry-After 重试'],
      ['C', '中断恢复与第二次运行幂等'],
      ['D', '真实外部站点压力测试'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '项目以本地确定性夹具证明正常、重试与恢复；不需要真实站点压力测试。',
    tags: ['项目验收'],
  },
  {
    type: 'fill',
    question:
      '四页原本 4 次请求，第 3 页首次 503 后成功重试，则总请求为 ___；若第二次从第 4 页恢复，两次合计请求为 ___。',
    blanks: [['5'], ['6']],
    explanation: '第一次 4+1=5；第二次只请求第 4 页，共 6。',
    tags: ['请求预算'],
  },
  {
    type: 'judge',
    question: '项目 2 的 malformed 记录应静默跳过且不进入任何计数。',
    answer: false,
    explanation: '必须显式计数并保存原因，才能评估数据完整性与抽取器质量。',
    tags: ['非法记录'],
  },
  {
    type: 'code',
    question:
      '实现 `decode_items(payload)`：返回结构合法的记录列表；有效行必须含非空字符串 sku、非空字符串 title 与非负整数 price_cents，保留原字典；坏行跳过但不修改 payload。',
    starterCode: `def decode_items(payload):
    pass
`,
    expectedOutput: '有效记录列表',
    tests: `valid=decode_items({"items":[{"sku":"B1","title":"样本","price_cents":100},{"sku":""},{"x":1}]})
assert valid==[{"sku":"B1","title":"样本","price_cents":100}]
assert decode_items({"items":"bad"})==[]
`,
    answer: `def decode_items(payload):
    rows = payload.get("items")
    if not isinstance(rows, list):
        return []
    valid = []
    for row in rows:
        if (
            isinstance(row, dict)
            and isinstance(row.get("sku"), str)
            and row["sku"].strip()
            and isinstance(row.get("title"), str)
            and row["title"].strip()
            and isinstance(row.get("price_cents"), int)
            and not isinstance(row.get("price_cents"), bool)
            and row["price_cents"] >= 0
        ):
            valid.append(row)
    return valid
`,
    explanation: '解码器只返回合法记录；上层仍要单独统计坏行数量，避免“过滤掉”等于“没发生”。',
    tags: ['JSON 解码'],
  },
  {
    type: 'code',
    question:
      '实现 `resume_state(checkpoint)`：输入字典可能含 cursor、completed、request_count；返回默认 `{"cursor":None,"completed":0,"request_count":0}` 的补齐副本，不修改输入。',
    starterCode: `def resume_state(checkpoint):
    pass
`,
    expectedOutput: '补齐后的恢复状态',
    tests: `old={"cursor":"p3","completed":2}; out=resume_state(old)
assert out=={"cursor":"p3","completed":2,"request_count":0}, out
assert old=={"cursor":"p3","completed":2}
`,
    answer: `def resume_state(checkpoint):
    return {
        "cursor": checkpoint.get("cursor"),
        "completed": checkpoint.get("completed", 0),
        "request_count": checkpoint.get("request_count", 0),
    }
`,
    explanation: '恢复状态应有确定默认值且不修改持久化对象，便于事务比较。',
    tags: ['恢复状态'],
  },
  {
    type: 'code',
    question:
      '实现 `page_report(pages, rows_seen, rows_written, duplicates, invalid)`：返回字典，含这些输入及 `completion_rate`（pages/4，固定四页项目）；输入不必校验页数。',
    starterCode: `def page_report(pages, rows_seen, rows_written, duplicates, invalid):
    pass
`,
    expectedOutput: '分页项目报告',
    tests: `r=page_report(4,12,10,1,1)
assert r["completion_rate"]==1.0 and r["rows_written"]==10, r
`,
    answer: `def page_report(pages, rows_seen, rows_written, duplicates, invalid):
    return {
        "pages": pages,
        "rows_seen": rows_seen,
        "rows_written": rows_written,
        "duplicates": duplicates,
        "invalid": invalid,
        "completion_rate": pages / 4,
    }
`,
    explanation: '报告字段固定，便于与 expected 比较；四页是项目协议常量。',
    tags: ['报告'],
  },
  {
    type: 'single',
    question: '项目为什么使用注入式 transport 而非直接联网？',
    options: [
      ['A', '因为 HTTP 无法解析'],
      ['B', '为了确定性、可注入故障且不依赖外部站点'],
      ['C', '为了隐藏测试结果'],
      ['D', '因为 SQLite 不能联网'],
    ],
    answer: 'B',
    explanation: '注入层让 503、超时、游标与重试可重复测试，符合课程离线边界。',
    tags: ['注入式传输'],
  },
  {
    type: 'judge',
    question: '项目中请求成功但解码失败时，应直接把整页标为 complete，以免重试。',
    answer: false,
    explanation: '解码失败是抽取阶段错误，应记录 invalid/failed，不能因 HTTP 200 标为 complete。',
    tags: ['阶段区分'],
  },
  {
    type: 'fill',
    question:
      '项目四页每页 3 条，1 条非法、1 条跨页重复，则 rows_seen=___，唯一合法行通常为 ___。',
    blanks: [['12'], ['10']],
    explanation: '12 条减去 1 条非法为 11 条合法，再去掉 1 个重复 SKU，通常为 10。',
    tags: ['行数计算'],
  },
  {
    type: 'open',
    question:
      '请写出项目 2 的 Definition of Done，至少包括正常、503、中断恢复、幂等、报告与离线边界。',
    referenceAnswer:
      '四页正常完成；页 3 的 503 遵守 Retry-After 并重试一次；第一次中断后从检查点恢复，不重抓已完成页；两次运行最终唯一行数相同、无重复；报告包含请求、重试、页数、行数、重复与非法；所有夹具本地合成，不联网、不保存真实令牌。',
    rubric: [
      { point: '正常与 503 路径', score: 2 },
      { point: '恢复与请求证据', score: 2 },
      { point: '幂等行数与报告', score: 2 },
      { point: '离线与敏感数据边界', score: 2 },
    ],
    explanation: 'DoD 应能产生自动测试证据，而不是抽象描述。',
    tags: ['DoD', '开放题'],
    keywords: ['四页', 'Retry-After', '检查点', '幂等', '离线'],
  },
  {
    type: 'open',
    question:
      '一次运行总请求 6、重试 1、提交页 4、唯一行 10、invalid 1、duplicate 1。请指出哪些数字可能互相矛盾，并如何验证。',
    referenceAnswer:
      '需核对协议：若原始 4 页各 3 条，rows_seen 应 12；10 唯一行加 1 duplicate 与 1 invalid 可解释为 12-1-1=10。请求 6 可能包含中断恢复后的第 4 页请求，需用 transport 事件核对。检查 checkpoint、页提交和 SQLite 行数，不能只看汇总数字。',
    rubric: [
      { point: '建立 12 条守恒', score: 2 },
      { point: '解释 duplicate 与 invalid', score: 2 },
      { point: '核对请求事件与恢复', score: 2 },
      { point: '提出数据库查询验证', score: 2 },
    ],
    explanation: '报告数字必须和原始协议、事件日志与数据库三者交叉验证。',
    tags: ['报告审计', '开放题'],
    keywords: ['12', 'duplicate', 'invalid', 'transport', 'SQLite'],
  },
  {
    type: 'single',
    question: '若 503 响应带 `Retry-After: 30`，但项目总时间预算仅剩 10 秒，合理动作是？',
    options: [
      ['A', '忽略等待立即重试'],
      ['B', '停止并记录预算不足，不能用立即重试抵消服务端等待'],
      ['C', '把 503 改写为 200'],
      ['D', '将所有页并行重试'],
    ],
    answer: 'B',
    explanation: '服务端明确要求等待；预算不够时应终止并保存状态，等待下次恢复。',
    tags: ['预算冲突'],
  },
]);

export const webCrawlingChapters07: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: '单机爬虫架构与可恢复性',
    goal: '把采集函数组织成状态清晰的流水线，用持久化、检查点和幂等写入实现断点续抓。',
    lessons: [stateLesson, persistenceLesson, projectLesson],
    exercises: [...stateExercises, ...persistenceExercises, ...projectExercises],
  },
];
