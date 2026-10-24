# sql-6 查询优化（sqlite3 真执行：索引前后执行计划对比、深分页与写法优化）
import sqlite3, random

random.seed(1)
con = sqlite3.connect(":memory:")
con.execute("CREATE TABLE orders(order_id INTEGER PRIMARY KEY, customer_id INT, "
            "order_date TEXT, amount INT)")
con.executemany("INSERT INTO orders VALUES (?,?,?,?)",
                [(i, random.randint(1, 500), f"2024-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
                  random.randint(100, 99999)) for i in range(1, 50001)])

def plan(sql):
    return con.execute("EXPLAIN QUERY PLAN " + sql).fetchall()[0][3]

q = "SELECT order_id FROM orders WHERE order_date BETWEEN '2024-05-01' AND '2024-05-31' AND amount > 90000"
print("无索引时：", plan(q))
con.execute("CREATE INDEX idx_date ON orders(order_date)")
print("建索引后：", plan(q), "（SCAN -> SEARCH，从全表扫描变成按索引定位）")

q2 = "SELECT order_id FROM orders WHERE order_date BETWEEN '2024-05-01' AND '2024-05-31'"
con.execute("CREATE INDEX idx_date_amt ON orders(order_date, amount)")   # 覆盖索引
print("覆盖索引（查询列都在索引里）：", plan(q2))

bad = "SELECT * FROM orders WHERE substr(order_date, 1, 7) = '2024-05'"   # 对列做函数 -> 索引失效
print("对列套函数：", plan(bad), "（索引失效，退回全表扫描；应改写成范围条件）")

page_offset = con.execute("SELECT order_id FROM orders ORDER BY order_id LIMIT 5 OFFSET 40000").fetchall()
keyset = con.execute("SELECT order_id FROM orders WHERE order_id > 40000 ORDER BY order_id LIMIT 5").fetchall()
print("深分页取第 8001 页（各 5 行）：OFFSET 版 =", [r[0] for r in page_offset],
      "；键集版 =", [r[0] for r in keyset], "（结果相同，但 OFFSET 要先扫过前 4 万行）")
print("键集分页的执行计划：", plan("SELECT order_id FROM orders WHERE order_id > 40000 ORDER BY order_id LIMIT 5"))
print("优化三件套：列裁剪（不 SELECT *）、过滤下推（先 WHERE 再 JOIN）、用索引键做游标翻页")
