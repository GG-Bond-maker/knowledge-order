import type { Chapter } from '../../../types';
import { makeExercises, makeLesson } from './authoring';

const chapterId = 'web-crawling-c12';
const lesson1 = `${chapterId}-l01`;
const lesson2 = `${chapterId}-l02`;
const lesson3 = `${chapterId}-l03`;

const complianceLesson = makeLesson({
  id: lesson1,
  title: '合规决策树与隐私边界',
  difficulty: 3,
  goals: [
    '把来源授权、服务条款、robots、个人数据、用途、保留和再分发放进同一决策树。',
    '用目的限定与数据最小化决定“是否收集、收集什么、保存多久”。',
    '识别公开可见不等于可无限复制，robots 不等于法律授权。',
    '建立可审计的采集记录、访问控制和删除流程，并明确课程不是法律意见。',
  ],
  prerequisites: [
    '理解 robots.txt 的自愿协议定位与限速。',
    '知道字段契约、血缘与 PII 最小化。',
    '已完成项目 4，能区分范围内页面与未授权页面。',
  ],
  problem:
    '技术上抓得到，不代表允许抓、允许保存、允许合并或允许再分发。一个公开职位页面可能含招聘者邮箱，一个公开评论页可能含健康信息，一个内部测试页可能只是忘记加认证。若团队只问“HTTP 返回 200 吗”，就会把合规、隐私和安全风险留到发布之后。决策树的价值是把“授权、目的、字段、期限、访问、删除”逐项落到可审计动作。',
  intuition:
    '把采集想成借阅档案：先确认是否有权进入、目的是否明确、需要抄哪些页、能保存多久、谁能看、何时归还或销毁。robots 只是馆内的一张“请勿进入此区”提示，不是产权证或法律意见；公开网页也不等于任何人都可以永久复制其中的个人资料。',
  concepts: `
### 1. 合规决策树

1. 来源是否允许访问？是否在授权范围内？
2. 是否涉及登录、验证码、付费墙或访问控制？若是，停止。
3. robots 是否允许该路径？拒绝时尊重排除，不把技术规避当成解决方案。
4. 是否包含个人数据或敏感属性？用途是否真的需要？
5. 能否只收集聚合值、布尔值或哈希？
6. 保存多久、谁可访问、如何删除、是否会再分发？
7. 是否保留来源、时间、版本和授权证据？

任何一项没有答案，都不应以“先抓再说”推进。课程不是法律意见；具体场景需结合当地法律、合同、服务条款和组织政策。

### 2. 目的限定与最小化

目的限定意味着字段和保留时间服务于明确用途。若目标是研究职位数量，不需要保存招聘者姓名和电话；若只需判断是否存在联系方式，保存布尔值或哈希即可。最小化不是“尽量少字段”这么模糊，而是对每个字段问：没有它能否完成用途？能否用更粗粒度替代？

### 3. 公开、授权与再分发

公开可见只说明没有登录墙，不代表允许批量采集、长期保存、与其它数据合并或公开再分发。服务条款、版权、数据库权利、隐私与合同义务可能分别限制不同动作。课程只讨论获准或合成数据；不提供绕过登录、验证码、付费墙或限速的方法。

### 4. 记录与可审计

至少记录：数据源、授权依据或测试性质、采集时间、抓取目的、字段清单、保留期限、访问角色、删除工单和 extractor_version。审计记录本身也要最小化，不能把 Cookie、token、完整正文和联系方式写进日志。

### 5. 删除与保留

删除要覆盖主库、缓存、导出、备份和日志中的副本；只在主表标记 tombstone 不等于个人数据已删除。保留期限到期前应自动产生删除任务，完成后保留最小审计事实，例如“某 run 删除了 N 条记录”，而不是继续保留原值。

### 6. 案例判断

| 场景 | 风险 | 课程建议 |
| --- | --- | --- |
| 公开职位列表 | 招聘者联系方式、聚合后再分发 | 只取职位字段；联系方式不入公开集 |
| 用户评论 | 用户名、健康/财务信息、版权 | 只做获准研究；脱敏与短保留 |
| 医疗信息 | 敏感属性、准标识符 | 不纳入本课程默认练习 |
| 内部测试页 | 未授权访问、凭据泄露 | 停止并要求明确授权 |
| 机器人排除路径 | 越界访问 | 尊重 robots，不绕过 |

### 7. 合规不是一次性勾选

采集前审查、运行中监控、发布前质量与 PII 扫描、到期删除，是一个循环。规则、授权和业务目的变化时要重新评估；不要把三年前的“公开”结论复制到今天的系统。
`,
  derivation: `
假设任务有 1000 条候选记录，其中 120 条含邮箱、40 条含手机号、30 条含健康关键词。目标只是统计职位数量与地点分布：

- 不需要邮箱/手机号，公开导出字段设为 0 个联系方式；
- 可保留 has_contact 布尔值，命中率 12%；
- 健康关键词不进入分析字段，若研究确实需要，应单独评估目的、最小化和访问控制；
- 原始正文若必须暂存，设置 7 天保留并限制访问，到期删除；
- 报告记录 120 条 PII 命中、120 条脱敏、0 条公开导出联系方式。

若为了“以后可能有用”保存全部联系方式，风险扩大了 1000 条，却没有增加当前用途的价值。若批量合并外部泄露数据，风险进一步升级，超出“公开网页采集”的范围。

审计成本也要算：1000 条记录的删除工单、访问日志和导出版本都需要资源。最小化能同时降低隐私风险与运维成本，是最直接的工程收益。

决策树还应留下“谁批准、何时复核、依据哪一版政策”的记录。否则同一条数据在人员变化后会被重新解释，旧授权可能被无限续用。对自动化系统，最实用的做法是把授权状态、目的代码、字段白名单、保留天数和访问组写进配置，并由发布门禁读取；配置变更需要审查，而不是在临时脚本里悄悄放宽。
`,
  diagram: '<Diagram type="crawl-compliance" name="consent" />',
  diagramNote:
    '合规图从授权与用途开始，经过 robots、PII、最小化和保留，再到发布与删除；任何“未授权/目的不明”的分支都终止，而不是靠技术绕过。',
  caseStudy:
    '团队准备发布公开职位统计。原始页面含招聘者邮箱。产品目标只需要职位数、地点和薪资范围，因此数据契约不包含邮箱；临时正文保存 7 天，受限目录访问；公开 JSONL 只含聚合字段和 source_url 的脱敏版本。发布前 PII 扫描为 0，7 天后删除原文件并保留一条不含个人值的删除审计。',
  codePractice:
    'Demo 用纯函数判断保留期限并最小化字段；站内不使用真实个人资料。代码只演示数据治理动作，不构成法律意见，也不提供绕过访问控制的实现。',
  mistakes: [
    '把 robots 允许误认为法律授权。',
    '因为页面公开就保存并再分发全部联系方式。',
    '只做主表删除，忘记缓存、导出和备份。',
    '用“研究”“内部使用”作为无限保留的万能理由。',
    '在日志和错误信息中泄露 Cookie、token 或个人资料。',
  ],
  relations:
    '本节把第 6 章 robots、第 9 章隐私最小化和第 11 章监控组合成治理闭环；第 12 章安全部分处理系统层 SSRF，项目 5 则把保留、版本与删除证据放进可演示系统。',
  summary:
    '合规决策先问授权与目的，再问字段、期限、访问和删除。robots 是排除协议而非法律授权；公开可见不等于可无限复制。最小化、可审计和可删除比“抓到更多”更重要。',
  references: [
    'RFC 9309 Robots Exclusion Protocol：<https://www.rfc-editor.org/rfc/rfc9309>',
    'NIST 隐私框架：<https://www.nist.gov/privacy-framework>',
    'OWASP 日志记录备忘单：<https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html>',
  ],
  lab: [
    '为一个公开职位采集写出授权、目的、字段、保留与访问五项判断。',
    '把含邮箱的记录最小化为聚合字段，并说明删除流程。',
    '列出一个不应抓取的登录后或验证码场景。',
    '检查一份日志，删去 token、Cookie 与不必要的个人资料。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么“网页公开”不能直接推出“可以永久保存并再分发”？',
    '**自我解释二**：目的限定如何改变字段契约与保留期限？',
  ],
  predictionPrompt:
    '一个公开职位页含招聘者手机号，但你的目标只是统计地点。你预测是否需要保存手机号？先写最小化理由再回答。',
  tips: [
    {
      kind: 'leak',
      text: '合规先于抓取：授权、目的和 PII 判断不通过时，不应以“先采后删”推进。',
    },
    {
      kind: 'note',
      text: '审计记录也要最小化；不要为了证明合规而保存完整 Cookie、token 或个人资料。',
    },
    {
      kind: 'interview',
      text: '说明 robots 是协议、公开不等于授权，并强调课程不提供绕过访问控制的方法。',
    },
  ],
  demo: {
    title: '字段最小化与保留期限',
    lang: 'python',
    code: `from datetime import datetime, timedelta, timezone

def minimize(record, allowed_fields):
    return {key: record.get(key) for key in allowed_fields}

def retention_expired(created_at, now, days):
    created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return now - created >= timedelta(days=days)

record = {"job":"合成职位","city":"上海","email":"demo@example.test","phone":"13800138000"}
print(minimize(record, ["job", "city"]))
now = datetime(2026, 11, 12, tzinfo=timezone.utc)
print(retention_expired("2026-11-05T00:00:00Z", now, 7))`,
  },
});

const securityLesson = makeLesson({
  id: lesson2,
  title: 'SSRF、恶意 HTML 与采集系统安全',
  difficulty: 3,
  goals: [
    '理解 URL 采集接口中的 SSRF 风险，并用 allowlist、解析后校验和重定向复核防护。',
    '识别私网、回环、链路本地、DNS rebinding 和危险 scheme 的边界。',
    '为响应大小、重定向次数和解压比例设置数值预算。',
    '处理恶意 HTML、危险链接、日志脱敏与凭证隔离。',
  ],
  prerequisites: [
    '理解 URL、DNS、HTTP 重定向与响应体。',
    '知道服务器端请求与用户输入的信任边界。',
    '已完成第 2 章请求预算与第 12 章合规决策。',
  ],
  problem:
    '如果采集接口接受用户提供的 URL，攻击者可能让服务器访问内网管理面板、云元数据地址或回环服务，这就是 SSRF。只在字符串里搜索 localhost 不够：用户可用十进制 IP、IPv6、重定向或 DNS rebinding 改变解析结果。大响应和解压炸弹还会耗尽内存，恶意 HTML 与日志注入则可能污染解析器和管理界面。防护要在解析、连接、重定向和输出多个层次进行。',
  intuition:
    '把 URL 采集接口想成公司前台：不能因为访客写了一个看似正常的地址，就让快递员把内部档案送到那个地址。先核对允许的目的地清单，再把域名解析成真实地址，连上后确认没有跳到私网；每一层都要重新检查，因为“地址文本”和“实际连接目标”可能不同。',
  concepts: `
### 1. SSRF 防线

- 只允许 https（或明确允许的 http 测试接口）；
- host allowlist，而不是只 deny localhost；
- 解析前后都检查 IP，拒绝私网、回环、链路本地、未指定和多播地址；
- 重定向每一跳重新校验 scheme/host/IP；
- 连接时使用已验证的地址，防止 DNS rebinding；
- 不把响应内容嵌入管理界面，不执行其中的脚本。

### 2. 地址范围

IPv4 私网包括 10/8、172.16/12、192.168/16；回环 127/8；链路本地 169.254/16；IPv6 回环 ::1、链路本地 fe80::/10、唯一本地 fc00::/7。云元数据地址属于高风险目标，不能用“这是 HTTP 所以安全”判断。实现用 ipaddress 库分类，不要只做字符串前缀匹配。

### 3. 重定向与 DNS

短链接、登录跳转和 CDN 都可能改变主机。每一跳都要重新执行 allowlist 与 IP 校验；重定向次数设上限。DNS rebinding 可能让第一次解析得到公网地址、连接时得到私网地址，因此要固定解析结果或使用受控代理。课程只讨论防护，不提供攻击步骤。

### 4. 数值预算

最大响应字节 = 单页上限 + 解压后上限 × 解压层数 + 头/开销。若单页 5 MB、最多 30 个重定向/子请求、解压比 20:1，需要设置总预算，而不是只设单个响应。示例：压缩 100 KB、上限 5 MB、比例 20 → 解压最多 2 MB，仍低于上限；压缩 1 MB 则可能达到 20 MB，必须拒绝。

### 5. 恶意 HTML

解析器要限制深度、节点数、属性长度和执行时间；不执行页面脚本、不加载远程资源、不渲染 HTML 到管理后台。外链只作为不可信文本；危险 scheme 不进入下一步。原始 HTML 作为证据保存时也要脱敏和限时。

### 6. 日志与凭证

不要记录 Authorization、Cookie、完整查询 token、内网地址或页面中的个人资料。错误信息对外只给类别和任务 ID，内部审计使用访问控制。采集服务使用最小权限凭证，禁止把凭证写进 URL、夹具或测试快照。
`,
  derivation: `
设允许单页 5 MB、最多 3 次重定向、每次解压比上限 20、压缩体 300 KB：

- 单次解压上限 300 KB×20=6 MB，超过 5 MB，因此只能接受 5 MB，剩余丢弃并标记 oversize；
- 3 次重定向总请求上限约 4 个响应，理论正文预算 4×5 MB=20 MB；
- 若每个响应都允许 20 倍解压，未压缩总预算必须另行限制，不能只看压缩后大小；
- 1000 个任务若每页都达到上限，内存/带宽会瞬间超预算，因此还要设置全 run 预算。

对 URL 输入接口，先检查 scheme 与 host allowlist，再解析 IP，连接时固定已验证地址，每一跳重定向重复检查。若任一检查失败，返回 policy_denied，不发起 socket。
`,
  diagram: '<Diagram type="crawl-compliance" name="ssrf" />',
  diagramNote:
    'SSRF 图从 URL 文本进入 allowlist、DNS/IP 校验、连接与重定向复核；拒绝分支不发起请求，私网和元数据目标在高风险处终止。',
  caseStudy:
    '一个内部工具允许用户提交 URL 抓取标题。用户提交 `http://169.254.169.254/latest/meta-data/`，系统在 scheme/allowlist 阶段拒绝；另一个公网 URL 返回 302 到 `http://127.0.0.1:8080/admin`，重定向复核再次拒绝。安全日志只记录 task_id、事件类型与拒绝原因，不记录完整敏感路径。',
  codePractice:
    'Demo 用 ipaddress 检查字面 IP 并计算解压预算；站内不实现真实网络探测、端口扫描、DNS 攻击或绕过防护。真实实现应在 socket/代理层固定已验证地址，并配合 allowlist 与网络策略。',
  mistakes: [
    '只禁止字符串 localhost，忽略 127.0.0.1、十进制 IP、IPv6 与 DNS rebinding。',
    '只在首跳检查 host，重定向后不再验证。',
    '只限制压缩包大小，不限制解压后大小和总运行预算。',
    '把原始 HTML 直接插入管理页面，导致脚本执行或内容注入。',
    '在错误日志中记录完整 URL、Cookie、Authorization 与内网响应。',
  ],
  relations:
    '本节承接第 2 章请求、第 6 章退避与第 12 章合规，是项目 5 安全提交门禁的一部分；项目 5 只使用本地快照，但报告与日志仍按最小权限设计。',
  summary:
    'SSRF 防护是多层校验：scheme/host allowlist、IP 分类、连接固定、重定向复核与网络出口策略。大小、解压、解析和日志都需要数值上限；防护失败应拒绝并审计，而不是尝试“清洗后访问”。',
  references: [
    'OWASP SSRF 防护：<https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html>',
    'Python ipaddress：<https://docs.python.org/3/library/ipaddress.html>',
    'MDN 重定向：<https://developer.mozilla.org/en-US/docs/Web/HTTP/Redirections>',
  ],
  lab: [
    '用 ipaddress 判断 127.0.0.1、10.0.0.1、169.254.169.254 的类别。',
    '为重定向 3 跳写出每跳复核步骤。',
    '计算 300 KB 压缩体在 20:1 与 5 MB 上限下的处理结果。',
    '把一份含 token 的日志改成可审计但不泄露的字段。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么仅在 URL 字符串里查找 localhost 不足以防止 SSRF？',
    '**自我解释二**：解压比例上限与总响应预算分别防止哪种资源耗尽？',
  ],
  predictionPrompt:
    '公网 URL 被允许，但它返回 302 到 127.0.0.1。你预测首跳应允许还是直接拒绝，为什么？先写重定向策略。',
  tips: [
    {
      kind: 'leak',
      text: 'SSRF 防护要用 allowlist、IP 分类与连接时复核，不要依赖字符串黑名单。',
    },
    {
      kind: 'performance',
      text: '单页、重定向、解压和整次运行都要有预算；只限压缩后大小挡不住解压炸弹。',
    },
    {
      kind: 'note',
      text: '错误日志只留任务 ID 与拒绝类别；完整 URL、Cookie 和内网地址可能本身就是敏感信息。',
    },
  ],
  demo: {
    title: 'IP 分类与响应预算',
    lang: 'python',
    code: `import ipaddress

def public_literal(host):
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return None
    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
    )

def decompression_limit(compressed_bytes, ratio, max_bytes):
    expanded = compressed_bytes * ratio
    return min(expanded, max_bytes), expanded <= max_bytes

print(public_literal("127.0.0.1"))
print(public_literal("8.8.8.8"))
print(decompression_limit(300_000, 20, 5_000_000))
print(decompression_limit(1_000_000, 20, 5_000_000))`,
  },
});

const capstoneLesson = makeLesson({
  id: lesson3,
  title: '项目 5：增量采集毕业项目',
  difficulty: 4,
  goals: [
    '对 T1/T2/T3 三份本地快照实现条件请求、内容哈希、schema 校验与版本记录。',
    '正确分类 new、changed、unchanged、near_duplicate、deleted、invalid 与失败。',
    '用 tombstone、版本唯一约束和幂等重跑证明数据可恢复、可审计。',
    '交付监控报告、设计说明、五分钟演示与质量/合规自查表。',
  ],
  prerequisites: [
    '完成第 9–12 章，能设计字段契约、质量指标和合规边界。',
    '会使用 SQLite 事务、唯一键和 JSONL 报告。',
    '理解 ETag/304、SHA-256、SimHash 与删除状态。',
  ],
  problem:
    '毕业项目不再是单次抓取，而是对同一组合成页面在 T1、T2、T3 三个时间点的状态进行增量比较。页面可能返回 304、换 ETag、没有验证器、内容近似、404、410、schema 不合法或临时 503。若把 304 当永远不变、把近似当重复、把 404 当永久删除，报告会给出错误的 current 集合。项目要用版本表与 tombstone 解释每一次状态变化，并允许重跑收敛。',
  intuition:
    '把三个快照想成三次体检：T1 是基线，T2 只记录变化，T3 再检查新变化；每次都保留指标、验证器和摘要，而不是把所有旧正文堆进一个文件夹。删除像给档案盖注销章，恢复则新增恢复版本。毕业报告要能让另一个人从事件和数据库复算出同样的 new、changed、deleted。',
  concepts: `
### 1. 三份快照

fixtures/snapshots.json 包含 T1、T2、T3 的合成页面与响应元数据。至少覆盖：

- 页面未变但返回 304；
- 页面换新 ETag 且正文变化；
- 页面没有验证器，只能全量后比较哈希；
- 一条近似重复低于 Hamming 阈值；
- 一条 404 删除候补；
- 一条 410 明确 gone；
- 一条 schema 无效；
- 一条临时 503 或永久失败；
- 条件命中与完整请求的混合。

### 2. 接口

实现 normalize_text、sha256_text、simhash64、hamming_distance、upsert_version、compare_snapshots 与 run。版本表建议：

versions(entity_key, version, observed_at, status, http_status, content_hash, title_hash, extractor_version, change_type, source_url, summary_json)

唯一键为 entity_key + version；tombstone 是 status=gone 的版本，不能物理删除历史摘要。报告键包括 new、changed、unchanged、near_duplicate、deleted、invalid、conditional_hits、requests、retries、versions_written。

### 3. 比较顺序

1. 检查状态码：410 → gone；404 → suspect_deleted；5xx → retry/failed；
2. 304 → conditional_hit，复用上一版本；
3. 200 → schema 校验；无效 → invalid；
4. 规范化正文并计算 SHA-256；
5. hash 相同 → unchanged；
6. hash 不同 → changed；若 SimHash 距离低于阈值则额外标记 near_duplicate；
7. 业务键不在当前集合 → tombstone；
8. 写入版本并生成报告。

### 4. 删除与恢复

404 先进入删除候补，连续观察或达到确认条件后才写 gone；410 可直接写 gone，但保留证据。若 gone 后再次 200，新增 restored 版本，不覆盖 tombstone。报告同时给出删除与恢复数量。

### 5. 监控与 DoD

报告必须有请求数、条件命中、重试、无效、版本写入、new/changed/unchanged/near_duplicate/deleted，以及每个实体的状态证据。重跑同一快照版本数不变；schema 无效不产生正文版本；临时失败不被计为 deleted。安全上只使用合成快照，不保存真实凭据或个人信息。

### 6. 设计说明与演示

设计说明包括架构图、字段契约、版本状态机、失败分类、隐私与保留、指标定义。五分钟演示按“输入快照 → 版本变化 → 删除/恢复 → 重跑幂等 → 质量与安全证据”展开，避免只展示一页成功输出。
`,
  derivation: `
设 T1 有 10 个实体，T2 观察：

- 4 个 304，复用旧版本；
- 3 个 200 且 hash 不变；
- 2 个 200 且 hash 变化，其中 1 个 SimHash 距离 ≤3；
- 1 个 410；
- 另有 1 个 404 删除候补，但尚未确认；
- 1 个 schema 无效；
- 1 个 503 暂时失败。

若实体总数 10（不把临时失败和无效当成删除），当前有效集合可能为 10−1=9；版本写入 = 2 changed + 1 gone + 1 restored? T2 没有恢复则 3；conditional_hits=4；near_duplicate=1；deleted=1；suspect_deleted=1；invalid=1；retries/失败单独计数。报告应能解释 4+3+2+1+1+1+1=13 个观察，而不是把它们塞进 10 个实体后混为一谈。

T3 若 404 变 410，则 suspect 转 gone；若 410 页面又返回 200，则新增 restored 版本。重跑 T3 时 content_hash 与 extractor_version 相同，不新增版本。这样的数字链能让评审复算，而不是只看“最终 9 条”。
`,
  diagram:
    '| T 状态 | 观察 | 分类 | 版本动作 | 报告字段 |\n| --- | --- | --- | --- | --- |\n| T1 active | 200 | baseline | 写 v1 | new |\n| T2 | 304 | conditional_hit | 复用 | unchanged |\n| T2 | 200 新 hash | changed | 写 v2 | changed |\n| T2 | 200 近似 | near_duplicate | 写摘要并复核 | near_duplicate |\n| T2 | 410 | gone | tombstone | deleted |\n| T2 | 404 | suspect_deleted | 不立即 gone | suspect_deleted |\n| T2 | schema 失败 | invalid | 不写正文版本 | invalid |\n| T3 | gone→200 | restored | 新 restored 版本 | restored |',
  diagramNote:
    '表把基线、条件命中、变化、近似、删除、删除候补、无效和恢复放在同一状态机；每种状态对应不同版本动作和报告字段。',
  caseStudy:
    'T1 建立 10 个实体。T2 中 A 返回 304，B 换 ETag 且正文变化，C 无验证器但 hash 相同，D 返回 410，E 返回 404，F 的 schema 缺少 SKU，G 返回 503。系统记录 4 个 conditional/unchanged、2 个 changed（B 与一个近似项）、1 个 gone、1 个 suspect、1 个 invalid、1 个失败。T3 中 E 也变 410，D 恢复 200。重跑 T3 版本数不变，证明幂等。',
  codePractice:
    '完整项目在 public/labs/web-crawling/project-05-incremental/ 本地运行；站内练习实现纯函数版 hash、距离、变更分类和报告。所有快照为合成数据，不访问真实站点。',
  mistakes: [
    '把 304、200-same-hash、200-new-etag 都记成同一种 unchanged。',
    '把 near_duplicate 自动删除或覆盖业务实体。',
    '收到 404 立即物理删除，没有复核窗口。',
    'schema 无效时仍写正文版本，导致质量失败被计入 changed。',
    '重跑同一快照不断新增版本，破坏幂等与报告。',
  ],
  relations:
    '项目 5 汇总第 7–12 章的条件请求、持久化、质量、版本、监控、安全和合规，是课程毕业作品；完成后应能用报告、数据库和五分钟演示解释系统的边界与证据。',
  summary:
    '毕业项目以 T1/T2/T3 快照证明增量状态机：304 复用、hash 变化写版本、近似复核、404 复核、410 tombstone、invalid 不写正文、403/5xx 不伪装删除。幂等重跑、版本唯一约束和隐私最小化让结果可交付。',
  references: [
    'HTTP 条件请求 RFC：<https://www.rfc-editor.org/rfc/rfc9110#name-conditional-requests>',
    'SQLite 唯一约束：<https://www.sqlite.org/lang_createtable.html#uniqueconstraint>',
    'Python hashlib：<https://docs.python.org/3/library/hashlib.html>',
  ],
  lab: [
    '为 T1/T2/T3 写出状态与版本动作表。',
    '实现 hash、SimHash 距离和变更分类的纯函数测试。',
    '证明 T2/T3 的 tombstone、恢复与重跑幂等。',
    '生成质量与监控报告，并准备五分钟演示。',
    '完成隐私、安全、来源与保留期限自查。',
  ],
  selfExplanations: [
    '**自我解释一**：为什么 304、404、410 与 schema invalid 不能共用 changed/deleted 两个状态？',
    '**自我解释二**：版本唯一约束与内容 hash 如何共同保证重跑不重复写版本？',
  ],
  predictionPrompt:
    'T2 的 404 在 T3 变成 410，T3 另一个 gone 页面恢复 200。你预测 T3 应新增几个版本、报告哪些状态？先写状态机再回答。',
  tips: [
    {
      kind: 'note',
      text: '先分类状态，再决定版本动作；不要用一个 changed 字段覆盖删除、无效与失败。',
    },
    {
      kind: 'pitfall',
      text: '404 是删除候补，410 才是明确 gone；恢复时新增 restored 版本，不覆盖 tombstone。',
    },
    {
      kind: 'leak',
      text: '毕业报告只展示合成数据；真实审计证据要做 PII 扫描、最小化和访问控制。',
    },
  ],
  demo: {
    title: '快照变更分类与报告',
    lang: 'python',
    code: `def classify_change(status, previous_hash, current_hash, valid=True):
    if status == 304:
        return "unchanged"
    if status == 410:
        return "deleted"
    if status == 404:
        return "suspect_deleted"
    if status in (500, 502, 503, 504):
        return "failed"
    if not valid:
        return "invalid"
    if previous_hash is None:
        return "new"
    return "unchanged" if previous_hash == current_hash else "changed"

observations = [
    (304, "a", None, True),
    (200, "a", "b", True),
    (200, None, "c", True),
    (410, None, None, True),
    (404, None, None, True),
]
print([classify_change(*row) for row in observations])`,
  },
});

const complianceExercises = makeExercises(chapterId, lesson1, 3, [
  {
    type: 'single',
    question: 'robots.txt 的本质定位是？',
    options: [
      ['A', '法律授权证书'],
      ['B', '自愿排除协议，不等于法律许可'],
      ['C', '自动登录凭证'],
      ['D', '无限采集许可证'],
    ],
    answer: 'B',
    explanation: 'robots 是抓取者应尊重的排除协议；授权、合同、版权与隐私仍需单独判断。',
    tags: ['robots 定位'],
  },
  {
    type: 'multiple',
    question: '目的限定与数据最小化通常包括？',
    options: [
      ['A', '为每个字段说明用途'],
      ['B', '不必要字段不采集或不保存'],
      ['C', '设置访问与保留期限'],
      ['D', '把全部个人资料公开下载'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '字段用途、最小化和保留/访问控制是隐私治理的核心动作。',
    tags: ['隐私最小化'],
  },
  {
    type: 'judge',
    question: '页面公开可见，所以采集、合并和再分发其中的个人资料都不需要额外判断。',
    answer: false,
    explanation: '公开不等于无限制授权；还需考虑目的、最小化、隐私、合同与再分发风险。',
    tags: ['公开数据边界'],
  },
  {
    type: 'fill',
    question:
      '合规决策至少应记录来源授权、采集 ___、字段最小化、保留期限与 ___ 角色。',
    blanks: [['目的', '用途', 'purpose'], ['访问', '权限', 'access']],
    explanation: '目的与访问角色决定字段范围和保存方式；没有它们无法审计。',
    tags: ['决策记录'],
  },
  {
    type: 'code',
    question:
      '实现 `minimize_record(record, allowed_fields)`：返回只含允许字段的新字典；允许字段不存在时值为 None。',
    starterCode: `def minimize_record(record, allowed_fields):
    pass
`,
    expectedOutput: '最小化记录',
    tests: `r=minimize_record({"job":"A","email":"x","city":"沪"},["job","city"])
assert r=={"job":"A","city":"沪"}
assert minimize_record({"job":"A"},["job","missing"])=={"job":"A","missing":None}
`,
    answer: `def minimize_record(record, allowed_fields):
    return {key: record.get(key) for key in allowed_fields}
`,
    explanation: '最小化要使用显式允许清单，而不是复制后再尝试删除几个敏感键。',
    tags: ['字段最小化'],
  },
  {
    type: 'code',
    question:
      '实现 `retention_expired(created_at, now, days)`：created_at 为 ISO 字符串，支持 Z 或时区；达到 days 天返回 True。',
    starterCode: `def retention_expired(created_at, now, days):
    pass
`,
    expectedOutput: '布尔值',
    tests: `from datetime import datetime, timezone
now=datetime(2026,11,12,tzinfo=timezone.utc)
assert retention_expired("2026-11-05T00:00:00Z",now,7) is True
assert retention_expired("2026-11-06T00:00:00Z",now,7) is False
`,
    answer: `from datetime import datetime, timedelta

def retention_expired(created_at, now, days):
    created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    return now - created >= timedelta(days=days)
`,
    explanation: '保留期限是日期计算，必须使用带时区的时间，不能比较字符串。',
    tags: ['保留期限'],
  },
  {
    type: 'open',
    question:
      '请为一个公开职位统计任务写出六步合规决策树，并说明邮箱字段为什么不应进入公开数据集。',
    referenceAnswer:
      '确认访问授权与范围、检查 robots/服务条款、判断用途与 PII、最小化字段、设置访问与保留、发布前扫描与删除审计。职位统计不需要招聘者邮箱，邮箱会增加骚扰与再分发风险，因此只保留 has_contact 或聚合值，原始值不进入公开文件。',
    rubric: [
      { point: '授权与 robots', score: 2 },
      { point: '目的与字段最小化', score: 2 },
      { point: '访问与保留', score: 2 },
      { point: '发布与删除审计', score: 2 },
    ],
    explanation: '决策树要让每个字段和期限有明确理由，而不是只写“遵守法律”。',
    tags: ['合规决策', '开放题'],
    keywords: ['授权', 'PII', '最小化', '保留'],
  },
  {
    type: 'judge',
    question: '只在主表把个人记录标为 tombstone 后，缓存、导出和备份中的副本会自动消失。',
    answer: false,
    explanation: '删除必须覆盖副本与派生文件；tombstone 只是当前状态，不等于所有位置已删除。',
    tags: ['删除流程'],
  },
  {
    type: 'single',
    question: '以下哪种做法最符合目的限定？',
    options: [
      ['A', '先保存全部联系方式，未来再决定用途'],
      ['B', '只保存完成当前统计所需的聚合字段'],
      ['C', '把用户评论全文公开下载'],
      ['D', '把 token 写入审计日志'],
    ],
    answer: 'B',
    explanation: '目的限定要求字段服务于当前明确用途，而不是为未知未来无限收集。',
    tags: ['目的限定'],
  },
  {
    type: 'open',
    question:
      '一份采集日志含完整 URL、Cookie 和错误正文。请指出三类风险并写出脱敏后的审计字段。',
    referenceAnswer:
      '完整 URL 可能含 token、个人搜索词或内网地址；Cookie 是凭证；错误正文可能含个人信息或内部响应。审计只保留 task_id、host（必要时哈希）、状态码类别、时间、错误类别、重试数和 policy_reason，不记录 Cookie/Authorization/完整正文。',
    rubric: [
      { point: '识别 URL 风险', score: 2 },
      { point: '识别凭证风险', score: 2 },
      { point: '识别正文/PII 风险', score: 2 },
      { point: '给出最小审计字段', score: 2 },
    ],
    explanation: '审计证据与敏感数据可以同时最小化，不必二选一。',
    tags: ['日志脱敏', '开放题'],
    keywords: ['task_id', 'host', '状态码', 'Cookie'],
  },
]);

const securityExercises = makeExercises(chapterId, lesson2, 3, [
  {
    type: 'single',
    question: '防止 SSRF 的最稳妥起点是？',
    options: [
      ['A', '只搜索 URL 中是否含 localhost'],
      ['B', 'scheme/host allowlist，并在连接和重定向时复核 IP'],
      ['C', '允许所有 http URL，只限制响应大小'],
      ['D', '把用户 URL 写入日志后直接请求'],
    ],
    answer: 'B',
    explanation: '黑名单容易遗漏编码、DNS 和重定向；allowlist 加连接层校验更可靠。',
    tags: ['SSRF 防线'],
  },
  {
    type: 'multiple',
    question: '以下哪些属于高风险目标地址？',
    options: [
      ['A', '127.0.0.1'],
      ['B', '10.0.0.1'],
      ['C', '169.254.169.254'],
      ['D', '一个明确允许且已固定解析的公开测试域名'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '回环、私网与链路本地/元数据地址都高风险；允许清单内的测试域名需仍需解析校验。',
    tags: ['地址分类'],
  },
  {
    type: 'judge',
    question: '首跳 URL 通过 allowlist 后，重定向到任何地址都不需要再次检查。',
    answer: false,
    explanation: '重定向每一跳都可能改变目标；必须重新校验 scheme、host 与 IP。',
    tags: ['重定向'],
  },
  {
    type: 'fill',
    question:
      '解压放大比 = 解压后大小 / ___；若压缩 1 MB、比例 20，解压理论大小至少为 ___ MB。',
    blanks: [['压缩后大小', '压缩大小', 'compressed'], ['20']],
    explanation: '比例以压缩体为分母；1 MB×20=20 MB，可能触发预算拒绝。',
    tags: ['解压预算'],
  },
  {
    type: 'code',
    question:
      '实现 `public_literal(host)`：host 是 IP 字面量时返回是否为公开地址；私网、回环、链路本地、保留、多播返回 False；非 IP 返回 None。使用 ipaddress。',
    starterCode: `def public_literal(host):
    pass
`,
    expectedOutput: 'True/False/None',
    tests: `assert public_literal("127.0.0.1") is False
assert public_literal("10.0.0.1") is False
assert public_literal("8.8.8.8") is True
assert public_literal("example.test") is None
`,
    answer: `import ipaddress

def public_literal(host):
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return None
    return not (
        address.is_private
        or address.is_loopback
        or address.is_link_local
        or address.is_reserved
        or address.is_multicast
    )
`,
    explanation: '字面量检查只是第一层；域名仍需安全解析并在连接时防止 rebinding。',
    tags: ['IP 分类实现'],
  },
  {
    type: 'code',
    question:
      '实现 `decompression_limit(compressed_bytes, ratio, max_bytes)`：返回 (allowed_bytes, within_limit)，allowed_bytes=min(compressed×ratio, max_bytes)。',
    starterCode: `def decompression_limit(compressed_bytes, ratio, max_bytes):
    pass
`,
    expectedOutput: '(允许读取字节, 是否低于上限)',
    tests: `assert decompression_limit(300000,20,5000000)==(5000000,False)
assert decompression_limit(100000,20,5000000)==(2000000,True)
`,
    answer: `def decompression_limit(compressed_bytes, ratio, max_bytes):
    expanded = compressed_bytes * ratio
    return min(expanded, max_bytes), expanded <= max_bytes
`,
    explanation: '即使返回上限字节数，也要用 within_limit 告知调用方发生了截断/拒绝。',
    tags: ['解压预算实现'],
  },
  {
    type: 'open',
    question:
      '一个公网允许域名在解析时返回公网 IP，但连接时可能变成私网 IP。请说明 DNS rebinding 的风险与两项防护。',
    referenceAnswer:
      'DNS 解析与真实连接之间可能发生变化，攻击者诱导服务连接私网。防护包括在受控位置解析并固定已验证 IP、连接时再次验证实际地址、限制网络出口/使用代理、禁止内网路由，并对重定向重复检查。',
    rubric: [
      { point: '解释解析/连接窗口', score: 2 },
      { point: '固定已验证地址', score: 2 },
      { point: '出口网络策略', score: 2 },
      { point: '重定向复核', score: 2 },
    ],
    explanation: 'SSRF 防护需要在连接层生效，不能只检查一次 URL 文本。',
    tags: ['DNS rebinding', '开放题'],
    keywords: ['解析', '连接', 'allowlist', '重定向'],
  },
  {
    type: 'judge',
    question: '解析器只处理文本，不执行 JavaScript，所以恶意 HTML 不会造成任何风险。',
    answer: false,
    explanation: '恶意 HTML 仍可能造成深度/节点耗尽、危险链接、内容注入与管理界面污染。',
    tags: ['恶意 HTML'],
  },
  {
    type: 'single',
    question: '仅限制压缩包大小，最可能漏掉哪种风险？',
    options: [
      ['A', '解压炸弹导致内存耗尽'],
      ['B', 'URL 使用 https'],
      ['C', '页面标题太长'],
      ['D', '数据库有唯一键'],
    ],
    answer: 'A',
    explanation: '小压缩体可能解压成巨大内容，必须限制解压比例、解压后大小和总预算。',
    tags: ['解压炸弹'],
  },
  {
    type: 'open',
    question:
      '请为 URL 采集接口写出至少五层安全门禁，并说明拒绝时日志应记录什么。',
    referenceAnswer:
      'scheme allowlist、host allowlist、DNS/IP 私网检查、连接时固定地址、重定向每跳复核、响应/解压/解析上限。拒绝日志只记录 task_id、时间、拒绝类别和必要 host 哈希，不记录 Cookie、token、完整内网 URL 或页面正文。',
    rubric: [
      { point: '五层门禁', score: 3 },
      { point: '重定向和连接层', score: 2 },
      { point: '资源预算', score: 2 },
      { point: '最小化日志', score: 3 },
    ],
    explanation: '防护与审计都要可执行，且不能把敏感目标细节写入普通日志。',
    tags: ['安全门禁', '开放题'],
    keywords: ['scheme', 'IP', 'redirect', 'budget', 'task_id'],
  },
]);

const capstoneExercises = makeExercises(chapterId, lesson3, 4, [
  {
    type: 'single',
    question: 'T2 中页面返回 304，最合适的分类与动作是？',
    options: [
      ['A', 'changed，写新正文版本'],
      ['B', 'conditional_hit，复用旧版本并记录验证器'],
      ['C', 'deleted，写 tombstone'],
      ['D', 'invalid，拒绝整次运行'],
    ],
    answer: 'B',
    explanation: '304 表示条件未修改，应复用缓存版本并保留 conditional_hit 证据。',
    tags: ['304 分类'],
  },
  {
    type: 'multiple',
    question: '毕业项目报告至少应包含哪些字段？',
    options: [
      ['A', 'new/changed/unchanged'],
      ['B', 'deleted/near_duplicate/invalid'],
      ['C', 'conditional_hits/requests/versions_written'],
      ['D', '真实用户 Cookie'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '分类、条件命中、请求与版本写入构成增量证据；真实 Cookie 不属于项目。',
    tags: ['报告字段'],
  },
  {
    type: 'fill',
    question:
      '404 通常先记为 ___，410 可直接记 ___；gone 后恢复 200 应新增 ___ 版本。',
    blanks: [['suspect_deleted', '删除候补', 'suspect'], ['gone', 'tombstone', 'deleted'], ['restored', '恢复', 'restore']],
    explanation: '删除候补、明确消失和恢复是不同状态，版本历史不应被覆盖。',
    tags: ['删除状态'],
  },
  {
    type: 'judge',
    question: '版本唯一约束加内容 hash 检查可以让同一 T3 快照重复运行不新增版本。',
    answer: true,
    explanation: '唯一键防重复，hash/抽取器版本判断内容是否真的需要新版本；两者共同保证幂等。',
    tags: ['版本幂等'],
  },
  {
    type: 'single',
    question: 'schema 校验失败时最合适的版本动作是？',
    options: [
      ['A', '写 changed 正文版本'],
      ['B', '记 invalid，不写正文版本，保留失败证据'],
      ['C', '写 gone tombstone'],
      ['D', '把页面标为 304'],
    ],
    answer: 'B',
    explanation: 'schema 无效是数据质量失败，不应污染内容版本或删除状态。',
    tags: ['schema 失败'],
  },
  {
    type: 'open',
    question:
      '请描述项目 5 从 T1 到 T3 的版本状态机，覆盖 304、changed、near_duplicate、404、410、invalid 与 restored。',
    referenceAnswer:
      '先按状态码分类：304 复用；410 gone；404 suspect；5xx failed；200 后 schema 校验。有效 200 计算 hash；无旧版本 new，同 hash unchanged，异 hash changed，SimHash 低于阈值加 near_duplicate。gone 后 200 写 restored，不覆盖历史。每类写对应版本或失败证据。',
    rubric: [
      { point: '状态码优先分类', score: 3 },
      { point: 'hash 与近似判断', score: 3 },
      { point: 'tombstone 与恢复', score: 2 },
      { point: 'invalid/failed 分开', score: 2 },
    ],
    explanation: '状态机的价值在于让每个观察都有唯一分类和版本动作。',
    tags: ['版本状态机', '开放题'],
    keywords: ['304', 'hash', 'tombstone', 'restored'],
  },
  {
    type: 'multiple',
    question: '哪些证据可以支持“重跑幂等”？',
    options: [
      ['A', '同一 T3 重跑后 versions 行数不变'],
      ['B', 'content_hash 与 extractor_version 相同'],
      ['C', '重复插入被唯一键拒绝或转为更新'],
      ['D', '终端只打印 done'],
    ],
    answer: ['A', 'B', 'C'],
    explanation: '数据行、版本证据与约束行为共同证明幂等；终端字符串不具备证明力。',
    tags: ['幂等证据'],
  },
  {
    type: 'judge',
    question: '404 删除候补和 410 gone 应写入同一个 changed 计数，方便报表简单。',
    answer: false,
    explanation: '删除候补尚待确认，gone 是明确状态；混在一起会误报删除和恢复。',
    tags: ['状态区分'],
  },
  {
    type: 'code',
    question:
      '实现 `classify_change(status, previous_hash, current_hash, valid=True)`：304→unchanged；410→deleted；404→suspect_deleted；5xx→failed；invalid→invalid；无 previous→new；hash 同→unchanged；否则 changed。',
    starterCode: `def classify_change(status, previous_hash, current_hash, valid=True):
    pass
`,
    expectedOutput: '变更分类',
    tests: `assert classify_change(304,"a",None)=="unchanged"
assert classify_change(410,None,None)=="deleted"
assert classify_change(404,None,None)=="suspect_deleted"
assert classify_change(503,None,None)=="failed"
assert classify_change(200,None,"a")=="new"
assert classify_change(200,"a","a")=="unchanged"
assert classify_change(200,"a","b")=="changed"
assert classify_change(200,None,None,False)=="invalid"
`,
    answer: `def classify_change(status, previous_hash, current_hash, valid=True):
    if status == 304:
        return "unchanged"
    if status == 410:
        return "deleted"
    if status == 404:
        return "suspect_deleted"
    if status in {500, 502, 503, 504}:
        return "failed"
    if not valid:
        return "invalid"
    if previous_hash is None:
        return "new"
    return "unchanged" if previous_hash == current_hash else "changed"
`,
    explanation: '状态码和 schema 失败优先于 hash 判断；顺序错了会把错误当内容变化。',
    tags: ['变更分类实现'],
  },
  {
    type: 'code',
    question:
      '实现 `snapshot_report(counts)`：输入含 new、changed、unchanged、near_duplicate、deleted、invalid、conditional_hits、requests、retries、versions_written；返回副本并补充 total_observations（前七项之和）。',
    starterCode: `def snapshot_report(counts):
    pass
`,
    expectedOutput: '快照报告',
    tests: `r=snapshot_report({"new":2,"changed":1,"unchanged":3,"near_duplicate":1,"deleted":1,"invalid":1,"conditional_hits":2,"requests":10,"retries":1,"versions_written":4})
assert r["total_observations"]==11
assert r["requests"]==10
`,
    answer: `def snapshot_report(counts):
    result = dict(counts)
    fields = ["new", "changed", "unchanged", "near_duplicate", "deleted", "invalid", "conditional_hits"]
    result["total_observations"] = sum(int(counts.get(key, 0)) for key in fields)
    return result
`,
    explanation: '报告汇总字段要明确口径；把观察数、请求数和版本数并列，评审才能复算。',
    tags: ['快照报告实现'],
  },
  {
    type: 'open',
    question:
      'T2 显示 404 suspect、1 个 410 gone、1 个 503 failed、1 个 schema invalid。请说明哪些可计入 deleted，哪些不能，并给出下一步。',
    referenceAnswer:
      '只有明确 410（或达到复核条件的删除）可进入 deleted/gone；404 仍是 suspect，需要延迟复核；503 是 temporary failed，应重试；schema invalid 是质量失败，应修复抽取器/数据后重跑。四者不能合并为 deleted。',
    rubric: [
      { point: '410 可 gone', score: 2 },
      { point: '404 需复核', score: 2 },
      { point: '503 重试', score: 2 },
      { point: 'invalid 不删除', score: 2 },
    ],
    explanation: '删除报告必须基于明确状态，而不是把所有缺失都当成删除。',
    tags: ['删除分类', '开放题'],
    keywords: ['410', '404', '503', 'invalid'],
  },
  {
    type: 'open',
    question:
      '请写项目 5 的 Definition of Done，覆盖 T1/T2/T3、条件请求、版本、删除、质量、幂等、安全与演示。',
    referenceAnswer:
      '三快照可运行；304 命中、200 变化、无验证器、近似、404/410、invalid、暂时失败均有分类；版本表保存摘要和唯一键；tombstone 后恢复新增 restored；重跑 T3 版本数不变；报告字段可复算；仅用合成数据，日志脱敏；README、设计说明、质量/合规自查和五分钟演示齐全。',
    rubric: [
      { point: '快照与分类', score: 3 },
      { point: '版本/tombstone/幂等', score: 3 },
      { point: '质量与安全', score: 2 },
      { point: '文档与演示', score: 2 },
    ],
    explanation: 'DoD 要能由测试、数据库查询和演示证据共同支持。',
    tags: ['毕业项目 DoD', '开放题'],
    keywords: ['T1', 'T2', 'T3', 'restored', '幂等'],
  },
  {
    type: 'single',
    question: '五分钟演示中最能说明增量系统正确性的证据组合是？',
    options: [
      ['A', '只展示首页截图'],
      ['B', 'T2/T3 分类报告、版本行数、删除恢复证据与重跑结果'],
      ['C', '只展示代码行数'],
      ['D', '只展示一次成功退出码'],
    ],
    answer: 'B',
    explanation: '报告、版本数据、tombstone/恢复和幂等重跑共同证明系统行为。',
    tags: ['演示证据'],
  },
]);

export const webCrawlingChapters12: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: chapterId,
    title: '合规、安全与毕业项目',
    goal: '把授权、隐私、SSRF 与系统安全纳入采集设计，并完成可恢复、可监控的增量采集项目。',
    lessons: [complianceLesson, securityLesson, capstoneLesson],
    exercises: [...complianceExercises, ...securityExercises, ...capstoneExercises],
  },
];
