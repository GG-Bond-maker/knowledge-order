import type { Exercise, Lesson } from '../../../types';

/* ============================================================
 *  SQL 课程扩展包（二）：第 3~6 章的补充知识点与分级练习
 *
 *  约定：
 *   1. 题干 / 解析 / tips 中的行内代码用转义反引号 \`代码\`；
 *   2. referenceSql / starterSql / demo code 内部不要出现反引号；
 *   3. 每道 SQL 题必须能在 SQLite 上执行并返回结果集；
 *      若设计为空结果，题干必须写明"返回空结果即正确"；
 *   4. 题干明确列出期望列名（判分按列名对齐）。
 *
 *  难度：第 3 章 2~3；第 4 章 3~4；第 5 章 3~5；第 6 章 4~5。
 * ============================================================ */

export const sqlExtra2: {
  chapterId: string;
  lessons?: Lesson[];
  exercises: Exercise[];
}[] = [
  /* ============================================================
   *  第 3 章：聚合与分组（扩展 16 题）
   * ============================================================ */
  {
    chapterId: 'sql-3',
    lessons: [
      {
        id: 'sql-l-3-4',
        title: '聚合函数与 NULL：最容易出错的地方',
        content: `
## 聚合函数对 NULL 的处理

这是 SQL 中最容易被忽略、却直接影响结论的细节：

| 函数 | 对 NULL 的行为 |
| --- | --- |
| \`COUNT(*)\` | 统计**行数**，包含 NULL 行 |
| \`COUNT(列)\` | 统计该列**非 NULL** 的行数 |
| \`SUM(列)\` | 忽略 NULL；若全是 NULL 则返回 NULL |
| \`AVG(列)\` | 忽略 NULL，**分母是非 NULL 的行数** |
| \`MAX/MIN\` | 忽略 NULL |

### AVG 的分母陷阱

假设有 3 笔订单金额为 \`100, NULL, 200\`：

\`\`\`sql
SELECT AVG(amount) FROM orders;          -- (100+200)/2 = 150  ← 忽略了 NULL 行
SELECT SUM(amount) / COUNT(*) FROM orders; -- 300/3 = 100     ← 把 NULL 行算进分母
\`\`\`

两种写法结果完全不同。"平均每单金额"到底该用哪个，取决于业务定义：
- 若 NULL 表示"该订单金额未知" → 用 \`AVG(amount)\`（排除未知）；
- 若 NULL 表示"该订单金额为 0" → 先 \`COALESCE(amount, 0)\` 再算。

**结论：写 AVG 时一定要想清楚分母是什么。**

### SUM 返回 NULL 的情况

\`\`\`sql
SELECT SUM(amount) FROM orders WHERE 1 = 0;   -- 返回 NULL，而不是 0
\`\`\`

所以做报表时常写 \`COALESCE(SUM(amount), 0)\`。

## COUNT 的三种写法

\`\`\`sql
COUNT(*)                     -- 行数
COUNT(amount)                -- 金额非空的行数
COUNT(DISTINCT customer_id)  -- 去重后的客户数
\`\`\`

**常见错误**：用 \`COUNT(*)\` 数"有多少个客户"——如果同一客户有多个订单，会被重复计数。

## WHERE 与 HAVING 的执行顺序

\`\`\`sql
SELECT city, COUNT(*) AS n
FROM customers
WHERE region = '华东'        -- ① 分组前过滤行
GROUP BY city
HAVING COUNT(*) > 2          -- ② 分组后过滤组
ORDER BY n DESC;             -- ③ 最后排序
\`\`\`

- **WHERE 不能使用聚合函数**（此时还没分组）；
- **HAVING 可以使用聚合函数**；
- 能用 WHERE 过滤的条件尽量放 WHERE（减少参与分组的数据量，性能更好）。

## GROUP BY 的完整语义

\`GROUP BY city\` 之后，每一行代表一个城市。此时 SELECT 中只能出现：

1. 分组键（city）；
2. 聚合函数的结果；
3. 常量表达式。

\`\`\`sql
-- 错误：name 既不是分组键也不是聚合结果
SELECT city, name, COUNT(*) FROM customers GROUP BY city;
\`\`\`

SQLite 允许这种写法（会任意取一行的 name），但 MySQL 严格模式、PostgreSQL 都会报错。
**依赖这种"宽松行为"的 SQL 是不可移植的**。

## GROUP_CONCAT：分组内拼接

\`\`\`sql
SELECT category, GROUP_CONCAT(product_name, '/') AS names
FROM products GROUP BY category;
-- 数码 | 无线耳机/键盘/显示器
\`\`\`

常用于把分组内的明细拼成一行展示（注意结果长度有限制）。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '`AVG(列)` 的分母是"该列非 NULL 的行数"，不是总行数。需要"含 NULL 行"的平均值时，先 `COALESCE` 再聚合。',
          },
          {
            kind: 'pitfall',
            text: '`COUNT(*)` 数的是行数。统计"有多少客户"必须 `COUNT(DISTINCT customer_id)`，否则一客多单会被重复计数。',
          },
          {
            kind: 'interview',
            text: '"WHERE 和 HAVING 的区别"是高频面试题：WHERE 在分组前过滤行、不能用聚合函数；HAVING 在分组后过滤组、可以用聚合函数。',
          },
        ],
        demos: [
          {
            title: 'COUNT 的三种写法的差异',
            lang: 'sql',
            dataset: 'retail',
            code: "SELECT COUNT(*) AS all_rows, COUNT(member_level) AS non_null_level, COUNT(DISTINCT member_level) AS distinct_level FROM customers",
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'sql-3-x1',
        type: 'sql',
        difficulty: 2,
        dataset: 'retail',
        question:
          '统计订单表中每种状态的订单数与金额合计（金额取该状态所有订单的明细金额之和）。\n\n**期望列**：`status`、`orders_cnt`、`total_amount`',
        starterSql: '-- 提示：orders 与 order_items 关联后按 status 分组',
        referenceSql:
          "SELECT o.status AS status, COUNT(DISTINCT o.order_id) AS orders_cnt, ROUND(COALESCE(SUM(i.quantity * i.unit_price * (1 - i.discount)), 0), 2) AS total_amount FROM orders AS o LEFT JOIN order_items AS i ON i.order_id = o.order_id GROUP BY o.status ORDER BY o.status",
        explanation:
          '用 `COUNT(DISTINCT o.order_id)` 保证一单多件不被重复计数；`LEFT JOIN` 保证没有明细的订单也会被计入订单数。',
        tags: ['聚合', '分组'],
      },
      {
        id: 'sql-3-x2',
        type: 'single',
        difficulty: 2,
        question: '字段 `amount` 有 3 行为 `100, NULL, 200`，`SELECT AVG(amount) FROM t` 的结果是？',
        options: [
          { value: 'A', text: '`150`' },
          { value: 'B', text: '`100`' },
          { value: 'C', text: '`NULL`' },
          { value: 'D', text: '`300`' },
        ],
        answer: 'A',
        explanation:
          '`AVG` 忽略 NULL，分母是**非 NULL 的行数**（2），因此为 (100+200)/2 = 150。若想把 NULL 行算入分母，应写 `SUM(amount) / COUNT(*)`，结果为 100。',
        tags: ['聚合', 'NULL'],
      },
      {
        id: 'sql-3-x3',
        type: 'judge',
        difficulty: 2,
        question: '在 WHERE 子句中可以使用聚合函数，例如 `WHERE COUNT(*) > 5`。',
        answer: false,
        explanation:
          'WHERE 在分组**之前**执行，此时还没有分组，无法计算聚合值。过滤分组结果必须用 `HAVING`。',
        tags: ['WHERE', 'HAVING'],
      },
      {
        id: 'sql-3-x4',
        type: 'multiple',
        difficulty: 2,
        question: '关于 `COUNT(*)`、`COUNT(col)`、`COUNT(DISTINCT col)`，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '`COUNT(*)` 统计所有行，包括含 NULL 的行' },
          { value: 'B', text: '`COUNT(col)` 只统计该列非 NULL 的值' },
          { value: 'C', text: '`COUNT(DISTINCT col)` 统计该列去重后的非 NULL 值个数' },
          { value: 'D', text: '三者永远返回相同结果' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: '三者语义完全不同，是 SQL 中最经典的易混淆点。D 明显错误。',
        tags: ['COUNT'],
      },
      {
        id: 'sql-3-x5',
        type: 'fill',
        difficulty: 2,
        question: '按城市分组后，只保留订单数大于 3 的城市。补全关键字：\n\n```sql\nSELECT city, COUNT(*) AS n FROM orders GROUP BY city\n___ COUNT(*) > 3\n```',
        blanks: [['HAVING', 'having']],
        explanation: '分组后的过滤条件必须用 `HAVING`；`WHERE` 无法引用聚合函数。',
        tags: ['HAVING'],
      },
      {
        id: 'sql-3-x6',
        type: 'sql',
        difficulty: 2,
        dataset: 'retail',
        question:
          '统计每个大区的客户数与平均会员等级（把会员等级视为 3=金卡、2=银卡、1=普通、NULL=0，结果保留 2 位小数）。\n\n**期望列**：`region`、`customers_cnt`、`avg_level`',
        starterSql:
          '-- 提示：用 CASE WHEN 把会员等级映射成数字，再求平均',
        referenceSql:
          "SELECT region AS region, COUNT(*) AS customers_cnt, ROUND(AVG(CASE member_level WHEN '金卡' THEN 3 WHEN '银卡' THEN 2 WHEN '普通' THEN 1 ELSE 0 END), 2) AS avg_level FROM customers GROUP BY region ORDER BY region",
        explanation:
          '`AVG(CASE ... END)` 是"先映射成数字再平均"的经典写法。NULL 被映射成 0，因此不会被忽略，符合业务含义。',
        tags: ['聚合', 'CASE'],
      },
      {
        id: 'sql-3-x7',
        type: 'sql',
        difficulty: 3,
        dataset: 'retail',
        question:
          '找出**下单次数 ≥ 4 次**的客户，输出客户编号、姓名与订单数，按订单数降序、客户编号升序。\n\n**期望列**：`customer_id`、`name`、`orders_cnt`',
        starterSql: '-- 提示：GROUP BY 后使用 HAVING',
        referenceSql:
          "SELECT c.customer_id AS customer_id, c.name AS name, COUNT(o.order_id) AS orders_cnt FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.name HAVING COUNT(o.order_id) >= 4 ORDER BY orders_cnt DESC, c.customer_id",
        explanation:
          '`HAVING COUNT(o.order_id) >= 4` 过滤分组结果。也可以写别名 `HAVING orders_cnt >= 4`（SQLite/MySQL 支持，PostgreSQL 不支持），但用完整表达式可移植性更好。',
        tags: ['HAVING', '分组'],
      },
      {
        id: 'sql-3-x8',
        type: 'sql',
        difficulty: 3,
        dataset: 'retail',
        question:
          '统计各城市的**有效订单数**（只算"已完成"）、**客户数**与**销售额**，按销售额降序。\n\n**期望列**：`city`、`orders_cnt`、`buyers`、`sales`',
        starterSql: '-- 提示：orders JOIN customers JOIN order_items',
        referenceSql:
          "SELECT c.city AS city, COUNT(DISTINCT o.order_id) AS orders_cnt, COUNT(DISTINCT c.customer_id) AS buyers, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS sales FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已完成' JOIN order_items AS i ON i.order_id = o.order_id GROUP BY c.city ORDER BY sales DESC",
        explanation:
          '两个不同粒度的去重计数共存时要分别 `COUNT(DISTINCT ...)`。状态条件写在 ON 里或 WHERE 里都可以（因为这里是 INNER JOIN）。',
        tags: ['聚合', '多表'],
      },
      {
        id: 'sql-3-x9',
        type: 'single',
        difficulty: 3,
        question: '执行 `SELECT SUM(amount) FROM orders WHERE 1 = 0;` 的结果是？',
        options: [
          { value: 'A', text: '`0`' },
          { value: 'B', text: '`NULL`' },
          { value: 'C', text: '报错' },
          { value: 'D', text: '空字符串' },
        ],
        answer: 'B',
        explanation:
          '对空集合做 `SUM` 返回 NULL（而不是 0），因为"没有数据"与"和为 0"语义不同。报表中通常写 `COALESCE(SUM(amount), 0)`。',
        tags: ['聚合', 'NULL'],
      },
      {
        id: 'sql-3-x10',
        type: 'judge',
        difficulty: 2,
        question: 'SQLite 和 MySQL 都允许 `SELECT city, name, COUNT(*) FROM customers GROUP BY city` 这种写法，因此它是标准 SQL。',
        answer: false,
        explanation:
          '这违反了标准 SQL 的"SELECT 只允许分组键与聚合函数"规则。SQLite/MySQL（非严格模式）会宽松地任意取一行，PostgreSQL 与 MySQL 严格模式会直接报错。生产代码不应依赖这种宽松行为。',
        tags: ['GROUP BY', '标准'],
      },
      {
        id: 'sql-3-x11',
        type: 'sql',
        difficulty: 3,
        dataset: 'retail',
        question:
          '统计每个商品品类的：商品数、总销量、平均单价（保留 2 位小数）。只统计有销售记录的品类。\n\n**期望列**：`category`、`products_cnt`、`total_qty`、`avg_price`',
        starterSql: '-- 提示：order_items JOIN products 后按 category 分组',
        referenceSql:
          "SELECT p.category AS category, COUNT(DISTINCT p.product_id) AS products_cnt, SUM(i.quantity) AS total_qty, ROUND(AVG(i.unit_price), 2) AS avg_price FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id GROUP BY p.category ORDER BY total_qty DESC",
        explanation:
          '`AVG(i.unit_price)` 的平均单位是"明细行"，即每个商品被卖一次算一个观测值，不是按销量加权。若要销量加权平均，应写 `SUM(i.unit_price * i.quantity) / SUM(i.quantity)`，这一点常被混淆。',
        tags: ['聚合', '加权'],
      },
      {
        id: 'sql-3-x12',
        type: 'fill',
        difficulty: 3,
        question: '把每个分组内某列的值用逗号拼成一个字符串，SQLite 使用聚合函数：\n\n```sql\nSELECT category, ___(product_name, ",") FROM products GROUP BY category;\n```',
        blanks: [['GROUP_CONCAT', 'group_concat', 'STRING_AGG', 'string_agg']],
        explanation:
          'SQLite/MySQL 用 `GROUP_CONCAT`，PostgreSQL 用 `STRING_AGG`。常用于把分组内的明细拼成一行展示。',
        tags: ['聚合函数'],
      },
      {
        id: 'sql-3-x13',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '计算每个城市的**客单价**（销售额 / 去重订单数，保留 2 位小数），只统计"已完成"订单，且只保留客单价大于 200 的城市，按客单价降序。\n\n**期望列**：`city`、`aov`',
        starterSql: '-- 提示：先在子查询里按订单聚合，再按城市汇总',
        referenceSql:
          "SELECT city AS city, ROUND(SUM(order_amount) / COUNT(*), 2) AS aov FROM (SELECT o.order_id AS order_id, c.city AS city, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS order_amount FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' GROUP BY o.order_id, c.city) AS t GROUP BY city HAVING SUM(order_amount) / COUNT(*) > 200 ORDER BY aov DESC",
        explanation:
          '**两层聚合**是关键：先把明细聚合到订单粒度（避免一单多件把订单数算多），再按城市求平均。直接在明细粒度上 `SUM / COUNT(*)` 会把订单数算高、客单价算低。',
        tags: ['聚合', '客单价'],
      },
      {
        id: 'sql-3-x14',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些写法能正确统计"每个城市的客户数（去重）"？（多选）',
        options: [
          { value: 'A', text: '`SELECT city, COUNT(DISTINCT customer_id) FROM customers GROUP BY city`' },
          { value: 'B', text: '`SELECT city, COUNT(*) FROM customers GROUP BY city`（customers 表每行一个客户）' },
          { value: 'C', text: '`SELECT city, COUNT(DISTINCT order_id) FROM orders GROUP BY city`' },
          { value: 'D', text: '`SELECT city, COUNT(customer_id) FROM customers GROUP BY city`' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          '在 customers 表上，每行就是一个客户，所以 `COUNT(*)` 与 `COUNT(customer_id)` 结果相同（前提是 customer_id 非空）。C 统计的是订单数而不是客户数。',
        tags: ['COUNT', '分组'],
      },
      {
        id: 'sql-3-x15',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '找出**销售过 3 个及以上不同品类**的客户（按客户维度），输出客户编号、姓名与品类数，按品类数降序、客户编号升序。\n\n**期望列**：`customer_id`、`name`、`categories`',
        starterSql: '-- 提示：COUNT(DISTINCT p.category)',
        referenceSql:
          "SELECT c.customer_id AS customer_id, c.name AS name, COUNT(DISTINCT p.category) AS categories FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已完成' JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id GROUP BY c.customer_id, c.name HAVING COUNT(DISTINCT p.category) >= 3 ORDER BY categories DESC, c.customer_id",
        explanation:
          '需要四表关联（customers → orders → order_items → products）才能拿到品类；`COUNT(DISTINCT p.category)` 统计不同品类数。',
        tags: ['GROUP BY', '多表'],
      },
      {
        id: 'sql-3-x16',
        type: 'judge',
        difficulty: 3,
        question: '把过滤条件从 WHERE 移到 HAVING，查询结果一定相同。',
        answer: false,
        explanation:
          '只在"过滤的是非聚合列"时才可能相同。若条件涉及聚合值，只有 HAVING 能做；若条件过滤原始行，放 HAVING 会改变语义（例如按城市过滤时会变成过滤组）。此外 WHERE 先执行能减少数据量，性能更好。',
        tags: ['WHERE', 'HAVING'],
      },
    ],
  },

  /* ============================================================
   *  第 4 章：多表连接（扩展 16 题）
   * ============================================================ */
  {
    chapterId: 'sql-4',
    lessons: [
      {
        id: 'sql-l-4-6',
        title: 'JOIN 的陷阱：行数放大与条件位置',
        content: `
## INNER / LEFT / RIGHT / FULL 的本质

| 连接类型 | 保留哪些行 | SQLite 支持 |
| --- | --- | --- |
| INNER JOIN | 两侧都匹配上的行 | ✅ |
| LEFT JOIN | 左表全部 + 右表匹配上的 | ✅ |
| RIGHT JOIN | 右表全部 + 左表匹配上的 | ✅（3.39+） |
| FULL OUTER JOIN | 两侧全部 | ✅（3.39+） |
| CROSS JOIN | 笛卡尔积 | ✅ |

**核心记忆法**：LEFT JOIN 时以左表为准，右表没有匹配就补 NULL。

## 最危险的陷阱：一对多导致行数放大

\`\`\`sql
-- orders: 1 行 = 1 单；order_items: 1 行 = 1 个明细
SELECT COUNT(*) FROM orders o
JOIN order_items i ON i.order_id = o.order_id;
-- 结果不是订单数，而是明细行数！
\`\`\`

任何在 JOIN 之后执行的 \`COUNT(*)\`、\`SUM()\` 都可能在"被放大的行集"上计算：

- \`COUNT(*)\` 数的是明细行；
- 若订单表还有 \`order_fee\`（运费）字段，\`SUM(order_fee)\` 会被**重复计算 N 次**（N = 该单的明细数）。

**识别方法**：JOIN 前后各执行一次 \`SELECT COUNT(*)\`，如果变多了，就要检查是否该用 \`DISTINCT\` 或先聚合再 JOIN。

## ON 里的条件 vs WHERE 里的条件

这是 LEFT JOIN 最容易搞错的地方：

\`\`\`sql
-- 写法 A：条件在 ON 里
SELECT c.customer_id, COUNT(o.order_id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id AND o.status = '已完成'
GROUP BY c.customer_id;

-- 写法 B：条件在 WHERE 里
SELECT c.customer_id, COUNT(o.order_id)
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.status = '已完成'
GROUP BY c.customer_id;
\`\`\`

| | 结果 |
| --- | --- |
| A | 全部客户，没下过"已完成"订单的客户计数为 0 |
| B | **只有**有"已完成"订单的客户（LEFT JOIN 退化成 INNER JOIN） |

**为什么 B 会退化**：LEFT JOIN 产生的 NULL 行在 WHERE 中被 \`status = '已完成'\` 过滤掉（NULL 比较结果为 UNKNOWN，不满足条件）。

> **规则**：想保留左表全部行时，右表的过滤条件必须写在 **ON** 里。

## 反连接：找出"没有匹配"的行

\`\`\`sql
-- 方法一：LEFT JOIN + IS NULL
SELECT c.* FROM customers c
LEFT JOIN orders o ON o.customer_id = c.customer_id
WHERE o.order_id IS NULL;

-- 方法二：NOT EXISTS（推荐）
SELECT c.* FROM customers c
WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);

-- 方法三：NOT IN（注意 NULL 陷阱）
SELECT * FROM customers
WHERE customer_id NOT IN (SELECT customer_id FROM orders);
\`\`\`

**NOT IN 的陷阱**：如果子查询结果中包含 NULL，
\`x NOT IN (1, 2, NULL)\` 对任何 x 都返回 UNKNOWN → 结果为空。
因此**优先使用 NOT EXISTS**。

## 自连接

同一张表当成两张表用，常用于"找重复"、"找层级关系"：

\`\`\`sql
-- 找出与其他订单金额完全相同的订单
SELECT a.order_id, b.order_id
FROM orders a JOIN orders b
  ON a.amount = b.amount AND a.order_id < b.order_id;
\`\`\`

## UNION 与 UNION ALL

\`\`\`sql
SELECT city FROM customers
UNION            -- 去重，需要排序，较慢
SELECT region FROM customers;

SELECT city FROM customers
UNION ALL        -- 不去重，更快；列数与类型必须一致
SELECT region FROM customers;
\`\`\`

<SqlJoinDemo />
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'LEFT JOIN 后在 WHERE 里过滤右表字段，会让结果退化成 INNER JOIN（NULL 行被过滤）。要保留左表全部行，条件必须写在 ON 里。',
          },
          {
            kind: 'pitfall',
            text: 'JOIN 一对多表会让行数放大，`SUM(左表字段)` 会被重复累加。解决：先聚合再 JOIN，或用 `COUNT(DISTINCT ...)`。',
          },
          {
            kind: 'interview',
            text: '"NOT IN 和 NOT EXISTS 的区别"：NOT IN 遇到子查询中的 NULL 会返回空结果（三值逻辑），NOT EXISTS 不受影响且通常更快。',
          },
          {
            kind: 'leak',
            text: '每次写 JOIN 后顺手执行一次 `SELECT COUNT(*)` 做对账，能立刻发现行数放大问题。',
          },
        ],
        demos: [
          {
            title: 'LEFT JOIN：ON 条件与 WHERE 条件的差别',
            lang: 'sql',
            dataset: 'retail',
            code: "SELECT c.region, COUNT(o.order_id) AS done_orders FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已完成' GROUP BY c.region ORDER BY done_orders DESC",
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'sql-4-x1',
        type: 'sql',
        difficulty: 3,
        dataset: 'retail',
        question:
          '列出所有客户的姓名及其订单数（没有订单的客户订单数为 0）。\n\n**期望列**：`name`、`orders_cnt`，按订单数降序、姓名升序。',
        starterSql: '-- 提示：LEFT JOIN 保证没有订单的客户也在结果里',
        referenceSql:
          'SELECT c.name AS name, COUNT(o.order_id) AS orders_cnt FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id GROUP BY c.customer_id, c.name ORDER BY orders_cnt DESC, c.name',
        explanation:
          '这个数据集里所有客户都有订单，但写法仍应使用 LEFT JOIN + `COUNT(o.order_id)`（不能用 `COUNT(*)`，否则无订单客户会被算成 1）。',
        tags: ['LEFT JOIN'],
      },
      {
        id: 'sql-4-x2',
        type: 'single',
        difficulty: 3,
        question: '使用 LEFT JOIN 时，若希望"右表不匹配的行也参与统计"，右表的过滤条件应该写在哪里？',
        options: [
          { value: 'A', text: 'WHERE 子句' },
          { value: 'B', text: 'ON 子句' },
          { value: 'C', text: 'HAVING 子句' },
          { value: 'D', text: 'ORDER BY' },
        ],
        answer: 'B',
        explanation:
          '条件写在 WHERE 中会在 JOIN 之后过滤，把右表产生的 NULL 行也过滤掉，LEFT JOIN 退化成 INNER JOIN。写在 ON 中则只影响匹配逻辑，左表行得以保留。',
        tags: ['LEFT JOIN'],
      },
      {
        id: 'sql-4-x3',
        type: 'judge',
        difficulty: 2,
        question: '`INNER JOIN` 与 `LEFT JOIN` 在左表所有行都能匹配到右表时，结果完全相同。',
        answer: true,
        explanation:
          '当左表每一行都能在右表找到匹配时，LEFT JOIN 不会产生 NULL 补行，因此结果与 INNER JOIN 一致。差异只体现在"未匹配的左表行"上。',
        tags: ['JOIN'],
      },
      {
        id: 'sql-4-x4',
        type: 'multiple',
        difficulty: 3,
        question: '关于 JOIN 导致的行数放大，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '一方存在重复键时，JOIN 结果会变多' },
          { value: 'B', text: '放大后对左表字段做 SUM 会重复累加' },
          { value: 'C', text: '先聚合到同一粒度再 JOIN 可以避免放大' },
          { value: 'D', text: '使用 INNER JOIN 就不会放大' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'INNER JOIN 同样会放大（D 错误）。判断是否放大的通用方法是比较 JOIN 前后的行数。',
        tags: ['JOIN', '行数放大'],
      },
      {
        id: 'sql-4-x5',
        type: 'fill',
        difficulty: 3,
        question: '用左连接找出"没有匹配"的记录时，需要判断右表的关联键是否为：\n\n```sql\nWHERE o.order_id ___ NULL\n```',
        blanks: [['IS']],
        explanation: '判断 NULL 必须用 `IS NULL`，不能用 `= NULL`（结果永远是 UNKNOWN）。',
        tags: ['NULL', '反连接'],
      },
      {
        id: 'sql-4-x6',
        type: 'sql',
        difficulty: 3,
        dataset: 'retail',
        question:
          '列出 2024 年下单的客户姓名、城市与下单次数，只统计"已完成"订单，按下单次数降序、姓名升序。\n\n**期望列**：`name`、`city`、`orders_cnt`',
        starterSql: '-- 提示：INNER JOIN 即可（只关心下过单的客户）',
        referenceSql:
          "SELECT c.name AS name, c.city AS city, COUNT(o.order_id) AS orders_cnt FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id WHERE o.status = '已完成' GROUP BY c.customer_id, c.name, c.city ORDER BY orders_cnt DESC, c.name",
        explanation:
          '因为只关心"下过单的客户"，用 INNER JOIN 更直接；状态过滤放在 WHERE 也安全（不会丢左表行，因为不需要保留未下单客户）。',
        tags: ['INNER JOIN'],
      },
      {
        id: 'sql-4-x7',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '计算每个大区的销售额与订单数，要求**2024 年 1~3 月**（order_date 在 2024-01-01 到 2024-03-31 之间）且只算"已完成"订单。\n\n**期望列**：`region`、`orders_cnt`、`sales`，按销售额降序。',
        starterSql: '-- 提示：三表 JOIN + 日期范围过滤',
        referenceSql:
          "SELECT c.region AS region, COUNT(DISTINCT o.order_id) AS orders_cnt, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS sales FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' AND o.order_date BETWEEN '2024-01-01' AND '2024-03-31' GROUP BY c.region ORDER BY sales DESC",
        explanation:
          '日期是 TEXT 类型（YYYY-MM-DD），字符串比较即可正确排序；`BETWEEN` 是闭区间。注意 `COUNT(DISTINCT o.order_id)` 避免明细行让订单数翻倍。',
        tags: ['JOIN', '日期过滤'],
      },
      {
        id: 'sql-4-x8',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '找出**从未被任何订单引用**的客户编号与姓名（反连接）。当前数据中所有客户都有订单，因此**返回空结果即正确**。\n\n**期望列**：`customer_id`、`name`',
        starterSql: '-- 提示：NOT EXISTS 写法最简单',
        referenceSql:
          'SELECT c.customer_id AS customer_id, c.name AS name FROM customers AS c WHERE NOT EXISTS (SELECT 1 FROM orders AS o WHERE o.customer_id = c.customer_id)',
        explanation:
          '`NOT EXISTS` 是相关子查询：对每位客户检查是否存在订单。结果为空说明"没有从未下单的客户"，这本身就是有价值的结论。',
        tags: ['反连接', 'NOT EXISTS'],
      },
      {
        id: 'sql-4-x9',
        type: 'single',
        difficulty: 4,
        question: '`SELECT * FROM a WHERE id NOT IN (SELECT id FROM b)` 中，若 `b.id` 含 NULL，结果是？',
        options: [
          { value: 'A', text: '正常返回 a 中不在 b 里的行' },
          { value: 'B', text: '返回空结果集' },
          { value: 'C', text: '报语法错误' },
          { value: 'D', text: '返回 a 的全部行' },
        ],
        answer: 'B',
        explanation:
          '`x NOT IN (1, NULL)` 等价于 `x <> 1 AND x <> NULL`，后半部分永远是 UNKNOWN，因此整体为 UNKNOWN（非真）→ 没有行满足条件。应改用 `NOT EXISTS` 或 `NOT IN (SELECT id FROM b WHERE id IS NOT NULL)`。',
        tags: ['NOT IN', 'NULL'],
      },
      {
        id: 'sql-4-x10',
        type: 'judge',
        difficulty: 3,
        question: '`UNION` 会去除重复行，而 `UNION ALL` 不会去重、速度通常更快。',
        answer: true,
        explanation:
          '`UNION` 需要对结果排序去重，开销更大；`UNION ALL` 直接拼接。确定没有重复（或允许重复）时应优先用 `UNION ALL`。',
        tags: ['UNION'],
      },
      {
        id: 'sql-4-x11',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '统计每个客户的：订单数、购买的不同商品数、累计消费金额（只算"已完成"），按消费金额降序取前 5 名。\n\n**期望列**：`customer_id`、`name`、`orders_cnt`、`products_cnt`、`total_spent`',
        starterSql: '-- 提示：四表关联 + 三种不同的 COUNT/SUM',
        referenceSql:
          "SELECT c.customer_id AS customer_id, c.name AS name, COUNT(DISTINCT o.order_id) AS orders_cnt, COUNT(DISTINCT i.product_id) AS products_cnt, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS total_spent FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已完成' JOIN order_items AS i ON i.order_id = o.order_id GROUP BY c.customer_id, c.name ORDER BY total_spent DESC LIMIT 5",
        explanation:
          '三个指标粒度不同：订单数要 `DISTINCT order_id`、商品数要 `DISTINCT product_id`、金额直接 `SUM`。混用会导致数字错误。',
        tags: ['多表', '聚合', 'LIMIT'],
      },
      {
        id: 'sql-4-x12',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '**行数放大演示**：分别统计"订单总数"与"订单明细总数"，并计算放大倍数（明细数 / 订单数，保留 2 位小数）。\n\n**期望列**：`orders_cnt`、`items_cnt`、`ratio`',
        starterSql: '-- 提示：分别 COUNT 后再相除',
        referenceSql:
          'SELECT (SELECT COUNT(*) FROM orders) AS orders_cnt, (SELECT COUNT(*) FROM order_items) AS items_cnt, ROUND((SELECT COUNT(*) * 1.0 FROM order_items) / (SELECT COUNT(*) FROM orders), 2) AS ratio',
        explanation:
          '这道题直观展示"一单多件"造成的放大：45 笔订单对应 59 行明细，放大倍数约 1.31。如果直接 JOIN 后 `COUNT(*)`，得到的会是 59 而不是 45。',
        tags: ['行数放大'],
      },
      {
        id: 'sql-4-x13',
        type: 'fill',
        difficulty: 4,
        question: '用 `NOT EXISTS` 写反连接，补全子查询开头：\n\n```sql\nSELECT * FROM customers c\nWHERE NOT ___(SELECT 1 FROM orders o WHERE o.customer_id = c.customer_id);\n```',
        blanks: [['EXISTS', 'exists']],
        explanation: '`EXISTS` 只关心子查询是否返回至少一行，不关心具体内容，因此惯用 `SELECT 1`。',
        tags: ['EXISTS'],
      },
      {
        id: 'sql-4-x14',
        type: 'sql',
        difficulty: 5,
        dataset: 'retail',
        question:
          '找出**跨品类购买**的客户对——即两位不同客户购买过完全相同的品类集合（集合大小 ≥ 2）。输出两者的客户编号（`id1 < id2`）与品类集合字符串（用 "/" 连接，按字符串升序拼接）。\n\n**期望列**：`id1`、`id2`、`categories`',
        starterSql:
          '-- 提示：先用 GROUP_CONCAT(DISTINCT p.category) 得到每个客户的品类字符串，再自连接寻找相等',
        referenceSql:
          "WITH cate AS (SELECT c.customer_id AS cid, GROUP_CONCAT(DISTINCT p.category) AS cats, COUNT(DISTINCT p.category) AS n FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已完成' JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id GROUP BY c.customer_id HAVING COUNT(DISTINCT p.category) >= 2) SELECT a.cid AS id1, b.cid AS id2, a.cats AS categories FROM cate AS a JOIN cate AS b ON a.cats = b.cats AND a.cid < b.cid ORDER BY id1, id2",
        explanation:
          '思路：① 用 `GROUP_CONCAT(DISTINCT p.category)` 把每个客户购买过的品类集合序列化成一个字符串（需注意 GROUP_CONCAT 的顺序，SQLite 按行顺序拼接）；② 自连接找相等且 `id1 < id2` 的客户对。这是"比较集合是否相等"的经典技巧。',
        tags: ['自连接', 'CTE', '综合'],
      },
      {
        id: 'sql-4-x15',
        type: 'multiple',
        difficulty: 4,
        question: '下列哪些方式可以实现"找出 A 表中有、但 B 表中没有的记录"？（多选）',
        options: [
          { value: 'A', text: '`LEFT JOIN` 后用右表键 `IS NULL` 过滤' },
          { value: 'B', text: '`NOT EXISTS` 相关子查询' },
          { value: 'C', text: '`NOT IN` 子查询（注意 NULL）' },
          { value: 'D', text: '`INNER JOIN`' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '`INNER JOIN` 只返回"都匹配上"的行，无法得到"不匹配"的记录（D 错误）。A、B、C 都是反连接的实现方式，其中 B 最推荐。',
        tags: ['反连接'],
      },
      {
        id: 'sql-4-x16',
        type: 'sql',
        difficulty: 5,
        dataset: 'retail',
        question:
          '计算各城市的**复购率**：复购客户数 / 总活跃客户数（只算"已完成"订单，复购客户 = 下单次数 ≥ 2 的客户）。结果保留 4 位小数，输出城市、活跃客户数、复购客户数、复购率，按复购率降序。\n\n**期望列**：`city`、`buyers`、`repeat_buyers`、`repeat_rate`',
        starterSql: '-- 提示：先按 客户×城市 聚合订单数，再在外层按城市统计',
        referenceSql:
          "SELECT city AS city, COUNT(*) AS buyers, SUM(CASE WHEN n_orders >= 2 THEN 1 ELSE 0 END) AS repeat_buyers, ROUND(SUM(CASE WHEN n_orders >= 2 THEN 1 ELSE 0 END) * 1.0 / COUNT(*), 4) AS repeat_rate FROM (SELECT c.customer_id AS customer_id, c.city AS city, COUNT(DISTINCT o.order_id) AS n_orders FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已完成' GROUP BY c.customer_id, c.city) AS t GROUP BY city ORDER BY repeat_rate DESC, city",
        explanation:
          '复购率是"客户"级别的指标，必须先在**客户粒度**上算出每人订单数，再在**城市粒度**上统计。`SUM(CASE WHEN ... THEN 1 ELSE 0 END)` 是条件计数的标准写法（等价于 `COUNT(CASE WHEN ... THEN 1 END)`）。',
        tags: ['复购率', '两层聚合'],
      },
    ],
  },

  /* ============================================================
   *  第 5 章：子查询、CTE 与窗口函数（扩展 16 题）
   * ============================================================ */
  {
    chapterId: 'sql-5',
    lessons: [
      {
        id: 'sql-l-5-4',
        title: '窗口函数：分组取 TopN 与同环比',
        content: `
## 窗口函数 vs GROUP BY

| | GROUP BY | 窗口函数 |
| --- | --- | --- |
| 输出行数 | 每个分组一行 | **原表行数不变** |
| 能否保留明细 | 否 | 是 |
| 常用场景 | 汇总统计 | 排名、累计、同环比、TopN |

窗口函数的基本形态：

\`\`\`sql
函数名() OVER (
    PARTITION BY 分组列      -- 相当于"分组"，不合并行
    ORDER BY 排序列          -- 组内排序，决定"窗口"范围
    ROWS BETWEEN ...         -- 可选：限定窗口帧
)
\`\`\`

## 三种排名函数

假设某组数值为 \`100, 100, 90, 80\`：

| 函数 | 结果 | 说明 |
| --- | --- | --- |
| \`ROW_NUMBER()\` | 1, 2, 3, 4 | 连续唯一编号（并列也分先后） |
| \`RANK()\` | 1, 1, 3, 4 | 并列同名次，**跳过**后续名次 |
| \`DENSE_RANK()\` | 1, 1, 2, 3 | 并列同名次，**不跳过** |

**选哪个**：
- 取"每类前 N 名且并列都算" → \`RANK\`
- 取"每类最多 N 条记录" → \`ROW_NUMBER\`

## 经典题型：每个分组取 TopN

\`\`\`sql
WITH ranked AS (
    SELECT category, product_name, sales,
           ROW_NUMBER() OVER (PARTITION BY category ORDER BY sales DESC) AS rn
    FROM product_sales
)
SELECT category, product_name, sales
FROM ranked
WHERE rn <= 3;
\`\`\`

**必须用 CTE 或子查询包一层**，因为窗口函数在 WHERE 之后才计算，
不能直接写 \`WHERE rn <= 3\`。

## LAG / LEAD：同环比

\`\`\`sql
SELECT month, gmv,
       LAG(gmv) OVER (ORDER BY month) AS prev_gmv,
       ROUND((gmv - LAG(gmv) OVER (ORDER BY month)) * 100.0
             / LAG(gmv) OVER (ORDER BY month), 2) AS mom_pct
FROM monthly;
\`\`\`

- \`LAG(col, n, default)\`：取当前行往前第 n 行；
- \`LEAD(col, n, default)\`：往后第 n 行。

## 累计与移动平均：窗口帧

\`\`\`sql
-- 累计求和（从第一行到当前行）
SUM(amount) OVER (ORDER BY order_date ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)

-- 移动平均（当前行及前 2 行，共 3 行）
AVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 2 PRECEDING AND CURRENT ROW)
\`\`\`

**默认帧**：有 ORDER BY 但未指定 ROWS 时，默认是 \`RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW\`，
即"从第一行到当前行（含并列值）"，这会导致累计求和在遇到相同排序值时重复计算——**明确写 ROWS 更安全**。

## NTILE：等分桶

\`\`\`sql
SELECT customer_id, total_spent,
       NTILE(4) OVER (ORDER BY total_spent DESC) AS quartile
FROM customer_spend;
\`\`\`

把客户按消费额分成 4 桶（1 = 最高 25%），是做分层运营的常用手段。

<RollingWindowDemo />
`,
        tips: [
          {
            kind: 'pitfall',
            text: '窗口函数在 WHERE 之后执行，不能直接 `WHERE rn <= 3`。必须用 CTE/子查询包一层，在外层过滤。',
          },
          {
            kind: 'pitfall',
            text: '`SUM() OVER (ORDER BY ...)` 不指定 ROWS 时默认帧包含"所有并列值"，遇到重复排序键会出现重复计算。需要严格逐行累计时写 `ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`。',
          },
          {
            kind: 'interview',
            text: '"ROW_NUMBER / RANK / DENSE_RANK 的区别"是必考题：并列时 ROW_NUMBER 仍分先后，RANK 跳号，DENSE_RANK 不跳号。',
          },
          {
            kind: 'leak',
            text: '用 CTE 把多步逻辑拆开，每一步都可单独 SELECT 验证，比写一个巨大嵌套子查询更容易调试。',
          },
        ],
        demos: [
          {
            title: '每日订单与环比（LAG）',
            lang: 'sql',
            dataset: 'retail',
            code: "SELECT order_date, daily_cnt, LAG(daily_cnt) OVER (ORDER BY order_date) AS prev_cnt FROM (SELECT order_date, COUNT(*) AS daily_cnt FROM orders GROUP BY order_date) ORDER BY order_date",
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'sql-5-x1',
        type: 'sql',
        difficulty: 3,
        dataset: 'retail',
        question:
          '给每笔订单按日期排序编号（从 1 开始），输出订单号、日期与行号。\n\n**期望列**：`order_id`、`order_date`、`rn`',
        starterSql: '-- 提示：ROW_NUMBER() OVER (ORDER BY order_date)',
        referenceSql:
          'SELECT order_id AS order_id, order_date AS order_date, ROW_NUMBER() OVER (ORDER BY order_date, order_id) AS rn FROM orders ORDER BY rn',
        explanation:
          '`ROW_NUMBER() OVER (ORDER BY ...)` 按指定顺序生成连续编号。加上 `order_id` 作为第二排序键，保证同一天内编号确定。',
        tags: ['窗口函数', 'ROW_NUMBER'],
      },
      {
        id: 'sql-5-x2',
        type: 'judge',
        difficulty: 2,
        question: '窗口函数不会改变结果集的行数，而 GROUP BY 会把每个分组压缩成一行。',
        answer: true,
        explanation:
          '这是两者最本质的区别。窗口函数在保留原始行的同时，为每行附加一个"组内计算值"。',
        tags: ['窗口函数'],
      },
      {
        id: 'sql-5-x3',
        type: 'single',
        difficulty: 3,
        question: '某组数值为 `100, 100, 90`，使用 `RANK()` 与 `DENSE_RANK()` 得到的名次分别是？',
        options: [
          { value: 'A', text: '`RANK: 1,2,3`；`DENSE_RANK: 1,2,3`' },
          { value: 'B', text: '`RANK: 1,1,3`；`DENSE_RANK: 1,1,2`' },
          { value: 'C', text: '`RANK: 1,1,2`；`DENSE_RANK: 1,1,3`' },
          { value: 'D', text: '两者都返回 `1,2,3`' },
        ],
        answer: 'B',
        explanation:
          '`RANK` 遇到并列跳号（1,1,3）；`DENSE_RANK` 不跳号（1,1,2）；`ROW_NUMBER` 则强行区分（1,2,3）。',
        tags: ['排名函数'],
      },
      {
        id: 'sql-5-x4',
        type: 'multiple',
        difficulty: 3,
        question: '关于窗口函数，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '`PARTITION BY` 相当于分组，但不合并行' },
          { value: 'B', text: '可以直接在 WHERE 中过滤窗口函数的结果列' },
          { value: 'C', text: '`LAG` 可以取当前行之前的某行数据' },
          { value: 'D', text: '窗口函数常与 CTE 配合实现 TopN' },
        ],
        answer: ['A', 'C', 'D'],
        explanation:
          '窗口函数在 WHERE 之后计算，因此不能直接 `WHERE rn <= 3`，必须用 CTE/子查询包一层（B 错误）。',
        tags: ['窗口函数'],
      },
      {
        id: 'sql-5-x5',
        type: 'fill',
        difficulty: 3,
        question: '取每个城市销售额最高的前 3 名客户，补全窗口函数：\n\n```sql\nSELECT * FROM (\n  SELECT city, customer_id, total,\n         ROW_NUMBER() OVER (PARTITION BY city ORDER BY total DESC) AS ___\n  FROM t\n) WHERE rn <= 3;\n```',
        blanks: [['rn', 'rank_no', 'rnk']],
        explanation:
          '给窗口列起别名后在**外层**过滤。这是"分组 TopN"的标准模板，几乎所有 SQL 面试都会考。',
        tags: ['TopN'],
      },
      {
        id: 'sql-5-x6',
        type: 'sql',
        difficulty: 3,
        dataset: 'retail',
        question:
          '计算每个城市的订单数，并给出按订单数降序的排名（并列使用 DENSE_RANK）。\n\n**期望列**：`city`、`orders_cnt`、`rank_no`',
        starterSql: '-- 提示：先按城市聚合，再对结果使用 DENSE_RANK()',
        referenceSql:
          'SELECT city AS city, orders_cnt AS orders_cnt, DENSE_RANK() OVER (ORDER BY orders_cnt DESC) AS rank_no FROM (SELECT c.city AS city, COUNT(o.order_id) AS orders_cnt FROM customers AS c JOIN orders AS o ON o.customer_id = c.customer_id GROUP BY c.city) AS t ORDER BY rank_no, city',
        explanation:
          '窗口函数的计算对象是**子查询的结果行**，所以要先聚合再排名。如果直接在外层用 `COUNT(...) OVER (...)` 会把行数算错。',
        tags: ['DENSE_RANK', '聚合'],
      },
      {
        id: 'sql-5-x7',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '找出**每个大区销售额最高的那笔订单**，输出大区、订单号与销售额（若并列取订单号较小者）。\n\n**期望列**：`region`、`order_id`、amount',
        starterSql: '-- 提示：先把订单聚合到订单粒度，再用 ROW_NUMBER 分区排名',
        referenceSql:
          "WITH order_amt AS (SELECT o.order_id AS order_id, c.region AS region, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS amount FROM orders AS o JOIN customers AS c ON c.customer_id = o.customer_id JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' GROUP BY o.order_id, c.region), ranked AS (SELECT region, order_id, ROUND(amount, 2) AS amount, ROW_NUMBER() OVER (PARTITION BY region ORDER BY amount DESC, order_id) AS rn FROM order_amt) SELECT region AS region, order_id AS order_id, amount AS amount FROM ranked WHERE rn = 1 ORDER BY region",
        explanation:
          '两步 CTE：① 明细 → 订单粒度金额（必须先聚合，否则一单多件会让"销售额"变成明细金额）；② 按大区排名取第一名。`ORDER BY amount DESC, order_id` 保证并列时结果确定。',
        tags: ['TopN', 'CTE'],
      },
      {
        id: 'sql-5-x8',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '统计每个月的订单数，并用 `LAG` 计算与上月的差值（`cnt_diff`）。2004 年之前的月份没有上月，差值应为 NULL。输出月份升序。\n\n**期望列**：`month`、`orders_cnt`、`cnt_diff`',
        starterSql: "SELECT strftime('%Y-%m', order_date) 作为 month，COUNT(*)，LAG(...)",
        referenceSql:
          "SELECT month AS month, orders_cnt AS orders_cnt, orders_cnt - LAG(orders_cnt) OVER (ORDER BY month) AS cnt_diff FROM (SELECT strftime('%Y-%m', order_date) AS month, COUNT(*) AS orders_cnt FROM orders GROUP BY month) AS t ORDER BY month",
        explanation:
          '`strftime("%Y-%m", order_date)` 把日期截断到月；`LAG(...) OVER (ORDER BY month)` 取上一行（即上月）的值。第一个月的 `LAG` 结果自然为 NULL，所以差值为 NULL，符合预期。',
        tags: ['LAG', '同比'],
      },
      {
        id: 'sql-5-x9',
        type: 'single',
        difficulty: 4,
        question: '为什么"分组取 TopN"必须用 CTE/子查询包一层，而不能直接在 WHERE 中过滤 `rn`？',
        options: [
          { value: 'A', text: '因为 `rn` 是保留字' },
          { value: 'B', text: '因为窗口函数在 WHERE 之后才执行，无法在 WHERE 中引用' },
          { value: 'C', text: '因为 SQLite 不支持窗口函数' },
          { value: 'D', text: '因为 CTE 性能更好' },
        ],
        answer: 'B',
        explanation:
          'SQL 的逻辑执行顺序是 FROM → WHERE → GROUP BY → HAVING → **窗口函数** → SELECT → ORDER BY → LIMIT。窗口函数晚于 WHERE，所以必须在外层过滤。',
        tags: ['窗口函数', '执行顺序'],
      },
      {
        id: 'sql-5-x10',
        type: 'fill',
        difficulty: 4,
        question: '计算"当前行及前 2 行"的移动平均，补全窗口帧：\n\n```sql\nAVG(amount) OVER (ORDER BY order_date ROWS BETWEEN 2 ___ AND CURRENT ROW)\n```',
        blanks: [['PRECEDING', 'preceding']],
        explanation:
          '`n PRECEDING` 表示往前 n 行；对应有 `n FOLLOWING`。这对实现"近 3 日移动平均"至关重要。',
        tags: ['窗口帧'],
      },
      {
        id: 'sql-5-x11',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '计算累计销售额：按订单日期升序，累加到当前订单为止的销售额（每个订单先汇总金额）。\n\n**期望列**：`order_id`、`order_date`、order_amt、`running_total`',
        starterSql: '-- 提示：SUM() OVER (ORDER BY ... ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)',
        referenceSql:
          "WITH order_amt AS (SELECT o.order_id AS order_id, o.order_date AS order_date, ROUND(SUM(i.quantity * i.unit_price * (1 - i.discount)), 2) AS order_amt FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' GROUP BY o.order_id, o.order_date) SELECT order_id AS order_id, order_date AS order_date, order_amt AS order_amt, ROUND(SUM(order_amt) OVER (ORDER BY order_date, order_id ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 2) AS running_total FROM order_amt ORDER BY order_date, order_id",
        explanation:
          '先在订单粒度算好金额，再用累计窗口求和。**明确写 `ROWS BETWEEN ...`** 可以避免默认 RANGE 帧在日期并列时重复累计的问题。',
        tags: ['窗口函数', '累计'],
      },
      {
        id: 'sql-5-x12',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '用 `NTILE(2)` 把客户按累计消费金额分成两档（1 = 高消费，2 = 低消费），输出客户编号、姓名、消费金额与档次。\n\n**期望列**：`customer_id`、`name`、total_spent、`tier`',
        starterSql: '-- 提示：NTILE(2) OVER (ORDER BY ... DESC)',
        referenceSql:
          "WITH spent AS (SELECT c.customer_id AS customer_id, c.name AS name, ROUND(COALESCE(SUM(i.quantity * i.unit_price * (1 - i.discount)), 0), 2) AS total_spent FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已完成' LEFT JOIN order_items AS i ON i.order_id = o.order_id GROUP BY c.customer_id, c.name) SELECT customer_id AS customer_id, name AS name, total_spent AS total_spent, NTILE(2) OVER (ORDER BY total_spent DESC, customer_id) AS tier FROM spent ORDER BY tier, total_spent DESC",
        explanation:
          '`NTILE(n)` 把结果按顺序尽量均分成 n 桶。注意 `ORDER BY total_spent DESC, customer_id` 加上唯一键，保证分桶结果确定可复现。',
        tags: ['NTILE', '分层'],
      },
      {
        id: 'sql-5-x13',
        type: 'judge',
        difficulty: 4,
        question: '`SUM(x) OVER (ORDER BY d)` 与 `SUM(x) OVER (ORDER BY d ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)` 在任何情况下结果都相同。',
        answer: false,
        explanation:
          '未指定 ROWS 时默认是 `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`，它会把**排序值相同的所有行**一起纳入窗口。当 `d` 有重复值时，两种写法结果不同；只有 `d` 唯一时才相同。',
        tags: ['窗口帧'],
      },
      {
        id: 'sql-5-x14',
        type: 'sql',
        difficulty: 5,
        dataset: 'retail',
        question:
          '找出**每个品类中销量最高的商品**，输出品类、商品名与销量（并列取商品编号较小者）。\n\n**期望列**：`category`、`product_name`、total_qty`',
        starterSql: '-- 提示：先按 品类×商品 聚合销量，再 ROW_NUMBER 分区',
        referenceSql:
          "WITH qty AS (SELECT p.category AS category, p.product_id AS product_id, p.product_name AS product_name, SUM(i.quantity) AS total_qty FROM order_items AS i JOIN products AS p ON p.product_id = i.product_id GROUP BY p.category, p.product_id, p.product_name), ranked AS (SELECT category, product_name, total_qty, ROW_NUMBER() OVER (PARTITION BY category ORDER BY total_qty DESC, product_id) AS rn FROM qty) SELECT category AS category, product_name AS product_name, total_qty AS total_qty FROM ranked WHERE rn = 1 ORDER BY category",
        explanation:
          '标准"分组 TopN（n=1）"模板。注意 ORDER BY 里加上 `product_id` 作为并列时的确定性排序键，否则并列时返回哪一条是不可预测的。',
        tags: ['TopN', '综合'],
      },
      {
        id: 'sql-5-x15',
        type: 'multiple',
        difficulty: 4,
        question: '关于 CTE（WITH 子句），下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '把复杂查询拆成多个命名步骤，提升可读性' },
          { value: 'B', text: '一个 WITH 可以定义多个 CTE，用逗号分隔' },
          { value: 'C', text: 'CTE 可以被后面的多个查询引用' },
          { value: 'D', text: 'CTE 一定比子查询性能更好' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'CTE 的主要价值是可读性与复用，性能取决于数据库优化器（多数会内联展开），不能笼统说"必定更快"（D 错误）。',
        tags: ['CTE'],
      },
      {
        id: 'sql-5-x16',
        type: 'sql',
        difficulty: 5,
        dataset: 'retail',
        question:
          '计算每个客户的**首单日期**与**末单日期**，以及两次下单间隔天数（末单 - 首单）。只统计"已完成"订单。\n\n**期望列**：`customer_id`、first_order、last_order、`span_days`',
        starterSql: '-- 提示：MIN/MAX 加 julianday 计算天数差',
        referenceSql:
          "SELECT o.customer_id AS customer_id, MIN(o.order_date) AS first_order, MAX(o.order_date) AS last_order, CAST(julianday(MAX(o.order_date)) - julianday(MIN(o.order_date)) AS INTEGER) AS span_days FROM orders AS o WHERE o.status = '已完成' GROUP BY o.customer_id ORDER BY span_days DESC, customer_id",
        explanation:
          '`MIN/MAX` 取首末日期；SQLite 用 `julianday()` 转成儒略日再相减得到天数差（整数需 `CAST ... AS INTEGER`）。MySQL 中可直接 `DATEDIFF(last_order, first_order)`。',
        tags: ['日期函数', '聚合'],
      },
    ],
  },

  /* ============================================================
   *  第 6 章：查询优化与实战（扩展 14 题）
   * ============================================================ */
  {
    chapterId: 'sql-6',
    lessons: [
      {
        id: 'sql-l-6-4',
        title: '索引、执行计划与查询优化',
        content: `
## 索引是什么

索引就像书的目录：没有目录时找一页要翻完整本书（全表扫描），有目录可以直接跳到目标页（索引查找）。

数据库最常用的是 **B+ 树索引**：

- 数据按索引键有序排列；
- 查找复杂度从 O(n) 降到 O(log n)；
- 支持范围查询（\`BETWEEN\`、\`>\`）与排序。

## 建索引的收益与代价

| 收益 | 代价 |
| --- | --- |
| 加速 WHERE 过滤 | 占用额外存储 |
| 加速 JOIN 关联 | 插入/更新/删除时要同步维护 |
| 加速 ORDER BY（避免排序） | 索引选择不当会拖慢写入 |

**原则**：给"高频出现在 WHERE / JOIN / ORDER BY 中的列"建索引，而不是给所有列都建。

## 让索引失效的常见写法

这是查询优化最核心的知识点：

| 写法 | 为什么失效 |
| --- | --- |
| \`WHERE YEAR(created_at) = 2024\` | 列上用了函数 → 改用范围：\`created_at >= '2024-01-01' AND created_at < '2025-01-01'\` |
| \`WHERE id + 1 = 100\` | 列参与了运算 |
| \`WHERE name LIKE '%张%'\` | 前置通配符无法利用有序性 |
| \`WHERE id = '123'\`（id 是整数） | 隐式类型转换，导致索引失效或全扫描 |
| \`WHERE a = 1 OR b = 2\` | 若 b 无索引，可能退化为全表扫描 |

**记忆法**：**索引列必须"干净地"单独出现在比较的一侧。**

## 看执行计划

SQLite：

\`\`\`sql
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE customer_id = 1;
\`\`\`

关注 SCAN（全表扫描）与 SEARCH（索引查找）的区别：

- \`SCAN orders\` → 全表扫描，数据量大时慢；
- \`SEARCH orders USING INDEX idx_customer ON customer_id=?\` → 走索引，快。

MySQL 用 \`EXPLAIN\`，关注 \`type\`（\`ALL\` 最差、\`ref\`/\`range\` 较好、\`const\`/\`eq_ref\` 最好）与 \`key\`（实际使用的索引）。

## 四个高频优化手段

### 1. 列裁剪：不要 SELECT *

\`\`\`sql
SELECT * FROM orders;            -- 传输多余列，可能无法走覆盖索引
SELECT order_id, order_date FROM orders;   -- 只取需要的列
\`\`\`

### 2. 先过滤再 JOIN

把能减少数据量的条件尽量前移：

\`\`\`sql
-- 较差：先关联全部数据再过滤
SELECT * FROM orders o JOIN items i ON i.order_id = o.order_id
WHERE o.order_date >= '2024-01-01';

-- 较好：先在子查询里过滤
SELECT * FROM (SELECT * FROM orders WHERE order_date >= '2024-01-01') o
JOIN items i ON i.order_id = o.order_id;
\`\`\`

### 3. 大偏移量分页的优化

\`\`\`sql
-- 深分页：OFFSET 1000000 要扫描并丢弃前 100 万行
SELECT * FROM orders ORDER BY order_id LIMIT 20 OFFSET 1000000;

-- 优化：用游标（记住上一页最后一个键）
SELECT * FROM orders WHERE order_id > 1000000 ORDER BY order_id LIMIT 20;
\`\`\`

### 4. 聚合前先收敛数据

先在子查询里过滤/聚合，再与其它表关联，避免在大结果集上做 GROUP BY。

## 反模式清单

- \`SELECT *\` 全列查询；
- 在 WHERE 中对索引列做函数运算；
- 用 \`NOT IN\` 处理可能含 NULL 的子查询；
- 大表 JOIN 时没有关联键索引；
- 在循环中执行查询（N+1 问题）——应改为批量查询。
`,
        tips: [
          {
            kind: 'performance',
            text: '索引列上做函数运算（`YEAR(col)`、`col + 1`）会让索引失效。改写为对列直接做范围比较。',
          },
          {
            kind: 'pitfall',
            text: '`LIKE "%关键字%"` 无法利用普通 B+ 树索引（前置通配符）。全文检索应使用专门的搜索引擎或倒排索引。',
          },
          {
            kind: 'leak',
            text: '深分页（`OFFSET` 很大）性能极差，用"记住上一页最后一个主键"的游标分页替代，可以稳定走索引。',
          },
          {
            kind: 'interview',
            text: '"如何优化一条慢查询"的答法：看执行计划 → 检查是否走索引 → 列裁剪 → 条件前移 → 避免函数与隐式转换 → 考虑索引覆盖或改写为游标分页。',
          },
        ],
        demos: [
          {
            title: '查看执行计划',
            lang: 'sql',
            dataset: 'retail',
            code: 'EXPLAIN QUERY PLAN SELECT o.order_id, i.product_id FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = \'已完成\'',
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'sql-6-x1',
        type: 'single',
        difficulty: 4,
        question: '下列哪种写法最可能导致索引失效？',
        options: [
          { value: 'A', text: '`WHERE created_at >= "2024-01-01"`' },
          { value: 'B', text: '`WHERE YEAR(created_at) = 2024`' },
          { value: 'C', text: '`WHERE status = "已完成"`' },
          { value: 'D', text: '`WHERE amount > 100`' },
        ],
        answer: 'B',
        explanation:
          '在索引列上使用函数（`YEAR(...)`）会让数据库无法直接利用索引有序性，只能逐行计算。应改写为范围条件：`created_at >= "2024-01-01" AND created_at < "2025-01-01"`。',
        tags: ['索引', '优化'],
      },
      {
        id: 'sql-6-x2',
        type: 'judge',
        difficulty: 4,
        question: '在表上建立的索引越多，查询一定越快。',
        answer: false,
        explanation:
          '索引能加速查询，但会增加存储开销，并在 INSERT/UPDATE/DELETE 时同步维护，拖慢写入。此外优化器可能选错索引。应按实际查询模式建立少量高效索引。',
        tags: ['索引'],
      },
      {
        id: 'sql-6-x3',
        type: 'multiple',
        difficulty: 4,
        question: '下列哪些是有效的查询优化手段？（多选）',
        options: [
          { value: 'A', text: '只 SELECT 需要的列，而不是 `SELECT *`' },
          { value: 'B', text: '把能减少数据量的过滤条件尽量前移' },
          { value: 'C', text: '在 WHERE 中给每个列都套上函数以便统一格式' },
          { value: 'D', text: '深分页改用"基于上一页最后主键"的游标方式' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 恰好是反模式——在索引列上套函数会导致索引失效。A、B、D 都是标准优化手段。',
        tags: ['优化'],
      },
      {
        id: 'sql-6-x4',
        type: 'fill',
        difficulty: 4,
        question: '查看查询执行计划，SQLite 使用命令：\n\n```sql\n___ QUERY PLAN SELECT * FROM orders WHERE customer_id = 1;\n```',
        blanks: [['EXPLAIN', 'explain']],
        explanation:
          '`EXPLAIN QUERY PLAN` 输出每个表的扫描方式（SCAN = 全表扫描，SEARCH = 索引查找）以及使用的索引，是排查慢查询的第一步。',
        tags: ['执行计划'],
      },
      {
        id: 'sql-6-x5',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '**大偏移量分页**：按订单号升序，取第 21~30 条订单（每页 10 条）。请用"游标分页"思路实现：先查出前 20 条的最后一条订单号，再从这个订单号之后取 10 条。\n\n**期望列**：`order_id`、`order_date`、`status`（按 order_id 升序）',
        starterSql: '-- 提示：WHERE order_id > (上一页最后一条) ORDER BY order_id LIMIT 10',
        referenceSql:
          'SELECT order_id AS order_id, order_date AS order_date, status AS status FROM orders WHERE order_id > (SELECT order_id FROM orders ORDER BY order_id LIMIT 1 OFFSET 19) ORDER BY order_id LIMIT 10',
        explanation:
          '传统的 `LIMIT 10 OFFSET 20` 需要扫描并丢弃前 20 行；数据量大时（OFFSET 百万级）极慢。游标分页先定位到"上一页最后一条的键"，再 `WHERE key > ?` 直接走索引，偏移量多大都不影响性能。',
        tags: ['分页', '优化'],
      },
      {
        id: 'sql-6-x6',
        type: 'sql',
        difficulty: 4,
        dataset: 'retail',
        question:
          '**列裁剪与去重**：查询 2024 年 3 月的所有订单号与日期（不取其它列），按日期升序、订单号升序。\n\n**期望列**：`order_id`、`order_date`',
        starterSql: '-- 提示：只 SELECT 需要的列',
        referenceSql:
          "SELECT order_id AS order_id, order_date AS order_date FROM orders WHERE order_date >= '2024-03-01' AND order_date < '2024-04-01' ORDER BY order_date, order_id",
        explanation:
          '用左闭右开区间（`>= 3-01 AND < 4-01`）而不是 `BETWEEN ... AND 3-31`，可以正确处理带时分秒的日期字段，也能利用索引。',
        tags: ['优化', '日期过滤'],
      },
      {
        id: 'sql-6-x7',
        type: 'single',
        difficulty: 4,
        question: '`EXPLAIN QUERY PLAN` 输出中出现 `SCAN orders` 意味着什么？',
        options: [
          { value: 'A', text: '使用了索引查找，性能良好' },
          { value: 'B', text: '对 orders 表进行了全表扫描，数据量大时需要关注' },
          { value: 'C', text: '查询没有返回结果' },
          { value: 'D', text: '语法错误' },
        ],
        answer: 'B',
        explanation:
          '`SCAN` 表示全表扫描（逐行检查），`SEARCH ... USING INDEX` 表示走了索引。大表出现 SCAN 通常意味着需要检查过滤条件是否能用上索引。',
        tags: ['执行计划'],
      },
      {
        id: 'sql-6-x8',
        type: 'judge',
        difficulty: 4,
        question: '`SELECT *` 只在开发调试时用，生产查询应显式列出需要的列。',
        answer: true,
        explanation:
          '显式列可以减少网络传输与内存占用，并且更容易实现"覆盖索引"（索引中已包含所需的全部列，无需回表），性能更好。',
        tags: ['优化'],
      },
      {
        id: 'sql-6-x9',
        type: 'sql',
        difficulty: 5,
        dataset: 'retail',
        question:
          '**综合业务分析**：输出 2024 年每个月的：订单数、销售额、下单客户数、客单价（销售额/订单数，保留 2 位小数），只统计"已完成"订单，按月份升序。\n\n**期望列**：`month`、orders_cnt、`sales`、`buyers`、`aov`',
        starterSql: '-- 提示：先聚合到订单粒度再算客单价，避免一单多件导致订单数虚高',
        referenceSql:
          "WITH o_amt AS (SELECT o.order_id AS order_id, strftime('%Y-%m', o.order_date) AS month, o.customer_id AS customer_id, SUM(i.quantity * i.unit_price * (1 - i.discount)) AS amount FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id WHERE o.status = '已完成' GROUP BY o.order_id, month, o.customer_id) SELECT month AS month, COUNT(*) AS orders_cnt, ROUND(SUM(amount), 2) AS sales, COUNT(DISTINCT customer_id) AS buyers, ROUND(SUM(amount) / COUNT(*), 2) AS aov FROM o_amt GROUP BY month ORDER BY month",
        explanation:
          '这是最典型的月度经营报表。关键点：① 先把明细聚合到**订单粒度**，这样 `COUNT(*)` 才是订单数、`SUM / COUNT(*)` 才是真实客单价；② 月份用 `strftime` 截断；③ 只统计已完成订单。',
        tags: ['综合', '经营分析'],
      },
      {
        id: 'sql-6-x10',
        type: 'sql',
        difficulty: 5,
        dataset: 'retail',
        question:
          '**客户价值分层**：按客户累计消费额用 `NTILE(3)` 分成 Value1（最高）、Value2、Value3 三档，输出各档的：客户数、平均消费额、平均订单数，按档位升序。\n\n**期望列**：`tier`、`customers`、`avg_spent`、`avg_orders`',
        starterSql:
          '-- 提示：先算每个客户的消费额与订单数，再用 NTILE 分档，最后按档聚合',
        referenceSql:
          "WITH per_customer AS (SELECT c.customer_id AS cid, COUNT(DISTINCT o.order_id) AS n_orders, COALESCE(SUM(i.quantity * i.unit_price * (1 - i.discount)), 0) AS spent FROM customers AS c LEFT JOIN orders AS o ON o.customer_id = c.customer_id AND o.status = '已完成' LEFT JOIN order_items AS i ON i.order_id = o.order_id GROUP BY c.customer_id), tiered AS (SELECT cid, n_orders, spent, NTILE(3) OVER (ORDER BY spent DESC, cid) AS tier FROM per_customer) SELECT tier AS tier, COUNT(*) AS customers, ROUND(AVG(spent), 2) AS avg_spent, ROUND(AVG(n_orders), 2) AS avg_orders FROM tiered GROUP BY tier ORDER BY tier",
        explanation:
          '三层结构：① 客户粒度聚合；② 窗口函数分档；③ 按档聚合。这种"聚合 → 分档 → 再聚合"的写法在用户分层运营中非常常用。',
        tags: ['综合', '分层'],
      },
      {
        id: 'sql-6-x11',
        type: 'multiple',
        difficulty: 5,
        question: '下列哪些情况可能导致"索引存在但查询仍然很慢"？（多选）',
        options: [
          { value: 'A', text: 'WHERE 中对索引列使用了函数或表达式' },
          { value: 'B', text: '索引列存在隐式类型转换（如整数列与字符串比较）' },
          { value: 'C', text: '查询返回了表中绝大部分行（选择性太低）' },
          { value: 'D', text: 'SELECT 的列全部包含在索引中' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 恰恰是"覆盖索引"的理想情况，通常更快。A、B 导致索引失效，C 时全表扫描反而更划算，优化器可能主动放弃索引。',
        tags: ['索引', '优化'],
      },
      {
        id: 'sql-6-x12',
        type: 'fill',
        difficulty: 4,
        question: '为避免函数导致索引失效，"统计 2024 年数据"应改写成范围查询：\n\n```sql\nWHERE created_at >= "2024-01-01" AND created_at ___ "2025-01-01"\n```',
        blanks: [['<', '&lt;']],
        explanation:
          '用左闭右开区间 `>= 2024-01-01 AND < 2025-01-01` 可以正确处理带时分秒的字段，同时让索引可用。',
        tags: ['优化'],
      },
      {
        id: 'sql-6-x13',
        type: 'sql',
        difficulty: 5,
        dataset: 'retail',
        question:
          '**品类增长分析**：对比 2024 年上半年（1~6 月）与下半年（7~12 月）各品类的销售额，输出品类、上半年、下半年与增长率（(下半年-上半年)/上半年，保留 4 位小数），按增长率降序。\n\n**期望列**：`category`、h1_sales、h2_sales、`growth_rate`',
        starterSql:
          '-- 提示：用 CASE WHEN 分别对半年求和，再在外层计算增长率',
        referenceSql:
          "WITH base AS (SELECT p.category AS category, SUM(CASE WHEN o.order_date < '2024-07-01' THEN i.quantity * i.unit_price * (1 - i.discount) ELSE 0 END) AS h1, SUM(CASE WHEN o.order_date >= '2024-07-01' THEN i.quantity * i.unit_price * (1 - i.discount) ELSE 0 END) AS h2 FROM orders AS o JOIN order_items AS i ON i.order_id = o.order_id JOIN products AS p ON p.product_id = i.product_id WHERE o.status = '已完成' GROUP BY p.category) SELECT category AS category, ROUND(h1, 2) AS h1_sales, ROUND(h2, 2) AS h2_sales, ROUND(CASE WHEN h1 > 0 THEN (h2 - h1) / h1 ELSE NULL END, 4) AS growth_rate FROM base ORDER BY growth_rate DESC",
        explanation:
          '`SUM(CASE WHEN 条件 THEN 值 ELSE 0 END)` 是"条件聚合（单次扫描算多个指标）"的标准写法，比多次 `WHERE` 扫描高效。增长率的除零用 `CASE WHEN h1 > 0` 保护。',
        tags: ['综合', '增长分析'],
      },
      {
        id: 'sql-6-x14',
        type: 'single',
        difficulty: 5,
        question: '对一个 1000 万行的表执行 `SELECT * FROM t ORDER BY id LIMIT 20 OFFSET 9000000`，性能极差。最佳优化方式是？',
        options: [
          { value: 'A', text: '添加更多索引' },
          { value: 'B', text: '改用"记住上一页最后一个 id"的游标分页' },
          { value: 'C', text: '把 OFFSET 改小' },
          { value: 'D', text: '改用子查询套一层' },
        ],
        answer: 'B',
        explanation:
          'OFFSET 大时数据库必须扫描并丢弃前面的 900 万行。游标分页（`WHERE id > 上一页最大值 ORDER BY id LIMIT 20`）可以直接定位起点，性能稳定，与页数无关。',
        tags: ['分页', '优化'],
      },
    ],
  },
];
