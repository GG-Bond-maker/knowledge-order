import type { ReactNode } from 'react';
import {
  WEB_CRAWLING_DIAGRAMS,
  type WebCrawlingDiagramKind,
} from './webCrawlingDiagramKinds';
import './web-crawling-diagrams.css';

type DiagramProps = {
  name?: string;
};

type FrameProps = {
  title: string;
  label: string;
  note: string;
  children: ReactNode;
};

function Frame({ title, label, note, children }: FrameProps) {
  return (
    <figure className="diagram-block crawl-diagram" aria-label={label}>
      <figcaption className="diagram-title crawl-diagram-title">{title}</figcaption>
      {children}
      <div className="crawl-diagram-note">{note}</div>
    </figure>
  );
}

function pick<T extends string>(name: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes((name ?? '') as T) ? ((name ?? '') as T) : fallback;
}

const HTTP_STEPS = [
  ['1', 'URL 解析', '拆出 scheme、host、port、path、query；相对链接先与 base URL 合并。'],
  ['2', 'DNS 解析', '把域名解析为 IP。缓存、DNS 超时和解析结果变化都会影响请求成败。'],
  ['3', 'TCP 与 TLS', '建立连接；HTTPS 还要完成证书校验与加密握手。'],
  ['4', 'HTTP 请求', '发送方法、路径、Host、Accept 等头；重定向由客户端按规则继续。'],
  ['5', 'HTTP 响应', '先读状态码与头，再按 Content-Type、charset 和压缩方式解码正文。'],
  ['6', 'HTML → DOM', '浏览器或解析器把字节流变成节点树；抽取器再按结构取字段。'],
] as const;

export function CrawlHttpJourneyDiagram({ name }: DiagramProps) {
  const variant = pick(name, WEB_CRAWLING_DIAGRAMS['crawl-http-journey'], 'overview');
  return (
    <Frame
      title={variant === 'failure' ? '一次请求的链路与失败点' : '从 URL 到 DOM 的请求旅程'}
      label="DNS、TCP/TLS、HTTP 请求、响应和 DOM 构建的顺序图"
      note={
        variant === 'failure'
          ? '失败不是笼统的“抓不到”：DNS、TLS、超时、状态码、正文解码和解析阶段都能单独失败。逐层定位比盲目重试更快。'
          : '采集器只负责“请求—读取—解析”链路中的一部分。理解每一跳，才能判断错误发生在哪一层。'
      }
    >
      <div className="crawl-sequence" role="list">
        {HTTP_STEPS.map(([index, title, text]) => (
          <div className="crawl-sequence-step" role="listitem" key={index}>
            <span className="crawl-step-index" aria-hidden="true">
              {index}
            </span>
            <span className="crawl-step-main">
              <strong>{title}</strong>
              <span>{text}</span>
            </span>
          </div>
        ))}
      </div>
      {variant === 'failure' && (
        <div className="crawl-failure-strip" aria-label="常见失败点">
          <span>DNS 超时</span>
          <span>证书错误</span>
          <span>429 / 503</span>
          <span>错误编码</span>
          <span>空壳 HTML</span>
        </div>
      )}
    </Frame>
  );
}

const PIPELINE_STAGES = [
  ['fetch', '获取', '请求响应、状态与字节'],
  ['parse', '解析', 'HTML / JSON → 结构'],
  ['normalize', '规范化', 'URL、文本、类型、时区'],
  ['validate', '校验', '契约、必填、范围'],
  ['store', '存储', '幂等写入与版本'],
] as const;

export function CrawlPipelineDiagram({ name }: DiagramProps) {
  const variant = pick(name, WEB_CRAWLING_DIAGRAMS['crawl-pipeline'], 'overview');
  const detail =
    variant === 'static'
      ? '静态 HTML 路线：响应正文交给 HTML 解析器，抽取字段后先规范化再入库。'
      : variant === 'api'
        ? 'JSON API 路线：分页参数、游标、速率限制和响应 schema 比 HTML 选择器更关键。'
        : variant === 'incremental'
          ? '增量路线：先读上一次快照与校验值；内容未变则只更新时间，变化才产生新版本。'
          : '五段流水线把“能抓到”拆成可测试、可观测、可恢复的环节；每段都能独立失败。';
  return (
    <Frame
      title="采集系统的五段处理流水线"
      label="获取、解析、规范化、校验、存储五段流水线"
      note={detail}
    >
      <div className="crawl-pipeline" role="list">
        {PIPELINE_STAGES.map(([key, title, text], index) => (
          <div className="crawl-pipeline-stage" role="listitem" key={key}>
            <span className="crawl-stage-number">{index + 1}</span>
            <strong>{title}</strong>
            <span>{text}</span>
            {variant === 'incremental' && index >= 2 && (
              <em className="crawl-stage-tag">读旧版本</em>
            )}
          </div>
        ))}
      </div>
    </Frame>
  );
}

const DOM_NODES = [
  { depth: 0, tag: 'html', text: '文档根' },
  { depth: 1, tag: 'head', text: 'title、meta' },
  { depth: 1, tag: 'body', text: '可见内容' },
  { depth: 2, tag: 'article.card', text: '内容容器' },
  { depth: 3, tag: 'h1', text: '标题' },
  { depth: 3, tag: 'p.price', text: '价格' },
  { depth: 3, tag: 'a[href]', text: '链接' },
] as const;

export function CrawlDomTreeDiagram({ name }: DiagramProps) {
  const variant = pick(name, WEB_CRAWLING_DIAGRAMS['crawl-dom-tree'], 'basic');
  return (
    <Frame
      title={variant === 'selectors' ? 'DOM 树与选择器路径' : '网页在解析器眼中的 DOM 树'}
      label="HTML 文档被表示为元素嵌套的树，选择器沿父子关系定位节点"
      note={
        variant === 'selectors'
          ? '优先选择稳定的语义结构（如 article 下的 h1），避免依赖装饰性 class 和页面绝对位置。选择器越脆，页面小改版越容易让采集器静默产出空值。'
          : '标签、属性、文本都属于节点。浏览器的“查看源代码”是原始 HTML；开发者工具里的 Elements 可能已经过 JavaScript 修改。'
      }
    >
      <div className="crawl-dom" role="tree" aria-label="示例 DOM 树">
        {DOM_NODES.map((node) => (
          <div
            className={`crawl-dom-node ${variant === 'selectors' && node.tag === 'h1' ? 'crawl-dom-focus' : ''}`}
            role="treeitem"
            aria-level={node.depth + 1}
            style={{ marginLeft: `${node.depth * 22}px` }}
            key={node.tag}
          >
            <code>{`<${node.tag}>`}</code>
            <span>{node.text}</span>
          </div>
        ))}
      </div>
      {variant === 'selectors' && (
        <div className="crawl-selector-grid">
          <code>article.card h1</code>
          <span>标题：稳定语义路径</span>
          <code>p.price</code>
          <span>价格：字段级选择器</span>
          <code>a[href]</code>
          <span>链接：保留原始属性</span>
        </div>
      )}
    </Frame>
  );
}

const CANONICAL_STEPS = [
  ['统一协议与主机', 'http://Example.COM → https://example.com', '先确认目标是否真的支持 HTTPS；不要擅自改变语义。'],
  ['移除默认端口', ':80 / :443 在对应协议下省略', '非默认端口必须保留。'],
  ['解析点段', '/catalog/../book → /book', '路径本身可能区分大小写，不能一律转小写。'],
  ['合并重复斜杠', '//assets///img.png → /assets/img.png', '仅在目标网站允许时执行。'],
  ['排序语义查询参数', '?b=2&a=1 → ?a=1&b=2', '认证 token、签名参数不能随意排序。'],
  ['移除跟踪参数与片段', 'utm_* / #section 去除', '片段通常不会发给服务器；跟踪参数按站点规则处理。'],
] as const;

export function CrawlCanonicalizeDiagram() {
  return (
    <Frame
      title="URL 规范化：把“看似不同”收敛成同一资源"
      label="原始 URL 经过协议、主机、端口、路径和查询参数规范化"
      note="规范化目标是去重而不是篡改。任何可能改变服务器返回内容的差异，都必须保守处理；没有把握时保留原 URL，并记录规范化理由。"
    >
      <div className="crawl-url-compare">
        <div>
          <span className="crawl-compare-label">原始</span>
          <code>HTTP://Example.COM:80/a/../b?utm_source=x&amp;id=7#top</code>
        </div>
        <span className="crawl-compare-arrow" aria-hidden="true">
          →
        </span>
        <div>
          <span className="crawl-compare-label">规范化</span>
          <code>https://example.com/b?id=7</code>
        </div>
      </div>
      <div className="crawl-rule-list">
        {CANONICAL_STEPS.map(([title, before, warning], index) => (
          <div className="crawl-rule" key={title}>
            <span className="crawl-rule-index">{index + 1}</span>
            <div>
              <strong>{title}</strong>
              <code>{before}</code>
              <span>{warning}</span>
            </div>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function CrawlFrontierDiagram({ name }: DiagramProps) {
  const variant = pick(name, WEB_CRAWLING_DIAGRAMS['crawl-frontier'], 'bfs');
  return (
    <Frame
      title={variant === 'priority' ? '优先级 Frontier 的调度' : 'BFS Frontier：先浅后深'}
      label="Frontier 保存待抓 URL、visited 去重集合与深度等信息"
      note={
        variant === 'priority'
          ? '优先级可以来自站点价值、更新频率或链接深度。优先级越复杂，越需要记录排序依据，避免“重要页面永远排不到”。'
          : '队列保证同层链接先被处理，visited 防止环路。BFS 不等于礼貌：仍要按站点限速，并给每个主机单独的调度边界。'
      }
    >
      <div className="crawl-frontier-board">
        <div className="crawl-frontier-column">
          <h4>待抓队列</h4>
          <div className="crawl-queue">
            <span>seed /</span>
            <span>/catalog</span>
            <span>/about</span>
            <span>/catalog/42</span>
          </div>
          <p>{variant === 'priority' ? '下一项：/catalog（score 0.92）' : '下一项：seed /（depth 0）'}</p>
        </div>
        <div className="crawl-frontier-column">
          <h4>已访问集合</h4>
          <div className="crawl-visited">
            <code>https://example.test/</code>
            <code>https://example.test/news</code>
          </div>
        </div>
        <div className="crawl-frontier-column">
          <h4>决策字段</h4>
          <ul>
            <li>host + canonical URL</li>
            <li>depth = {variant === 'priority' ? '2' : '1'}</li>
            <li>{variant === 'priority' ? 'priority = 0.92' : 'enqueue sequence = 7'}</li>
            <li>last attempt / retry count</li>
          </ul>
        </div>
      </div>
    </Frame>
  );
}

export function CrawlRobotsDiagram() {
  return (
    <Frame
      title="robots.txt 的匹配不是“一键许可”"
      label="针对某一 user-agent，按最长路径规则判断 URL 是 allow 还是 disallow"
      note="robots.txt 是自愿遵守的访问约定，不是法律授权，也不能替代服务条款、隐私判断或授权沟通。匹配规则应依据 RFC 9309，而不是只看第一行。"
    >
      <div className="crawl-robots-sheet">
        <div>
          <strong>User-agent: ExampleBot</strong>
          <code>Disallow: /private/</code>
          <code>Allow: /private/public/</code>
          <code>Disallow: /*.json$</code>
        </div>
        <div className="crawl-robots-result">
          <span className="crawl-verdict crawl-verdict-allow">Allow</span>
          <code>/private/public/guide</code>
          <p>较长的更具体 Allow 规则胜出。</p>
        </div>
        <div className="crawl-robots-result">
          <span className="crawl-verdict crawl-verdict-deny">Disallow</span>
          <code>/private/report.json</code>
          <p>匹配 Disallow，且规则以文件扩展名结尾。</p>
        </div>
      </div>
      <div className="crawl-decision-line">
        <span>选匹配的 user-agent 组</span>
        <span>→</span>
        <span>比较规则路径长度</span>
        <span>→</span>
        <span>同长度 Allow 优先</span>
      </div>
    </Frame>
  );
}

export function CrawlRateLimitDiagram({ name }: DiagramProps) {
  const variant = pick(name, WEB_CRAWLING_DIAGRAMS['crawl-rate-limit'], 'tokens');
  return (
    <Frame
      title={variant === 'backoff' ? '指数退避、抖动与 Retry-After' : 'Token Bucket：突发与平均速率'}
      label="令牌桶按时间补充令牌，退避按失败次数增加等待"
      note={
        variant === 'backoff'
          ? '优先遵守服务器返回的 Retry-After；否则用带抖动的指数退避，并设置最大尝试次数。重试风暴比一次失败更糟。'
          : '容量允许短时突发，补充速率限制长期平均吞吐。并发数、单主机速率和全站速率应分别配置。'
      }
    >
      {variant === 'backoff' ? (
        <div className="crawl-backoff">
          {[1, 2, 3, 4].map((attempt) => (
            <div className="crawl-backoff-row" key={attempt}>
              <span>第 {attempt} 次</span>
              <div className="crawl-backoff-track">
                <i style={{ width: `${18 * 2 ** (attempt - 1)}%` }} />
              </div>
              <code>{2 ** (attempt - 1)}–{2 ** attempt} s + jitter</code>
            </div>
          ))}
        </div>
      ) : (
        <div className="crawl-bucket">
          <div className="crawl-bucket-meter">
            <span style={{ width: '70%' }} />
          </div>
          <div className="crawl-bucket-meta">
            <span>容量 5</span>
            <span>当前 3.5</span>
            <span>补充 0.5 / 秒</span>
          </div>
          <div className="crawl-token-axis" aria-label="令牌随时间从 1 补充到 4">
            {[0, 1, 2, 3, 4, 5].map((step) => (
              <span key={step}>{step}s</span>
            ))}
          </div>
          <p>每次请求消耗 1 个令牌；不足时等待，而不是并发硬闯。</p>
        </div>
      )}
    </Frame>
  );
}

const RENDER_ROWS = {
  ssr: [
    ['0 ms', '请求 HTML'],
    ['120 ms', '服务器返回完整正文'],
    ['140 ms', '解析 DOM，字段已可读'],
  ],
  csr: [
    ['0 ms', '请求 HTML 壳'],
    ['90 ms', '返回空容器 + JS'],
    ['350 ms', '脚本请求 JSON'],
    ['620 ms', 'DOM 填充完成'],
  ],
  playwright: [
    ['0 ms', 'navigate'],
    ['240 ms', '等待网络与负载状态'],
    ['420 ms', 'locator 等待目标元素'],
    ['460 ms', '元素出现后读取'],
  ],
} as const;

export function CrawlRenderTimelineDiagram({ name }: DiagramProps) {
  const variant = pick(name, WEB_CRAWLING_DIAGRAMS['crawl-render-timeline'], 'ssr');
  const labels = {
    ssr: 'SSR：服务器已返回完整内容',
    csr: 'CSR：先空壳，脚本后填内容',
    playwright: '浏览器自动化：用条件等待代替固定 sleep',
  };
  return (
    <Frame
      title={labels[variant]}
      label="SSR、CSR 与浏览器自动化的加载时间轴"
      note={
        variant === 'playwright'
          ? '等待条件是“目标元素可见”或“响应完成”，不是等待固定秒数。固定 sleep 既慢又不稳定。'
          : variant === 'csr'
            ? '如果页面通过清晰的 JSON 接口提供数据，优先评估该接口是否允许访问；浏览器渲染不是默认答案。'
            : 'SSR 页面通常用标准 HTML 解析即可。仍要检查正文是否被编码、压缩或由边缘节点改写。'
      }
    >
      <div className="crawl-timeline">
        {RENDER_ROWS[variant].map(([time, event]) => (
          <div className="crawl-timeline-row" key={`${time}-${event}`}>
            <time>{time}</time>
            <span className="crawl-timeline-dot" aria-hidden="true" />
            <span>{event}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

export function CrawlRecrawlDiagram() {
  return (
    <Frame
      title="重抓与变更检测状态机"
      label="已发现页面经过抓取、哈希比较，进入未变、变化、删除或错误状态"
      note="“页面能打开”不代表内容相同。ETag、Last-Modified 可减少下载，但服务器可能不提供；内容哈希更可靠却要承担读取成本。删除通常需要连续多次确认，避免临时错误误判。"
    >
      <div className="crawl-state-grid">
        <div className="crawl-state">discovered</div>
        <span>→</span>
        <div className="crawl-state">fetched</div>
        <span>→</span>
        <div className="crawl-state crawl-state-good">hash same · 304</div>
        <span>→</span>
        <div className="crawl-state">unchanged</div>
        <div className="crawl-state crawl-state-warn">hash changed</div>
        <span>→</span>
        <div className="crawl-state">new version</div>
        <div className="crawl-state crawl-state-deny">404 / 410 × N</div>
        <span>→</span>
        <div className="crawl-state">deleted</div>
        <div className="crawl-state">timeout / 5xx</div>
        <span>→</span>
        <div className="crawl-state">retry with backoff</div>
      </div>
    </Frame>
  );
}

export function CrawlDistributedDiagram({ name }: DiagramProps) {
  const variant = pick(name, WEB_CRAWLING_DIAGRAMS['crawl-distributed'], 'overview');
  return (
    <Frame
      title={variant === 'failure' ? '分布式采集：租约到期后的恢复' : '分布式采集的控制面与数据面'}
      label="协调器分配带租约的任务，worker 执行，去重与存储在共享层，指标集中收集"
      note={
        variant === 'failure'
          ? 'worker 崩溃后任务不能永久卡死：租约到期回到队列，重试次数和幂等写入防止重复与无限重放。'
          : '协调器不必亲自抓网页；它负责派发、租约、重试和全局速率预算。去重必须是共享且原子的，否则多 worker 会重复抓取。'
      }
    >
      <div className="crawl-arch" role="img" aria-label="协调器、队列、worker、共享去重、存储与监控关系">
        <div className="crawl-arch-node crawl-arch-node-wide">协调器：派发 · 租约 · 预算</div>
        <div className="crawl-arch-row">
          <div className="crawl-arch-node">Frontier 队列</div>
          <div className="crawl-arch-node">共享去重</div>
          <div className="crawl-arch-node">站点限速器</div>
        </div>
        <div className="crawl-arch-row">
          <div className="crawl-arch-node">worker A</div>
          <div className="crawl-arch-node">worker B</div>
          <div className="crawl-arch-node">worker C</div>
        </div>
        <div className="crawl-arch-row">
          <div className="crawl-arch-node crawl-arch-node-wide">对象存储 · 数据库 · 指标与日志</div>
        </div>
      </div>
      {variant === 'failure' && (
        <div className="crawl-failure-strip">
          <span>worker B 失联</span>
          <span>租约 30s</span>
          <span>任务重新入队</span>
          <span>幂等写入</span>
        </div>
      )}
    </Frame>
  );
}

const CONSENT_STEPS = [
  ['授权范围', '数据是否公开？服务条款、许可、机构政策是否允许这一用途？'],
  ['个人信息', '是否包含可识别个人或敏感属性？能否最小化、聚合或改用合成数据？'],
  ['目的限制', '采集目的与后续使用是否一致？不要“先抓再说”。'],
  ['保存期限', '何时删除？谁能访问？日志是否泄露 URL、Cookie 或正文？'],
  ['复核与退出', '是否提供纠错、删除和停止采集的路径？'],
] as const;

const SSRF_STEPS = [
  ['不可信 URL', '用户输入、页面链接或重定向都不可默认信任。'],
  ['语法白名单', '只允许 http/https；拒绝 file、gopher、data 等 scheme。'],
  ['解析后检查', '将域名解析为 IP，拒绝回环、私网、链路本地与云元数据地址。'],
  ['每次重定向复查', '重定向后的目标必须重新做同一套检查。'],
  ['出网隔离', '采集器运行在受限网络身份中，不能访问控制面数据库。'],
] as const;

export function CrawlComplianceDiagram({ name }: DiagramProps) {
  const variant = pick(name, WEB_CRAWLING_DIAGRAMS['crawl-compliance'], 'consent');
  return (
    <Frame
      title={variant === 'ssrf' ? 'URL 采集的 SSRF 防线' : '采集前的最小合规判断'}
      label={
        variant === 'ssrf'
          ? '不可信 URL 经过协议白名单、IP 检查、重定向复查和网络隔离'
          : '采集授权、隐私、目的、保存与复核的决策路径'
      }
      note={
        variant === 'ssrf'
          ? 'SSRF 的核心是让服务器替你访问不该访问的网络位置。只校验 URL 字符串不够，解析后的 IP 和每一次跳转都要校验。'
          : '这是工程判断清单，不是法律意见。公开可见不等于可无限制采集；有疑问时应联系权利方或选择合法数据源。'
      }
    >
      <div className="crawl-decision-list">
        {(variant === 'ssrf' ? SSRF_STEPS : CONSENT_STEPS).map(([title, text], index) => (
          <div className="crawl-decision-item" key={title}>
            <span className="crawl-rule-index">{index + 1}</span>
            <div>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
            <span className="crawl-gate">{index === 0 ? '入口' : index === 4 ? '持续' : '检查'}</span>
          </div>
        ))}
      </div>
    </Frame>
  );
}

const BLOOM_BITS = [0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0] as const;

export function CrawlBloomDiagram({ name }: DiagramProps) {
  const variant = pick(name, WEB_CRAWLING_DIAGRAMS['crawl-bloom'], 'bloom');
  return (
    <Frame
      title={variant === 'simhash' ? 'SimHash 与汉明距离' : 'Bloom Filter 的位数组与假阳性'}
      label="Bloom Filter 用多个哈希置位，可能有假阳性但没有假阴性；SimHash 比较指纹位差异"
      note={
        variant === 'simhash'
          ? '近似重复页面不必逐字节完全相同。SimHash 将特征压成固定位数指纹，汉明距离小到阈值内时进入人工确认或归并。'
          : 'Bloom Filter 判断“可能存在”或“一定不存在”。重复率要求很高时，要在假阳性与内存之间权衡，并记录策略。'
      }
    >
      {variant === 'simhash' ? (
        <div className="crawl-simhash">
          <div>
            <span>页面 A 指纹</span>
            <code>10110010 01101100</code>
          </div>
          <div>
            <span>页面 B 指纹</span>
            <code>10110010 01111100</code>
          </div>
          <p>
            不同的位有 <strong>2</strong> 个 → 汉明距离 2。阈值内 → 作为近似重复候选。
          </p>
        </div>
      ) : (
        <div className="crawl-bloom">
          <div className="crawl-bits" aria-label="12 位 Bloom Filter，当前已置位 5 位">
            {BLOOM_BITS.map((bit, index) => (
              <span className={bit ? 'crawl-bit crawl-bit-set' : 'crawl-bit'} key={index}>
                <small>{index}</small>
                {bit}
              </span>
            ))}
          </div>
          <div className="crawl-bloom-query">
            <span>插入 “/catalog/42” → hash1=2, hash2=4, hash3=7</span>
            <span>查询 “/catalog/43” → 3 个位置均为 1 → 可能存在（可能是假阳性）</span>
          </div>
        </div>
      )}
    </Frame>
  );
}

export function WebCrawlingDiagram({
  kind,
  name,
}: {
  kind: WebCrawlingDiagramKind;
  name?: string;
}) {
  switch (kind) {
    case 'crawl-http-journey':
      return <CrawlHttpJourneyDiagram name={name} />;
    case 'crawl-pipeline':
      return <CrawlPipelineDiagram name={name} />;
    case 'crawl-dom-tree':
      return <CrawlDomTreeDiagram name={name} />;
    case 'crawl-canonicalize':
      return <CrawlCanonicalizeDiagram />;
    case 'crawl-frontier':
      return <CrawlFrontierDiagram name={name} />;
    case 'crawl-robots':
      return <CrawlRobotsDiagram />;
    case 'crawl-rate-limit':
      return <CrawlRateLimitDiagram name={name} />;
    case 'crawl-render-timeline':
      return <CrawlRenderTimelineDiagram name={name} />;
    case 'crawl-recrawl':
      return <CrawlRecrawlDiagram />;
    case 'crawl-distributed':
      return <CrawlDistributedDiagram name={name} />;
    case 'crawl-compliance':
      return <CrawlComplianceDiagram name={name} />;
    case 'crawl-bloom':
      return <CrawlBloomDiagram name={name} />;
    default:
      return <div className="crawl-diagram-missing">未找到网络爬虫图解：{kind}</div>;
  }
}
