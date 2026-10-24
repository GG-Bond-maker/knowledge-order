# sql-4 多表连接（sqlite3 真执行：INNER/LEFT、行数放大、条件位置、反连接、UNION）
import sqlite3

con = sqlite3.connect(":memory:")
con.executescript("""
CREATE TABLE orders(order_id INTEGER PRIMARY KEY, customer_id INTEGER, order_date TEXT, status TEXT);
INSERT INTO orders VALUES
 (1001,1,'2024-01-05','completed'),(1002,2,'2024-01-08','completed'),
 (1003,3,'2024-01-12','cancelled'),(1004,6,'2024-02-03','completed');  -- 1004 客户未注册
CREATE TABLE order_items(item_id INTEGER PRIMARY KEY, order_id INTEGER, product_id TEXT,
 quantity INTEGER, unit_price INTEGER);   -- 金额单位：分
INSERT INTO order_items VALUES
 (1,1001,'P01',10,350),(2,1001,'P02',5,890),(3,1002,'P03',2,2500),
 (4,1003,'P01',3,350),(5,1003,'P06',6,600);
CREATE TABLE customers(customer_id INTEGER PRIMARY KEY, city TEXT);
INSERT INTO customers VALUES (1,'北京'),(2,'上海'),(3,'杭州');
""")

def run(title, sql):
    print(title, con.execute(sql).fetchall())

run("INNER JOIN（两边都有的才保留）：",
    "SELECT o.order_id, c.city FROM orders o JOIN customers c ON o.customer_id = c.customer_id ORDER BY o.order_id")
run("LEFT JOIN（左表全保留，右表缺的填 NULL）：",
    "SELECT o.order_id, c.city FROM orders o LEFT JOIN customers c ON o.customer_id = c.customer_id ORDER BY o.order_id")
print("行数放大：orders 4 行，JOIN order_items 后 =", con.execute(
    "SELECT COUNT(*) FROM orders o JOIN order_items i ON o.order_id = i.order_id").fetchone()[0],
    "行（1001 有 2 件、1003 有 2 件、1004 无明细）")
run("先聚合再连接（防放大的正确姿势）：",
    "SELECT o.order_id, i.n_items, i.revenue FROM orders o JOIN (SELECT order_id, COUNT(*) AS n_items, "
    "SUM(quantity * unit_price) AS revenue FROM order_items GROUP BY order_id) i "
    "ON o.order_id = i.order_id ORDER BY o.order_id")
run("反连接（有订单但没有明细）：",
    "SELECT o.order_id FROM orders o WHERE NOT EXISTS "
    "(SELECT 1 FROM order_items i WHERE i.order_id = o.order_id)")
run("ON vs WHERE（右表条件放 WHERE 会把 LEFT 打回 INNER）：",
    "SELECT o.order_id, i.item_id FROM orders o LEFT JOIN order_items i ON o.order_id = i.order_id "
    "AND i.unit_price > 500 ORDER BY o.order_id, i.item_id")
run("UNION 去重 / UNION ALL 保留：",
    "SELECT city FROM customers UNION SELECT city FROM customers UNION ALL SELECT city FROM customers")
