# -*- coding: utf-8 -*-
import sys

new_components = '''
/* ══════════════════════════════════════════════
   14. SCD Type 2 缓慢变化维与快照版本演化
   ══════════════════════════════════════════════ */

export function ScdType2Demo() {
  const [moved, setMoved] = useState(false);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">交互演示</span>
        dbt Snapshot：SCD Type 2 缓慢变化维时间线演化
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button
          className={`diagram-btn ${!moved ? 'active' : ''}`}
          onClick={() => setMoved(false)}
          type="button"
        >
          初始状态：客户 Alice 居住于「北京」
        </button>
        <button
          className={`diagram-btn ${moved ? 'active' : ''}`}
          onClick={() => setMoved(true)}
          type="button"
        >
          发生搬家：Alice 迁移居住地至「上海」
        </button>
      </div>

      <div style={{ overflowX: 'auto', margin: '12px 0' }}>
        <table style={{ width: '100%', fontSize: 11.5, borderCollapse: 'collapse', textAlign: 'center' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', color: '#475569', borderBottom: '2px solid #cbd5e1' }}>
              <th style={{ padding: '6px 8px' }}>dbt_scd_id</th>
              <th style={{ padding: '6px 8px' }}>customer_id</th>
              <th style={{ padding: '6px 8px' }}>city</th>
              <th style={{ padding: '6px 8px' }}>dbt_valid_from</th>
              <th style={{ padding: '6px 8px' }}>dbt_valid_to</th>
              <th style={{ padding: '6px 8px' }}>dbt_is_current</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ background: moved ? '#f8fafc' : '#f0fdf4', borderBottom: '1px solid #e2e8f0', color: moved ? '#94a3b8' : '#15803d' }}>
              <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>a1b2_v1</td>
              <td style={{ padding: '6px 8px' }}>C1001</td>
              <td style={{ padding: '6px 8px', fontWeight: 700 }}>北京</td>
              <td style={{ padding: '6px 8px' }}>2023-01-01</td>
              <td style={{ padding: '6px 8px', fontWeight: moved ? 700 : 400, color: moved ? '#e11d48' : '#64748b' }}>
                {moved ? '2024-06-15' : 'null'}
              </td>
              <td style={{ padding: '6px 8px' }}>
                <span style={{ padding: '1px 6px', borderRadius: 4, background: moved ? '#fee2e2' : '#dcfce7', color: moved ? '#b91c1c' : '#15803d', fontWeight: 700 }}>
                  {moved ? 'false' : 'true'}
                </span>
              </td>
            </tr>
            {moved && (
              <tr style={{ background: '#f0fdf4', borderBottom: '1px solid #e2e8f0', color: '#15803d' }}>
                <td style={{ padding: '6px 8px', fontFamily: 'monospace' }}>a1b2_v2</td>
                <td style={{ padding: '6px 8px' }}>C1001</td>
                <td style={{ padding: '6px 8px', fontWeight: 700, color: '#0284c7' }}>上海 (新记录)</td>
                <td style={{ padding: '6px 8px', fontWeight: 700 }}>2024-06-15</td>
                <td style={{ padding: '6px 8px', color: '#64748b' }}>null</td>
                <td style={{ padding: '6px 8px' }}>
                  <span style={{ padding: '1px 6px', borderRadius: 4, background: '#dcfce7', color: '#15803d', fontWeight: 700 }}>
                    true
                  </span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="diagram-caption">
        {moved ? (
          <span>
            <b>Type 2 历史追溯成功</b>：Alice 在 2023 年的历史订单按当时的下单时间与 <code>dbt_valid_from/to</code> 关联，仍归属「北京」业绩；而 2024 年 6 月后的新订单归属「上海」，实现了商业归因的百分之百准确！
          </span>
        ) : (
          <span>
            初始版本记录处于当前有效状态（<code>dbt_valid_to IS NULL</code> 且 <code>dbt_is_current = true</code>）。点击按钮模拟源表发生修改后的快照捕获。
          </span>
        )}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   15. dbt 测试与数据质量门禁
   ══════════════════════════════════════════════ */

export function DbtTestingDemo() {
  const [testType, setTestType] = useState<'unique' | 'not_null' | 'relationships'>('unique');
  const [hasDirty, setHasDirty] = useState(false);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">质量拦截</span>
        dbt Generic Tests 自动化断言与门禁熔断
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button className={`diagram-btn ${testType === 'unique' ? 'active' : ''}`} onClick={() => setTestType('unique')} type="button">
          unique (主键唯一)
        </button>
        <button className={`diagram-btn ${testType === 'not_null' ? 'active' : ''}`} onClick={() => setTestType('not_null')} type="button">
          not_null (非空校验)
        </button>
        <button className={`diagram-btn ${testType === 'relationships' ? 'active' : ''}`} onClick={() => setTestType('relationships')} type="button">
          relationships (外键参照)
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <button
          className={`diagram-btn ${hasDirty ? 'active' : ''}`}
          onClick={() => setHasDirty(!hasDirty)}
          type="button"
          style={{ background: hasDirty ? '#fee2e2' : '#f1f5f9', borderColor: hasDirty ? '#ef4444' : '#cbd5e1', color: hasDirty ? '#b91c1c' : '#475569' }}
        >
          {hasDirty ? '⚠️ 模拟脏数据已注入' : '🧪 点击注入异常脏数据'}
        </button>
        <span style={{ fontSize: 12, color: hasDirty ? '#b91c1c' : '#15803d', fontWeight: 600 }}>
          {hasDirty ? '测试执行：FAIL (返回行数 > 0 触发 Pipeline 熔断)' : '测试执行：PASS (返回 0 行，通过质量门禁)'}
        </span>
      </div>

      <div style={{ padding: 12, borderRadius: 8, background: '#1e293b', color: '#f8fafc', fontFamily: 'monospace', fontSize: 11.5, overflowX: 'auto' }}>
        <div style={{ color: '#94a3b8', marginBottom: 4 }}>-- dbt 自动编译生成的底层校验 SQL:</div>
        {testType === 'unique' && (
          <div>
            SELECT order_id, COUNT(*) AS n<br/>
            FROM models.fct_orders<br/>
            GROUP BY order_id<br/>
            HAVING COUNT(*) &gt; 1;
          </div>
        )}
        {testType === 'not_null' && (
          <div>
            SELECT *<br/>
            FROM models.fct_orders<br/>
            WHERE order_id IS NULL;
          </div>
        )}
        {testType === 'relationships' && (
          <div>
            SELECT customer_id<br/>
            FROM models.fct_orders AS child<br/>
            LEFT JOIN models.dim_customers AS parent ON child.customer_id = parent.customer_id<br/>
            WHERE parent.customer_id IS NULL;
          </div>
        )}
      </div>

      <div className="diagram-caption">
        dbt 测试心法：<b>测试 SQL 查出的行数等于 0 为通过，大于 0 为失败</b>。通过 <code>severity: error</code> 可以直接阻断 CI 部署与下游生产模型构建！
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   16. Slim CI 状态对比加速机制
   ══════════════════════════════════════════════ */

export function SlimCiDemo() {
  const [mode, setMode] = useState<'full' | 'slim'>('slim');

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">CI 加速</span>
        dbt Slim CI 增量编译与构建加速机制
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button className={`diagram-btn ${mode === 'slim' ? 'active' : ''}`} onClick={() => setMode('slim')} type="button">
          Slim CI: 仅构建变更及其下游 (state:modified+)
        </button>
        <button className={`diagram-btn ${mode === 'full' ? 'active' : ''}`} onClick={() => setMode('full')} type="button">
          传统全量 CI: 全仓 300+ 模型重跑
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '12px 0' }}>
        <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <b style={{ fontSize: 13, color: '#334155' }}>执行指令与范围</b>
          <div style={{ margin: '8px 0', fontFamily: 'monospace', fontSize: 11, padding: 8, borderRadius: 4, background: '#1e293b', color: '#38bdf8' }}>
            {mode === 'slim'
              ? 'dbt build --select state:modified+ --defer --state path/to/prod/artifacts'
              : 'dbt build --select models/'}
          </div>
          <div style={{ fontSize: 12, color: '#64748b' }}>
            {mode === 'slim' ? '执行模型：3 个 (修改模型 + 直接下游)' : '执行模型：320 个 (全库所有模型)'}
          </div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: mode === 'slim' ? '#f0fdf4' : '#fff1f2', border: `1px solid ${mode === 'slim' ? '#22c55e' : '#f43f5e'}` }}>
          <b style={{ fontSize: 13, color: mode === 'slim' ? '#15803d' : '#be123c' }}>CI 构建耗时与算力账单</b>
          <div style={{ fontSize: 24, fontWeight: 800, color: mode === 'slim' ? '#16a34a' : '#e11d48', margin: '6px 0' }}>
            {mode === 'slim' ? '⏱️ 45 秒 (节省 98%)' : '⏱️ 48 分钟 (极慢且贵)'}
          </div>
          <div style={{ fontSize: 11.5, color: '#475569' }}>
            {mode === 'slim' ? '未变更的上游模型通过 --defer 自动直接引用生产环境真实表，零冷启动！' : '开发 PR 频繁提交会导致云数仓算力配额枯竭与高昂账单。'}
          </div>
        </div>
      </div>

      <div className="diagram-caption">
        Slim CI 依赖对比当前代码与生产 <code>manifest.json</code> 元数据。在保证质量的前提下，将数百个模型的数仓构建缩短到几十秒内，极大提升研发生产力。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   17. 语义层 (Semantic Layer) 与扇出陷阱
   ══════════════════════════════════════════════ */

export function SemanticLayerDemo() {
  const [useSemantic, setUseSemantic] = useState(true);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">指标治理</span>
        dbt Semantic Layer：规避多对多关联扇出 (Fan-out) 陷阱
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button className={`diagram-btn ${useSemantic ? 'active' : ''}`} onClick={() => setUseSemantic(true)} type="button">
          MetricFlow 语义层查询 (先聚合后 JOIN)
        </button>
        <button className={`diagram-btn ${!useSemantic ? 'active' : ''}`} onClick={() => setUseSemantic(false)} type="button">
          直接大宽表 JOIN 聚合 (扇出陷阱)
        </button>
      </div>

      <div style={{ padding: 12, borderRadius: 8, background: useSemantic ? '#f0fdf4' : '#fff1f2', border: `1px solid ${useSemantic ? '#22c55e' : '#f43f5e'}`, margin: '12px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontSize: 13, color: useSemantic ? '#15803d' : '#be123c' }}>
            计算指标：订单总金额 (Total Revenue)
          </b>
          <span style={{ fontSize: 18, fontWeight: 800, color: useSemantic ? '#16a34a' : '#e11d48' }}>
            {useSemantic ? '¥1,000 (准确无误)' : '¥3,000 (严重重复虚增 300%!)'}
          </span>
        </div>
        <p style={{ fontSize: 12, color: '#334155', marginTop: 8, lineHeight: 1.6 }}>
          {useSemantic
            ? '语义层识别出 orders 与 order_items 存在 1:N 关系，自动在 JOIN 前将订单指标在 orders 粒度先做 SUM() 聚合，彻底杜绝数据膨胀！'
            : '当 1 笔 1000 元的订单包含 3 个子商品时，普通 JOIN 会将主订单行复制 3 次，直接 SUM(order_total) 导致金额虚高 3 倍！'}
        </p>
      </div>

      <div className="diagram-caption">
        语义层将“指标口径”从报表 SQL 中完全抽象出来。无论通过 Tableau、Python 还是 Slack 机器人调用，同一个 Metric 永远返回唯一可信的正确结果。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   18. Airflow DAG 依赖拓扑与环路检测
   ══════════════════════════════════════════════ */

export function DagStructureDemo() {
  const [hasCycle, setHasCycle] = useState(false);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">拓扑校验</span>
        Airflow DAG 有向无环图 (DAG) 依赖与环路检测
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button className={`diagram-btn ${!hasCycle ? 'active' : ''}`} onClick={() => setHasCycle(false)} type="button">
          合法拓扑：A &gt;&gt; [B, C] &gt;&gt; D
        </button>
        <button className={`diagram-btn ${hasCycle ? 'active' : ''}`} onClick={() => setHasCycle(true)} type="button">
          非法环路：添加 D &gt;&gt; A
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '14px 0', flexWrap: 'wrap' }}>
        <div style={{ padding: '8px 14px', borderRadius: 6, background: '#eff6ff', border: '1.5px solid #3b82f6', fontWeight: 700, fontSize: 12, color: '#1d4ed8' }}>
          extract_a
        </div>
        <span style={{ fontSize: 16, color: '#94a3b8' }}>➔</span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ padding: '6px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: 11, color: '#334155' }}>
            transform_b
          </div>
          <div style={{ padding: '6px 12px', borderRadius: 6, background: '#f8fafc', border: '1px solid #cbd5e1', fontSize: 11, color: '#334155' }}>
            transform_c
          </div>
        </div>
        <span style={{ fontSize: 16, color: '#94a3b8' }}>➔</span>
        <div style={{ padding: '8px 14px', borderRadius: 6, background: hasCycle ? '#fee2e2' : '#f0fdf4', border: `1.5px solid ${hasCycle ? '#ef4444' : '#22c55e'}`, fontWeight: 700, fontSize: 12, color: hasCycle ? '#b91c1c' : '#15803d' }}>
          load_d
        </div>
      </div>

      {hasCycle ? (
        <div style={{ padding: 10, borderRadius: 6, background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', fontSize: 12 }}>
          ❌ <b>AirflowDagCycleException 报错熔断</b>：检测到有向循环 <code>load_d ➔ extract_a</code>！调度器无法计算拓扑排序，DAG 文件解析失败，禁止调度上线。
        </div>
      ) : (
        <div style={{ padding: 10, borderRadius: 6, background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', fontSize: 12 }}>
          ✅ <b>DAG 拓扑健康</b>：入度为 0 的 <code>extract_a</code> 优先调度，完成后并发分发给 B 和 C，最后汇总汇聚至 D。
        </div>
      )}

      <div className="diagram-caption">
        工作流必须是严格的<b>有向无环图 (Directed Acyclic Graph)</b>。任务间的死锁依赖会直接破坏拓扑排序，调度器具备自动静态检测机制。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   19. Airflow 执行器架构选型罗盘
   ══════════════════════════════════════════════ */

export function ExecutorCompareDemo() {
  const [executor, setExecutor] = useState<'sequential' | 'local' | 'celery' | 'k8s'>('celery');

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">架构选型</span>
        Airflow 执行器 (Executors) 核心架构与权衡罗盘
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button className={`diagram-btn ${executor === 'sequential' ? 'active' : ''}`} onClick={() => setExecutor('sequential')} type="button">
          Sequential (单进程)
        </button>
        <button className={`diagram-btn ${executor === 'local' ? 'active' : ''}`} onClick={() => setExecutor('local')} type="button">
          Local (单机多进程)
        </button>
        <button className={`diagram-btn ${executor === 'celery' ? 'active' : ''}`} onClick={() => setExecutor('celery')} type="button">
          Celery (常驻集群)
        </button>
        <button className={`diagram-btn ${executor === 'k8s' ? 'active' : ''}`} onClick={() => setExecutor('k8s')} type="button">
          Kubernetes (动态 Pod)
        </button>
      </div>

      <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', margin: '12px 0' }}>
        {executor === 'sequential' && (
          <div>
            <b style={{ color: '#64748b', fontSize: 13 }}>SequentialExecutor (默认内置)</b>
            <div style={{ fontSize: 12, marginTop: 4, color: '#334155', lineHeight: 1.7 }}>
              • <b>原理</b>：配合 SQLite 使用，单进程串行执行任务，并发度 = 1。<br/>
              • <b>适用场景</b>：仅限本地极速试用与教学，严禁用于任何测试或生产环境！
            </div>
          </div>
        )}
        {executor === 'local' && (
          <div>
            <b style={{ color: '#0284c7', fontSize: 13 }}>LocalExecutor (单节点生产)</b>
            <div style={{ fontSize: 12, marginTop: 4, color: '#334155', lineHeight: 1.7 }}>
              • <b>原理</b>：利用多进程池并发执行，无需外部消息队列，架构简单轻量。<br/>
              • <b>适用场景</b>：每日任务数百个的中小型企业单机大规格虚机部署。
            </div>
          </div>
        )}
        {executor === 'celery' && (
          <div>
            <b style={{ color: '#7e22ce', fontSize: 13 }}>CeleryExecutor (工业级常驻集群)</b>
            <div style={{ fontSize: 12, marginTop: 4, color: '#334155', lineHeight: 1.7 }}>
              • <b>原理</b>：结合 Redis/RabbitMQ 分发任务至多台常驻 Worker 节点，支持水平扩容。<br/>
              • <b>适用场景</b>：高并发任务秒级响应、成熟企业级大规模稳定数仓编排。
            </div>
          </div>
        )}
        {executor === 'k8s' && (
          <div>
            <b style={{ color: '#15803d', fontSize: 13 }}>KubernetesExecutor (云原生弹性扩缩)</b>
            <div style={{ fontSize: 12, marginTop: 4, color: '#334155', lineHeight: 1.7 }}>
              • <b>原理</b>：每个 TaskInstance 独立拉起一个专属 K8s Pod，运行完毕立即销毁。<br/>
              • <b>适用场景</b>：任务依赖库冲突（不同 Python/CUDA 版本）、峰谷负载剧烈的云原生生产环境。
            </div>
          </div>
        )}
      </div>

      <div className="diagram-caption">
        选型决策：任务量小选 <b>Local</b>；任务量大且平稳选 <b>Celery</b>；任务环境隔离要求高且算力峰谷差异巨大选 <b>Kubernetes</b>。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   20. SLA 监控与指数退避重试
   ══════════════════════════════════════════════ */

export function SlaMonitoringDemo() {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">弹性容错</span>
        Airflow 任务重试退避 (Exponential Backoff) 与 SLA 告警
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button
          className={`diagram-btn ${retryCount === 0 ? 'active' : ''}`}
          onClick={() => setRetryCount(0)}
          type="button"
        >
          正常初次运行 (Attempt 1)
        </button>
        <button
          className={`diagram-btn ${retryCount === 1 ? 'active' : ''}`}
          onClick={() => setRetryCount(1)}
          type="button"
        >
          重试 1 次 (延迟 2 分钟)
        </button>
        <button
          className={`diagram-btn ${retryCount === 2 ? 'active' : ''}`}
          onClick={() => setRetryCount(2)}
          type="button"
        >
          重试 2 次 (延迟 4 分钟)
        </button>
        <button
          className={`diagram-btn ${retryCount >= 3 ? 'active' : ''}`}
          onClick={() => setRetryCount(3)}
          type="button"
        >
          重试耗尽 ➔ SLA Miss 告警
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0' }}>
        <div style={{ flex: 1, padding: 10, borderRadius: 8, background: retryCount >= 1 ? '#fee2e2' : '#f0fdf4', border: `1px solid ${retryCount >= 1 ? '#f87171' : '#86efac'}`, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>第 1 次尝试</div>
          <b style={{ fontSize: 12, color: retryCount >= 1 ? '#b91c1c' : '#15803d' }}>
            {retryCount >= 1 ? 'FAIL (DB Connection Error)' : 'SUCCESS'}
          </b>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>➔ 退避 2m ➔</span>
        <div style={{ flex: 1, padding: 10, borderRadius: 8, background: retryCount >= 2 ? '#fee2e2' : retryCount === 1 ? '#fef3c7' : '#f8fafc', border: `1px solid ${retryCount >= 2 ? '#f87171' : retryCount === 1 ? '#f59e0b' : '#cbd5e1'}`, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>第 2 次重试</div>
          <b style={{ fontSize: 12, color: retryCount >= 2 ? '#b91c1c' : retryCount === 1 ? '#b45309' : '#94a3b8' }}>
            {retryCount >= 2 ? 'FAIL (503 Gateway)' : retryCount === 1 ? 'RUNNING...' : '待定'}
          </b>
        </div>
        <span style={{ fontSize: 12, color: '#94a3b8' }}>➔ 退避 4m ➔</span>
        <div style={{ flex: 1, padding: 10, borderRadius: 8, background: retryCount >= 3 ? '#fee2e2' : retryCount === 2 ? '#fef3c7' : '#f8fafc', border: `1px solid ${retryCount >= 3 ? '#ef4444' : retryCount === 2 ? '#f59e0b' : '#cbd5e1'}`, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>第 3 次重试</div>
          <b style={{ fontSize: 12, color: retryCount >= 3 ? '#b91c1c' : retryCount === 2 ? '#b45309' : '#94a3b8' }}>
            {retryCount >= 3 ? 'FAILED' : retryCount === 2 ? 'RUNNING...' : '待定'}
          </b>
        </div>
      </div>

      {retryCount >= 3 ? (
        <div style={{ padding: 10, borderRadius: 6, background: '#fee2e2', border: '1px solid #f87171', color: '#b91c1c', fontSize: 12 }}>
          🚨 <b>触发 on_failure_callback &amp; sla_miss_callback</b>：任务已达最大重试上限，自动向钉钉/企业微信群推送告警卡片，并标记下游依赖为 <code>upstream_failed</code>。
        </div>
      ) : (
        <div style={{ padding: 10, borderRadius: 6, background: '#f8fafc', border: '1px solid #cbd5e1', color: '#475569', fontSize: 12 }}>
          💡 指数退避 (Exponential Backoff) 可避免雪崩冲击临时波动的外部 API 或数据库。
        </div>
      )}

      <div className="diagram-caption">
        生产配置黄金法则：针对网络与外部接口任务，务必设置 <code>retries=3</code> 与 <code>retry_exponential_backoff=True</code>。
      </div>
    </figure>
  );
}
'''

new_dict = '''  'scd-type2': ScdType2Demo,
  'dbt-testing': DbtTestingDemo,
  'slim-ci': SlimCiDemo,
  'semantic-layer': SemanticLayerDemo,
  'dag-structure': DagStructureDemo,
  'executor-compare': ExecutorCompareDemo,
  'sla-monitoring': SlaMonitoringDemo,
};'''

with open('src/components/diagrams/DataEngineeringDiagrams.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target_dict = "  'airflow-dbt-cosmos': AirflowDbtCosmosDemo,\n};"
if target_dict not in text and "  'airflow-dbt-cosmos': AirflowDbtCosmosDemo,\r\n};" in text:
    target_dict = "  'airflow-dbt-cosmos': AirflowDbtCosmosDemo,\r\n};"

replacement_dict = "  'airflow-dbt-cosmos': AirflowDbtCosmosDemo,\n" + new_dict

target_loc = "export const DATA_ENGINEERING_DIAGRAMS = {"
assert target_loc in text, 'target_loc not found'
assert target_dict in text, 'target_dict not found'

text = text.replace(target_loc, new_components + "\n" + target_loc, 1)
text = text.replace(target_dict, replacement_dict, 1)

with open('src/components/diagrams/DataEngineeringDiagrams.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated DataEngineeringDiagrams.tsx with all 20 components!')
