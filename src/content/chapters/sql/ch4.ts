import type { Chapter } from '../../../types';

/* ============================================================
 *  第 4 章：多表连接
 * ============================================================ */

const ch4: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'sql-4',
  title: '多表连接',
  goal: '掌握 INNER/LEFT/RIGHT/FULL JOIN 的语义差异、JOIN 顺序与行数放大的识别方法，能用反连接、UNION 与子查询解决"缺失 / 对比 / 存在性"三类问题。',
  lessons: [
    {
      id: 'sql-l-4-1',
      title: 'INNER JOIN 与 LEFT JOIN：连接的本质',
      content: `
### 学习目标

学完本节，你应该能够：
1. 写出 INNER/LEFT/RIGHT/FULL 四种连接并预测行数；
2. 解释 LEFT JOIN 的 NULL 填充；
3. 用 LEFT JOIN 完成反连接。

### 前置知识

- 聚合（l3-1/3-2）与主键唯一性。

### 问题背景

JOIN 把两表按键缝合——行数会不会放大、条件写 ON 还是 WHERE，是 JOIN 的两大生死题。

### 直觉理解

INNER JOIN 是交集、LEFT JOIN 保左表——想象左手名单去右手找搭档：LEFT 保住没搭档的左手（NULL），INNER 直接丢弃。

### 核心概念与原理详解

## 连接在做什么

JOIN 的本质是**笛卡尔积 + 过滤**：先让左表每一行与右表每一行配对，留下满足 \`ON\` 条件的组合。理解这一点，所有 JOIN 的奇怪行为都可以推断出来。

\`orders\` 与 \`customers\` 通过 \`customer_id\` 关联：

\`\`\`sql
SELECT o.order_id, o.order_date, c.name, c.city
FROM orders AS o
JOIN customers AS c ON c.customer_id = o.customer_id
WHERE o.order_date >= '2024-12-01'
ORDER BY o.order_date;
\`\`\`

结果 3 行：1043 赵磊（北京）、1044 张伟（北京）、1045 陈静（杭州）。

## 语法要点

1. \`JOIN\` 是 \`INNER JOIN\` 的简写；
2. **连接条件写 \`ON\`，不要写在 \`WHERE\`**（对 INNER JOIN 效果一样，但对 LEFT JOIN 语义完全不同，见下）；
3. 每张表都起别名（\`o\`、\`c\`），列名尽量写全限定名 \`o.order_id\`，避免歧义；
4. \`USING(order_id)\` 是 \`ON a.order_id = b.order_id\` 的简写，条件列在结果集中只保留一份。

## INNER JOIN 与 LEFT JOIN 的区别

| | INNER JOIN | LEFT JOIN |
| --- | --- | --- |
| 只保留匹配的行？ | 是（左右都匹配才算） | 否，**左表全部保留** |
| 右表没匹配时 | 该行**消失** | 右表列补 \`NULL\` |
| 结果行数 | ≤ 左表 × 右表匹配数 | ≥ 左表行数 |
| 典型用途 | 只要有对应关系的明细 | 保留主表全量，附带"有无" |

<JoinDiagram kind="inner" />

<JoinDiagram kind="left" />

\`\`\`sql
-- 15 位客户，全都下过单 → 结果 15 行，陈静 4 单
SELECT c.name, COUNT(o.order_id) AS order_cnt
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
GROUP BY c.customer_id;
\`\`\`

注意这里用的是 \`COUNT(o.order_id)\` 而不是 \`COUNT(*)\`：如果某位客户没有订单，LEFT JOIN 会产生一行右表全为 NULL 的记录，\`COUNT(*)\` 会把它算成 1，而 \`COUNT(o.order_id)\` 会正确返回 0。**这是 LEFT JOIN + 聚合的必考点**。

## 最危险的错误：把右表条件从 ON 挪到 WHERE

\`\`\`sql
-- ✅ 正确：条件在 ON 里，左表全保留
SELECT c.name, o.order_id
FROM customers AS c
LEFT JOIN orders AS o
       ON o.customer_id = c.customer_id
      AND o.status = '已完成';

-- ❌ 误区：条件在 WHERE 里，LEFT JOIN 退化为 INNER JOIN
SELECT c.name, o.order_id
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.status = '已完成';
\`\`\`

第二句里，没有"已完成"订单的客户，右表列是 NULL，\`NULL = '已完成'\` 是 UNKNOWN，被 WHERE 过滤掉，于是这些客户**整体消失**——语义已经不是 LEFT JOIN 了。

> 记忆口诀：**LEFT JOIN 想保留左表，对右表的过滤条件必须写在 ON 里；对左表的过滤写在 WHERE 里。**

## RIGHT JOIN 与 FULL OUTER JOIN

- \`RIGHT JOIN\` 等价于把两张表交换后的 \`LEFT JOIN\`；
- \`FULL OUTER JOIN\` 保留两边所有行。

**重要：SQLite 直到 3.39.0（2022-06）才支持 \`RIGHT\` 与 \`FULL JOIN\`**，本课程使用的 sql.js（内置 SQLite 3.54）支持，但如果你的目标是兼容旧版 SQLite / 一些嵌入式环境，请用 \`LEFT JOIN\` + \`UNION\` 改写：

\`\`\`sql
SELECT c.name, o.order_id
FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id
UNION
SELECT c.name, o.order_id
FROM orders AS o LEFT JOIN customers AS c ON c.customer_id = o.customer_id;
\`\`\`

MySQL 不支持 \`FULL JOIN\`（需要同样手写 UNION），Oracle、PostgreSQL 支持。

## 自连接：同一张表连自己

\`\`\`sql
-- 同一城市的客户两两配对（避免重复：a.customer_id < b.customer_id）
SELECT a.name AS cust_a, b.name AS cust_b, a.city
FROM customers AS a
JOIN customers AS b
  ON a.city = b.city AND a.customer_id < b.customer_id;
\`\`\`

自连接必须给两侧**不同的别名**，并用不等式条件避免"自己和自己配对"和"重复配对"。典型用途：找同城客户、找同一订单里同时购买 A 和 B 的用户、员工-上级关系。

## 多表连接的顺序

\`\`\`sql
SELECT o.order_id, i.item_id, p.product_name
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
JOIN products    AS p ON p.product_id = i.product_id
WHERE o.order_id = 1001;
\`\`\`

三表连接是"链式"的：订单 → 明细 → 商品。**写法顺序不影响结果**（优化器会重排），但建议按"从大到小"或"按业务链路"书写，便于 review。

## 交叉连接与笛卡尔积风险

\`\`\`sql
SELECT COUNT(*) FROM customers, products;          -- 15 × 12 = 180
\`\`\`

省略 JOIN 条件（或用 \`CROSS JOIN\`）会得到**两表行数的乘积**。45 条订单 × 59 条明细 = 2655 行，聚合结果会瞬间失真。识别方法：

- 结果行数**远大于**你预期的主表行数；
- 聚合值莫名其妙地偏大；
- 检查 FROM 中是否所有表都有 \`ON\` 条件。

<SqlJoinDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO u VALUES (?,?)", [(1,"甲"),(2,"乙"),(3,"丙")])
con.execute("CREATE TABLE u (id INT, name TEXT)")
con.executemany("INSERT INTO o VALUES (?,?)", [(1,100),(1,80),(2,50)])
con.execute("CREATE TABLE o (uid INT, amt INT)")
print(con.execute("SELECT u.name, SUM(o.amt) FROM u LEFT JOIN o ON u.id=o.uid GROUP BY u.id").fetchall())
con.close()
\`\`\`

预期输出（实测）：甲 180、乙 50、丙 NULL（LEFT 保住无订单的丙）

**常见错误**：LEFT JOIN 后用 WHERE 右表条件（等于变 INNER）；连接键重复导致行数放大；把过滤条件写错位置（ON vs WHERE 语义在 LEFT 下不同）。

### 常见误区

1. JOIN 就该 1:1——键重复时笛卡尔放大，先查唯一性；
2. 反连接要 NOT EXISTS 或 LEFT JOIN+IS NULL；
3. 多表 JOIN 顺序无所谓——优化器会重排，但写清晰仍有价值。

### 知识关联

- **向前**：l-3 聚合在连接后的宽表上进行；
- **向后**：l-5 CTE 把多步 JOIN 组织成可读管道；
- **平行**：Pandas merge 的 how 四种。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| INNER | 交集，匹配才留 |
| LEFT | 保左表，右表 NULL 填充 |
| 陷阱 | 键重复放大 + ON/WHERE 位置 |

### 权威学术与标准来源

> **来源类型：经典学术原著 · 权威教材 · 国际标准 (A 类)**
> - Edgar F. Codd (1970). *A Relational Model of Data for Large Shared Data Banks*. Communications of the ACM, 13(6), 377–387. (ACM 图灵奖奠基论文 · 关系模型与代数基础)
> - Abraham Silberschatz, Henry F. Korth, & S. Sudarshan (2019). *Database System Concepts* (7th ed.). McGraw-Hill / Yale University. (第 3–5 章 SQL 核心语法与查询优化)
> - ISO/IEC 9075:2016. *Information technology — Database languages — SQL*.


### 核心图解与交互演示

<Diagram type="sqljoin" />
`,
      tips: [
        {
          kind: 'pitfall',
          text: 'LEFT JOIN 后把右表过滤条件写在 WHERE 里，会让 LEFT JOIN **退化为 INNER JOIN**。条件要写在 ON 中。',
        },
        {
          kind: 'pitfall',
          text: 'LEFT JOIN 后 `COUNT(*)` 会把"没匹配到"的那一行也算成 1，统计关联行数要用 `COUNT(右表.主键)`。',
        },
        {
          kind: 'note',
          text: 'SQLite 3.39.0（2022-06）起才支持 RIGHT JOIN / FULL OUTER JOIN；本环境（sql.js / SQLite 3.5x）可用，旧版本需用 LEFT JOIN + UNION 改写。MySQL 不支持 FULL JOIN。',
        },
        {
          kind: 'interview',
          text: '常问："LEFT JOIN 与 INNER JOIN 的区别？什么情况下两者结果相同？"  当右表对每个左表行都至少有 1 条匹配、且过滤条件不来自右表时，结果才一致。',
        },
      ],
      demos: [
        {
          title: 'INNER JOIN：订单 + 客户信息',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT o.order_id, o.order_date, c.name, c.city
FROM orders AS o
INNER JOIN customers AS c ON c.customer_id = o.customer_id
WHERE o.order_date >= '2024-11-01'
ORDER BY o.order_date`,
        },
        {
          title: 'LEFT JOIN + COUNT(右表主键)：没订单的客户应显示 0',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT c.name,
       COUNT(*) AS count_star,
       COUNT(o.order_id) AS count_orders
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
GROUP BY c.customer_id
ORDER BY count_orders ASC
LIMIT 5`,
        },
        {
          title: '条件写在 ON 与写在 WHERE 的区别',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT '条件在 ON' AS placement, COUNT(*) AS rows_cnt
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已取消'
UNION ALL
SELECT '条件在 WHERE', COUNT(*)
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.status = '已取消'`,
        },
        {
          title: '自连接：同城客户两两配对',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT a.city, a.name AS cust_a, b.name AS cust_b
FROM customers AS a
JOIN customers AS b
  ON a.city = b.city AND a.customer_id < b.customer_id
ORDER BY a.city, a.customer_id`,
        },
      ],
    },
    {
      id: 'sql-l-4-2',
      title: '行数放大、反连接与集合运算',
      content: `
### 学习目标

学完本节，你应该能够：
1. 诊断键重复导致的行数放大；
2. 用 NOT EXISTS 做安全反连接；
3. 用 UNION/INTERSECT 组合结果集。

### 前置知识

- 聚合（l3-1/3-2）与主键唯一性。

### 问题背景

JOIN 把两表按键缝合——行数会不会放大、条件写 ON 还是 WHERE，是 JOIN 的两大生死题。

### 直觉理解

INNER JOIN 是交集、LEFT JOIN 保左表——想象左手名单去右手找搭档：LEFT 保住没搭档的左手（NULL），INNER 直接丢弃。

### 核心概念与原理详解

## 行数为什么会放大

JOIN 是每行 × 每行配对，所以只要**"一"的一侧被多次匹配**，行数就会膨胀。

\`\`\`sql
-- 订单明细一对多 → 45 笔订单变成 59 行
SELECT o.order_id, i.item_id
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id;

-- 客户一对多订单 → 15 位客户变成 45 行
SELECT c.name, o.order_id
FROM customers AS c
JOIN orders AS o ON o.customer_id = c.customer_id;
\`\`\`

真实事故通常是**两张"多"的表被错误连接**：

\`\`\`sql
-- 订单（45）× 明细（59）没有用正确键关联，结果 2655 行
SELECT COUNT(*) FROM orders AS o, order_items AS i;
\`\`\`

**识别方法**：

| 检查项 | 正常 | 异常信号 |
| --- | --- | --- |
| 结果行数 vs 主表行数 | 接近主表 | 明显大于主表 × 关联表的匹配数 |
| 聚合后的总和 | 与之前核对得上 | 翻倍 / 呈倍数 |
| 是否所有 JOIN 都有 ON | 是 | 有表没写 ON |
| 关联键是否唯一 | 被引用侧唯一（主键） | 被引用侧有重复值 |

**自检 SQL**：先单独统计关联键的唯一性，再连接。

\`\`\`sql
SELECT COUNT(*) AS rows_all,
       COUNT(DISTINCT order_id) AS distinct_orders
FROM order_items;   -- 59 vs 45：说明 order_items 里 order_id 不唯一，连接会放大
\`\`\`

## 先聚合再连接：避免放大的正确姿势

如果目标是"每个客户的订单数"，不要先 JOIN 再 COUNT，而是**先在子查询里聚合，再与主表连接**：

\`\`\`sql
SELECT c.name, COALESCE(t.order_cnt, 0) AS order_cnt
FROM customers AS c
LEFT JOIN (
  SELECT customer_id, COUNT(*) AS order_cnt
  FROM orders
  GROUP BY customer_id
) AS t ON t.customer_id = c.customer_id;
\`\`\`

这样即使新增订单，也只影响子查询内部，不会让客户行翻倍。

## 反连接：找出"没有关联记录"的行

需求："找出从未下单的客户"。有 4 种写法：

**① LEFT JOIN + IS NULL（最常用）**

\`\`\`sql
SELECT c.name
FROM customers AS c
LEFT JOIN orders AS o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;
\`\`\`

**② NOT EXISTS（语义最清晰，通常性能最好）**

\`\`\`sql
SELECT c.name
FROM customers AS c
WHERE NOT EXISTS (
  SELECT 1 FROM orders AS o WHERE o.customer_id = c.customer_id
);
\`\`\`

**③ NOT IN（要小心 NULL）**

\`\`\`sql
SELECT c.name
FROM customers AS c
WHERE c.customer_id NOT IN (SELECT customer_id FROM orders);
\`\`\`

若子查询返回了 NULL，\`NOT IN\` 结果恒为空集。在 \`orders.customer_id\` 有 NOT NULL 约束时安全，否则必须加 \`WHERE customer_id IS NOT NULL\`。

**④ EXCEPT（集合差）**

\`\`\`sql
SELECT customer_id FROM customers
EXCEPT
SELECT customer_id FROM orders;
\`\`\`

| 写法 | 注意 | 推荐场景 |
| --- | --- | --- |
| LEFT JOIN ... IS NULL | 需保证 WHERE 只判断右表 | 一般 |
| NOT EXISTS | 不受 NULL 影响 | 大规模表、主子查询相关 |
| NOT IN | NULL 会"消灭"结果 | 小集合、确定无 NULL |
| EXCEPT | 自动去重 | 整数键集合差、快速排查 |

## IN 与 EXISTS 的区别

二者在大多数情况下可互换：

\`\`\`sql
SELECT name FROM customers
WHERE customer_id IN (SELECT customer_id FROM orders WHERE order_date >= '2024-12-01');

SELECT name FROM customers AS c
WHERE EXISTS (SELECT 1 FROM orders AS o
              WHERE o.customer_id = c.customer_id AND o.order_date >= '2024-12-01');
\`\`\`

差异要点：

1. **NULL 语义**：\`IN\` 遇到子查询中的 NULL 会返回 UNKNOWN；\`EXISTS\` 只判断"有没有行"，不受 NULL 影响。
2. **执行方式**：现代优化器通常会把两者改写成相近的执行计划（半连接 semi-join）；理论上 \`EXISTS\` 可以"找到第一行就停止"，\`IN\` 需要区分对待。
3. **可读性**：子查询列很多、只关心存在性时，\`EXISTS (SELECT 1 ...)\` 更明确地表达"存在即可"。
4. **对 NOT 的稳健性**：\`NOT EXISTS\` 在子查询可能含 NULL 时依然正确，\`NOT IN\` 则不然。

## UNION 与 UNION ALL

| | UNION | UNION ALL |
| --- | --- | --- |
| 是否去重 | 是 | 否 |
| 性能 | 需要排序/哈希去重，较慢 | 直接拼接，更快 |
| 适用 | 需要集合语义 | 行互不重复、追求性能 |

\`\`\`sql
SELECT city AS place FROM customers WHERE region = '华东'
UNION
SELECT region FROM customers WHERE region = '华北';
\`\`\`

UNION 的要求：**列数相同、类型兼容**；列名取自**第一个** SELECT。

> 经验：九成场景其实需要的是 \`UNION ALL\`。只有当你能确认"重复行是错误"时才用 \`UNION\`，否则既慢又可能悄悄吃掉本该保留的数据。

## 多表 JOIN 的顺序建议

1. 先连"事实表"（\`order_items\`）与维度（\`products\`），再连"头表"（\`orders\`）；
2. 越能过滤行数的条件越早写（虽然优化器会重排，但人读起来清晰）；
3. 每张表都有别名，字段都带前缀；
4. 连接键在两侧的类型一致（否则可能隐式转换、索引失效，第 6 章）。

<SqlJoinDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO u VALUES (?,?)", [(1,"甲"),(2,"乙"),(3,"丙")])
con.execute("CREATE TABLE u (id INT, name TEXT)")
con.executemany("INSERT INTO o VALUES (?,?)", [(1,100),(1,80),(2,50)])
con.execute("CREATE TABLE o (uid INT, amt INT)")
print(con.execute("SELECT u.name, SUM(o.amt) FROM u LEFT JOIN o ON u.id=o.uid GROUP BY u.id").fetchall())
con.close()
\`\`\`

预期输出（实测）：甲 180、乙 50、丙 NULL（LEFT 保住无订单的丙）

**常见错误**：LEFT JOIN 后用 WHERE 右表条件（等于变 INNER）；连接键重复导致行数放大；把过滤条件写错位置（ON vs WHERE 语义在 LEFT 下不同）。

### 常见误区

1. JOIN 就该 1:1——键重复时笛卡尔放大，先查唯一性；
2. 反连接要 NOT EXISTS 或 LEFT JOIN+IS NULL；
3. 多表 JOIN 顺序无所谓——优化器会重排，但写清晰仍有价值。

### 知识关联

- **向前**：l-3 聚合在连接后的宽表上进行；
- **向后**：l-5 CTE 把多步 JOIN 组织成可读管道；
- **平行**：Pandas merge 的 how 四种。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| INNER | 交集，匹配才留 |
| LEFT | 保左表，右表 NULL 填充 |
| 陷阱 | 键重复放大 + ON/WHERE 位置 |

### 权威学术与标准来源

> **来源类型：经典学术原著 · 权威教材 · 国际标准 (A 类)**
> - Edgar F. Codd (1970). *A Relational Model of Data for Large Shared Data Banks*. Communications of the ACM, 13(6), 377–387. (ACM 图灵奖奠基论文 · 关系模型与代数基础)
> - Abraham Silberschatz, Henry F. Korth, & S. Sudarshan (2019). *Database System Concepts* (7th ed.). McGraw-Hill / Yale University. (第 3–5 章 SQL 核心语法与查询优化)
> - ISO/IEC 9075:2016. *Information technology — Database languages — SQL*.
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`NOT IN (子查询)` 只要子查询里有 NULL，结果就是空集。不确定时改用 `NOT EXISTS`。',
        },
        {
          kind: 'performance',
          text: '`UNION` 会排序去重；不需要去重时用 `UNION ALL`，在百万行级别通常快数倍。',
        },
        {
          kind: 'leak',
          text: '最常见的口径事故：两张"多"的表 JOIN 后直接 `SUM`，金额翻倍。连接前先确认关联键在被引用侧是否唯一。',
        },
        {
          kind: 'interview',
          text: '常问："IN 和 EXISTS 有什么区别？"要点：NULL 语义（IN 会受影响、EXISTS 不会）、半连接执行、可读性，以及建议在 NOT 场景优先 EXISTS。',
        },
      ],
      demos: [
        {
          title: '行数放大：59 行明细 vs 它唯一的 45 个订单',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COUNT(*) AS rows_all,
       COUNT(DISTINCT order_id) AS distinct_orders,
       COUNT(DISTINCT product_id) AS distinct_products
FROM order_items`,
        },
        {
          title: 'LEFT JOIN 后查右表 IS NULL：反连接的判定写法',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT c.customer_id, c.name, o.order_id
FROM customers AS c
LEFT JOIN orders AS o
       ON o.customer_id = c.customer_id AND o.order_date >= '2024-12-01'
WHERE o.order_id IS NULL
ORDER BY c.customer_id
LIMIT 5`,
        },
        {
          title: 'LEFT JOIN + ON 中的额外条件：被过滤掉的右表行补 NULL',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT c.name, o.order_id, o.order_date
FROM customers AS c
LEFT JOIN orders AS o
       ON o.customer_id = c.customer_id AND o.order_date >= '2024-12-01'
WHERE c.customer_id <= 2
ORDER BY c.customer_id, o.order_date`,
        },
        {
          title: 'UNION vs UNION ALL',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT city AS place FROM customers WHERE region = '华东'
UNION ALL
SELECT region FROM customers WHERE region = '华北'`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'sql-4-e1',
      type: 'sql',
      difficulty: 1,
      question: '查询 2024 年 12 月的订单号、下单日期、客户姓名与城市。**期望列**：`order_id`、`order_date`、`name`、`city`。',
      starterSql: "SELECT o.order_id, o.order_date, c.name, c.city\nFROM orders AS o\nJOIN customers AS c ON \nWHERE o.order_date >= '2024-12-01'",
      referenceSql:
        "SELECT o.order_id, o.order_date, c.name, c.city FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id WHERE o.order_date >= '2024-12-01'",
      explanation: '标准 INNER JOIN：关联键是 `o.customer_id = c.customer_id`。12 月有 3 笔订单（1043 赵磊、1044 张伟、1045 陈静）。',
      tags: ['INNER JOIN'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e2',
      type: 'sql',
      difficulty: 2,
      question: '查询订单 1001 的所有明细：订单号、明细号、商品名。**期望列**：`order_id`、`item_id`、`product_name`。',
      starterSql: 'SELECT o.order_id, i.item_id, p.product_name\nFROM orders AS o\nJOIN order_items AS i ON i.order_id = o.order_id\nJOIN products AS p ON \nWHERE o.order_id = 1001',
      referenceSql:
        'SELECT o.order_id, i.item_id, p.product_name FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id WHERE o.order_id = 1001',
      explanation: '三表链式连接：订单 → 明细 → 商品。结果 2 行（无线蓝牙耳机、移动电源）。',
      tags: ['多表 JOIN'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e3',
      type: 'sql',
      difficulty: 2,
      question: '统计每个商品的销售件数，并按件数降序取前 3。**期望列**：`product_name`、`units`。',
      starterSql: 'SELECT p.product_name, SUM(i.quantity) AS units\nFROM order_items AS i\nJOIN products AS p ON p.product_id = i.product_id\nGROUP BY ',
      referenceSql:
        'SELECT p.product_name, SUM(i.quantity) AS units FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id GROUP BY p.product_name ORDER BY units DESC LIMIT 3',
      explanation: '前 3 名：纯棉T恤 17 件、收纳箱 14 件、咖啡豆 500g 11 件。这里 order_items 是"多"的一侧，按 product_id 分组。',
      tags: ['JOIN', 'GROUP BY'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e4',
      type: 'sql',
      difficulty: 3,
      question:
        '用 **LEFT JOIN** 找出从未下过任何订单的客户（本数据可能为空）。**期望列**：`customer_id`、`name`。',
      starterSql: 'SELECT c.customer_id, c.name\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id\nWHERE ',
      referenceSql:
        'SELECT c.customer_id, c.name FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id WHERE o.order_id IS NULL',
      allowEmpty: true,
      explanation:
        '反连接的标准写法：LEFT JOIN 后用 `右表关联键 IS NULL` 找"没匹配上"的行。retail 中 15 位客户都有订单，所以结果为空——这本身就是结论。',
      tags: ['LEFT JOIN', '反连接'],
      relatedLessonId: 'sql-l-4-2',
    },
    {
      id: 'sql-4-e5',
      type: 'sql',
      difficulty: 3,
      question:
        '用 **NOT EXISTS** 找出从未下过订单的客户（与上一题结果相同，但换一种写法）。本数据中所有客户都有订单，因此**返回空结果即正确**。**期望列**：`customer_id`、`name`。',
      starterSql: 'SELECT c.customer_id, c.name\nFROM customers AS c\nWHERE NOT EXISTS (\n  SELECT 1 FROM orders AS o WHERE \n)',
      referenceSql:
        'SELECT c.customer_id, c.name FROM customers AS c WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.customer_id)',
      allowEmpty: true,
      explanation:
        '`NOT EXISTS` 是相关子查询：对外层每一位客户，检查 `orders` 里是否存在对应订单。它不受 NULL 影响，通常性能也更好。',
      tags: ['NOT EXISTS', '相关子查询'],
      relatedLessonId: 'sql-l-4-2',
    },
    {
      id: 'sql-4-e6',
      type: 'sql',
      difficulty: 2,
      question: '用 LEFT JOIN 统计每位客户的订单数（没有订单的客户应显示 0），列名 `name`、`order_cnt`。**期望列**：`name`、`order_cnt`。',
      starterSql: 'SELECT c.name, COUNT(o.order_id) AS order_cnt\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id\nGROUP BY ',
      referenceSql:
        'SELECT c.name, COUNT(o.order_id) AS order_cnt FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id GROUP BY c.customer_id',
      explanation:
        '关键是用 `COUNT(o.order_id)` 而不是 `COUNT(*)`：没有订单时右表为 NULL，`COUNT(列)` 会跳过它得到 0。张伟 5 单最多，其余 2~4 单。',
      tags: ['LEFT JOIN', 'COUNT'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e7',
      type: 'sql',
      difficulty: 2,
      question: '查询同城客户两两配对：同一城市的不同客户对，返回各自的姓名。**期望列**：`city`、`cust_a`、`cust_b`。',
      starterSql: 'SELECT a.city, a.name AS cust_a, b.name AS cust_b\nFROM customers AS a\nJOIN customers AS b ON a.city = b.city AND ',
      referenceSql:
        'SELECT a.city, a.name AS cust_a, b.name AS cust_b FROM customers AS a JOIN customers AS b ON a.city = b.city AND a.customer_id < b.customer_id',
      explanation:
        '自连接：同一张表两个别名。`a.customer_id < b.customer_id` 同时避免了"自己配自己"和"重复配对"。北京、上海、广州各有配对。',
      tags: ['自连接'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e8',
      type: 'sql',
      difficulty: 3,
      question:
        '用 UNION ALL 统计"华东客户数"与"华北客户数"，返回两行：第一列 `label`（值为 `华东`、`华北`），第二列 `cnt`。**期望列**：`label`、`cnt`。',
      starterSql: "SELECT '华东' AS label, COUNT(*) AS cnt FROM customers WHERE region = '华东'\nUNION ALL\nSELECT '华北', COUNT(*) FROM customers WHERE region = '华北'",
      referenceSql:
        "SELECT '华东' AS label, COUNT(*) AS cnt FROM customers WHERE region = '华东' UNION ALL SELECT '华北', COUNT(*) FROM customers WHERE region = '华北'",
      explanation: '两侧都是 4。`UNION ALL` 保留所有行；如果用 `UNION`，两行的 cnt 相同但 label 不同，仍会保留——但性能更差。',
      tags: ['UNION ALL'],
      relatedLessonId: 'sql-l-4-2',
    },
    {
      id: 'sql-4-e9',
      type: 'sql',
      difficulty: 3,
      question:
        '统计状态为"已取消"的订单涉及的客户数（去重），列名 `canceled_buyer_cnt`。**期望列**：`canceled_buyer_cnt`。',
      starterSql: "SELECT COUNT(DISTINCT o.customer_id) AS canceled_buyer_cnt\nFROM orders o\nWHERE o.status = '已取消'",
      referenceSql: "SELECT COUNT(DISTINCT o.customer_id) AS canceled_buyer_cnt FROM orders AS o WHERE o.status = '已取消'",
      explanation:
        '4 笔取消订单中，客户 8（孙悦）有两笔，所以去重后是 3 位客户：1、8、14。若用 `COUNT(*)` 会得到 4——这是"不要用行数冒充人数"的典型例子。',
      tags: ['COUNT DISTINCT'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e10',
      type: 'single',
      difficulty: 2,
      question: '执行 `SELECT COUNT(*) FROM customers, products;`（customers 15 行，products 12 行，无连接条件），结果是？',
      options: [
        { value: 'A', text: '27' },
        { value: 'B', text: '15' },
        { value: 'C', text: '180' },
        { value: 'D', text: '报错：缺少连接条件' },
      ],
      answer: 'C',
      explanation:
        '逗号连接等价于 CROSS JOIN，产生笛卡尔积 15 × 12 = 180 行。SQL 不会因为缺少连接条件而报错，这正是"聚合结果莫名变大"的常见原因。',
      tags: ['笛卡尔积'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e11',
      type: 'judge',
      difficulty: 2,
      question:
        '`SELECT c.name, o.order_id FROM customers c LEFT JOIN orders o ON o.customer_id = c.customer_id WHERE o.status = \'已完成\';` 依然会保留所有客户，没有订单的客户右表列显示 NULL。',
      answer: false,
      explanation:
        '把右表的过滤条件放在 WHERE 里，会让 LEFT JOIN **退化为 INNER JOIN**：不满足条件的行（包括右表全 NULL 的行）被过滤掉。要保留左表，条件必须写在 `ON` 中。',
      tags: ['LEFT JOIN', 'ON vs WHERE'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e12',
      type: 'multiple',
      difficulty: 3,
      question: '关于 `UNION` 与 `UNION ALL`，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '`UNION` 会去除重复行' },
        { value: 'B', text: '`UNION ALL` 保留所有行，通常更快' },
        { value: 'C', text: '两侧 SELECT 的列数必须相同' },
        { value: 'D', text: '结果集的列名取自第二个 SELECT' },
        { value: 'E', text: '`UNION` 两侧的列类型必须兼容' },
      ],
      answer: ['A', 'B', 'C', 'E'],
      explanation: '结果列名取自**第一个** SELECT（D 错）。其余正确：UNION 去重、UNION ALL 更快、列数相同且类型兼容。',
      tags: ['UNION'],
      relatedLessonId: 'sql-l-4-2',
    },
    {
      id: 'sql-4-e13',
      type: 'fill',
      difficulty: 2,
      question:
        '补全语句，查询每个订单号及其包含的明细行数，并找出**明细行数 ≥ 2** 的订单（补全 `GROUP BY` 之后的条件）：',
      prefix: 'SELECT order_id, COUNT(*) AS line_cnt FROM order_items GROUP BY order_id ',
      suffix: ' 2;',
      blanks: [['HAVING COUNT(*) >=', '/^having\\s+count\\s*\\(\\s*\\*\\s*\\)\\s*>=\\s*$/i']],
      explanation: '对分组结果过滤必须用 `HAVING`。`order_items` 共 59 行、45 个订单，其中 14 个订单有 2 行明细。',
      tags: ['GROUP BY'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e14',
      type: 'sql',
      difficulty: 2,
      question: '查询每位客户的姓名与累计消费金额（仅"已完成"订单），列名 `name`、`gmv`，保留 2 位小数；没有有效订单的客户金额为 0。**期望列**：`name`、`gmv`。',
      starterSql:
        "SELECT c.name,\n       ROUND(COALESCE(SUM(CASE WHEN o.status = '已完成' THEN i.quantity * i.unit_price * (1 - i.discount) ELSE 0 END), 0), 2) AS gmv\nFROM customers AS c\nLEFT JOIN orders AS o ON o.customer_id = c.customer_id\nLEFT JOIN order_items AS i ON i.order_id = o.order_id\nGROUP BY ",
      referenceSql:
        "SELECT c.name, ROUND(COALESCE(SUM(CASE WHEN o.status = '已完成' THEN i.quantity * i.unit_price * (1 - i.discount) ELSE 0 END), 0), 2) AS gmv FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id LEFT JOIN order_items AS i ON i.order_id = o.order_id GROUP BY c.customer_id",
      explanation:
        'LEFT JOIN 两次后用 CASE 只累加已完成订单的金额，`COALESCE(..., 0)` 防止 SUM 全空时返回 NULL。这是"客户维度 + 指标"最常见的骨架。',
      tags: ['LEFT JOIN', '条件聚合'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e15',
      type: 'sql',
      difficulty: 3,
      question:
        '找出**从未被销售过**的商品（在 order_items 中不出现），用 NOT EXISTS 实现。**期望列**：`product_id`、`product_name`。',
      starterSql: 'SELECT p.product_id, p.product_name\nFROM products AS p\nWHERE NOT EXISTS (SELECT 1 FROM order_items AS i WHERE i.product_id = p.product_id)',
      referenceSql:
        'SELECT p.product_id, p.product_name FROM products AS p WHERE NOT EXISTS (SELECT 1 FROM order_items AS i WHERE i.product_id = p.product_id)',
      allowEmpty: true,
      explanation: '12 个商品全部有销售记录，结果为空。空结果在这里是有意义的答案："没有滞销商品"。',
      tags: ['NOT EXISTS', '反连接'],
      relatedLessonId: 'sql-l-4-2',
    },
    {
      id: 'sql-4-e16',
      type: 'sql',
      difficulty: 3,
      question:
        '统计每个品类（category）的有效销售件数（仅"已完成"订单），列名 `category`、`units`。**期望列**：`category`、`units`。',
      starterSql:
        "SELECT p.category, SUM(i.quantity) AS units\nFROM order_items AS i\nJOIN products AS p ON p.product_id = i.product_id\nJOIN orders AS o ON o.order_id = i.order_id\nWHERE o.status = '已完成'\nGROUP BY ",
      referenceSql:
        "SELECT p.category, SUM(i.quantity) AS units FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id JOIN orders AS o ON o.order_id = i.order_id WHERE o.status = '已完成' GROUP BY p.category",
      explanation:
        '把过滤条件放在 WHERE（INNER JOIN 的情况下没问题）。有效销售件数合计 98 件（全部 104 件减去 4 笔取消订单的 6 件），其中服装与食品最多。',
      tags: ['JOIN', 'GROUP BY'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e17',
      type: 'sql',
      difficulty: 4,
      question:
        '统计每笔订单的订单号、客户名与订单金额（金额列名 `amount`，保留 2 位小数），只返回**金额 > 1000** 的订单。**期望列**：`order_id`、`name`、`amount`。',
      starterSql:
        'SELECT o.order_id, c.name, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS amount\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nJOIN order_items AS i ON i.order_id = o.order_id\nGROUP BY o.order_id\nHAVING ',
      referenceSql:
        'SELECT o.order_id, c.name, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS amount FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id JOIN order_items AS i ON i.order_id = o.order_id GROUP BY o.order_id HAVING SUM(i.quantity * i.unit_price * (1 - i.discount)) > 1000',
      explanation:
        'JOIN 后再 GROUP BY 订单维度，HAVING 过滤组级指标。JOIN 客户表不会放大行数（客户是"一"的一侧）。结果 6 行：1027 与 1011 各 1599，1033、1003 各 1519.05，1040、1019 各 1439.1。注意整单金额超过 2000 的订单不存在——单笔订单最多两三种商品。',
      tags: ['JOIN', 'HAVING'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e18',
      type: 'single',
      difficulty: 3,
      question: '关于 `NOT IN` 与 `NOT EXISTS`，最准确的说法是？',
      options: [
        { value: 'A', text: '两者完全等价，可以随意互换' },
        { value: 'B', text: '若子查询结果包含 NULL，`NOT IN` 会返回空集，而 `NOT EXISTS` 不受影响' },
        { value: 'C', text: '`NOT EXISTS` 必须先对子查询去重' },
        { value: 'D', text: '`NOT IN` 性能永远优于 `NOT EXISTS`' },
      ],
      answer: 'B',
      explanation:
        '`x NOT IN (1, NULL)` 展开为 `x <> 1 AND x <> NULL`，后者永远是 UNKNOWN，整体不可能为 TRUE。`NOT EXISTS` 只判断"有没有行匹配"，与 NULL 无关。',
      tags: ['NOT IN', 'NOT EXISTS', 'NULL'],
      relatedLessonId: 'sql-l-4-2',
    },
    {
      id: 'sql-4-e19',
      type: 'judge',
      difficulty: 2,
      question: 'SQLite 从 3.39.0 版本开始才支持 RIGHT JOIN 与 FULL OUTER JOIN，更早的版本需要用 LEFT JOIN + UNION 改写。',
      answer: true,
      explanation:
        'SQLite 长期只支持 INNER/LEFT JOIN，3.39.0（2022 年 6 月）才加入 RIGHT 与 FULL。本课程环境（sql.js 内置 SQLite 3.5x）可以使用，但做兼容时要留意。',
      tags: ['JOIN', 'SQLite'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e20',
      type: 'sql',
      difficulty: 3,
      question:
        '统计 12 月有下单的客户姓名（用 IN 子查询实现），去重。**期望列**：`name`。',
      starterSql: "SELECT name FROM customers\nWHERE customer_id IN (SELECT customer_id FROM orders WHERE order_date >= '2024-12-01')",
      referenceSql:
        "SELECT name FROM customers WHERE customer_id IN (SELECT customer_id FROM orders WHERE order_date >= '2024-12-01')",
      explanation: '子查询返回 12 月的 3 个 customer_id（7、1、5），外层按此过滤，结果是张伟、赵磊、陈静。也可以用 `EXISTS` 或 JOIN + `DISTINCT` 得到相同结果。',
      tags: ['IN', '子查询'],
      relatedLessonId: 'sql-l-4-2',
    },
    {
      id: 'sql-4-e21',
      type: 'sql',
      difficulty: 4,
      question:
        '统计每个大区的有效订单数（"已完成"），列名 `region`、`order_cnt`，按订单数降序。**期望列**：`region`、`order_cnt`。',
      starterSql:
        "SELECT c.region, COUNT(*) AS order_cnt\nFROM orders AS o\nJOIN customers AS c ON c.customer_id = o.customer_id\nWHERE o.status = '已完成'\nGROUP BY c.region",
      referenceSql:
        "SELECT c.region, COUNT(*) AS order_cnt FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id WHERE o.status = '已完成' GROUP BY c.region",
      explanation:
        '订单表"多"、客户表"一"，连接后行数仍等于已完成的订单数（无放大）。华东最多，其后是华北、华南、西南、华中、西北。',
      tags: ['JOIN', 'GROUP BY'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e22',
      type: 'fill',
      difficulty: 2,
      question: '补全 SQL，让 LEFT JOIN 的结果只保留"订单状态为已完成"的右表记录，同时**不丢失没有订单的客户**：',
      prefix: 'SELECT c.name, o.order_id FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id ',
      suffix: "o.status = '已完成';",
      blanks: [['AND', '/^and$/i']],
      explanation: '右表的过滤条件必须用 `AND` 连接到 `ON` 子句上。如果写成 `WHERE o.status = ...`，LEFT JOIN 会退化成 INNER JOIN。',
      tags: ['LEFT JOIN', 'ON'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e23',
      type: 'sql',
      difficulty: 3,
      question:
        '找出**同时购买了 101 和 102 两种商品**的订单号。**期望列**：`order_id`。',
      starterSql: 'SELECT a.order_id\nFROM order_items AS a\nJOIN order_items AS b ON a.order_id = b.order_id\nWHERE a.product_id = 101 AND ',
      referenceSql:
        'SELECT a.order_id FROM order_items AS a JOIN order_items AS b ON a.order_id = b.order_id WHERE a.product_id = 101 AND b.product_id = 102',
      explanation:
        '自连接同一张明细表：a 行只想找 101，b 行只想找 102，两者订单号相同即"同单同时购买"。答案是订单 1030。也可以用 `GROUP BY order_id HAVING COUNT(DISTINCT product_id) = 2` 配合 IN 过滤。',
      tags: ['自连接', 'JOIN'],
      relatedLessonId: 'sql-l-4-1',
    },
    {
      id: 'sql-4-e24',
      type: 'multiple',
      difficulty: 3,
      question: '以下哪些迹象可能说明 JOIN 导致了**行数放大**？（多选）',
      options: [
        { value: 'A', text: '聚合出的销售总额比单表统计翻了一倍' },
        { value: 'B', text: '结果行数远大于主表的行数' },
        { value: 'C', text: '关联键所在列在右表中不唯一（例如 order_items.order_id）' },
        { value: 'D', text: '查询里用了表别名' },
        { value: 'E', text: '两张"多"的表之间漏写了 ON 条件' },
      ],
      answer: ['A', 'B', 'C', 'E'],
      explanation: '使用表别名与行数放大无关（D 错）。其余都是典型信号：总额翻倍、行数异常、关联键不唯一、漏写连接条件。',
      tags: ['JOIN', '行数放大'],
      relatedLessonId: 'sql-l-4-2',
    },
  ],
};

export { ch4 };
export default ch4;
