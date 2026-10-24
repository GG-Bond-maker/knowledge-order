# sql-3 聚合与分组（sqlite3 真执行：COUNT 三种写法、GROUP BY/HAVING、AVG 分母陷阱、CASE 分箱）
import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE orders(order_id INTEGER PRIMARY KEY, customer_id INTEGER, region TEXT,
 status TEXT, amount INTEGER);   -- 金额单位：分；amount 为 NULL 表示订单未填金额
INSERT INTO orders VALUES
 (1001,1,'华北','completed',8950),(1002,2,'华东','completed',8600),
 (1003,3,'华东','cancelled',NULL),(1004,4,'华北','completed',7120),
 (1005,5,'华南','completed',7260),(1006,1,'华北','completed',8900),
 (1007,2,'华东','pending',2500);
""")

def run(title, sql):
    print(title, con.execute(sql).fetchall())

run("COUNT 三种写法：", "SELECT COUNT(*) AS 全部行, COUNT(amount) AS 非空金额, "
    "COUNT(DISTINCT customer_id) AS 去重客户 FROM orders")
run("GROUP BY + 聚合（SELECT 只能出现分组键或聚合值）：",
    "SELECT region, COUNT(*) AS 单数, SUM(amount) AS 金额合计 FROM orders "
    "WHERE status = 'completed' GROUP BY region ORDER BY 金额合计 DESC")
run("HAVING 过滤组（WHERE 过滤行，时机不同）：",
    "SELECT region, AVG(amount) AS 均价 FROM orders WHERE status = 'completed' "
    "GROUP BY region HAVING COUNT(*) >= 2 ORDER BY region")
print("AVG 分母陷阱：华东均价 =", con.execute(
    "SELECT AVG(amount) FROM orders WHERE region = '华东'").fetchone()[0],
    "（cancelled 单 amount 为 NULL 被 AVG 忽略，但 pending 单 2500 计入，口径要想清楚）")
run("CASE 分箱统计：",
    "SELECT CASE WHEN amount >= 8600 THEN '大单' WHEN amount >= 5000 THEN '中单' ELSE '小单' END AS 档位, "
    "COUNT(*) AS 单数 FROM orders WHERE amount IS NOT NULL GROUP BY 档位 ORDER BY 单数 DESC")
print("SUM 空集返回 NULL 而不是 0：", con.execute(
    "SELECT SUM(amount) FROM orders WHERE region = '西南'").fetchone()[0])
