# sql-2 筛选与排序（sqlite3 真执行：WHERE / IN / BETWEEN / LIKE / IS NULL / ORDER BY / LIMIT / CASE）
import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE customers(customer_id INTEGER PRIMARY KEY, city TEXT, region TEXT, member_level TEXT);
INSERT INTO customers VALUES
 (1,'北京','华北','金卡'),(2,'上海','华东','银卡'),(3,'杭州','华东',NULL),
 (4,'广州','华南','普通'),(5,'深圳','华南','金卡');
CREATE TABLE orders(order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT,
 status TEXT, amount INTEGER);   -- 金额单位：分
INSERT INTO orders VALUES
 (1001,1,'2024-01-05','completed',8950),(1002,2,'2024-01-08','completed',8600),
 (1003,3,'2024-01-12','cancelled',1050),(1004,4,'2024-02-03',NULL,7120),
 (1005,5,'2024-02-14','completed',7260),(1006,1,'2024-03-02','completed',8900),
 (1007,2,'2024-03-15','pending',2500);
""")

def run(title, sql):
    print(title, con.execute(sql).fetchall())

run("WHERE + AND/OR（注意优先级，加括号）：",
    "SELECT order_id FROM orders WHERE status = 'completed' AND (amount > 8600 OR order_date < '2024-01-10') ORDER BY order_id")
run("IN（集合）：", "SELECT order_id, status FROM orders WHERE status IN ('cancelled', 'pending') ORDER BY order_id")
run("BETWEEN（闭区间，日期含两端）：",
    "SELECT order_id, order_date FROM orders WHERE order_date BETWEEN '2024-02-01' AND '2024-02-28'")
run("LIKE（% 任意串，_ 单字符）：", "SELECT city FROM customers WHERE city LIKE '_州'")
run("IS NULL（= NULL 永远查不到）：", "SELECT order_id FROM orders WHERE status IS NULL")
run("ORDER BY 多列 + LIMIT/OFFSET 分页：",
    "SELECT order_id, amount FROM orders ORDER BY amount DESC, order_id LIMIT 2 OFFSET 1")
run("CASE WHEN（SQL 里的 if-else）：",
    "SELECT order_id, CASE WHEN amount >= 8600 THEN '大单' WHEN amount >= 5000 THEN '中单' "
    "ELSE '小单' END AS 档位 FROM orders ORDER BY order_id LIMIT 4")
run("DISTINCT（对整行去重）：", "SELECT DISTINCT status FROM orders WHERE status IS NOT NULL ORDER BY status")
print("提醒：WHERE 里筛掉的不只是 NULL 本身——status IS NOT NULL 之外，status = 'completed' 也会丢掉 NULL 行")
