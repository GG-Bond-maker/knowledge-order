/**
 * SQL 课程 · 扩展内容（习题 + 知识点小节）
 *
 * 结构：按 chapterId 组织，由 chapters/sql.ts 合并进 ch1~ch6。
 *  - 小节 id：sql-l-<章>-<序号>（不与 ch1~ch6 已用的 sql-l-1-1 ~ sql-l-6-3 重复）
 *  - 习题 id：sql-<章>-x<序号>
 *
 * 写作约定（与 ch1~ch6 保持一致）：
 *  - 正文里的行内代码一律写成转义反引号；
 *  - referenceSql / starterSql / demo.code 内部不出现反引号；
 *  - 每道 SQL 题都在题干里写明「期望列」，并保证 referenceSql 能在 SQLite 上执行且返回结果。
 */

import type { Exercise, Lesson } from '../../../types';

export const sqlExtra: { chapterId: string; lessons?: Lesson[]; exercises: Exercise[] }[] = [
  /* ============================================================
   *  第 1 章：SQL 与关系数据库基础
   * ============================================================ */
  {
    chapterId: 'sql-1',
    lessons: [
      {
        id: 'sql-l-1-4',
        title: 'SQL 的逻辑执行顺序：每一步能看见什么',
        content: `
## 书写顺序不是执行顺序

大多数人第一次听到"SQL 是声明式语言"时，理解只停留在"只要说清要什么"。真正让你写出正确 SQL 的，是另一条更硬的规则：**数据库并不是按你写的顺序执行的**。

\`\`\`
你写的顺序：SELECT → FROM → WHERE → GROUP BY → HAVING → ORDER BY → LIMIT
真正执行：  FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
\`\`\`

（严格地说，SELECT 之后的 ORDER BY 中还能再经历一次 DISTINCT 与窗口函数的计算，这里先抓住主干。）

## 把每一步想象成一张"逐步长出来的结果表"

| 步骤 | 这一步拿到什么 | 这一步之后多出/少了什么 |
| --- | --- | --- |
| FROM / JOIN | 笛卡尔积 + ON 过滤后的行 | 行数可能放大 |
| WHERE | 逐行判断条件的中间结果表 | **还不能看到别名、不能看到聚合值** |
| GROUP BY | 把行折叠成组 | 组的粒度固定了 |
| HAVING | 对组做过滤 | 可以引用聚合结果 |
| SELECT | 计算表达式、起别名、去重 | 别名在这一步才诞生 |
| ORDER BY | 对最终行排序 | 可以用别名，可以引用未选出的列 |
| LIMIT | 截取若干行 | 必须最后 |

这条链条直接解释了四个常见报错与"怪现象"：

1. **WHERE 里用 SELECT 的别名会报 no such column**——WHERE 阶段别名还不存在；
2. **WHERE 里写 COUNT(*) 会报 misuse of aggregate**——聚合发生在 GROUP BY 之后；
3. **ORDER BY 里可以用别名**——它排在 SELECT 之后；
4. **SELECT DISTINCT 时 ORDER BY 只能引用选出的列**——因为去重发生在 SELECT 之后、ORDER BY 之前，没被选出的列已经"看不见"了（PostgreSQL 会直接报错）。

## 用一条查询把顺序"看"出来

\`\`\`sql
SELECT c.region,
       COUNT(*) AS cnt,
       SUM(c.customer_id) AS id_sum
FROM customers AS c
WHERE c.member_level IS NOT NULL
GROUP BY c.region
HAVING COUNT(*) >= 2
ORDER BY cnt DESC, region
LIMIT 3;
\`\`\`

执行时数据库先丢掉 1 行 NULL 等级，再按大区分成 6 组，HAVING 把只有 1 人的华中、西北去掉，剩下 4 组，SELECT 负责给 cnt 与 id_sum 命名，最后按 cnt 排序取前 3。你在任何一步改写条件，只会影响该步之后的结果——这就是下面几条"改写规则"的来源。

## 改写规则：把条件放对位置才最快

| 想表达 | 该放哪 | 反例与后果 |
| --- | --- | --- |
| 只要某些行参与计算 | WHERE | 放进 HAVING 就得先聚合全部行再丢弃 |
| 只要某些组 | HAVING | 放进 WHERE 会报聚合函数误用 |
| 只要某些客户的订单 | WHERE 或 ON（LEFT JOIN 时必须 ON） | 放到 WHERE 会让 LEFT JOIN 退化为 INNER JOIN |
| 只要前 N 行 | ORDER BY + LIMIT | 没有 ORDER BY 时取到哪几行不确定 |

## 执行顺序在真实方言里的差异

逻辑顺序是标准，但各数据库的"宽松程度"不同：MySQL 允许在 HAVING 与 GROUP BY 里引用 SELECT 别名；SQLite 更宽松，连 GROUP BY 的序号引用都支持；PostgreSQL 对"SELECT 出现裸列"最严格。**写 SQL 时以逻辑顺序为准，而不是以"我这条能在 SQLite 跑通"为准**，这样换库时才不会全部返工。

> 自查方法：把查询拆成"先 WHERE、再 GROUP BY、再 HAVING、再 SELECT"四句话念一遍，如果有一句念不通（例如"先选出别名再过滤"，或"先分组再丢掉某些行"），说明条件放错了位置。
`,
        tips: [
          {
            kind: 'interview',
            text: '必考："SQL 的执行顺序"。标准答法：FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT，并用"WHERE 不能用别名"来证明自己真的理解。',
          },
          {
            kind: 'pitfall',
            text: '`SELECT DISTINCT` 与 `ORDER BY` 组合时，排序键必须是 SELECT 里的列，否则 PostgreSQL 报错、MySQL 也可能给出与预期不同的行。',
          },
          {
            kind: 'note',
            text: 'LIMIT 与 OFFSET 在逻辑上总是最后执行；因此 `LIMIT` 之后再聚合是不可能的——需要"取前 N 再聚合"，必须在子查询里先 LIMIT，外层再聚合。',
          },
        ],
        demos: [
          {
            title: '一次执行里同时用到 WHERE / HAVING / 别名排序',
            lang: 'sql',
            dataset: 'retail',
            code: `SELECT c.region,
       COUNT(*) AS cnt,
       SUM(c.customer_id) AS id_sum
FROM customers AS c
WHERE c.member_level IS NOT NULL
GROUP BY c.region
HAVING COUNT(*) >= 2
ORDER BY cnt DESC, region
LIMIT 3`,
          },
          {
            title: 'SELECT 别名只能被 ORDER BY / HAVING 看见',
            lang: 'sql',
            dataset: 'retail',
            code: `SELECT category AS cat, COUNT(*) AS cnt
FROM products
GROUP BY category
HAVING COUNT(*) >= 3
ORDER BY cnt DESC`,
          },
        ],
      },
      {
        id: 'sql-l-1-5',
        title: 'NULL 三值逻辑：AND、OR、NOT 的完整真值表',
        content: `
## NULL 不是值，是"未知"

NULL 的含义是**这里没有值 / 值未知**，不是 0、不是空字符串。它在运算与比较中有三条铁律：

- 任何与 NULL 的比较（=、<>、>、<、LIKE、IN）结果都是 **UNKNOWN**；
- 任何与 NULL 的算术运算（+、-、*、/）结果都是 **NULL**；
- 大多数函数遇到 NULL 也返回 NULL（LENGTH、UPPER、SUBSTR……）。

所以 \`SELECT NULL = NULL\` 返回 NULL 而不是 TRUE——"两个未知值相等吗"的答案只能是"不知道"。

## 完整真值表

| A | B | A AND B | A OR B |
| --- | --- | --- | --- |
| TRUE | TRUE | TRUE | TRUE |
| TRUE | FALSE | FALSE | TRUE |
| TRUE | UNKNOWN | UNKNOWN | TRUE |
| FALSE | FALSE | FALSE | FALSE |
| FALSE | UNKNOWN | FALSE | **UNKNOWN** |
| UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |

以及一元运算：\`NOT TRUE = FALSE\`、\`NOT FALSE = TRUE\`、**\`NOT UNKNOWN = UNKNOWN\`**。

从表里能读出两个"反直觉"结论：

1. \`FALSE AND UNKNOWN\` 是 **FALSE**，不是 UNKNOWN——因为无论未知是什么，"假且未知"都为假；这也是 SQL 短路求值的基础；
2. \`TRUE OR UNKNOWN\` 是 **TRUE**——"真或未知"必为真。

## WHERE 只接受 TRUE

\`\`\`sql
SELECT COUNT(*) FROM customers WHERE member_level <> '金卡' OR member_level IS NULL;
\`\`\`

前一半对金卡行是 FALSE、对银卡/普通是 TRUE、对 NULL 行是 UNKNOWN；后一半把 NULL 行变成 TRUE。最终结果 = 15 - 4 = 11。

如果删掉 \`OR member_level IS NULL\`，NULL 行在 OR 的两侧都是 UNKNOWN，被 WHERE 丢弃，于是"非金卡"少了一个人——**不是错误，而是静默少一行**，这才是最危险的。

## 哪些写法会"吃"掉 NOT

\`\`\`sql
-- 本意：不是"金卡或银卡"
WHERE NOT (member_level = '金卡' OR member_level = '银卡')
\`\`\`

对 NULL 行，括号内是 UNKNOWN，NOT UNKNOWN 仍是 UNKNOWN，过滤掉。想包含 NULL 必须写：

\`\`\`sql
WHERE NOT (member_level IN ('金卡', '银卡')) OR member_level IS NULL
\`\`\`

同理 \`NOT IN (子查询)\`：只要子查询结果里混进一个 NULL，整个表达式永远不可能为 TRUE，结果集恒为空。这是第 4 章的必考坑。

## 把 NULL 变成可比较的值

分析报告里通常不希望"未知"消失，而是显式显示：

\`\`\`sql
SELECT COALESCE(member_level, '未评级') AS level, COUNT(*) AS cnt
FROM customers
GROUP BY level;
\`\`\`

\`COALESCE(a, b, c)\` 返回第一个非 NULL 参数；\`IFNULL(a, b)\` 是它的两参数版（SQLite/MySQL）；\`NULLIF(a, b)\` 则在 a = b 时返回 NULL——常用于"防止除零"：\`x / NULLIF(y, 0)\`。

## NULL 在排序、聚合、唯一约束中的表现

| 场景 | 行为 |
| --- | --- |
| ORDER BY 升序 | SQLite / MySQL 把 NULL 视为最小放最前；PostgreSQL 视为最大放最后，可用 \`NULLS FIRST / NULLS LAST\`（SQLite 3.30+ 也支持） |
| COUNT(*) / COUNT(col) | 前者数行，后者跳过 NULL |
| SUM / AVG / MAX / MIN | 跳过 NULL；全为 NULL 时返回 NULL |
| GROUP BY | NULL 自成一组 |
| UNIQUE 索引 | 多个 NULL 不算冲突（主键则不允 NULL） |
| NULL 参与算术 | 结果为 NULL，会一路传播到最终结果 |

**结论**：只要一列允许 NULL，你就要在三处做决定——过滤时是否包含它、展示时是否替换它、计算时是否兜底。把这三件事写进代码，比事后排查报表差额便宜得多。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '`x <> \'值\'`、`NOT x IN (...)`、`x NOT LIKE \'...\'` 在 x 为 NULL 时都是 UNKNOWN，会静默少行；需要包含 NULL 时显式加 `OR x IS NULL`。',
          },
          {
            kind: 'note',
            text: '`FALSE AND UNKNOWN = FALSE`、`TRUE OR UNKNOWN = TRUE`，这是 SQL 短路求值的依据；但 `NOT UNKNOWN` 依旧是 UNKNOWN。',
          },
          {
            kind: 'leak',
            text: '两个表 LEFT JOIN 后对右表列写反连接条件（`WHERE 右表列 <> \'x\'`），会连同"没匹配上"的行一起过滤掉，结果变成 INNER JOIN。',
          },
        ],
        demos: [
          {
            title: '三值逻辑实况：NULL 参与比较与逻辑运算的结果',
            lang: 'sql',
            dataset: 'retail',
            code: `SELECT (NULL = NULL) AS eq_null,
       (NULL IS NULL) AS is_null,
       (FALSE AND NULL) AS f_and_null,
       (TRUE OR NULL) AS t_or_null,
       (NOT NULL) AS not_null,
       ('x' || NULL) AS concat_null,
       typeof(NULL = NULL) AS cmp_type`,
          },
          {
            title: '同一个"非金卡"需求，两种写法的行数差',
            lang: 'sql',
            dataset: 'retail',
            code: `SELECT SUM(CASE WHEN member_level <> '金卡' THEN 1 ELSE 0 END) AS naive_cnt,
       SUM(CASE WHEN member_level <> '金卡' OR member_level IS NULL THEN 1 ELSE 0 END) AS correct_cnt,
       COUNT(*) AS total
FROM customers`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'sql-1-x1',
        type: 'sql',
        difficulty: 1,
        question:
          '查询 `products` 表中所有商品的名称与标价，按标价从低到高排列。**期望列**：`product_name`、`price`。',
        starterSql: '-- 在 SELECT 后写两列，最后加 ORDER BY\nSELECT  FROM products',
        referenceSql: 'SELECT product_name, price FROM products ORDER BY price ASC',
        explanation:
          '最基础的"取列 + 排序"。`ORDER BY price` 默认就是升序（ASC 可省略）。最便宜的是收纳箱 49 元，最贵的是显示器 27 寸 1599 元。',
        tags: ['SELECT', 'ORDER BY'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x2',
        type: 'sql',
        difficulty: 1,
        question:
          '查询所有客户的名字，并把它命名为 `customer_name`（用 AS 起别名）。**期望列**：`customer_name`。',
        starterSql: 'SELECT name  FROM customers',
        referenceSql: 'SELECT name AS customer_name FROM customers',
        explanation:
          '`AS` 给列起别名，结果集的列名就变成 `customer_name`。判分时会按列名对齐，所以别名不是装饰，而是"接口约定"。',
        tags: ['别名', 'AS'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x3',
        type: 'sql',
        difficulty: 1,
        question:
          '查询 `customers` 表中的大区（`region`）名称，每个大区只显示一次。**期望列**：`region`。',
        starterSql: 'SELECT  region FROM customers',
        referenceSql: 'SELECT DISTINCT region FROM customers',
        explanation:
          '`SELECT DISTINCT` 对整行去重，这里只有 region 一列，所以得到 6 个不同的大区：华东、华北、华南、西南、华中、西北。',
        tags: ['DISTINCT'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x4',
        type: 'sql',
        difficulty: 1,
        question:
          '查询商品名与"标价 - 成本"的差值，差值列命名为 `profit`。**期望列**：`product_name`、`profit`。',
        starterSql: 'SELECT product_name, price -  AS profit FROM products',
        referenceSql: 'SELECT product_name, price - cost AS profit FROM products',
        explanation:
          'SELECT 支持算术表达式。`price - cost` 表示标价毛利（不含折扣与销量），是理解"表达式列"的最小例子。',
        tags: ['表达式', '算术运算'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x5',
        type: 'sql',
        difficulty: 1,
        question:
          '统计 `products` 表中共有多少个商品，列名为 `product_cnt`。**期望列**：`product_cnt`。',
        starterSql: 'SELECT COUNT(*) AS product_cnt FROM products',
        referenceSql: 'SELECT COUNT(*) AS product_cnt FROM products',
        explanation: '`COUNT(*)` 数的是行数，结果 12。它与第 3 章的综合聚合是一脉相承的：聚合把多行压成一行。',
        tags: ['COUNT'],
        relatedLessonId: 'sql-l-1-1',
      },
      {
        id: 'sql-1-x6',
        type: 'sql',
        difficulty: 1,
        question:
          '查询 `orders` 表中前三笔订单的订单号与下单日期。**期望列**：`order_id`、`order_date`。',
        starterSql: 'SELECT order_id, order_date FROM orders LIMIT ',
        referenceSql: 'SELECT order_id, order_date FROM orders ORDER BY order_id LIMIT 3',
        explanation:
          '`LIMIT 3` 取前 3 行。这里同时写了 `ORDER BY order_id`，保证"前三笔"是确定的——没有排序的 LIMIT 取到哪 3 行由数据库决定。',
        tags: ['LIMIT', 'ORDER BY'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x7',
        type: 'sql',
        difficulty: 2,
        question:
          '查询会员等级为"金卡"的客户编号与姓名。**期望列**：`customer_id`、`name`。',
        starterSql: "SELECT customer_id, name FROM customers WHERE member_level = ",
        referenceSql: "SELECT customer_id, name FROM customers WHERE member_level = '金卡'",
        explanation: '字符串常量必须用单引号。金卡客户共 4 位：张伟、刘洋、孙悦、冯雪。',
        tags: ['WHERE', '字符串常量'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x8',
        type: 'sql',
        difficulty: 2,
        question:
          '把客户姓名与城市拼接成「姓名@城市」的形式，列名 `label`。**期望列**：`label`。',
        starterSql: "SELECT name   '@'   city AS label FROM customers",
        referenceSql: "SELECT name || '@' || city AS label FROM customers",
        explanation:
          'SQLite/PostgreSQL 用 `||` 拼接字符串；MySQL 要用 `CONCAT(name, \'@\', city)`。注意任何一项为 NULL 时整个拼接结果都是 NULL。',
        tags: ['字符串拼接', '||'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x9',
        type: 'sql',
        difficulty: 2,
        question:
          '查询标价大于等于 400 元的商品名称与标价。**期望列**：`product_name`、`price`。',
        starterSql: 'SELECT product_name, price FROM products WHERE price ',
        referenceSql: 'SELECT product_name, price FROM products WHERE price >= 400',
        explanation: '`>=` 是"大于等于"，结果 3 行：机械键盘 499、显示器 1599、运动鞋 459。',
        tags: ['WHERE', '比较运算'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x10',
        type: 'sql',
        difficulty: 2,
        question:
          '查询 `orders` 表中状态为"已取消"的订单号与状态。**期望列**：`order_id`、`status`。',
        starterSql: "SELECT order_id, status FROM orders WHERE status = '已取消'",
        referenceSql: "SELECT order_id, status FROM orders WHERE status = '已取消'",
        explanation: '共 4 笔取消订单：1004、1010、1020、1034。这 4 笔的金额合计 1355 元，会在第 6 章的口径分析里再次出现。',
        tags: ['WHERE'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x11',
        type: 'sql',
        difficulty: 2,
        question:
          '每位客户全名与会员等级，等级为空时显示 `未评级`，列名分别为 `name`、`level`。**期望列**：`name`、`level`。',
        starterSql: "-- COALESCE 返回第一个非 NULL 值\nSELECT name, COALESCE(member_level, '未评级') AS level FROM customers",
        referenceSql: "SELECT name, COALESCE(member_level, '未评级') AS level FROM customers",
        explanation:
          '`COALESCE(x, \'未评级\')` 在 x 为 NULL 时返回替代值。15 行全部保留，只有许晴显示为"未评级"——这正是 NULL 三值逻辑的工程用途。',
        tags: ['NULL', 'COALESCE'],
        relatedLessonId: 'sql-l-1-5',
      },
      {
        id: 'sql-1-x12',
        type: 'sql',
        difficulty: 2,
        question:
          '查询客户编号、姓名、会员等级，要求**只保留会员等级非空的客户**。**期望列**：`customer_id`、`name`、`member_level`。',
        starterSql: 'SELECT customer_id, name, member_level FROM customers WHERE member_level ',
        referenceSql: 'SELECT customer_id, name, member_level FROM customers WHERE member_level IS NOT NULL',
        explanation:
          '`IS NOT NULL` 才是判空的正确写法，结果为 14 行。写成 `member_level <> NULL` 会返回 0 行——那正是本章要警惕的"静默空结果"。',
        tags: ['NULL', 'IS NOT NULL'],
        relatedLessonId: 'sql-l-1-5',
      },
      {
        id: 'sql-1-x13',
        type: 'sql',
        difficulty: 2,
        question:
          '查询 `orders` 表中的订单号与下单月份（取 `order_date` 的第 6、7 位，结果形如 `01`），列名 `month`，只返回前 5 行。**期望列**：`order_id`、`month`。',
        starterSql: 'SELECT order_id, SUBSTR(order_date, 6, 2) AS month FROM orders LIMIT ',
        referenceSql: 'SELECT order_id, SUBSTR(order_date, 6, 2) AS month FROM orders ORDER BY order_id LIMIT 5',
        explanation:
          '`SUBSTR(文本, 起始位置, 长度)` 从 1 开始计数，所以月份从第 6 个字符开始取 2 位。ISO 日期文本的好处就在这里：位置固定、可切片。',
        tags: ['字符串函数', 'SUBSTR'],
        relatedLessonId: 'sql-l-1-2',
      },
      {
        id: 'sql-1-x14',
        type: 'sql',
        difficulty: 2,
        question:
          '查询 2024 年 1 月 15 日之后（含当天）注册的客户姓名与注册日期，按注册日期升序。**期望列**：`name`、`signup_date`。',
        starterSql: "SELECT name, signup_date FROM customers WHERE signup_date >= '2024-01-15'",
        referenceSql: "SELECT name, signup_date FROM customers WHERE signup_date >= '2024-01-15' ORDER BY signup_date",
        explanation:
          '日期在 SQLite 中是 TEXT，ISO 8601 格式下字典序 = 时间序，所以可以直接用字符串比较。结果是 2 行：许晴（2024-02-14）与邓超（2024-03-20）；冯雪是 2023-12-25，不满足条件。',
        tags: ['日期比较', 'TEXT 日期'],
        relatedLessonId: 'sql-l-1-2',
      },
      {
        id: 'sql-1-x15',
        type: 'sql',
        difficulty: 2,
        question:
          '返回一行，展示 `customers` 表的总行数（列名 `total_rows`）与不同城市的个数（列名 `city_cnt`）。**期望列**：`total_rows`、`city_cnt`。',
        starterSql: 'SELECT COUNT(*) AS total_rows, COUNT(DISTINCT city) AS city_cnt FROM customers',
        referenceSql: 'SELECT COUNT(*) AS total_rows, COUNT(DISTINCT city) AS city_cnt FROM customers',
        explanation:
          '`COUNT(*)` = 15，`COUNT(DISTINCT city)` = 11。一个查询里可以并列多个聚合，输出仍然是 1 行。',
        tags: ['COUNT', 'COUNT DISTINCT'],
        relatedLessonId: 'sql-l-1-1',
      },
      {
        id: 'sql-1-x16',
        type: 'sql',
        difficulty: 3,
        question:
          '有一列 `member_level`，用 CASE 把客户分成 `金卡`、`其他`（含银卡、普通）与 `未评级`（NULL）三类，列名 `level_group`，并返回客户编号。**期望列**：`customer_id`、`level_group`。',
        starterSql:
          "SELECT customer_id,\n       CASE WHEN member_level = '金卡' THEN '金卡'\n            WHEN member_level IS NULL THEN '未评级'\n            ELSE '其他' END AS level_group\nFROM customers",
        referenceSql:
          "SELECT customer_id, CASE WHEN member_level = '金卡' THEN '金卡' WHEN member_level IS NULL THEN '未评级' ELSE '其他' END AS level_group FROM customers",
        explanation:
          'CASE 自上而下判断，会把 NULL 行交给 `IS NULL` 分支，其余交给 ELSE。如果漏掉 `IS NULL` 分支，NULL 行会落到 ELSE 变成"其他"，分类就错了。',
        tags: ['CASE WHEN', 'NULL'],
        relatedLessonId: 'sql-l-1-5',
      },
      {
        id: 'sql-1-x17',
        type: 'sql',
        difficulty: 3,
        question:
          '查询订单号与订单金额（明细的 `quantity * unit_price * (1 - discount)` 之和），只需返回**订单 1001 与 1005** 两行的结果，金额列名 `amount`，保留 2 位小数。**期望列**：`order_id`、`amount`。',
        starterSql:
          'SELECT order_id, ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amount\nFROM order_items\nGROUP BY order_id\nHAVING order_id IN (1001, 1005)',
        referenceSql:
          'SELECT order_id, ROUND(SUM(quantity * unit_price * (1 - discount)), 2) AS amount FROM order_items WHERE order_id IN (1001, 1005) GROUP BY order_id',
        explanation:
          '订单 1001 = 2 × 299 × 0.9 + 129 = 667.2，订单 1005 = 2 × 459 × 0.9 + 89 = 915.2。条件 `order_id IN (...)` 既可以放 WHERE（先过滤行，更推荐），也可以放 HAVING（对组过滤），结果相同。',
        tags: ['GROUP BY', 'IN', '表达式'],
        relatedLessonId: 'sql-l-1-4',
      },
      {
        id: 'sql-1-x18',
        type: 'sql',
        difficulty: 3,
        question:
          '查询 `typeof()` 结果：返回每个商品 `price` 的存储类型，列名 `price_type`，并只保留一行即可。**期望列**：`price_type`。',
        starterSql: 'SELECT typeof(price) AS price_type FROM products LIMIT 1',
        referenceSql: 'SELECT DISTINCT typeof(price) AS price_type FROM products',
        explanation:
          '`typeof()` 返回 SQLite 的存储类（`integer`/`real`/`text`/`null`/`blob`），这里答案是 `real`。它再次说明 SQLite 的类型是"存储类"，而不是强约束。',
        tags: ['typeof', 'SQLite'],
        relatedLessonId: 'sql-l-1-2',
      },
      {
        id: 'sql-1-x19',
        type: 'sql',
        difficulty: 3,
        question:
          '用 `NOT IN` 子查询找出「从未出现在任何订单明细里」的商品，返回这些商品的 `product_id`、`product_name`、`category`，即 `products.product_id` 不在子查询 `SELECT product_id FROM order_items` 的结果里。本数据中所有商品都至少被卖过一次，因此这道题**返回空结果即正确**。**期望列**：`product_id`、`product_name`、`category`。',
        starterSql:
          'SELECT p.product_id, p.product_name, p.category\nFROM products AS p\nWHERE p.product_id NOT IN (SELECT i.product_id FROM order_items AS i)',
        referenceSql:
          'SELECT p.product_id, p.product_name, p.category, p.price FROM products AS p WHERE p.product_id NOT IN (SELECT i.product_id FROM order_items AS i)',
        allowEmpty: true,
        explanation:
          '这里是安全的 `NOT IN`：子查询列 `order_items.product_id` 无 NULL，所以不会出现"NOT IN 恒空"的陷阱。如果没有把握，可改用 `NOT EXISTS`。',
        tags: ['NOT IN', '子查询基础'],
        relatedLessonId: 'sql-l-1-5',
      },
      {
        id: 'sql-1-x20',
        type: 'sql',
        difficulty: 3,
        question:
          '查询每个商品的标价，并用 `printf` 输出形如 `¥299.00` 的文本，列名 `price_label`，同时返回商品名。**期望列**：`product_name`、`price_label`。',
        starterSql: "SELECT product_name, printf('¥%.2f', price) AS price_label FROM products",
        referenceSql: "SELECT product_name, printf('¥%.2f', price) AS price_label FROM products",
        explanation:
          '`printf(格式串, 值)` 遵循 C 的格式规则，`%.2f` 表示保留两位小数。MySQL 用 `FORMAT` 或 `CONCAT`，PostgreSQL 用 `to_char(price, \'999.99\')`。',
        tags: ['printf', '格式化'],
        relatedLessonId: 'sql-l-1-2',
      },
      {
        id: 'sql-1-x21',
        type: 'sql',
        difficulty: 3,
        question:
          '验证执行顺序：返回 `orders` 表行数（`all_rows`）与"只看已完成订单时的月均订单数"（`avg_monthly_done`，保留 2 位小数，按 12 个月计）。**期望列**：`all_rows`、`avg_monthly_done`。',
        starterSql:
          "SELECT COUNT(*) AS all_rows,\n       ROUND(1.0 * SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) / 12, 2) AS avg_monthly_done\nFROM orders",
        referenceSql:
          "SELECT COUNT(*) AS all_rows, ROUND(1.0 * SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) / 12, 2) AS avg_monthly_done FROM orders",
        explanation:
          '45 行、已完成 41 单，41 / 12 ≈ 3.42。注意 `1.0 *` 的作用：整数相除会被截断，乘上浮点常量后才得到小数（第 3、6 章还会反复强调）。',
        tags: ['条件聚合', '执行顺序'],
        relatedLessonId: 'sql-l-1-4',
      },
      {
        id: 'sql-1-x22',
        type: 'single',
        difficulty: 1,
        question: '下列哪一列**不可能**作为 `customers` 表的主键？',
        options: [
          { value: 'A', text: '`customer_id`（每位客户一个编号，且无重复）' },
          { value: 'B', text: '`name`（存在重名可能，但本数据恰好不重复）' },
          { value: 'C', text: '`signup_date`（注册日期）' },
          { value: 'D', text: '`city`（一个城市对应多位客户）' },
        ],
        answer: 'D',
        explanation:
          '`city` 一个值对应多行（北京 3 位客户），连"唯一"都不满足，绝对不可能是主键。`name` 在本数据里唯一，但业务上重名风险高，属于"不推荐"；而主键的硬性要求是唯一 + 非空。',
        tags: ['主键'],
        relatedLessonId: 'sql-l-1-1',
      },
      {
        id: 'sql-1-x23',
        type: 'single',
        difficulty: 2,
        question: '书写顺序为 `SELECT ... FROM ... WHERE ... ORDER BY ... LIMIT`，其中**最晚**执行的子句是？',
        options: [
          { value: 'A', text: 'FROM' },
          { value: 'B', text: 'WHERE' },
          { value: 'C', text: 'ORDER BY' },
          { value: 'D', text: 'LIMIT' },
        ],
        answer: 'D',
        explanation:
          '逻辑执行顺序是 FROM → WHERE（→ GROUP BY → HAVING）→ SELECT → ORDER BY → LIMIT。LIMIT 必须最后执行，否则"取前 N 行"就失去了意义。',
        tags: ['执行顺序'],
        relatedLessonId: 'sql-l-1-4',
      },
      {
        id: 'sql-1-x24',
        type: 'single',
        difficulty: 2,
        question: '`SELECT COUNT(*) AS n FROM customers WHERE city = NULL;` 的结果是？',
        options: [
          { value: 'A', text: '0（一行结果，n = 0）' },
          { value: 'B', text: 'NULL' },
          { value: 'C', text: '15' },
          { value: 'D', text: '报语法错误' },
        ],
        answer: 'A',
        explanation:
          '`city = NULL` 对每一行都返回 UNKNOWN，WHERE 不保留任何行，但 `COUNT(*)` 在空集上返回 0，所以是 1 行结果、n = 0。要判空必须用 `IS NULL`。',
        tags: ['NULL', 'COUNT'],
        relatedLessonId: 'sql-l-1-5',
      },
      {
        id: 'sql-1-x25',
        type: 'multiple',
        difficulty: 2,
        question: '关于 SQL 的逻辑执行顺序，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '`WHERE` 中不能引用 `SELECT` 里定义的列别名' },
          { value: 'B', text: '`ORDER BY` 可以引用 `SELECT` 里定义的列别名' },
          { value: 'C', text: '`HAVING` 可以引用聚合函数的结果' },
          { value: 'D', text: '`GROUP BY` 在 `WHERE` 之前执行' },
          { value: 'E', text: '`LIMIT` 在 `ORDER BY` 之后执行' },
        ],
        answer: ['A', 'B', 'C', 'E'],
        explanation:
          '别名的产生发生在 SELECT 阶段，所以 WHERE 看不到、ORDER BY 与 HAVING 能看到（HAVING 在 SQLite/MySQL 支持别名）。WHERE 在 GROUP BY 之前，D 错。',
        tags: ['执行顺序'],
        relatedLessonId: 'sql-l-1-4',
      },
      {
        id: 'sql-1-x26',
        type: 'multiple',
        difficulty: 2,
        question: '下列哪些写法会**静默漏掉** `member_level` 为 NULL 的那一行？（多选）',
        options: [
          { value: 'A', text: '`WHERE member_level <> \'金卡\'`' },
          { value: 'B', text: '`WHERE NOT (member_level = \'金卡\')`' },
          { value: 'C', text: '`WHERE member_level IN (\'银卡\', \'普通\')`' },
          { value: 'D', text: '`WHERE member_level IS NULL OR member_level <> \'金卡\'`' },
          { value: 'E', text: '`WHERE member_level NOT IN (\'金卡\', NULL)`' },
        ],
        answer: ['A', 'B', 'C', 'E'],
        explanation:
          'A、B、C 对 NULL 行都得到 UNKNOWN；E 更极端——只要集合里有 NULL，`NOT IN` 对任何行都不可能为 TRUE，结果恒为空集。D 显式补上了 `IS NULL`，反而会保留 NULL 行。',
        tags: ['NULL', '三值逻辑'],
        relatedLessonId: 'sql-l-1-5',
      },
      {
        id: 'sql-1-x27',
        type: 'judge',
        difficulty: 1,
        question: '在逻辑执行顺序中，`WHERE` 子句先于 `GROUP BY` 子句执行。',
        answer: true,
        explanation:
          'FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT。这正是"能在 WHERE 里过滤的绝不要留给 HAVING"的原因：先减少行数再分组，代价更小。',
        tags: ['执行顺序'],
        relatedLessonId: 'sql-l-1-4',
      },
      {
        id: 'sql-1-x28',
        type: 'judge',
        difficulty: 2,
        question: '`SELECT NULL = NULL;` 在 SQLite 中返回 1（TRUE）。',
        answer: false,
        explanation:
          '任何与 NULL 的比较结果都是 UNKNOWN，`NULL = NULL` 返回 NULL。要判断"是否为 NULL"只能用 `IS NULL`，那是专门为 NULL 设计的谓词。',
        tags: ['NULL'],
        relatedLessonId: 'sql-l-1-5',
      },
      {
        id: 'sql-1-x29',
        type: 'fill',
        difficulty: 2,
        question: '补全语句：把客户姓名别名为 `customer_name`（使用显式的别名关键字）。',
        prefix: 'SELECT name ',
        suffix: ' customer_name FROM customers;',
        blanks: [['AS', '/^as$/i']],
        explanation: '`name AS customer_name` 与 `name customer_name` 等价，但显式写 `AS` 可读性更好，团队规范通常强制要求。',
        tags: ['别名'],
        relatedLessonId: 'sql-l-1-3',
      },
      {
        id: 'sql-1-x30',
        type: 'fill',
        difficulty: 2,
        question: '补全语句，让名称为 NULL 的客户显示为「未评级」（使用 SQL 标准的空值替换函数）：',
        prefix: 'SELECT ',
        suffix: "(member_level, '未评级') AS level FROM customers;",
        blanks: [['COALESCE', '/^coalesce$/i']],
        explanation: '`COALESCE(a, b, ...)` 返回第一个非 NULL 参数，是 SQL 标准函数；SQLite/MySQL 还提供两参数版 `IFNULL`。',
        tags: ['NULL', 'COALESCE'],
        relatedLessonId: 'sql-l-1-5',
      },
      {
        id: 'sql-1-x31',
        type: 'open',
        difficulty: 2,
        question:
          '同事写的报表 SQL 是「统计非金卡客户数」，用了 `SELECT COUNT(*) FROM customers WHERE member_level <> \'金卡\';`，结果比预期少 1。请解释原因、给出两种修复写法，并说明在真实项目里如何避免这类问题。',
        referenceAnswer: `**原因**：许晴的 \`member_level\` 是 NULL。SQL 是三值逻辑，\`NULL <> \'金卡\'\` 得到 UNKNOWN，而 \`WHERE\` 只保留 TRUE 的行，所以这一行被静默丢弃，结果是 9 而不是 10。**不报错、不提示**，这是最隐蔽的一类 bug。

**修复一（显式补 NULL）**：\`WHERE member_level <> \'金卡\' OR member_level IS NULL\`。

**修复二（先归一化再比较）**：\`WHERE COALESCE(member_level, \'未评级\') <> \'金卡\'\`。

**修复三（用反向排除）**：\`WHERE NOT (member_level = \'金卡\')\` 依然不行，必须配合 \`IS NULL\`；或用 \`WHERE member_level IS NULL OR member_level NOT IN (\'金卡\')\`。

**工程上如何避免**：① 字段设计上尽量用 \`NOT NULL DEFAULT \'未评级\'\`，把"未知"变成一个显式业务值；② 写 SQL 时凡是对可空列做"不等于/不在/不匹配"，都同时写一遍 NULL 分支；③ 在报表层用总数校验——"非金卡 + 金卡 = 总客户数"，等式不成立就说明漏了 NULL。`,
        rubric: [
          { point: '指出 NULL 使比较结果为 UNKNOWN、被 WHERE 过滤', score: 2 },
          { point: '给出至少两种修复写法（显式 IS NULL / COALESCE）', score: 2 },
          { point: '提出字段设计或校验层面的工程手段', score: 1 },
        ],
        keywords: ['NULL', 'UNKNOWN', 'IS NULL', 'COALESCE'],
        tags: ['NULL', '数据质量'],
        explanation: '本题考察 SQL 基础语法细节。答题时需要区分不同子句的作用与执行顺序，注意 SQLite 与 MySQL/PostgreSQL 在个别语法上的差异。',
        relatedLessonId: 'sql-l-1-5',
      },
      {
        id: 'sql-1-x32',
        type: 'open',
        difficulty: 2,
        question:
          '请用 retail 数据集解释："为什么 `SELECT *` 不适合出现在正式查询里？"至少给出 3 个具体理由，并结合本数据集中 \`orders\` 与 \`customers\` 同时被查询的场景说明列名冲突问题。',
        referenceAnswer: `**理由一：列名冲突**。\`customers\` 与 \`orders\` 都含有 \`customer_id\`，\`SELECT *\` 后结果集出现两列同名，前端/导出工具按名字取值时会取到第一列，另一列被悄悄覆盖；这在下游做透视或 \`INSERT INTO ... SELECT *\` 时非常危险。

**理由二：列顺序不稳定**。一旦有人给表 \`ALTER TABLE ADD COLUMN\`，\`SELECT *\` 的列顺序与列数都会变，依赖位置的下游代码（CSV 导出、按列号取值的脚本）会整体错位。

**理由三：与覆盖索引冲突**。若存在索引 \`(order_id, quantity)\`，只查这两列时可以只读索引、不回表；\`SELECT *\` 必然回表读整行。

**理由四：传输与解析浪费**。\`order_items\` 的 6 列里往往只需要 2 列，宽表上浪费成倍。

**理由五：可维护性**。读代码的人无法判断真正依赖了哪些字段，字段下线时不敢动。`,
        rubric: [
          { point: '指出 JOIN 后同名列冲突（customer_id）', score: 1 },
          { point: '指出列顺序不稳定导致错位', score: 1 },
          { point: '指出性能代价（覆盖索引 / 传输）', score: 1 },
          { point: '指出可维护性与字段依赖不清', score: 1 },
        ],
        keywords: ['列名', '覆盖索引', '列顺序', '可维护性'],
        tags: ['SELECT *', '规范'],
        explanation: '本题考察 SQL 基础语法细节。答题时需要区分不同子句的作用与执行顺序，注意 SQLite 与 MySQL/PostgreSQL 在个别语法上的差异。',
        relatedLessonId: 'sql-l-1-3',
      },
    ],
  },

  /* ============================================================
   *  第 2 章：筛选与排序
   * ============================================================ */
  {
    chapterId: 'sql-2',
    exercises: [],
  },
];
