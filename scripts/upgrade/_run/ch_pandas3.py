# pandas-3 数据清洗与缺失值（实跑验证）
import pandas as pd
import numpy as np

df = pd.DataFrame({
    "姓名": ["张三", "李四", None, "张三"],
    "城市": [" 北京 ", "上海", "杭州", " 北京 "],
    "年龄": [32, np.nan, 28, 32],
    "手机": ["13800000000", "13900000000", np.nan, "13800000000"],
})
print("缺失率：\n", df.isna().mean().round(2).to_string())

filled = df["年龄"].fillna(df["年龄"].mean())       # 统计量填充
print("\nfillna(均值) 后年龄列：", filled.round(1).tolist())
ts = pd.Series([1.0, None, 3.0, None, 5.0])
print("前向填充(ffill)：", ts.ffill().tolist())

print("\ndropna(subset=['姓名']) 剩", len(df.dropna(subset=["姓名"])), "行；"
      "dropna(thresh=3) 剩", len(df.dropna(thresh=3)), "行（至少 3 个非空才保留）")

dup = df.duplicated(keep="first")                   # 重复值：先看清楚“重复”指什么
print("\nduplicated()：", dup.tolist(), "（第 4 行与第 1 行整行重复）")
print("drop_duplicates(['手机']) 后剩", len(df.drop_duplicates(subset=["手机"])), "行")

clean = df["城市"].str.strip()                      # .str 访问器：整列文本清洗
print("\nstr.strip() 后唯一值：", sorted(clean.unique().tolist()))
name_fix = pd.Series(["张三", "李四", None, "张三"]).str.replace("张三", "张叁")
print("str.replace 结果：", name_fix.tolist())
print("map 映射：", df["城市"].str.strip().map({"北京": "华北", "上海": "华东"}).tolist())
