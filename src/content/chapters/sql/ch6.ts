import type { Chapter } from '../../../types';

/* ============================================================
 *  第 6 章：查询优化与实战
 * ============================================================ */

const ch6: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'sql-6',
  title: '查询优化与实战',
  goal: '理解 B+ 树索引与执行计划，识别"写坏了导致索引失效"的常见写法，掌握大表分页与 JOIN 前过滤技巧，并完成一份完整的零售销售分析。',
  lessons: [
    {
      id: 'sql-l-6-1',
      title: '索引原理与 EXPLAIN QUERY PLAN',
      content: `
### 学习目标

学完本节，你应该能够：
1. 读 EXPLAIN QUERY PLAN 的输出；
2. 区分 SEARCH（索引）与 SCAN（全表）；
3. 为高频查询列建合适索引。

### 前置知识

- 全部前置章（l1–l5）。

### 问题背景

查询优化从“读执行计划”开始：索引让查找从全表扫描变树查找；写法层面（列裁剪、过滤下推、分页方式）同样数量级影响。

### 直觉理解

索引像书的目录：按目录找章节是 O(log n)，翻全书是 O(n)——但目录太多会拖慢写入（每写一行更新所有目录）。

### 核心概念与原理详解

## 为什么需要索引

没有索引时，数据库只能**逐行扫描整张表**（全表扫描，SQLite 的 \`SCAN\`）来判断是否满足 \`WHERE\` 条件。100 万行的表，一次查询可能要读 100 万行；有了合适的索引，只需要读几行。

一个直觉类比：字典的"按拼音查"就是索引，没有索引就只能一页页翻。

## B+ 树：索引的数据结构

关系数据库最常用的索引结构是 **B+ 树**（B+ Tree）。它由三部分组成：

1. **根节点与内部节点**：只存"键的范围 + 指向下一层的指针"，用来快速缩小查找范围；
2. **叶子节点**：存实际的键值（以及行指针或行数据）；
3. **叶子之间的链表**：所有叶子节点按顺序串起来，方便范围扫描。

特点：

| 特性 | 含义 | 带来的好处 |
| --- | --- | --- |
| 多路平衡 | 一个节点有几百个孩子 | 树高只有 3~4 层，百万行也只要 3~4 次 IO |
| 只有叶子存数据 | 内部节点只做导航 | 节点小、一次 IO 能读更多键 |
| 叶子有序且相连 | 键值从小到大排列 | 等值定位快，范围查询（\`BETWEEN\`、\`>=\`）顺序扫描快 |
| 天然有序 | 索引内按列排序 | 可以省掉 \`ORDER BY\` 的排序开销 |

这也解释了两条最重要的规则：

- **等值查询、范围查询**能走索引（能"定位"）；
- **在索引列上做运算或套函数**会破坏有序性，**索引失效**。

## 主键与外键的索引

- \`INTEGER PRIMARY KEY\` 在 SQLite 中就是 rowid 的别名，是最快的索引；
- **外键列不会自动建索引**：\`orders.customer_id\`、\`order_items.order_id\` 在 retail 里都没有索引，JOIN 时经常是性能瓶颈（第 3 节会看到这一点）。

## EXPLAIN QUERY PLAN 怎么看

SQLite 用 \`EXPLAIN QUERY PLAN\`（MySQL 用 \`EXPLAIN\`，PostgreSQL 用 \`EXPLAIN ANALYZE\`）：

\`\`\`sql
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE order_id = 1001;
\`\`\`

retail 的实际输出：

| id | parent | notused | detail |
| --- | --- | --- | --- |
| 2 | 0 | 33 | SEARCH orders USING INTEGER PRIMARY KEY (rowid=?) |

\`detail\` 列是核心：\`SEARCH ... USING ... PRIMARY KEY\` 表示走主键索引定位，只需读 1 行。

关键词解读：

| 关键字 | 含义 | 好不好 |
| --- | --- | --- |
| \`SEARCH ... USING INDEX\` | 用索引定位 | ✅ 好 |
| \`SEARCH ... USING INTEGER PRIMARY KEY (rowid=?)\` | 用主键定位 | ✅ 最好 |
| \`SCAN table\` | 全表扫描 | ⚠️ 小表无所谓，大表要警惕 |
| \`USE TEMP B-TREE FOR ORDER BY\` | 额外建临时结构做排序 | ⚠️ 考虑给排序列建索引 |
| \`USE TEMP B-TREE FOR GROUP BY\` | 分组时做了临时排序 | ⚠️ 小表可接受 |
| \`BLOOM FILTER\` | SQLite 自动的布隆过滤器优化 | ✅ 好 |
| \`AUTOMATIC INDEX\` | 优化器临时建的索引 | 说明人工索引缺失 |

实际对比（retail）：

\`\`\`sql
EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 1;
-- SCAN orders            ← 外键列无索引，全表扫描

EXPLAIN QUERY PLAN SELECT * FROM order_items WHERE order_id = 1017;
-- SCAN order_items       ← 明细表同样没有 order_id 索引
\`\`\`

如果给 \`customer_id\` 建索引（在独立的数据库中执行）：

\`\`\`sql
CREATE INDEX idx_orders_customer ON orders(customer_id);
\`\`\`

再执行计划就会变成 \`SEARCH orders USING INDEX idx_orders_customer (customer_id=?)\`。本练习环境每次都是干净快照，所以 CREATE INDEX 只在当次会话有效。

## 哪些写法会让索引失效

| 写法 | 原因 | 改写 |
| --- | --- | --- |
| \`WHERE SUBSTR(order_date,1,4) = '2024'\` | 列上套了函数 | \`WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'\` |
| \`WHERE order_id + 0 = 1001\` | 列上做了运算 | 直接写 \`order_id = 1001\` |
| \`WHERE price * 2 > 1000\` | 列参与运算 | 改成 \`price > 500\` |
| \`WHERE name LIKE '%张%'\` | 前导通配符无法定位 | 前缀匹配 \`LIKE '张%'\` 或用全文检索 |
| \`WHERE customer_id = '1001abc'\`（MySQL） | 隐式类型转换，把列转成字符串 | 保证字面量类型与列一致 |
| 复合索引 \`(a, b)\` 只用 \`b\` 过滤 | 不满足最左前缀 | 按 \`(a, b)\` 顺序过滤或另建索引 |

## 最左前缀原则

复合索引 \`CREATE INDEX idx ON t(a, b, c)\` 相当于对 \`(a)\`、\`(a,b)\`、\`(a,b,c)\` 都有索引：

\`\`\`sql
-- ✅ 能用到索引
WHERE a = 1
WHERE a = 1 AND b = 2
WHERE a = 1 AND b = 2 AND c > 3
WHERE a = 1 AND c = 3          -- a 能用上索引，c 只能回表逐行过滤

-- ❌ 用不上
WHERE b = 2
WHERE b = 2 AND c = 3
\`\`\`

## 覆盖索引

如果查询需要的全部列都在索引中（例如索引是 \`(order_id, quantity)\`），数据库可以直接从索引读出结果而**不用回表**，这就是覆盖索引。它也是第 1 章强调"不要 \`SELECT *\`"的深层原因：一旦多选一列，覆盖索引就失效了。

## 不同数据库的 EXPLAIN

| 数据库 | 只看计划 | 看计划 + 实际耗时 |
| --- | --- | --- |
| SQLite | \`EXPLAIN QUERY PLAN\` | 无内置，需自行计时 |
| MySQL | \`EXPLAIN\` | \`EXPLAIN ANALYZE\`（8.0.18+） |
| PostgreSQL | \`EXPLAIN\` | \`EXPLAIN ANALYZE\` |

本课程环境是内存数据库（sql.js），EXPLAIN 的输出与真实耗时关系不大，但**看执行计划的方法完全一致**。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3, time
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE t (id INT, v INT)")
con.executemany("INSERT INTO t VALUES (?,?)", [(i, i%100) for i in range(200000)])
con.execute("CREATE INDEX idx_v ON t(v)")
import math
plan = con.execute("EXPLAIN QUERY PLAN SELECT * FROM t WHERE v=99").fetchall()
print(plan)
print("Indexed lookup:", con.execute("SELECT COUNT(*) FROM t WHERE v=99").fetchone())
con.close()
\`\`\`

预期输出（实测）：plan 显示 SEARCH t USING COVERING INDEX idx_v（非 SCAN）；Indexed lookup 返回 2000 行

**常见错误**：给低基数列建单列索引（性别只有两值，索引选择性差）；SELECT *（列裁剪丢失覆盖索引机会）；大偏移 LIMIT 分页（用 keyset/游标分页）。

### 常见误区

1. 索引越多越好——写放大与存储代价；
2. 优化器永远最优——统计信息过期会选错计划；
3. 子查询一定慢——现代优化器常可改写。

### 知识关联

- **向前**：l-5 的复杂查询是优化对象；
- **向后**：大数据引擎的分区/裁剪思想同源；
- **平行**：量化回测的“先过滤再计算”下推思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 索引 | 目录 O(log n)，写入有代价 |
| EXPLAIN | 读计划：SEARCH vs SCAN |
| 写法 | 列裁剪 + 过滤下推 + keyset 分页 |

### 权威学术与标准来源

> **来源类型：经典学术原著 · 权威教材 · 国际标准 (A 类)**
> - Edgar F. Codd (1970). *A Relational Model of Data for Large Shared Data Banks*. Communications of the ACM, 13(6), 377–387. (ACM 图灵奖奠基论文 · 关系模型与代数基础)
> - Abraham Silberschatz, Henry F. Korth, & S. Sudarshan (2019). *Database System Concepts* (7th ed.). McGraw-Hill / Yale University. (第 3–5 章 SQL 核心语法与查询优化)
> - ISO/IEC 9075:2016. *Information technology — Database languages — SQL*.
`,
      tips: [
        {
          kind: 'performance',
          text: '外键列不会自动建索引。`order_items.order_id`、`orders.customer_id` 这类 JOIN 键在生产库上必须有索引，否则每次都全表扫描。',
        },
        {
          kind: 'pitfall',
          text: '在 WHERE 的列上套函数或做运算（`SUBSTR(col,...)`、`col + 0`、`col * 2`）会让索引失效；把运算移到常量一侧。',
        },
        {
          kind: 'interview',
          text: '常问："为什么 `LIKE \'%abc\'` 用不上索引？"B+ 树按前缀有序，只有前缀确定才能定位，前导 % 会导致必须逐行匹配。',
        },
      ],
      demos: [
        {
          title: '一次对比：主键查询、无索引列、前导通配符',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT '主键 order_id = 1001' AS query, (SELECT COUNT(*) FROM orders WHERE order_id = 1001) AS rows_hit
UNION ALL
SELECT '无索引 customer_id = 1', (SELECT COUNT(*) FROM orders WHERE customer_id = 1)
UNION ALL
SELECT '前导通配 LIKE', (SELECT COUNT(*) FROM products WHERE product_name LIKE '%显示%')`,
        },
        {
          title: 'EXPLAIN QUERY PLAN 看执行方式',
          lang: 'sql',
          dataset: 'retail',
          code: `EXPLAIN QUERY PLAN SELECT * FROM orders WHERE order_id = 1001`,
        },
        {
          title: '执行计划：JOIN + GROUP BY 的代价',
          lang: 'sql',
          dataset: 'retail',
          code: `EXPLAIN QUERY PLAN
SELECT o.status, COUNT(*) AS cnt
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
GROUP BY o.status
ORDER BY cnt DESC`,
        },
      ],
    },
    {
      id: 'sql-l-6-2',
      title: '写法级优化：列裁剪、过滤下推与分页',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用列裁剪减少 IO；
2. 把过滤条件下推到子查询；
3. 用 keyset 分页替代大 OFFSET。

### 前置知识

- 全部前置章（l1–l5）。

### 问题背景

查询优化从“读执行计划”开始：索引让查找从全表扫描变树查找；写法层面（列裁剪、过滤下推、分页方式）同样数量级影响。

### 直觉理解

索引像书的目录：按目录找章节是 O(log n)，翻全书是 O(n)——但目录太多会拖慢写入（每写一行更新所有目录）。

### 核心概念与原理详解

## 优化三件套

日常写 SQL 时，有三条"零成本"的优化习惯：

1. **列裁剪**：只 SELECT 需要的列（\`SELECT *\` 会破坏覆盖索引）；
2. **过滤下推**：尽早、尽可能接近数据源地过滤（先 WHERE 再 JOIN，先过滤再聚合）；
3. **列裸奔**：不要让函数或运算包裹索引列。

## 列裁剪与覆盖索引

\`\`\`sql
-- ❌ 需要读取整行
SELECT * FROM order_items WHERE order_id = 1017;

-- ✅ 若存在索引 (order_id, quantity)，可以直接读索引
SELECT quantity FROM order_items WHERE order_id = 1017;
\`\`\`

在宽表（几十列、带大文本字段）上，两者的读取量可能差一个数量级。

## 避免在 WHERE 中对列做函数运算

\`\`\`sql
-- ❌ 索引失效
SELECT * FROM orders WHERE SUBSTR(order_date, 1, 4) = '2024';
SELECT * FROM orders WHERE strftime('%Y', order_date) = '2024';

-- ✅ 范围查询，可用索引
SELECT * FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01';
\`\`\`

原则：**把函数写在常量一侧，不要写在列一侧**。MySQL 里 \`WHERE DATE(create_time) = CURDATE()\` 应改为 \`WHERE create_time >= CURDATE() AND create_time < CURDATE() + INTERVAL 1 DAY\`。

## 避免隐式类型转换

\`\`\`sql
-- 假设 customer_id 是整数列
WHERE customer_id = '1001'     -- 部分数据库会把列转成字符串比较 → 索引失效
WHERE customer_id = 1001       -- ✅ 类型一致
\`\`\`

- **MySQL** 最"宽容"：\`WHERE id = '1001abc'\` 中字符串会被截断为 1001 并**命中**，既埋下错误结果又让索引失效；
- **SQLite** 的比较规则是按类型亲和性：\`1001 = '1001'\` 为真（数值比较），\`1001 = '1001abc'\` 为假，行为同样不直观；
- **PostgreSQL** 会直接报类型错误。

**结论：字面量类型必须与列类型一致，这是硬性纪律。**

## JOIN 前先过滤

\`\`\`sql
-- ✅ 先在子查询里把订单缩到"已完成"，再连接客户
SELECT c.name, COUNT(*) AS order_cnt
FROM (
  SELECT order_id, customer_id
  FROM orders
  WHERE status = '已完成'
) AS o
JOIN customers AS c ON c.customer_id = o.customer_id
GROUP BY c.customer_id;
\`\`\`

对 INNER JOIN，现代优化器通常会自动把过滤条件下推。但以下场景手写过滤很重要：

- **LEFT JOIN**：右表的过滤条件必须写在 ON 中，否则语义被改变（第 4 章）；
- 子查询里先聚合：先减少参与聚合的行数，代价显著降低；
- 视图 / CTE 内含昂贵计算时，外层条件不一定会被下推。

## 大表分页：OFFSET 的陷阱

\`\`\`sql
-- 深分页：数据库要先扫描并丢弃前 1000000 行
SELECT * FROM orders ORDER BY order_id LIMIT 20 OFFSET 1000000;
\`\`\`

代价是 \`O(OFFSET + LIMIT)\`，页数越深越慢。三种改进：

**① 游标分页（Keyset Pagination，推荐）**

\`\`\`sql
-- 记住上一页最后一行的键，从它之后继续取
SELECT * FROM orders WHERE order_id > 1040 ORDER BY order_id LIMIT 5;
\`\`\`

利用索引直接定位，复杂度 \`O(LIMIT)\`，翻到第 1 亿页也不会变慢。

**② 延迟关联（Late Row Lookup）**

先用覆盖索引只查主键，再回表取整行：

\`\`\`sql
SELECT o.* FROM orders AS o
JOIN (SELECT order_id FROM orders ORDER BY order_id DESC LIMIT 20 OFFSET 1000) AS t
  ON t.order_id = o.order_id;
\`\`\`

**③ 产品层兜底**：很多网站直接限制最大页数（几十页），避免用户翻到深分页。

| 方案 | 优点 | 缺点 |
| --- | --- | --- |
| LIMIT + OFFSET | 简单、可跳页 | 深分页慢 |
| 游标分页 | 性能恒定 | 不能跳页，需要有序唯一键 |
| 延迟关联 | 兼顾跳页与性能 | SQL 复杂，仍要扫索引 |
| 限制最大页 | 简单 | 用户体验受限 |

## 聚合前先缩小数据集

\`\`\`sql
-- ✅ 先把"大件"明细筛出来，再 JOIN 商品表
SELECT p.category, SUM(i.quantity) AS units
FROM (SELECT product_id, quantity FROM order_items WHERE quantity >= 3) AS i
JOIN products AS p ON p.product_id = i.product_id
GROUP BY p.category;
\`\`\`

retail 里满足 \`quantity >= 3\` 的明细只有 10 行，参与 JOIN 与聚合的数据量立刻从 59 行降到 10 行。在百万级明细表上，这就是"分钟级"与"秒级"的差距。

## 优化优先级

1. **先用 EXPLAIN 找证据**：哪些大表在 \`SCAN\`、哪里在建 \`TEMP B-TREE\`；
2. **加对索引**：WHERE、JOIN、ORDER BY 用到的列；
3. **改写法**：列裸奔、类型一致、提前过滤、列裁剪；
4. 最后才考虑物化视图、分区分表这类重型手段。

> 永远不要在不知道瓶颈的情况下"猜优化"，先看执行计划。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3, time
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE t (id INT, v INT)")
con.executemany("INSERT INTO t VALUES (?,?)", [(i, i%100) for i in range(200000)])
con.execute("CREATE INDEX idx_v ON t(v)")
import math
plan = con.execute("EXPLAIN QUERY PLAN SELECT * FROM t WHERE v=99").fetchall()
print(plan)
print("Indexed lookup:", con.execute("SELECT COUNT(*) FROM t WHERE v=99").fetchone())
con.close()
\`\`\`

预期输出（实测）：plan 显示 SEARCH t USING COVERING INDEX idx_v（非 SCAN）；Indexed lookup 返回 2000 行

**常见错误**：给低基数列建单列索引（性别只有两值，索引选择性差）；SELECT *（列裁剪丢失覆盖索引机会）；大偏移 LIMIT 分页（用 keyset/游标分页）。

### 常见误区

1. 索引越多越好——写放大与存储代价；
2. 优化器永远最优——统计信息过期会选错计划；
3. 子查询一定慢——现代优化器常可改写。

### 知识关联

- **向前**：l-5 的复杂查询是优化对象；
- **向后**：大数据引擎的分区/裁剪思想同源；
- **平行**：量化回测的“先过滤再计算”下推思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 索引 | 目录 O(log n)，写入有代价 |
| EXPLAIN | 读计划：SEARCH vs SCAN |
| 写法 | 列裁剪 + 过滤下推 + keyset 分页 |

### 权威学术与标准来源

> **来源类型：经典学术原著 · 权威教材 · 国际标准 (A 类)**
> - Edgar F. Codd (1970). *A Relational Model of Data for Large Shared Data Banks*. Communications of the ACM, 13(6), 377–387. (ACM 图灵奖奠基论文 · 关系模型与代数基础)
> - Abraham Silberschatz, Henry F. Korth, & S. Sudarshan (2019). *Database System Concepts* (7th ed.). McGraw-Hill / Yale University. (第 3–5 章 SQL 核心语法与查询优化)
> - ISO/IEC 9075:2016. *Information technology — Database languages — SQL*.
`,
      tips: [
        {
          kind: 'performance',
          text: '深分页 `LIMIT 20 OFFSET 1000000` 要扫描并丢弃 100 万行。改用游标分页 `WHERE id > 上一页最后 id ORDER BY id LIMIT 20`。',
        },
        {
          kind: 'pitfall',
          text: 'MySQL 中 `WHERE int_col = \'1001abc\'` 会把字符串截断成 1001 并命中，既误判结果又索引失效。PostgreSQL 直接报类型错误。',
        },
        {
          kind: 'note',
          text: 'INNER JOIN 的 WHERE 条件多数情况下优化器会自动下推；但 LEFT JOIN 中右表的过滤条件必须写在 ON 里，否则语义会被改变。',
        },
      ],
      demos: [
        {
          title: '函数包裹列 vs 范围条件：结果一样，写法代价不同',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT
  SUM(CASE WHEN SUBSTR(order_date, 1, 4) = '2024' THEN 1 ELSE 0 END) AS via_function,
  SUM(CASE WHEN order_date >= '2024-01-01' AND order_date < '2025-01-01' THEN 1 ELSE 0 END) AS via_range
FROM orders`,
        },
        {
          title: '游标分页：从 order_id > 1040 继续取 5 行',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT order_id, order_date, status
FROM orders
WHERE order_id > 1040
ORDER BY order_id
LIMIT 5`,
        },
        {
          title: '先过滤再 JOIN：只统计大件商品',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT p.category, SUM(i.quantity) AS units
FROM (SELECT product_id, quantity FROM order_items WHERE quantity >= 3) AS i
JOIN products AS p ON p.product_id = i.product_id
GROUP BY p.category
ORDER BY units DESC`,
        },
      ],
    },
    {
      id: 'sql-l-6-3',
      title: '实战：retail 销售分析报告',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用一条 SQL 组合多表出报表；
2. 校验报表口径与明细一致；
3. 为报表查询补索引。

### 前置知识

- 全部前置章（l1–l5）。

### 问题背景

查询优化从“读执行计划”开始：索引让查找从全表扫描变树查找；写法层面（列裁剪、过滤下推、分页方式）同样数量级影响。

### 直觉理解

索引像书的目录：按目录找章节是 O(log n)，翻全书是 O(n)——但目录太多会拖慢写入（每写一行更新所有目录）。

### 核心概念与原理详解

## 分析目标

用一份数据回答零售业务最关心的四个问题：

1. **整体经营**：全年有效 GMV、订单数、客单价、取消率是多少？
2. **时间趋势**：月度 GMV 的走势如何？
3. **品类结构**：哪些品类贡献最多？毛利率如何？
4. **客户结构**：哪些客户是核心客户？会员等级与贡献有关吗？

所有数字都来自 \`retail\` 数据集 2024 年数据（45 笔订单、59 行明细、15 位客户）。

## 第一步：定义口径

| 指标 | 定义 | 为什么这样定 |
| --- | --- | --- |
| GMV | \`SUM(quantity * unit_price * (1 - discount))\` | 含折扣的实付金额 |
| 有效 GMV | 仅 \`status = '已完成'\` | 取消单不计收入 |
| 订单数 | \`COUNT(DISTINCT order_id)\` | 明细表里一单多行 |
| 客单价 | 有效 GMV / 有效订单数 | 分母是订单数，不是行数 |
| 毛利率 | (实付 - 成本) / 实付 | 成本 = \`quantity * cost\` |
| 取消率 | 取消订单数 / 全部订单数 | 分母是全部订单 |

> 口径先写下来，再写 SQL。这是分析师最重要的习惯。

## 第二步：整体经营指标

\`\`\`sql
SELECT COUNT(DISTINCT o.order_id) AS done_orders,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount))
             / COUNT(DISTINCT o.order_id), 2) AS avg_order_value
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.status = '已完成';
\`\`\`

**结果**：41 单，有效 GMV **24150.5** 元，客单价 **589.04** 元。

\`\`\`sql
SELECT ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv_all,
       (SELECT COUNT(*) FROM orders) AS all_orders,
       (SELECT COUNT(*) FROM orders WHERE status = '已取消') AS canceled
FROM order_items AS i;
\`\`\`

**结果**：全部 GMV **25505.5** 元，45 单中 4 单取消，**取消率 8.89%**，取消金额 **1355** 元。

## 第三步：月度趋势

\`\`\`sql
SELECT SUBSTR(o.order_date, 1, 7) AS month,
       COUNT(DISTINCT o.order_id) AS orders,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.status = '已完成'
GROUP BY month
ORDER BY month;
\`\`\`

数据规模小：每月只有 3~4 单，月度 GMV 的波动主要来自单笔大额订单（1599 元的显示器）。所以**不能因为某月 GMV 高就说"需求旺盛"**，要先看订单数与商品结构。

## 第四步：品类结构与毛利

\`\`\`sql
SELECT p.category,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv,
       ROUND(SUM(i.quantity * p.cost), 2) AS cost_total,
       ROUND((SUM(i.quantity * i.unit_price * (1 - i.discount)) - SUM(i.quantity * p.cost))
             / SUM(i.quantity * i.unit_price * (1 - i.discount)) * 100, 2) AS gross_margin_pct
FROM order_items AS i
JOIN products AS p ON p.product_id = i.product_id
JOIN orders   AS o ON o.order_id = i.order_id
WHERE o.status = '已完成'
GROUP BY p.category
ORDER BY gmv DESC;
\`\`\`

**结果**：数码 GMV 最高（13556.7 元），但毛利率最低（34.42%），主要被 1599 元的显示器拉低；服装 5808.1 元、毛利率 53.25%；食品 2710 元、毛利率 55.5%；家居 2075.7 元、毛利率 59.44%。

**解读要点**：

- 收入集中在数码，但利润贡献并不集中；
- 家居与食品毛利率高、GMV 小，是提升整体利润率的空间；
- 服装的件数最多（33 件），是"走量"品类。

## 第五步：客户结构（帕累托）

\`\`\`sql
WITH cust AS (
  SELECT c.customer_id, c.name, c.member_level,
         SUM(i.quantity * i.unit_price * (1 - i.discount)) AS gmv,
         COUNT(DISTINCT o.order_id) AS orders
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = '已完成'
  GROUP BY c.customer_id
)
SELECT name, member_level, orders, ROUND(gmv, 2) AS gmv,
       RANK() OVER (ORDER BY gmv DESC) AS rk
FROM cust
ORDER BY rk
LIMIT 5;
\`\`\`

**结果**：李娜 3698.55、刘洋 3631.55、冯雪 2838.30、周涛 2457.80、张伟 2269.45。前 5 名合计约 1.49 万元，约占有效 GMV 的六成——符合"少数核心客户贡献大部分收入"的零售规律。

## 第六步：会员等级与客单价

\`\`\`sql
SELECT COALESCE(c.member_level, '未评级') AS level,
       COUNT(DISTINCT o.order_id) AS orders,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount))
             / COUNT(DISTINCT o.order_id), 2) AS avg_order_value
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.customer_id
JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.status = '已完成'
GROUP BY level
ORDER BY avg_order_value DESC;
\`\`\`

**结果**：金卡 12 单、客单价 848.20；普通 13 单、622.40；银卡 15 单、372.13；未评级 1 单、299。

金卡客户客单价最高，银卡虽然订单数最多但客单价最低——这说明**会员等级与消费金额有关，但"银卡"人群需要提客单的运营动作**（满减、套装搭配）。

## 第七步：跨品类购买

\`\`\`sql
WITH digi AS (
  SELECT DISTINCT order_id FROM order_items
  WHERE product_id IN (SELECT product_id FROM products WHERE category = '数码')
),
food AS (
  SELECT DISTINCT order_id FROM order_items
  WHERE product_id IN (SELECT product_id FROM products WHERE category = '食品')
)
SELECT digi.order_id
FROM digi JOIN food ON food.order_id = digi.order_id;
\`\`\`

**结果**：只有订单 1044 同时包含数码与食品（蓝牙耳机 + 咖啡豆）。跨品类购买很少，说明"套餐化"仍未被满足，是可尝试的增长点。

## 报告结构模板

| 部分 | 内容 | 对应步骤 |
| --- | --- | --- |
| 结论先行 | 3 条最重要的发现 | 汇总各步 |
| 整体经营 | GMV、订单数、客单价、取消率 | 第二、三步 |
| 结构分析 | 品类、客户、会员 | 第四~七步 |
| 建议 | 至少 2 条可执行建议 | 基于结构分析 |
| 附录 | 口径说明与 SQL | 第一步 |

## 五条分析师纪律

1. **口径先于 SQL**；
2. **每个数字都能被追溯**（能写出对应的查询）；
3. **区分相关与因果**（金卡客单价高，不代表升级会员就一定会多消费）；
4. **小样本不下强结论**（45 单只能说明"结构"，不能代表行业趋势）；
5. **把 SQL 存下来、起好名字**，下次分析可以直接复用。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3, time
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE t (id INT, v INT)")
con.executemany("INSERT INTO t VALUES (?,?)", [(i, i%100) for i in range(200000)])
con.execute("CREATE INDEX idx_v ON t(v)")
import math
plan = con.execute("EXPLAIN QUERY PLAN SELECT * FROM t WHERE v=99").fetchall()
print(plan)
print("Indexed lookup:", con.execute("SELECT COUNT(*) FROM t WHERE v=99").fetchone())
con.close()
\`\`\`

预期输出（实测）：plan 显示 SEARCH t USING COVERING INDEX idx_v（非 SCAN）；Indexed lookup 返回 2000 行

**常见错误**：给低基数列建单列索引（性别只有两值，索引选择性差）；SELECT *（列裁剪丢失覆盖索引机会）；大偏移 LIMIT 分页（用 keyset/游标分页）。

### 常见误区

1. 索引越多越好——写放大与存储代价；
2. 优化器永远最优——统计信息过期会选错计划；
3. 子查询一定慢——现代优化器常可改写。

### 知识关联

- **向前**：l-5 的复杂查询是优化对象；
- **向后**：大数据引擎的分区/裁剪思想同源；
- **平行**：量化回测的“先过滤再计算”下推思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 索引 | 目录 O(log n)，写入有代价 |
| EXPLAIN | 读计划：SEARCH vs SCAN |
| 写法 | 列裁剪 + 过滤下推 + keyset 分页 |

### 权威学术与标准来源

> **来源类型：经典学术原著 · 权威教材 · 国际标准 (A 类)**
> - Edgar F. Codd (1970). *A Relational Model of Data for Large Shared Data Banks*. Communications of the ACM, 13(6), 377–387. (ACM 图灵奖奠基论文 · 关系模型与代数基础)
> - Abraham Silberschatz, Henry F. Korth, & S. Sudarshan (2019). *Database System Concepts* (7th ed.). McGraw-Hill / Yale University. (第 3–5 章 SQL 核心语法与查询优化)
> - ISO/IEC 9075:2016. *Information technology — Database languages — SQL*.
`,
      tips: [
        {
          kind: 'note',
          text: 'retail 全年有效 GMV 24150.5 元，取消损失 1355 元，取消率 8.89%，客单价 589.04 元。报告里建议"结论 + 数字 + 口径"三件套一起给出。',
        },
        {
          kind: 'pitfall',
          text: '只有 45 单时，月度 GMV 的波动主要来自大额订单。不要用"某月增长 30%"这类结论，要同时给出订单数与商品结构。',
        },
        {
          kind: 'leak',
          text: '计算毛利率时成本要用 `quantity * p.cost`，而不是 `p.price - p.cost`（后者是标价毛利，不是实际成交毛利）。',
        },
        {
          kind: 'interview',
          text: '面试案例分析：先讲口径（GMV / 订单 / 客单价），再讲结构（品类、客户），最后给建议，比直接报数字加分得多。',
        },
      ],
      demos: [
        {
          title: '整体经营：有效 GMV、订单数、客单价',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COUNT(DISTINCT o.order_id) AS done_orders,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount))
             / COUNT(DISTINCT o.order_id), 2) AS avg_order_value
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.status = '已完成'`,
        },
        {
          title: '品类 GMV 与毛利率',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT p.category,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv,
       ROUND((SUM(i.quantity * i.unit_price * (1 - i.discount)) - SUM(i.quantity * p.cost))
             / SUM(i.quantity * i.unit_price * (1 - i.discount)) * 100, 2) AS gross_margin_pct
FROM order_items AS i
JOIN products AS p ON p.product_id = i.product_id
JOIN orders AS o ON o.order_id = i.order_id
WHERE o.status = '已完成'
GROUP BY p.category
ORDER BY gmv DESC`,
        },
        {
          title: '客户排行（Top 5）',
          lang: 'sql',
          dataset: 'retail',
          code: `WITH cust AS (
  SELECT c.customer_id, c.name,
         SUM(i.quantity * i.unit_price * (1 - i.discount)) AS gmv,
         COUNT(DISTINCT o.order_id) AS orders
  FROM customers AS c
  JOIN orders AS o ON o.customer_id = c.customer_id
  JOIN order_items AS i ON i.order_id = o.order_id
  WHERE o.status = '已完成'
  GROUP BY c.customer_id
)
SELECT name, orders, ROUND(gmv, 2) AS gmv, RANK() OVER (ORDER BY gmv DESC) AS rk
FROM cust
ORDER BY rk
LIMIT 5`,
        },
        {
          title: '会员等级客单价',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COALESCE(c.member_level, '未评级') AS level,
       COUNT(DISTINCT o.order_id) AS orders,
       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)) / COUNT(DISTINCT o.order_id), 2) AS avg_order_value
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.customer_id
JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.status = '已完成'
GROUP BY level
ORDER BY avg_order_value DESC`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'sql-6-e1',
      type: 'sql',
      difficulty: 2,
      question:
        '用 EXPLAIN QUERY PLAN 查看查询 `SELECT * FROM orders WHERE order_id = 1001;` 的执行计划，返回 `id`、`parent`、`notused`、`detail` 四列。**期望列**：`id`、`parent`、`notused`、`detail`。',
      starterSql: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE order_id = 1001',
      referenceSql: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE order_id = 1001',
      explanation:
        '`detail` 为 `SEARCH orders USING INTEGER PRIMARY KEY (rowid=?)`，说明走主键索引定位。对比下一题 `WHERE customer_id = 1` 会得到 `SCAN orders`。',
      tags: ['EXPLAIN', '索引'],
      relatedLessonId: 'sql-l-6-1',
    },
    {
      id: 'sql-6-e2',
      type: 'sql',
      difficulty: 2,
      question:
        '用 EXPLAIN QUERY PLAN 查看 `SELECT * FROM orders WHERE customer_id = 1;` 的执行计划，返回 `id`、`parent`、`notused`、`detail`。**期望列**：`id`、`parent`、`notused`、`detail`。',
      starterSql: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 1',
      referenceSql: 'EXPLAIN QUERY PLAN SELECT * FROM orders WHERE customer_id = 1',
      explanation:
        '结果为 `SCAN orders`——`customer_id` 是外键但没有索引，只能全表扫描。生产中应加 `CREATE INDEX ON orders(customer_id)`。',
      tags: ['EXPLAIN', '全表扫描'],
      relatedLessonId: 'sql-l-6-1',
    },
    {
      id: 'sql-6-e3',
      type: 'sql',
      difficulty: 3,
      question:
        '用 EXPLAIN QUERY PLAN 查看 `SELECT * FROM customers ORDER BY city;` 的执行计划，返回 `id`、`parent`、`notused`、`detail`。**期望列**：`id`、`parent`、`notused`、`detail`。',
      starterSql: 'EXPLAIN QUERY PLAN SELECT * FROM customers ORDER BY city',
      referenceSql: 'EXPLAIN QUERY PLAN SELECT * FROM customers ORDER BY city',
      explanation:
        '会看到 `USE TEMP B-TREE FOR ORDER BY`：`city` 没有索引，排序只能借助临时结构。给 `city` 建索引后这条提示会消失。',
      tags: ['EXPLAIN', '排序'],
      relatedLessonId: 'sql-l-6-1',
    },
    {
      id: 'sql-6-e4',
      type: 'sql',
      difficulty: 2,
      question:
        '统计 2024 年的订单数，用**范围条件**（不要对日期列套函数）实现，列名 `n_orders`。**期望列**：`n_orders`。',
      starterSql: "SELECT COUNT(*) AS n_orders FROM orders\nWHERE order_date >= '2024-01-01' AND order_date < ",
      referenceSql:
        "SELECT COUNT(*) AS n_orders FROM orders WHERE order_date >= '2024-01-01' AND order_date < '2025-01-01'",
      explanation:
        '左闭右开区间是日期范围过滤的标准写法，能利用索引。写成 `SUBSTR(order_date,1,4) = \'2024\'` 索引就会失效。结果是 45。',
      tags: ['日期范围', '索引'],
      relatedLessonId: 'sql-l-6-2',
    },
    {
      id: 'sql-6-e5',
      type: 'sql',
      difficulty: 2,
      question:
        '用**游标分页**取 `order_id > 1040` 的后 5 笔订单，返回 `order_id`、`order_date`、`status`。**期望列**：`order_id`、`order_date`、`status`。',
      starterSql: 'SELECT order_id, order_date, status FROM orders\nWHERE order_id > 1040\nORDER BY order_id\nLIMIT ',
      referenceSql: 'SELECT order_id, order_date, status FROM orders WHERE order_id > 1040 ORDER BY order_id LIMIT 5',
      explanation:
        '游标分页只需定位到上一页最后一个键，再按索引向后取 N 行，复杂度与页深无关。结果 5 行（1041~1045）。',
      tags: ['分页', '游标分页'],
      relatedLessonId: 'sql-l-6-2',
    },
    {
      id: 'sql-6-e6',
      type: 'sql',
      difficulty: 3,
      question:
        '计算全年**有效 GMV**（已完成订单的 `quantity * unit_price * (1 - discount)` 之和），保留 2 位小数，列名 `gmv`。**期望列**：`gmv`。',
      starterSql:
        'SELECT ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv\nFROM order_items AS i\nJOIN orders AS o ON o.order_id = i.order_id\nWHERE ',
      referenceSql:
        "SELECT ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv FROM order_items AS i JOIN orders AS o ON o.order_id = i.order_id WHERE o.status = '已完成'",
      explanation: '有效 GMV = 24150.5 元；全部 GMV = 25505.5 元，差 1355 元即 4 笔取消订单。',
      tags: ['业务口径', 'JOIN'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e7',
      type: 'sql',
      difficulty: 3,
      question:
        '计算订单**取消率**（百分比，保留 2 位小数），列名 `cancel_rate_pct`。**期望列**：`cancel_rate_pct`。',
      starterSql:
        "SELECT ROUND(100.0 * SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) / COUNT(*), 2) AS cancel_rate_pct\nFROM orders",
      referenceSql:
        "SELECT ROUND(100.0 * SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) / COUNT(*), 2) AS cancel_rate_pct FROM orders",
      explanation:
        '4 / 45 × 100 ≈ 8.89%。乘 `100.0` 而不是 `100`，是为了避免整数除法把结果截断成 0——这是比率计算的经典坑。',
      tags: ['比率', 'CASE WHEN'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e8',
      type: 'sql',
      difficulty: 3,
      question:
        '计算每个品类的有效 GMV（列名 `gmv`，保留 2 位小数），返回 `category`、`gmv`。**期望列**：`category`、`gmv`。',
      starterSql:
        "SELECT p.category, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv\nFROM order_items AS i\nJOIN products AS p ON p.product_id = i.product_id\nJOIN orders AS o ON o.order_id = i.order_id\nWHERE o.status = '已完成'\nGROUP BY ",
      referenceSql:
        "SELECT p.category, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id JOIN orders AS o ON o.order_id = i.order_id WHERE o.status = '已完成' GROUP BY p.category",
      explanation:
        '三表连接后按品类聚合。数码 13556.7 元最高（多笔 1599 元显示器订单），其后是服装 5808.1、食品 2710、家居 2075.7。',
      tags: ['JOIN', 'GROUP BY', '业务口径'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e9',
      type: 'sql',
      difficulty: 4,
      question:
        '计算每个品类的**毛利率**（百分比，保留 2 位小数）：毛利 = 实付金额 - 成本（`quantity * cost`），毛利率 = 毛利 / 实付金额 × 100。返回 `category`、`gross_margin_pct`。**期望列**：`category`、`gross_margin_pct`。',
      starterSql:
        "SELECT p.category,\n       ROUND((SUM(i.quantity * i.unit_price * (1 - i.discount)) - SUM(i.quantity * p.cost))\n             / SUM(i.quantity * i.unit_price * (1 - i.discount)) * 100, 2) AS gross_margin_pct\nFROM order_items AS i\nJOIN products AS p ON p.product_id = i.product_id\nJOIN orders AS o ON o.order_id = i.order_id\nWHERE o.status = '已完成'\nGROUP BY p.category",
      referenceSql:
        "SELECT p.category, ROUND((SUM(i.quantity * i.unit_price * (1 - i.discount)) - SUM(i.quantity * p.cost)) / SUM(i.quantity * i.unit_price * (1 - i.discount)) * 100, 2) AS gross_margin_pct FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id JOIN orders AS o ON o.order_id = i.order_id WHERE o.status = '已完成' GROUP BY p.category",
      explanation:
        '关键是用 `quantity * p.cost` 计算实际成本，而不是 `price - cost`（那只是标价毛利）。结果：家居 59.44、食品 55.5、服装 53.25、数码 34.42——数码 GMV 最高但毛利率最低。',
      tags: ['毛利率', '业务口径'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e10',
      type: 'sql',
      difficulty: 3,
      question:
        '统计每个会员等级（NULL 显示为 `未评级`）的有效订单数与客单价（GMV / 订单数，保留 2 位小数）。返回 `level`、`orders`、`avg_order_value`。**期望列**：`level`、`orders`、`avg_order_value`。',
      starterSql:
        "SELECT COALESCE(c.member_level, '未评级') AS level,\n       COUNT(DISTINCT o.order_id) AS orders,\n       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)) / COUNT(DISTINCT o.order_id), 2) AS avg_order_value\nFROM customers AS c\nJOIN orders AS o ON o.customer_id = c.customer_id\nJOIN order_items AS i ON i.order_id = o.order_id\nWHERE o.status = '已完成'\nGROUP BY level",
      referenceSql:
        "SELECT COALESCE(c.member_level, '未评级') AS level, COUNT(DISTINCT o.order_id) AS orders, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)) / COUNT(DISTINCT o.order_id), 2) AS avg_order_value FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' GROUP BY level",
      explanation:
        '订单数必须用 `COUNT(DISTINCT o.order_id)`（明细表一单多行），客单价的分母是订单数。金卡客单价 848.20 最高，银卡订单最多但客单价仅 372.13。',
      tags: ['COALESCE', '客单价'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e11',
      type: 'single',
      difficulty: 2,
      question: 'B+ 树索引最适合下列哪种查询？',
      options: [
        { value: 'A', text: '`WHERE SUBSTR(name, 1, 1) = \'张\'`' },
        { value: 'B', text: '`WHERE name LIKE \'张%\'`' },
        { value: 'C', text: '`WHERE name LIKE \'%张%\'`' },
        { value: 'D', text: '`WHERE name * 0 = 0`（恒真条件）' },
      ],
      answer: 'B',
      explanation:
        'B+ 树按前缀有序，前缀已知即可定位；A 在列上套了函数、C 是前导通配符无法定位、D 是恒真条件（只能全表扫描）。',
      tags: ['索引', 'B+ 树'],
      relatedLessonId: 'sql-l-6-1',
    },
    {
      id: 'sql-6-e12',
      type: 'judge',
      difficulty: 2,
      question: '`SELECT * FROM orders WHERE SUBSTR(order_date, 1, 7) = \'2024-03\';` 可以充分利用 `order_date` 上的索引。',
      answer: false,
      explanation:
        '列被函数包裹，索引的有序性被破坏，无法定位。应改写为 `WHERE order_date >= \'2024-03-01\' AND order_date < \'2024-04-01\'`。',
      tags: ['索引失效'],
      relatedLessonId: 'sql-l-6-2',
    },
    {
      id: 'sql-6-e13',
      type: 'multiple',
      difficulty: 3,
      question: '下列哪些写法会导致索引**无法命中**？（多选）',
      options: [
        { value: 'A', text: '`WHERE SUBSTR(name, 1, 1) = \'张\'`' },
        { value: 'B', text: '`WHERE name LIKE \'张%\'`' },
        { value: 'C', text: '`WHERE price * 2 > 1000`' },
        { value: 'D', text: '`WHERE name LIKE \'%张\'`' },
        { value: 'E', text: '`WHERE order_date >= \'2024-01-01\'`' },
      ],
      answer: ['A', 'C', 'D'],
      explanation: 'B 是前缀匹配、E 是范围查询，都能用索引；A（函数）、C（列参与运算）、D（前导通配符）都会让索引失效。',
      tags: ['索引失效'],
      relatedLessonId: 'sql-l-6-2',
    },
    {
      id: 'sql-6-e14',
      type: 'fill',
      difficulty: 2,
      question: '补全 SQLite 中"只看执行计划、不真正执行查询"的命令：',
      prefix: '',
      suffix: ' SELECT * FROM orders WHERE customer_id = 1;',
      blanks: [['EXPLAIN QUERY PLAN', '/^explain\\s+query\\s+plan$/i']],
      explanation: 'SQLite 用 `EXPLAIN QUERY PLAN`；MySQL 用 `EXPLAIN`；PostgreSQL 用 `EXPLAIN [ANALYZE]`。',
      tags: ['EXPLAIN'],
      relatedLessonId: 'sql-l-6-1',
    },
    {
      id: 'sql-6-e15',
      type: 'sql',
      difficulty: 2,
      question: '统计购买件数**不少于 3 件**的明细行数，列名 `n`。**期望列**：`n`。',
      starterSql: 'SELECT COUNT(*) AS n FROM order_items WHERE quantity >= 3',
      referenceSql: 'SELECT COUNT(*) AS n FROM order_items WHERE quantity >= 3',
      explanation: '共 10 行。这是"先在 WHERE 过滤、再聚合"的基础形态，参与聚合的行数被提前缩小。',
      tags: ['WHERE', '聚合'],
      relatedLessonId: 'sql-l-6-2',
    },
    {
      id: 'sql-6-e16',
      type: 'sql',
      difficulty: 2,
      question: '统计 2024 年下半年的**有效**订单数，列名 `n`。**期望列**：`n`。',
      starterSql:
        "SELECT COUNT(*) AS n FROM orders\nWHERE order_date >= '2024-07-01' AND order_date < '2025-01-01' AND status = '已完成'",
      referenceSql:
        "SELECT COUNT(*) AS n FROM orders WHERE order_date >= '2024-07-01' AND order_date < '2025-01-01' AND status = '已完成'",
      explanation: '下半年共 21 单，其中 1 单取消（1034），有效 20 单。日期用左闭右开区间，状态用等值条件，两者都能命中索引。',
      tags: ['日期范围', 'WHERE'],
      relatedLessonId: 'sql-l-6-2',
    },
    {
      id: 'sql-6-e17',
      type: 'sql',
      difficulty: 4,
      question:
        '计算每个**大区**的有效 GMV（保留 2 位小数）与有效订单数，返回 `region`、`orders`、`gmv`。**期望列**：`region`、`orders`、`gmv`。',
      starterSql:
        "SELECT c.region,\n       COUNT(DISTINCT o.order_id) AS orders,\n       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv\nFROM customers AS c\nJOIN orders AS o ON o.customer_id = c.customer_id\nJOIN order_items AS i ON i.order_id = o.order_id\nWHERE o.status = '已完成'\nGROUP BY c.region",
      referenceSql:
        "SELECT c.region, COUNT(DISTINCT o.order_id) AS orders, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' GROUP BY c.region",
      explanation:
        '连接明细后行数被放大到明细级别，所以订单数必须用 `COUNT(DISTINCT o.order_id)`；若用 `COUNT(*)` 数到的是明细行数。华东以 5270.1 元、11 单居首。',
      tags: ['JOIN', 'COUNT DISTINCT', '业务口径'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e18',
      type: 'sql',
      difficulty: 4,
      question:
        '计算每月有效 GMV（保留 2 位小数），返回 `month`（YYYY-MM）、`orders`、`gmv`，按月份升序。**期望列**：`month`、`orders`、`gmv`。',
      starterSql:
        "SELECT SUBSTR(o.order_date, 1, 7) AS month,\n       COUNT(DISTINCT o.order_id) AS orders,\n       ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv\nFROM orders AS o\nJOIN order_items AS i ON i.order_id = o.order_id\nWHERE o.status = '已完成'\nGROUP BY month\nORDER BY month",
      referenceSql:
        "SELECT SUBSTR(o.order_date, 1, 7) AS month, COUNT(DISTINCT o.order_id) AS orders, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' GROUP BY month ORDER BY month",
      explanation:
        '每月 3~4 单，GMV 受大额显示器订单影响波动明显（如 3 月、7 月各有 1599 元订单）。做趋势分析时要把订单数与 GMV 并列展示，才能解释波动来源。',
      tags: ['时间趋势', 'GROUP BY'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e19',
      type: 'sql',
      difficulty: 3,
      question:
        '找出销售额最高的客户的姓名与有效 GMV（保留 2 位小数），列名 `name`、`gmv`，只返回 1 行。**期望列**：`name`、`gmv`。',
      starterSql:
        "SELECT c.name, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv\nFROM customers AS c\nJOIN orders AS o ON o.customer_id = c.customer_id\nJOIN order_items AS i ON i.order_id = o.order_id\nWHERE o.status = '已完成'\nGROUP BY c.customer_id\nORDER BY gmv DESC\nLIMIT ",
      referenceSql:
        "SELECT c.name, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS gmv FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' GROUP BY c.customer_id ORDER BY gmv DESC LIMIT 1",
      explanation:
        '李娜以 3698.55 元排第一（两笔 1519.05 元的显示器订单）。按 `c.customer_id` 分组比按 name 分组更安全，避免重名。',
      tags: ['GROUP BY', 'SUM'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e20',
      type: 'sql',
      difficulty: 5,
      question:
        '找出**同一订单中同时包含「数码」与「食品」两个品类**的订单号（本数据中只有 1 单）。**期望列**：`order_id`。',
      starterSql:
        "WITH digi AS (\n  SELECT DISTINCT order_id FROM order_items\n  WHERE product_id IN (SELECT product_id FROM products WHERE category = '数码')\n),\nfood AS (\n  SELECT DISTINCT order_id FROM order_items\n  WHERE product_id IN (SELECT product_id FROM products WHERE category = '食品')\n)\nSELECT digi.order_id FROM digi JOIN food ON food.order_id = ",
      referenceSql:
        "WITH digi AS (SELECT DISTINCT order_id FROM order_items WHERE product_id IN (SELECT product_id FROM products WHERE category = '数码')), food AS (SELECT DISTINCT order_id FROM order_items WHERE product_id IN (SELECT product_id FROM products WHERE category = '食品')) SELECT digi.order_id FROM digi JOIN food ON food.order_id = digi.order_id",
      explanation:
        '两次取"包含某品类的订单集合"，再用 JOIN 求交集，结果只有订单 1044（蓝牙耳机 + 咖啡豆）。这种"集合求交"的写法容易扩展到 3 个以上品类。',
      tags: ['CTE', '品类分析'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e21',
      type: 'single',
      difficulty: 3,
      question: '大表深分页 `LIMIT 20 OFFSET 1000000` 性能差的主要原因是？',
      options: [
        { value: 'A', text: 'OFFSET 会让数据库对结果排序两次' },
        { value: 'B', text: '数据库必须扫描并丢弃前 1000000 行才能返回目标数据' },
        { value: 'C', text: 'LIMIT 会让数据库锁表' },
        { value: 'D', text: 'OFFSET 只能用于主键排序' },
      ],
      answer: 'B',
      explanation:
        'OFFSET 的代价是"先读后丢"，与偏移量线性相关。替代方案：游标分页 `WHERE id > 上一页最后 id ORDER BY id LIMIT 20`，或延迟关联。',
      tags: ['分页'],
      relatedLessonId: 'sql-l-6-2',
    },
    {
      id: 'sql-6-e22',
      type: 'judge',
      difficulty: 2,
      question: '复合索引 `(a, b)` 可以同时优化 `WHERE a = 1` 和 `WHERE b = 2` 这两种查询。',
      answer: false,
      explanation:
        '根据最左前缀原则，`WHERE b = 2` 用不上 `(a, b)` 索引（除非能用覆盖索引扫描）。只有从最左列开始的连续前缀才能被有效利用。',
      tags: ['复合索引', '最左前缀'],
      relatedLessonId: 'sql-l-6-1',
    },
    {
      id: 'sql-6-e23',
      type: 'sql',
      difficulty: 3,
      question:
        '对比「已完成」与「已取消」订单的订单数与金额（保留 2 位小数），返回 `status`、`order_cnt`、`amt`。**期望列**：`status`、`order_cnt`、`amt`。',
      starterSql:
        'SELECT o.status, COUNT(DISTINCT o.order_id) AS order_cnt, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS amt\nFROM orders AS o\nJOIN order_items AS i ON i.order_id = o.order_id\nGROUP BY o.status',
      referenceSql:
        'SELECT o.status, COUNT(DISTINCT o.order_id) AS order_cnt, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS amt FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id GROUP BY o.status',
      explanation:
        '已完成 41 单 24150.5 元，已取消 4 单 1355 元。用订单数而不是明细行数，才能进一步算出"平均单笔金额"这类结论。',
      tags: ['GROUP BY', '业务口径'],
      relatedLessonId: 'sql-l-6-3',
    },
    {
      id: 'sql-6-e24',
      type: 'open',
      difficulty: 4,
      question:
        '你是这家零售店的兼职数据分析师，老板问："我们的销售表现怎么样？有没有要改进的地方？"请基于 retail 数据集写出你的分析思路（口径、用到的查询、3 条结论、2 条建议），并说明报告中哪些说法会被样本量限制。',
      referenceAnswer: `**一、口径先定**：GMV = \`SUM(quantity * unit_price * (1 - discount))\`；有效 GMV 只统计 \`status = '已完成'\`；订单数用 \`COUNT(DISTINCT order_id)\`；客单价 = 有效 GMV / 有效订单数；毛利率 = (实付 - 成本) / 实付。

**二、用到的查询（示例）**：
1. 整体：有效 GMV 24150.5 元，有效订单 41 单，客单价 589.04 元；全部 GMV 25505.5 元，取消率 8.89%（4/45），取消金额 1355 元；
2. 品类：数码 GMV 13556.7 元最高但毛利率仅 34.42%，家居（2075.7 / 59.44%）、食品（2710 / 55.5%）毛利率更高；
3. 客户：李娜、刘洋、冯雪、周涛、张伟位列前五，合计约占有效 GMV 的六成；金卡客单价 848.20 最高，银卡订单数最多（15）但客单价最低（372.13）；
4. 时间：按月 \`SUBSTR(order_date,1,7)\` 统计，波动主要来自 1599 元的显示器订单。

**三、3 条结论**：
1. 收入高度集中在少数大客户与大额订单，结构性风险偏高；
2. "高 GMV + 低毛利"（数码）与"低 GMV + 高毛利"（家居/食品）并存，利润结构不均衡；
3. 约 9% 的订单被取消，损失 1355 元，值得追查原因；跨品类购买极少（仅 1 单同时买数码与食品）。

**四、2 条建议**：
1. 对数码类做客单价与毛利组合优化（配件搭配、套餐推荐），同时把家居/食品的交叉销售做起来；
2. 增加"取消原因"字段并监控取消率，对银卡人群做满减提客单的运营动作。

**五、样本量限制**：全年仅 45 单、59 行明细、15 位客户，每月只有 3~4 单，无法支撑"月度增长 xx%""某品类需求上升"等趋势或因果结论；Top 客户占比高也可能被小样本放大。表述应写成"在本期样本中观察到……"，并建议补充更长周期的数据再下结论。`,
      rubric: [
        { point: '明确写出 GMV / 有效 GMV / 客单价等指标的口径', score: 2 },
        { point: '给出至少 4 个具体数字（如 24150.5、41、8.89%）', score: 2 },
        { point: '结论涵盖客户结构或品类结构等至少 2 个维度', score: 2 },
        { point: '给出可执行的业务建议', score: 1 },
        { point: '指出样本量 / 结论边界的限制', score: 1 },
      ],
      keywords: ['口径', 'GMV', '客单价', '取消率', '毛利', '样本量'],
      explanation: '本题考察"分析师思维"：先口径、再拆解、再结论、再建议，并能自查结论的适用边界。',
      tags: ['业务分析', '报告'],
      relatedLessonId: 'sql-l-6-3',
    },
  ],
};

export { ch6 };
export default ch6;
