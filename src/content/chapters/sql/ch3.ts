import type { Chapter } from '../../../types';

/* ============================================================
 *  第 3 章：聚合与分组
 * ============================================================ */

const ch3: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'sql-3',
  title: '聚合与分组',
  goal: '掌握 COUNT/SUM/AVG/MAX/MIN 的语义差异与 NULL 处理，理解 GROUP BY 的分组规则、HAVING 与 WHERE 的执行时机，避开 AVG 分母与"裸列"两大陷阱。',
  lessons: [
    {
      id: 'sql-l-3-1',
      title: '聚合函数：COUNT 的三种写法与 NULL 处理',
      content: `
## 聚合函数把"多行"压成"一行"

\`\`\`sql
SELECT COUNT(*), SUM(price), AVG(price), MAX(price), MIN(price) FROM products;
\`\`\`

结果是**一行五列**。聚合函数接收一列（或多行），输出一个值。最常用的五个：

| 函数 | 含义 | 对 NULL 的处理 |
| --- | --- | --- |
| \`COUNT(*)\` | 行数 | 数所有行 |
| \`COUNT(col)\` | 非 NULL 值个数 | 跳过 NULL |
| \`COUNT(DISTINCT col)\` | 不同非 NULL 值个数 | 跳过 NULL |
| \`SUM(col)\` | 求和 | 跳过 NULL；全 NULL 时返回 NULL |
| \`AVG(col)\` | 平均值 | **分母是非 NULL 个数** |
| \`MAX/MIN(col)\` | 最大/最小值 | 跳过 NULL；字符串按字典序 |

## COUNT 的三种写法必须分清

\`customers\` 表 15 行，其中 \`member_level\` 有 1 个 NULL：

| 写法 | 结果 | 语义 |
| --- | --- | --- |
| \`COUNT(*)\` | **15** | 行数 |
| \`COUNT(member_level)\` | **14** | 非 NULL 的会员等级数 |
| \`COUNT(DISTINCT member_level)\` | **3** | 不同的非 NULL 等级数（金卡/银卡/普通） |

一个经典混淆点是 \`COUNT(1)\`：它和 \`COUNT(*)\` 结果相同（都数行数），性能也基本无差别——现代优化器会识别。**不要用 \`COUNT(字段)\` 来代替 \`COUNT(*)\` 数行数**，因为字段有 NULL 时会少数。

## "统计人数"到底是哪张表

\`\`\`sql
SELECT COUNT(*) FROM order_items;   -- 59：明细行数
SELECT COUNT(*) FROM orders;        -- 45：订单数
\`\`\`

如果问"有多少个客户下过单"，正确写法是：

\`\`\`sql
SELECT COUNT(DISTINCT customer_id) AS buyers FROM orders;
\`\`\`

而不是 \`COUNT(*)\`（那是订单数）。这类口径问题是数据分析工作里最容易引发争议的地方，**写 SQL 之前先确认"分母是谁"**。

## SUM / AVG / MAX / MIN

\`\`\`sql
SELECT SUM(price)              AS total_price,   -- 求和
       ROUND(AVG(price), 2)    AS avg_price,     -- 平均值
       MAX(price)              AS max_price,
       MIN(price)              AS min_price
FROM products;
\`\`\`

- \`SUM\` 只对数值有意义。在 SQLite 里对文本求和会得到 0，在 MySQL 里会隐式转换（\`'abc'\` → 0），在 PostgreSQL 里直接报错。
- \`MAX/MIN\` 也能用于文本和日期：\`MAX(order_date)\` 得到 \`'2024-12-24'\`，正是 ISO 日期文本排序的好处。
- \`SUM\` 的精度问题：\`REAL\` 金额累加会有浮点误差，展示前用 \`ROUND\`。

## 聚合遇到空集

如果没有行参与聚合：

\`\`\`sql
SELECT COUNT(*) AS c, SUM(price) AS s, AVG(price) AS a
FROM products WHERE 1 = 0;
\`\`\`

结果是 **1 行**：\`c = 0\`，而 \`s\` 和 \`a\` 都是 \`NULL\`（不是 0！）。这一点常导致下游报表出现空白，通常用 \`COALESCE(SUM(x), 0)\` 兜底。

## 聚合中混入普通列：危险信号

\`\`\`sql
SELECT product_id, category, MAX(price) FROM products;
\`\`\`

这条 SQL 在 SQLite 和 MySQL（默认非严格模式）里**能执行**，但 \`product_id\`、\`category\` 取的是"恰好被选中那一行"的值，**语义是不确定的**；PostgreSQL 会直接报错。正确做法是写 \`GROUP BY\`（第 2 节）或用窗口函数（第 5 章）。

> 面试提醒：这类"没有元组、没有聚合"的裸列出现在 SQLite 中很常见（SQLite 文档明确说这是特性），但它**不是标准 SQL**，面试被问到要能说清"为什么不应该这么写"。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`COUNT(col)` 会跳过 NULL。统计"有多少行"请用 `COUNT(*)`；统计"有多少个不同客户"用 `COUNT(DISTINCT customer_id)`。',
        },
        {
          kind: 'pitfall',
          text: '空集时 `SUM`/`AVG` 返回 NULL 而不是 0。报表场景建议 `COALESCE(SUM(x), 0)`，否则前端会显示空白。',
        },
        {
          kind: 'interview',
          text: '常问："`COUNT(*)`、`COUNT(1)`、`COUNT(col)` 的区别？"标准答法：前两者都数行数（优化器等价），`COUNT(col)` 只数该列非 NULL 的值。',
        },
      ],
      demos: [
        {
          title: '五个聚合函数一次看完',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COUNT(*) AS cnt,
       COUNT(cost) AS cost_not_null,
       ROUND(SUM(price), 2) AS sum_price,
       ROUND(AVG(price), 2) AS avg_price,
       MIN(price) AS min_price,
       MAX(price) AS max_price
FROM products`,
        },
        {
          title: '空集时 SUM / AVG 返回 NULL',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COUNT(*) AS cnt,
       SUM(price) AS sum_price,
       AVG(price) AS avg_price,
       COALESCE(SUM(price), 0) AS sum_with_default
FROM products
WHERE price > 5000`,
        },
        {
          title: 'COUNT 的三种口径',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COUNT(*) AS rows_total,
       COUNT(member_level) AS level_not_null,
       COUNT(DISTINCT member_level) AS level_distinct
FROM customers`,
        },
      ],
    },
    {
      id: 'sql-l-3-2',
      title: 'GROUP BY 与 HAVING：分组的规则与陷阱',
      content: `
## GROUP BY 做了什么

\`GROUP BY\` 按指定列的值把行**分成若干组**，每组产出一行结果：

\`\`\`sql
SELECT region, COUNT(*) AS customer_cnt
FROM customers
GROUP BY region;
\`\`\`

结果 6 行：华东 4、华北 4、华南 3、西南 2、华中 1、西北 1。

执行过程可以这样理解：

1. 扫描 \`customers\` 的 15 行；
2. 按 \`region\` 的取值放入 6 个"桶"；
3. 对每个桶执行 \`COUNT(*)\` 得到一行。

## 核心规则：SELECT 里只能出现"分组键"或"聚合值"

合法：

\`\`\`sql
SELECT region, city, COUNT(*) FROM customers GROUP BY region, city;   -- 分组键可出现
SELECT region, COUNT(*), SUM(...) FROM customers GROUP BY region;     -- 聚合值可出现
SELECT region, UPPER(region) FROM customers GROUP BY region;          -- 分组键的函数结果
\`\`\`

不推荐（SQLite/MySQL 允许，PostgreSQL 报错）：

\`\`\`sql
SELECT region, name, COUNT(*) FROM customers GROUP BY region;
\`\`\`

\`name\` 既不是分组键也不是聚合结果，**每组有 4 个不同的值，SQL 不知道该显示哪一个**。SQLite 会随便挑一个，看起来"能跑"，但在 PostgreSQL 上会直接报：

\`\`\`
ERROR: column "customers.name" must appear in the GROUP BY clause or be used in an aggregate function
\`\`\`

## HAVING vs WHERE：时机不同

| | WHERE | HAVING |
| --- | --- | --- |
| 执行时机 | 分组**之前** | 分组**之后** |
| 作用对象 | 单行 | 分组 |
| 能用聚合函数吗 | **不能** | **能** |
| 能用 SELECT 别名吗 | 不能 | SQLite/MySQL 可以，PostgreSQL 不行 |
| 典型用法 | \`status = '已完成'\` | \`COUNT(*) >= 4\` |

\`\`\`sql
SELECT customer_id, COUNT(*) AS order_cnt
FROM orders
WHERE status = '已完成'        -- 先过滤行
GROUP BY customer_id
HAVING COUNT(*) >= 4           -- 再过滤组
ORDER BY order_cnt DESC;
\`\`\`

**性能原则：能在 WHERE 过滤的，绝不要放到 HAVING。** 因为 WHERE 减少的是参与分组的行数（甚至能用上索引），而 HAVING 是在分组之后做的"事后筛选"，工作量已经发生了。例如 \`WHERE status = '已完成'\` 比 \`HAVING SUM(CASE WHEN status = '已完成' ...)\` 高效得多。

## 聚合中的 NULL

- **NULL 自成一组**：\`GROUP BY member_level\` 会产生一个 \`member_level IS NULL\` 的组（本数据 1 行，"许晴"）。如果不想看到它，就在 \`WHERE member_level IS NOT NULL\` 中过滤掉。
- 分组键里的 NULL 与普通值一样参与分组，这一点与 \`=\` 比较的行为不同。

## AVG 的分母陷阱

\`\`\`sql
-- 想算"有折扣的订单的平均折扣率"
SELECT ROUND(AVG(discount), 4) FROM order_items;   -- 0.0466（把 0 折也平均进去了）
SELECT ROUND(AVG(CASE WHEN discount > 0 THEN discount END), 4) FROM order_items;  -- 0.1146（只看有折扣的）
\`\`\`

\`AVG(列)\` 的分母是**该列非 NULL 的个数**，而 \`0\` 是有效值，会拉低平均值。要排除 0，必须显式 \`CASE WHEN discount > 0 THEN discount END\`——注意这个 CASE **没有 ELSE**，未命中时返回 NULL，而 AVG 会跳过 NULL，这就是"条件平均"的常用写法。

## 多列分组

\`\`\`sql
SELECT region, member_level, COUNT(*) AS cnt
FROM customers
GROUP BY region, member_level;
\`\`\`

分组键是 \`(region, member_level)\` 的组合，组数 ≤ 地区数 × 等级数。SELECT 里的列也必须是这些组合中的列。

## 别名在 WHERE 中不可用

\`\`\`sql
-- ❌ 报错：no such column: order_cnt
SELECT customer_id, COUNT(*) AS order_cnt FROM orders
WHERE order_cnt > 3 GROUP BY customer_id;

-- ✅ 正确：用 HAVING
SELECT customer_id, COUNT(*) AS order_cnt FROM orders
GROUP BY customer_id HAVING order_cnt > 3;
\`\`\`

原因就是执行顺序：\`WHERE\` 早于 \`SELECT\`，别名还不存在。而 \`HAVING\` 在 \`SELECT\` 之后，SQLite 与 MySQL 允许引用别名（PostgreSQL 也支持引用 SELECT 别名做 HAVING，但为兼容性考虑，写完整的 \`COUNT(*) >= 4\` 最稳妥）。

## 用 GROUP BY 替代 COUNT(DISTINCT)

\`SELECT COUNT(DISTINCT member_level) FROM customers\` 与

\`\`\`sql
SELECT COUNT(*) FROM (SELECT member_level FROM customers GROUP BY member_level) AS t;
\`\`\`

结果一致（3），后者在部分数据库里更容易走索引。这也是后面学习子查询、CTE 的入口。

<HashTableDemo />
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'SELECT 中出现既非分组键也非聚合值的列（如 `GROUP BY region` 却 SELECT `name`），在 SQLite/MySQL 能跑但在 PostgreSQL 报错，且结果不可信。',
        },
        {
          kind: 'pitfall',
          text: '`AVG(discount)` 会把 0 折扣算进分母。要算"有折扣行的平均折扣"，用 `AVG(CASE WHEN discount > 0 THEN discount END)`。',
        },
        {
          kind: 'performance',
          text: '能放进 WHERE 的条件不要放 HAVING：WHERE 在分组前减少行数，还可能命中索引；HAVING 必须等分组完成后再筛。',
        },
        {
          kind: 'interview',
          text: '必考："WHERE 和 HAVING 的区别"。要点：执行时机（分组前/后）、能否用聚合函数、能否用别名、性能影响。',
        },
      ],
      demos: [
        {
          title: '按大区统计客户数',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT region, COUNT(*) AS customer_cnt
FROM customers
GROUP BY region
ORDER BY customer_cnt DESC, region`,
        },
        {
          title: 'WHERE 先过滤 + GROUP BY + HAVING 再筛选',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT customer_id, COUNT(*) AS order_cnt
FROM orders
WHERE status = '已完成'
GROUP BY customer_id
HAVING COUNT(*) >= 4
ORDER BY order_cnt DESC, customer_id`,
        },
        {
          title: 'AVG 分母陷阱：0 会不会被算进去',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT ROUND(AVG(discount), 4) AS avg_all,
       ROUND(AVG(CASE WHEN discount > 0 THEN discount END), 4) AS avg_with_discount,
       COUNT(*) AS total_rows,
       SUM(CASE WHEN discount > 0 THEN 1 ELSE 0 END) AS discounted_rows
FROM order_items`,
        },
        {
          title: 'NULL 自成一组',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT member_level, COUNT(*) AS cnt
FROM customers
GROUP BY member_level
ORDER BY member_level IS NULL, member_level`,
        },
      ],
    },
    {
      id: 'sql-l-3-3',
      title: '业务口径：从明细到指标',
      content: `
## 一个指标需要几个聚合

以"销售额"为例，先要定义口径：

| 口径 | SQL 表达式 | retail 全年值 |
| --- | --- | --- |
| 明细行金额 | \`quantity * unit_price * (1 - discount)\` | 逐行 |
| GMV（含取消） | \`SUM(...)\` 对全部明细 | **25505.5** |
| 有效 GMV | 仅 \`status = '已完成'\` | **24150.5** |
| 订单均价 | 有效 GMV / 有效订单数 | 跨表，需两个聚合 |

\`\`\`sql
SELECT ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv_all
FROM order_items AS i;

SELECT ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv_valid
FROM order_items AS i
JOIN orders AS o ON o.order_id = i.order_id
WHERE o.status = '已完成';
\`\`\`

两者差 1355 元，正是 4 笔取消订单的金额。**分析报告必须先写清口径**，否则同一份数据能得出不同结论。

## 一次查询产出多个指标

\`\`\`sql
SELECT COUNT(*)                                   AS line_cnt,
       SUM(quantity)                              AS units,
       ROUND(SUM(quantity * unit_price), 2)       AS gross,
       ROUND(SUM(quantity * unit_price * discount), 2) AS discount_amt,
       ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS net
FROM order_items;
\`\`\`

这样的"一行多指标"常用于**经营总览**：毛额、折扣额、净额一次算清，便于核对 \`净值 = 毛额 - 折扣额\`。

## 分母选择决定指标含义

| 问题 | 正确写法 | 常见的错误写法 |
| --- | --- | --- |
| 每位客户平均下几单 | \`(SELECT COUNT(*) FROM orders) / 客户数\` | 用明细行数当订单数 |
| 平均客单价 | \`GMV / 有效订单数\` | \`AVG(行金额)\`（那是平均行单价） |
| 平均每单买几件 | \`SUM(quantity) / COUNT(DISTINCT order_id)\` | \`AVG(quantity)\`（那是每行件数） |
| 有折扣的比例 | \`SUM(discount > 0) / COUNT(*)\` | 把 NULL 也算进分母 |

这几条几乎覆盖了零售分析里 80% 的"指标被质疑"的场景。

## 聚合与 JOIN 的行数放大

第 4 章会详细讲，但这里先预警：**先 JOIN 再聚合时，如果 JOIN 是一对多，分母会被放大**。

\`\`\`sql
-- 危险：客户表 LEFT JOIN 订单，一个客户有多单 → 客户行被复制
SELECT c.region, COUNT(*) AS cnt
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
GROUP BY c.region;
\`\`\`

这里的 \`COUNT(*)\` 数的是"客户 × 订单"的行数，而不是客户数。应该写 \`COUNT(DISTINCT c.customer_id)\`。**只要 SQL 里同时出现 JOIN 与聚合，就必须问自己：这行的粒度是什么？**

## 用 CASE 做分箱统计

\`\`\`sql
SELECT CASE WHEN quantity >= 3 THEN '大单' ELSE '普通' END AS order_size,
       COUNT(*) AS lines,
       ROUND(AVG(quantity), 2) AS avg_qty
FROM order_items
GROUP BY order_size;
\`\`\`

分箱 + 分组统计是最常见的"快速洞察"套路。注意分组键写成与 SELECT 相同的 CASE 表达式（或使用别名，SQLite 支持）。

## 小节：三重检查清单

在把一条聚合 SQL 交给业务之前，问自己三件事：

1. **粒度对吗？** 每行代表客户、订单还是明细？
2. **分母对吗？** 是不是用了 \`COUNT(*) \` 而不是 \`COUNT(DISTINCT ...)\`？
3. **NULL 和取消单排除对了吗？** WHERE 条件是否漏掉 \`IS NULL\`，状态是否过滤？
`,
      tips: [
        {
          kind: 'leak',
          text: 'JOIN 之后再 `COUNT(*)` 会数到被放大的行数（客户 × 订单）。需要"客户数"时必须 `COUNT(DISTINCT c.customer_id)`。',
        },
        {
          kind: 'note',
          text: '同一份 retail 数据：GMV（含取消）= 25505.5，有效 GMV = 24150.5。报告里不写口径，两个数会被当成两个结论互相打架。',
        },
        {
          kind: 'interview',
          text: '面试常给"客单价"下定义：客单价 = 销售额 / 订单数，**不是**平均每行金额。回答前先确认分母是订单数、客户数还是明细行数。',
        },
      ],
      demos: [
        {
          title: '一行产出多个经营指标',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COUNT(*) AS line_cnt,
       SUM(quantity) AS units,
       ROUND(SUM(quantity * unit_price), 2) AS gross,
       ROUND(SUM(quantity * unit_price * discount), 2) AS discount_amt,
       ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS net
FROM order_items`,
        },
        {
          title: 'GMV 口径对比：含取消 vs 有效',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT '含取消' AS scope,
       ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS gmv
FROM order_items
UNION ALL
SELECT '仅已完成',
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2)
FROM order_items AS i
JOIN orders AS o ON o.order_id = i.order_id
WHERE o.status = '已完成'`,
        },
        {
          title: 'CASE 分箱 + 聚合',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT CASE WHEN quantity >= 3 THEN '大单' ELSE '普通' END AS order_size,
       COUNT(*) AS lines,
       SUM(quantity) AS units,
       ROUND(AVG(quantity), 2) AS avg_qty
FROM order_items
GROUP BY 1
ORDER BY lines DESC`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'sql-3-e1',
      type: 'sql',
      difficulty: 1,
      question: '统计商品总数量、所有商品标价之和（列名 `total_price`）。**期望列**：`cnt`、`total_price`。',
      starterSql: 'SELECT COUNT(*) AS cnt, SUM(price) AS total_price FROM products',
      referenceSql: 'SELECT COUNT(*) AS cnt, SUM(price) AS total_price FROM products',
      explanation: '12 个商品，标价合计 3967。聚合函数把多行压成一行：`COUNT(*)` 数行，`SUM(price)` 对整列求和。',
      tags: ['COUNT', 'SUM'],
      relatedLessonId: 'sql-l-3-1',
    },
    {
      id: 'sql-3-e2',
      type: 'sql',
      difficulty: 1,
      question: '计算订单明细的平均购买件数，保留 2 位小数，列名 `avg_qty`。**期望列**：`avg_qty`。',
      starterSql: 'SELECT ROUND(AVG(quantity), 2) AS avg_qty FROM order_items',
      referenceSql: 'SELECT ROUND(AVG(quantity), 2) AS avg_qty FROM order_items',
      explanation: '`AVG(quantity)` = 总件数 / 明细行数 = 104 / 59 ≈ 1.76。注意这是"每行平均件数"，不是"每单平均件数"。',
      tags: ['AVG'],
      relatedLessonId: 'sql-l-3-1',
    },
    {
      id: 'sql-3-e3',
      type: 'sql',
      difficulty: 1,
      question: '统计 `customers` 表行数（`rows_total`）与 `member_level` 非空值个数（`level_not_null`）。**期望列**：`rows_total`、`level_not_null`。',
      starterSql: 'SELECT COUNT(*) AS rows_total, COUNT( ) AS level_not_null FROM customers',
      referenceSql: 'SELECT COUNT(*) AS rows_total, COUNT(member_level) AS level_not_null FROM customers',
      explanation: '`COUNT(*)` = 15，`COUNT(member_level)` = 14（许晴的等级为 NULL 被跳过）。',
      tags: ['COUNT', 'NULL'],
      relatedLessonId: 'sql-l-3-1',
    },
    {
      id: 'sql-3-e4',
      type: 'sql',
      difficulty: 1,
      question: '统计下过单的客户数（去重），列名 `buyer_cnt`。**期望列**：`buyer_cnt`。',
      starterSql: 'SELECT COUNT(DISTINCT customer_id) AS buyer_cnt FROM orders',
      referenceSql: 'SELECT COUNT(DISTINCT customer_id) AS buyer_cnt FROM orders',
      explanation: '15 位客户都至少有一单。如果写成 `COUNT(*)` 得到的是 45（订单数），这就是典型的"分母选错"。',
      tags: ['COUNT DISTINCT'],
      relatedLessonId: 'sql-l-3-1',
    },
    {
      id: 'sql-3-e5',
      type: 'sql',
      difficulty: 2,
      question: '按大区统计客户数，列名 `region`、`customer_cnt`。**期望列**：`region`、`customer_cnt`。',
      starterSql: 'SELECT region, COUNT(*) AS customer_cnt FROM customers GROUP BY ',
      referenceSql: 'SELECT region, COUNT(*) AS customer_cnt FROM customers GROUP BY region',
      explanation: '6 个大区：华东 4、华北 4、华南 3、西南 2、华中 1、西北 1，合计 15。',
      tags: ['GROUP BY'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e6',
      type: 'sql',
      difficulty: 2,
      question: '按会员等级统计客户数（含 NULL 组），列名 `member_level`、`cnt`。**期望列**：`member_level`、`cnt`。',
      starterSql: 'SELECT member_level, COUNT(*) AS cnt FROM customers GROUP BY member_level',
      referenceSql: 'SELECT member_level, COUNT(*) AS cnt FROM customers GROUP BY member_level',
      explanation: '金卡 4、银卡 5、普通 5、NULL 1。**NULL 会自成一组**，如果不想显示，要在 WHERE 中过滤 `member_level IS NOT NULL`。',
      tags: ['GROUP BY', 'NULL'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e7',
      type: 'sql',
      difficulty: 2,
      question: '按商品品类统计商品数（`product_cnt`）与平均标价（`avg_price`，保留 2 位小数）。**期望列**：`category`、`product_cnt`、`avg_price`。',
      starterSql: 'SELECT category, COUNT(*) AS product_cnt, ROUND(AVG(price), 2) AS avg_price\nFROM products\nGROUP BY ',
      referenceSql: 'SELECT category, COUNT(*) AS product_cnt, ROUND(AVG(price), 2) AS avg_price FROM products GROUP BY category',
      explanation: '数码 4 件均价 631.5、服装 3 件 272.33、家居 3 件 99、食品 2 件 163.5。',
      tags: ['GROUP BY', 'AVG'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e8',
      type: 'sql',
      difficulty: 2,
      question: '统计订单数超过 3 单（含）的客户，返回 `customer_id` 和 `order_cnt`。**期望列**：`customer_id`、`order_cnt`。',
      starterSql: 'SELECT customer_id, COUNT(*) AS order_cnt FROM orders\nGROUP BY customer_id\nHAVING ',
      referenceSql: 'SELECT customer_id, COUNT(*) AS order_cnt FROM orders GROUP BY customer_id HAVING COUNT(*) > 3',
      explanation: '组级过滤必须用 HAVING。结果 4 行：1 号 5 单，2、4、5 号各 4 单。如果写 `WHERE COUNT(*) > 3` 会报错。',
      tags: ['HAVING'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e9',
      type: 'sql',
      difficulty: 3,
      question:
        '统计状态为"已完成"的订单里，每个客户的订单数（`order_cnt`），只保留 ≥ 4 单的客户。**期望列**：`customer_id`、`order_cnt`。',
      starterSql: "SELECT customer_id, COUNT(*) AS order_cnt FROM orders\nWHERE status = '已完成'\nGROUP BY customer_id HAVING COUNT(*) >= ",
      referenceSql:
        "SELECT customer_id, COUNT(*) AS order_cnt FROM orders WHERE status = '已完成' GROUP BY customer_id HAVING COUNT(*) >= 4",
      explanation: '先 WHERE 过滤行、再 GROUP BY 分组、最后 HAVING 过滤组，这就是完整的执行链条。结果是 2 号、4 号、5 号各 4 单（1 号 5 单中有 1 笔取消，只剩 4 单）。',
      tags: ['WHERE', 'HAVING'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e10',
      type: 'sql',
      difficulty: 3,
      question:
        '计算**有折扣**的明细行的平均折扣率（即 discount > 0 的行），保留 4 位小数，列名 `avg_discount`。**期望列**：`avg_discount`。',
      starterSql: 'SELECT ROUND(AVG(CASE WHEN discount > 0 THEN discount END), 4) AS avg_discount\nFROM order_items',
      referenceSql: 'SELECT ROUND(AVG(CASE WHEN discount > 0 THEN discount END), 4) AS avg_discount FROM order_items',
      explanation:
        '无 ELSE 的 CASE 在未命中时返回 NULL，AVG 自动跳过，于是分母只含"有折扣"的行，结果约 0.1146。若直接 `AVG(discount)` 得到 0.0466，是被 0 折扣行稀释后的结果。',
      tags: ['AVG', '条件聚合', 'NULL'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e11',
      type: 'single',
      difficulty: 2,
      question: '`customers` 表 15 行，`member_level` 有 1 个 NULL。以下哪个语句的结果**不等于** 15？',
      options: [
        { value: 'A', text: '`SELECT COUNT(*) FROM customers`' },
        { value: 'B', text: '`SELECT COUNT(1) FROM customers`' },
        { value: 'C', text: '`SELECT COUNT(member_level) FROM customers`' },
        { value: 'D', text: '`SELECT COUNT(customer_id) FROM customers`' },
      ],
      answer: 'C',
      explanation:
        '`COUNT(*)`、`COUNT(1)`、`COUNT(主键)` 都数行数 = 15；只有 `COUNT(member_level)` 因为跳过 NULL 得到 14。',
      tags: ['COUNT', 'NULL'],
      relatedLessonId: 'sql-l-3-1',
    },
    {
      id: 'sql-3-e12',
      type: 'judge',
      difficulty: 2,
      question: '`SELECT region, name, COUNT(*) FROM customers GROUP BY region;` 在任何数据库上都能正确执行，且 `name` 显示的是该地区第一位客户。',
      answer: false,
      explanation:
        '`name` 既不是分组键也没有被聚合。SQLite/MySQL 放宽了这条规则（SQLite 文档称之为特性，取"任意一行"），但结果不确定；PostgreSQL 会直接报错 `must appear in the GROUP BY clause`。',
      tags: ['GROUP BY', '裸列'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e13',
      type: 'single',
      difficulty: 2,
      question: '`SELECT COUNT(*) AS c, SUM(price) AS s FROM products WHERE price > 99999;` 的结果是？',
      options: [
        { value: 'A', text: '0 行结果' },
        { value: 'B', text: '1 行：`c = 0`，`s = 0`' },
        { value: 'C', text: '1 行：`c = 0`，`s = NULL`' },
        { value: 'D', text: '1 行：`c = NULL`，`s = NULL`' },
      ],
      answer: 'C',
      explanation:
        '没有分组键的聚合查询**总是返回 1 行**；`COUNT(*)` 在空集上返回 0，而 `SUM/AVG/MAX/MIN` 在空集上返回 NULL。报表里常用 `COALESCE(SUM(x), 0)` 兜底。',
      tags: ['聚合', 'NULL'],
      relatedLessonId: 'sql-l-3-1',
    },
    {
      id: 'sql-3-e14',
      type: 'multiple',
      difficulty: 3,
      question: '关于 `WHERE` 与 `HAVING`，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '`WHERE` 在分组前执行，`HAVING` 在分组后执行' },
        { value: 'B', text: '`WHERE` 中不能使用聚合函数' },
        { value: 'C', text: '`HAVING` 可以引用聚合函数的结果' },
        { value: 'D', text: '`WHERE` 中可以直接使用 `SELECT` 里定义的列别名' },
        { value: 'E', text: '能写进 `WHERE` 的过滤条件，放到 `HAVING` 里通常性能更差' },
      ],
      answer: ['A', 'B', 'C', 'E'],
      explanation:
        '别名在 SELECT 阶段才产生，而 WHERE 早于 SELECT，所以 WHERE 不能用 SELECT 别名（D 错）。其余正确：HAVING 对聚合结果过滤，且性能上不如提前在 WHERE 减少行数。',
      tags: ['WHERE', 'HAVING'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e15',
      type: 'fill',
      difficulty: 2,
      question: '补全 SQL，按城市统计客户数并只保留人数 ≥ 2 的城市（`GROUP BY` 之后的过滤）：',
      prefix: 'SELECT city, COUNT(*) AS cnt FROM customers GROUP BY city ',
      suffix: ' COUNT(*) >= 2;',
      blanks: [['HAVING', '/^having$/i']],
      explanation: '对分组结果的过滤只能用 `HAVING`；写成 `WHERE COUNT(*) >= 2` 会报 "misuse of aggregate"。',
      tags: ['HAVING'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e16',
      type: 'sql',
      difficulty: 2,
      question: '按品类汇总商品成本合计，列名 `category`、`total_cost`。**期望列**：`category`、`total_cost`。',
      starterSql: 'SELECT category, SUM(cost) AS total_cost FROM products GROUP BY category',
      referenceSql: 'SELECT category, SUM(cost) AS total_cost FROM products GROUP BY category',
      explanation: '数码 1570、服装 345、家居 118、食品 180，合计 2213。`SUM` 会跳过 NULL，但本表 cost 全部有值。',
      tags: ['SUM', 'GROUP BY'],
      relatedLessonId: 'sql-l-3-1',
    },
    {
      id: 'sql-3-e17',
      type: 'sql',
      difficulty: 3,
      question: '统计每月（1~12 月）的订单数，月份用 `SUBSTR(order_date, 6, 2)` 提取（如 `01`），列名 `month`、`order_cnt`，按月份升序。**期望列**：`month`、`order_cnt`。',
      starterSql: 'SELECT SUBSTR(order_date, 6, 2) AS month, COUNT(*) AS order_cnt\nFROM orders\nGROUP BY month\nORDER BY month',
      referenceSql:
        'SELECT SUBSTR(order_date, 6, 2) AS month, COUNT(*) AS order_cnt FROM orders GROUP BY month ORDER BY month',
      explanation:
        '每月大约 3~4 单（1~9 月各 4 单，10~12 月各 3 单）。SQLite 也可用 `strftime(\'%m\', order_date)`；MySQL 用 `MONTH(order_date)`，PostgreSQL 用 `EXTRACT(MONTH FROM order_date)`。',
      tags: ['GROUP BY', '日期'],
      relatedLessonId: 'sql-l-3-3',
    },
    {
      id: 'sql-3-e18',
      type: 'sql',
      difficulty: 3,
      question:
        '统计 `orders` 表中"已完成"的订单数（`done_cnt`）与"已取消"的订单数（`canceled_cnt`），不要用 WHERE 过滤，一行输出即可。**期望列**：`done_cnt`、`canceled_cnt`。',
      starterSql: "SELECT SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) AS done_cnt,\n       SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) AS canceled_cnt\nFROM orders",
      referenceSql:
        "SELECT SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) AS done_cnt, SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) AS canceled_cnt FROM orders",
      explanation: '41 + 4 = 45。条件聚合一次扫描产出多个指标，比两个查询 UNION 更高效，也更容易扩展。',
      tags: ['条件聚合', 'CASE WHEN'],
      relatedLessonId: 'sql-l-3-3',
    },
    {
      id: 'sql-3-e19',
      type: 'sql',
      difficulty: 4,
      question:
        '统计每个大区覆盖的**不同城市数**，列名 `region`、`city_cnt`。**期望列**：`region`、`city_cnt`。',
      starterSql: 'SELECT region, COUNT(DISTINCT city) AS city_cnt FROM customers GROUP BY region',
      referenceSql: 'SELECT region, COUNT(DISTINCT city) AS city_cnt FROM customers GROUP BY region',
      explanation:
        '华东 3（上海/杭州/南京）、华北 2（北京/天津）、华南 2（广州/深圳）、西南 2（成都/重庆）、华中 1、西北 1。`COUNT(DISTINCT ...)` 可以与 GROUP BY 组合使用。',
      tags: ['COUNT DISTINCT', 'GROUP BY'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e20',
      type: 'sql',
      difficulty: 4,
      question:
        '计算**有效 GMV**（仅"已完成"订单）与全部 GMV，两个指标放在同一行：列名 `gmv_valid`、`gmv_all`，保留 2 位小数。**期望列**：`gmv_valid`、`gmv_all`。',
      starterSql: "SELECT ROUND(SUM(CASE WHEN o.status = '已完成' THEN i.quantity * i.unit_price * (1 - i.discount) ELSE 0 END), 2) AS gmv_valid,\n       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv_all\nFROM order_items AS i\nJOIN orders AS o ON o.order_id = i.order_id",
      referenceSql:
        "SELECT ROUND(SUM(CASE WHEN o.status = '已完成' THEN i.quantity * i.unit_price * (1 - i.discount) ELSE 0 END), 2) AS gmv_valid, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv_all FROM order_items AS i JOIN orders AS o ON o.order_id = i.order_id",
      explanation:
        '有效 GMV 24150.5，全部 GMV 25505.5，差 1355 即 4 笔取消订单。用 CASE 在聚合内部做条件，避免写两个查询。',
      tags: ['条件聚合', 'JOIN', '业务口径'],
      relatedLessonId: 'sql-l-3-3',
    },
    {
      id: 'sql-3-e21',
      type: 'judge',
      difficulty: 2,
      question: '`SELECT region, COUNT(*) FROM customers WHERE COUNT(*) > 1 GROUP BY region;` 可以执行并返回客户数大于 1 的大区。',
      answer: false,
      explanation:
        'WHERE 在分组之前执行，此时还不存在"组"，因此 WHERE 中不能使用聚合函数，会报 `misuse of aggregate function COUNT()`。正确写法是把条件放进 `HAVING`。',
      tags: ['WHERE', 'HAVING'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e22',
      type: 'single',
      difficulty: 3,
      question:
        '订单明细里 `discount` 有 59 行，其中一部分为 0。执行 `SELECT AVG(discount) FROM order_items;` 得到的结果最可能是？',
      options: [
        { value: 'A', text: '只统计 discount > 0 的行的平均折扣' },
        { value: 'B', text: '把 discount = 0 的行也算进分母，平均值被拉低' },
        { value: 'C', text: '报错，因为 AVG 不能用于 REAL 列' },
        { value: 'D', text: '返回 NULL，因为存在 0 值' },
      ],
      answer: 'B',
      explanation:
        '`AVG` 只跳过 NULL，不跳过 0。要算"有折扣行的平均折扣"必须用 `AVG(CASE WHEN discount > 0 THEN discount END)`。',
      tags: ['AVG', '分母陷阱'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e23',
      type: 'sql',
      difficulty: 3,
      question:
        '按品类与商品统计明细销售件数：返回 `category`、`product_name`、`units`（quantity 之和），并按件数降序取前 5 行。**期望列**：`category`、`product_name`、`units`。',
      starterSql: 'SELECT p.category, p.product_name, SUM(i.quantity) AS units\nFROM order_items AS i\nJOIN products AS p ON p.product_id = i.product_id\nGROUP BY p.category, p.product_name\nORDER BY units DESC\nLIMIT ',
      referenceSql:
        'SELECT p.category, p.product_name, SUM(i.quantity) AS units FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id GROUP BY p.category, p.product_name ORDER BY units DESC LIMIT 5',
      explanation:
        '多列分组：每个 (category, product_name) 组合一组。按件数排序：纯棉T恤 17 件、收纳箱 14 件、咖啡豆 11 件、牛仔裤 9 件、无线蓝牙耳机 9 件。',
      tags: ['GROUP BY', '多列分组', 'JOIN'],
      relatedLessonId: 'sql-l-3-2',
    },
    {
      id: 'sql-3-e24',
      type: 'multiple',
      difficulty: 3,
      question: '在 `SELECT region, COUNT(*) AS cnt FROM customers GROUP BY region` 中，下列哪些写法是**错误或不可移植**的？（多选）',
      options: [
        { value: 'A', text: '在 `WHERE` 中引用别名 `cnt`' },
        { value: 'B', text: '在 `ORDER BY` 中引用别名 `cnt`' },
        { value: 'C', text: '在 SELECT 中再加一列 `name`（未聚合、未分组）' },
        { value: 'D', text: '在 SELECT 中加 `MAX(signup_date)`' },
        { value: 'E', text: '在 `HAVING` 中引用别名 `cnt`，同时要求跨数据库兼容' },
      ],
      answer: ['A', 'C', 'E'],
      explanation:
        'A：WHERE 早于 SELECT，别名不存在。C：裸列在 PostgreSQL 报错。E：PostgreSQL 实际上允许 HAVING 引用别名，但更稳妥的是直接写 `HAVING COUNT(*) > n`。B 合法；D 是合法的聚合值。',
      tags: ['GROUP BY', '别名', '可移植性'],
      relatedLessonId: 'sql-l-3-2',
    },
  ],
};

export { ch3 };
export default ch3;
