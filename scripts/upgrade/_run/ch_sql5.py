# sql-5 子查询、CTE 与窗口函数（sqlite3 真执行）
import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE orders(order_id INTEGER PRIMARY KEY, order_date TEXT, amount INTEGER);
INSERT INTO orders VALUES
 (1001,'2024-01-05',8950),(1002,'2024-01-08',8600),(1003,'2024-01-12',1050),
 (1004,'2024-02-03',7120),(1005,'2024-02-14',7260),(1006,'2024-03-02',8900),
 (1007,'2024-03-15',2500);
""")

def run(title, sql):
    print(title, con.execute(sql).fetchall())

run("标量子查询（返回单值，可当常数用）：",
    "SELECT order_id, amount, (SELECT ROUND(AVG(amount), 1) FROM orders) AS 全局均值 "
    "FROM orders WHERE amount > (SELECT AVG(amount) FROM orders) ORDER BY order_id")

run("派生表 + CTE（先算月度，再对月度做环比）：",
    "WITH monthly AS (SELECT substr(order_date, 1, 7) AS 月份, SUM(amount) AS 月金额 "
    "FROM orders GROUP BY 月份) "
    "SELECT 月份, 月金额, LAG(月金额) OVER (ORDER BY 月份) AS 上月, "
    "ROUND(100.0 * (月金额 - LAG(月金额) OVER (ORDER BY 月份)) / LAG(月金额) OVER (ORDER BY 月份), 1) AS 环比 "
    "FROM monthly")

run("三种排名（并列时行为不同）：",
    "SELECT order_id, amount, ROW_NUMBER() OVER (ORDER BY amount DESC) AS row_num, "
    "RANK() OVER (ORDER BY amount DESC) AS rk, DENSE_RANK() OVER (ORDER BY amount DESC) AS dense_rk "
    "FROM orders WHERE amount >= 7000")

run("SUM OVER 累计 + 分组 Top N（窗口函数不折叠行）：",
    "SELECT order_id, amount, SUM(amount) OVER (ORDER BY order_id) AS 累计 FROM orders WHERE order_id <= 1004")

print("每个分组取 Top 1（经典题型，子查询过滤 rn=1）：")
for row in con.execute(
    "SELECT * FROM (SELECT order_id, substr(order_date, 1, 7) AS 月份, amount, "
    "ROW_NUMBER() OVER (PARTITION BY substr(order_date, 1, 7) ORDER BY amount DESC) AS rn "
    "FROM orders) WHERE rn = 1 ORDER BY 月份"):
    print(" ", row)
print("窗口函数与 GROUP BY 的区别：GROUP BY 把 n 行压成 1 行，窗口函数给每一行附加一个计算结果")
