# sql-1 SQL 与关系数据库基础（sqlite3 真执行：关系模型、SELECT 基础与 NULL 三值逻辑）
import sqlite3

SETUP = """
CREATE TABLE customers(customer_id INTEGER PRIMARY KEY, city TEXT, region TEXT, member_level TEXT);
INSERT INTO customers VALUES
 (1,'北京','华北','金卡'),(2,'上海','华东','银卡'),(3,'杭州','华东',NULL),
 (4,'广州','华南','普通'),(5,'深圳','华南','金卡');
CREATE TABLE orders(order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, status TEXT);
INSERT INTO orders VALUES
 (1001,1,'2024-01-05','completed'),(1002,2,'2024-01-08','completed'),
 (1003,3,'2024-01-12','cancelled'),(1004,4,'2024-02-03',NULL);
"""
con = sqlite3.connect(":memory:")
con.executescript(SETUP)

def run(sql):
    cur = con.execute(sql)
    print(cur.fetchall())

print("主键唯一标识一行：customer_id =", con.execute(
    "SELECT customer_id, city FROM customers WHERE customer_id = 3").fetchall())
print("外键指向另一张表的主键：orders.customer_id ->", con.execute(
    "SELECT o.order_id, c.city FROM orders o JOIN customers c ON o.customer_id = c.customer_id "
    "WHERE o.order_date >= '2024-02-01'").fetchall())

print("\nSELECT 常量列、拼接与别名：")
run("SELECT order_id AS 订单号, '零售' AS 渠道, order_date || ' (' || status || ')' AS 摘要 "
    "FROM orders WHERE order_id <= 1002")

print("NULL 不是 0 也不是空串，比较结果是 UNKNOWN（WHERE 只保留 TRUE）：")
run("SELECT order_id, status, status = NULL AS eq_null, status IS NULL AS is_null FROM orders")
print("三值逻辑：NULL OR TRUE =", con.execute("SELECT NULL OR TRUE").fetchone()[0],
      "；NULL AND FALSE =", con.execute("SELECT NULL AND FALSE").fetchone()[0],
      "；NOT NULL =", con.execute("SELECT NOT NULL").fetchone()[0])
print("结论：判断空值只能用 IS NULL / IS NOT NULL，用 = 永远查不到")
