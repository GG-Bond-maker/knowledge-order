# pandas-4 时间序列与窗口计算（实跑验证）
import pandas as pd

idx = pd.date_range("2024-01-01", periods=8, freq="D")
df = pd.DataFrame({"date": idx, "sales": [100, 120, 90, 130, 150, 110, 170, 160]})
df["date"] = pd.to_datetime(df["date"])            # to_datetime：文本/日期对象 -> datetime64
df["weekday"] = df["date"].dt.dayofweek            # dt 访问器：0=周一
print("dt 访问器（前 3 行）：\n", df.head(3).assign(date=df["date"].dt.strftime("%m-%d"))[["date", "sales", "weekday"]].to_string(index=False))
print("周末销量：", df.loc[df["weekday"] >= 5, "sales"].tolist(), "（dt.dayofweek>=5 为周六日）")

monthly = df.set_index("date")["sales"].resample("3D").sum()   # 重采样：按 3 天桶聚合
print("\nresample('3D').sum()：\n", monthly.to_string())

df["ma3"] = df["sales"].rolling(3).mean()          # 移动平均：窗口内求均值
df["prev"] = df["sales"].shift(1)                  # 错位取数：取上一行
df["mom"] = (df["sales"] / df["prev"] - 1).round(3)  # 环比 = 本期/上期 - 1
print("\nrolling/shift（第 3~5 行）：\n", df.loc[2:4, ["sales", "ma3", "prev", "mom"]].to_string())
df["cum"] = df["sales"].cumsum()                   # expanding 累计：等价 rolling(len)
print("累计到第 4 行 cumsum =", df.loc[3, "cum"], "（100+120+90+130）")
