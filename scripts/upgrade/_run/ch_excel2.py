# excel-2 高频函数：查找引用与逻辑判断（纯 Python 模拟 VLOOKUP / INDEX+MATCH / SUMIFS / IFS）
products = [  # 模拟查找区域 A2:D5：产品编码 | 品名 | 类别 | 单价
    ["P001", "苏打水", "饮料", 3.5],
    ["P002", "薯片",   "零食", 8.9],
    ["P003", "洗衣液", "日用", 25.0],
    ["P004", "坚果",   "零食", 19.9],
]

def vlookup(key, table, col_index):   # 模拟 =VLOOKUP(键, 区域, 列号, 0) 精确匹配
    for row in table:
        if row[0] == key:
            return row[col_index - 1]
    return "#N/A"

def index_match(key, table, return_col):   # INDEX+MATCH：不受“返回列在右侧”限制
    keys = [r[0] for r in table]
    return table[keys.index(key)][return_col] if key in keys else "#N/A"

print("VLOOKUP(\"P003\", A2:D5, 4, 0) =", vlookup("P003", products, 4))
print("VLOOKUP(\"p003\", ...) 小写字母 ->", vlookup("p003", products, 4), "（看起来一样，其实不一样）")
print("INDEX+MATCH 取品名：", index_match("P002", products, 1))

def ifs(score):   # 模拟 =IFS(B2>=90,"优",B2>=80,"良",B2>=60,"及格",TRUE,"不及格")
    return "优" if score >= 90 else "良" if score >= 80 else "及格" if score >= 60 else "不及格"

print("\nIFS 分档：95 ->", ifs(95), "；85 ->", ifs(85), "；60 ->", ifs(60), "（边界值 60 归“及格”档）")

sales = [  # 模拟明细表：区域 | 产品 | 月份 | 金额
    ["华北", "苏打水", "1月", 120], ["华北", "薯片", "1月", 300],
    ["华东", "苏打水", "1月", 98],  ["华北", "苏打水", "2月", 150],
    ["华东", "薯片",   "2月", 260],
]
def sumifs(rows, *conds):   # 模拟 =SUMIFS(求和列, 条件列1, 条件1, ...)
    return sum(r[3] for r in rows if all(r[i] == v for i, v in conds))

def countifs(rows, *conds):
    return sum(1 for r in rows if all(r[i] == v for i, v in conds))

print("\nSUMIFS(金额, 区域=\"华北\", 产品=\"苏打水\") =", sumifs(sales, (0, "华北"), (1, "苏打水")))
print("COUNTIFS(区域=\"华北\", 月份=\"1月\") =", countifs(sales, (0, "华北"), (2, "1月")))
