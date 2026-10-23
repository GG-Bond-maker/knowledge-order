/**
 * 数据工程与分析工程专用交互式图示组件库（SVG + CSS，零依赖，支持深浅色模式）
 * 覆盖 dbt 分析工程 与 Apache Airflow 核心概念与实战流程
 */

import { useState } from 'react';
import './diagrams.css';

/* ══════════════════════════════════════════════
   1. 现代数据栈 (MDS) 与 ELT 架构全景图
   ══════════════════════════════════════════════ */

export function MdsArchDemo() {
  const [mode, setMode] = useState<'elt' | 'etl' | 'reverse'>('elt');

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">交互演示</span>
        现代数据栈 (MDS) 数据流向与架构演进
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 14 }}>
        <button
          className={`diagram-btn ${mode === 'elt' ? 'active' : ''}`}
          onClick={() => setMode('elt')}
          type="button"
        >
          现代 ELT 架构 (推荐)
        </button>
        <button
          className={`diagram-btn ${mode === 'etl' ? 'active' : ''}`}
          onClick={() => setMode('etl')}
          type="button"
        >
          传统 ETL 架构 (历史痛点)
        </button>
        <button
          className={`diagram-btn ${mode === 'reverse' ? 'active' : ''}`}
          onClick={() => setMode('reverse')}
          type="button"
        >
          反向 ETL 数据回流闭环
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, margin: '12px 0' }}>
        <div style={{ padding: 12, borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', textAlign: 'center' }}>
          <div style={{ fontSize: 20 }}>🔌</div>
          <b style={{ fontSize: 13, color: '#334155' }}>数据源 (Sources)</b>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>MySQL / 埋点 / 计费 API</div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: mode === 'etl' ? '#fef3c7' : '#eff6ff', border: `1px solid ${mode === 'etl' ? '#f59e0b' : '#3b82f6'}`, textAlign: 'center' }}>
          <div style={{ fontSize: 20 }}>{mode === 'etl' ? '⚙️' : '🚚'}</div>
          <b style={{ fontSize: 13, color: mode === 'etl' ? '#b45309' : '#1d4ed8' }}>
            {mode === 'etl' ? '抽取与外部转换 (ET)' : '原生高速加载 (EL)'}
          </b>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {mode === 'etl' ? '专用算力服务器预洗' : 'Fivetran / Airbyte / CDC'}
          </div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1px solid #22c55e', textAlign: 'center' }}>
          <div style={{ fontSize: 20 }}>❄️</div>
          <b style={{ fontSize: 13, color: '#15803d' }}>
            {mode === 'etl' ? '被动存储数仓 (L)' : '云数仓内转换 (dbt / T)'}
          </b>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            Snowflake / BigQuery / DuckDB
          </div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: mode === 'reverse' ? '#fdf2f8' : '#faf5ff', border: `1px solid ${mode === 'reverse' ? '#ec4899' : '#a855f7'}`, textAlign: 'center' }}>
          <div style={{ fontSize: 20 }}>{mode === 'reverse' ? '🔄' : '📊'}</div>
          <b style={{ fontSize: 13, color: mode === 'reverse' ? '#be185d' : '#7e22ce' }}>
            {mode === 'reverse' ? '反向 ETL 运营回流' : '终端消费 (BI / 算法)'}
          </b>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
            {mode === 'reverse' ? 'Hightouch / Census → CRM' : 'Metabase / Looker / 报表'}
          </div>
        </div>
      </div>

      <div className="diagram-caption" style={{ borderLeftColor: mode === 'elt' ? '#3b82f6' : mode === 'etl' ? '#f59e0b' : '#ec4899' }}>
        {mode === 'elt' && (
          <span><b>现代 ELT 核心优势</b>：原始数据 100% 完整直接入库，通过 dbt 在云数仓内部借用无限弹性算力做 SQL 转换。代码受 Git 严格管控，清洗逻辑修改无需重新同步源表！</span>
        )}
        {mode === 'etl' && (
          <span><b>传统 ETL 痛点</b>：数据在进入数仓前已被外部黑盒脚本截断或过滤，业务一旦变更指标口径，必须从生产业务库重新发起耗时数天的全量回溯！</span>
        )}
        {mode === 'reverse' && (
          <span><b>反向 ETL 闭环</b>：将 dbt 计算好的高价值数据资产（如高潜流失用户标签、VIP 信用分）反向推送到 Salesforce、飞书或营销系统，让数据直接赋能一线业务！</span>
        )}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   2. Kimball 维度建模：星型模型交互演示
   ══════════════════════════════════════════════ */

export function KimballStarDemo() {
  const [selectedEntity, setSelectedEntity] = useState<string>('fact');

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">星型模型</span>
        Kimball 维度建模核心实体拓扑
      </figcaption>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', margin: '14px 0' }}>
        <button
          className={`diagram-btn ${selectedEntity === 'fact' ? 'active' : ''}`}
          onClick={() => setSelectedEntity('fact')}
          type="button"
        >
          核心事实表 (fct_orders)
        </button>
        <button
          className={`diagram-btn ${selectedEntity === 'dim_cust' ? 'active' : ''}`}
          onClick={() => setSelectedEntity('dim_cust')}
          type="button"
        >
          客户维度 (dim_customers)
        </button>
        <button
          className={`diagram-btn ${selectedEntity === 'dim_prod' ? 'active' : ''}`}
          onClick={() => setSelectedEntity('dim_prod')}
          type="button"
        >
          商品维度 (dim_products)
        </button>
        <button
          className={`diagram-btn ${selectedEntity === 'dim_date' ? 'active' : ''}`}
          onClick={() => setSelectedEntity('dim_date')}
          type="button"
        >
          日期维度 (dim_date)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr', gap: 12, alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: 10, borderRadius: 8, background: selectedEntity === 'dim_cust' ? '#e0f2fe' : '#f8fafc', border: `1.5px solid ${selectedEntity === 'dim_cust' ? '#0284c7' : '#cbd5e1'}` }}>
            <b style={{ color: '#0369a1', fontSize: 13 }}>dim_customers</b>
            <div style={{ fontSize: 11, color: '#64748b' }}>PK: customer_id (代理键)<br/>name, email, city, tier</div>
          </div>
          <div style={{ padding: 10, borderRadius: 8, background: selectedEntity === 'dim_date' ? '#e0f2fe' : '#f8fafc', border: `1.5px solid ${selectedEntity === 'dim_date' ? '#0284c7' : '#cbd5e1'}` }}>
            <b style={{ color: '#0369a1', fontSize: 13 }}>dim_date</b>
            <div style={{ fontSize: 11, color: '#64748b' }}>PK: date_key (20240101)<br/>year, quarter, is_holiday</div>
          </div>
        </div>

        <div style={{ padding: 14, borderRadius: 10, background: selectedEntity === 'fact' ? '#fef3c7' : '#fffbeb', border: '2px solid #f59e0b', textAlign: 'center', boxShadow: '0 2px 6px rgba(245,158,11,0.15)' }}>
          <div style={{ fontSize: 12, color: '#b45309', fontWeight: 700 }}>事实表 (单行粒度: 1 个订单)</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#78350f', margin: '4px 0' }}>fct_orders</div>
          <div style={{ fontSize: 11, color: '#92400e', textAlign: 'left', lineHeight: 1.6, marginTop: 8 }}>
            🔑 <b>外键 (FKs)</b>: customer_id, product_id, date_key, store_id<br/>
            📈 <b>数值度量</b>: order_amount (可加), item_quantity (可加), discount_ratio (半加)<br/>
            🏷️ <b>退化维度</b>: order_status, promo_code
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ padding: 10, borderRadius: 8, background: selectedEntity === 'dim_prod' ? '#e0f2fe' : '#f8fafc', border: `1.5px solid ${selectedEntity === 'dim_prod' ? '#0284c7' : '#cbd5e1'}` }}>
            <b style={{ color: '#0369a1', fontSize: 13 }}>dim_products</b>
            <div style={{ fontSize: 11, color: '#64748b' }}>PK: product_id<br/>sku, category, brand, list_price</div>
          </div>
          <div style={{ padding: 10, borderRadius: 8, background: '#f8fafc', border: '1.5px solid #cbd5e1' }}>
            <b style={{ color: '#0369a1', fontSize: 13 }}>dim_stores</b>
            <div style={{ fontSize: 11, color: '#64748b' }}>PK: store_id<br/>store_name, region, manager</div>
          </div>
        </div>
      </div>

      <div className="diagram-caption">
        {selectedEntity === 'fact' && <span><b>事实表要义</b>：事实表记录发生的商业事件，包含数值度量与指向维度的外键。必须严格确立行粒度（Grain），严禁混淆不同粒度（如订单级与明细级）！</span>}
        {selectedEntity === 'dim_cust' && <span><b>维度表要义</b>：维度表提供观察事实的上下文视角（Who/What/Where/When）。包含丰富且直观的描述性文本，便于分析师按分类切片（Slice & Dice）！</span>}
        {selectedEntity === 'dim_prod' && <span><b>星型拓扑优势</b>：所有维度表直接与中心事实表相连（仅需 1 次 JOIN），相比深层嵌套的雪花模型，查询速度最快，BI 分析直觉最佳！</span>}
        {selectedEntity === 'dim_date' && <span><b>日期维度</b>：预计算工作日、双休日、财年、节假日标签，让分析师彻底告别在 SQL 中写复杂日期函数！</span>}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   3. dbt 工业级数仓三层架构检查器
   ══════════════════════════════════════════════ */

export function DbtLayersDemo() {
  const [activeLayer, setActiveLayer] = useState<'stg' | 'int' | 'marts'>('stg');

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">数仓三层架构</span>
        Staging → Intermediate → Marts 职责边界
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button
          className={`diagram-btn ${activeLayer === 'stg' ? 'active' : ''}`}
          onClick={() => setActiveLayer('stg')}
          type="button"
        >
          1. 贴源清洗层 (Staging / stg_*)
        </button>
        <button
          className={`diagram-btn ${activeLayer === 'int' ? 'active' : ''}`}
          onClick={() => setActiveLayer('int')}
          type="button"
        >
          2. 中间业务层 (Intermediate / int_*)
        </button>
        <button
          className={`diagram-btn ${activeLayer === 'marts' ? 'active' : ''}`}
          onClick={() => setActiveLayer('marts')}
          type="button"
        >
          3. 业务集市层 (Marts / dim_*, fct_*)
        </button>
      </div>

      <div style={{ padding: 14, borderRadius: 10, background: '#ffffff', border: '1px solid #e2e8f0' }}>
        {activeLayer === 'stg' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, background: '#e0f2fe', color: '#0369a1', fontWeight: 700, fontSize: 12 }}>
                models/staging/&lt;source&gt;/stg_&lt;source&gt;__&lt;entity&gt;.sql
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>默认物化：<b>view</b></span>
            </div>
            <ul style={{ fontSize: 12.5, lineHeight: 1.8, paddingLeft: 18, color: '#334155' }}>
              <li>✅ <b>核心职责</b>：与原始源表保持 <b>1:1</b> 映射，重命名统一为 snake_case，显式 <code>cast()</code> 强转类型，布尔标准化。</li>
              <li>🚫 <b>绝对禁忌</b>：<b>严禁多表 JOIN</b>、严禁执行 GROUP BY 业务聚合、严禁被 BI 工具直接查询。</li>
              <li>🔗 <b>数据输入</b>：只能且仅能调用 <code>{'{{ source("source_name", "table_name") }}'}</code>。</li>
            </ul>
          </div>
        )}

        {activeLayer === 'int' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, background: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: 12 }}>
                models/intermediate/&lt;domain&gt;/int_&lt;entity&gt;_&lt;verb&gt;.sql
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>推荐物化：<b>view 或 ephemeral</b></span>
            </div>
            <ul style={{ fontSize: 12.5, lineHeight: 1.8, paddingLeft: 18, color: '#334155' }}>
              <li>✅ <b>核心职责</b>：封装高度可复用的中间积木。负责跨实体多表关联、行转列透视（Pivot）、窗口函数预计算。</li>
              <li>🚫 <b>核心边界</b>：只供数据团队内部下游 Marts 模型消费，不对终端业务报表直接开放。</li>
              <li>🔗 <b>数据输入</b>：引用 <code>stg_*</code> 模型或更前序的 <code>int_*</code> 模型。</li>
            </ul>
          </div>
        )}

        {activeLayer === 'marts' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ padding: '2px 8px', borderRadius: 4, background: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 12 }}>
                models/marts/&lt;domain&gt;/dim_&lt;entity&gt;.sql / fct_&lt;entity&gt;.sql
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>推荐物化：<b>table 或 incremental</b></span>
            </div>
            <ul style={{ fontSize: 12.5, lineHeight: 1.8, paddingLeft: 18, color: '#334155' }}>
              <li>✅ <b>核心职责</b>：面向业务域直接交付的星型模型宽表。指标开箱即用，无需业务方写复杂 CASE WHEN 或 GROUP BY。</li>
              <li>🚫 <b>防护铁律</b>：<b>严禁向上依赖</b>（如 Marts 引用另一个 Marts 容易导致循环死锁），严禁跨层穿透直接引用原始 source。</li>
              <li>🎯 <b>服务受众</b>：业务分析师、Metabase/Looker 看板、反向 ETL、数据科学家。</li>
            </ul>
          </div>
        )}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   4. dbt 四大核心物化策略模拟器
   ══════════════════════════════════════════════ */

export function DbtMaterializationDemo() {
  const [mat, setMat] = useState<'view' | 'table' | 'incremental' | 'ephemeral'>('incremental');

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">物化策略</span>
        dbt 四大物化机制权衡罗盘
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button className={`diagram-btn ${mat === 'view' ? 'active' : ''}`} onClick={() => setMat('view')} type="button">view (视图)</button>
        <button className={`diagram-btn ${mat === 'table' ? 'active' : ''}`} onClick={() => setMat('table')} type="button">table (物理表)</button>
        <button className={`diagram-btn ${mat === 'incremental' ? 'active' : ''}`} onClick={() => setMat('incremental')} type="button">incremental (增量表)</button>
        <button className={`diagram-btn ${mat === 'ephemeral' ? 'active' : ''}`} onClick={() => setMat('ephemeral')} type="button">ephemeral (CTE内联)</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, textAlign: 'center', marginBottom: 12 }}>
        <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>物理存储占用</div>
          <b style={{ color: mat === 'view' || mat === 'ephemeral' ? '#22c55e' : '#f59e0b' }}>
            {mat === 'view' ? '0 字节' : mat === 'ephemeral' ? '0 字节' : '全量物理存储'}
          </b>
        </div>
        <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>BI 查询速度</div>
          <b style={{ color: mat === 'table' || mat === 'incremental' ? '#22c55e' : '#f59e0b' }}>
            {mat === 'table' ? '极快 (直接扫表)' : mat === 'incremental' ? '极快 (直接扫表)' : '取决于视图嵌套深度'}
          </b>
        </div>
        <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>dbt 构建耗时</div>
          <b style={{ color: mat === 'incremental' ? '#22c55e' : mat === 'table' ? '#ef4444' : '#0284c7' }}>
            {mat === 'incremental' ? '极短 (只算增量)' : mat === 'table' ? '随数据线性激增' : '秒级注册元数据'}
          </b>
        </div>
        <div style={{ padding: 8, background: '#f8fafc', borderRadius: 6, border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>推荐应用层级</div>
          <b style={{ color: '#0369a1' }}>
            {mat === 'view' ? 'Staging / 轻量 Intermediate' : mat === 'table' ? 'Marts 核心维度表' : mat === 'incremental' ? 'Marts 千万级事实表' : '轻量代码片段复用'}
          </b>
        </div>
      </div>

      <div className="diagram-caption">
        {mat === 'view' && <span><b>View 机制</b>：底层执行 <code>CREATE OR REPLACE VIEW</code>，数据永远保持与源表 100% 实时同步，但若深层嵌套会导致查询超时或天价计算账单。</span>}
        {mat === 'table' && <span><b>Table 机制</b>：每次运行全量创建物理表，适合千万级以内的维度表。查询性能极好，但超大事实表全量重跑开销巨大。</span>}
        {mat === 'incremental' && <span><b>Incremental 机制</b>：首次全量建表，后续只通过 <code>is_incremental()</code> 宏增量抓取新记录并与现有物理表 MERGE 合并，海量流水数据管道首选！</span>}
        {mat === 'ephemeral' && <span><b>Ephemeral 机制</b>：不在数据库留下任何实际表或视图，dbt 在编译时将其作为 CTE 直接注入下游 SQL，适合清理内部元数据。</span>}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   5. 增量模型滑动安全回溯窗口与迟到数据处理
   ══════════════════════════════════════════════ */

export function IncrementalWindowDemo() {
  const [windowDays, setWindowDays] = useState<number>(3);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">防漏数机制</span>
        增量模型滑动回溯安全窗口 (Lookback Window)
      </figcaption>

      <div className="pos-controls">
        <label style={{ fontSize: 12.5 }}>
          向前安全回溯天数: <b>{windowDays} 天</b>
          <input
            type="range"
            min="1"
            max="7"
            step="1"
            value={windowDays}
            onChange={(e) => setWindowDays(parseInt(e.target.value, 10))}
            style={{ marginLeft: 10, verticalAlign: 'middle' }}
          />
        </label>
      </div>

      <div style={{ margin: '14px 0', padding: 12, background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span>历史存量锁定区 (只读无需重复计算)</span>
          <span style={{ color: '#0284c7', fontWeight: 700 }}>回溯重叠扫描区 ({windowDays} 天)</span>
          <span style={{ color: '#16a34a', fontWeight: 700 }}>今日最新增量</span>
        </div>

        <div style={{ height: 26, display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
          <div style={{ flex: 10 - windowDays, background: '#cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#475569' }}>
            历史数据 (已物化无需变更)
          </div>
          <div style={{ flex: windowDays, background: '#93c5fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#1e3a8a', fontWeight: 700 }}>
            覆盖延迟到达数据
          </div>
          <div style={{ flex: 2, background: '#86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#14532d', fontWeight: 700 }}>
            今日增量
          </div>
        </div>
      </div>

      <div className="diagram-caption">
        <b>为什么必须回溯？</b>真实生产中经常有因离线设备上传、网络超时而在今天才到达的 2 天前的历史订单（Late-arriving data）。
        单纯写 <code>where updated_at &gt; max(updated_at)</code> 会导致这批数据被永久遗漏！
        向前回溯 {windowDays} 天并结合 <code>unique_key</code> 进行 <code>MERGE</code>，能保证迟到数据与退款状态变更被 100% 幂等修复覆盖！
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   6. Airflow 分布式五大组件交互拓扑
   ══════════════════════════════════════════════ */

export function AirflowArchDemo() {
  const [activeComponent, setActiveComponent] = useState<'scheduler' | 'web' | 'meta' | 'executor' | 'worker'>('scheduler');

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">分布式架构</span>
        Apache Airflow 五大核心组件协同机制
      </figcaption>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
        <button className={`diagram-btn ${activeComponent === 'scheduler' ? 'active' : ''}`} onClick={() => setActiveComponent('scheduler')} type="button">Scheduler (调度大脑)</button>
        <button className={`diagram-btn ${activeComponent === 'meta' ? 'active' : ''}`} onClick={() => setActiveComponent('meta')} type="button">Metadata DB (状态账本)</button>
        <button className={`diagram-btn ${activeComponent === 'web' ? 'active' : ''}`} onClick={() => setActiveComponent('web')} type="button">Webserver (可视化门户)</button>
        <button className={`diagram-btn ${activeComponent === 'executor' ? 'active' : ''}`} onClick={() => setActiveComponent('executor')} type="button">Executor (任务派发官)</button>
        <button className={`diagram-btn ${activeComponent === 'worker' ? 'active' : ''}`} onClick={() => setActiveComponent('worker')} type="button">Workers (计算劳动力)</button>
      </div>

      <div style={{ padding: 14, borderRadius: 10, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
        {activeComponent === 'scheduler' && (
          <div>
            <b style={{ color: '#0284c7', fontSize: 13.5 }}>🧠 Scheduler（调度器）——系统的中枢神经</b>
            <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7, margin: '6px 0' }}>
              后台高频死循环扫描 <code>dags/</code> 目录，解析 Python 拓扑脚本。监听时间周期与依赖关系，判定任务是否就绪，将满足条件的 TaskInstance 标记为 <code>SCHEDULED</code> 并推送给执行器队列。
              <br/>⚠️ <b>严禁在顶层执行耗时查询</b>，否则会直接阻塞调度循环！
            </p>
          </div>
        )}
        {activeComponent === 'meta' && (
          <div>
            <b style={{ color: '#0284c7', fontSize: 13.5 }}>💾 Metadata Database（元数据库）——系统的心脏与唯一真相源</b>
            <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7, margin: '6px 0' }}>
              通常采用高可用 PostgreSQL。存储所有 DAG 结构、任务执行状态、运行历史日志指针、全局变量（Variables）、外部连接凭据（Connections）与 XCom 数据。组件之间互不直接通信，全部通过元数据库解耦交换状态！
            </p>
          </div>
        )}
        {activeComponent === 'web' && (
          <div>
            <b style={{ color: '#0284c7', fontSize: 13.5 }}>🖥️ Webserver（网页服务）——用户操作与监控控制台</b>
            <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7, margin: '6px 0' }}>
              基于 Flask 的 Web 控制台，只读查询元数据库，提供树状图（Grid View）、DAG 拓扑、实时运行日志流、手动触发与重试功能。<b>Webserver 不执行任何实际任务计算代码！</b>
            </p>
          </div>
        )}
        {activeComponent === 'executor' && (
          <div>
            <b style={{ color: '#0284c7', fontSize: 13.5 }}>⚙️ Executor（执行器）——任务派发调度官</b>
            <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7, margin: '6px 0' }}>
              运行在 Scheduler 内部的插件接口，负责决定任务“在哪里、如何被分配执行”：本地多进程并发选 <code>LocalExecutor</code>；分布式集群选 <code>CeleryExecutor</code>；云原生动态弹 Pod 选 <code>KubernetesExecutor</code>。
            </p>
          </div>
        )}
        {activeComponent === 'worker' && (
          <div>
            <b style={{ color: '#0284c7', fontSize: 13.5 }}>🔨 Workers（工作节点）——真实执行业务代码的劳动力</b>
            <p style={{ fontSize: 12.5, color: '#334155', lineHeight: 1.7, margin: '6px 0' }}>
              从消息队列中认领处于 <code>QUEUED</code> 状态的任务，拉起 Python 解释器或容器，执行任务的 <code>execute()</code> 业务逻辑，并将结果与终态写回元数据库。
            </p>
          </div>
        )}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   7. Airflow 任务实例 (TaskInstance) 状态机跃迁
   ══════════════════════════════════════════════ */

export function TaskLifecycleDemo() {
  const [step, setStep] = useState<number>(0);

  const states = [
    { state: 'none', color: '#94a3b8', title: '1. None (初始状态)', desc: '调度器在元数据库中发现此任务，但上游依赖任务尚未执行完毕。' },
    { state: 'scheduled', color: '#38bdf8', title: '2. Scheduled (已就绪)', desc: '前置所有依赖均已成功 (SUCCESS)，调度器标记该任务满足触发条件。' },
    { state: 'queued', color: '#818cf8', title: '3. Queued (进入执行队列)', desc: '执行器将任务放入消息队列 (如 Redis / RabbitMQ)，等待空闲 Worker 认领。' },
    { state: 'running', color: '#22c55e', title: '4. Running (Worker 运行中)', desc: 'Worker 进程认领任务，拉起环境正在全力执行业务代码。' },
    { state: 'success', color: '#16a34a', title: '5. Success (终态：执行成功)', desc: '业务逻辑正常完成，写入终态，触发直接下游任务开始调度！' },
    { state: 'up_for_retry', color: '#f59e0b', title: '可选分支: Up for retry (等待重试)', desc: '执行报错但尚未超过 retries 次数，休眠 retry_delay 后重新进入队列。' },
    { state: 'upstream_failed', color: '#f97316', title: '异常分支: Upstream failed (上游失败跳过)', desc: '由于直接前置任务报错失败，本任务自动取消执行并挂起。' },
  ];

  const cur = states[step];

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">状态机演进</span>
        TaskInstance 任务生命周期跃迁
      </figcaption>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '10px 0' }}>
        {states.map((s, idx) => (
          <button
            key={s.state}
            className={`diagram-btn ${step === idx ? 'active' : ''}`}
            onClick={() => setStep(idx)}
            type="button"
            style={{ fontSize: 11.5 }}
          >
            {s.title.split(' ')[1]}
          </button>
        ))}
      </div>

      <div style={{ padding: 14, borderRadius: 8, background: '#ffffff', border: `2px solid ${cur.color}` }}>
        <b style={{ color: cur.color, fontSize: 14 }}>{cur.title}</b>
        <p style={{ fontSize: 12.5, color: '#334155', margin: '8px 0 0 0', lineHeight: 1.6 }}>{cur.desc}</p>
      </div>

      <div className="diagram-caption">
        点击上方状态标签，可按序观察任务从代码解析发现、依赖等待、进入队列、认领运行到最终成功的完整因果链条。
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   8. XCom “传递指针” vs “传递大对象” 对比演示
   ══════════════════════════════════════════════ */

export function XComPassingDemo() {
  const [mode, setMode] = useState<'bad' | 'good'>('good');

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">XCom 通信</span>
        生产级黄金法则：传递存储指针 (Pass by Reference)
      </figcaption>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button className={`diagram-btn ${mode === 'good' ? 'active' : ''}`} onClick={() => setMode('good')} type="button">
          ✅ 工业级推荐：传递 S3 存储指针 (毫秒级零负担)
        </button>
        <button className={`diagram-btn ${mode === 'bad' ? 'active' : ''}`} onClick={() => setMode('bad')} type="button">
          ❌ 严重反模式：直接传递 DataFrame (引发内存崩盘)
        </button>
      </div>

      <div style={{ padding: 14, borderRadius: 8, background: mode === 'good' ? '#f0fdf4' : '#fef2f2', border: `1.5px solid ${mode === 'good' ? '#22c55e' : '#ef4444'}` }}>
        {mode === 'good' ? (
          <div>
            <b style={{ color: '#15803d', fontSize: 13.5 }}>数据实体落盘至对象存储，XCom 仅流转轻量字符串 URI</b>
            <div style={{ fontFamily: 'monospace', fontSize: 12, background: '#ffffff', padding: 10, borderRadius: 6, margin: '8px 0', border: '1px solid #bbf7d0' }}>
              Task A: df.to_parquet("s3://lake/orders.parquet")<br/>
              Task A 返回: <b>"s3://lake/orders.parquet"</b> (仅 32 字节写入元数据库！)<br/>
              Task B 接收: 拿到路径指针，通过高效底层协议直接读取。
            </div>
            <div style={{ fontSize: 12, color: '#166534' }}>
              💡 <b>零内存压力</b>：元数据库永远轻盈；无论底层数据是 1 万行还是 10 亿行，管道始终健步如飞！
            </div>
          </div>
        ) : (
          <div>
            <b style={{ color: '#b91c1c', fontSize: 13.5 }}>致命错误：直接在 Task 中 return 500 万行 DataFrame</b>
            <div style={{ fontFamily: 'monospace', fontSize: 12, background: '#ffffff', padding: 10, borderRadius: 6, margin: '8px 0', border: '1px solid #fecaca' }}>
              Task A: return large_pandas_df (占用 2GB 内存)<br/>
              💥 灾难 1: Worker 尝试转为 JSON 字符串，内存暴涨 3 倍触发 <b>OOM 崩溃</b>！<br/>
              💥 灾难 2: 数 GB 文本写入 PostgreSQL，连接池卡死，全公司调度瘫痪！
            </div>
            <div style={{ fontSize: 12, color: '#991b1b' }}>
              ⚠️ <b>绝对铁律</b>：XCom 设计用于传递小纸条（元数据/指针），传递上限应控制在 48KB 以内！
            </div>
          </div>
        )}
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   9. Airflow Trigger Rules 分支汇聚决策器
   ══════════════════════════════════════════════ */

export function TriggerRulesDemo() {
  const [rule, setRule] = useState<'all_success' | 'none_failed' | 'all_done'>('none_failed');
  const [branchA, setBranchA] = useState<'success' | 'failed' | 'skipped'>('success');
  const [branchB, setBranchB] = useState<'success' | 'failed' | 'skipped'>('skipped');

  // 判断汇聚任务是否会被触发
  const willTrigger = (() => {
    if (rule === 'all_success') {
      return branchA === 'success' && branchB === 'success';
    }
    if (rule === 'none_failed') {
      const noneFailed = branchA !== 'failed' && branchB !== 'failed';
      const atLeastOne = branchA === 'success' || branchB === 'success';
      return noneFailed && atLeastOne;
    }
    if (rule === 'all_done') {
      return true; // 只要都跑完就触发
    }
    return false;
  })();

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">触发决策器</span>
        Trigger Rules 交互模拟与分支死锁防范
      </figcaption>

      <div style={{ display: 'flex', gap: 12, marginBottom: 12, alignItems: 'center' }}>
        <div style={{ fontSize: 12 }}>
          <b>分支 A 状态</b>:
          <button className={`diagram-btn ${branchA === 'success' ? 'active' : ''}`} onClick={() => setBranchA('success')} type="button" style={{ marginLeft: 6 }}>SUCCESS</button>
          <button className={`diagram-btn ${branchA === 'skipped' ? 'active' : ''}`} onClick={() => setBranchA('skipped')} type="button" style={{ marginLeft: 4 }}>SKIPPED</button>
          <button className={`diagram-btn ${branchA === 'failed' ? 'active' : ''}`} onClick={() => setBranchA('failed')} type="button" style={{ marginLeft: 4 }}>FAILED</button>
        </div>

        <div style={{ fontSize: 12 }}>
          <b>分支 B 状态</b>:
          <button className={`diagram-btn ${branchB === 'success' ? 'active' : ''}`} onClick={() => setBranchB('success')} type="button" style={{ marginLeft: 6 }}>SUCCESS</button>
          <button className={`diagram-btn ${branchB === 'skipped' ? 'active' : ''}`} onClick={() => setBranchB('skipped')} type="button" style={{ marginLeft: 4 }}>SKIPPED</button>
          <button className={`diagram-btn ${branchB === 'failed' ? 'active' : ''}`} onClick={() => setBranchB('failed')} type="button" style={{ marginLeft: 4 }}>FAILED</button>
        </div>
      </div>

      <div className="pos-controls" style={{ marginBottom: 12 }}>
        <button className={`diagram-btn ${rule === 'all_success' ? 'active' : ''}`} onClick={() => setRule('all_success')} type="button">all_success (默认规则)</button>
        <button className={`diagram-btn ${rule === 'none_failed' ? 'active' : ''}`} onClick={() => setRule('none_failed')} type="button">none_failed_min_one_success (分支合并黄金法则)</button>
        <button className={`diagram-btn ${rule === 'all_done' ? 'active' : ''}`} onClick={() => setRule('all_done')} type="button">all_done (清理资源)</button>
      </div>

      <div style={{ padding: 12, borderRadius: 8, background: willTrigger ? '#f0fdf4' : '#fef2f2', border: `2px solid ${willTrigger ? '#22c55e' : '#ef4444'}`, textAlign: 'center' }}>
        <b style={{ fontSize: 14, color: willTrigger ? '#15803d' : '#b91c1c' }}>
          下游汇聚任务判定：{willTrigger ? '🚀 顺利点火触发运行！' : '🛑 触发条件不满足，任务被跳过 (SKIPPED) 或挂起死锁！'}
        </b>
        <div style={{ fontSize: 11.5, color: '#475569', marginTop: 4 }}>
          {rule === 'all_success' && 'all_success 要求上游必须全部 SUCCESS。若有一条分支被 SKIPPED，汇聚任务必然被连带跳过！'}
          {rule === 'none_failed' && 'none_failed_min_one_success 只要没有任务失败，且至少有一条分支走通成功，即可顺利放行！'}
          {rule === 'all_done' && 'all_done 无论上游成功、失败还是跳过，一律兜底执行（最适合负责清理临时资源的终态任务）。'}
        </div>
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   10. 数据间隔 (Data Interval) 与时间因果律时间轴
   ══════════════════════════════════════════════ */

export function DataIntervalDemo() {
  const [selectedDay, setSelectedDay] = useState<number>(1);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">时间因果律</span>
        数据间隔 (Data Interval) 与物理触发时刻
      </figcaption>

      <div className="pos-controls">
        <button className={`diagram-btn ${selectedDay === 1 ? 'active' : ''}`} onClick={() => setSelectedDay(1)} type="button">
          批次 1: 处理 2024-01-01 的数据
        </button>
        <button className={`diagram-btn ${selectedDay === 2 ? 'active' : ''}`} onClick={() => setSelectedDay(2)} type="button">
          批次 2: 处理 2024-01-02 的数据
        </button>
      </div>

      <div style={{ padding: 14, background: '#ffffff', borderRadius: 8, border: '1px solid #cbd5e1', margin: '12px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, textAlign: 'center' }}>
          <div style={{ padding: 8, background: '#eff6ff', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#1e40af' }}>data_interval_start (左闭)</div>
            <b style={{ fontSize: 13, color: '#1e3a8a' }}>2024-01-0{selectedDay} 00:00:00</b>
          </div>
          <div style={{ padding: 8, background: '#eff6ff', borderRadius: 6 }}>
            <div style={{ fontSize: 11, color: '#1e40af' }}>data_interval_end (右开)</div>
            <b style={{ fontSize: 13, color: '#1e3a8a' }}>2024-01-0{selectedDay + 1} 00:00:00</b>
          </div>
          <div style={{ padding: 8, background: '#fef3c7', borderRadius: 6, border: '1px solid #f59e0b' }}>
            <div style={{ fontSize: 11, color: '#b45309' }}>现实物理时间点火触发点</div>
            <b style={{ fontSize: 13, color: '#92400e' }}>2024-01-0{selectedDay + 1} 00:00:00 之后</b>
          </div>
        </div>

        <div style={{ marginTop: 12, padding: 10, background: '#f8fafc', borderRadius: 6, fontFamily: 'monospace', fontSize: 12, color: '#334155' }}>
          SQL 过滤: WHERE created_at &gt;= '2024-01-0{selectedDay} 00:00:00' AND created_at &lt; '2024-01-0{selectedDay + 1} 00:00:00'
        </div>
      </div>

      <div className="diagram-caption">
        <b>为什么区间结束之后才触发？</b>因为只有等到 1 月 {selectedDay} 日 23:59:59 完整过去，全天订单才算完全产生完毕。
        因此，负责 1 月 {selectedDay} 日数据的调度任务，必然在 1 月 {selectedDay + 1} 日凌晨零点才开始点火运行！
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   11. 数据工程幂等性重跑对比模拟器
   ══════════════════════════════════════════════ */

export function IdempotencyDemo() {
  const [runCount, setRunCount] = useState<number>(1);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">幂等写入</span>
        重复重跑任务时的结果状态对比
      </figcaption>

      <div className="pos-controls">
        <span>模拟执行次数: <b>第 {runCount} 次运行</b></span>
        <button className="diagram-btn" onClick={() => setRunCount(prev => prev + 1)} type="button" style={{ marginLeft: 12 }}>
          🔁 重跑该任务一次
        </button>
        <button className="diagram-btn" onClick={() => setRunCount(1)} type="button" style={{ marginLeft: 6 }}>
          重置
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '14px 0' }}>
        <div style={{ padding: 12, borderRadius: 8, background: '#fef2f2', border: '1.5px solid #ef4444' }}>
          <b style={{ color: '#b91c1c', fontSize: 13 }}>非幂等管道 (裸 INSERT INTO 盲目追加)</b>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#991b1b', margin: '8px 0' }}>
            {runCount * 1000} 条数据
          </div>
          <div style={{ fontSize: 11.5, color: '#7f1d1d' }}>
            {runCount === 1 ? '第 1 次运行正常，插入 1000 条。' : `💥 灾难！重跑 ${runCount} 次产生了 ${runCount} 份重复记录，财务汇总指标翻了 ${runCount} 倍！`}
          </div>
        </div>

        <div style={{ padding: 12, borderRadius: 8, background: '#f0fdf4', border: '1.5px solid #22c55e' }}>
          <b style={{ color: '#15803d', fontSize: 13 }}>幂等管道 (两阶段事务 DELETE + INSERT 或 OVERWRITE)</b>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#14532d', margin: '8px 0' }}>
            1000 条数据 (恒定)
          </div>
          <div style={{ fontSize: 11.5, color: '#166534' }}>
            ✅ 完美！无论重跑多少次，目标表始终先清理对应分区再写入，数据恒定保持 1000 条真实记录！
          </div>
        </div>
      </div>

      <div className="diagram-caption">
        幂等性是数据工程的生命线：确保任何因网络超时引发的自动重试、或历史回溯补数（Backfill），都不会产生任何幽灵脏数据！
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   12. Airflow 动态任务映射 Map-Reduce
   ══════════════════════════════════════════════ */

export function DynamicMappingDemo() {
  const [fileCount, setFileCount] = useState<number>(3);

  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">动态映射</span>
        Airflow 2.3+ partial() 与 expand() 运行时自适应
      </figcaption>

      <div className="pos-controls">
        <label style={{ fontSize: 12.5 }}>
          上游动态扫描到的文件数:
          <button className={`diagram-btn ${fileCount === 3 ? 'active' : ''}`} onClick={() => setFileCount(3)} type="button" style={{ marginLeft: 8 }}>3 个文件</button>
          <button className={`diagram-btn ${fileCount === 5 ? 'active' : ''}`} onClick={() => setFileCount(5)} type="button" style={{ marginLeft: 6 }}>5 个文件</button>
        </label>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, margin: '14px 0' }}>
        <div style={{ padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #cbd5e1', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#64748b' }}>上游扫描任务</div>
          <b style={{ fontSize: 12, color: '#334155' }}>scan_s3()</b>
          <div style={{ fontSize: 10.5, color: '#0284c7' }}>产出 {fileCount} 个文件的列表</div>
        </div>

        <div style={{ fontSize: 18, color: '#94a3b8' }}>⟹</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Array.from({ length: fileCount }).map((_, i) => (
            <div key={i} style={{ padding: '4px 10px', borderRadius: 4, background: '#e0f2fe', border: '1px solid #38bdf8', fontSize: 11, color: '#0369a1' }}>
              ⚡ process_file[{i}] (并发任务实例)
            </div>
          ))}
        </div>

        <div style={{ fontSize: 18, color: '#94a3b8' }}>⟹</div>

        <div style={{ padding: 10, borderRadius: 8, background: '#f0fdf4', border: '1px solid #22c55e', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#15803d' }}>下游规约汇总</div>
          <b style={{ fontSize: 12, color: '#166534' }}>summarize_all()</b>
          <div style={{ fontSize: 10.5, color: '#16a34a' }}>汇总全部 {fileCount} 个处理结果</div>
        </div>
      </div>

      <div className="diagram-caption">
        无需手写死循环，<code>process_file.partial(prefix='s3://').expand(file=files)</code> 会在运行时自适应展开为 {fileCount} 个并行的 TaskInstance，在 Web 界面显示为 <code>[{fileCount}]</code>！
      </div>
    </figure>
  );
}

/* ══════════════════════════════════════════════
   13. Airflow + dbt Cosmos 联合架构
   ══════════════════════════════════════════════ */

export function AirflowDbtCosmosDemo() {
  return (
    <figure className="diagram-block interactive">
      <figcaption className="diagram-title">
        <span className="interactive-badge">联合编排</span>
        Airflow 与 dbt Cosmos 细粒度任务映射全景
      </figcaption>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: '12px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 6, background: '#f8fafc', border: '1px solid #cbd5e1' }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: '#0284c7', color: '#fff', fontSize: 11, fontWeight: 700 }}>Airflow 阶段 1</span>
          <span style={{ fontSize: 12, color: '#334155' }}>传感器探测 (ExternalTaskSensor / FileSensor) 确认源端数据就绪</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 6, background: '#f0fdf4', border: '1.5px solid #22c55e' }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: '#16a34a', color: '#fff', fontSize: 11, fontWeight: 700 }}>dbt Cosmos 阶段 2</span>
          <span style={{ fontSize: 12, color: '#14532d' }}>
            自动将 dbt 项目解析为原生 Task：<code>stg_orders</code> ➔ <code>int_order_items</code> ➔ <code>fct_orders</code> ➔ <code>dbt test (unique/not_null)</code>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 8, borderRadius: 6, background: '#faf5ff', border: '1px solid #c084fc' }}>
          <span style={{ padding: '2px 8px', borderRadius: 4, background: '#7e22ce', color: '#fff', fontSize: 11, fontWeight: 700 }}>Airflow 阶段 3</span>
          <span style={{ fontSize: 12, color: '#334155' }}>测试成功触发下游 Dataset 广播，若超时触发 SLA 报警与钉钉/飞书通知</span>
        </div>
      </div>

      <div className="diagram-caption">
        Cosmos 打破了 dbt 的“黑盒单块调用”，将 dbt 模型无损映射为原生 Task。单个模型报错可精准在 Airflow 上单独 Clear 重跑，大幅提升排障效率！
      </div>
    </figure>
  );
}


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

export const DATA_ENGINEERING_DIAGRAMS = {
  'mds-arch': MdsArchDemo,
  'kimball-star': KimballStarDemo,
  'dbt-layers': DbtLayersDemo,
  'dbt-materialization': DbtMaterializationDemo,
  'incremental-window': IncrementalWindowDemo,
  'airflow-arch': AirflowArchDemo,
  'task-lifecycle': TaskLifecycleDemo,
  'xcom-passing': XComPassingDemo,
  'trigger-rules': TriggerRulesDemo,
  'data-interval': DataIntervalDemo,
  'idempotency': IdempotencyDemo,
  'dynamic-mapping': DynamicMappingDemo,
  'airflow-dbt-cosmos': AirflowDbtCosmosDemo,
  'scd-type2': ScdType2Demo,
  'dbt-testing': DbtTestingDemo,
  'slim-ci': SlimCiDemo,
  'semantic-layer': SemanticLayerDemo,
  'dag-structure': DagStructureDemo,
  'executor-compare': ExecutorCompareDemo,
  'sla-monitoring': SlaMonitoringDemo,
};
