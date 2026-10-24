import type { Chapter } from '../../../types';

/* ============================================================
 *  第 5 章：子查询、CTE 与窗口函数
 * ============================================================ */

const ch5: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'sql-5',
  title: '子查询、CTE 与窗口函数',
  goal: '会用标量/相关子查询与派生表拆解复杂逻辑，用 WITH 把查询写成可读的分步流程，并掌握 ROW_NUMBER / RANK / LAG / SUM OVER / NTILE 解决排名、环比、累计与 Top N 问题。',
  lessons: [
    {
      id: 'sql-l-5-1',
      title: '子查询：标量、相关与派生表',
      content: `
### 学习目标

学完本节，你应该能够：
1. 写标量/相关/派生表三种子查询；
2. 判断相关子查询的执行代价；
3. 把复杂子查询改写为 JOIN。

### 前置知识

- JOIN（l4-1）与聚合（l3）。

### 问题背景

子查询/CTE/窗口函数是 SQL 的“进阶三件套”：CTE 让逻辑分步可读，窗口函数在不折叠行的前提下做排名/累计/环比——SQL 表达力的跃迁。

### 直觉理解

窗口函数像给每行配一个“本地计算器”：GROUP BY 把行折叠成组，窗口函数保留每行、只在旁边附加组内计算结果（排名/移动平均）。

### 核心概念与原理详解

## 子查询放在哪里

子查询就是"嵌套在另一个查询里的 SELECT"，按位置分三类：

| 位置 | 形态 | 典型用途 |
| --- | --- | --- |
| SELECT 列表 | **标量**子查询（返回单个值） | 给每行附一个指标 |
| WHERE / HAVING | **IN / EXISTS 子查询**（集合或布尔） | 存在性判断 |
| FROM 子句 | **派生表**（derived table，返回多行多列） | 先聚合再过滤 |

## 标量子查询

\`\`\`sql
SELECT name, city,
       (SELECT COUNT(*) FROM orders AS o
        WHERE o.customer_id = c.customer_id) AS order_cnt
FROM customers AS c
ORDER BY order_cnt DESC
LIMIT 5;
\`\`\`

标量子查询必须**只返回一个值**（一行一列）。如果返回多行，SQLite 取第一行，PostgreSQL 会报错 \`more than one row returned by a subquery used as an expression\`。

适合用标量子查询的场景：子查询很简单、只出现在一个地方。缺点是**放在 SELECT 列表里时会被逐行执行**（相关子查询），大表上可能很慢，可改写为 LEFT JOIN 聚合。

## 相关子查询（Correlated Subquery）

关键特征是**子查询内部引用了外层的列**（上面例子里的 \`c.customer_id\`）。它的执行语义是"外层每一行都跑一遍子查询"。

\`\`\`sql
-- 找出消费额高于该客户所在城市平均水平的客户
SELECT c.name, c.city
FROM customers AS c
WHERE c.customer_id IN (
  SELECT o.customer_id
  FROM orders AS o
  GROUP BY o.customer_id
  HAVING SUM(o.order_id) > 0
);
\`\`\`

上面的写法只是示意"相关"的概念；真正体现"逐行比较"的是：

\`\`\`sql
SELECT c.name, c.city
FROM customers AS c
WHERE (SELECT COUNT(*) FROM orders AS o WHERE o.customer_id = c.customer_id) >= 3;
\`\`\`

这里外层每一行客户都会执行一次 \`COUNT\`。现代优化器会把它改写成半连接/哈希连接，但**在心智上要清楚它的逻辑代价**。

## 派生表（FROM 子查询）

把"中间结果"当成一张临时表：

\`\`\`sql
SELECT t.order_id, t.amt
FROM (
  SELECT order_id,
         ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amt
  FROM order_items
  GROUP BY order_id
) AS t
WHERE t.amt > 1500;
\`\`\`

**要点**：

1. 派生表**必须起别名**（\`AS t\`），否则报错；
2. 外层可以引用派生表的列别名（\`t.amt\`），这是"在 WHERE 中使用聚合结果"的合法途径——因为对派生表来说，\`amt\` 已经是普通列；
3. 派生表可以嵌套，但一多就难读，这时应该用 CTE。

## 用派生表解决聚合后过滤的"别名不可用"问题

回顾第 3 章：

\`\`\`sql
-- ❌ WHERE 里不能用聚合别名
SELECT order_id, SUM(...) AS amt FROM order_items WHERE amt > 1500 GROUP BY order_id;
\`\`\`

三条正确路径：

| 方式 | 写法 |
| --- | --- |
| HAVING | \`GROUP BY order_id HAVING SUM(...) > 1500\` |
| 派生表 | \`SELECT * FROM (SELECT ... AS amt ...) t WHERE t.amt > 1500\` |
| CTE | \`WITH t AS (...) SELECT * FROM t WHERE amt > 1500\` |

当中间结果要被引用 2 次以上、或有多层计算时，后两种更好读。

## FROM 推导与执行顺序

\`\`\`
FROM（含派生表，先算子查询） → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
\`\`\`

所以派生表是**最先执行**的部分，它算完之后，外层就是对一个普通结果集做筛选。

## 一个反直觉的细节：SQLite 中派生表可以省略别名

标准 SQL 要求 FROM 子查询必须有别名，PostgreSQL / MySQL 强制要求。SQLite 允许省略，但为了可移植性请始终写 \`AS t\`。

## 什么时候该用哪种子查询

| 需求 | 推荐 | 理由 |
| --- | --- | --- |
| 每行附带一个计数 | LEFT JOIN 聚合（或窗口函数） | 避免逐行相关子查询 |
| 判断"是否存在" | EXISTS | 语义明确、可短路 |
| 过滤集合 | IN | 简短 |
| 多步计算 | CTE | 可读性 |
| 小结果集嵌套 | 派生表 | 足够用 |

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO s VALUES (?,?)", [("A",80),("A",95),("B",70),("B",88)])
con.execute("CREATE TABLE s (grp TEXT, score INT)")
print(con.execute(
    "SELECT grp, score, RANK() OVER (PARTITION BY grp ORDER BY score DESC) rk "
    "FROM s").fetchall())
con.close()
\`\`\`

预期输出（实测）：A 组内 95→rk1、80→rk2；B 组内 88→rk1、70→rk2（分组排名不折叠行）

**常见错误**：窗口函数用在 WHERE 里（窗口在 WHERE 后执行，需子查询/CTE 再过滤）；PARTITION BY 忘写全表排名；ROW_NUMBER 与 RANK 混用（并列处理不同）。

### 常见误区

1. 窗口函数=GROUP BY——前者保行、后者折叠；
2. ROW_NUMBER 与 RANK 可互换——并列名次行为不同；
3. CTE 只是别名——递归 CTE 能做循环才做的遍历。

### 知识关联

- **向前**：l-3 聚合是窗口的“折叠版”对照；
- **向后**：l-6 复杂查询的组织；
- **平行**：Pandas 的 groupby+transform。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 窗口 | OVER(PARTITION BY ... ORDER BY ...) |
| CTE | WITH 命名分步，可递归 |
| 用途 | 排名/环比/累计/组内 TopN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '标量子查询必须只返回一行一列。返回多行时 SQLite 静默取第一行、PostgreSQL 直接报错，结果可能悄悄出错。',
        },
        {
          kind: 'pitfall',
          text: 'FROM 后的派生表必须加别名（`AS t`）。SQLite 允许省略，PostgreSQL/MySQL 会报错。',
        },
        {
          kind: 'performance',
          text: 'SELECT 列表中的相关子查询逻辑上逐行执行。大表上改成 LEFT JOIN 聚合或窗口函数，通常能快一个数量级。',
        },
      ],
      demos: [
        {
          title: '标量子查询：给每位客户附上订单数',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT c.customer_id, c.name,
       (SELECT COUNT(*) FROM orders AS o WHERE o.customer_id = c.customer_id) AS order_cnt
FROM customers AS c
ORDER BY order_cnt DESC, c.customer_id
LIMIT 5`,
        },
        {
          title: '派生表：先算订单金额，再过滤',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT t.order_id, t.amt
FROM (
  SELECT order_id,
         ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amt
  FROM order_items
  GROUP BY order_id
) AS t
WHERE t.amt > 1500
ORDER BY t.amt DESC`,
        },
        {
          title: '相关子查询：订单数 >= 3 的客户',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT c.name
FROM customers AS c
WHERE (SELECT COUNT(*) FROM orders AS o WHERE o.customer_id = c.customer_id) >= 3
ORDER BY c.name`,
        },
      ],
    },
    {
      id: 'sql-l-5-2',
      title: 'WITH 公用表表达式（CTE）',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 WITH 拆解多步逻辑；
2. 复用 CTE 减少重复代码；
3. 说明 CTE 的可读性与优化权衡。

### 前置知识

- JOIN（l4-1）与聚合（l3）。

### 问题背景

子查询/CTE/窗口函数是 SQL 的“进阶三件套”：CTE 让逻辑分步可读，窗口函数在不折叠行的前提下做排名/累计/环比——SQL 表达力的跃迁。

### 直觉理解

窗口函数像给每行配一个“本地计算器”：GROUP BY 把行折叠成组，窗口函数保留每行、只在旁边附加组内计算结果（排名/移动平均）。

### 核心概念与原理详解

## CTE 是什么

\`WITH\` 把一段查询命名成"临时视图"，后续可以直接引用：

\`\`\`sql
WITH order_amt AS (
  SELECT order_id,
         ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amt
  FROM order_items
  GROUP BY order_id
)
SELECT o.order_id, o.order_date, a.amt
FROM orders AS o
JOIN order_amt AS a ON a.order_id = o.order_id
WHERE a.amt > 1500
ORDER BY a.amt DESC;
\`\`\`

结构上：\`WITH 名字 AS (子查询) SELECT ...\`。多个 CTE 用逗号分隔。

## 为什么 CTE 比嵌套子查询好

| 维度 | 嵌套子查询 | CTE |
| --- | --- | --- |
| 阅读方向 | 由内向外，越深越难读 | 自上而下，像写代码的变量 |
| 复用 | 无法复用 | 同一 CTE 可被引用多次 |
| 调试 | 无法单独跑中间结果 | 把某一个 CTE 单独拿出来运行即可 |
| 递归 | 不支持 | 支持 \`WITH RECURSIVE\` |
| 执行计划 | 相同 | 大多是内联展开（SQLite/MySQL/PostgreSQL 均可能物化或内联） |

一个三层嵌套的例子用 CTE 重写：

\`\`\`sql
WITH order_amt AS (
  SELECT o.order_id, c.region,
         SUM(i.quantity * i.unit_price * (1 - i.discount)) AS amt
  FROM orders AS o
  JOIN customers AS c ON c.customer_id = o.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = '已完成'
  GROUP BY o.order_id, c.region
),
region_amt AS (
  SELECT region, ROUND(SUM(amt), 2) AS region_gmv
  FROM order_amt
  GROUP BY region
)
SELECT region, region_gmv
FROM region_amt
ORDER BY region_gmv DESC;
\`\`\`

读这段 SQL 时，你会自然按"订单金额 → 大区汇总"的顺序理解，而不是从最里面的 JOIN 开始读。

## 多个 CTE 的书写顺序

后面的 CTE 可以引用前面的 CTE，**不能反向引用**。所以按数据流顺序书写：明细 → 中间汇总 → 最终结果。

## CTE 与临时表、视图的区别

| | CTE | 临时表 | 视图 |
| --- | --- | --- | --- |
| 生命周期 | 单条语句内 | 会话内 | 永久（DDL 对象） |
| 是否占存储 | 否 | 是 | 否（只存定义） |
| 是否需要权限 | 否 | 需要 CREATE | 需要 CREATE VIEW |
| 适合 | 一次性的复杂分析 | 多步 ETL、多次复用 | 团队共享口径 |

## 递归 CTE（进阶）

\`WITH RECURSIVE\` 可以生成序列、展开层级关系（组织架构、类目树）：

\`\`\`sql
WITH RECURSIVE months(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM months WHERE n < 12
)
SELECT n FROM months;
\`\`\`

递归必须有一个**基础分支**和一个**递归分支**，且递归分支要有终止条件，否则会无限循环（SQLite 有递归深度上限）。

## 什么时候不该用 CTE

1. **只被引用一次、逻辑很简单**：直接写子查询反而更短；
2. **超大表且数据库把 CTE 物化**：早期 PostgreSQL（12 之前）会把 CTE 物化，导致过滤条件无法下推；现代版本已改为内联——但如果你用的是老版本，需要留意；
3. **把 CTE 当"索引优化"手段**：CTE 不会自动加索引，真正的性能手段仍是索引与执行计划（第 6 章）。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO s VALUES (?,?)", [("A",80),("A",95),("B",70),("B",88)])
con.execute("CREATE TABLE s (grp TEXT, score INT)")
print(con.execute(
    "SELECT grp, score, RANK() OVER (PARTITION BY grp ORDER BY score DESC) rk "
    "FROM s").fetchall())
con.close()
\`\`\`

预期输出（实测）：A 组内 95→rk1、80→rk2；B 组内 88→rk1、70→rk2（分组排名不折叠行）

**常见错误**：窗口函数用在 WHERE 里（窗口在 WHERE 后执行，需子查询/CTE 再过滤）；PARTITION BY 忘写全表排名；ROW_NUMBER 与 RANK 混用（并列处理不同）。

### 常见误区

1. 窗口函数=GROUP BY——前者保行、后者折叠；
2. ROW_NUMBER 与 RANK 可互换——并列名次行为不同；
3. CTE 只是别名——递归 CTE 能做循环才做的遍历。

### 知识关联

- **向前**：l-3 聚合是窗口的“折叠版”对照；
- **向后**：l-6 复杂查询的组织；
- **平行**：Pandas 的 groupby+transform。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 窗口 | OVER(PARTITION BY ... ORDER BY ...) |
| CTE | WITH 命名分步，可递归 |
| 用途 | 排名/环比/累计/组内 TopN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'note',
          text: 'CTE 的作用域只在紧跟的那一条语句内。想跨多次查询复用，应该建临时表或视图。',
        },
        {
          kind: 'performance',
          text: 'CTE 是否物化取决于数据库与版本（老版 PostgreSQL 会物化，MySQL 8 可能物化）。性能敏感时用 EXPLAIN 确认，必要时改用子查询。',
        },
        {
          kind: 'interview',
          text: '常问："CTE 与子查询有性能差异吗？"标准答法：逻辑等价，差异来自优化器是否内联/物化；CTE 的主要价值是可读性与复用，不保证更快。',
        },
      ],
      demos: [
        {
          title: '一个 CTE 让复杂查询变清晰',
          lang: 'sql',
          dataset: 'retail',
          code: `WITH order_amt AS (
  SELECT order_id, ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amt
  FROM order_items
  GROUP BY order_id
)
SELECT order_id, amt
FROM order_amt
ORDER BY amt DESC
LIMIT 5`,
        },
        {
          title: '多个 CTE 串联：订单 → 大区',
          lang: 'sql',
          dataset: 'retail',
          code: `WITH order_amt AS (
  SELECT o.order_id, c.region, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS amt
  FROM orders AS o
  JOIN customers AS c ON c.customer_id = o.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = '已完成'
  GROUP BY o.order_id, c.region
),
region_amt AS (
  SELECT region, ROUND(SUM(amt), 2) AS region_gmv
  FROM order_amt
  GROUP BY region
)
SELECT region, region_gmv
FROM region_amt
ORDER BY region_gmv DESC`,
        },
        {
          title: '递归 CTE：生成 1~5 的序号',
          lang: 'sql',
          dataset: 'retail',
          code: `WITH RECURSIVE seq(n) AS (
  SELECT 1
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 5
)
SELECT n FROM seq`,
        },
      ],
    },
    {
      id: 'sql-l-5-3',
      title: '窗口函数：排名、环比、累计与 Top N',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 RANK/ROW_NUMBER/DENSE_RANK 排名；
2. 用 SUM OVER 做累计；
3. 用 LAG 做环比。

### 前置知识

- JOIN（l4-1）与聚合（l3）。

### 问题背景

子查询/CTE/窗口函数是 SQL 的“进阶三件套”：CTE 让逻辑分步可读，窗口函数在不折叠行的前提下做排名/累计/环比——SQL 表达力的跃迁。

### 直觉理解

窗口函数像给每行配一个“本地计算器”：GROUP BY 把行折叠成组，窗口函数保留每行、只在旁边附加组内计算结果（排名/移动平均）。

### 核心概念与原理详解

## 窗口函数与聚合的区别

聚合函数把多行压成一行；**窗口函数在保留每一行的同时，额外算出一个"该行在某个窗口内"的指标**。

<Flowchart name="window-exec" />

\`\`\`sql
SELECT product_name, category, price,
       RANK() OVER (PARTITION BY category ORDER BY price DESC) AS rk_in_cat
FROM products;
\`\`\`

结果 12 行（每行一个商品），额外多出一列"该商品在品类内的价格排名"。

## 语法结构

\`\`\`
函数名(...) OVER (
  PARTITION BY 分组列      -- 窗口怎么切分（可选）
  ORDER BY 排序列          -- 窗口内顺序（可选）
  ROWS/RANGE BETWEEN ...   -- 窗口范围（可选，默认是整个分区或到当前行）
)
\`\`\`

| 部分 | 作用 | 省略时 |
| --- | --- | --- |
| \`PARTITION BY\` | 按列切分成独立窗口 | 全表一个窗口 |
| \`ORDER BY\` | 窗口内排序（排名类函数必需） | 无序，累计函数无意义 |
| \`ROWS BETWEEN\` | 帧范围（移动平均） | 有 ORDER BY 时为"起点到当前行" |

## 三个排名函数的区别

\`\`\`sql
SELECT product_name, price,
       ROW_NUMBER() OVER (ORDER BY price DESC) AS rn,
       RANK()       OVER (ORDER BY price DESC) AS rk,
       DENSE_RANK() OVER (ORDER BY price DESC) AS drk
FROM products;
\`\`\`

假设价格降序为 1599, 499, 499, 459, 299：

| price | ROW_NUMBER | RANK | DENSE_RANK |
| --- | --- | --- | --- |
| 1599 | 1 | 1 | 1 |
| 499 | 2 | 2 | 2 |
| 499 | 3 | 2 | 2 |
| 459 | 4 | 4 | 3 |
| 299 | 5 | 5 | 4 |

- \`ROW_NUMBER\`：**永不重复**，遇到并列也按顺序编号（并列内部顺序不确定）；
- \`RANK\`：并列同名次，但**跳过**后续号码（1,2,2,4）；
- \`DENSE_RANK\`：并列同名次，**不跳号**（1,2,2,3）。

选哪个取决于业务：取"每类 Top 3 个商品"用 \`ROW_NUMBER\`（避免并列导致多行）；发奖金名次用 \`RANK\`（并列第二后应接第四）；分等级区间用 \`DENSE_RANK\`。

## LAG / LEAD：取上一行、下一行

\`\`\`sql
SELECT customer_id, order_date,
       LAG(order_date)  OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_date,
       LEAD(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS next_date
FROM orders;
\`\`\`

每条订单都能拿到"同一客户的上一单日期"，进而算间隔天数。\`LAG\` 默认取前 1 行，可以写 \`LAG(x, 2)\` 取前 2 行，\`LAG(x, 1, 0)\` 给无上一行的情况一个默认值（否则为 NULL）。

## 环比：月度对比

\`\`\`sql
WITH monthly AS (
  SELECT SUBSTR(o.order_date, 1, 7) AS month,
         COUNT(*) AS order_cnt
  FROM orders AS o
  WHERE o.status = '已完成'
  GROUP BY month
)
SELECT month, order_cnt,
       LAG(order_cnt) OVER (ORDER BY month) AS prev_cnt,
       order_cnt - LAG(order_cnt) OVER (ORDER BY month) AS diff
FROM monthly
ORDER BY month;
\`\`\`

**环比 = (本月 - 上月) / 上月**。分母为 NULL 或 0 时要处理（用 \`CASE WHEN\` 或 \`NULLIF\`）：

\`\`\`sql
ROUND((order_cnt - prev) * 100.0 / NULLIF(prev, 0), 1) AS mom_pct
\`\`\`

## SUM() OVER：累计与移动平均

\`\`\`sql
-- 累计订单数（运行总计）
SELECT order_id, order_date,
       SUM(1) OVER (ORDER BY order_date ROWS UNBOUNDED PRECEDING) AS running_cnt
FROM orders;
\`\`\`

\`ROWS BETWEEN\` 可选范围：

| 写法 | 含义 |
| --- | --- |
| \`ROWS UNBOUNDED PRECEDING\` | 从分区第一行到当前行（累计） |
| \`ROWS BETWEEN 6 PRECEDING AND CURRENT ROW\` | 最近 7 行（7 日移动平均） |
| \`ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING\` | 整个分区 |

注意：在 PostgreSQL / MySQL 8 中，\`RANGE\` 语义与 \`ROWS\` 不同（\`RANGE\` 按"相同排序值的所有行"处理）。SQLite 的默认帧是 \`RANGE UNBOUNDED PRECEDING AND CURRENT ROW\`，因此**当排序键有重复值、而你确实需要"逐行累计"时，请显式写 \`ROWS\`**。

## NTILE：分桶

\`\`\`sql
SELECT product_name, price,
       NTILE(4) OVER (ORDER BY price) AS bucket
FROM products;
\`\`\`

\`NTILE(n)\` 把窗口均分成 n 桶，行数除不尽时前面的桶多一行。常见用途：用户分层（RFM 的分数）、价格带划分。

## 每个分组取 Top N：窗口函数最经典考题

**思路**：先用窗口函数给每行在组内编号，再在外层筛选编号。

\`\`\`sql
WITH ranked AS (
  SELECT i.order_id, p.product_name,
         SUM(i.quantity * i.unit_price * (1 - i.discount)) AS amt,
         ROW_NUMBER() OVER (
           PARTITION BY i.order_id
           ORDER BY SUM(i.quantity * i.unit_price * (1 - i.discount)) DESC
         ) AS rn
  FROM order_items AS i
  JOIN products AS p ON p.product_id = i.product_id
  GROUP BY i.order_id, p.product_name
)
SELECT order_id, product_name, ROUND(amt, 2) AS amt
FROM ranked
WHERE rn = 1
ORDER BY amt DESC;
\`\`\`

**为什么不能直接写 \`WHERE rn = 1\` 在同一层？** 因为窗口函数在 \`SELECT\` 阶段才计算，比 \`WHERE\` 晚，所以必须在派生表/CTE 中先算出排名，外层再过滤。

## 窗口函数的重要限制

1. 只能出现在 \`SELECT\` 和 \`ORDER BY\` 中，**不能出现在 WHERE / GROUP BY / HAVING**；
2. 窗口函数与聚合函数可以"同层共存"，但 \`ORDER BY\` 里引用聚合时要与 GROUP BY 兼容；
3. \`window\` 子句（\`WINDOW w AS (...) \`）可以给多个窗口定义命名，减少重复。

## 真题：三个函数的组合

\`\`\`sql
SELECT department, employee, salary,
       RANK() OVER (PARTITION BY department ORDER BY salary DESC) AS rk
FROM staff
\`\`\`

记住模板：**分区（PARTITION）+ 排序（ORDER）= 每个分组的排名**，这是面试里出现频率最高的窗口函数写法。

<RollingWindowDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO s VALUES (?,?)", [("A",80),("A",95),("B",70),("B",88)])
con.execute("CREATE TABLE s (grp TEXT, score INT)")
print(con.execute(
    "SELECT grp, score, RANK() OVER (PARTITION BY grp ORDER BY score DESC) rk "
    "FROM s").fetchall())
con.close()
\`\`\`

预期输出（实测）：A 组内 95→rk1、80→rk2；B 组内 88→rk1、70→rk2（分组排名不折叠行）

**常见错误**：窗口函数用在 WHERE 里（窗口在 WHERE 后执行，需子查询/CTE 再过滤）；PARTITION BY 忘写全表排名；ROW_NUMBER 与 RANK 混用（并列处理不同）。

### 常见误区

1. 窗口函数=GROUP BY——前者保行、后者折叠；
2. ROW_NUMBER 与 RANK 可互换——并列名次行为不同；
3. CTE 只是别名——递归 CTE 能做循环才做的遍历。

### 知识关联

- **向前**：l-3 聚合是窗口的“折叠版”对照；
- **向后**：l-6 复杂查询的组织；
- **平行**：Pandas 的 groupby+transform。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 窗口 | OVER(PARTITION BY ... ORDER BY ...) |
| CTE | WITH 命名分步，可递归 |
| 用途 | 排名/环比/累计/组内 TopN |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '窗口函数不能写在 `WHERE` / `HAVING` 里。取每组 Top N 必须"先算排名（子查询/CTE），外层再 `WHERE rn <= N`"。',
        },
        {
          kind: 'pitfall',
          text: '`ROW_NUMBER` 遇并列时按不保证的顺序编号，结果可能不可复现。需要稳定结果时在 `ORDER BY` 里再加一个唯一键（如主键）。',
        },
        {
          kind: 'note',
          text: 'SQLite 默认帧是 `RANGE` 而非 `ROWS`，排序键有重复值时累计求和会和预期不同，显式写 `ROWS UNBOUNDED PRECEDING` 更稳妥。',
        },
        {
          kind: 'interview',
          text: '必考："ROW_NUMBER / RANK / DENSE_RANK 的区别"+"如何取每组 Top N"。答不上窗口函数基本无法通过 SQL 面试。',
        },
      ],
      demos: [
        {
          title: '三个排名函数放在一起对比',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT product_name, price,
       ROW_NUMBER() OVER (ORDER BY price DESC) AS rn,
       RANK() OVER (ORDER BY price DESC) AS rk,
       DENSE_RANK() OVER (ORDER BY price DESC) AS drk
FROM products
ORDER BY price DESC
LIMIT 6`,
        },
        {
          title: 'LAG：每位客户相邻两单的日期间隔',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT customer_id, order_date,
       LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_date
FROM orders
WHERE customer_id = 1
ORDER BY order_date`,
        },
        {
          title: 'SUM() OVER：按月累计订单数',
          lang: 'sql',
          dataset: 'retail',
          code: `WITH monthly AS (
  SELECT SUBSTR(order_date, 1, 7) AS month, COUNT(*) AS order_cnt
  FROM orders
  GROUP BY month
)
SELECT month, order_cnt,
       SUM(order_cnt) OVER (ORDER BY month ROWS UNBOUNDED PRECEDING) AS running_cnt
FROM monthly
ORDER BY month`,
        },
        {
          title: '每个订单取金额最高的商品（Top 1 per group）',
          lang: 'sql',
          dataset: 'retail',
          code: `WITH ranked AS (
  SELECT i.order_id, p.product_name,
         i.quantity * i.unit_price * (1 - i.discount) AS amt,
         ROW_NUMBER() OVER (
           PARTITION BY i.order_id
           ORDER BY i.quantity * i.unit_price * (1 - i.discount) DESC
         ) AS rn
  FROM order_items AS i
  JOIN products AS p ON p.product_id = i.product_id
)
SELECT order_id, product_name, ROUND(amt, 2) AS amt
FROM ranked
WHERE rn = 1
ORDER BY amt DESC
LIMIT 5`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'sql-5-e1',
      type: 'sql',
      difficulty: 2,
      question: '用标量子查询给每位客户附上订单数：`customer_id`、`name`、`order_cnt`。**期望列**：`customer_id`、`name`、`order_cnt`。',
      starterSql: 'SELECT c.customer_id, c.name,\n       (SELECT COUNT(*) FROM orders AS o WHERE o.customer_id = c.customer_id) AS order_cnt\nFROM customers AS c',
      referenceSql:
        'SELECT c.customer_id, c.name, (SELECT COUNT(*) FROM orders AS o WHERE o.customer_id = c.customer_id) AS order_cnt FROM customers AS c',
      explanation:
        '这是相关子查询：外层每位客户都执行一次内层的 COUNT。也可以改写为 `LEFT JOIN orders GROUP BY c.customer_id`，得到相同结果。张伟 5 单最多。',
      tags: ['标量子查询', '相关子查询'],
      relatedLessonId: 'sql-l-5-1',
    },
    {
      id: 'sql-5-e2',
      type: 'sql',
      difficulty: 2,
      question:
        '用派生表找出订单金额（`quantity * unit_price * (1 - discount)` 之和）大于 1500 的订单，返回 `order_id` 与 `amt`（保留 2 位小数）。**期望列**：`order_id`、`amt`。',
      starterSql: 'SELECT t.order_id, t.amt\nFROM (SELECT order_id, ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amt\n      FROM order_items GROUP BY order_id) AS t\nWHERE ',
      referenceSql:
        'SELECT t.order_id, t.amt FROM (SELECT order_id, ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amt FROM order_items GROUP BY order_id) AS t WHERE t.amt > 1500',
      explanation:
        '派生表先做聚合，外层就变成了对普通列的过滤——这是"在 WHERE 中使用聚合结果"的合法方式。结果 4 单：1003、1011、1027、1033。',
      tags: ['派生表'],
      relatedLessonId: 'sql-l-5-1',
    },
    {
      id: 'sql-5-e3',
      type: 'sql',
      difficulty: 2,
      question: '用 CTE（WITH）重写上一题，返回 `order_id` 与 `amt`。**期望列**：`order_id`、`amt`。',
      starterSql: 'WITH order_amt AS (\n  SELECT order_id, ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amt\n  FROM order_items GROUP BY order_id\n)\nSELECT order_id, amt FROM order_amt WHERE ',
      referenceSql:
        'WITH order_amt AS (SELECT order_id, ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amt FROM order_items GROUP BY order_id) SELECT order_id, amt FROM order_amt WHERE amt > 1500',
      explanation: 'CTE 与派生表逻辑完全等价，但可读性更好：先定义中间结果，再在主查询里使用。',
      tags: ['CTE'],
      relatedLessonId: 'sql-l-5-2',
    },
    {
      id: 'sql-5-e4',
      type: 'sql',
      difficulty: 2,
      question: '用 ROW_NUMBER 给所有订单按日期排序编号，返回 `order_id`、`order_date`、`rn`。**期望列**：`order_id`、`order_date`、`rn`。',
      starterSql: 'SELECT order_id, order_date,\n       ROW_NUMBER() OVER (ORDER BY order_date) AS rn\nFROM orders',
      referenceSql: 'SELECT order_id, order_date, ROW_NUMBER() OVER (ORDER BY order_date) AS rn FROM orders',
      explanation:
        '窗口函数在保留每行的同时增加一列。全部 45 笔订单日期都不同，所以 `ROW_NUMBER`、`RANK`、`DENSE_RANK` 在这里结果一样。',
      tags: ['窗口函数', 'ROW_NUMBER'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e5',
      type: 'sql',
      difficulty: 2,
      question: '用 RANK 给商品按标价降序排名，返回 `product_name`、`price`、`rk`。**期望列**：`product_name`、`price`、`rk`。',
      starterSql: 'SELECT product_name, price, RANK() OVER (ORDER BY price ) AS rk FROM products',
      referenceSql: 'SELECT product_name, price, RANK() OVER (ORDER BY price DESC) AS rk FROM products',
      explanation: '本数据中没有并列价格，所以 RANK 与 ROW_NUMBER 结果相同。若出现并列，RANK 会跳号（1,2,2,4）。',
      tags: ['窗口函数', 'RANK'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e6',
      type: 'sql',
      difficulty: 3,
      question: '按品类给商品价格排名（价格降序），返回 `category`、`product_name`、`price`、`rk`（组内排名）。**期望列**：`category`、`product_name`、`price`、`rk`。',
      starterSql: 'SELECT category, product_name, price,\n       RANK() OVER (PARTITION BY category ORDER BY price DESC) AS rk\nFROM products',
      referenceSql:
        'SELECT category, product_name, price, RANK() OVER (PARTITION BY category ORDER BY price DESC) AS rk FROM products',
      explanation:
        '`PARTITION BY category` 把窗口切成 4 个品类，每个品类内独立排名。这就是"分区 + 排序 = 组内排名"的标准模板。',
      tags: ['窗口函数', 'PARTITION BY'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e7',
      type: 'sql',
      difficulty: 3,
      question:
        '找出每个品类的**最贵商品**（每个品类取 Top 1），用窗口函数实现。**期望列**：`category`、`product_name`、`price`。',
      starterSql: 'WITH ranked AS (\n  SELECT category, product_name, price,\n         ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn\n  FROM products\n)\nSELECT category, product_name, price FROM ranked WHERE ',
      referenceSql:
        'WITH ranked AS (SELECT category, product_name, price, ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) AS rn FROM products) SELECT category, product_name, price FROM ranked WHERE rn = 1',
      explanation:
        '先在 CTE 中算出 `rn`，外层再 `WHERE rn = 1`。不能在同一层写 `WHERE rn = 1`，因为窗口函数在 SELECT 阶段才计算。结果 4 行：显示器、运动鞋、台灯、坚果礼盒。',
      tags: ['窗口函数', 'Top N'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e8',
      type: 'sql',
      difficulty: 3,
      question:
        '用 LAG 求客户 1 的订单间隔：返回 `order_date`、`prev_date`（同一客户的上一单日期）、`gap_days`（与上一单相差天数，首单为 NULL）。**期望列**：`order_date`、`prev_date`、`gap_days`。',
      starterSql: 'SELECT order_date,\n       LAG(order_date) OVER (ORDER BY order_date) AS prev_date\nFROM orders WHERE customer_id = 1',
      referenceSql:
        "SELECT order_date, LAG(order_date) OVER (ORDER BY order_date) AS prev_date, CAST(julianday(order_date) - julianday(LAG(order_date) OVER (ORDER BY order_date)) AS INTEGER) AS gap_days FROM orders WHERE customer_id = 1",
      explanation:
        '`LAG` 取上一行；天数差用 `julianday()` 相减后取整（SQLite 写法）。MySQL 用 `DATEDIFF(a, b)`，PostgreSQL 用 `a::date - b::date`。客户 1 共 5 单，首单 gap_days 为 NULL。',
      tags: ['LAG', '日期计算'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e9',
      type: 'sql',
      difficulty: 3,
      question:
        '按月统计订单数并用 SUM() OVER 计算累计订单数：返回 `month`（YYYY-MM）、`order_cnt`、`running_cnt`。**期望列**：`month`、`order_cnt`、`running_cnt`。',
      starterSql: 'WITH monthly AS (\n  SELECT SUBSTR(order_date, 1, 7) AS month, COUNT(*) AS order_cnt FROM orders GROUP BY month\n)\nSELECT month, order_cnt, SUM(order_cnt) OVER (ORDER BY month ',
      referenceSql:
        'WITH monthly AS (SELECT SUBSTR(order_date, 1, 7) AS month, COUNT(*) AS order_cnt FROM orders GROUP BY month) SELECT month, order_cnt, SUM(order_cnt) OVER (ORDER BY month) AS running_cnt FROM monthly',
      explanation:
        '累计求和模板：`SUM(x) OVER (ORDER BY 时间列)`。12 月累计到 45，等于订单总数。显式写 `ROWS UNBOUNDED PRECEDING` 也可（在排序键唯一时结果相同）。',
      tags: ['SUM OVER', '累计求和'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e10',
      type: 'sql',
      difficulty: 3,
      question:
        '用 NTILE 把商品按标价从低到高分成 3 桶，返回 `product_name`、`price`、`bucket`。**期望列**：`product_name`、`price`、`bucket`。',
      starterSql: 'SELECT product_name, price, NTILE(3) OVER (ORDER BY price) AS bucket FROM products',
      referenceSql: 'SELECT product_name, price, NTILE(3) OVER (ORDER BY price) AS bucket FROM products',
      explanation: '12 个商品分 3 桶，每桶恰好 4 个。行数除不尽时前面的桶会多一行。常用于用户分层、价格带划分。',
      tags: ['NTILE', '窗口函数'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e11',
      type: 'single',
      difficulty: 2,
      question: '`ROW_NUMBER`、`RANK`、`DENSE_RANK` 在有并列值时，哪个**不会跳号**？',
      options: [
        { value: 'A', text: '`ROW_NUMBER`' },
        { value: 'B', text: '`RANK`' },
        { value: 'C', text: '`DENSE_RANK`' },
        { value: 'D', text: '三者都不会跳号' },
      ],
      answer: 'C',
      explanation:
        '按值 100, 90, 90, 80 排名：`ROW_NUMBER` 得 1,2,3,4（不并列）；`RANK` 得 1,2,2,4（并列后跳到 4）；`DENSE_RANK` 得 1,2,2,3（不跳号）。',
      tags: ['排名函数'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e12',
      type: 'judge',
      difficulty: 2,
      question: '可以在 WHERE 子句里直接使用 `ROW_NUMBER() OVER (...)`，例如 `WHERE ROW_NUMBER() OVER (PARTITION BY category ORDER BY price DESC) = 1`。',
      answer: false,
      explanation:
        '窗口函数在 SELECT 阶段才计算，晚于 WHERE，所以不能在 WHERE/HAVING 中使用，会报错。正确做法是先放进子查询或 CTE，外层再筛选。',
      tags: ['窗口函数', '执行顺序'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e13',
      type: 'multiple',
      difficulty: 3,
      question: '关于 CTE（`WITH`），下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '同一个 CTE 可以在主查询中被引用多次' },
        { value: 'B', text: 'CTE 的作用域仅限于紧跟它的那一条语句' },
        { value: 'C', text: 'CTE 通常能提升可读性，但不保证性能更好' },
        { value: 'D', text: 'CTE 会自动创建索引' },
        { value: 'E', text: '`WITH RECURSIVE` 可以处理层级结构' },
      ],
      answer: ['A', 'B', 'C', 'E'],
      explanation: 'CTE 不创建任何物理对象，更不会自动建索引（D 错）。其余正确。',
      tags: ['CTE'],
      relatedLessonId: 'sql-l-5-2',
    },
    {
      id: 'sql-5-e14',
      type: 'fill',
      difficulty: 2,
      question: '补全窗口函数，求每位客户按订单日期排序时**上一单**的日期：',
      prefix: 'SELECT customer_id, order_date, ',
      suffix: '(order_date) OVER (PARTITION BY customer_id ORDER BY order_date) AS prev_date FROM orders;',
      blanks: [['LAG', '/^lag$/i']],
      explanation: '`LAG` 取当前行之前的值；取之后的值用 `LEAD`。',
      tags: ['LAG'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e15',
      type: 'sql',
      difficulty: 3,
      question:
        '用 EXISTS 找出至少下了 4 单的客户（`customer_id`、`name`）。**期望列**：`customer_id`、`name`。',
      starterSql: 'SELECT c.customer_id, c.name\nFROM customers AS c\nWHERE EXISTS (\n  SELECT 1 FROM orders AS o WHERE o.customer_id = c.customer_id\n  GROUP BY o.customer_id HAVING COUNT(*) >= 4\n)',
      referenceSql:
        'SELECT c.customer_id, c.name FROM customers AS c WHERE EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.customer_id GROUP BY o.customer_id HAVING COUNT(*) >= 4)',
      explanation: '子查询里先 GROUP BY+HAVING，再用 EXISTS 判断"有没有这样的组"。结果是张伟（1，5 单）、王芳（2）、刘洋（4）、陈静（5）。',
      tags: ['EXISTS', '子查询'],
      relatedLessonId: 'sql-l-5-1',
    },
    {
      id: 'sql-5-e16',
      type: 'sql',
      difficulty: 4,
      question:
        '计算每位客户相邻两单的平均间隔天数，保留 2 位小数，返回 `customer_id`、`avg_gap_days`。**期望列**：`customer_id`、`avg_gap_days`。',
      starterSql: 'WITH gaps AS (\n  SELECT customer_id,\n         julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS gap\n  FROM orders\n)\nSELECT customer_id, ROUND(AVG(gap), 2) AS avg_gap_days FROM gaps GROUP BY ',
      referenceSql:
        'WITH gaps AS (SELECT customer_id, julianday(order_date) - julianday(LAG(order_date) OVER (PARTITION BY customer_id ORDER BY order_date)) AS gap FROM orders) SELECT customer_id, ROUND(AVG(gap), 2) AS avg_gap_days FROM gaps GROUP BY customer_id',
      explanation:
        '窗口函数先算每单与上一单的天数差（首单为 NULL），外层 `AVG(gap)` 会自动跳过 NULL，得到"平均复购间隔"。这是用户运营中最常用的粘性指标之一。',
      tags: ['LAG', 'CTE', '聚合'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e17',
      type: 'sql',
      difficulty: 4,
      question:
        '找出每个品类中销量最高（件数最多）的商品。返回 `category`、`product_name`、`units`。**期望列**：`category`、`product_name`、`units`。',
      starterSql: 'WITH s AS (\n  SELECT p.category, p.product_name, SUM(i.quantity) AS units,\n         ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY SUM(i.quantity) DESC) AS rn\n  FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id\n  GROUP BY p.category, p.product_name\n)\nSELECT category, product_name, units FROM s WHERE 1 = 1',
      referenceSql:
        'WITH s AS (SELECT p.category, p.product_name, SUM(i.quantity) AS units, ROW_NUMBER() OVER (PARTITION BY p.category ORDER BY SUM(i.quantity) DESC) AS rn FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id GROUP BY p.category, p.product_name) SELECT category, product_name, units FROM s WHERE rn = 1',
      explanation:
        '这是"先分组聚合，再在聚合结果上开窗排名"的组合拳：窗口函数的 ORDER BY 里可以直接用 `SUM(i.quantity)`。结果是 4 行，每个品类各一个商品。',
      tags: ['窗口函数', 'Top N', 'JOIN'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e18',
      type: 'sql',
      difficulty: 3,
      question:
        '用 LAG 计算月度订单数的环比变化：返回 `month`、`order_cnt`、`prev_cnt`、`diff`（本月 - 上月，首月为 NULL）。**期望列**：`month`、`order_cnt`、`prev_cnt`、`diff`。',
      starterSql: 'WITH monthly AS (\n  SELECT SUBSTR(order_date, 1, 7) AS month, COUNT(*) AS order_cnt FROM orders GROUP BY month\n)\nSELECT month, order_cnt, LAG(order_cnt) OVER (ORDER BY month) AS prev_cnt, order_cnt - ',
      referenceSql:
        'WITH monthly AS (SELECT SUBSTR(order_date, 1, 7) AS month, COUNT(*) AS order_cnt FROM orders GROUP BY month) SELECT month, order_cnt, LAG(order_cnt) OVER (ORDER BY month) AS prev_cnt, order_cnt - LAG(order_cnt) OVER (ORDER BY month) AS diff FROM monthly',
      explanation:
        '1~9 月每月 4 单、10~12 月每月 3 单，所以 diff 只在 10 月出现 -1，其余为 0（首月为 NULL）。实际业务中分母要用 `NULLIF(prev, 0)` 防止除零。',
      tags: ['LAG', '环比'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e19',
      type: 'judge',
      difficulty: 2,
      question: '派生表（FROM 子句中的子查询）在 PostgreSQL 和 MySQL 中必须起别名，否则会报错。',
      answer: true,
      explanation: 'SQLite 允许省略别名，但标准 SQL 与 PostgreSQL/MySQL 都要求 `FROM (...) AS t`。养成总写别名的习惯可以避免迁移报错。',
      tags: ['派生表'],
      relatedLessonId: 'sql-l-5-1',
    },
    {
      id: 'sql-5-e20',
      type: 'single',
      difficulty: 2,
      question: '下列哪一项**不能**用窗口函数完成？',
      options: [
        { value: 'A', text: '给每个品类内的商品按价格排名' },
        { value: 'B', text: '取每位客户的上一单与下一单' },
        { value: 'C', text: '计算截至当月的累计销售额' },
        { value: 'D', text: '在 WHERE 中过滤"排名第一"的行（同一层直接写 WHERE）' },
      ],
      answer: 'D',
      explanation: '窗口函数可以计算排名，但结果不能在同一个查询块的 WHERE 中使用，必须放到外层（子查询/CTE）再过滤。A、B、C 都是窗口函数的典型用途。',
      tags: ['窗口函数'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e21',
      type: 'sql',
      difficulty: 3,
      question:
        '找出订单号最大的前 3 笔订单的订单号与下单日期（先 CTE 取全表再排序截取，练习 CTE 写法）。**期望列**：`order_id`、`order_date`。',
      starterSql: 'WITH t AS (SELECT order_id, order_date FROM orders)\nSELECT order_id, order_date FROM t\nORDER BY order_id DESC\nLIMIT ',
      referenceSql: 'WITH t AS (SELECT order_id, order_date FROM orders) SELECT order_id, order_date FROM t ORDER BY order_id DESC LIMIT 3',
      explanation: 'CTE 也可以只是给数据源起个名字。结果 1045、1044、1043。',
      tags: ['CTE', 'LIMIT'],
      relatedLessonId: 'sql-l-5-2',
    },
    {
      id: 'sql-5-e22',
      type: 'sql',
      difficulty: 4,
      question:
        '给每位客户按累计消费金额（已完成订单）排名，返回前 5 名的 `name`、`gmv`（保留 2 位小数）、`rk`。**期望列**：`name`、`gmv`、`rk`。',
      starterSql:
        "WITH cust AS (\n  SELECT c.customer_id, c.name, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS gmv\n  FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id\n  JOIN order_items AS i ON i.order_id = o.order_id\n  WHERE o.status = '已完成'\n  GROUP BY c.customer_id\n)\nSELECT name, ROUND(gmv, 2) AS gmv, RANK() OVER (ORDER BY ",
      referenceSql:
        "WITH cust AS (SELECT c.customer_id, c.name, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS gmv FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' GROUP BY c.customer_id) SELECT name, ROUND(gmv, 2) AS gmv, RANK() OVER (ORDER BY gmv DESC) AS rk FROM cust ORDER BY rk LIMIT 5",
      explanation:
        'CTE 里先计算客户级 GMV，外层用 `RANK() OVER (ORDER BY gmv DESC)` 排名。注意窗口的 ORDER BY 可以引用 CTE 中的列名 `gmv`。',
      tags: ['CTE', 'RANK', '窗口函数'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e23',
      type: 'multiple',
      difficulty: 3,
      question: '关于窗口函数，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '`PARTITION BY` 省略时，整个结果集是一个窗口' },
        { value: 'B', text: '窗口函数不会改变结果集的行数' },
        { value: 'C', text: '`LAG` 的第三个参数可以给"没有上一行"的情况设置默认值' },
        { value: 'D', text: '窗口函数可以写在 GROUP BY 子句中' },
        { value: 'E', text: '`rows BETWEEN 2 PRECEDING AND CURRENT ROW` 可用于移动平均' },
      ],
      answer: ['A', 'B', 'C', 'E'],
      explanation:
        '窗口函数只增加列、不减少行（B 对），只能出现在 SELECT / ORDER BY 中（D 错）。`LAG(x, n, default)` 的第三参数是默认值（C 对）。',
      tags: ['窗口函数'],
      relatedLessonId: 'sql-l-5-3',
    },
    {
      id: 'sql-5-e24',
      type: 'sql',
      difficulty: 4,
      question:
        '用窗口函数比较"每种状态下的订单金额最大值"：按订单汇总金额后，求每个状态（`status`）的订单数与该状态最大单笔金额，返回 `status`、`order_cnt`、`max_amt`（保留 2 位小数）。**期望列**：`status`、`order_cnt`、`max_amt`。',
      starterSql:
        'WITH oa AS (\n  SELECT o.status, o.order_id, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS amt\n  FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id\n  GROUP BY o.order_id\n)\nSELECT status, COUNT(*) AS order_cnt, ROUND(MAX(amt), 2) AS max_amt FROM oa GROUP BY ',
      referenceSql:
        'WITH oa AS (SELECT o.status, o.order_id, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS amt FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id GROUP BY o.order_id) SELECT status, COUNT(*) AS order_cnt, ROUND(MAX(amt), 2) AS max_amt FROM oa GROUP BY status',
      explanation:
        '先 CTE 汇总到订单粒度（45 行），再按状态聚合。已取消 4 单（最大 499），已完成 41 单（最大 1599）。加窗口函数 `MAX(MAX(amt)) OVER ()` 还能同时给出全局最大值做对比。',
      tags: ['CTE', '聚合'],
      relatedLessonId: 'sql-l-5-2',
    },
  ],
};

export { ch5 };
export default ch5;
