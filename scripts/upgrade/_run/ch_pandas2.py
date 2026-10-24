# pandas-2 索引与数据选取：loc / iloc / 布尔索引（实跑验证）
import pandas as pd

df = pd.DataFrame({
    "城市": ["北京", "上海", "杭州", "深圳", "成都"],
    "销量": [120, 98, 76, 88, 65],
    "均价": [5.5, 6.0, 4.8, 5.9, 4.2],
}, index=["A01", "A02", "A03", "A04", "A05"])

print("df.loc['A02', '销量'] =", df.loc["A02", "销量"], "（按标签）")
print("df.iloc[1, 1] =", df.iloc[1, 1], "（按位置）；df.iloc[0:2] 取前两行共", len(df.iloc[0:2]), "行")
print("loc 切片含端点：df.loc['A01':'A03'] 共", len(df.loc["A01":"A03"]), "行；iloc 切片不含端点：df.iloc[0:3] 共", len(df.iloc[0:3]), "行")

mask = (df["销量"] > 80) & (df["均价"] < 6.0)      # 多条件必须用 & | ~，且加括号
print("\n布尔掩码 (销量>80) & (均价<6.0)：\n", mask.to_string())
print("df.loc[mask] 筛选结果：\n", df.loc[mask, ["城市", "销量"]].to_string())
try:
    df[(df["销量"] > 80) and (df["均价"] < 6.0)]   # 错误示范：用 and 会抛异常
except ValueError as e:
    print("\n用 and 连接两个掩码 -> ValueError:", str(e)[:36], "...（掩码是逐元素比较，必须用 &）")

df.at["A03", "销量"] = 80                           # 单元格精准写入（at 按标签，iat 按位置）
print("\nat 写入后 df.at['A03','销量'] =", df.at["A03", "销量"])
try:                                                # pandas 3 不允许把 71.5 塞进 int64 列
    df.loc[df["城市"] == "成都", "销量"] = df.loc[df["城市"] == "成都", "销量"] * 1.1
except TypeError as e:
    print("float 写入 int64 列 -> TypeError:", str(e)[:30], "...（需先 astype('float64')）")
df["销量"] = df["销量"].astype("float64")
df.loc[df["城市"] == "成都", "销量"] *= 1.1
print("loc 批量修改成都销量 ->", df.loc[df["城市"] == "成都", "销量"].iloc[0])
