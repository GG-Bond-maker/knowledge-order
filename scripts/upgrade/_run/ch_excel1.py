# excel-1 数据表规范与引用方式：纯 Python 模拟单元格与公式复制时的引用平移
from datetime import date

EPOCH = date(1899, 12, 30)          # Excel 1900 日期系统的第 0 天
serial = lambda d: (d - EPOCH).days  # 日期序列号

print("日期序列号：2024-03-01 ->", serial(date(2024, 3, 1)))

# ---- 用字典模拟一张工作表：键是单元格地址，值是数字或公式 ----
rate = 7.2                            # B1：汇率（绝对引用 $B$1）
sheet = {"A2": 100, "A3": 200}        # A 列：美元金额

def translate(ref, dr, dc, abs_row=False, abs_col=False):
    """模拟公式向下复制 dr 行、向右复制 dc 列时的引用平移"""
    col, row = ref[0], int(ref[1:])
    if not abs_col: col = chr(ord(col) + dc)
    if not abs_row: row += dr
    return f"{col}{row}"

print("\nC2 填公式后向下拖一格：")
print("  =A2*$B$1 ->", "= %s*$B$1" % translate("A2", 1, 0), "（正确：汇率仍指向 B1，算 200*7.2 =", 200 * rate, "）")
print("  =A2*B1   ->", "= %s*B2" % translate("A2", 1, 0), "（错误：B2 是空单元格，结果 = 0）")

# ---- 一维表（明细表）vs 二维表：同样的数据，只有前者能直接聚合 ----
wide = [["城市", "Q1", "Q2"], ["北京", 120, 150], ["上海", 98, 132]]     # 二维报表
long = [["北京", "Q1", 120], ["北京", "Q2", 150], ["上海", "Q1", 98], ["上海", "Q2", 132]]  # 一维明细

total = sum(r[2] for r in long)                     # 一维表：一行代码求总计
beijing = sum(r[2] for r in long if r[0] == "北京")  # 一维表：按城市筛选汇总
print("\n一维表直接聚合：总计 =", total, "；北京 =", beijing)
print("二维表必须先逆透视才能做这两件事——这就是「先规范表结构，再写公式」的原因")
