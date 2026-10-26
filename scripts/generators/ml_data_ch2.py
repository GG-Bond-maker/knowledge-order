# -*- coding: utf-8 -*-
"""
Chapter 2: Pandas 高效数据整理与聚合变换 (Pandas High-Performance Munging & Aggregation)
Course: ml-python-data
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_2():
    # ── Lesson 2.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握 Pandas 核心数据结构 `Series` 与 `DataFrame` 的底层对齐机制与索引（Index）哲学；
2. 深刻辨析链式赋值（Chained Indexing）导致 `SettingWithCopyWarning` 的底层原因，熟练使用 `.loc` 进行原子定位与赋值；
3. 掌握 Pandas 内存分析方法（`df.info(memory_usage='deep')`），识别高基数与低基数字符串列的内存膨胀问题；
4. 熟练运用 `category` 类别数据类型对重复字符串进行编码压缩，实现内存占用降低 70% 到 90%；
5. 编写代码对百万行样本数据进行数据类型降级（Downcasting）与类别类型转换，量化内存瘦身前后的性能差异。

### 前置知识
- Python 字典与 NumPy 结构化数组；
- 内存字节与指针概念。

### 问题背景与 ML 用途
在实际机器学习项目中，原始特征数据（如电商订单流水、银行信贷日志）往往达到几千万行。
许多工程师在单台 32GB 内存的工作站上用 Pandas 加载一个 3GB 的 CSV 文件时，却频繁遭遇内存溢出崩溃（OOM）：
- 为什么 3GB 的文本文件加载到 Pandas 里会暴涨到 15GB 以上？
- 为什么在对特征列进行筛选赋值时，控制台频繁弹出恼人的 `SettingWithCopyWarning` 警告，且有时赋值成功、有时却神秘失效？
- 为什么在对两个未排序的数据集按特征合并时，标签顺序会悄然错位？
**Pandas 是现代机器学习数据预处理的中枢神经**。理解其索引对齐机制与内存模型，是编写高可靠、防泄漏、生产级特征处理代码的前提。

### 直觉理解
- **索引对齐机制（自动吸附磁铁）**：在 Python 列表或 NumPy 数组中，两个数组相加是按照物理位置纯机械对应的（第 1 个加第 1 个，第 2 个加第 2 个）。而 Pandas 的 Series 和 DataFrame 是一群“带有名字标签的元素”。当两个 Series 相加时，它们像带有磁性的卡片一样，**自动寻找拥有相同 Index 标签的卡片进行匹配对齐**！如果标签对不上，Pandas 会贴心地保留两个标签并在缺失处填补 NaN。
- **Category 压缩（字典查找表）**：如果一列有 1000 万行“省份名称”，用普通的 `object` 字符串存储，内存中要存放 1000 万个完整的字符串对象；而将其转为 `category` 后，Pandas 内部只会建立一张包含 34 个省份的“小字典”（各占 1 个整数代号），主数据列全部变成极小的 8 位整数 `int8`，内存瞬间缩减为原先的十分之一！

### 核心概念与符号对照表
| 核心概念 | 语法 / 属性 | 底层原理与行为 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **显式索引定位** | `df.loc[row_indexer, col_indexer]` | 基于轴标签（Label-based）进行严格单步原子定位与赋值 | 彻底根除 `SettingWithCopyWarning` |
| **整数位置定位** | `df.iloc[row_idx, col_idx]` | 基于从 0 开始的物理整数位置（Position-based）切片 | 类似于 NumPy 切片，用于训练/测试集物理切分 |
| **深度内存剖析** | `df.info(memory_usage='deep')` | 深入堆内存追踪 Python 字符串对象的实际物理占用 | 诊断 OOM 瓶颈与内存性能审计 |
| **类别类型** | `df['col'].astype('category')` | 将重复字符串转化为低位宽整型代码加分类字典映射 | 内存暴降 80% 以上，加速 GroupBy 聚合运算 |
| **数值类型降级** | `pd.to_numeric(..., downcast=...)` | 将 64 位宽浮点/整数自动紧凑化为 32 位或 16 位 | 减半内存占用，匹配 GPU 训练精度 |

### 数学原理与逐步推导
#### 1. `SettingWithCopyWarning` 的底层机理剖析
考察以下极具诱惑力但极度危险的典型代码：
```python
df[df['age'] > 18]['is_adult'] = 1  # 错误做法！
```
解释器在执行这段代码时，实际上将其拆解为两个独立的连续方法调用（链式调用）：
1. 步骤 1：`temp = df.__getitem__(df['age'] > 18)`
   这一步生成了一个临时的中间对象 `temp`。根据 Pandas 内存管理策略，`temp` 既可能是一个指向原 `df` 的视图（View），也可能是一个新开辟内存生成的副本（Copy）。
2. 步骤 2：`temp.__setitem__('is_adult', 1)`
   在临时对象 `temp` 上执行赋值。
**致命后果**：
- 如果 `temp` 碰巧是副本，你刚刚赋予的值 `1` 仅仅写入了随风而逝的临时对象 `temp` 中，原数据 `df` 的对应列**完全没有发生任何改变**！你的模型在训练时悄然使用了未清洗的脏数据！
- 为了向开发者发出严重警示，Pandas 会抛出 `SettingWithCopyWarning`。
**黄金法则**：在对子集赋值时，**永远使用单个 `.loc` 原子操作**：
```python
df.loc[df['age'] > 18, 'is_adult'] = 1  # 绝对安全且高效！
```

### 几何图景与计算图
```
链式赋值与单步原子定位内存对比：
链式赋值 (df[cond]['col'] = val):
  原 df ──▶ 步骤1: 临时副本 temp (独立内存) ──▶ 步骤2: 修改 temp (原 df 毫发无损!)
                                                      ▲ 触发 SettingWithCopyWarning!

原子定位 (df.loc[cond, 'col'] = val):
  原 df ──▶ 单步原子定位 ──▶ 直接安全原地覆写原 df 物理内存 (100% 成功!)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：高基数文本列盲目使用 `category`
> 如果某个特征列是几乎没有重复的“用户身份证号”或“文章标题”（唯一值数量接近总行数），将其转为 `category` 不仅无法省内存，反而会因为额外维护一张巨大的分类索引表而**导致内存进一步膨胀并急剧拖慢运行速度**！`category` 仅适用于唯一值比例（Cardinality）较低的列（如性别、省份、设备型号、状态码）。

### 工业界实践与工程考量
- 在生产级数据管道中，读取超大 CSV 文件时，绝不应该先全量加载后再做类型转换，而是应该在 `pd.read_csv` 的参数中显式传入 `dtype={'city': 'category', 'user_id': 'int32', 'amount': 'float32'}`，在流式解析阶段就直接按轻量类型写入内存，彻底规避加载瞬间的峰值 OOM。

### 延伸思考与进阶阅读
- 阅读 Wes McKinney《Python for Data Analysis》第 7 章与第 12 章：数据清洗与高级 Pandas 技巧。
- 思考：当对 DataFrame 的两个不同列基于条件修改时，为什么在数据清洗的第一步通常建议显式调用 `df = df.copy()` 来断开任何历史视图绑定？

### 本节小结
- 链式索引赋值具有极大的不确定性，必须统一使用 `.loc[row, col]`；
- 低基数字符串列转为 `category` 与数值类型降级是解决特征工程内存瓶颈的核心利器。"""

    l1_code = """import pandas as pd
import numpy as np

# 构造一个 10,000 行的模拟特征数据集 (包含城市、年龄、交易额)
np.random.seed(42)
n_rows = 10000
cities = ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Chengdu', 'Hangzhou']

df = pd.DataFrame({
    'city': np.random.choice(cities, size=n_rows),
    'age': np.random.randint(18, 70, size=n_rows),
    'amount': np.random.uniform(10.0, 5000.0, size=n_rows)
})

# 1. 查看原始内存占用 (深度扫描堆内存)
mem_raw = df.memory_usage(deep=True)
print("=== 原始 DataFrame 各列内存占用 (字节) ===")
print(mem_raw)
print(f"总内存占用: {mem_raw.sum() / 1024:.2f} KB")

# 2. 内存优化：将重复字符串转为 category，将 float64 降级为 float32
df_opt = df.copy()
df_opt['city'] = df_opt['city'].astype('category')
df_opt['amount'] = df_opt['amount'].astype('float32')
df_opt['age'] = df_opt['age'].astype('int8')

mem_opt = df_opt.memory_usage(deep=True)
print("\\n=== 优化后 DataFrame 各列内存占用 (字节) ===")
print(mem_opt)
print(f"优化后总内存: {mem_opt.sum() / 1024:.2f} KB")
print(f"city 列内存缩减比例: {(1.0 - mem_opt['city'] / mem_raw['city']):.2%}")
print(f"全局内存节约比例: {(1.0 - mem_opt.sum() / mem_raw.sum()):.2%}")

# 3. 规范的 .loc 赋值实践 (避免 SettingWithCopyWarning)
df_opt.loc[df_opt['age'] < 25, 'amount'] *= 1.1 # 年轻客群加权
print("\\n.loc 原子修改验证 (年轻客群加权后前 3 行):\\n", df_opt.head(3))
"""

    lesson_1 = lesson(
        lesson_id="ml-data-l2-1",
        title="Series 与 DataFrame 的索引哲学与内存优化：降服 OOM 猛兽",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("单步 loc 原则：永远使用 `df.loc[mask, 'col'] = val` 进行切片赋值，彻底杜绝 `df[mask]['col'] = val` 导致的静默失效与警告。", "pitfall"),
            tip("read_csv 预指定 dtype：处理超大文件时，直接在 `read_csv(..., dtype=...)` 中传入紧凑类型，能避免加载瞬间内存峰值打满崩溃。", "performance")
        ],
        demos=[
            demo(code=l1_code, title="DataFrame 内存深度分析与 Category 极致压缩实测")
        ]
    )

    # ── Lesson 2.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握 Hadley Wickham 提出的**拆分—应用—合并（Split-Apply-Combine）**核心范式；
2. 深刻辨析 `groupby` 后的两类关键下游操作：聚合（`.agg()`）与广播变换（`.transform()`）；
3. 熟练运用 `.transform()` 在保持原始样本行数不变的前提下，构建组内均值差、组内比率与分组 Z-score 特征；
4. 掌握时序数据滚动窗口（`.rolling()`）与累积窗口（`.expanding()`）特征的构建技巧；
5. 编写代码对用户交易流水进行分组特征工程抽取，生成组内偏离度与滚动平滑特征。

### 前置知识
- 关系型数据库 GROUP BY 概念；
- 均值、方差与 Z-score 标准化。

### 问题背景与 ML 用途
在真实的机器学习竞赛（如 Kaggle）与工业界建模中，**单看样本自身的原始绝对值，往往很难挖掘出高阶预测信号**：
- 某用户单笔消费了 500 元。这到底算多还是算少？
  - 如果该商品类目是“餐饮外卖”，500 元可能属于极端大单（组内异常度极高）；
  - 如果该商品类目是“数码家电”，500 元只是最基础的普通配件。
如何定量捕获这种“相对上下文背景”的特征？
- “该用户的消费额偏离其所在省份同龄人平均水平多少？”
- “该商户最近 7 天的平均交易额是否出现异动？”
**Pandas 的 `groupby` + `.transform()` 与 `.rolling()` 是批量衍生这类高价值聚合特征的核心工具**。

### 直觉理解
- **班级评比与年级大榜**：
  - `.agg()` 就像期末“班主任汇报总结”：把每个班（组）的几十个学生压缩为一行班级平均分，总人数从全校几千人瞬间缩减为几十行班级摘要。
  - `.transform()` 就像给每个学生的成绩单上“盖上他们本班的平均分戳记”：学生自己的个人行保持完全不变（全校多少人，输出依然是多少行），但每一行都新增了一列“你本班的平均分”。有了这列广播参照物，学生一眼就能算出自己比本班平均高了多少分（组内差值特征）！

### 核心概念与符号对照表
| 核心概念 | 语法表达式 | 输出维度与特征行为 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **拆分聚合** | `df.groupby('grp')['val'].agg(['mean', 'std'])` | 压缩行数：输出行数严格等于组数 | 宏观统计报告、实体级画像构建 |
| **组内广播变换** | `df.groupby('grp')['val'].transform('mean')` | **保持原行数**：将组统计量广播到原表各行 | 构建“样本值与组均值之差/比率”高阶特征 |
| **自定义 Transform** | `.transform(lambda x: (x - x.mean()) / x.std())` | 组内自适应无量纲化（分组 Z-score） | 消除群体基准差异（如不同品类价格基准） |
| **滑动时间窗口** | `df['val'].rolling(window=7).mean()` | 按固定行数或时间窗口向后滑动求统计量 | 捕捉时序动态趋势与近期动量特征 |
| **累积历史窗口** | `df['val'].expanding().mean()` | 包含从序列开始至当前行的所有历史记录 | 构建历史累计信用均值（严格防未来穿越） |

### 数学原理与逐步推导
#### 1. 分组 Z-Score 特征构造
设样本集中包含 $N$ 条记录，特征列为 $x_i$，其所属分组标识为 $g_i \\in \\{1, \\dots, K\\}$。
对于任意分组 $k$，定义该组的样本集合为 $S_k = \\{i \\mid g_i = k\\}$。
组内均值与组内标准差分别为：
$$\\mu_k = \\frac{1}{|S_k|} \\sum_{i \\in S_k} x_i, \\quad \\sigma_k = \\sqrt{\\frac{1}{|S_k|-1} \\sum_{i \\in S_k} (x_i - \\mu_k)^2}$$
若直接将原始特征 $x_i$ 输入线性模型或树模型，模型学到的是全局绝对大小；
而通过 `.transform()` 计算分组 Z-score 特征：
$$z_i = \\frac{x_i - \\mu_{g_i}}{\\sigma_{g_i}}$$
该特征严格量化了样本在**其自身细分人群中的相对排位（Relative Stature）**。它自动消除了不同类目之间的均值平移漂移与方差不齐性，往往能大幅提升 GBDT 树模型的切分纯度。

### 几何图景与计算图
```
.agg() 与 .transform() 的计算形态对比：
原始表 (4 行数据):
  组别 A, 数值 10
  组别 A, 数值 20
  组别 B, 数值 30
  组别 B, 数值 50
        │
        ├─▶ .agg('mean') ───────▶ 压缩为 2 行: [组 A: 15, 组 B: 40]
        │
        └─▶ .transform('mean') ─▶ 广播保持 4 行: [15, 15, 40, 40]
                                      │
                                      ▼ 减法运算衍生出组内差值特征
                                  [-5, +5, -10, +10]
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：在时序数据中使用全局 rolling 计算历史特征
> 在构建时间序列特征时，必须确保数据已经严格按照**时间戳递增排序**！如果在执行 `.rolling()` 前未排序，窗口中可能会掺杂未来数据或跳跃跨度，造成极其严重的时间信息泄漏（Temporal Leakage）。同时，在预测当天标签时，必须使用 `.shift(1)` 将窗口向后平移，绝对不能让当天的未发生事件参与计算！

### 工业界实践与工程考量
- 在极大规模数据（数千万行）上，`df.groupby().transform(lambda ...)` 使用自定义 Python 函数会非常缓慢（因为每次都要调用 Python 解释器环境）。工业界最佳实践是优先使用 Pandas 原生编译的优化字符串方法（如 `.transform('mean')`、`.transform('std')`），其内部由底层 C/Cython 向量化加速，性能比纯 Python lambda 快 20 到 50 倍。

### 延伸思考与进阶阅读
- 阅读 Hadley Wickham 经典论文《The Split-Apply-Combine Strategy for Data Analysis》(2011)。
- 思考：如果要计算“用户过去 30 天内的总消费额”，但用户的消费记录在时间上是不规则稀疏分布的（有的天有 5 笔，有的天隔了一周才有一笔），应该如何在 Pandas 中设置基于时间偏移的 rolling 窗口（如 `rolling('30D', on='timestamp')`）？

### 本节小结
- `.agg()` 缩减行数进行全局概括，`.transform()` 保持行数进行组内特征广播；
- 组内相对特征与时间窗口特征是提升结构化数据机器学习模型精度的杀手锏。"""

    l2_code = """import pandas as pd
import numpy as np

# 构造模拟电商订单数据集 (包含用户 ID, 商品类目, 支付金额)
np.random.seed(42)
data = pd.DataFrame({
    'user_id': [101, 102, 101, 103, 102, 104, 101, 103],
    'category': ['Food', 'Food', 'Digital', 'Food', 'Digital', 'Cloth', 'Cloth', 'Digital'],
    'amount': [25.0, 40.0, 1200.0, 35.0, 3500.0, 180.0, 220.0, 800.0]
})

print("=== 原始订单数据集 ===")
print(data)

# 1. 使用 .agg() 进行类目宏观聚合分析 (行数压缩)
cat_summary = data.groupby('category')['amount'].agg(
    order_count='count',
    mean_amount='mean',
    std_amount='std'
).reset_index()

print("\\n=== 1. 类目宏观聚合概括 (.agg()) ===")
print(cat_summary)

# 2. 使用 .transform() 构建细粒度组内上下文特征 (行数严格保持不变)
# 特征 A: 所在类目的平均消费基准
data['cat_mean'] = data.groupby('category')['amount'].transform('mean')

# 特征 B: 当前消费相对该类目均值的偏离差 (Diff)
data['amount_diff_cat'] = data['amount'] - data['cat_mean']

# 特征 C: 当前消费相对该类目均值的倍率比 (Ratio)
data['amount_ratio_cat'] = data['amount'] / data['cat_mean']

# 特征 D: 类目内标准化相对分位数 (分组 Z-score)
data['cat_zscore'] = data.groupby('category')['amount'].transform(
    lambda s: (s - s.mean()) / (s.std() + 1e-6)
)

print("\\n=== 2. 利用 .transform() 衍生出的高阶上下文特征 ===")
print(data[['user_id', 'category', 'amount', 'cat_mean', 'amount_diff_cat', 'cat_zscore']])
"""

    lesson_2 = lesson(
        lesson_id="ml-data-l2-2",
        title="分组聚合拆分与自定义 Transform：挖掘相对上下文高阶特征",
        content=l2_content,
        difficulty=3,
        tips=[
            tip("优先使用原生聚合别名：尽量使用 `.transform('mean')` 而非 `.transform(lambda x: x.mean())`，Pandas 针对内置字符串别名做了底层 Cython 极速优化。", "performance"),
            tip("防时序穿越的 shift 规则：在用 rolling 提取历史行为特征时，必须紧跟 `.shift(1)`，确保当前行只能看到过去的滑动窗口，严防未来信息泄露。", "pitfall")
        ],
        demos=[
            demo(code=l2_code, title="groupby 的 .agg() 压缩与 .transform() 组内特征衍生实战")
        ]
    )

    # ── Lesson 2.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握关系型表格关联合并（`pd.merge` 与 `df.join`）的四大连接方式（Inner、Left、Right、Outer）及其基数匹配风险；
2. 深刻辨析长表格（Long Format，Tidy Data）与宽表格（Wide Format）的数学结构与模型适用场景；
3. 熟练运用 `pivot_table` 与 `melt` 实现多维特征在长宽格式之间的灵活双向转换；
4. 掌握多重索引（MultiIndex）的扁平化重命名技巧，防止特征列名嵌套导致的下游模型解析错误；
5. 编写代码对实体行为日志进行时间跨度透视与反透视，提取实体维度的多周期聚合宽表特征。

### 前置知识
- SQL JOIN 基础概念；
- 矩阵转置与笛卡尔积。

### 问题背景与 ML 用途
在真实的工业界机器学习项目中，数据极少是以单个现成大宽表的形式存在的：
- 推荐系统有独立的“用户表”、“物品表”和“用户点击日志流”；
- 银行风控有独立的“借款人基本信息表”、“历史还款账单表”和“征信查询记录表”。
如何将这些多源异构的时序行为流，整理成 Scikit-learn 或 XGBoost 所要求的“一行代表一个样本、一列代表一个特征”的标准二维矩阵？
- 错误的 Merge 会导致笛卡尔积爆炸（数据行数翻倍膨胀，产生严重的虚假重复样本）；
- 缺乏透视重塑技巧，就无法将用户过去 12 个月的月度消费转化为 12 个平行的独立特征列。
**`merge`、`pivot_table` 与 `melt` 是将业务日志提炼为标准机器学习特征矩阵的重构枢纽**。

### 直觉理解
- **长表（适合存储与时间流） vs 宽表（适合机器学习模型）**：
  - 长表（Long）：像流水账日记，一个人每天写一行（“小明, 1月, 消费100”、“小明, 2月, 消费200”）。优点是非常灵活，随时追加新月份也不需要改动表结构，适合数据库和日志系统。
  - 宽表（Wide）：像考勤花名册，每个人只有一行，各个月份变成了一列列独立的属性（“小明, 1月消费, 2月消费”）。**绝大多数传统机器学习算法（线性模型、决策树、SVM）只接受这种一行一个样本的扁平宽表**！`pivot_table` 就是把流水账日记一键翻转为考勤花名册的折叠机。

### 核心概念与符号对照表
| 核心概念 | 语法 / 函数 | 操作语义与数据流向 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **表格连接** | `pd.merge(left, right, on='key', how='left')` | 基于公共主键将两张表水平拼接合并 | 拼接用户属性特征与历史统计标签 |
| **重叠列后缀** | `suffixes=('_main', '_aux')` | 自动处理重名列名冲突，避免字段覆盖丢失 | 多源特征融合防命名污染 |
| **透视表重塑** | `df.pivot_table(index, columns, values)` | 将长格式数据根据维度聚合旋转展开为宽表 | 将离散实体行为流转化为多列静态特征 |
| **反透视折叠** | `pd.melt(df, id_vars, value_vars)` | 将宽表中的多个并列特征列压平还原为长格式 | 时序图表绘制、多变量特征统一清洗 |
| **列名扁平化** | `['_'.join(col) for col in df.columns]` | 将聚合产生的高级元组多重索引展平为单层字符串 | 确保特征名兼容 XGBoost / LightGBM |

### 数学原理与逐步推导
#### 1. Merge 操作中的基数对齐陷阱（1-to-Many vs Many-to-Many）
设主表 $L$ 有 $N_L$ 行，辅助表 $R$ 有 $N_R$ 行。基于连接键 $K$ 执行左连接（`how='left'`）：
1. **一对一（1-to-1）或多对一（Many-to-1）**：如果辅助表 $R$ 中连接键 $K$ 严格唯一（如每个用户 ID 在用户画像表中只有一行记录），则左连接后结果集的行数严格等于主表行数：
   $$N_{\\text{result}} = N_L$$
   这是特征工程最健康、最标准的状态。
2. **多对多（Many-to-Many）灾难**：如果辅助表 $R$ 中由于数据质量问题存在重复的连接键（例如同一个用户 ID 有 2 条不同记录），左连接会触发局部笛卡尔积扩展：
   $$N_{\\text{result}} > N_L$$
   **严重后果**：这会导致主表中的样本被悄悄克隆复制！如果这个主表恰好是训练集，部分样本的权重无故被放大两倍；若存在于测试集中，会导致评测指标彻底失真！
   **工业级防范准则**：在执行 `merge` 之前，必须对辅助表的连接键唯一性进行断言检查，或者使用 `validate='many_to_one'` 参数让 Pandas 自动拦截。

### 几何图景与计算图
```
透视与反透视几何流动：
长格式 (Long Format - 流水账)           透视 (pivot_table)         宽格式 (Wide Format - ML 特征表)
user_id | month | spend     ─────────────────────────▶    user_id | spend_Jan | spend_Feb
  101   |  Jan  |  100                                      101   |    100    |    200
  101   |  Feb  |  200     ◀─────────────────────────       102   |    150    |    300
  102   |  Jan  |  150             反透视 (melt)
  102   |  Feb  |  300
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：透视表产生 MultiIndex 列名后直接传给模型
> 在使用 `pivot_table(index='user_id', columns='category', values='spend')` 后，返回的 DataFrame 的列名是一个二级的 `MultiIndex`（如 `('spend', 'Food')`）。如果你直接将其传入 LightGBM 或导为 CSV，LightGBM 会直接报错崩溃，或者将列名转为丑陋的字符串字面量元组。**透视完成后，必须立即通过列表推导式将其展平为 `spend_Food`、`spend_Digital` 等合法单层特征名**。

### 工业界实践与工程考量
- 在高并发分布式特征抽取中，`pivot_table` 会对整个数据集做全量内存洗牌（Shuffle）。工业界通常会限定透视的 `columns` 候选范围（只保留 Top 50 的高频类目），对低频尾部类目归并为 `Other`，防止生成拥有数万列的极度稀疏巨大宽表导致下游稀疏模型训练缓慢。

### 延伸思考与进阶阅读
- 阅读 Hadley Wickham 里程碑论文《Tidy Data》(Journal of Statistical Software, 2014)。
- 思考：在金融信贷风控中，如果一个用户在过去 6 个月内没有任何还款行为，透视后该用户在对应月份的特征会显示为 `NaN`。此时应该直接填补 0，还是填补一个特殊的缺失标志位？

### 本节小结
- 严格校验 Merge 基数，防止因键重复造成样本无故克隆膨胀；
- `pivot_table` 将长流水提炼为扁平特征宽表，展平多重列名是保证模型兼容性的关键步骤。"""

    l3_code = """import pandas as pd
import numpy as np

# 1. 构造多表数据场景: 用户主表与月度消费流水表
users = pd.DataFrame({
    'user_id': [1, 2, 3],
    'age': [25, 34, 45],
    'gender': ['F', 'M', 'M']
})

transactions = pd.DataFrame({
    'user_id': [1, 1, 2, 2, 3, 1],
    'month': ['2026-01', '2026-02', '2026-01', '2026-02', '2026-01', '2026-03'],
    'spend': [120.0, 250.0, 80.0, 95.0, 600.0, 310.0]
})

print("=== 原始主表与月度长流水表 ===")
print("users:\\n", users)
print("transactions:\\n", transactions)

# 2. 对长格式交易流水进行透视重塑 (pivot_table)，提取跨月特征宽表
# 缺失月份自动填充 0.0
pivot_df = transactions.pivot_table(
    index='user_id',
    columns='month',
    values='spend',
    fill_value=0.0
)

# 扁平化多重列名，命名规范化: spend_2026_01, spend_2026_02...
pivot_df.columns = [f"spend_{col.replace('-', '_')}" for col in pivot_df.columns]
pivot_df = pivot_df.reset_index()

print("\\n=== 透视重构并展平后的宽表特征矩阵 ===")
print(pivot_df)

# 3. 将宽表特征安全 Merge 回用户主表 (严格校验一对一/多对一关联)
# validate='one_to_one' 确保主键绝对唯一，绝不发生行数膨胀
final_features = pd.merge(
    users,
    pivot_df,
    on='user_id',
    how='left',
    validate='one_to_one'
)

# 衍生跨月环比趋势特征: 2月相对1月的消费增长额
final_features['spend_growth_m2_m1'] = final_features['spend_2026_02'] - final_features['spend_2026_01']

print("\\n=== 最终可直接供给机器学习模型训练的特征宽表 ===")
print(final_features)
"""

    lesson_3 = lesson(
        lesson_id="ml-data-l2-3",
        title="表关联、重塑与时序特征抽取：打造结构化宽表特征矩阵",
        content=l3_content,
        difficulty=3,
        tips=[
            tip("Merge 务必加 validate 参数：在执行关键表格合并时，显式传入 `validate='many_to_one'` 或 `'one_to_one'`，能从根源上截断因键冲突导致的样本行数爆炸复制。", "pitfall"),
            tip("多重列名一键展平：在做透视或复杂聚合后，使用 `['_'.join(col) if isinstance(col, tuple) else col for col in df.columns]` 立即消除 MultiIndex 列名。", "note")
        ],
        demos=[
            demo(code=l3_code, title="多表 merge 校验、长流水透视展开与列名扁平化全流程")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 2 ──
    exercises = [
        single_choice(
            ex_id="ml-data-c2-ex1",
            question="在对包含数百万行的数据集进行内存优化时，为什么将低基数重复字符串列（例如包含 10 个不同城市名称的 `city` 列）的数据类型由 `object` 转换为 `category` 能够使内存大幅缩减？",
            options=[
                {"value": "A", "text": "因为 `category` 内部将每个不同字符串编码为轻量整数索引，主列仅存储低字节整数，避免了重复在堆内存中实例化庞大的 Python 字符串对象"},
                {"value": "B", "text": "因为 `category` 自动删除了除了前 100 行以外的所有样本数据"},
                {"value": "C", "text": "因为 `category` 类型自动开启了后台 zip 无损数据压缩流"},
                {"value": "D", "text": "因为 `category` 类型只允许在 64 位操作系统上运行"},
            ],
            answer="A",
            explanation="Pandas 的 `category` 采用字典编码机制，主数据列转换为紧凑的整数代码（如 int8），仅在分类字典中存储一份唯一的字符串映射表，彻底消除了数百万个重复字符串对象占用的天文级指针和元数据开销。",
            difficulty=2,
            related_lesson_id="ml-data-l2-1",
            tags=["category类型", "内存优化", "字典编码"],
        ),
        judge(
            ex_id="ml-data-c2-ex2",
            question="在 Pandas 中，使用 `groupby('category')['amount'].transform('mean')` 计算组内均值时，返回的结果序列长度与原 DataFrame 的样本行数完全相等，可以直接作为新特征列拼回原表。",
            answer=True,
            explanation="正确。这正是 `.transform()` 与 `.agg()` 的核心区别：`.agg()` 会把每个组压缩为单一汇总行，而 `.transform()` 会将各组计算出的统计量广播回属于该组的每一行，保持输出行数与原始 DataFrame 完全一致。",
            difficulty=2,
            related_lesson_id="ml-data-l2-2",
            tags=["transform机制", "特征广播", "行数保持"],
        ),
        multiple_choice(
            ex_id="ml-data-c2-ex3",
            question="关于在 Pandas 中使用 `pd.merge` 进行特征表关联时的工程最佳实践，下列说法正确的有：",
            options=[
                {"value": "A", "text": "如果右侧辅助特征表中连接键存在未预期的重复记录，执行左连接（Left Join）会导致主表行数异常膨胀（产生重复样本）"},
                {"value": "B", "text": "可以通过传入 `validate='many_to_one'` 参数，让 Pandas 在发现右表主键不唯一时自动抛出异常进行拦截"},
                {"value": "C", "text": "当两表存在非连接键的同名字段时，应配置 `suffixes` 参数以便于明确区分不同来源的特征"},
                {"value": "D", "text": "只要在 Merge 前对两个 DataFrame 的索引执行排序，就永远不可能发生笛卡尔积膨胀"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均为工业级防泄漏与数据校验的重要实践。D 是错误的：笛卡尔积是由连接键的重复性决定的，单纯对数据按行排序根本无法消除多对多连接键导致的行数膨胀。",
            difficulty=3,
            related_lesson_id="ml-data-l2-3",
            tags=["pd.merge", "validate参数", "特征关联", "笛卡尔积防范"],
        ),
        fill(
            ex_id="ml-data-c2-ex4",
            question="在对 DataFrame 执行条件筛选赋值时，为了彻底消除底层的 `SettingWithCopyWarning` 风险并保证安全原地修改，必须使用 ____ 方法通过单一原子语句进行定位赋值；将长格式时序流水数据按维度翻转展开为机器学习特征宽表的核心函数是 ____。",
            blanks=[
                [".loc", "loc", "df.loc"],
                ["pivot_table", "pd.pivot_table", "pivot"]
            ],
            explanation="单步原子定位必须使用 `.loc[row, col]`；长宽表透视展开的核心方法是 `pivot_table`。",
            difficulty=2,
            related_lesson_id="ml-data-l2-1",
            tags=["loc赋值", "pivot_table", "规范操作"],
        ),
        open_ex(
            ex_id="ml-data-c2-ex5",
            question="【架构设计与防泄漏题】请系统阐述在构建时间序列滚动窗口特征（Rolling Features）时的关键设计规范：\n1. 解释为什么在执行 `.rolling()` 前，数据集必须严格按照时间戳（Timestamp）升序排序；\n2. 解释在预测当天目标标签 $y_t$ 时，为什么对特征列构建滑动平均后必须紧跟 `.shift(1)`（指出若不加 shift 会导致什么致命问题）；\n3. 举例说明如何利用 `.expanding()` 构建无时间穿越的“实体历史累计均值”特征。",
            reference_answer="""设计规范如下：
1. 严格时间排序的必要性：
   Pandas 的 `.rolling(window=k)` 默认是基于物理行的前后顺序滑动计算的。如果数据在时间维度上未排序（乱序），窗口内纳入的数据点在物理时间轴上就会前后来回跳跃，不仅破坏了时间维度的连续平滑性，更会导致未来的交易记录被误卷入过去的滑动窗口中。
2. 必须紧跟 `.shift(1)` 的致命防泄漏原因：
   默认情况下，`df['feature'].rolling(window=k).mean()` 在第 $t$ 行计算出的平均值包含了当期样本 $x_t$ 自身的数据（即窗口覆盖了 $[t - k + 1, t]$）。如果在预测当天的标签 $y_t$ 时使用了包含当期行为 $x_t$ 的特征，不仅存在因果颠倒（用当前结果预测当前事件），而且在生产实时推理阶段，当天的全天汇总数据在决策瞬间根本尚未发生！
   因此必须使用 `.shift(1)` 将窗口向后平移一行，使得第 $t$ 行的特征严格仅包含 $[t - k, t - 1]$ 的历史信息，彻底杜绝时间信息泄漏（Temporal Leakage）。
3. expanding() 历史累积特征构建：
   对于新用户冷启动与长周期信用评估，我们希望知道“截至上一笔交易，该用户历史所有交易的累计均值”。
   代码设计：`df['user_hist_mean'] = df.groupby('user_id')['amount'].transform(lambda s: s.expanding().mean().shift(1))`
   由于窗口从序列首项不断扩展并整体右移一位，第 $t$ 笔交易使用的严格是前 $t-1$ 笔交易的累积平均值，完全不会偷看未来样本。""",
            explanation="深入辨析时序滚动窗口在特征工程中的因果次序与防止时间穿越（Temporal Leakage）的严格规范，极具工程实战指导意义。",
            rubric=[
                {"point": "明确阐述时间乱序对 rolling 窗口物理连续性的破坏", "score": 25},
                {"point": "深刻指出 rolling 默认包含当期样本 t 自身的因果穿越风险", "score": 25},
                {"point": "明确给出 .shift(1) 平移窗口实现严格基于历史预测当前的工程标准", "score": 25},
                {"point": "清晰设计 expanding().mean().shift(1) 构建无泄漏历史累积特征", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-data-l2-2",
            tags=["时间序列特征", "rolling", "shift防泄漏", "TemporalLeakage"],
        ),
        # ── Code Exercise 2 ──
        {
            "id": "ml-data-c2-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】利用 groupby 与 transform 构建类目相对特征工程：\n编写函数 `group_feature_engineering(df)`：\n接收一个包含列 `['user_id', 'category', 'amount']` 的 Pandas DataFrame。\n在不改变原有行数与顺序的前提下，利用 `.transform()` 衍生以下 3 个新特征：\n1. `cat_mean_amount`: 样本所在 `category` 类目的平均消费金额（四舍五入保留 2 位小数）；\n2. `diff_from_cat_mean`: 样本自身消费金额与类目平均金额的差值 `amount - cat_mean_amount`（保留 2 位小数）；\n3. `is_above_cat_mean`: 布尔指示标志，若自身金额严格大于类目均值则为 1，否则为 0（整数类型）。\n\n返回包含列 `['user_id', 'category', 'amount', 'cat_mean_amount', 'diff_from_cat_mean', 'is_above_cat_mean']` 的数据内容，并通过 `.values.tolist()` 转化为嵌套 Python 列表。\n\n最后一行请返回调用示例在测试数据下的计算结果。",
            "starterCode": "import pandas as pd\nimport numpy as np\n\ndef group_feature_engineering(df: pd.DataFrame) -> list:\n    \"\"\"利用 groupby 和 transform 衍生组内均值基准与偏离特征\"\"\"\n    # 请在此实现\n    ___\n\ndata_demo = pd.DataFrame({\n    'user_id': [1, 2, 3, 4],\n    'category': ['A', 'A', 'B', 'B'],\n    'amount': [100.0, 200.0, 30.0, 50.0]\n})\ngroup_feature_engineering(data_demo)\n",
            "setupCode": "",
            "expectedOutput": "[[1, 'A', 100.0, 150.0, -50.0, 0], [2, 'A', 200.0, 150.0, 50.0, 1], [3, 'B', 30.0, 40.0, -10.0, 0], [4, 'B', 50.0, 40.0, 10.0, 1]]",
            "answer": "import pandas as pd\nimport numpy as np\n\ndef group_feature_engineering(df: pd.DataFrame) -> list:\n    df = df.copy()\n    df['cat_mean_amount'] = df.groupby('category')['amount'].transform('mean')\n    df['diff_from_cat_mean'] = df['amount'] - df['cat_mean_amount']\n    df['is_above_cat_mean'] = (df['amount'] > df['cat_mean_amount']).astype(int)\n    df['cat_mean_amount'] = np.round(df['cat_mean_amount'], 2)\n    df['diff_from_cat_mean'] = np.round(df['diff_from_cat_mean'], 2)\n    cols = ['user_id', 'category', 'amount', 'cat_mean_amount', 'diff_from_cat_mean', 'is_above_cat_mean']\n    return df[cols].values.tolist()\n\ndata_demo = pd.DataFrame({\n    'user_id': [1, 2, 3, 4],\n    'category': ['A', 'A', 'B', 'B'],\n    'amount': [100.0, 200.0, 30.0, 50.0]\n})\ngroup_feature_engineering(data_demo)\n",
            "tests": "data_t = pd.DataFrame({'user_id': [10, 20], 'category': ['X', 'X'], 'amount': [10.0, 30.0]})\nres_t = group_feature_engineering(data_t)\nassert res_t == [[10, 'X', 10.0, 20.0, -10.0, 0], [20, 'X', 30.0, 20.0, 10.0, 1]], f\"特征计算错误: {res_t}\"\n",
            "explanation": "利用 groupby('category')['amount'].transform('mean') 广播组内均值，并衍生差值与二值超额标记特征。",
            "tags": ["groupby", "transform", "相对特征", "Pandas编程实战"],
            "related_lesson_id": "ml-data-l2-2",
        },
        single_choice(
            ex_id="ml-data-c2-ex7",
            question="在对多维表格执行 `pivot_table` 透视重构后，DataFrame 的列名通常会变成包含两级元组的 `MultiIndex`。为了防止下游 Scikit-learn 或 LightGBM 模型报错，最推荐的列名处理方式是：",
            options=[
                {"value": "A", "text": "通过列表推导式使用下划线将多重索引级别拼接展平为单层字符串列名（如 `['_'.join(col) for col in df.columns]`）"},
                {"value": "B", "text": "直接忽略，LightGBM 可以原生解析任何多级列名元组"},
                {"value": "C", "text": "将所有列名强制重命名为连续的阿拉伯数字 1, 2, 3... 并丢弃原始特征名"},
                {"value": "D", "text": "只能放弃透视表，改用双重 Python 循环逐行提取特征"},
            ],
            answer="A",
            explanation="透视后产生的 MultiIndex 列名不兼容大多数底层 C++ 编写的机器学习包。最佳实践是通过列表推导式使用下划线拼接展平为描述清晰的单层字符串（如 `spend_2026_01`），既保留了特征物理含义，又保障了框架兼容性。",
            difficulty=2,
            related_lesson_id="ml-data-l2-3",
            tags=["pivot_table", "MultiIndex展平", "工程规范"],
        ),
    ]

    return chapter(
        chapter_id="ml-data-c2",
        course_id="ml-python-data",
        order=2,
        title="Pandas 高效数据整理与聚合变换",
        goal="掌握 Series/DataFrame 索引哲学与 category 内存压缩，熟练运用 transform 组内特征工程与透视重塑。",
        lessons=lessons,
        exercises=exercises,
    )
