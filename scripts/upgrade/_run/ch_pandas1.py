# pandas-1 Series 与 DataFrame 基础（实跑验证）
import pandas as pd
import io

s = pd.Series([88, 92, 79, 95], index=["语文", "数学", "英语", "体育"], name="分数")
print("Series 带标签取数：s['数学'] =", s["数学"], "；s.loc['英语'] =", s.loc["英语"])
print("标签参与运算：s + 2（前两行）\n", (s + 2).head(2).to_string())

df = pd.DataFrame({                      # 字典造表：键 -> 列
    "城市": ["北京", "上海", "杭州", "深圳"],
    "销量": [120, 98, 76, 88],
    "均价": [5.5, 6.0, 4.8, 5.9],
})
print("\nDataFrame 形状 =", df.shape, "；列 dtypes：\n", df.dtypes.to_string())

csv_text = "日期,城市,销量\n2024-01,北京,120\n2024-01,上海,98\n2024-02,北京,150"
df2 = pd.read_csv(io.StringIO(csv_text))          # 从 CSV 字符串读入
print("\nread_csv 读入：\n", df2.to_string(index=False))

df["金额"] = df["销量"] * df["均价"]              # 新增列：向量化的“公式下拉”
print("\n新增列 金额 = 销量×均价：\n", df[["城市", "销量", "金额"]].to_string(index=False))

df_int = pd.DataFrame({"a": [1, 2], "b": [3, 4]})
df_nan = df_int.copy(); df_nan.loc[0, "a"] = None  # 整数列出现缺失 -> 变 float
print("\n整数列混入 NaN 后的 dtype：", df_nan["a"].dtype, "（这就是“整数列变 float”的原因）")
print("astype 文本型数字转数值：", pd.Series(["120", "98"]).astype("int64").tolist())
