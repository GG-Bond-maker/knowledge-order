import type { Chapter } from '../../../types';

/* ============================================================
 *  第 1 章：SQL 与关系数据库基础
 * ============================================================ */

const ch1: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'sql-1',
  title: 'SQL 与关系数据库基础',
  goal: '建立关系数据库的心智模型（表/行/列、主键/外键、数据类型），能写出结构正确的 SELECT 语句，并理解 NULL 的三值逻辑与列别名的用法。',
  lessons: [
    {
      id: 'sql-l-1-1',
      title: '数据库、表、行、列：关系模型与键',
      content: `
## 从 Excel 到关系数据库

如果你用过 Excel，那么理解关系数据库只需要做一次思维切换：**Excel 是一张表，数据库是一组互相引用的表**。

| Excel 概念 | 数据库概念 | retail 数据集里的例子 |
| --- | --- | --- |
| 工作簿 | 数据库（database / schema） | \`retail\` |
| 工作表 | 表（table） | \`customers\`、\`orders\` |
| 第一行标题 | 列名（column / field） | \`customer_id\`、\`city\` |
| 一行数据 | 行（row / record） | 一条客户记录 |
| 单元格 | 值（value） | \`'北京'\` |
| 单元格格式 | 数据类型（data type） | \`INTEGER\`、\`TEXT\`、\`REAL\` |

数据库相比 Excel 的核心优势在于三条：**① 数据不重复存储（范式化）；② 用"键"表达表之间的关系；③ 用 SQL 声明"要什么"而不是"怎么取"**。

## 本课程使用的数据集

所有例题都基于同一个零售数据集 \`retail\`，共 4 张表：

| 表 | 含义 | 行数 | 关键列 |
| --- | --- | --- | --- |
| \`customers\` | 客户 | 15 | \`customer_id\`、\`city\`、\`region\`、\`member_level\` |
| \`products\` | 商品 | 12 | \`product_id\`、\`category\`、\`price\`、\`cost\` |
| \`orders\` | 订单头 | 45 | \`order_id\`、\`customer_id\`、\`order_date\`、\`status\` |
| \`order_items\` | 订单明细 | 59 | \`item_id\`、\`order_id\`、\`product_id\`、\`quantity\`、\`unit_price\`、\`discount\` |

一条业务事实常常被拆到两张表：**"谁在哪天下单"存在 \`orders\`，"这一单买了什么"存在 \`order_items\`**。所以 \`orders\` 只有 45 行（45 笔订单），而 \`order_items\` 有 59 行（一单多件商品时就有多行）。

## 主键：一行的身份证

**主键（PRIMARY KEY）**是能唯一标识一行的列，它有两条硬性约束：

1. **唯一**：任意两行不能相同；
2. **非空**：主键列不允许 \`NULL\`。

\`customers\` 的主键是 \`customer_id\`，\`order_items\` 的主键是 \`item_id\`。注意 \`order_items.order_id\` **不是**主键——同一订单会有多行明细，\`order_id\` 在这个表里是**外键**。

> 判断一张表里哪列是主键的经验：打开数据，看哪一列"每一行都不重复且没有空值"。如果有业务编号（订单号、会员号），通常它就是主键。

## 外键：表之间的连线

**外键（FOREIGN KEY）**是"引用另一张表主键"的列。它的作用是保证引用完整性：\`orders.customer_id\` 里出现的每一个值，都应该能在 \`customers.customer_id\` 里找到。

\`\`\`
customers.customer_id  ←─  orders.customer_id
orders.order_id        ←─  order_items.order_id
products.product_id    ←─  order_items.product_id
\`\`\`

这条链就是后面**多表连接（JOIN）**的地图。记住一个口诀：**"一"的一端做关联键，被引用的列查重后是唯一行；"多"的一端会保留多行**。

## 数据库并不总是替你检查外键

在 SQLite 中，外键约束**默认不启用**（需要 \`PRAGMA foreign_keys = ON\`）；在 MySQL/PostgreSQL 中则默认启用。更现实的原因是：**数据仓库、日志导入、批量 ETL 经常产生"孤儿行"**——\`orders\` 里出现了 \`customers\` 中不存在的 \`customer_id\`。这类"脏数据"不会报错，却会让你的 JOIN 少几行或多出 \`NULL\`，所以分析师永远要对"键是否对得上"保持怀疑，第 4 章会用 \`LEFT JOIN ... WHERE ... IS NULL\` 专门做这类检查。

## 关系模型的核心原则

- **一行代表一个实体实例**（一个客户、一笔订单明细），而不是"一个单元格的汇总"；
- **列代表的是一致含义**，同一列所有值必须语义相同、类型相同；
- **表中不保存冗余汇总**：总金额不存进订单表，而是查询时用 \`quantity * unit_price * (1 - discount)\` 现算，否则明细一改就会不一致。

<SqlJoinDemo />
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`order_items.order_id` 不是主键而是外键，一个订单对应多行。用 `COUNT(*)` 统计"订单数"时如果直接查 `order_items`，数出来的是**明细行数**（59）而不是订单数（45）。',
        },
        {
          kind: 'note',
          text: 'SQLite 的外键约束默认关闭，MySQL/PostgreSQL 默认开启。这意味着 SQLite 里可以插入"引用不存在客户"的订单，数据检查要自己写 SQL 做。',
        },
        {
          kind: 'interview',
          text: '面试高频："主键和唯一索引有什么区别？"要点：主键非空且唯一、每表最多一个；唯一索引允许 NULL（多个 NULL 不冲突，SQLite 中也是如此）、可以有多个。',
        },
      ],
      demos: [
        {
          title: '看看四张表分别长什么样',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT 'customers' AS "表", COUNT(*) AS "行数" FROM customers
UNION ALL
SELECT 'products', COUNT(*) FROM products
UNION ALL
SELECT 'orders', COUNT(*) FROM orders
UNION ALL
SELECT 'order_items', COUNT(*) FROM order_items`,
        },
        {
          title: '一条业务事实如何拆成两张表：订单头 + 订单明细',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT o.order_id, o.order_date, i.item_id, i.product_id,
       i.quantity, i.unit_price, i.discount
FROM orders AS o
JOIN order_items AS i ON i.order_id = o.order_id
WHERE o.order_id IN (1001, 1002, 1028)
ORDER BY o.order_id, i.item_id`,
        },
      ],
    },
    {
      id: 'sql-l-1-2',
      title: '数据类型与 SQL 语句分类',
      content: `
## 五类常见数据类型

| 类型（SQLite 别名） | 含义 | retail 中的列 | 注意 |
| --- | --- | --- | --- |
| \`INTEGER\` | 整数（1~8 字节自适应） | \`customer_id\`、\`quantity\` | 主键建议用整数 |
| \`REAL\` | 浮点数（8 字节 IEEE 754） | \`price\`、\`discount\` | 金额用它会累积误差 |
| \`TEXT\` | 字符串（UTF-8） | \`name\`、\`city\`、\`order_date\` | 日期在 SQLite 中常存成文本 |
| \`NUMERIC\` | 数值亲和类型 | — | MySQL 的 \`DECIMAL\` 更精确 |
| \`BLOB\` | 二进制 | — | 存图片、文件 |

不同数据库的关键差异：

- **SQLite 是"动态类型"**：列的类型只是"亲和性（affinity）"，你往 \`TEXT\` 列里插 \`123\` 也不会报错，读取时才做转换。所以 SQLite 更适合原型和学习，**类型约束弱**。
- **MySQL / PostgreSQL 是强类型**：类型不匹配会直接报错或隐式转换（MySQL 的隐式转换是很多"索引失效"事故的根源，第 6 章会讲）。

## 金额为什么不该用 REAL

\`\`\`sql
SELECT 0.1 + 0.2 AS s;
\`\`\`

在浮点数世界里结果是 \`0.30000000000000004\`。零售数据里 \`unit_price * quantity * (1 - discount)\` 反复相乘后再求和，末位误差会累积，对账时就会差几分钱。工程上的做法：

1. 金额存成 **整数"分"**（如 \`29900\`）；
2. 或者用 \`NUMERIC/DECIMAL\` 精确类型（MySQL、PostgreSQL 支持，SQLite 不支持真正的 DECIMAL）；
3. 展示时再 \`ROUND(x, 2)\`，**不要用 \`=\` 比较两个浮点金额**。

## 日期在 SQLite 里是 TEXT

\`orders.order_date\` 存的是 \`'2024-01-05'\` 这样的文本。SQLite 没有真正的 DATE 类型，好处是 **ISO 8601 格式（YYYY-MM-DD）的文本按字典序比较就等于按时间比较**，因此 \`WHERE order_date >= '2024-06-01'\` 能正常工作。

| 操作 | SQLite | MySQL | PostgreSQL |
| --- | --- | --- | --- |
| 取年份 | \`strftime('%Y', order_date)\` 或 \`substr(order_date,1,4)\` | \`YEAR(order_date)\` | \`EXTRACT(YEAR FROM order_date)\` |
| 字符串拼接 | \`a \\|\\| b\` | \`CONCAT(a,b)\` | \`a \\|\\| b\` |
| 当前时间 | \`datetime('now')\` | \`NOW()\` | \`NOW()\` |
| 限制行数 | \`LIMIT n\` | \`LIMIT n\` | \`LIMIT n\` |

## SQL 语句的四大分类

| 分类 | 全称 | 语句 | 作用 | 是否返回结果集 |
| --- | --- | --- | --- | --- |
| **DDL** | Data Definition | \`CREATE\`、\`ALTER\`、\`DROP\`、\`TRUNCATE\` | 定义表结构 | 否 |
| **DML** | Data Manipulation | \`INSERT\`、\`UPDATE\`、\`DELETE\` | 改数据 | 否（返回影响行数） |
| **DQL** | Data Query | \`SELECT\` | 查数据 | 是 |
| **DCL / TCL** | Data Control / Transaction | \`GRANT\`、\`REVOKE\`、\`BEGIN\`、\`COMMIT\` | 权限与事务 | 否 |

做数据分析时**90% 的时间都在写 DQL（SELECT）**，偶尔用 DDL 建临时表、用 DML 修数据。这个学习网站只允许 \`SELECT\` 类查询判分，所以本课程聚焦 DQL。

## SELECT 语句的书写顺序 ≠ 执行顺序

这是理解 SQL 的第一个关键认知：

\`\`\`
书写顺序：SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
执行顺序：FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
\`\`\`

执行顺序解释了很多"看起来奇怪"的规则：

- 为什么 \`WHERE\` 里不能用 \`SELECT\` 起的别名？因为 **WHERE 先执行，别名还没被创建**；
- 为什么 \`ORDER BY\` 里可以用别名？因为 ORDER BY 在 SELECT 之后执行；
- 为什么 \`WHERE\` 里不能写聚合函数？因为聚合发生在 GROUP BY 阶段，晚于 WHERE。

把这张"执行顺序"图记熟，后面第 3、5 章的所有陷阱都能自己推导出来。

<Flowchart name="sql-order" />
`,
      tips: [
        {
          kind: 'performance',
          text: '金额列用 REAL 会产生浮点误差。分析场景可以在表达式外层套 `ROUND(x, 2)`；工程落库则建议整数分或 DECIMAL。',
        },
        {
          kind: 'interview',
          text: '面试常考："SQL 的执行顺序"（FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT），它直接解释了"为什么 WHERE 不能用别名/聚合函数"。',
        },
        {
          kind: 'pitfall',
          text: 'SQLite 没有 DATE 类型，`order_date` 是 TEXT。写 `strftime(\'%Y\', order_date)` 前先确认格式是 YYYY-MM-DD，否则返回 NULL。',
        },
      ],
      demos: [
        {
          title: '认识类型：typeof 与当前 SQLite 版本',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT order_id,
       order_date,
       typeof(order_date) AS date_type,
       typeof(order_id) AS id_type,
       sqlite_version() AS sqlite_version
FROM orders
LIMIT 3`,
        },
        {
          title: 'REAL 与 ROUND：金额计算为什么末尾总有小数',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT i.item_id,
       i.quantity, i.unit_price, i.discount,
       i.quantity * i.unit_price * (1 - i.discount) AS raw_amount,
       ROUND(i.quantity * i.unit_price * (1 - i.discount), 2) AS amount
FROM order_items AS i
WHERE i.discount > 0
LIMIT 5`,
        },
      ],
    },
    {
      id: 'sql-l-1-3',
      title: 'SELECT 基础：取列、别名、注释与 NULL',
      content: `
## 最小可运行的查询

\`\`\`sql
SELECT name, city FROM customers;
\`\`\`

\`SELECT\` 后面写**要哪些列**，\`FROM\` 后面写**从哪张表取**。多个列用英文逗号分隔，最后一行不要加逗号。

SELECT 不仅可以取列，还可以写**表达式**：

\`\`\`sql
SELECT product_name,
       price,
       price * 0.9 AS promo_price,
       price - cost AS gross_profit
FROM products;
\`\`\`

## SELECT * 的问题

\`SELECT *\` 方便调试，但**不建议出现在任何正式查询里**：

1. **传输无谓数据**：宽表几十列，你只需要 3 列，网络和内存都要多付代价；
2. **列顺序不稳定**：别人 \`ALTER TABLE ADD COLUMN\` 后，用 \`INSERT INTO ... SELECT *\` 的代码会错位；
3. **列名重复导致歧义**：JOIN 两张表时都会带回 \`order_id\`，前端拿到的字段会互相覆盖；
4. **破坏了"覆盖索引"优化的可能**（第 6 章细讲）。

**替代方案**：在开发时用 \`SELECT *\` 看一眼数据，交付前把列名一个个写出来。

## 别名的两种写法

\`\`\`sql
-- 写法一：省略 AS（可以，但易读性差）
SELECT name n, city c FROM customers;

-- 写法二：使用 AS（推荐）
SELECT name AS customer_name, city AS city_name FROM customers;
\`\`\`

表别名同理：\`FROM orders AS o\` 或 \`FROM orders o\`。**表别名在多表 JOIN 时几乎是必需的**，因为要用 \`o.order_id\` 消歧。

别名还有三个实用场景：

| 场景 | 示例 | 说明 |
| --- | --- | --- |
| 给计算结果命名 | \`price - cost AS gross_profit\` | 结果集列名更可读 |
| 别名含中文/空格 | \`p.price AS "标价"\` | 必须用双引号包裹 |
| 短化表名 | \`order_items AS i\` | JOIN 时少打字 |

> **引号规则**：字符串字面量用单引号 \`('北京')\`；标识符（列名、别名、表名）要用引号时用**双引号** \`("标价")\`。MySQL 默认用反引号包裹标识符，但它不是标准 SQL，PostgreSQL/SQLite 不认反引号。

## 常量列与拼接

\`\`\`sql
SELECT '2024Q1' AS quarter,          -- 常量列，常用于标记来源
       name || '（' || city || '）' AS label
FROM customers
LIMIT 3;
\`\`\`

字符串拼接 **SQLite/PostgreSQL 用 \`||\`，MySQL 默认用 \`CONCAT()\`**（MySQL 里 \`||\` 默认是逻辑或，除非开启 \`PIPES_AS_CONCAT\`）。这是跨库迁移最常踩的坑之一。

## 注释

\`\`\`sql
-- 这是单行注释
SELECT name,  -- 行尾注释
       city
FROM customers;   /* 块注释
                     可跨多行 */
\`\`\`

## NULL：不是 0，也不是空字符串

\`customers\` 表中 \`许晴\` 的 \`member_level\` 是 \`NULL\`。NULL 表示"**未知**"，它有几个反直觉的性质：

\`\`\`sql
SELECT NULL = NULL;        -- NULL（不是 1/True）
SELECT NULL <> NULL;       -- NULL
SELECT NULL + 1;           -- NULL
SELECT '未评级' = NULL;     -- NULL
\`\`\`

因此：

- 不能写 \`WHERE member_level = NULL\`，必须写 \`WHERE member_level IS NULL\`；
- 聚合函数会**跳过 NULL**（\`COUNT(member_level)\` 是 14 而 \`COUNT(*)\` 是 15）；
- \`NULL\` 在 \`ORDER BY\` 中排在最前（SQLite/MySQL），PostgreSQL 默认排在最后。

## 三值逻辑

SQL 的布尔表达式有三种结果：\`TRUE\`、\`FALSE\`、\`UNKNOWN\`。**WHERE 只保留结果为 TRUE 的行**，UNKNOWN 和 FALSE 一样被过滤掉。

| A | B | A AND B | A OR B | NOT A |
| --- | --- | --- | --- | --- |
| TRUE | UNKNOWN | UNKNOWN | TRUE | FALSE |
| FALSE | UNKNOWN | FALSE | UNKNOWN | TRUE |
| UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

这条规则会造成一个非常隐蔽的 bug：

\`\`\`sql
-- 本意：不是金卡的客户
SELECT * FROM customers WHERE member_level <> '金卡';
-- 实际：只有 银卡(4) + 普通(5) = 9 人，NULL 的那 1 人被漏掉了
\`\`\`

正确写法是显式补上 NULL：

\`\`\`sql
SELECT * FROM customers
WHERE member_level <> '金卡' OR member_level IS NULL;
\`\`\`

> 记忆口诀：**"NULL 参与的比较一律是 UNKNOWN，NOT UNKNOWN 还是 UNKNOWN"**。任何与 NULL 相关的判断，都要单独用 \`IS NULL\` / \`IS NOT NULL\` 处理。
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`WHERE col <> \'值\'` 会自动漏掉该列为 NULL 的行（NULL 比较结果为 UNKNOWN）。需要包含 NULL 时必须加 `OR col IS NULL`。',
        },
        {
          kind: 'pitfall',
          text: '`WHERE col = NULL` 永远不返回任何行，必须用 `IS NULL`。这是新手最常犯的错误，且不会报错，只是"结果为空"。',
        },
        {
          kind: 'performance',
          text: '`SELECT *` 会阻止数据库使用覆盖索引（index-only scan），宽表上可能慢数倍；交给下游时还会因列顺序变化引发错位。',
        },
        {
          kind: 'note',
          text: 'SQLite / PostgreSQL 的字符串拼接用 `||`，MySQL 默认用 `CONCAT()`。MySQL 里 `||` 是逻辑或，迁移时务必检查。',
        },
      ],
      demos: [
        {
          title: '别名、拼接与常量列',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT customer_id AS id,
       name AS customer_name,
       city || '-' || region AS location,
       'retail' AS source
FROM customers
ORDER BY customer_id
LIMIT 5`,
        },
        {
          title: 'NULL 的三值逻辑：<> 会漏掉 NULL',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COUNT(*) AS all_rows,
       SUM(CASE WHEN member_level = '金卡' THEN 1 ELSE 0 END) AS gold,
       SUM(CASE WHEN member_level IS NULL THEN 1 ELSE 0 END) AS null_level,
       COUNT(member_level) AS non_null_level
FROM customers`,
        },
        {
          title: 'NULL 参与运算的结果',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT name, member_level,
       member_level || '会员' AS with_suffix,
       LENGTH(member_level) AS level_len,
       CASE WHEN member_level IS NULL THEN '未评级' ELSE member_level END AS level_label
FROM customers
WHERE customer_id IN (1, 14)`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'sql-1-e1',
      type: 'sql',
      difficulty: 1,
      question: '查询所有客户的姓名与所在城市。**期望列**：`name`、`city`。',
      starterSql: '-- 从 customers 表取 name 和 city 两列\nSELECT ',
      referenceSql: 'SELECT name, city FROM customers',
      explanation:
        '最基础的列投影。`SELECT` 后写列名、`FROM` 后写表名即可，不要用 `SELECT *`，因为题干只要求两列。',
      tags: ['SELECT', '列投影'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e2',
      type: 'sql',
      difficulty: 1,
      question:
        '查询商品表中所有商品的**名称、标价、成本、毛利额**（毛利额 = 标价 - 成本），毛利额列别名为 `gross_profit`。**期望列**：`product_name`、`price`、`cost`、`gross_profit`。',
      starterSql: '-- 毛利额是表达式，记得用 AS 起别名\nSELECT product_name, price, cost, \nFROM products',
      referenceSql: 'SELECT product_name, price, cost, price - cost AS gross_profit FROM products',
      explanation: 'SELECT 里可以写表达式。用 `AS` 给表达式起列别名，结果集里就会有 `gross_profit` 这一列。',
      tags: ['SELECT', '表达式', '别名'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e3',
      type: 'sql',
      difficulty: 1,
      question:
        '统计 `orders` 表一共有多少行，列别名为 `order_count`。**期望列**：`order_count`。',
      starterSql: '-- COUNT(*) 统计行数\nSELECT  AS order_count FROM orders',
      referenceSql: 'SELECT COUNT(*) AS order_count FROM orders',
      explanation:
        '`COUNT(*)` 统计行数，**包含所有行（包括列为 NULL 的行）**。结果是 45 笔订单。注意不要和 `order_items` 的 59 行明细混淆。',
      tags: ['COUNT', '聚合'],
      relatedLessonId: 'sql-l-1-1',
    },
    {
      id: 'sql-1-e4',
      type: 'sql',
      difficulty: 2,
      question:
        '列出所有 `member_level` 为 NULL 的客户的编号与姓名。**期望列**：`customer_id`、`name`。',
      starterSql: '-- 注意：不能写 = NULL\nSELECT customer_id, name\nFROM customers\nWHERE member_level ',
      referenceSql: 'SELECT customer_id, name FROM customers WHERE member_level IS NULL',
      explanation:
        'NULL 不能用 `=` 比较（结果永远是 UNKNOWN），必须用 `IS NULL`。答案是许晴（customer_id = 14）。',
      tags: ['NULL', 'IS NULL'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e5',
      type: 'sql',
      difficulty: 1,
      question:
        '查询商品表，只取 `product_id` 和 `product_name` 两列，并把表起一个短别名 `p`。**期望列**：`product_id`、`product_name`。',
      starterSql: 'SELECT p.product_id, p.product_name\nFROM products AS ',
      referenceSql: 'SELECT p.product_id, p.product_name FROM products AS p',
      explanation: '表别名的两种写法：`FROM products AS p` 或 `FROM products p`。别名后可写 `p.product_id`，在多表连接时用来消歧。',
      tags: ['别名', '表别名'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e6',
      type: 'sql',
      difficulty: 2,
      question:
        '输出每位客户的 `name` 和"城市-大区"拼接串，列别名 `location`（例如 `北京-华北`）。**期望列**：`name`、`location`。',
      starterSql: '-- SQLite 用 || 拼接字符串\nSELECT name, city  region AS location FROM customers',
      referenceSql: "SELECT name, city || '-' || region AS location FROM customers",
      explanation:
        'SQLite/PostgreSQL 用 `||` 拼接字符串；MySQL 要用 `CONCAT(city, \'-\', region)`，因为 MySQL 的 `||` 默认是逻辑或。',
      tags: ['字符串拼接', '||'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e7',
      type: 'single',
      difficulty: 1,
      question: '下列哪一项**不是**主键必须具备的性质？',
      options: [
        { value: 'A', text: '唯一：任意两行的主键值不同' },
        { value: 'B', text: '非空：主键列不允许为 NULL' },
        { value: 'C', text: '自增：主键必须是自动递增的整数' },
        { value: 'D', text: '一张表最多只有一个主键约束' },
      ],
      answer: 'C',
      explanation:
        '主键只要求**唯一 + 非空**。自增（SQLite 的 `AUTOINCREMENT`、MySQL 的 `AUTO_INCREMENT`）只是常见实现方式，业务编号（如订单号字符串）同样可以做主键。',
      tags: ['主键'],
      relatedLessonId: 'sql-l-1-1',
    },
    {
      id: 'sql-1-e8',
      type: 'judge',
      difficulty: 1,
      question: '在 SQL 中执行 `SELECT * FROM customers WHERE member_level = NULL;` 会返回 `member_level` 为空的所有行。',
      answer: false,
      explanation:
        '`ANY = NULL` 的结果是 UNKNOWN，而 WHERE 只保留 TRUE 的行，所以这条语句**永远返回 0 行**且不报错。正确写法是 `WHERE member_level IS NULL`。',
      tags: ['NULL', '三值逻辑'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e9',
      type: 'multiple',
      difficulty: 2,
      question: '关于 `SELECT *`，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: 'JOIN 两张表时，可能出现同名列导致结果有重复列名' },
        { value: 'B', text: '表新增列后，列顺序会变化，依赖列位置的下游代码可能出错' },
        { value: 'C', text: '会传输不需要的列，宽表上浪费网络与内存' },
        { value: 'D', text: '在 SQLite 中 `SELECT *` 无法执行' },
        { value: 'E', text: '会放弃使用"覆盖索引"来避免回表的机会' },
      ],
      answer: ['A', 'B', 'C', 'E'],
      explanation:
        '`SELECT *` 在 SQLite 里当然可以执行（D 错）。其余四项都是它的真实代价：列名冲突、列序不稳定、传输浪费、丧失覆盖索引优化。',
      tags: ['SELECT *', '性能'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e10',
      type: 'single',
      difficulty: 2,
      question: '`customers` 表共有 15 行，其中 `member_level` 有 1 行为 NULL。执行 `SELECT COUNT(member_level) FROM customers;` 的结果是？',
      options: [
        { value: 'A', text: '15' },
        { value: 'B', text: '14' },
        { value: 'C', text: '1' },
        { value: 'D', text: 'NULL' },
      ],
      answer: 'B',
      explanation:
        '`COUNT(列)` 统计**非 NULL 值**的个数，因此是 14。`COUNT(*)` 才是 15。这个差异在第 3 章计算平均值时会导致"分母被缩小"的严重问题。',
      tags: ['COUNT', 'NULL'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e11',
      type: 'fill',
      difficulty: 2,
      question: '补全语句，统计 `customers` 表中 `member_level` 为 NULL 的客户数量，列别名 `n`：',
      prefix: 'SELECT COUNT(*) AS n FROM customers WHERE member_level ',
      suffix: ';',
      blanks: [['IS NULL', '/^is\\s+null$/i']],
      explanation: '判断 NULL 只能使用 `IS NULL` / `IS NOT NULL`，不能用 `= NULL`。',
      tags: ['NULL'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e12',
      type: 'single',
      difficulty: 2,
      question: '标准 SQL 中，SQL 查询各子句的**逻辑执行顺序**是？',
      options: [
        { value: 'A', text: 'SELECT → FROM → WHERE → GROUP BY → ORDER BY' },
        { value: 'B', text: 'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY' },
        { value: 'C', text: 'WHERE → FROM → SELECT → GROUP BY → ORDER BY' },
        { value: 'D', text: 'FROM → SELECT → WHERE → GROUP BY → ORDER BY' },
      ],
      answer: 'B',
      explanation:
        '执行顺序：FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT。正因为 WHERE 早于 SELECT，所以 WHERE 里不能用 SELECT 中定义的列别名。',
      tags: ['执行顺序'],
      relatedLessonId: 'sql-l-1-2',
    },
    {
      id: 'sql-1-e13',
      type: 'sql',
      difficulty: 2,
      question:
        '用 `typeof()` 查看 `orders.order_date` 的存储类型，并返回前 3 行。**期望列**：`order_id`、`order_date`、`date_type`。',
      starterSql: 'SELECT order_id, order_date, typeof(order_date) AS date_type\nFROM orders\nLIMIT ',
      referenceSql: 'SELECT order_id, order_date, typeof(order_date) AS date_type FROM orders LIMIT 3',
      explanation:
        'SQLite 是动态类型，`typeof()` 返回值 `date_type` 为 `text`。日期在 SQLite 中以文本存储，所以可以直接用字符串比较大小（ISO 8601 格式）。',
      tags: ['数据类型', 'typeof'],
      relatedLessonId: 'sql-l-1-2',
    },
    {
      id: 'sql-1-e14',
      type: 'sql',
      difficulty: 2,
      question:
        '统计 `order_items` 表的总行数与 `quantity` 列的非空值个数。**期望列**：`total_rows`、`qty_not_null`。',
      starterSql: 'SELECT COUNT(*) AS total_rows, COUNT( ) AS qty_not_null FROM order_items',
      referenceSql: 'SELECT COUNT(*) AS total_rows, COUNT(quantity) AS qty_not_null FROM order_items',
      explanation:
        '本数据中 `quantity` 没有 NULL，所以两列都是 59。但只要列里出现 NULL，两者就会不同：`COUNT(*)` 数行，`COUNT(列)` 数非空值。',
      tags: ['COUNT', 'NULL'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e15',
      type: 'sql',
      difficulty: 2,
      question:
        '列出 `products` 表中的商品名与"85 折后的价格"（保留 2 位小数），列别名 `promo_price`。**期望列**：`product_name`、`promo_price`。',
      starterSql: 'SELECT product_name, ROUND(price *  , 2) AS promo_price FROM products',
      referenceSql: 'SELECT product_name, ROUND(price * 0.85, 2) AS promo_price FROM products',
      explanation: '85 折即乘以 0.85，用 `ROUND(x, 2)` 保留两位小数。判断两集合相等时列名必须一致，所以别名不能省。',
      tags: ['表达式', 'ROUND'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e16',
      type: 'sql',
      difficulty: 3,
      question:
        '找出"有订单明细引用了不存在的商品"的情况：即 `order_items.product_id` 在 `products` 中找不到对应行。**期望列**：`item_id`、`product_id`。若没有此类脏数据，返回空结果也是正确。',
      starterSql: 'SELECT i.item_id, i.product_id\nFROM order_items AS i\nLEFT JOIN products AS p ON p.product_id = i.product_id\nWHERE p.product_id ',
      referenceSql:
        'SELECT i.item_id, i.product_id FROM order_items AS i LEFT JOIN products AS p ON p.product_id = i.product_id WHERE p.product_id IS NULL',
      allowEmpty: true,
      explanation:
        '`LEFT JOIN` 后右表匹配不到时，右表所有列都是 NULL，所以 `WHERE p.product_id IS NULL` 就是"孤儿行"。本数据干净，结果为空集合——这本身就是一个有价值的结论（回答的是"有没有"）。',
      tags: ['外键', '数据质量'],
      relatedLessonId: 'sql-l-1-1',
    },
    {
      id: 'sql-1-e17',
      type: 'single',
      difficulty: 2,
      question: 'MySQL 中默认用于**拼接字符串**的函数是？',
      options: [
        { value: 'A', text: '`||` 运算符' },
        { value: 'B', text: '`CONCAT()`' },
        { value: 'C', text: '`JOIN()`' },
        { value: 'D', text: '`APPEND()`' },
      ],
      answer: 'B',
      explanation:
        'MySQL 默认 `||` 表示逻辑或（除非设置 `sql_mode=PIPES_AS_CONCAT`），字符串拼接用 `CONCAT()`；SQLite 与 PostgreSQL 则用 `||`。',
      tags: ['字符串拼接', '方言差异'],
      relatedLessonId: 'sql-l-1-2',
    },
    {
      id: 'sql-1-e18',
      type: 'judge',
      difficulty: 2,
      question: '在 SQLite 中，列声明的类型（如 `TEXT`）会强制约束插入值，往 `TEXT` 列插入数字会直接报错。',
      answer: false,
      explanation:
        'SQLite 采用**动态类型 / 类型亲和性**，往 `TEXT` 列插入整数通常会被转换成文本或按原值存下，并不会报错。强类型约束是 MySQL、PostgreSQL 等数据库的行为。',
      tags: ['数据类型', 'SQLite'],
      relatedLessonId: 'sql-l-1-2',
    },
    {
      id: 'sql-1-e19',
      type: 'sql',
      difficulty: 3,
      question:
        '统计客户表中"非金卡"客户数量（列别名 `n`）。**必须包含 `member_level` 为 NULL 的客户**。**期望列**：`n`。',
      starterSql: '-- 提示：NOT IN / <> 会漏掉 NULL 的那一行\nSELECT COUNT(*) AS n FROM customers\nWHERE member_level <> ',
      referenceSql: "SELECT COUNT(*) AS n FROM customers WHERE member_level <> '金卡' OR member_level IS NULL",
      explanation:
        '金卡 4 人，共 15 人，其中 NULL 1 人。`<> \'金卡\'` 只命中银卡 4 + 普通 5 = 9 人，会漏掉 NULL 客户。正确结果 = 15 - 4 = 11。',
      tags: ['NULL', '三值逻辑'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e20',
      type: 'multiple',
      difficulty: 2,
      question: '下列哪些属于 **DDL（数据定义语言）** 语句？（多选）',
      options: [
        { value: 'A', text: '`CREATE TABLE`' },
        { value: 'B', text: '`ALTER TABLE`' },
        { value: 'C', text: '`UPDATE`' },
        { value: 'D', text: '`DROP TABLE`' },
        { value: 'E', text: '`SELECT`' },
        { value: 'F', text: '`INSERT`' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        'DDL 用于定义/修改表结构：`CREATE`、`ALTER`、`DROP`、`TRUNCATE`。`UPDATE`/`INSERT` 属于 DML，`SELECT` 属于 DQL。',
      tags: ['SQL 分类'],
      relatedLessonId: 'sql-l-1-2',
    },
    {
      id: 'sql-1-e21',
      type: 'fill',
      difficulty: 2,
      question: '补全语句：把 `customers` 表的别名起为 `c`，并查询 `c.name` 与 `c.city`（第二种不加 AS 的别名写法）：',
      prefix: 'SELECT c.name, c.city FROM customers ',
      suffix: ';',
      blanks: [['c', '/^as\\s+c$/i']],
      explanation: '表别名可写 `customers c` 或 `customers AS c`，效果相同，推荐显式 `AS` 以增强可读性。',
      tags: ['别名'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e22',
      type: 'sql',
      difficulty: 2,
      question:
        '把 `products` 中 `category` 为"食品"的商品的价格相加，列别名 `total_price`。**期望列**：`total_price`。',
      starterSql: "SELECT SUM(price) AS total_price FROM products\nWHERE category = '食品'",
      referenceSql: "SELECT SUM(price) AS total_price FROM products WHERE category = '食品'",
      explanation:
        '字符串常量用**单引号**包裹。食品类两件：咖啡豆 128 + 坚果礼盒 199 = 327。',
      tags: ['SELECT', 'WHERE'],
      relatedLessonId: 'sql-l-1-3',
    },
    {
      id: 'sql-1-e23',
      type: 'judge',
      difficulty: 2,
      question: '`order_items.order_id` 是外键，同一订单号可能在这个表中出现多行。',
      answer: true,
      explanation:
        '`order_items` 的主键是 `item_id`，`order_id` 只是外键。一个订单买多件商品就对应多行明细，例如订单 1001 有两行。因此"订单数"必须对 `orders` 表或 `COUNT(DISTINCT order_id)` 统计。',
      tags: ['主键', '外键'],
      relatedLessonId: 'sql-l-1-1',
    },
    {
      id: 'sql-1-e24',
      type: 'open',
      difficulty: 3,
      question:
        '在产品需求评审中，同事坚持所有查询都用 `SELECT *`，理由是"反正前端也会挑字段"。请写出你的反驳要点（至少 3 点），并说明在什么场景下可以接受 `SELECT *`。',
      referenceAnswer: `**反驳要点（任答 3 点）**：
1. **传输浪费**：宽表 50 列只取 3 列，IO 与网络流量都被放大，在亿级表的分析查询中差距非常明显；
2. **列序不稳定**：表结构新增列后列顺序变化，依赖列位置的下游（\`INSERT ... SELECT *\`、CSV 导出、pandas 按位置取列）会静默错位；
3. **列名冲突**：JOIN 后两表都有 \`order_id\`、\`name\` 时，结果集出现同名列，应用层可能取到错误的列；
4. **丧失覆盖索引**：只查索引中已有的列可以避免"回表"，\`SELECT *\` 必然要读整行；
5. **可读性与变更 review 难度**：看 SQL 的人无法知道真正依赖了哪些列，字段下线时不敢删。

**可接受的场景**：交互式的数据探查（临时看一眼数据长什么样）、表结构非常小且稳定的工具脚本、\`EXISTS (SELECT * ...)\` 这类并不真正读取列的场景。`,
      rubric: [
        { point: '提到传输/性能代价（多余列或无法用覆盖索引）', score: 1 },
        { point: '提到列顺序不稳定带来的错位风险', score: 1 },
        { point: '提到 JOIN 后同名列冲突', score: 1 },
        { point: '给出"探查/临时分析可以接受"的边界条件', score: 1 },
      ],
      keywords: ['性能', '列顺序', '同名列', '覆盖索引', '探查'],
      explanation: '这题考察的是"为什么规范要禁止 SELECT *"，重点是能说出具体的机制而非空泛的"不专业"。',
      tags: ['SELECT *', '规范'],
      relatedLessonId: 'sql-l-1-3',
    },
  ],
};

export { ch1 };
export default ch1;
