# pandas-5 透视表、合并与宽长互转（实跑验证）
import pandas as pd

orders = pd.DataFrame({
    "区域": ["华北", "华北", "华东", "华东", "华南"],
    "品类": ["饮料", "零食", "饮料", "零食", "饮料"],
    "金额": [120, 300, 98, 260, 150],
    "订单": [1, 2, 1, 3, 2],
})
pt = orders.pivot_table(index="区域", columns="品类", values="金额",
                        aggfunc="sum", fill_value=0, margins=True, margins_name="总计")
print("pivot_table 行=区域 列=品类 值=金额求和：\n", pt.to_string())
pt2 = orders.pivot_table(index="区域", values=["金额", "订单"], aggfunc={"金额": "sum", "订单": "count"})
print("\n多聚合函数：\n", pt2.to_string())

customers = pd.DataFrame({"区域": ["华北", "华东", "华南", "西南"], "经理": ["李雷", "韩梅梅", "王小明", "赵六"]})
m = orders.merge(customers, on="区域", how="left")   # 左连接：右表无匹配填 NaN
print("\nleft join：以订单表为准，行数 =", len(m), "（等于左表行数", len(orders), "）；西南经理在订单表无记录 -> 不出现在结果里")
inner = orders.merge(customers, on="区域", how="inner")
print("inner join 行数 =", len(inner), "（只保留两边都有的区域）")
chk = orders.merge(customers.drop_duplicates("区域"), on="区域", how="left", validate="many_to_one")
print("validate='many_to_one' 校验通过，行数 =", len(chk), "（右表先去重可防行数放大）")

wide = pd.DataFrame({"区域": ["华北", "华东"], "Q1": [420, 358], "Q2": [380, 401]})
long = wide.melt(id_vars="区域", var_name="季度", value_name="金额")   # 宽 -> 长（逆透视）
print("\nmelt 宽转长：\n", long.to_string(index=False))
back = long.pivot(index="区域", columns="季度", values="金额").reset_index()  # 长 -> 宽
print("pivot 长转宽列名：", back.columns.tolist(), "；华北 Q2 =", int(back.loc[back["区域"] == "华北", "Q2"].iloc[0]))
