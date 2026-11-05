import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c06';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const robotsLesson = makeLesson({
  id: lesson1,
  title: 'robots.txt 的正确定位：协议不是法律授权',
  difficulty: 2,
  goals: [
    '说明 robots.txt 的作用、适用范围与“自愿排除协议”的边界。',
    '按 RFC 9309 理解 user-agent 分组、最长匹配、通配符与路径规则。',
    '为 robots 获取失败、未知分组与大小限制设计保守策略。',
    '写出可测试的 Allow/Disallow 判断，并把结果与法律/授权审查分开记录。',
  ],
  prerequisites: [
    '能解析 URL 的 path 与 query。',
    '理解 HTTP 状态码与重定向。',
    '知道页面公开可见不等于可任意使用。',
  ],
  problem:
    '很多教程把“通过 robots.txt”描述成“合法”，或把 Disallow 当成访问控制的等价物。二者都错。robots 是站点表达抓取偏好的一种协议，不是许可证；而用户仍需考虑服务条款、版权、隐私、合同与适用法律。工程上另一类错误是匹配规则写错：允许路径被误拒、禁止路径被误放，或 robots 暂时不可用时无限等待。',
  intuition:
    'robots 像门口写着“员工通道请勿进入”的提示。尊重它体现基本礼貌与运营者意愿，但它既不自动授予进入许可，也不把所有访问变成违法。爬虫应在请求前按协议判断，对不确定情况选择更保守的范围，并把授权/条款审查记录在另一个维度。',
  concepts: `
### 1. 协议位置与基本结构

robots.txt 位于站点根路径 \`/robots.txt\`，由若干 user-agent 分组组成，每组后跟 Allow、Disallow 等规则。空 Disallow 表示不禁止任何路径；\`Disallow: /\` 表示禁止全站。规则按 path 匹配，不等同于安全边界，也不能用来保护机密数据。

### 2. 最长匹配与通配符

当多条规则都匹配时，RFC 9309 采用更具体的匹配；\`*\` 匹配任意字符，结尾 \`$\` 锚定结束。常见实现还会对同长度规则使用 Allow 优先的约定。课程以明确夹具测试，而不是依赖模糊经验。查询字符串是否参与匹配需依据规范和实现，不能随意截断。

### 3. 获取失败与分组选择

robots 404 通常表示没有限制规则；5xx 或网络错误时，保守系统可以暂停该主机，等待稍后重试，而不是无限高频请求。未知 user-agent 应遵循规范中的分组选择逻辑；若没有适用组，可视为无该组规则，但团队的授权审查仍独立进行。

### 4. 不是法律授权

即使 robots 允许，仍需检查服务条款、授权范围、个人数据最小化、版权与保留期限；即使 robots 禁止，也不代表法律上一定禁止，但工程上应停止或缩小范围。课程把“协议判断”和“来源授权判断”做成两个字段，避免一个 \`allowed\` 布尔值承担过多含义。

本节讨论的是工程边界，不构成法律意见。具体项目必须结合适用法律、合同、服务条款与组织政策复核。
`,
  derivation: `
设站点根有规则：

\`\`\`text
User-agent: *
Disallow: /private/
Allow: /private/public/
Disallow: /*.json$
\`\`\`

对 \`/private/report.html\`：最长匹配规则是 \`/private/\`，拒绝。
对 \`/private/public/notice.html\`：匹配 \`/private/\` 与更长的 \`/private/public/\`，后者允许。
对 \`/data/items.json\`：匹配 \`/*.json$\`，拒绝；\`/data/items.json?view=1\` 是否匹配取决于使用的规范/实现，测试必须固定。

若 100 个 URL 中 12 个被禁止、3 个在 robots 获取失败后暂停，则本轮合规候选上限是 \`100-12-3=85\`。这 85 个仍要经过授权与范围规则，不能直接等同可采集 85 个。

匹配测试还应覆盖大小写、百分号编码、尾斜杠和查询字符串。不要用真实站点做唯一夹具；把规范理解的边界写成离线表格，才能在实现变化或第三方库升级时快速比较。若使用库解析 robots，也要保存库版本与关键测试结果。

报告中的 robots 状态应至少是 allow、deny、unknown 三态之一，并附匹配规则与抓取时间。只存布尔值会让“未知”被迫折叠成允许或拒绝，后续难以复核。

每次规则文件更新后，用回归表对比旧新结果，能发现意外放宽或收紧。

未知状态必须进入人工复核或保守暂停，不能悄悄变成允许。

审计日志至少保留请求主机、匹配路径、规则片段、决策与时间，便于复现。
`,
  diagram: '<Diagram type="crawl-robots" name="default" />',
  diagramNote:
    '图中先获取并解析 robots，再做 user-agent 分组与最长匹配，最后把“协议允许”与“来源授权”分别送入决策。两个分支不能折叠成一个勾。',
  caseStudy:
    '合成站点在 \`/robots.txt\` 中禁止 \`/account/\`、允许 \`/catalog/\`，并对 \`*.json$\` 设置禁止。爬虫不会抓账户页；它把目录页加入候选，访问前再检查授权记录。一个 5xx 响应使 robots 暂时未知，调度器将该主机放入等待队列，设置上限重试并记录 `robots_unavailable`。若 24 小时后仍未知，任务以“未验证”停止等待人工处理，而不是把未知当允许。',
  codePractice:
    'Demo 实现只覆盖常见语法的迷你 robots 解析器：user-agent `*`、Allow/Disallow、`*` 与 `$`。它不声称实现全部 RFC，而是让你观察匹配优先级与测试证据。练习要求处理空规则和更具体路径。',
  mistakes: [
    '把 robots 允许当作法律授权、把 Disallow 当作唯一合法边界。',
    '只匹配第一个 Disallow，忽略更长/更具体的 Allow。',
    'robots 获取失败后立即按“允许”继续抓取，或无限重试。',
    '忽略路径编码与 query 对匹配的影响，测试只用最简单路径。',
  ],
  relations:
    '本节依赖第 5 章的规范 URL，为第 6 章限速、第 7 章持久恢复和第 11 章聚焦项目提供请求前门禁。第 12 章会把授权、隐私与安全进一步分层。',
  summary:
    'robots 是抓取偏好协议，不是许可证或安全控制。正确解析用户组与最长匹配，区分允许、拒绝、未知和获取失败；授权审查独立记录。',
  references: [
    'RFC 9309 Robots Exclusion Protocol：<https://www.rfc-editor.org/rfc/rfc9309.html>',
    'Google Search Central robots.txt 文档：<https://developers.google.com/search/docs/crawling-indexing/robots/intro>',
    'RFC 9110 HTTP Semantics：<https://www.rfc-editor.org/rfc/rfc9110.html>',
  ],
  lab: [
    '写出 8 条 Allow/Disallow 规则，并手算 10 个路径的匹配结果。',
    '加入一个更长 Allow 覆盖 Disallow 的样本，验证最长匹配。',
    '为 robots 404、5xx 与超时分别定义状态和动作。',
    '把 allowed_by_robots 与 authorized_by_owner 记录为两个字段并解释差异。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“robots 允许”不能直接推出“可以采集、保存、再分发”？',
    '**自我解释二**：为什么更具体的 Allow 需要与 Disallow 一起比较，而不能先看到一条 Disallow 就停止？',
  ],
  predictionPrompt:
    '规则 `Disallow: /a/` 与 `Allow: /a/b/` 同时存在时，你预测 `/a/b/c` 与 `/a/x` 分别是什么结果？先写匹配长度再验证。',
  tips: [
    {
      kind: 'leak',
      text: 'robots 不是授权证明。保留来源、条款、目的与授权记录，不能只保存一个 allowed=true。',
    },
    {
      kind: 'pitfall',
      text: 'robots 获取失败不等于无限制；采用暂停、有限重试与人工复核比把未知当允许更稳妥。',
    },
    {
      kind: 'interview',
      text: '面试回答 robots 时必须同时说匹配协议、有限自动化边界与非法律授权，避免把它神化。',
    },
  ],
  demo: {
    title: '迷你 robots 最长匹配',
    lang: 'python',
    code: `import re

RULES = """User-agent: *
Disallow: /private/
Allow: /private/public/
Disallow: /*.json$
"""

def compile_rule(pattern):
    pieces = []
    for char in pattern:
        if char == "*":
            pieces.append(".*")
        elif char == "$":
            pieces.append("$")
        else:
            pieces.append(re.escape(char))
    return re.compile("^" + "".join(pieces))

def allowed(path):
    rules = []
    for line in RULES.splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        if key.strip().lower() in {"allow", "disallow"}:
            pattern = value.strip()
            if pattern:
                rules.append((len(pattern), key.lower() == "allow", pattern))
    matches = [(length, is_allow, pattern) for length, is_allow, pattern in rules if compile_rule(pattern).match(path)]
    if not matches:
        return True
    best = max(length for length, _, _ in matches)
    return any(is_allow for length, is_allow, _ in matches if length == best)

for path in ["/private/x", "/private/public/x", "/data/items.json", "/catalog/x"]:
    print(path, allowed(path))`,
  },
});

const rateLesson = makeLesson({
  id: lesson2,
  title: '限速、并发与 token bucket',
  difficulty: 3,
  goals: [
    '解释每主机限速、全局并发与请求预算为什么是三个不同控制。',
    '用 token bucket 推导容量、补充速率与突发量的关系，并手算等待时间。',
    '理解虚拟时钟如何让限速测试不真实等待。',
    '设计可观测的等待原因，避免把限速误解为网络慢。',
  ],
  prerequisites: [
    '理解请求是离散事件，平均速率与瞬时突发不同。',
    '会用简单公式进行时间换算。',
    '已完成 Frontier 与 robots 章节，知道请求前有多个门禁。',
  ],
  problem:
    '“每秒最多 2 个请求”常被实现成一个全局固定 sleep，结果不同主机互相拖慢；或者在多 worker 下计数各自为政，总速率翻倍。另一个极端是为每个请求安排精确均匀间隔，牺牲了合理的短突发能力。限速需要按主机、按时间窗维护状态，并与并发上限一起工作。',
  intuition:
    'token bucket 像每个主机有一只最多装 B 枚代币的桶，以每秒 R 枚补充。请求前必须取 1 枚；桶空就等到有代币。R 控制长期速率，B 控制允许的瞬时突发。代币不会无限储存，也不能因等待而透支未来。',
  concepts: `
### 1. 三件不同的控制

- **每主机速率**：同一 origin 的请求到达间隔与平均速率；
- **并发上限**：同一时刻未完成请求数，防止慢响应堆积；
- **全局预算**：一次任务允许请求的总量与总时间。

有 3 个主机、每主机 1 req/s、并发 4，不代表总速率恒为 3 req/s：若只有一个主机有任务，总速率仍受该主机的 1 req/s 限制；并发控制只规定同时最多 4 个，不等于每秒 4 个。

### 2. token bucket 公式

桶容量 B，补充速率 R req/s，当前 token 数 t，上次更新时间 last。当前时刻 now：

\`t = min(B, t + (now-last)×R)\`。

若 \`t >= 1\`，允许请求并 \`t -= 1\`；否则等待 \`(1-t)/R\` 秒。每秒固定补充与固定间隔相比，token bucket 允许最多 B 个突发，但长期平均不超过 R。

### 3. 虚拟时钟

测试注入 \`Clock.now()\` 与 \`Clock.advance()\`，不真实 sleep。请求记录时间、是否等待、等待对象（主机桶或并发槽）与 token 前后值。这样可在毫秒内验证 60 秒的调度行为。

### 4. 公平与背压

当 Frontier 有 100 个同主机任务时，限速器应形成有界等待队列；队列过长说明上游发现过快，需要背压而不是无限占内存。每主机桶最好独立，跨主机共享全局预算用于总影响控制。
`,
  derivation: `
设桶容量 B=3、速率 R=2 req/s，初始 3 枚代币，连续请求 5 次：

1. 第 1 次 t=3→2，立即；
2. 第 2 次 t=2→1，立即；
3. 第 3 次 t=1→0，立即；
4. 第 4 次 t=0，需要 1 枚，等 0.5 秒；t 在等待中变为 1，再扣到 0；
5. 第 5 次再等 0.5 秒。

若三个主机各有独立桶，同样的时间轴可以并行；全局并发 2 时，同时只允许 2 个请求在途。假设每请求耗时 0.2 秒、桶速率不成为瓶颈，10 个请求的理论最短完成时间不是 10×0.2=2 秒，而是受并发 2 限制约 \`ceil(10/2)×0.2=1.0\` 秒；若再叠加每主机 1 req/s，则还要按主机分布计算等待。

限速器还应处理时钟回拨和休眠：生产环境使用单调时钟计算间隔，避免系统时间被调整后产生大量“负等待”。当桶状态跨进程保存时，记录 last_update 与版本号；多个 worker 通过原子脚本或事务领取 token，失败则等待或让出任务。桶容量越大，瞬时突发越强，不能只因为请求快就无限增大。

可以把每主机调度看成小型交通灯：红灯期间任务仍可继续解析、写报告或等待其他主机，而不是阻塞整个进程。对单机实现，事件循环或线程池需要明确谁负责计时；对分布式实现，任务租约到期后要能回收。无论哪种实现，最终证据都是同一份“计划时间、实际时间、等待原因、在途数”时间轴。

桶参数应由目标站的承载能力、授权要求与任务预算共同决定，而不是从别处复制一个漂亮数字。先用低速率和小突发建立基线，再根据 429、延迟和错误率调整；每一次调整留下版本与观察窗口。

最终目标是让请求负载与服务端承受能力匹配，并让报告能够证明这一匹配关系。

报告可同时给出平均速率、最大在途数、P95 等待与每主机请求分布，避免只看一个平均数字。

这些指标应与调度配置一起存档，否则后续无法解释速率变化来自流量、参数还是实现缺陷。

所有数字都应带观察窗口与主机范围，避免跨时间直接比较。

记录版本号。
`,
  diagram: '<Diagram type="crawl-rate-limit" name="tokens" />',
  diagramNote:
    '图中请求先申请每主机 token，再申请并发槽；两个门禁的等待原因分开记录。代币随虚拟时钟补充，桶满后不再累积。',
  caseStudy:
    '合成三主机任务中，host-a 有 10 个请求、host-b 有 2 个、host-c 有 1 个。配置每主机 1 req/s、桶容量 2、全局并发 2。host-a 前两请求立即，第三请求等约 1 秒；host-b 可并行利用另一个并发槽，不被 a 的桶拖住。报告 `rate_wait_seconds` 与 `concurrency_wait_seconds` 分开；若合并成一个 `wait_seconds`，团队无法判断应调桶速率还是增加并发槽。',
  codePractice:
    'Demo 实现接受虚拟时间的 token bucket，输出每个请求的等待与剩余 token。练习要求你生成确定性调度表，并验证桶满不超额、桶空按速率等待。',
  mistakes: [
    '用全局 sleep 代替按主机桶，低流量主机也拖慢整个任务。',
    '多个 worker 各自限速，实际总速率乘上 worker 数。',
    '把并发上限误当速率上限，忽略每个请求的持续时间。',
    '测试真实 sleep 数十秒，既慢又容易因系统调度不稳定。',
  ],
  relations:
    '本节以 robots/范围门禁为前序，为第 7 章请求状态、第 11 章分布式租约与监控提供参数。token bucket 与第 5 章 Frontier 的优先级独立：先决定抓谁，再决定何时可发。',
  summary:
    '每主机速率、全局并发与总预算分别控制影响。token bucket 用 R 控长期速率、B 控突发；用虚拟时钟和分别计数的等待原因保证可测试、可解释。',
  references: [
    'RFC 9309 Robots Exclusion Protocol：<https://www.rfc-editor.org/rfc/rfc9309.html>',
    'Scrapy AutoThrottle 文档：<https://docs.scrapy.org/en/latest/topics/autothrottle.html>',
    'Python `time` 文档：<https://docs.python.org/3/library/time.html>',
  ],
  lab: [
    '画出每主机桶与全局并发槽的两层门禁。',
    '手算 B=3、R=2、5 个连续请求的时间轴。',
    '用虚拟时钟实现 20 个请求的确定性调度表。',
    '分别汇总 rate wait 与 concurrency wait，并解释一个调参案例。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么桶容量 B 控制突发，而补充速率 R 控制长期平均？请用连续请求解释。',
    '**自我解释二**：为什么多 worker 下的限速状态不能各存一份？',
  ],
  predictionPrompt:
    'B=2、R=1 req/s，初始满桶，连续 4 个请求的等待秒数序列会是什么？先写数字再运行。',
  tips: [
    {
      kind: 'performance',
      text: '桶状态按 host 分片，全局用锁的时间尽量短；不要让一个慢主机锁住其他主机调度。',
    },
    {
      kind: 'note',
      text: '并发和速率不是同一限制：并发看“同时在途”，速率看“单位时间发出”。',
    },
    {
      kind: 'pitfall',
      text: '等待时间必须有信号量和原因，否则用户会把限速误判为网络故障。',
    },
  ],
  demo: {
    title: '虚拟时间下的 token bucket',
    lang: 'python',
    code: `class Bucket:
    def __init__(self, rate, capacity):
        self.rate = rate
        self.capacity = capacity
        self.tokens = float(capacity)
        self.updated = 0.0
    def acquire(self, now):
        elapsed = max(0.0, now - self.updated)
        self.tokens = min(self.capacity, self.tokens + elapsed * self.rate)
        self.updated = now
        if self.tokens >= 1.0:
            self.tokens -= 1.0
            return now, 0.0
        wait = (1.0 - self.tokens) / self.rate
        return now + wait, wait

bucket = Bucket(rate=2, capacity=3)
now = 0.0
for i in range(5):
    now, wait = bucket.acquire(now)
    print(i + 1, "at", round(now, 2), "wait", round(wait, 2), "tokens", round(bucket.tokens, 2))`,
  },
});

const backoffLesson = makeLesson({
  id: lesson3,
  title: '退避、重试与可观测性',
  difficulty: 3,
  goals: [
    '按错误类别决定是否重试，而不是所有失败都重试。',
    '结合 Retry-After、指数退避、抖动、最大尝试和总预算设计策略。',
    '计算重试放大率、有效请求率与等待成本，解释为什么“重试更多”未必更可靠。',
    '把有限状态机与指标接入报告，避免无限重试和静默失败。',
  ],
  prerequisites: [
    '已理解 HTTP 状态码、超时与限速。',
    '会写纯函数并注入时钟/随机数以便测试。',
    '知道请求是外部副作用，重试可能改变服务负载。',
  ],
  problem:
    '网络超时、429、503、403、解析失败看起来都像“失败”，但可重试性完全不同。开发者常写一个 while 循环无限重试，或在 429 后立即用并行请求补偿，最终放大故障。另一方面，完全不重试又会把短暂网络抖动变成永久缺页。可靠系统需要可解释的策略，而不是勇气。',
  intuition:
    '重试是向服务器借时间。借得起的前提是错误可能是暂态、请求有界、预算充足。每次重试都应更慢、更少、更谨慎；如果服务器明确让你等，就听它的。把每次等待和失败类别写进报告，才能知道系统是在恢复还是在制造压力。',
  concepts: `
### 1. 错误分类

- **可重试**：连接重置、超时、部分 5xx，通常有上限；
- **遵守服务端等待**：429、503 带 Retry-After；
- **停止**：401/403、明确的策略拒绝、超出范围；
- **终止**：404/410、永久坏格式；
- **需修复代码**：解析器对结构预期错误，通常重试无意义。

### 2. 退避公式

第 n 次重试前基础等待：\`min(cap, base × 2^(n-1)) × jitter_n\`。jitter 可在一定区间随机或注入确定性序列。若有 Retry-After，取 \`max(server_wait, local_wait)\` 或直接遵循服务端较大值，受总预算约束。

### 3. 重试预算

设首轮 N=500、失败率 20%、最多 3 次重试，期望新增量近似 \`500×0.2 + 500×0.2² + 500×0.2³ = 100+20+4=124\`，相对首轮放大 24.8%。若每轮失败率都接近 80%，最坏新增可达 1500，放大 300%。所以预算同时需要最大尝试次数与总请求上限。

### 4. 指标与状态

记录 \`attempts\`、\`final_status\`、\`retryable\`、\`wait_seconds\`、\`retry_after_respected\`、\`budget_exhausted\`。成功恢复率可用“最终成功且曾失败”的请求数除以前轮失败数；还要报告总等待时间和 429/503 比例。单看最终错误码无法区分一次重试与十次重试。
`,
  derivation: `
基础等待 base=1、cap=6、抖动序列 0.8/1.1/0.9：

- 第 1 次：\`min(6,1×1)=1\`，等待 0.8 秒；
- 第 2 次：\`min(6,1×2)=2\`，等待 2.2 秒；
- 第 3 次：\`min(6,1×4)=4\`，等待 3.6 秒；
- 若第 1 次响应 Retry-After=10，则第 1 次等待改为 10 秒，总计至少 15.8 秒。

若一组任务 200 个请求，首轮 80 个失败，其中 50 个重试后成功、20 个再次失败、10 个被策略停止，则恢复率为 50/80=62.5%，最终失败率（相对首轮 200）为 \`(20+10)/200=15%\`。若只报告“最终成功 120 个”，会遗漏请求预算和失败分类。

重试状态机应保存当前尝试次数、下一次允许时间与最后错误码。进入 dead-letter 前要区分“暂停待人工授权”“永久失败”和“预算耗尽”；三者后续动作不同。监控重试有效性时，可比较加入退避前后的恢复率与请求放大率，若恢复提升很小而放大显著，说明策略可能在给故障系统增加负担。

还要防止“成功后被重试覆盖”：第一次请求成功并写入记录，重试结果却因网络乱序稍后返回并覆盖成旧值。写入应带幂等键与版本/时间，只有更新版本才能覆盖；否则重试链中的迟到响应会破坏数据。

对每次重试记录原因与结果，形成恢复矩阵：超时恢复率、503 恢复率、429 等待是否符合预期、预算耗尽数量。矩阵能帮助团队判断是降低并发、延长预算，还是停止某个来源，而不是凭单次日志做全局决策。

这套证据也让“重试是否值得”成为可检验的问题，而不是团队偏好之争。

每次策略变化后重跑同一失败夹具，比较恢复率、请求放大与总等待，确认改善不是偶然。

对不能恢复的请求保留最后错误与停止原因，并提供人工重试入口，而不是让状态永久悬空。

恢复后再次验证业务字段，确认迟到响应没有造成旧值覆盖。

这就是幂等写入与重试策略必须一起设计的原因，也是项目验收的证据。
`,
  diagram: '<Diagram type="crawl-rate-limit" name="backoff" />',
  diagramNote:
    '时间轴展示失败发生在不同层：超时按指数退避，429 优先遵循 Retry-After，403 直接停止，404 进入终止。每种分支有各自计数。',
  caseStudy:
    '合成 API 第 3 页首次返回 503 并带 `Retry-After: 2`，第 4 页返回 404，第 5 页一次连接超时后恢复。调度器对第 3 页等待 2 秒，对第 4 页不重试并记录 missing，对第 5 页采用 0.8 秒退避后成功。报告显示请求总数为 7（4 页首次 + 503 重试 + 超时重试 + 成功），而唯一页面仍为 5；重试放大率为 7/5=1.4。团队据此确认重试仍在预算内。',
  codePractice:
    'Demo 生成可注入抖动与 Retry-After 的退避序列，并让总等待受预算截断。练习会验证第 n 次等待、最大尝试次数和停止条件。',
  mistakes: [
    '对 403、404、解析错误无限重试，既无效又扩大负载。',
    '只加随机抖动而不限制总尝试和总时间。',
    '所有 worker 同时在同一秒重试，形成同步冲击。',
    '只记录最终异常，不记录尝试次数和等待，无法解释放大率。',
  ],
  relations:
    '本节把第 2 章的重试策略扩展到多主机、限速与可观测状态，为第 7 章状态机和第 11 章分布式故障恢复提供规则。重试预算也是第 12 章安全预算的一部分。',
  summary:
    '先分类错误，再使用有上限的指数退避；Retry-After 优先，抖动避免同步，总预算保护系统。报告必须让重试放大和等待成本可复核。',
  references: [
    'RFC 9110 HTTP Semantics（429/503 与 Retry-After）：<https://www.rfc-editor.org/rfc/rfc9110.html>',
    'Scrapy 重试设置文档：<https://docs.scrapy.org/en/latest/topics/downloader-middleware.html#retry-middleware>',
    'Google SRE Book：<https://sre.google/sre-book/table-of-contents/>',
  ],
  lab: [
    '把 6 类错误分别标为可重试、停止、终止或修复。',
    '手算 base=1、cap=6、三次退避与 Retry-After=10 的等待。',
    '为 500 个请求、20% 首轮失败计算期望与最坏重试预算。',
    '生成虚拟时钟测试，断言预算耗尽后不再发出请求。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“更多重试”有时反而降低系统整体可靠性和数据完整性？',
    '**自我解释二**：Retry-After 与本地指数退避冲突时，为什么要受总预算约束后再决定？',
  ],
  predictionPrompt:
    '如果 500 个请求中有 20% 首轮失败，最多 3 次重试，你预测期望新增请求是多少？先写等比和再验证。',
  tips: [
    {
      kind: 'performance',
      text: '重试会放大流量；高失败时先降并发或暂停，而不是用更多 worker 补偿。',
    },
    {
      kind: 'note',
      text: '抖动可由测试注入固定序列，生产使用随机数；可测试性与随机性可以同时满足。',
    },
    {
      kind: 'leak',
      text: '失败日志不要输出完整 URL 查询凭据、Cookie 或 Authorization；保留脱敏标识。',
    },
  ],
  demo: {
    title: '有预算的确定性退避',
    lang: 'python',
    code: `def plan_retries(failures=3, base=1.0, cap=6.0, jitters=(0.8,1.1,0.9), retry_after=None, budget=12.0):
    waits = []
    total = 0.0
    for n, jitter in enumerate(jitters[:failures], start=1):
        wait = min(cap, base * 2 ** (n - 1)) * jitter
        if retry_after is not None and n == 1:
            wait = max(wait, retry_after)
        if total + wait > budget:
            break
        waits.append(round(wait, 2))
        total += wait
    return {"waits": waits, "total": round(total, 2), "budget_exhausted": len(waits) < failures}

print(plan_retries())
print(plan_retries(retry_after=10, budget=20))`,
  },
});

const robotsExercises = makeExercises(chapterId, lesson1, 2, [
  {
    type: 'single',
    question: 'robots.txt 最准确的定位是？',
    options: [
      ['A', '自动授予采集权利的法律许可证'],
      ['B', '站点表达自动抓取偏好的自愿排除协议'],
      ['C', '服务器端的登录认证'],
      ['D', '保证页面不含个人信息的证明'],
    ],
    answer: 'B',
    explanation: 'robots 是抓取偏好协议，不替代授权、服务条款、隐私与版权审查。',
    tags: ['robots 边界'],
  },
  {
    type: 'judge',
    question: '如果 robots.txt 不禁止某页，采集者就可以不受其他限制地保存和再分发该页。',
    answer: false,
    explanation: 'robots 只是协议；授权、隐私、版权、合同与适用法律是独立判断。',
    tags: ['授权独立'],
  },
  {
    type: 'fill',
    question:
      '当多条 robots 规则匹配时，RFC 9309 使用更 ___ 的匹配；`*` 表示 ___，结尾 `$` 表示路径结束锚点。',
    blanks: [['具体', '长'], ['任意字符']],
    explanation: '更长、更具体的模式优先；通配符和结尾锚点改变匹配范围。',
    tags: ['robots 匹配'],
  },
  {
    type: 'multiple',
    question: 'robots 获取遇到持续 5xx 时，哪些策略较稳妥？',
    options: [
      ['A', '暂停该主机并有限重试'],
      ['B', '记录未知状态并人工复核'],
      ['C', '把未知直接当允许并无限并发'],
      ['D', '把失败原因写入报告'],
    ],
    answer: ['A', 'B', 'D'],
    explanation: '未知时保守暂停、受控重试、保留证据；把未知当允许会扩大风险。',
    tags: ['robots 故障'],
  },
  {
    type: 'code',
    question:
      '实现 `robots_allows(rules, path)`：rules 为 `(allow, pattern)` 列表，pattern 支持 `*` 与结尾 `$`；按匹配模式长度取最长，同长度 Allow 优先；无匹配返回 True。',
    starterCode: `import re

def robots_allows(rules, path):
    pass
`,
    expectedOutput: '布尔值',
    tests: `rules=[(False,"/private/"),(True,"/private/public/"),(False,"/*.json$")]
assert robots_allows(rules,"/private/x") is False
assert robots_allows(rules,"/private/public/x") is True
assert robots_allows(rules,"/catalog/x") is True
assert robots_allows(rules,"/data/a.json") is False
`,
    answer: `import re

def robots_allows(rules, path):
    matches = []
    for allow, pattern in rules:
        regex = "^" + "".join(".*" if c == "*" else "$" if c == "$" else re.escape(c) for c in pattern)
        if re.match(regex, path):
            matches.append((len(pattern), allow))
    if not matches:
        return True
    longest = max(length for length, _ in matches)
    return any(allow for length, allow in matches if length == longest)
`,
    explanation: '收集全部匹配后比较模式长度；同长度任一 Allow 即允许，避免先匹配即返回。',
    tags: ['robots 代码'],
    allowedModules: ['re'],
  },
  {
    type: 'single',
    question: '若 robots 404、页面正常返回 200，工程上通常意味着？',
    options: [
      ['A', '站点没有提供该 robots 规则文件，仍需做其他授权审查'],
      ['B', '所有页面都被明确禁止'],
      ['C', '页面是软 404'],
      ['D', '浏览器无法访问页面'],
    ],
    answer: 'A',
    explanation: 'robots 404 表示规则文件缺失，不等于全站禁止，也不授予其他权利。',
    tags: ['robots 404'],
  },
  {
    type: 'judge',
    question: '`Disallow: /` 表示禁止全部路径，空 `Disallow:` 表示没有禁止路径。',
    answer: true,
    explanation: '这是 robots 常见语义；仍需结合用户组与具体规则匹配。',
    tags: ['robots 语义'],
  },
  {
    type: 'open',
    question:
      '某站点 robots 禁止 `/account/`、允许 `/catalog/`，但服务条款未授权批量复制商品描述。说明你会如何记录两个判断。',
    referenceAnswer:
      '分两个字段记录：robots_allowed 与 authorization_status。前者依据匹配规则，后者依据目的、条款、许可与数据处理要求；即使 robots 允许，若授权不足也应停止或缩小范围。报告保存来源、日期和审查人，而不是合并成一个 allowed。',
    rubric: [
      { point: '明确 robots 与授权独立', score: 3 },
      { point: '保存来源和审查记录', score: 3 },
      { point: '给出停止或缩小范围动作', score: 2 },
    ],
    explanation: '工程门禁与法律/授权门禁必须分开，不能让一个布尔值替代全部判断。',
    tags: ['授权边界', '开放题'],
    keywords: ['robots_allowed', 'authorization_status', '来源', '范围'],
  },
]);

const rateExercises = makeExercises(chapterId, lesson2, 3, [
  {
    type: 'single',
    question: '每主机 1 req/s 同时设置全局并发 4，最准确的理解是？',
    options: [
      ['A', '总速率恒定 4 req/s'],
      ['B', '同一主机仍受 1 req/s 限制，全局最多 4 个在途请求'],
      ['C', '每个主机可发 4 req/s'],
      ['D', '并发数替代了速率限制'],
    ],
    answer: 'B',
    explanation: '速率限制请求发起频率，并发限制同时在途数量，两者独立叠加。',
    tags: ['速率与并发'],
  },
  {
    type: 'multiple',
    question: 'token bucket 的容量 B 与速率 R 分别主要影响？',
    options: [
      ['A', 'B 影响瞬时突发放行量'],
      ['B', 'R 影响长期平均请求速率'],
      ['C', 'B 自动等于并发数'],
      ['D', 'R 可无限提高浏览器下载速度'],
    ],
    answer: ['A', 'B'],
    explanation: 'B 控突发，R 控平均；它们不自动成为并发上限，也不保证带宽。',
    tags: ['token bucket'],
  },
  {
    type: 'fill',
    question:
      '桶容量 3、速率 2 req/s、初始满桶，连续 5 个请求中前 ___ 个立即通过，后 2 个约各等待 ___ 秒。',
    blanks: [['3'], ['0.5']],
    explanation: '前 3 个消耗存量；第 4、5 个各需补充 1 枚，1/2=0.5 秒。',
    tags: ['token 计算'],
  },
  {
    type: 'judge',
    question: '多 worker 各自维护一份每主机桶，也能保证全局每主机平均速率不超标。',
    answer: false,
    explanation: '各自计数会把有效速率乘以 worker 数；共享状态或集中许可才有一致上限。',
    tags: ['多 worker 限速'],
  },
  {
    type: 'code',
    question:
      '实现 `bucket_schedule(rate, capacity, count)`：虚拟时钟从 0 开始，初始满桶；返回每个请求开始时间（保留两位小数）。请求之间不推进额外时间。',
    starterCode: `def bucket_schedule(rate, capacity, count):
    pass
`,
    expectedOutput: '请求开始时间列表',
    tests: `assert bucket_schedule(2,3,5)==[0.0,0.0,0.0,0.5,1.0]
assert bucket_schedule(1,2,4)==[0.0,0.0,1.0,2.0]
`,
    answer: `def bucket_schedule(rate, capacity, count):
    tokens = float(capacity)
    now = 0.0
    times = []
    for _ in range(count):
        if tokens >= 1:
            tokens -= 1
            times.append(round(now, 2))
            continue
        wait = (1 - tokens) / rate
        now += wait
        tokens = 0.0
        times.append(round(now, 2))
    return times
`,
    explanation: '用虚拟时间推进；桶空时等待恰好补足 1 枚代币，不积累额外空闲。',
    tags: ['虚拟时钟'],
  },
  {
    type: 'code',
    question:
      '实现 `per_host_intervals(hosts, rate)`：每个主机独立按 1/rate 秒均匀间隔生成 3 个虚拟时间，返回字典 host→列表，时间保留两位小数。',
    starterCode: `def per_host_intervals(hosts, rate):
    pass
`,
    expectedOutput: '每主机请求时间表',
    tests: `assert per_host_intervals(["a","b"],2)=={"a":[0.0,0.5,1.0],"b":[0.0,0.5,1.0]}
`,
    answer: `def per_host_intervals(hosts, rate):
    interval = 1 / rate
    return {host: [round(i * interval, 2) for i in range(3)] for host in hosts}
`,
    explanation: '每主机桶彼此独立，因此不同主机的时间表可以重叠；全局并发另需限制。',
    tags: ['按主机分片'],
  },
  {
    type: 'single',
    question: '请求等待原因被分别记录为 `rate_wait` 与 `concurrency_wait`，最大价值是？',
    options: [
      ['A', '让日志更长'],
      ['B', '区分是限速还是并发槽不足，指导正确调参'],
      ['C', '自动绕过 429'],
      ['D', '把价格转成整数'],
    ],
    answer: 'B',
    explanation: '不同瓶颈对应不同调整；合并等待时间会掩盖真实原因。',
    tags: ['可观测性'],
  },
  {
    type: 'judge',
    question: '固定每 1/rate 秒 sleep 与 token bucket 在允许突发方面完全等价。',
    answer: false,
    explanation: '固定间隔限制突发；token bucket 允许桶容量范围内的短突发。',
    tags: ['算法差异'],
  },
  {
    type: 'open',
    question:
      '3 个主机、每主机 1 req/s、桶容量 2、全局并发 2。请说明 10 个 host-a 请求与 2 个 host-b 请求如何调度，以及报告哪些指标。',
    referenceAnswer:
      'host-a 前 2 个立即，其后约每秒 1 个；host-b 可在另一个并发槽内以自身桶速率执行，不被 a 的桶阻塞。报告 per_host_requests、rate_wait、concurrency_wait、max_inflight、total_wait 与请求总数，并保留时间轴证据。',
    rubric: [
      { point: '主机桶独立', score: 2 },
      { point: '全局并发生效', score: 2 },
      { point: '等待原因分开', score: 2 },
      { point: '报告可复核', score: 2 },
    ],
    explanation: '正确调度需要两层门禁，报告应能看出哪层造成等待。',
    tags: ['调度案例', '开放题'],
    keywords: ['host-a', '并发', 'rate_wait', 'per_host'],
  },
  {
    type: 'single',
    question: '等待队列无限增长通常说明需要先做什么？',
    options: [
      ['A', '增加内存'],
      ['B', '在上游实施背压并限制发现/入队速度'],
      ['C', '删除所有状态'],
      ['D', '关闭 robots 检查'],
    ],
    answer: 'B',
    explanation: '发现速度快于消费能力是背压问题；只加内存会延后故障。',
    tags: ['背压'],
  },
]);

const backoffExercises = makeExercises(chapterId, lesson3, 3, [
  {
    type: 'single',
    question: '收到 `403 Forbidden` 时最合理的默认动作是？',
    options: [
      ['A', '无限重试并随机更换身份'],
      ['B', '停止并检查授权/范围，不能把绕过作为重试策略'],
      ['C', '当作 200 继续解析'],
      ['D', '立即并发加倍'],
    ],
    answer: 'B',
    explanation: '403 表示服务器拒绝访问；应停止并复核授权，不能通过伪造身份绕过。',
    tags: ['错误分类'],
  },
  {
    type: 'multiple',
    question: '重试策略应同时受哪些限制？',
    options: [
      ['A', '最大尝试次数'],
      ['B', '总时间预算'],
      ['C', '总请求/流量预算'],
      ['D', '无限并发'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '多重上限防止失败时指数放大；无限并发会让重试变成攻击性负载。',
    tags: ['重试预算'],
  },
  {
    type: 'fill',
    question:
      'base=1、cap=6，基础等待第 3 次为 ___ 秒；再乘抖动 0.9 后为 ___ 秒。',
    blanks: [['4'], ['3.6']],
    explanation: '第 3 次指数项 2^(3-1)=4，乘 0.9=3.6。',
    tags: ['退避计算'],
  },
  {
    type: 'judge',
    question: 'Retry-After 给出 30 秒时，若任务总预算只剩 10 秒，可以忽略它并立即重试。',
    answer: false,
    explanation: '应遵守服务端等待；若超出总预算，停止并记录预算耗尽，而不是立即重试。',
    tags: ['Retry-After'],
  },
  {
    type: 'code',
    question:
      '实现 `retry_decision(status, attempts, max_attempts, retry_after=None)`：403/401 返回 "stop"；404/410 返回 "terminal"；429 或 503 在 attempts<max_attempts 时返回 "retry"；其他返回 "unknown"。',
    starterCode: `def retry_decision(status, attempts, max_attempts, retry_after=None):
    pass
`,
    expectedOutput: '决策字符串',
    tests: `assert retry_decision(403,1,3)=="stop"
assert retry_decision(404,1,3)=="terminal"
assert retry_decision(429,1,3,30)=="retry"
assert retry_decision(503,3,3)=="unknown"
`,
    answer: `def retry_decision(status, attempts, max_attempts, retry_after=None):
    if status in {401, 403}:
        return "stop"
    if status in {404, 410}:
        return "terminal"
    if status in {429, 503} and attempts < max_attempts:
        return "retry"
    return "unknown"
`,
    explanation: '决策函数只做分类；等待与预算在上层处理。超过尝试次数后不再返回 retry。',
    tags: ['重试决策'],
  },
  {
    type: 'code',
    question:
      '实现 `retry_waits(base=1, cap=6, count=3, jitter=0.5)`：第 n 次基础等待 min(cap, base×2^(n-1))，统一乘 jitter；返回保留两位小数的列表。',
    starterCode: `def retry_waits(base=1, cap=6, count=3, jitter=0.5):
    pass
`,
    expectedOutput: '等待秒数列表',
    tests: `assert retry_waits()==[0.5,1.0,2.0]
assert retry_waits(base=2,cap=6,count=4,jitter=1.0)==[2,4,6,6]
`,
    answer: `def retry_waits(base=1, cap=6, count=3, jitter=0.5):
    return [round(min(cap, base * 2 ** (n - 1)) * jitter, 2) for n in range(1, count + 1)]
`,
    explanation: '指数从 n-1 开始，等待受 cap 截断；统一抖动仅用于演示，生产中可逐次随机。',
    tags: ['退避序列'],
  },
  {
    type: 'single',
    question: '重试放大率最合理的定义之一是？',
    options: [
      ['A', '重试后记录数 / 页面数'],
      ['B', '总请求数 / 唯一首轮请求数'],
      ['C', '状态码 / 2'],
      ['D', '并发数 / 桶容量'],
    ],
    answer: 'B',
    explanation: '它衡量为完成同一批首轮目标额外发出了多少请求。',
    tags: ['放大率'],
  },
  {
    type: 'judge',
    question: '指数退避加入抖动可以降低多个客户端在同一时刻同步重试的概率。',
    answer: true,
    explanation: '抖动打散重试时间，减少 thundering herd 式的同步冲击。',
    tags: ['抖动'],
  },
  {
    type: 'open',
    question:
      '200 个请求首轮失败 80 个，重试后 50 个恢复、20 个仍失败、10 个按策略停止。请计算恢复率与相对首轮失败率的最终未成功比例。',
    referenceAnswer:
      '恢复率 50/80=62.5%；最终未成功 30 个，相对全部 200 的比例 15%，相对首轮失败 80 的比例 37.5%。还应报告重试次数、等待时间、最终错误分类与重试放大率。',
    rubric: [
      { point: '恢复率 62.5%', score: 2 },
      { point: '最终未成功 30/200=15%', score: 2 },
      { point: '区分不同分母', score: 2 },
      { point: '补充重试与等待指标', score: 2 },
    ],
    explanation: '重试效果要同时看恢复与剩余失败，不能只报成功数。',
    tags: ['重试指标', '开放题'],
    keywords: ['62.5%', '15%', '80', '30'],
  },
  {
    type: 'single',
    question: '如果在 429 高发时直接增加并发补偿，最可能发生什么？',
    options: [
      ['A', '服务端更轻松'],
      ['B', '重试风暴与更严重的限流'],
      ['C', '所有请求变 200'],
      ['D', 'robots 自动允许'],
    ],
    answer: 'B',
    explanation: '并发增加会放大请求压力，应在 429 时降速、遵循等待并减少批处理量。',
    tags: ['故障放大'],
  },
]);

export const webCrawlingChapters06: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: 'robots.txt、礼貌抓取与限速',
    goal: '正确解释 robots.txt，并把每主机限速、并发、退避和可观测指标落实到采集策略中。',
    lessons: [robotsLesson, rateLesson, backoffLesson],
    exercises: [...robotsExercises, ...rateExercises, ...backoffExercises],
  },
];
