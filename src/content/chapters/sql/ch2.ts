import type { Chapter } from '../../../types';

/* ============================================================
 *  第 2 章：筛选与排序
 * ============================================================ */

const ch2: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'sql-2',
  title: '筛选与排序',
  goal: '熟练使用 WHERE 的各类条件（比较、逻辑、集合、范围、模糊、NULL），掌握 DISTINCT、多列排序、分页与 CASE WHEN 表达式，把"取哪几行、按什么顺序"说清楚。',
  lessons: [
    {
      id: 'sql-l-2-1',
      title: 'WHERE 与比较、逻辑运算',
      content: `
### 学习目标

学完本节，你应该能够：
1. 组合比较与逻辑运算完成筛选；
2. 用括号显式化优先级；
3. 避免 NULL 参与比较的三值陷阱。

### 前置知识

- 关系模型与 NULL（l1-1/1-5）。

### 问题背景

WHERE 是从“全表”到“目标子集”的漏斗入口：比较、逻辑、IN/BETWEEN/LIKE 的组合覆盖 90% 的筛选需求。

### 直觉理解

WHERE 像海关安检：每条记录过一道闸（条件），全过才放行——AND 是串联闸、OR 是并联闸。

### 核心概念与原理详解

## WHERE 的工作方式

\`WHERE\` 在 \`FROM\` 之后、\`GROUP BY\` 之前执行，**逐行判断条件**，只保留结果为 \`TRUE\` 的行。对没有聚合的计算来说，这就是"行级过滤"。

\`\`\`sql
SELECT order_id, order_date, status
FROM orders
WHERE status = '已完成';
\`\`\`

每一步都问一个问题："这一行满足条件吗？" 满足留下，不满足丢掉。

## 常用比较运算

| 运算符 | 含义 | 示例 |
| --- | --- | --- |
| \`=\` | 等于（单个等号，不是 \`==\`） | \`status = '已完成'\` |
| \`<>\` 或 \`!=\` | 不等于 | \`status <> '已取消'\` |
| \`>\` \`>=\` \`<\` \`<=\` | 大小比较 | \`price >= 200\` |
| \`BETWEEN a AND b\` | 闭区间 | \`order_date BETWEEN '2024-01-01' AND '2024-03-31'\` |
| \`IN (...)\` | 属于集合 | \`city IN ('北京','上海')\` |
| \`LIKE\` | 模式匹配 | \`name LIKE '张%'\` |

**字符串要加单引号**，数字不要加引号。SQLite 很宽容（\`price > '200'\` 会做隐式转换），但 MySQL 里 \`WHERE id = '1001abc'\` 会把 \`1001abc\` 转成 1001 从而命中，**而且会让索引失效**（第 6 章）。

## AND / OR / NOT 与优先级

SQL 的优先级是：**\`NOT\` > \`AND\` > \`OR\`**。这和你直觉中的"从左到右"不同，也是最容易写错的地方：

\`\`\`sql
-- 本意：华南或西南的女会员？——假设还有性别字段
WHERE region = '华南' OR region = '西南' AND member_level = '金卡'
-- 实际被解析为：
WHERE region = '华南' OR (region = '西南' AND member_level = '金卡')
\`\`\`

正确做法是**只要混用 AND/OR 就加括号**：

\`\`\`sql
WHERE (region = '华南' OR region = '西南') AND member_level = '金卡'
\`\`\`

同理 \`NOT\` 的组合要小心：

\`\`\`sql
WHERE NOT (status = '已取消' OR status IS NULL)
\`\`\`

## 条件写的顺序会影响可读性

把"最严格的条件"放前面在某些数据库里有一点点短路优化，但**更重要的是语义清晰**：先筛业务范围（时间、状态），再筛细节（城市、等级）。团队 review 时一眼能看出边界。

## 一个很常见的陷阱：状态筛选忘掉 NULL

如果 \`status\` 可能为 NULL，\`WHERE status <> '已取消'\` 会同时漏掉 NULL 行。在 \`retail\` 数据里 \`status\` 是 \`NOT NULL\`，所以没问题；但真实数据中"状态未回填"的订单非常常见，务必用 \`WHERE (status <> '已取消' OR status IS NULL)\` 或 \`WHERE COALESCE(status, '') <> '已取消'\`。

## 用 CASE WHEN 做行级判断（预告）

\`WHERE\` 决定"留哪些行"，\`CASE WHEN\` 决定"把行标成什么类别"，二者常配合使用：

\`\`\`sql
SELECT order_id,
       CASE WHEN status = '已完成' THEN '有效' ELSE '无效' END AS order_flag
FROM orders
WHERE status = '已完成';
\`\`\`

CASE 表达式的细节在本章第 3 节讲。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO t VALUES (?,?,?)",
                [(1,"A",90),(2,"B",70),(3,"A",55),(4,"C",88)])
con.execute("CREATE TABLE t (id INT, grp TEXT, score INT)")
rows = con.execute("SELECT id, grp, score FROM t WHERE grp IN ('A','C') AND score > 60 ORDER BY score DESC").fetchall()
print(rows)
con.close()
\`\`\`

预期输出（实测）：[(1, 'A', 90), (4, 'C', 88)]（IN+AND+ORDER BY 组合）

**常见错误**：WHERE 里用聚合函数（要用 HAVING）；LIKE 忘转义 % _；OR 与 AND 优先级不加括号。

### 常见误区

1. WHERE 与 HAVING 等价可换——执行顺序与语义不同；
2. NULL 参与 WHERE 比较按 False 处理——是 UNKNOWN，需 IS NULL 补；
3. ORDER BY 决定显示顺序保证结果稳定——无序表分页会抖。

### 知识关联

- **向前**：l1-5 的三值逻辑是 WHERE 的语义底；
- **向后**：l3-1 聚合前必先筛对子集；
- **平行**：Pandas 布尔筛选。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| WHERE | 行级过滤，先于聚合 |
| 运算 | IN/BETWEEN/LIKE+转义 |
| 顺序 | AND 优先于 OR，括号显式化 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '混用 AND / OR 时必须加括号：`a OR b AND c` 被解析为 `a OR (b AND c)`，而不是 `(a OR b) AND c`。',
        },
        {
          kind: 'pitfall',
          text: '`WHERE status <> \'已取消\'` 会漏掉 status 为 NULL 的行。真实数据里"状态未回填"很常见，记得 `OR status IS NULL`。',
        },
        {
          kind: 'note',
          text: '等于用 `=`，不是 `==`。`==` 在 SQLite 中能跑（兼容写法），但 MySQL/PostgreSQL 会直接报语法错误。',
        },
      ],
      demos: [
        {
          title: 'AND / OR / NOT 的组合',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT order_id, order_date, status
FROM orders
WHERE status = '已完成'
  AND order_date >= '2024-12-01'
ORDER BY order_date`,
        },
        {
          title: '括号改变结果：两种写法的对比',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT
  SUM(CASE WHEN region = '华南' OR (region = '华东' AND member_level = '金卡') THEN 1 ELSE 0 END) AS with_paren,
  SUM(CASE WHEN (region = '华南' OR region = '华东') AND member_level = '金卡' THEN 1 ELSE 0 END) AS correct
FROM customers`,
        },
        {
          title: '文本日期按字典序比较即按时间比较',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT MIN(order_date) AS first_date,
       MAX(order_date) AS last_date,
       SUM(CASE WHEN order_date < '2024-06-01' THEN 1 ELSE 0 END) AS h1_orders
FROM orders`,
        },
      ],
    },
    {
      id: 'sql-l-2-2',
      title: 'IN / BETWEEN / LIKE / IS NULL',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 IN/BETWEEN 替代冗长 OR；
2. 用 LIKE 配通配符与转义；
3. 用 IS NULL 精确处理缺失。

### 前置知识

- 关系模型与 NULL（l1-1/1-5）。

### 问题背景

WHERE 是从“全表”到“目标子集”的漏斗入口：比较、逻辑、IN/BETWEEN/LIKE 的组合覆盖 90% 的筛选需求。

### 直觉理解

WHERE 像海关安检：每条记录过一道闸（条件），全过才放行——AND 是串联闸、OR 是并联闸。

### 核心概念与原理详解

## IN：属于某个集合

\`\`\`sql
SELECT name, city FROM customers
WHERE city IN ('北京', '上海', '深圳');
\`\`\`

\`IN\` 等价于一串 \`OR\`，但更简洁。它的参数可以是字面量列表，也可以是**子查询**（第 4、5 章）。

**IN 与 NULL 的陷阱**：\`x NOT IN (1, NULL, 3)\` 永远不返回行，因为 \`x <> NULL\` 是 UNKNOWN，而循环中的 \`AND\` 一旦遇到 UNKNOWN 就可能整体为 UNKNOWN。写 \`NOT IN (子查询)\` 时，务必确认子查询不会返回 NULL。

## BETWEEN：闭区间

\`\`\`sql
SELECT * FROM orders
WHERE order_date BETWEEN '2024-03-01' AND '2024-03-31';
\`\`\`

\`BETWEEN a AND b\` 等价于 \`>= a AND <= b\`，**两端都包含**。它在日期上有一个经典坑：如果字段是带时间的 \`DATETIME\`，\`BETWEEN '2024-03-01' AND '2024-03-31'\` 会漏掉 \`2024-03-31 10:00:00\`。解决方案：

\`\`\`sql
WHERE order_time >= '2024-03-01' AND order_time < '2024-04-01'
\`\`\`

即用"左闭右开"的半开区间。

## LIKE：模糊匹配与两个通配符

| 通配符 | 含义 |
| --- | --- |
| \`%\` | 任意个字符（包括 0 个） |
| \`_\` | **恰好一个**字符 |

\`\`\`sql
SELECT name FROM customers WHERE name LIKE '张%';      -- 以张开头
SELECT name FROM customers WHERE name LIKE '%晴';      -- 以晴结尾
SELECT name FROM customers WHERE name LIKE '%磊%';     -- 含磊
SELECT name FROM customers WHERE name LIKE '张_';      -- 张 + 恰好一个字
\`\`\`

补充规则：

- \`LIKE\` 在 SQLite 中**默认大小写不敏感**（仅对 ASCII 有效，中文不受影响）；PostgreSQL 的 \`LIKE\` 是大小写敏感的，需要 \`ILIKE\`。
- 要匹配字面上的 \`%\` 或 \`_\`，用 \`ESCAPE\`：\`WHERE note LIKE '100\\%' ESCAPE '\\'\`。
- **前导 \`%\` 无法使用索引**（第 6 章），在千万级表上 \`LIKE '%abc'\` 会全表扫描。

## IS NULL / IS NOT NULL

NULL 不能用 \`=\` 比较，必须用：

\`\`\`sql
SELECT name, member_level FROM customers WHERE member_level IS NULL;
SELECT name FROM customers WHERE member_level IS NOT NULL;
\`\`\`

三种"空"要分清：

| 值 | 含义 | 判断方式 |
| --- | --- | --- |
| \`NULL\` | 未知 / 缺失 | \`IS NULL\` |
| \`''\` | 空字符串（有值） | \`= ''\` 或 \`LENGTH(x) = 0\` |
| \`0\` | 数值零（有值） | \`= 0\` |

## 用一个 SQL 判断各条件的命中行数

不要一次只试一个条件，很多分析师的习惯是写一个"诊断查询"，把多个条件的命中数一次算出来，再决定怎么组合：

\`\`\`sql
SELECT
  SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) AS done,
  SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) AS canceled,
  COUNT(*) AS total
FROM orders;
\`\`\`

这是分析工作里非常高效的一种"先摸底、再写查询"的模式。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO t VALUES (?,?,?)",
                [(1,"A",90),(2,"B",70),(3,"A",55),(4,"C",88)])
con.execute("CREATE TABLE t (id INT, grp TEXT, score INT)")
rows = con.execute("SELECT id, grp, score FROM t WHERE grp IN ('A','C') AND score > 60 ORDER BY score DESC").fetchall()
print(rows)
con.close()
\`\`\`

预期输出（实测）：[(1, 'A', 90), (4, 'C', 88)]（IN+AND+ORDER BY 组合）

**常见错误**：WHERE 里用聚合函数（要用 HAVING）；LIKE 忘转义 % _；OR 与 AND 优先级不加括号。

### 常见误区

1. WHERE 与 HAVING 等价可换——执行顺序与语义不同；
2. NULL 参与 WHERE 比较按 False 处理——是 UNKNOWN，需 IS NULL 补；
3. ORDER BY 决定显示顺序保证结果稳定——无序表分页会抖。

### 知识关联

- **向前**：l1-5 的三值逻辑是 WHERE 的语义底；
- **向后**：l3-1 聚合前必先筛对子集；
- **平行**：Pandas 布尔筛选。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| WHERE | 行级过滤，先于聚合 |
| 运算 | IN/BETWEEN/LIKE+转义 |
| 顺序 | AND 优先于 OR，括号显式化 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`x NOT IN (子查询)` 只要子查询返回了 NULL，结果就是空集。子查询里记得加 `WHERE col IS NOT NULL`，或改用 `NOT EXISTS`。',
        },
        {
          kind: 'pitfall',
          text: '`BETWEEN \'2024-03-01\' AND \'2024-03-31\'` 在 DATETIME 字段上会漏掉 3 月 31 日当天带时间的记录。用 `>= 起点 AND < 下月 1 日`。',
        },
        {
          kind: 'performance',
          text: '`LIKE \'%关键字\'` 前端有通配符时无法走索引；能改成 `LIKE \'关键字%\'`（前缀匹配）或用全文检索（FTS）的，尽量改。',
        },
        {
          kind: 'note',
          text: '`LIKE` 在 SQLite 默认不区分大小写（仅 ASCII），PostgreSQL 区分大小写（需用 `ILIKE`），MySQL 是否区分取决于排序规则（collation）。',
        },
      ],
      demos: [
        {
          title: 'IN / BETWEEN / LIKE 各来一组',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT customer_id, name, city, signup_date
FROM customers
WHERE city IN ('北京', '上海', '深圳')
  AND signup_date BETWEEN '2023-01-01' AND '2023-06-30'
  AND name LIKE '%'
ORDER BY signup_date`,
        },
        {
          title: 'LIKE 的 % 与 _ 区别',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT name,
       CASE WHEN name LIKE '_磊' THEN 1 ELSE 0 END AS single_char_lei,
       CASE WHEN name LIKE '%磊' THEN 1 ELSE 0 END AS any_lei
FROM customers
WHERE name LIKE '%磊'`,
        },
        {
          title: 'IS NULL 与 = 空字符串、= 0 的区别',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COUNT(*) AS total,
       COUNT(member_level) AS not_null_level,
       SUM(CASE WHEN member_level IS NULL THEN 1 ELSE 0 END) AS is_null,
       SUM(CASE WHEN member_level = '' THEN 1 ELSE 0 END) AS empty_string
FROM customers`,
        },
      ],
    },
    {
      id: 'sql-l-2-3',
      title: 'DISTINCT、ORDER BY、LIMIT 与 CASE WHEN',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用 DISTINCT 去重并理解其代价；
2. 用 ORDER BY+LIMIT 分页；
3. 用 CASE WHEN 实现行内分支。

### 前置知识

- 关系模型与 NULL（l1-1/1-5）。

### 问题背景

WHERE 是从“全表”到“目标子集”的漏斗入口：比较、逻辑、IN/BETWEEN/LIKE 的组合覆盖 90% 的筛选需求。

### 直觉理解

WHERE 像海关安检：每条记录过一道闸（条件），全过才放行——AND 是串联闸、OR 是并联闸。

### 核心概念与原理详解

## DISTINCT：对"整行"去重

\`\`\`sql
SELECT DISTINCT city FROM customers;              -- 11 个城市
SELECT DISTINCT city, region FROM customers;      -- 对 (city, region) 组合去重
\`\`\`

**关键理解**：\`DISTINCT\` 作用于 SELECT 产生的**整行**，不是某一列。所以 \`SELECT DISTINCT city, member_level\` 的结果行数比城市数多，因为同一个城市可能有不同会员等级。想"只按 city 去重、随便取一个 member_level"是不合规的（那是 \`GROUP BY\` 或窗口函数的活）。

\`DISTINCT\` 与 \`COUNT\` 组合是统计"有多少个不同值"的标准写法：

\`\`\`sql
SELECT COUNT(DISTINCT city) AS city_cnt,
       COUNT(DISTINCT member_level) AS level_cnt   -- 注意 NULL 不计
FROM customers;
\`\`\`

| 写法 | 结果（retail） | 说明 |
| --- | --- | --- |
| \`COUNT(*)\` | 15 | 行数 |
| \`COUNT(member_level)\` | 14 | 非 NULL 值的个数 |
| \`COUNT(DISTINCT member_level)\` | 3 | 不同非 NULL 值：金卡/银卡/普通 |

## ORDER BY：多列排序

\`\`\`sql
SELECT customer_id, city, name
FROM customers
ORDER BY city ASC, customer_id DESC;
\`\`\`

- \`ASC\` 升序（默认，可省略），\`DESC\` 降序，**每个列可单独指定方向**；
- 多列排序是"**排序键逐级生效**"：先按 city 排，city 相同的再按 customer_id 排；
- 可以按**不在 SELECT 中的列**排序（\`SELECT name FROM customers ORDER BY signup_date\`）——这是分析里很常用的技巧；
- 可以用 **SELECT 中的别名**排序（\`ORDER BY total DESC\`），因为 ORDER BY 在 SELECT 之后执行；
- 也可以按**列序号**排序（\`ORDER BY 2 DESC\`），但不推荐，列顺序一改就错。

**排序中的 NULL**：SQLite 与 MySQL 把 NULL 视为最小值（升序在最前），PostgreSQL 视为最大值（升序在最后）。要统一行为可以显式写 \`ORDER BY (member_level IS NULL), member_level\`。

**排序中的稳定性**：SQL 标准不保证"值相同的行"顺序稳定，需要可复现结果时一定要加唯一的决胜键（如主键）。

## LIMIT / OFFSET：分页

\`\`\`sql
SELECT product_name, price FROM products ORDER BY price DESC LIMIT 3;
SELECT product_name, price FROM products ORDER BY price DESC LIMIT 3 OFFSET 3;  -- 第 2 页
\`\`\`

| 数据库 | 语法 |
| --- | --- |
| SQLite / PostgreSQL / MySQL | \`LIMIT n OFFSET m\`（PostgreSQL 也支持 \`OFFSET m LIMIT n\`） |
| SQL Server / Oracle 12c+ | \`OFFSET m ROWS FETCH NEXT n ROWS ONLY\` |

**没有 ORDER BY 的 LIMIT 是不确定的**——数据库可以按任意顺序返回 \`n\` 行，同样的 SQL 两次执行结果可能不同。这是"今天取到了 Top 1，明天换了"的常见原因。

**大表深分页**（第 6 章细讲）：\`OFFSET 1000000\` 意味着数据库要**先扫过并丢弃 100 万行**，越翻越慢。

## CASE WHEN：SQL 里的 if-else

**简单 CASE**（等值判断）：

\`\`\`sql
SELECT name,
       CASE member_level
         WHEN '金卡' THEN 'A'
         WHEN '银卡' THEN 'B'
         ELSE 'C'
       END AS tier
FROM customers;
\`\`\`

**搜索 CASE**（任意条件，更灵活，推荐）：

\`\`\`sql
SELECT product_name, price,
       CASE
         WHEN price >= 1000 THEN '高价'
         WHEN price >= 200  THEN '中价'
         ELSE '低价'
       END AS price_band
FROM products;
\`\`\`

规则要点：

1. **条件自上而下求值，命中第一个立即返回**（所以顺序很重要，先写严格条件）；
2. 没有 \`ELSE\` 时，未命中的行返回 \`NULL\`；
3. \`CASE\` 可以出现在 SELECT、WHERE、ORDER BY、GROUP BY 中；
4. \`CASE\` 是表达式，不是语句，**不能写 \`IF\` / \`IIF\`**（SQLite 有 \`iif()\`，但只适合两个分支）。

**CASE WHEN 最有价值的用法是"条件计数"**，把行按类别拆成多个指标，一次查询得到一张透视表：

\`\`\`sql
SELECT SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) AS done_cnt,
       SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) AS cancel_cnt
FROM orders;
\`\`\`

## 完整语法顺序

\`\`\`sql
SELECT   [DISTINCT] 列, 表达式 AS 别名
FROM     表 [别名]
WHERE    行级过滤条件
GROUP BY 分组列
HAVING   组级过滤条件
ORDER BY 排序列 [ASC|DESC]
LIMIT    n OFFSET m
\`\`\`

顺序写错（比如把 LIMIT 写在 ORDER BY 前面）会直接语法错误。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程（可逐行对照上方概念）：

### 代码实践

\`\`\`python
import sqlite3
con = sqlite3.connect(":memory:")
con.executemany("INSERT INTO t VALUES (?,?,?)",
                [(1,"A",90),(2,"B",70),(3,"A",55),(4,"C",88)])
con.execute("CREATE TABLE t (id INT, grp TEXT, score INT)")
rows = con.execute("SELECT id, grp, score FROM t WHERE grp IN ('A','C') AND score > 60 ORDER BY score DESC").fetchall()
print(rows)
con.close()
\`\`\`

预期输出（实测）：[(1, 'A', 90), (4, 'C', 88)]（IN+AND+ORDER BY 组合）

**常见错误**：WHERE 里用聚合函数（要用 HAVING）；LIKE 忘转义 % _；OR 与 AND 优先级不加括号。

### 常见误区

1. WHERE 与 HAVING 等价可换——执行顺序与语义不同；
2. NULL 参与 WHERE 比较按 False 处理——是 UNKNOWN，需 IS NULL 补；
3. ORDER BY 决定显示顺序保证结果稳定——无序表分页会抖。

### 知识关联

- **向前**：l1-5 的三值逻辑是 WHERE 的语义底；
- **向后**：l3-1 聚合前必先筛对子集；
- **平行**：Pandas 布尔筛选。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| WHERE | 行级过滤，先于聚合 |
| 运算 | IN/BETWEEN/LIKE+转义 |
| 顺序 | AND 优先于 OR，括号显式化 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pandas 官方文档 pandas.pydata.org 相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '`SELECT DISTINCT city, member_level` 是对整行去重，不是"按 city 去重"。想要每个城市一行，请用 `GROUP BY city` 或窗口函数。',
        },
        {
          kind: 'pitfall',
          text: '不加 `ORDER BY` 直接 `LIMIT 1` 取到的行是不确定的，数据库可自由选择。求 Top N 时必须排序。',
        },
        {
          kind: 'interview',
          text: '常问："`COUNT(DISTINCT col)` 会把 NULL 算进去吗？"不会，只统计不同的非 NULL 值。retail 中 `COUNT(*)`=15，而 `COUNT(DISTINCT member_level)`=3。',
        },
        {
          kind: 'performance',
          text: '`ORDER BY` + `LIMIT` 若排序键有索引可以避免整体排序；`OFFSET` 很大时越翻越慢，应改用"记住上一页最后一个键"的游标分页。',
        },
      ],
      demos: [
        {
          title: 'DISTINCT vs COUNT(DISTINCT)',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT COUNT(*) AS rows_total,
       COUNT(DISTINCT city) AS city_distinct,
       COUNT(DISTINCT region) AS region_distinct,
       COUNT(DISTINCT member_level) AS level_distinct
FROM customers`,
        },
        {
          title: '多列排序：先按城市，再按编号降序',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT customer_id, city, name, signup_date
FROM customers
ORDER BY city ASC, customer_id DESC`,
        },
        {
          title: 'LIMIT + OFFSET 分页',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT product_name, price
FROM products
ORDER BY price DESC
LIMIT 3 OFFSET 3`,
        },
        {
          title: 'CASE WHEN 把行变成列（条件计数）',
          lang: 'sql',
          dataset: 'retail',
          code: `SELECT
  SUM(CASE WHEN status = '已完成' THEN 1 ELSE 0 END) AS done_cnt,
  SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) AS canceled_cnt,
  COUNT(*) AS total_cnt
FROM orders`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'sql-2-e1',
      type: 'sql',
      difficulty: 1,
      question: '查询所有状态为"已完成"的订单号与下单日期。**期望列**：`order_id`、`order_date`。',
      starterSql: "SELECT order_id, order_date FROM orders WHERE status = '已完成'",
      referenceSql: "SELECT order_id, order_date FROM orders WHERE status = '已完成'",
      explanation: '等值比较，字符串用单引号。注意 `status` 是 NOT NULL 列，这里不需要额外处理 NULL。共有 41 笔已完成订单。',
      tags: ['WHERE', '等值比较'],
      relatedLessonId: 'sql-l-2-1',
    },
    {
      id: 'sql-2-e2',
      type: 'sql',
      difficulty: 1,
      question: '查询标价大于 400 元的商品名称与标价。**期望列**：`product_name`、`price`。',
      starterSql: 'SELECT product_name, price FROM products WHERE price ',
      referenceSql: 'SELECT product_name, price FROM products WHERE price > 400',
      explanation: '数字不要加引号。满足条件的是：机械键盘 499、显示器 1599、运动鞋 459，共 3 件。',
      tags: ['WHERE', '比较运算'],
      relatedLessonId: 'sql-l-2-1',
    },
    {
      id: 'sql-2-e3',
      type: 'sql',
      difficulty: 2,
      question: "查询大区在 ('华南', '西南') 中的客户姓名与大区。**期望列**：`name`、`region`。",
      starterSql: "SELECT name, region FROM customers WHERE region ",
      referenceSql: "SELECT name, region FROM customers WHERE region IN ('华南', '西南')",
      explanation: '`IN` 等价于 `region = \'华南\' OR region = \'西南\'`，但更简洁。也可以用 `OR` 写，结果相同、顺序无关。',
      tags: ['IN'],
      relatedLessonId: 'sql-l-2-2',
    },
    {
      id: 'sql-2-e4',
      type: 'sql',
      difficulty: 2,
      question: "查询下单日期在 2024 年 3 月的订单（`order_date` 在 '2024-03-01' 到 '2024-03-31' 之间），返回订单号与日期。**期望列**：`order_id`、`order_date`。",
      starterSql: 'SELECT order_id, order_date FROM orders\nWHERE order_date BETWEEN ',
      referenceSql: "SELECT order_id, order_date FROM orders WHERE order_date BETWEEN '2024-03-01' AND '2024-03-31'",
      explanation:
        '`BETWEEN a AND b` 是闭区间，两端都包含。这里日期是 YYYY-MM-DD 文本，可以直接比较。共 4 笔订单（3 月 3/8/15/22 日）。',
      tags: ['BETWEEN', '日期'],
      relatedLessonId: 'sql-l-2-2',
    },
    {
      id: 'sql-2-e5',
      type: 'sql',
      difficulty: 2,
      question: "查询姓名以「刘」开头的客户。**期望列**：`name`。",
      starterSql: "SELECT name FROM customers WHERE name LIKE '刘'",
      referenceSql: "SELECT name FROM customers WHERE name LIKE '刘%'",
      explanation: '`%` 匹配零个或多个任意字符，所以必须写成 `\'刘%\'`。只写 `\'刘\'` 只会匹配名字恰好是"刘"一字的客户。',
      tags: ['LIKE'],
      relatedLessonId: 'sql-l-2-2',
    },
    {
      id: 'sql-2-e6',
      type: 'sql',
      difficulty: 2,
      question: '查询会员等级为 NULL 的客户，返回编号与姓名。**期望列**：`customer_id`、`name`。',
      starterSql: 'SELECT customer_id, name FROM customers WHERE member_level IS NULL',
      referenceSql: 'SELECT customer_id, name FROM customers WHERE member_level IS NULL',
      explanation: '唯一没有会员等级的是许晴（14）。写成 `= NULL` 会返回空集。',
      tags: ['IS NULL'],
      relatedLessonId: 'sql-l-2-2',
    },
    {
      id: 'sql-2-e7',
      type: 'sql',
      difficulty: 2,
      question: '列出所有不重复的城市，列别名 `city`。**期望列**：`city`。',
      starterSql: 'SELECT DISTINCT  FROM customers',
      referenceSql: 'SELECT DISTINCT city FROM customers',
      explanation: '15 位客户分布在 11 个城市（北京、上海、广州各有多位客户）。也可以写 `SELECT city FROM customers GROUP BY city`。',
      tags: ['DISTINCT'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e8',
      type: 'sql',
      difficulty: 2,
      question: '查询商品名称与标价，按标价**从高到低**排序。**期望列**：`product_name`、`price`。',
      starterSql: 'SELECT product_name, price FROM products ORDER BY price',
      referenceSql: 'SELECT product_name, price FROM products ORDER BY price DESC',
      explanation: '`ORDER BY price DESC` 降序，最贵的是显示器 27 寸（1599），最便宜的是收纳箱（49）。',
      tags: ['ORDER BY'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e9',
      type: 'sql',
      difficulty: 2,
      question: '查询最近注册的 5 位客户：返回姓名与注册日期，按注册日期倒序取前 5 行。**期望列**：`name`、`signup_date`。',
      starterSql: 'SELECT name, signup_date FROM customers\nORDER BY signup_date DESC\nLIMIT ',
      referenceSql: 'SELECT name, signup_date FROM customers ORDER BY signup_date DESC LIMIT 5',
      explanation: '`ORDER BY ... DESC LIMIT 5`。没有 ORDER BY 的 LIMIT 结果不确定，必须排序才能保证"最近 5 位"。',
      tags: ['LIMIT', 'ORDER BY'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e10',
      type: 'sql',
      difficulty: 3,
      question:
        '统计价格区间人数：用 CASE WHEN 给商品分级——`price >= 1000` 为「高价」，`price >= 200` 为「中价」，其余为「低价」，列名 `price_band`；再统计每个分级的商品数，列名 `cnt`。**期望列**：`price_band`、`cnt`。',
      starterSql: 'SELECT CASE WHEN price >= 1000 THEN \'高价\'\n            WHEN price >= 200 THEN \'中价\'\n            ELSE \'低价\' END AS price_band,\n       COUNT(*) AS cnt\nFROM products',
      referenceSql:
        "SELECT CASE WHEN price >= 1000 THEN '高价' WHEN price >= 200 THEN '中价' ELSE '低价' END AS price_band, COUNT(*) AS cnt FROM products GROUP BY price_band",
      explanation:
        'CASE 自上而下求值，先判断最严格的条件（>=1000）。结果为高价 2（显示器、运动鞋没有——运动鞋 459 属中价）、中价 4、低价 6，合计 12。分组时可以直接引用 SELECT 中的别名（SQLite 支持，标准 SQL 更稳妥的写法是重复 CASE 表达式）。',
      tags: ['CASE WHEN', 'GROUP BY'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e11',
      type: 'single',
      difficulty: 2,
      question: '执行 `WHERE region = \'华南\' OR region = \'华东\' AND member_level = \'金卡\'`，由于优先级的关系，实际语义是？',
      options: [
        { value: 'A', text: '`(region = \'华南\' OR region = \'华东\') AND member_level = \'金卡\'`' },
        { value: 'B', text: '`region = \'华南\' OR (region = \'华东\' AND member_level = \'金卡\')`' },
        { value: 'C', text: '语法错误，无法执行' },
        { value: 'D', text: '`(region = \'华南\' OR region = \'华东\') OR member_level = \'金卡\'`' },
      ],
      answer: 'B',
      explanation: '优先级 `NOT` > `AND` > `OR`，所以 AND 先结合。要表达 A 的语义必须显式加括号。华东金卡是孙悦，华南客户是李娜、刘洋、许晴，所以结果 4 行。',
      tags: ['优先级', 'AND/OR'],
      relatedLessonId: 'sql-l-2-1',
    },
    {
      id: 'sql-2-e12',
      type: 'judge',
      difficulty: 1,
      question: '`BETWEEN 100 AND 200` 与 `>= 100 AND <= 200` 的语义完全相同，两端都包含。',
      answer: true,
      explanation: '`BETWEEN` 是闭区间。在日期字段上要注意"右端日期的时分秒被截断"的问题。',
      tags: ['BETWEEN'],
      relatedLessonId: 'sql-l-2-2',
    },
    {
      id: 'sql-2-e13',
      type: 'multiple',
      difficulty: 2,
      question: '关于 `LIKE` 的通配符，下列说法正确的有？（多选）',
      options: [
        { value: 'A', text: '`%` 匹配任意个字符（包括 0 个）' },
        { value: 'B', text: '`_` 匹配恰好一个字符' },
        { value: 'C', text: "`LIKE '张_'` 能匹配「张」和「张伟」" },
        { value: 'D', text: "`LIKE '%晴'` 在本数据中能匹配到「许晴」" },
        { value: 'E', text: '`LIKE` 在所有数据库中默认都区分大小写' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        '`_` 只匹配一个字符，所以 `张_` 匹配「张X」但不匹配单独的「张」，也不匹配「张三丰」（C 错）。大小写敏感性因数据库而异（E 错）。',
      tags: ['LIKE'],
      relatedLessonId: 'sql-l-2-2',
    },
    {
      id: 'sql-2-e14',
      type: 'fill',
      difficulty: 2,
      question: '补全语句，取标价最高的 3 个商品名（只填空白处）：',
      prefix: 'SELECT product_name FROM products ORDER BY price DESC ',
      suffix: ';',
      blanks: [['LIMIT 3', '/^limit\\s+3$/i']],
      explanation: '`LIMIT 3` 必须与 `ORDER BY ... DESC` 搭配，否则取到哪 3 行是不确定的。',
      tags: ['LIMIT'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e15',
      type: 'sql',
      difficulty: 2,
      question: '统计客户的**不同会员等级数量**，列别名 `level_cnt`（NULL 不计）。**期望列**：`level_cnt`。',
      starterSql: 'SELECT COUNT(DISTINCT member_level) AS level_cnt FROM customers',
      referenceSql: 'SELECT COUNT(DISTINCT member_level) AS level_cnt FROM customers',
      explanation: '`COUNT(DISTINCT col)` 忽略 NULL，结果是 3（金卡、银卡、普通）。如果加上 NULL 有 4 种不同的"值"。',
      tags: ['COUNT DISTINCT'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e16',
      type: 'sql',
      difficulty: 3,
      question:
        '查询客户姓名和大区，按大区升序、同一大区内按客户编号降序排列。**期望列**：`customer_id`、`name`、`region`。',
      starterSql: 'SELECT customer_id, name, region FROM customers\nORDER BY ',
      referenceSql: 'SELECT customer_id, name, region FROM customers ORDER BY region ASC, customer_id DESC',
      explanation: '多列排序逐级生效：先地区字典序，同地区内编号从大到小。中文按 Unicode 码位排序。',
      tags: ['ORDER BY', '多列排序'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e17',
      type: 'sql',
      difficulty: 3,
      question:
        '统计 2024 年上半年（1 月 1 日至 6 月 30 日）的订单数（列别名 `order_cnt`）与其中"已取消"的订单数（列别名 `canceled_cnt`）。**期望列**：`order_cnt`、`canceled_cnt`。',
      starterSql: "SELECT COUNT(*) AS order_cnt,\n       SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) AS canceled_cnt\nFROM orders\nWHERE ",
      referenceSql:
        "SELECT COUNT(*) AS order_cnt, SUM(CASE WHEN status = '已取消' THEN 1 ELSE 0 END) AS canceled_cnt FROM orders WHERE order_date BETWEEN '2024-01-01' AND '2024-06-30'",
      explanation:
        '用 `SUM(CASE WHEN ... THEN 1 ELSE 0 END)` 做条件计数，比写两个查询再相除更高效。上半年共 24 笔订单，其中 2 笔取消（1004 与 1010）。',
      tags: ['CASE WHEN', '条件计数'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e18',
      type: 'single',
      difficulty: 2,
      question: '`SELECT product_name FROM products ORDER BY price DESC LIMIT 1 OFFSET 2;` 返回的是？',
      options: [
        { value: 'A', text: '标价最高的商品（显示器 27 寸）' },
        { value: 'B', text: '标价第 3 高的商品（运动鞋）' },
        { value: 'C', text: '标价最便宜的商品（收纳箱）' },
        { value: 'D', text: '随机一个商品' },
      ],
      answer: 'B',
      explanation:
        '按价格降序后 skip 2 行取第 1 行，即第 3 名：第 1 显示器 1599、第 2 机械键盘 499、第 3 运动鞋 459。OFFSET 从 0 开始计数。',
      tags: ['LIMIT', 'OFFSET'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e19',
      type: 'judge',
      difficulty: 2,
      question: '`SELECT DISTINCT city, member_level FROM customers;` 返回的行数等于客户表中不同城市的个数。',
      answer: false,
      explanation:
        '`DISTINCT` 作用于 SELECT 的**整行**（对 `(city, member_level)` 组合去重），因此一个城市因会员等级不同会出现多行。要按城市去重请用 `GROUP BY city`。',
      tags: ['DISTINCT'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e20',
      type: 'sql',
      difficulty: 3,
      question:
        '查询订单表中**非已完成且非已取消**的订单，以及状态为 NULL 的订单一并返回（当前数据可能为空）。**期望列**：`order_id`、`status`。',
      starterSql: "SELECT order_id, status FROM orders\nWHERE status NOT IN ('已完成', '已取消')",
      referenceSql:
        "SELECT order_id, status FROM orders WHERE status NOT IN ('已完成', '已取消') OR status IS NULL",
      allowEmpty: true,
      explanation:
        '本数据只有两种状态，所以结果为空。但这道题的要点是理解 `NOT IN` 与 NULL：如果 status 可能为 NULL，必须显式 `OR status IS NULL`。',
      tags: ['NOT IN', 'NULL'],
      relatedLessonId: 'sql-l-2-2',
    },
    {
      id: 'sql-2-e21',
      type: 'sql',
      difficulty: 2,
      question: '查询名字中**包含**「雪」字的客户姓名。**期望列**：`name`。',
      starterSql: "SELECT name FROM customers WHERE name LIKE '%雪'",
      referenceSql: "SELECT name FROM customers WHERE name LIKE '%雪%'",
      explanation: '两端都加 `%` 表示"任意位置包含"。结果是冯雪；写成 `\'%雪\'` 只能匹配以雪结尾的名字。',
      tags: ['LIKE'],
      relatedLessonId: 'sql-l-2-2',
    },
    {
      id: 'sql-2-e22',
      type: 'sql',
      difficulty: 3,
      question:
        '用 CASE WHEN 给订单打标记：状态为"已完成"时标记为 `有效`，其余（含 NULL）标记为 `无效`，列名 `order_flag`，并返回订单号。**期望列**：`order_id`、`order_flag`。',
      starterSql: "SELECT order_id, CASE WHEN status = '已完成' THEN '有效' ELSE '无效' END AS order_flag\nFROM orders",
      referenceSql:
        "SELECT order_id, CASE WHEN status = '已完成' THEN '有效' ELSE '无效' END AS order_flag FROM orders",
      explanation:
        '`CASE` 只判断"第一个命中的分支"，`ELSE` 兜底所有未命中情况（包括 NULL），因此不需要再单独写 `WHEN status IS NULL`。共 45 行。',
      tags: ['CASE WHEN'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e23',
      type: 'multiple',
      difficulty: 3,
      question: '下列哪些写法会导致"结果不确定 / 不可复现"？（多选）',
      options: [
        { value: 'A', text: '`SELECT * FROM orders LIMIT 3`（没有 ORDER BY）' },
        { value: 'B', text: '`SELECT name FROM customers ORDER BY city`（多行 city 相同）' },
        { value: 'C', text: '`SELECT name FROM customers ORDER BY customer_id`' },
        { value: 'D', text: '`SELECT * FROM order_items LIMIT 10 OFFSET 5`（没有 ORDER BY）' },
        { value: 'E', text: '`SELECT DISTINCT city FROM customers`' },
      ],
      answer: ['A', 'B', 'D'],
      explanation:
        'A、D 缺少 ORDER BY，数据库可任意决定返回哪些行、什么顺序；B 的排序键有重复值，并列行的相对顺序不保证稳定。C 按唯一键排序是稳定的；E 的集合内容本身确定（只是顺序不确定，做数据分析通常不关心）。',
      tags: ['ORDER BY', 'LIMIT'],
      relatedLessonId: 'sql-l-2-3',
    },
    {
      id: 'sql-2-e24',
      type: 'sql',
      difficulty: 4,
      question:
        '统计每个会员等级（`member_level`）的客户数，列别名 `cnt`，并用 CASE 把 NULL 等级显示为 `未评级`（列名仍为 `member_level`）。按 `cnt` 降序。**期望列**：`member_level`、`cnt`。',
      starterSql: 'SELECT CASE WHEN member_level IS NULL THEN \'未评级\' ELSE member_level END AS member_level,\n       COUNT(*) AS cnt\nFROM customers\nGROUP BY member_level',
      referenceSql:
        "SELECT CASE WHEN member_level IS NULL THEN '未评级' ELSE member_level END AS member_level, COUNT(*) AS cnt FROM customers GROUP BY member_level ORDER BY cnt DESC",
      explanation:
        '金卡 4、银卡 4、普通 5（最多）、未评级 1。注意 `GROUP BY member_level` 仍然会把 NULL 归为独立的一组，只是 SELECT 里用 CASE 给它换了显示名，分组结果等价。',
      tags: ['CASE WHEN', 'GROUP BY'],
      relatedLessonId: 'sql-l-2-3',
    },
  ],
};

export { ch2 };
export default ch2;
