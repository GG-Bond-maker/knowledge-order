export const WEB_CRAWLING_DIAGRAMS = {
  'crawl-http-journey': ['overview', 'failure'],
  'crawl-pipeline': ['overview', 'static', 'api', 'incremental'],
  'crawl-dom-tree': ['basic', 'selectors'],
  'crawl-canonicalize': ['default'],
  'crawl-frontier': ['bfs', 'priority'],
  'crawl-robots': ['default'],
  'crawl-rate-limit': ['tokens', 'backoff'],
  'crawl-render-timeline': ['ssr', 'csr', 'playwright'],
  'crawl-recrawl': ['default'],
  'crawl-distributed': ['overview', 'failure'],
  'crawl-compliance': ['consent', 'ssrf'],
  'crawl-bloom': ['bloom', 'simhash'],
} as const;

export const WEB_CRAWLING_DIAGRAM_KINDS = Object.keys(WEB_CRAWLING_DIAGRAMS);
export type WebCrawlingDiagramKind = keyof typeof WEB_CRAWLING_DIAGRAMS;
