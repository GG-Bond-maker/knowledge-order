# -*- coding: utf-8 -*-
"""批次33a：pandas 15 节（5 章 × 3 节）。"""
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from wave4_lib import apply, theme

T = {
    0: theme(
        "数据分析的 90% 时间花在读数据与整理结构上——Series 与 DataFrame 是 Pandas 的一对基石：理解它们，读/选/洗/算全有了统一语言。",
        "DataFrame 像一张带行号列名的 Excel 表，Series 是单独抽出的一列（自带行标签）——一切操作最终都落到“按标签对齐”这一件事上。",
        """import pandas as pd
s = pd.Series([88, 92, 79], index=["语", "数", "英"])
df = pd.DataFrame({"name": ["甲", "乙"], "score": [88, 92]})
print(s, sep="\\n")
print(df)
print(df["score"].mean())  # 90.0""",
        "s['语']=88；score 均值 90.0（索引对齐正确）",
        "把 DataFrame 当 list 用下标取（应 df[\"col\"] 或 loc）；混用位置与标签；忘记索引对齐导致 NaN。",
        "1. Series 就是列表——它多一层索引，算术按索引对齐；\n2. df[\"col\"] 返回视图可原地改——可能返回副本，赋值链有 SettingWithCopyWarning；\n3. 索引必须唯一——重复索引会让对齐结果翻倍。",
        "- **向前**：Python 基础课的 list/dict 是直觉来源；\n- **向后**：l-2-1 的 loc/iloc 是精确取数工具；\n- **平行**：Excel 的行号列名是同构概念。",
        "| 结论 | 内容 |\n| --- | --- |\n| Series | 一维 + 索引标签 |\n| DataFrame | 二维表，列是 Series |\n| 对齐 | 算术按索引对齐，缺失成 NaN |"),
    1: theme(
        "选错数据是分析错的第一原因：loc 按标签、iloc 按位置，两者混用是 Pandas 最高频 bug 来源。",
        "loc 是“按门牌号找人”（标签），iloc 是“按排队第几位找人”（位置）——数据重排后门牌不变、位次会变。",
        """import pandas as pd
df = pd.DataFrame({"a": [1, 2, 3]}, index=["x", "y", "z"])
print(df.loc["y", "a"])        # 标签
print(df.iloc[1, 0])           # 位置
print(df.loc[df["a"] > 1, "a"])  # 布尔筛选""",
        "loc['y','a']=2；iloc[1,0]=2；布尔筛选 [2, 3]",
        "loc/iloc 混用后顺序依赖；链式索引 df[df.a>1][\"b\"] 触发 SettingWithCopyWarning（用 loc[行,列]）；忘记 iloc 排他/loc 包含端点。",
        "1. df[col] 能选行——单列是 Series，切片才是行（易混）；\n2. loc 只能标签——也接受布尔数组与“标签切片”；\n3. 链式赋值生效——必须一次 loc 完成。",
        "- **向前**：l-1-1 的索引概念是本节地基；\n- **向后**：l-3-1 清洗前先学会精确选中要洗的行；\n- **平行**：SQL 的 WHERE+ORDER BY。",
        "| 结论 | 内容 |\n| --- | --- |\n| loc | 标签（含端点），支持布尔 |\n| iloc | 位置（排他端点） |\n| 赋值 | 一次 loc 完成，避免链式 |"),
    2: theme(
        "真实数据必脏：缺失、重复、类型错误占清洗时间的 70%——Pandas 的 isna/dropna/fillna/astype 是这套工序的标准化工具。",
        "缺失值像问卷空题：可以扔掉整份卷子（dropna）、按多数答案填（fillna 众数/均值）、或标注“未答”（保留 NaN 让模型知道）。",
        """import pandas as pd
import numpy as np
df = pd.DataFrame({"a": [1.0, np.nan, 3.0], "b": ["x", "x", "x"]})
print(df.isna().sum())
print(df.dropna().shape, df.fillna(0).shape)
df2 = df.astype({"b": "category"})
print(df2.dtypes)""",
        "缺失计数 [1, 0]；dropna 后 (2, 2)、fillna 后 (3, 2)",
        "fillna(0) 一刀切（应按列语义选策略）；inplace 习惯（新版推荐赋值式）；把 NaN 当 0 参与 mean（mean 默认跳过 NaN，但 sum 场景要显式）。",
        "1. NaN==NaN 为 True——实际是 False，要用 isna 判；\n2. dropna 全表删太狠——subset 参数按关键列删；\n3. astype 强转一定成功——非法字符串转数值会抛错，先 pd.to_numeric(errors=)。",
        "- **向前**：l-2-1 的布尔筛选是清洗的执行器；\n- **向后**：l-4-1 时间序列的 NaT 同源；\n- **平行**：SQL 的 NULL 三值逻辑。",
        "| 结论 | 内容 |\n| --- | --- |\n| 检测 | isna().sum() 按列 |\n| 处理 | dropna(subset=) / fillna(策略) |\n| 类型 | pd.to_numeric(errors=\"coerce\") |"),
    3: theme(
        "时间序列是业务数据的主形态（订单、日志、指标）——Pandas 的 datetime64 + resample/rolling 把“按月汇总、移动平均”变成一行代码。",
        "把时间列变成 datetime64 后，DataFrame 就有了“时间轴”：resample 是按时间粒度重新聚合（像 SQL 的 GROUP BY 月份），rolling 是滑动窗口。",
        """import pandas as pd
df = pd.DataFrame({"ts": pd.to_datetime(["2024-01-05", "2024-01-20", "2024-02-10"]),
                   "v": [10, 20, 30]}).set_index("ts")
print(df.resample("MS")["v"].sum())
print(df["v"].rolling(2).sum())""",
        "按月汇总 [30, 30]；rolling(2) 为 [NaN, 30.0, 50.0]（首行不足窗口）",
        "resample 粒度写错（MS 月初 vs M 月末已改名 ME）；rolling 不设 min_periods 导致首段全 NaN；时区naive/aware 混用。",
        "1. 字符串日期能直接比较——可比较但无法 resample，先 to_datetime；\n2. rolling 窗口含当前位置——rolling(2).sum() 是含自身的两期和；\n3. 时区转换用 tz_localize+tz_convert 两步。",
        "- **向前**：l-3-1 清洗后数据才可安全转时间索引；\n- **向后**：l-5-1 透视表按月透视的底层；\n- **平行**：量化课的时间对齐（对齐交易日历）。",
        "| 结论 | 内容 |\n| --- | --- |\n| 时间索引 | set_index + datetime64 |\n| resample | 按时间粒度聚合（MS/ME/D） |\n| rolling | 滑动窗口，min_periods 防全 NaN |"),
    4: theme(
        "多表关联与透视是分析的最后一步加工：merge 对应 SQL JOIN，pivot_table 对应 Excel 数据透视——两者是“宽表思维”的核心。",
        "merge 像拼拼图（按 key 对上两块），pivot_table 像折纸（长表折成宽表：行=分组、列=拆开、值=聚合）。",
        """import pandas as pd
orders = pd.DataFrame({"uid": [1, 2], "amt": [100, 200]})
users = pd.DataFrame({"uid": [1, 2, 3], "city": ["BJ", "SH", "SZ"]})
m = orders.merge(users, on="uid", how="left")
print(m)
long = pd.DataFrame({"city": ["BJ", "BJ", "SH"], "m": ["1月", "2月", "1月"], "v": [5, 6, 7]})
print(long.pivot_table(index="city", columns="m", values="v", aggfunc="sum", fill_value=0))""",
        "merge 后 (2, 3)（left 保留订单行）；透视表 (2, 2) 城市×月份矩阵",
        "merge 忘 how= 默认 inner 丢行（长表常用 left）；透视表不设 fill_value 出 NaN；重复键 merge 后行数爆炸（先查键唯一性）。",
        "1. merge 默认 how=\"inner\"——与 SQL JOIN 同义，不想要的丢行都是它干的；\n2. pivot 与 pivot_table 不同——pivot 不做聚合，重复索引会报错；\n3. concat 与 merge 混淆——concat 是上下/左右堆叠，merge 才按键。",
        "- **向前**：l-4-1 时间索引让透视按月成为可能；\n- **向后**：SQL 课的 JOIN/GROUP BY 是同一操作的声明式版本；\n- **平行**：Excel 数据透视表。",
        "| 结论 | 内容 |\n| --- | --- |\n| merge | SQL 式按键连接，how 四种 |\n| pivot_table | 长转宽 + 聚合 + fill_value |\n| 风险 | 键重复→行数爆炸，先查唯一 |"),
}

GOALS = {
    "pandas-l-1-1": "1. 用 Series/DataFrame 构造带标签数据并读出形状与 dtype；\n2. 解释索引对齐在算术中的行为；\n3. 用 describe() 快速体检一张表。",
    "pandas-l-1-2": "1. 用 head/info/describe 三件套完成数据体检；\n2. 从 dict/list/CSV 三种来源构造 DataFrame；\n3. 说出 dtype 自动推断的常见意外（object 型数字）。",
    "pandas-l-1-3": "1. 解释向量化运算为何比循环快；\n2. 对两列做算术与比较生成新列；\n3. 用 apply 处理向量化不便的自定义逻辑。",
    "pandas-l-2-1": "1. 用 loc 按标签取行/列/单元格；\n2. 用 iloc 按位置取数并说清与 loc 的端点差异；\n3. 用布尔条件筛选子集并一次完成赋值。",
    "pandas-l-2-2": "1. 用 query 写类 SQL 的筛选表达式；\n2. 用 isin/between 处理多值与区间；\n3. 用 set_index/reset_index 在标签与位置间切换。",
    "pandas-l-2-3": "1. 用 sort_values 完成多列排序；\n2. 用 nlargest/nsmallest 取 Top-N；\n3. 识别并避免排序后的索引乱序陷阱（reset_index）。",
    "pandas-l-3-1": "1. 用 isna().sum() 定位缺失分布；\n2. 按“关键列”用 dropna(subset=) 精准删行；\n3. 按语义选 fillna 策略（均值/中位数/前值）。",
    "pandas-l-3-2": "1. 用 duplicated().sum() 数重复并用 drop_duplicates 去重；\n2. 用 str.strip/replace 清理文本列；\n3. 用 pd.to_numeric(errors=\"coerce\") 修复类型。",
    "pandas-l-3-3": "1. 用 map/replace 做值映射与标准化；\n2. 用 cut/qbin 把连续值分箱；\n3. 说出清洗前后记录数与分布的对照报告要点。",
    "pandas-l-4-1": "1. 用 to_datetime + set_index 建立时间索引；\n2. 用 resample(\"ME\") 按月聚合；\n3. 用 rolling(window).mean() 计算移动平均并设 min_periods。",
    "pandas-l-4-2": "1. 用 shift/diff 计算环比与同比；\n2. 用 between_time/at_time 切时段；\n3. 说出时区处理两步法（tz_localize → tz_convert）。",
    "pandas-l-4-3": "1. 用 expanding 计算累计指标；\n2. 对比 rolling/expanding 的业务场景；\n3. 在时间索引下做切片取数（闭区间）。",
    "pandas-l-5-1": "1. 用 pivot_table 把长表折成城市×月份宽表；\n2. 用 fill_value 处理空组合；\n3. 用 margins 加行列合计。",
    "pandas-l-5-2": "1. 用 merge 完成四种 JOIN 并对比行数；\n2. 识别键重复导致的行数爆炸；\n3. 用 concat 上下堆叠同构表并 reset_index。",
    "pandas-l-5-3": "1. 用 melt 宽转长（反向透视）；\n2. 说明“长表适合聚合、宽表适合阅读”的选型逻辑；\n3. 完成“长→透视→melt”的往返验证。",
}

PREREQ = {
    0: "- Python 基础课的 list/dict（l-2 章）；\n- 无 Pandas 前置。",
    1: "- Series/DataFrame 与索引概念（l-1-1）；\n- 布尔真值判断。",
    2: "- loc/iloc 精确选数（l-2-1）；\n- 缺失值 NaN 的判断（isna）。",
    3: "- 数据清洗完成后的干净列（l-3-1）；\n- resample 需要时间索引（to_datetime）。",
    4: "- 分组聚合直觉（GROUP BY）；\n- merge 的键概念。",
}

apply("pandas.json", T, GOALS, PREREQ)
