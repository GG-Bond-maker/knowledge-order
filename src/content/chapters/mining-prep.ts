import type { Chapter } from '../../types';

export const miningPrepChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'mining-prep-c1',
    title: '数据质量：缺失值、异常值与重复',
    goal: '识别并处理数据中的三类主要质量问题，理解每种处理方式的代价。',
    lessons: [
      {
        id: 'mining-prep-c1-l1',
        title: '缺失机制与三种填补策略',
        content: `
## 缺失值不是"没有值"，它有机制

处理缺失值前必须先问：**为什么缺失？** 三类机制：

| 机制 | 含义 | 例子 |
| --- | --- | --- |
| **MCAR**（完全随机） | 缺失与任何变量无关 | 抽样时随机丢失的记录 |
| **MAR**（随机） | 缺失依赖其他**可观测**变量 | 高收入者更不愿填收入 |
| **MNAR**（非随机） | 缺失依赖**未观测**的值本身 | 抑郁量表：越严重越不填 |

**关键**：只有 MCAR 下直接删除才是无偏的。MAR 可以用其他变量建模填补，MNAR 最麻烦——缺失本身携带信息。

## 三种处理策略

**① 删除**

    df.dropna(subset=['price'])           # 删行
    df.dropna(axis=1, thresh=0.5*len(df))  # 删缺失过多的列

**代价**：损失样本，且当缺失非随机时引入偏差。
**适用**：缺失比例极低（< 5%）且机制是 MCAR。

**② 统计量填补**

    df['price'].fillna(df['price'].median())   # 中位数抗异常值
    df['city'].fillna(df['city'].mode()[0])    # 众数

**代价**：**低估方差**（把缺失值当成确定值），削弱变量间相关性。
**适用**：快速原型、缺失比例小。

**③ 模型填补**

    from sklearn.ensemble import HistGradientBoostingRegressor
    # 用其他列预测缺失列
    model = HistGradientBoostingRegressor()
    model.fit(df[not_missing][other_cols], df[not_missing]['price'])
    df.loc[missing, 'price'] = model.predict(df[missing][other_cols])

**代价**：计算成本、可能引入模型偏差。
**适用**：缺失比例较高（10%~50%）、变量间存在相关性。

## 一个常被忽略的技巧：缺失指示器

**缺失本身可能是信号**。加一列标记"是否缺失"：

    df['price_is_missing'] = df['price'].isna().astype(int)

在 MNAR 场景下，这个二值特征往往比填补后的值更有预测力。

## 异常值：三种判据

| 判据 | 方法 | 适用 |
| --- | --- | --- |
| **统计** | 3σ 法则、IQR（Q1-1.5IQR, Q3+1.5IQR） | 近似正态的连续变量 |
| **距离** | kNN 距离、LOF | 多维数据 |
| **模型** | Isolation Forest、One-Class SVM | 高维、复杂分布 |

**IQR 方法**（比 3σ 稳健）：

    q1, q3 = df['price'].quantile([0.25, 0.75])
    iqr = q3 - q1
    lower, upper = q1 - 1.5*iqr, q3 + 1.5*iqr
    outliers = df[(df['price'] < lower) | (df['price'] > upper)]

## 异常值不等于错误

**这是最重要的一句话**：异常值可能是
- 录入错误 → 应该修正或删除；
- 罕见但真实的极端情况 → **不能删，那可能正是业务价值所在**（如欺诈、大客户）；
- 分布本身的形状（长尾）→ 应该用稳健统计量而非删除。

**判断方法**：看业务含义 + 看是否影响结论。
如果去掉几个点结论就翻转，那要在报告里明确说明。

## 重复记录

    df.duplicated(subset=['order_id']).sum()
    df.drop_duplicates(subset=['order_id'], keep='last')

**注意**：完全重复 ≠ 业务重复。
同一用户同一天多次下单是正常业务，不是重复记录。

<ImputeStrategyDemo />
`,
        tips: [
          {
            kind: 'interview',
            text: '「缺失值三种机制」：MCAR（完全随机，删无偏）、MAR（依赖其他可观测变量，可建模填补）、MNAR（依赖未观测的值本身，最麻烦）。',
          },
          {
            kind: 'leak',
            text: '统计量填补会低估方差、削弱变量相关性。缺失比例高（10%+）时优先考虑模型填补或加缺失指示器。',
          },
          {
            kind: 'pitfall',
            text: '异常值不等于错误。罕见但真实的极端值（欺诈、大客户）可能正是业务价值所在，删掉会丢失关键信号。',
          },
        ],
        demos: [
          {
            title: '缺失值与异常值处理对比',
            lang: 'python',
            code: `import numpy as np
import pandas as pd

np.random.seed(42)
df = pd.DataFrame({
    "price": [100, 120, 90, np.nan, 110, 5000, 95, np.nan, 105, 88],
    "qty": [2, 1, 3, 2, 1, 1, 4, 2, 1, 3],
    "city": ["北京", "上海", "北京", np.nan, "上海", "广州", "北京", "上海", "广州", "北京"],
})

print("原始数据:")
print(df)
print(f"\\n缺失统计:\\n{df.isna().sum()}")
print(f"缺失比例:\\n{(df.isna().mean()*100).round(1)}%")

# ① 中位数填补（price）
median_price = df["price"].median()
df["price_filled"] = df["price"].fillna(median_price)
print(f"\\n中位数填补 price（中位数={median_price}）")

# ② 加缺失指示器
df["price_was_missing"] = df["price"].isna().astype(int)
print(f"缺失指示器：共 {df['price_was_missing'].sum()} 条缺失")

# ③ IQR 检测异常值
q1, q3 = df["price"].quantile([0.25, 0.75])
iqr = q3 - q1
lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
print(f"\\nIQR 边界: [{lower:.1f}, {upper:.1f}]")
outliers = df[(df["price"] < lower) | (df["price"] > upper)]
print(f"检出异常值 {len(outliers)} 个: {outliers['price'].tolist()}")

# ④ 对比：删除 vs 填补对均值的影响
print(f"\\n原始均值（含 NaN）: {df['price'].mean():.2f}")
print(f"删除后均值:         {df['price'].dropna().mean():.2f}")
print(f"中位数填补后均值:   {df['price_filled'].mean():.2f}")
print(f"若不处理 5000 这个极端值，均值被拉高: {df['price'].dropna().mean():.1f} vs 中位数 {median_price}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-prep-c1-e1',
        type: 'single',
        difficulty: 2,
        question: '「高收入者更不愿意在问卷中填写收入」属于哪种缺失机制？',
        options: [
          { value: 'A', text: 'MCAR（完全随机缺失）' },
          { value: 'B', text: 'MAR（随机缺失，依赖其他可观测变量）' },
          { value: 'C', text: 'MNAR（非随机缺失，依赖未观测的值本身）' },
          { value: 'D', text: '不是缺失' },
        ],
        answer: 'C',
        explanation:
          '缺失与收入值本身相关（收入越高越不填），而收入正是未观测的那个值，所以是 MNAR。若缺失只与年龄、地区等已观测变量相关，则是 MAR。',
        tags: ['缺失机制'],
      },
      {
        id: 'mining-prep-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: '异常值一定是错误数据，应该删除。',
        answer: false,
        explanation:
          '异常值可能是录入错误，也可能是罕见但真实的极端情况（欺诈交易、大客户订单）。后者往往正是业务价值所在，删除会丢失关键信号。',
        tags: ['异常值'],
      },
      {
        id: 'mining-prep-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: '用均值/中位数填补缺失值会带来哪些问题？（多选）',
        options: [
          { value: 'A', text: '低估方差（把缺失值当成确定值）' },
          { value: 'B', text: '削弱该变量与其他变量的相关性' },
          { value: 'C', text: '在 MNAR 场景下引入偏差' },
          { value: 'D', text: '会让数据行数减少' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——填补不减少行数（删除才减少）。A/B/C 都是统计量填补的真实代价，这也是高缺失率时应改用模型填补的原因。',
        tags: ['填补代价'],
      },
      {
        id: 'mining-prep-c1-e4',
        type: 'fill',
        difficulty: 3,
        question: '用 IQR 方法检测异常值时，上下界分别是 Q1 - ___ × IQR 与 Q3 + 1.5 × IQR。',
        blanks: [['1.5', '一点五']],
        explanation:
          '1.5 是 Tukey 提出的经验系数。它对应正态分布下约 0.7% 的极端值，比 3σ 法则更稳健（不受极端值本身影响）。',
        tags: ['IQR'],
      },
      {
        id: 'mining-prep-c1-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现 IQR 异常值检测：iqr_bounds(series)，返回 (下界, 上界)。\n\n用 25% 与 75% 分位数，系数 1.5。',
        starterCode: `def iqr_bounds(series):
    q1 = ___
    q3 = ___
    iqr = ___
    return ___
`,
        setupCode: 'import pandas as pd\nseries = pd.Series([1,2,3,4,5,6,7,8,9,100])',
        expectedOutput: '下界与上界',
        tests: `import pandas as pd
lo, hi = iqr_bounds(pd.Series([1,2,3,4,5,6,7,8,9,10]))
assert lo < 1 and hi > 10, f"正常数据边界应在外侧，实际 [{lo}, {hi}]"
lo2, hi2 = iqr_bounds(pd.Series([1,2,3,4,5,6,7,8,9,100]))
assert hi2 < 100, f"100 应在上界之外，实际上界 {hi2}"
q1, q3 = pd.Series([1,2,3,4,5,6,7,8,9,10]).quantile([0.25, 0.75])
assert abs(lo - (q1 - 1.5*(q3-q1))) < 1e-9
assert abs(hi - (q3 + 1.5*(q3-q1))) < 1e-9
`,
        answer: `def iqr_bounds(series):
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1
    return q1 - 1.5 * iqr, q3 + 1.5 * iqr
`,
        explanation:
          '```python\nq1 = series.quantile(0.25)\nq3 = series.quantile(0.75)\niqr = q3 - q1\nreturn q1 - 1.5 * iqr, q3 + 1.5 * iqr\n```\n\nIQR 比 3σ 稳健：σ 本身会被极端值拉大，而四分位数只依赖排序位置，不受极端值影响。',
        tags: ['编程', 'IQR'],
      },
      {
        id: 'mining-prep-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现缺失值填补并返回方差变化：fill_and_compare(series)。\n\n1. 用中位数填补缺失\n2. 返回 (原始非缺失部分的标准差, 填补后的标准差)',
        starterCode: `import numpy as np

def fill_and_compare(series):
    filled = ___
    std_before = ___
    std_after = ___
    return round(std_before, 4), round(std_after, 4)
`,
        setupCode: 'import pandas as pd\nseries = pd.Series([1.0, 2.0, None, 4.0, 5.0])',
        expectedOutput: '填补后方差变小',
        tests: `import pandas as pd
s = pd.Series([1.0, 2.0, None, 4.0, 5.0])
before, after = fill_and_compare(s)
assert after < before, f"填补后标准差应变小，实际 {before} -> {after}"
assert abs(before - pd.Series([1.0,2.0,4.0,5.0]).std()) < 1e-3, "原始标准差计算错误"
# 无缺失时两者应相等
s2 = pd.Series([1.0, 2.0, 3.0])
b2, a2 = fill_and_compare(s2)
assert abs(b2 - a2) < 1e-3, "无缺失时两者应相等"
`,
        answer: `import numpy as np

def fill_and_compare(series):
    filled = series.fillna(series.median())
    std_before = series.std()
    std_after = filled.std()
    return round(std_before, 4), round(std_after, 4)
`,
        explanation:
          '```python\nfilled = series.fillna(series.median())\nstd_before = series.std()\nstd_after = filled.std()\n```\n\n结果会显示**填补后标准差变小**——这正是统计量填补"低估方差"的实证。\n\n填补把不确定性变成了确定值，所以分散度被压缩。',
        tags: ['编程', '填补代价'],
      },
      {
        id: 'mining-prep-c1-e7',
        type: 'judge',
        difficulty: 3,
        question: '在 MNAR 场景下，添加「该字段是否缺失」的二值指示器特征通常有助于模型。',
        answer: true,
        explanation:
          '缺失本身携带信息（如"越严重越不填"）。指示器把这个信号显式建模，往往比填补后的值更有预测力。这是 Kaggle 竞赛中的常用技巧。',
        tags: ['缺失指示器'],
      },
      {
        id: 'mining-prep-c1-e8',
        type: 'open',
        difficulty: 4,
        question:
          '你拿到一份客户流失预测数据，发现「月消费额」字段缺失 35%，且缺失客户的实际流失率明显更高。请说明：① 这属于哪种缺失机制；② 应该如何处理；③ 为什么简单的均值填补会导致问题。',
        referenceAnswer: `**一、缺失机制判断**

**这是 MNAR（非随机缺失）**。

判断依据：
- 缺失与**目标变量**（流失率）强相关 → 说明缺失不是随机的；
- 缺失很可能与"月消费额"**本身的值**相关（如消费额很低的客户不愿填，或账户异常导致无法统计），
  而这个值正是未观测的，符合 MNAR 定义。

补充：如果缺失只与"客户等级""注册年限"等已观测变量相关，才是 MAR。

**二、处理策略**

**① 首先识别信号，而不是急着填补**

- 加**缺失指示器** \`amount_is_missing\`（约 35% 为 1）；
- 检查缺失组与非缺失组的流失率差异（本例已显示明显差异）；
- 这个指示器本身就是强特征。

**② 分层建模**

- 把数据分为"有值组"与"缺失组"，观察两组的特征分布是否不同；
- 若不同，可考虑分组训练或加交互特征。

**③ 有依据的填补**

- **不要用全局均值**；
- 用模型填补：以其他变量（消费频次、交易笔数、客户等级）预测月消费额；
- 或按业务逻辑填补：如"无交易记录 → 消费额填 0"（这是有业务含义的填补，不是统计填补）。

**④ 使用对缺失鲁棒的模型**

- 树模型（LightGBM/XGBoost）原生支持缺失值，会学习缺失的最优分裂方向；
- 这往往比手动填补效果更好。

**⑤ 敏感性分析**

- 做"填补"与"不填补（用指示器）"两版模型对比；
- 在报告中说明缺失处理方式对结论的影响。

**三、为什么均值填补会出问题**

**① 破坏分布形状**

35% 的值被压到同一个点（均值），分布出现人为的尖峰，
方差被严重低估（前面代码已实证）。

**② 抹掉关键信号**

均值填补后，"缺失"这个信息**完全消失**了。
而在本例中，缺失恰恰是最强的流失信号之一——
填补等于把这个信号擦掉，模型性能会显著下降。

**③ 引入虚假相关性**

大量相同的填补值会人为制造与其他变量的"伪相关"，
让模型学到不存在的模式。

**④ MNAR 下均值本身有偏**

因为缺失与真实值相关（消费额低的客户更可能缺失），
观测到的均值**高估了**总体均值，用它填补会系统性偏高。

**正确做法总结**：

    加缺失指示器（保留信号）
      + 模型填补或业务逻辑填补（不用全局均值）
      + 树模型原生处理缺失（最优解）
      + 敏感性分析（说明结论稳健性）`,
        rubric: [
          { point: '正确判定为 MNAR 并说明依据（与目标变量相关）', score: 2 },
          { point: '提出加缺失指示器保留信号', score: 2 },
          { point: '提出模型填补/业务逻辑填补而非全局均值', score: 2 },
          { point: '解释均值填补的四点问题（分布/信号/伪相关/有偏）', score: 3 },
          { point: '提到树模型原生支持缺失 + 敏感性分析', score: 1 },
        ],
        keywords: ['MNAR', '缺失指示器', '模型填补', '方差低估', '伪相关', 'LightGBM'],
        explanation:
          '核心是理解「缺失本身是信号」。能指出均值填补把最强信号擦掉，就抓住了 MNAR 场景的关键。',
        tags: ['缺失值', '综合'],
      },
    ],
  },
];
