import type { Chapter } from '../../../types';

/* ============================================================
 *  第 6 章：综合项目实战
 * ============================================================ */

const ch6: Omit<Chapter, 'courseId' | 'order'> = {
  id: 'python-6',
  title: '综合项目实战：从原始日志到分析结论',
  goal: '把前五章知识串成一条完整的数据处理流水线：读入 → 清洗 → 校验 → 聚合 → 输出，并写出可复用、可测试的代码。',
  lessons: [
    {
      id: 'py-l-6-1',
      title: '项目拆解：一个订单分析脚本的完整结构',
      content: `
### 学习目标

学完本节，你应该能够：
1. 把「订单分析」需求拆成解析/清洗/聚合/报告四阶段并画出数据流；
2. 用「先解析成记录再聚合」的结构隔离脏数据（try/except 按行剔除并计数）；
3. 说出三条工程纪律：不上来写循环、口径先写清、坏数据有账本。

### 前置知识

- 全部前五章（容器/函数/文件/异常/标准库）；
- 无新语法。

### 问题背景

前五章的知识点是零件，项目章把它们装成一台机器：原始日志有脏行、缺字段、坏金额，任何一处都会让聚合结果悄悄失真。真实工作里被质疑的不是你的分析，而是你的数字从哪来——所以口径要先定义、质量要出报告、口径变更要过回归测试、交付要给出可复用的模块与配置。这一章把「脚本」升级成「别人敢用的管道」。

### 直觉理解

把脚本想成一家小型食品厂：进料检验（解析与校验，坏原料进隔离区并计数）、清洗（去重/补全）、加工（按区域/日期聚合）、出厂检验（质量报告随成品一同交付）。单元测试是夜班质检员：每天用固定样本跑一遍口径，指标变了立刻拉闸。配置外置是配方卡：改配方（阈值/口径）不动设备（代码）。

### 核心概念与原理详解

## 需求

> 运营需要一份"2024 年各城市、各品类的销售汇总"，包含：有效订单（剔除已取消）的销售额、订单数、客单价，以及整体数据质量报告（缺失、异常、重复的行数）。

## 不要一上来就写 for 循环

一个有经验的工程师会先把问题**拆成流水线的阶段**，每一阶段有明确的输入输出：

| 阶段 | 输入 | 输出 | 关注点 |
| --- | --- | --- | --- |
| 1. 读取 | 文件 / 数据库 | 原始行列表 | 编码、表头、分隔符 |
| 2. 解析 | 原始行 | 结构化记录 | 类型转换失败时要记录而非中断 |
| 3. 校验 | 结构化记录 | 有效记录 + 问题清单 | 金额为负、日期越界、缺失必填字段 |
| 4. 清洗 | 有效记录 | 规范记录 | 去空格、统一大小写、统一单位 |
| 5. 聚合 | 规范记录 | 汇总表 | 分组维度、指标定义 |
| 6. 输出 | 汇总表 | CSV / 报告 | 排序、格式化、对账 |

## 代码骨架

\`\`\`python
from collections import defaultdict

def parse_rows(raw_rows):
    """把原始 CSV 行解析为字典，失败的行进入 errors。"""
    ...

def validate(record):
    """返回 (是否有效, 原因)。"""
    ...

def clean(record):
    """规范化字段。"""
    ...

def aggregate(records):
    """按 (城市, 品类) 聚合指标。"""
    ...

def build_report(records, errors):
    """生成汇总 + 数据质量报告。"""
    ...

def run(raw_rows):
    records, errors = [], []
    for i, row in enumerate(raw_rows):
        rec = parse_row(row, i, errors)
        if rec is None:
            continue
        ok, reason = validate(rec)
        if not ok:
            errors.append({"line": i, "reason": reason})
            continue
        records.append(clean(rec))
    return build_report(records, errors)
\`\`\`

## 三条工程纪律

1. **每个函数只做一件事**：\`parse\` 不管校验，\`validate\` 不管聚合。这样每个函数都能单独测试。
2. **失败不中断**：非法行进入 \`errors\` 清单，最后统一输出，保证"能处理的行都处理了"。
3. **对账**：\`输入行数 = 有效行数 + 错误行数\`，这是流水线自检的最低要求。

## 为什么要"先解析成记录，再聚合"

- 直接在字符串上做聚合，一旦 CSV 多一列、逗号出现在引号中就会全错；
- 结构化记录让校验与清洗可以独立演进；
- 聚合时只依赖字段名，不依赖列的位置。

> 这套结构在 Python 原生、Pandas、SQL 中同样成立：**读入 → 清洗 → 计算 → 输出**。下一章学 Pandas 时，你会发现它就是把这套流程做成了几十个现成方法。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
# ---- 订单分析迷你流水线：解析 -> 清洗 -> 聚合 -> 报告 -> 回归测试 ----
RAW = [
    "2026-01-03,华东,A-1,199.00",
    "2026-01-03,华北,B-2,88.50",
    "2026-01-04,华东,C-3,",          # 金额缺失 -> 剔除并计数
    "2026-01-04,华东,D-4,45.00",
    "bad line",                       # 结构错误 -> 跳过
]

def parse(line):
    parts = [p.strip() for p in line.split(",")]
    if len(parts) != 4:
        raise ValueError(f"结构错误: {line!r}")
    date, region, oid, amount = parts
    if not amount:
        raise ValueError(f"金额缺失: {oid}")
    return {"date": date, "region": region, "oid": oid, "amount": float(amount)}

def load(lines):
    recs, bad = [], []
    for ln in lines:
        try:
            recs.append(parse(ln))
        except ValueError as e:
            bad.append(str(e))
    return recs, bad

def aggregate(recs):
    by = {}
    for r in recs:
        s = by.setdefault(r["region"], {"n": 0, "gmv": 0.0})
        s["n"] += 1
        s["gmv"] += r["amount"]
    return by

def report(by, total, bad):
    print(f"总输入 {total} 行, 有效 {total - len(bad)}, 剔除 {len(bad)}")
    for reg, s in sorted(by.items()):
        print(f"  {reg}: 订单 {s['n']} GMV {s['gmv']:.2f} 客单 {s['gmv'] / s['n']:.2f}")

recs, bad = load(RAW)
report(aggregate(recs), len(RAW), bad)
print("剔除明细:", bad)

# ---- pytest 风格回归测试（口径不变性）----
def test_pipeline():
    r, b = load(["x,A,1,10.0", "junk", "y,B,2,"])
    assert b == ["结构错误: 'junk'", "金额缺失: 2"]
    assert aggregate(r) == {"A": {"n": 1, "gmv": 10.0}}
test_pipeline()
print("回归测试通过：口径未漂移")\`\`\`

预期输出（实测）：总输入 5 行, 有效 3, 剔除 2；华东: 订单 2 GMV 244.00 客单 122.00；华北: 订单 1 GMV 88.50 客单 88.50；剔除明细: ['金额缺失: C-3', "结构错误: 'bad line'"]（脏数据有账可查）；回归测试通过：口径未漂移

**常见错误**：解析与聚合写在一起（一发现脏数据就得全链重跑），先解析成记录再聚合才能分阶段测试；float(amount) 不做校验直接转，脏值变成 inf/NaN 混进下游；测试断言写「等于上次运行的输出」而不是「等于明确口径」，快照式测试把 bug 也固化了。

### 常见误区

1. **先写 for 循环再说**——需求拆解（输入/输出/口径/异常清单）先于代码，否则每次补需求都在重写；\\n2. **数据分析不用写测试**——口径回归测试恰恰是分析可信度的核心资产，改口径必跑；\\n3. **可复用=复制粘贴到新项目**——可复用的是「模块+配置+文档」，复制出去的脚本下次口径变了就是两套真相。

### 知识关联

- **向前**：l4 的文件与异常是 load/validate 阶段的底座，l5 的推导式与 Counter 是聚合的主力；
- **向后**：pandas 课把本项目的手写聚合升级为 DataFrame 表达式；
- **平行**：sql 课的 GROUP BY 质量检查与本节的质量报告同一思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 拆解 | 需求→阶段（解析/清洗/聚合/报告）→口径→异常清单，先于代码 |
| 质量 | 剔除行计数并随报告交付，脏数据有账可查 |
| 测试 | 口径回归测试：固定样本+明确期望，改口径必跑 |
| 复用 | 模块划分 + 配置外置（口径唯一真相源）+ docstring |
| 交付 | 交付「工厂+手册」，不是一次性模具 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pytest 官方文档 docs.pytest.org 与《The Twelve-Factor App》配置原则相应章节）
`,
      tips: [
        {
          kind: 'leak',
          text: '先把流水线阶段和函数签名写出来，再逐段实现，比"从头往下写"更容易发现遗漏的需求（例如"客单价 = 销售额 / 订单数"的分母要不要去重）。',
        },
        {
          kind: 'pitfall',
          text: '`input_rows == valid_rows + error_rows` 不成立时，往往是某段代码 `continue` 之前没有记录错误。对账断言能第一时间发现它。',
        },
        {
          kind: 'interview',
          text: '"给你一份脏数据你会怎么做"是数据分析面试高频题。答题框架：先做数据画像（行列数、类型、缺失率、重复率）→ 定义问题 → 分步清洗并记录 → 对账 → 输出质量报告。',
        },
      ],
      demos: [
        {
          title: '最小可用流水线',
          lang: 'python',
          code: `rows = [
    {"order_id": "A1", "city": " 北京 ", "category": "数码", "amount": "320.5", "status": "已完成"},
    {"order_id": "A2", "city": "上海", "category": "服装", "amount": "abc", "status": "已完成"},
    {"order_id": "A3", "city": "北京", "category": "数码", "amount": "88", "status": "已取消"},
    {"order_id": "A4", "city": "上海", "category": "服装", "amount": "200", "status": "已完成"},
    {"order_id": "A5", "city": "广州", "category": "", "amount": "50", "status": "已完成"},
]

def parse_amount(s):
    try:
        return float(s)
    except (TypeError, ValueError):
        return None

valid, errors = [], []
for r in rows:
    amt = parse_amount(r["amount"])
    if amt is None:
        errors.append((r["order_id"], "金额不是数字"))
        continue
    if amt < 0:
        errors.append((r["order_id"], "金额为负"))
        continue
    if not r["category"]:
        errors.append((r["order_id"], "品类缺失"))
        continue
    if r["status"] != "已完成":
        continue          # 属于正常过滤，不算错误
    valid.append({**r, "city": r["city"].strip(), "amount": amt})

print("有效记录:", len(valid))
print("问题记录:", errors)
print("对账:", len(rows), "=", len(valid), "+", len(errors), "+", 1, "(状态过滤)")

total = sum(v["amount"] for v in valid)
print(f"有效销售额: {total:.2f}")`,
        },
      ],
    },
    {
      id: 'py-l-6-2',
      title: '指标聚合与质量报告',
      content: `
### 学习目标

学完本节，你应该能够：
1. 实现多维聚合（按区域/日期）并计算 GMV、订单数、客单价三个口径明确的指标；
2. 生成数据质量报告（总行/有效/剔除明细）并解释为什么要随结果一起交付；
3. 把聚合结果安全落盘（CSV/JSON）并保持与屏幕报告口径一致。

### 前置知识

- 「项目拆解」（l6-1）的阶段划分与记录结构。

### 问题背景

前五章的知识点是零件，项目章把它们装成一台机器：原始日志有脏行、缺字段、坏金额，任何一处都会让聚合结果悄悄失真。真实工作里被质疑的不是你的分析，而是你的数字从哪来——所以口径要先定义、质量要出报告、口径变更要过回归测试、交付要给出可复用的模块与配置。这一章把「脚本」升级成「别人敢用的管道」。

### 直觉理解

把脚本想成一家小型食品厂：进料检验（解析与校验，坏原料进隔离区并计数）、清洗（去重/补全）、加工（按区域/日期聚合）、出厂检验（质量报告随成品一同交付）。单元测试是夜班质检员：每天用固定样本跑一遍口径，指标变了立刻拉闸。配置外置是配方卡：改配方（阈值/口径）不动设备（代码）。

### 核心概念与原理详解

## 多维度聚合

运营经常需要"按 A 维度和 B 维度"看指标。用嵌套字典或元组键即可：

\`\`\`python
from collections import defaultdict

agg = defaultdict(lambda: {"amount": 0.0, "orders": set(), "items": 0})
for r in records:
    key = (r["city"], r["category"])
    a = agg[key]
    a["amount"] += r["amount"]
    a["orders"].add(r["order_id"])
    a["items"] += 1
\`\`\`

注意：**订单数要用 \`set\` 去重**。一条订单可能包含多个商品，直接数明细行会把订单数算高——这就是"口径错误"的典型来源。

## 指标定义要先写清楚

| 指标 | 定义 | 雷区 |
| --- | --- | --- |
| 销售额 | 有效订单明细的实付金额之和 | 是否含运费、退款？是否剔除取消单？ |
| 订单数 | 去重后的订单号个数 | 用明细行数代替会偏高 |
| 客单价 | 销售额 / 订单数 | 分母用"订单数"还是"用户数"？ |
| 退款率 | 退款订单数 / 有效订单数 | 时间归到"下单日"还是"退款日"？ |

> **同一份数据，口径不同结论可能完全相反。** 所以分析报告必须写明每个指标的定义。

## 数据质量报告

一份合格的质量报告至少包含：

\`\`\`python
report = {
    "总行数": len(rows),
    "有效行数": len(valid),
    "问题行数": len(errors),
    "问题分布": Counter(e["reason"] for e in errors),
    "字段缺失率": {"category": 0.2, ...},
    "重复记录数": n_dup,
}
\`\`\`

再配合几个**合理性断言**：

\`\`\`python
assert total_amount >= 0, "销售额不应为负"
assert 0 <= missing_rate <= 1
assert abs(sum_valid + sum_invalid - total_rows) == 0
\`\`\`

## 将结果落盘

\`\`\`python
import csv
with open("report.csv", "w", newline="", encoding="utf-8-sig") as f:
    w = csv.writer(f)
    w.writerow(["city", "category", "amount", "orders", "avg_order_value"])
    for (city, cat), a in sorted(agg.items(), key=lambda kv: -kv[1]["amount"]):
        w.writerow([city, cat, round(a["amount"], 2), len(a["orders"]),
                    round(a["amount"] / max(len(a["orders"]), 1), 2)])
\`\`\`

\`max(..., 1)\` 用于避免除零，这是数据处理中的基本防御。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
# ---- 订单分析迷你流水线：解析 -> 清洗 -> 聚合 -> 报告 -> 回归测试 ----
RAW = [
    "2026-01-03,华东,A-1,199.00",
    "2026-01-03,华北,B-2,88.50",
    "2026-01-04,华东,C-3,",          # 金额缺失 -> 剔除并计数
    "2026-01-04,华东,D-4,45.00",
    "bad line",                       # 结构错误 -> 跳过
]

def parse(line):
    parts = [p.strip() for p in line.split(",")]
    if len(parts) != 4:
        raise ValueError(f"结构错误: {line!r}")
    date, region, oid, amount = parts
    if not amount:
        raise ValueError(f"金额缺失: {oid}")
    return {"date": date, "region": region, "oid": oid, "amount": float(amount)}

def load(lines):
    recs, bad = [], []
    for ln in lines:
        try:
            recs.append(parse(ln))
        except ValueError as e:
            bad.append(str(e))
    return recs, bad

def aggregate(recs):
    by = {}
    for r in recs:
        s = by.setdefault(r["region"], {"n": 0, "gmv": 0.0})
        s["n"] += 1
        s["gmv"] += r["amount"]
    return by

def report(by, total, bad):
    print(f"总输入 {total} 行, 有效 {total - len(bad)}, 剔除 {len(bad)}")
    for reg, s in sorted(by.items()):
        print(f"  {reg}: 订单 {s['n']} GMV {s['gmv']:.2f} 客单 {s['gmv'] / s['n']:.2f}")

recs, bad = load(RAW)
report(aggregate(recs), len(RAW), bad)
print("剔除明细:", bad)

# ---- pytest 风格回归测试（口径不变性）----
def test_pipeline():
    r, b = load(["x,A,1,10.0", "junk", "y,B,2,"])
    assert b == ["结构错误: 'junk'", "金额缺失: 2"]
    assert aggregate(r) == {"A": {"n": 1, "gmv": 10.0}}
test_pipeline()
print("回归测试通过：口径未漂移")\`\`\`

预期输出（实测）：总输入 5 行, 有效 3, 剔除 2；华东: 订单 2 GMV 244.00 客单 122.00；华北: 订单 1 GMV 88.50 客单 88.50；剔除明细: ['金额缺失: C-3', "结构错误: 'bad line'"]（脏数据有账可查）；回归测试通过：口径未漂移

**常见错误**：解析与聚合写在一起（一发现脏数据就得全链重跑），先解析成记录再聚合才能分阶段测试；float(amount) 不做校验直接转，脏值变成 inf/NaN 混进下游；测试断言写「等于上次运行的输出」而不是「等于明确口径」，快照式测试把 bug 也固化了。

### 常见误区

1. **先写 for 循环再说**——需求拆解（输入/输出/口径/异常清单）先于代码，否则每次补需求都在重写；\\n2. **数据分析不用写测试**——口径回归测试恰恰是分析可信度的核心资产，改口径必跑；\\n3. **可复用=复制粘贴到新项目**——可复用的是「模块+配置+文档」，复制出去的脚本下次口径变了就是两套真相。

### 知识关联

- **向前**：l4 的文件与异常是 load/validate 阶段的底座，l5 的推导式与 Counter 是聚合的主力；
- **向后**：pandas 课把本项目的手写聚合升级为 DataFrame 表达式；
- **平行**：sql 课的 GROUP BY 质量检查与本节的质量报告同一思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 拆解 | 需求→阶段（解析/清洗/聚合/报告）→口径→异常清单，先于代码 |
| 质量 | 剔除行计数并随报告交付，脏数据有账可查 |
| 测试 | 口径回归测试：固定样本+明确期望，改口径必跑 |
| 复用 | 模块划分 + 配置外置（口径唯一真相源）+ docstring |
| 交付 | 交付「工厂+手册」，不是一次性模具 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pytest 官方文档 docs.pytest.org 与《The Twelve-Factor App》配置原则相应章节）
`,
      tips: [
        {
          kind: 'pitfall',
          text: '用明细行数当订单数是最常见的口径错误。凡是"数订单"，都应对订单号去重。',
        },
        {
          kind: 'leak',
          text: '质量报告中的每个数字都应能追溯到具体行，建议同时输出"问题明细表（行号 + 原因 + 原始值）"，便于和业务方沟通。',
        },
        {
          kind: 'performance',
          text: '聚合阶段用 `defaultdict` 一次遍历完成；避免"先过滤一遍、再分组一遍、再求和一遍"的多趟遍历。',
        },
      ],
      demos: [
        {
          title: '多维度聚合 + 客单价',
          lang: 'python',
          code: `from collections import defaultdict, Counter

records = [
    {"order_id": "A1", "city": "北京", "category": "数码", "amount": 320.0},
    {"order_id": "A1", "city": "北京", "category": "数码", "amount": 129.0},  # 同一订单的第二件
    {"order_id": "A2", "city": "北京", "category": "服装", "amount": 99.0},
    {"order_id": "A3", "city": "上海", "category": "数码", "amount": 499.0},
]

agg = defaultdict(lambda: {"amount": 0.0, "orders": set()})
for r in records:
    a = agg[(r["city"], r["category"])]
    a["amount"] += r["amount"]
    a["orders"].add(r["order_id"])

print(f"{'城市':<6}{'品类':<6}{'销售额':>10}{'订单数':>8}{'客单价':>10}")
for (city, cat), a in sorted(agg.items(), key=lambda kv: -kv[1]["amount"]):
    n = len(a["orders"])
    print(f"{city:<6}{cat:<6}{a['amount']:>10.2f}{n:>8}{a['amount']/n:>10.2f}")

print("\\n注意：北京-数码 有 2 条明细，但订单数仍是 1 → 必须去重")`,
        },
        {
          title: '质量报告 + 断言对账',
          lang: 'python',
          code: `from collections import Counter

total_rows = [
    {"amount": "100", "cat": "数码"},
    {"amount": "abc", "cat": "服装"},
    {"amount": "-5", "cat": "数码"},
    {"amount": "200", "cat": ""},
    {"amount": "50", "cat": "服装"},
]

valid, errors = [], []
for i, r in enumerate(total_rows):
    try:
        amt = float(r["amount"])
    except ValueError:
        errors.append((i, "金额非法"))
        continue
    if amt < 0:
        errors.append((i, "金额为负"))
        continue
    if not r["cat"]:
        errors.append((i, "品类缺失"))
        continue
    valid.append({**r, "amount": amt})

print("有效:", valid)
print("问题分布:", Counter(reason for _, reason in errors))
print("对账:", len(total_rows), "=", len(valid), "+", len(errors))
assert len(valid) + len(errors) == len(total_rows), "对账失败"`,
        },
      ],
    },
    {
      id: 'py-l-6-3',
      title: '代码质量：测试、文档与复用',
      content: `
### 学习目标

学完本节，你应该能够：
1. 用普通 assert 写最小测试并升级为 pytest 的 test_* 函数；
2. 给函数写「为什么型」docstring 并列出交付前自检清单；
3. 区分复用的三个层次（函数/模块/模板）并为订单脚本选择合适层次。

### 前置知识

- l6-1/l6-2 的流水线代码作为被测对象。

### 问题背景

前五章的知识点是零件，项目章把它们装成一台机器：原始日志有脏行、缺字段、坏金额，任何一处都会让聚合结果悄悄失真。真实工作里被质疑的不是你的分析，而是你的数字从哪来——所以口径要先定义、质量要出报告、口径变更要过回归测试、交付要给出可复用的模块与配置。这一章把「脚本」升级成「别人敢用的管道」。

### 直觉理解

把脚本想成一家小型食品厂：进料检验（解析与校验，坏原料进隔离区并计数）、清洗（去重/补全）、加工（按区域/日期聚合）、出厂检验（质量报告随成品一同交付）。单元测试是夜班质检员：每天用固定样本跑一遍口径，指标变了立刻拉闸。配置外置是配方卡：改配方（阈值/口径）不动设备（代码）。

### 核心概念与原理详解

## 为什么要写测试

数据分析代码的"正确性"最终体现在**结果对不对**。没有测试时，改动一处逻辑很容易让另一个指标悄悄算错，而你直到业务方质疑才发现。

## 最小可用的测试写法

\`\`\`python
def calc_aov(amount, orders):
    """客单价：分子为销售额，分母为订单数。"""
    if orders <= 0:
        return None
    return amount / orders

# 用 assert 写测试
assert calc_aov(1000, 20) == 50.0
assert calc_aov(0, 10) == 0.0
assert calc_aov(1000, 0) is None      # 边界：分母为 0
print("测试通过")
\`\`\`

项目里用 pytest 组织：

\`\`\`python
# tests/test_metrics.py
import pytest
from src.metrics import calc_aov

def test_normal():
    assert calc_aov(1000, 20) == 50.0

@pytest.mark.parametrize("amount,orders,expected", [
    (0, 10, 0.0),
    (1000, 0, None),
    (100, 3, 100 / 3),
])
def test_cases(amount, orders, expected):
    assert calc_aov(amount, orders) == expected
\`\`\`

**优先覆盖的用例类型**：

| 类型 | 例子 |
| --- | --- |
| 正常路径 | 2 个订单、金额正常 |
| 边界值 | 0、空列表、只有 1 行 |
| 异常输入 | 负数、None、非数字字符串 |
| 口径细节 | 同订单多明细、同一用户多次下单 |

## 文档：docstring 要写"为什么"

\`\`\`python
def calc_aov(amount: float, orders: int) -> float | None:
    """计算客单价。

    参数：
        amount: 有效订单的实付金额合计（已剔除取消单）。
        orders: 去重后的订单数（不是明细行数）。

    返回：
        客单价；订单数为 0 时返回 None。

    注意：
        与"人均消费"不同，这里分母是订单数而非用户数。
    """
\`\`\`

## 复用的三个层次

1. **函数复用**：把"读 → 清洗"封装成 \`load_orders(path)\`；
2. **模块复用**：\`src/io.py\`、\`src/metrics.py\`、\`src/report.py\` 职责分明；
3. **配置化**：把口径参数（统计区间、是否含运费、是否剔除退款）写到配置里，而不是散落在代码中。

## 交付前自检清单

- [ ] 对账通过：输入行数 = 有效 + 无效
- [ ] 关键指标与上一期对比，波动有合理解释
- [ ] 边界情况已处理（空数据、除零、缺失值）
- [ ] 随机过程已固定种子
- [ ] 输出文件编码、列名、排序符合约定
- [ ] 关键逻辑有测试覆盖

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
# ---- 订单分析迷你流水线：解析 -> 清洗 -> 聚合 -> 报告 -> 回归测试 ----
RAW = [
    "2026-01-03,华东,A-1,199.00",
    "2026-01-03,华北,B-2,88.50",
    "2026-01-04,华东,C-3,",          # 金额缺失 -> 剔除并计数
    "2026-01-04,华东,D-4,45.00",
    "bad line",                       # 结构错误 -> 跳过
]

def parse(line):
    parts = [p.strip() for p in line.split(",")]
    if len(parts) != 4:
        raise ValueError(f"结构错误: {line!r}")
    date, region, oid, amount = parts
    if not amount:
        raise ValueError(f"金额缺失: {oid}")
    return {"date": date, "region": region, "oid": oid, "amount": float(amount)}

def load(lines):
    recs, bad = [], []
    for ln in lines:
        try:
            recs.append(parse(ln))
        except ValueError as e:
            bad.append(str(e))
    return recs, bad

def aggregate(recs):
    by = {}
    for r in recs:
        s = by.setdefault(r["region"], {"n": 0, "gmv": 0.0})
        s["n"] += 1
        s["gmv"] += r["amount"]
    return by

def report(by, total, bad):
    print(f"总输入 {total} 行, 有效 {total - len(bad)}, 剔除 {len(bad)}")
    for reg, s in sorted(by.items()):
        print(f"  {reg}: 订单 {s['n']} GMV {s['gmv']:.2f} 客单 {s['gmv'] / s['n']:.2f}")

recs, bad = load(RAW)
report(aggregate(recs), len(RAW), bad)
print("剔除明细:", bad)

# ---- pytest 风格回归测试（口径不变性）----
def test_pipeline():
    r, b = load(["x,A,1,10.0", "junk", "y,B,2,"])
    assert b == ["结构错误: 'junk'", "金额缺失: 2"]
    assert aggregate(r) == {"A": {"n": 1, "gmv": 10.0}}
test_pipeline()
print("回归测试通过：口径未漂移")\`\`\`

预期输出（实测）：总输入 5 行, 有效 3, 剔除 2；华东: 订单 2 GMV 244.00 客单 122.00；华北: 订单 1 GMV 88.50 客单 88.50；剔除明细: ['金额缺失: C-3', "结构错误: 'bad line'"]（脏数据有账可查）；回归测试通过：口径未漂移

**常见错误**：解析与聚合写在一起（一发现脏数据就得全链重跑），先解析成记录再聚合才能分阶段测试；float(amount) 不做校验直接转，脏值变成 inf/NaN 混进下游；测试断言写「等于上次运行的输出」而不是「等于明确口径」，快照式测试把 bug 也固化了。

### 常见误区

1. **先写 for 循环再说**——需求拆解（输入/输出/口径/异常清单）先于代码，否则每次补需求都在重写；\\n2. **数据分析不用写测试**——口径回归测试恰恰是分析可信度的核心资产，改口径必跑；\\n3. **可复用=复制粘贴到新项目**——可复用的是「模块+配置+文档」，复制出去的脚本下次口径变了就是两套真相。

### 知识关联

- **向前**：l4 的文件与异常是 load/validate 阶段的底座，l5 的推导式与 Counter 是聚合的主力；
- **向后**：pandas 课把本项目的手写聚合升级为 DataFrame 表达式；
- **平行**：sql 课的 GROUP BY 质量检查与本节的质量报告同一思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 拆解 | 需求→阶段（解析/清洗/聚合/报告）→口径→异常清单，先于代码 |
| 质量 | 剔除行计数并随报告交付，脏数据有账可查 |
| 测试 | 口径回归测试：固定样本+明确期望，改口径必跑 |
| 复用 | 模块划分 + 配置外置（口径唯一真相源）+ docstring |
| 交付 | 交付「工厂+手册」，不是一次性模具 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 pytest 官方文档 docs.pytest.org 与《The Twelve-Factor App》配置原则相应章节）
`,
      tips: [
        {
          kind: 'leak',
          text: '把"口径"（时间区间、是否剔除取消、分母定义）写成配置或常量并附注释，是避免"同事照抄代码用错口径"的最有效手段。',
        },
        {
          kind: 'interview',
          text: '面试官常问"你怎么保证分析结果正确"。答：对账/守恒校验 + 边界测试 + 与已知结果交叉验证（如用另一种方法算一遍）+ 与业务方确认口径。',
        },
        {
          kind: 'note',
          text: '测试数据要小而"刁钻"：包含重复订单号、负数、空值、大小写不一致的城市名，这样一份数据就能覆盖大部分坑。',
        },
      ],
      demos: [
        {
          title: '带测试的指标函数',
          lang: 'python',
          code: `def calc_aov(amount, orders):
    if orders <= 0:
        return None
    return amount / orders

def refund_rate(refunded, total):
    if total == 0:
        return 0.0
    return refunded / total

cases = [
    ((1000, 20), 50.0),
    ((0, 10), 0.0),
    ((1000, 0), None),
]
for (args, expected) in cases:
    got = calc_aov(*args)
    status = "✓" if got == expected else "✗"
    print(f"{status} calc_aov{args} = {got}（期望 {expected}）")

print()
print("退款率:", f"{refund_rate(3, 100):.1%}", f"{refund_rate(0, 0):.1%}")`,
        },
        {
          title: '配置化口径',
          lang: 'python',
          code: `CONFIG = {
    "exclude_cancelled": True,
    "date_field": "order_date",
    "aov_denominator": "orders",   # orders | users
}

orders = [
    {"id": "A1", "status": "已完成", "amount": 300},
    {"id": "A2", "status": "已取消", "amount": 999},
    {"id": "A3", "status": "已完成", "amount": 200},
]

valid = [o for o in orders if not CONFIG["exclude_cancelled"] or o["status"] == "已完成"]
amount = sum(o["amount"] for o in valid)
n_orders = len({o["id"] for o in valid})
aov = amount / n_orders if CONFIG["aov_denominator"] == "orders" else None

print("有效订单:", valid)
print("销售额:", amount, " 订单数:", n_orders, " 客单价:", aov)`,
        },
      ],
    },
  ],
  exercises: [
    {
      id: 'py-6-e1',
      type: 'single',
      difficulty: 1,
      question: '一条订单可能包含多个商品明细。要统计"订单数"，下列做法正确的是？',
      options: [
        { value: 'A', text: '数明细行数' },
        { value: 'B', text: '对订单号去重后计数' },
        { value: 'C', text: '数商品种类数' },
        { value: 'D', text: '数客户数' },
      ],
      answer: 'B',
      explanation:
        '订单数必须对订单号去重（`len(set(order_ids))`）。用明细行数会把"一单多件"重复计数，是最常见的口径错误之一。',
      tags: ['口径'],
    },
    {
      id: 'py-6-e2',
      type: 'judge',
      difficulty: 2,
      question: '在数据清洗流水线中，遇到非法数据行时应立即抛出异常终止整个任务，这样能保证结果绝对正确。',
      answer: false,
      explanation:
        '全量中断会让已成功处理的部分白跑，并且无法得知问题的整体分布。更好的做法是把问题行记录到错误清单并继续处理，最后输出质量报告与失败率，必要时再按阈值整体失败。',
      tags: ['数据质量'],
    },
    {
      id: 'py-6-e3',
      type: 'code',
      difficulty: 3,
      question:
        '数据质量检查：给定 `raw = [{"id", "amount", "city"}]`，请统计：\n\n1. `valid_records`：金额可转为 float 且 ≥ 0、且城市非空（去掉首尾空格后）的记录（每项保留原 dict，并**把城市名用 strip 规范化**）；\n2. `error_counts`：问题原因 → 数量 的字典，原因取值为 `"金额非法"`、`"金额为负"`、`"城市缺失"`（多个问题同时存在时按上述顺序只记第一个）。',
      starterCode: `from collections import Counter

raw = [
    {"id": 1, "amount": "100", "city": " 北京 "},
    {"id": 2, "amount": "abc", "city": "上海"},
    {"id": 3, "amount": "-5", "city": "北京"},
    {"id": 4, "amount": "200", "city": "  "},
    {"id": 5, "amount": "50.5", "city": "广州"},
]

valid_records = ___
error_counts = ___
`,
      setupCode: '',
      expectedOutput:
        "valid_records 数量 2；error_counts = {'金额非法': 1, '金额为负': 1, '城市缺失': 1}",
      tests: `assert len(valid_records) == 2, f"有效记录应为 2 条，实际 {len(valid_records)}"
assert {r["id"] for r in valid_records} == {1, 5}, f"有效记录 id 不正确：{valid_records}"
assert valid_records[0]["city"] == "北京", "城市应已去掉首尾空格"
assert error_counts == {"金额非法": 1, "金额为负": 1, "城市缺失": 1}, f"错误统计不正确：{error_counts}"
`,
      explanation:
        '```python\nvalid_records, errors = [], []\nfor r in raw:\n    try:\n        amt = float(r["amount"])\n    except (TypeError, ValueError):\n        errors.append("金额非法")\n        continue\n    if amt < 0:\n        errors.append("金额为负")\n        continue\n    if not r["city"].strip():\n        errors.append("城市缺失")\n        continue\n    valid_records.append({**r, "city": r["city"].strip()})\nerror_counts = dict(Counter(errors))\n```\n\n注意用 `{**r, "city": ...}` 返回新字典，避免修改原始数据。',
      tags: ['数据清洗', 'Counter'],
    },
    {
      id: 'py-6-e4',
      type: 'code',
      difficulty: 4,
      question:
        '完整流水线：`orders` 每条包含 `order_id`、`city`、`category`、`amount`、`status`。请：\n\n1. 只保留 `status == "已完成"`；\n2. 按 `(city, category)` 聚合出 `amount` 合计与**去重订单数**，存入 `summary`：键为 `(city, category)`，值为 `{"amount": float, "orders": int}`；\n3. 计算整体客单价（总金额 / 去重订单总数）保存到 `overall_aov`。',
      starterCode: `from collections import defaultdict

orders = [
    {"order_id": "A1", "city": "北京", "category": "数码", "amount": 320.0, "status": "已完成"},
    {"order_id": "A1", "city": "北京", "category": "数码", "amount": 129.0, "status": "已完成"},
    {"order_id": "A2", "city": "北京", "category": "服装", "amount": 99.0, "status": "已完成"},
    {"order_id": "A3", "city": "上海", "category": "数码", "amount": 999.0, "status": "已取消"},
    {"order_id": "A4", "city": "上海", "category": "数码", "amount": 499.0, "status": "已完成"},
]

summary = ___
overall_aov = ___
`,
      setupCode: '',
      expectedOutput:
        "summary[('北京','数码')] = {'amount': 449.0, 'orders': 1}；overall_aov ≈ 462.33",
      tests: `assert summary[("北京", "数码")]["amount"] == 449.0
assert summary[("北京", "数码")]["orders"] == 1, f"A1 是一单两件，订单数应为 1，实际 {summary[('北京','数码')]['orders']}"
assert summary[("北京", "服装")] == {"amount": 99.0, "orders": 1}
assert summary[("上海", "数码")]["amount"] == 499.0
assert abs(overall_aov - (449.0 + 99.0 + 499.0) / 3) < 1e-6, f"overall_aov 不正确：{overall_aov}"
`,
      explanation:
        '```python\nagg = defaultdict(lambda: {"amount": 0.0, "orders": set()})\nfor o in orders:\n    if o["status"] != "已完成":\n        continue\n    a = agg[(o["city"], o["category"])]\n    a["amount"] += o["amount"]\n    a["orders"].add(o["order_id"])\nsummary = {k: {"amount": v["amount"], "orders": len(v["orders"])} for k, v in agg.items()}\noverall_orders = len({o["order_id"] for o in orders if o["status"] == "已完成"})\noverall_aov = sum(v["amount"] for v in summary.values()) / overall_orders\n```\n\n总客单价要用**全局去重订单数**，不能把各组的订单数直接相加（同一订单可能跨品类，会被重复计数）。',
      tags: ['聚合', '口径'],
    },
    {
      id: 'py-6-e5',
      type: 'multiple',
      difficulty: 3,
      question: '交付一份数据分析结果前，下列哪些是必要的自检项？（多选）',
      options: [
        { value: 'A', text: '对账：输入行数 = 有效行数 + 异常行数' },
        { value: 'B', text: '检查指标与上期对比，波动能解释' },
        { value: 'C', text: '在报告里写清楚每个指标的定义与口径' },
        { value: 'D', text: '随机过程固定种子，结果可复现' },
        { value: 'E', text: '只要数字看起来合理就可以直接交付' },
      ],
      answer: ['A', 'B', 'C', 'D'],
      explanation:
        'A~D 都是交付质量的基本要求。"看起来合理"不是标准——很多错误的结果看起来同样合理，必须靠对账与交叉验证暴露问题。',
      tags: ['工程实践'],
    },
    {
      id: 'py-6-e6',
      type: 'fill',
      difficulty: 3,
      question: '计算客单价时，为避免除零错误，补全代码：\n\n```python\naov = total_amount / ___(len(order_ids), 1)\n```',
      blanks: [['max']],
      explanation: '`max(n, 1)` 保证分母至少为 1，避免 `ZeroDivisionError`。这是"防御式编程"的常用写法。',
      tags: ['防御式编程'],
    },
    {
      id: 'py-6-e7',
      type: 'judge',
      difficulty: 2,
      question: '同一个数据集，如果"客单价"的分母分别用"订单数"和"用户数"，两边的结果是完全一致的。',
      answer: false,
      explanation:
        '一个用户可能下多单，分母不同则结果不同（前者是"每单平均消费"，后者是"每用户平均消费"）。口径不同，结论可能完全相反，所以必须写明定义。',
      tags: ['口径'],
    },
    {
      id: 'py-6-e8',
      type: 'code',
      difficulty: 4,
      question:
        '还原"最大单笔订单"：`orders` 中包含 `order_id`、`city`、`amount`。请找出**金额最大的订单**，返回 `{"order_id": ..., "city": ..., "amount": ...}` 保存到 `top_order`；并统计每个城市的订单数保存到 `n_by_city`（dict）。',
      starterCode: `from collections import Counter

orders = [
    {"order_id": "A1", "city": "北京", "amount": 320.0},
    {"order_id": "A2", "city": "上海", "amount": 499.0},
    {"order_id": "A3", "city": "北京", "amount": 120.0},
    {"order_id": "A4", "city": "广州", "amount": 800.0},
    {"order_id": "A5", "city": "上海", "amount": 50.0},
]

top_order = ___
n_by_city = ___
`,
      setupCode: '',
      expectedOutput: "top_order = {'order_id': 'A4', 'city': '广州', 'amount': 800.0}",
      tests: `assert top_order["order_id"] == "A4", f"最大订单应为 A4，实际 {top_order}"
assert top_order["amount"] == 800.0
assert n_by_city == {"北京": 2, "上海": 2, "广州": 1}, f"城市订单数不正确：{n_by_city}"
`,
      explanation:
        '```python\ntop_order = max(orders, key=lambda o: o["amount"])\nn_by_city = dict(Counter(o["city"] for o in orders))\n```\n\n`max(key=...)` 返回原始元素而不是键，是最简洁的"取极值记录"写法。',
      tags: ['聚合'],
    },
    {
      id: 'py-6-e9',
      type: 'single',
      difficulty: 3,
      question: '下面哪个是最好的数据处理函数划分方式？',
      options: [
        {
          value: 'A',
          text: '一个 `process()` 函数完成读取、清洗、聚合、写文件',
        },
        {
          value: 'B',
          text: '拆成 `load()`、`clean()`、`aggregate()`，每个函数只负责一个阶段并返回明确的数据结构',
        },
        {
          value: 'C',
          text: '把所有逻辑写在一个 notebook cell 里',
        },
        {
          value: 'D',
          text: '每个列一函数，按列名拆分',
        },
      ],
      answer: 'B',
      explanation:
        '按流水线阶段拆分，每个函数职责单一、输入输出明确，可单独测试与复用。B 是工程实践中的标准做法；A 难以定位问题；C 不可复现；D 按列拆分容易产生大量重复代码。',
      tags: ['工程实践'],
    },
    {
      id: 'py-6-e10',
      type: 'open',
      difficulty: 4,
      question:
        '运营来找你核对：报表上"北京 1 月销售额 = 12.3 万"，但业务方反馈"我们明明卖了 15 万"。请写出你的排查思路（至少 6 个检查方向）。',
      referenceAnswer: `**排查思路（按"数据 → 口径 → 逻辑 → 上游"递进）**：

1. **口径确认**：报表是否剔除了取消/退款订单？是否只统计"已完成"？金额是实付还是标价？含不含运费？
2. **时间归属**：按下单日、支付日还是发货日？跨境/跨时区会不会落到上个月？
3. **地区归属**：城市用的是收货地址、注册地还是下单 IP？同一城市名称是否有多写法（北京 / 北京市 / 北京朝阳）？
4. **数据完整性**：1 月数据是否完整抽取？上游是否有分区缺失、延迟、重复抽取？
5. **去重与重复**：明细是否重复（同一订单多行、重复 join 导致金额翻倍或漏算）？
6. **单位与精度**：报表单位是"元"还是"万元"？是否存在截断/四舍五入造成的差异（是否足以解释 2.7 万）？
7. **关联键**：订单与客户、商品的 join 是否存在"一对多导致放大"或"匹配失败导致丢失"？
8. **交叉验证**：用另一条路径复算（如直接从明细表按原始 SQL 汇总、随机抽 10 单手工核对），定位是"口径差异"还是"计算错误"。

**结论导向**：先区分是**口径分歧**（最可能）还是**数据错误**，然后把差异量拆解到可解释的因素上（如 取消单 1.8 万 + 运费 0.9 万 = 差异 2.7 万），用数据说话。`,
      explanation: '对账类问题的标准答法是"先确认口径，再查数据，最后拆解差异"。高分回答会把差异量拆分到具体因素上（如取消单、运费、时间归属），并用另一条路径交叉验证，而不是笼统地说"再查一查"。',
      rubric: [
        { point: '确认指标口径（取消/退款/运费/实付 vs 标价）', score: 2 },
        { point: '确认时间口径与地区归属规则', score: 2 },
        { point: '检查数据完整性（抽取缺失、重复、延迟）', score: 1 },
        { point: '检查 join 与去重导致的放大/丢失', score: 1 },
        { point: '用交叉验证/抽样复算并做差异拆解量化', score: 2 },
      ],
      keywords: ['口径', '时间', '去重', 'join', '完整性', '交叉验证', '拆分'],
      tags: ['排查', '面试'],
    },
    {
      id: 'py-6-e11',
      type: 'code',
      difficulty: 5,
      question:
        '综合题：实现 `build_city_report(orders)`，返回按城市汇总的**列表**（按销售额降序），每项为 `{"city": ..., "amount": float, "orders": int, "aov": float}`。\n\n规则：\n- 只统计 `status == "已完成"` 的订单；\n- `orders` 为该城市**去重后**的订单数；\n- `aov` = 该城市销售额 / 该城市订单数，**保留 2 位小数**；\n- 销售额相同时按城市名字升序。',
      starterCode: `from collections import defaultdict

orders = [
    {"order_id": "A1", "city": "北京", "amount": 600.0, "status": "已完成"},
    {"order_id": "A1", "city": "北京", "amount": 100.0, "status": "已完成"},
    {"order_id": "A2", "city": "北京", "amount": 200.0, "status": "已完成"},
    {"order_id": "B1", "city": "上海", "amount": 400.0, "status": "已完成"},
    {"order_id": "B2", "city": "上海", "amount": 500.0, "status": "已取消"},
    {"order_id": "C1", "city": "广州", "amount": 400.0, "status": "已完成"},
]

def build_city_report(orders):
    agg = defaultdict(lambda: {"amount": 0.0, "orders": set()})
    for o in orders:
        if o["status"] != "已完成":
            continue
        a = agg[o["city"]]
        a["amount"] += o["amount"]
        a["orders"].add(o["order_id"])
    rows = [
        {
            "city": c,
            "amount": round(v["amount"], 2),
            "orders": len(v["orders"]),
            "aov": ___,
        }
        for c, v in agg.items()
    ]
    rows.sort(key=___)
    return rows

out = build_city_report(orders)
`,
      setupCode: '',
      expectedOutput:
        "[{'city': '北京', 'amount': 900.0, 'orders': 2, 'aov': 450.0}, {'city': '上海', 'amount': 400.0, 'orders': 1, 'aov': 400.0}, {'city': '广州', 'amount': 400.0, 'orders': 1, 'aov': 400.0}]",
      tests: `assert [r["city"] for r in out] == ["北京", "上海", "广州"], f"排序不正确：{[r['city'] for r in out]}"
assert out[0] == {"city": "北京", "amount": 900.0, "orders": 2, "aov": 450.0}, f"北京数据不正确：{out[0]}"
assert out[1]["amount"] == 400.0 and out[1]["aov"] == 400.0
assert build_city_report([]) == [], "空输入应返回空列表"
`,
      explanation:
        '```python\ndef build_city_report(orders):\n    agg = defaultdict(lambda: {"amount": 0.0, "orders": set()})\n    for o in orders:\n        if o["status"] != "已完成":\n            continue\n        a = agg[o["city"]]\n        a["amount"] += o["amount"]\n        a["orders"].add(o["order_id"])\n    rows = [\n        {"city": c, "amount": round(v["amount"], 2), "orders": len(v["orders"]),\n         "aov": round(v["amount"] / len(v["orders"]), 2)}\n        for c, v in agg.items()\n    ]\n    rows.sort(key=lambda r: (-r["amount"], r["city"]))\n    return rows\n```\n\n北京销售额 = 600+100+200 = 900，去重订单数 2（A1、A2），客单价 450。上海与广州销售额同为 400，按 Python 字符串比较（Unicode 码位）"上海" 小于 "广州"，因此上海在前。',
      tags: ['综合', '聚合'],
    },
    {
      id: 'py-6-e12',
      type: 'open',
      difficulty: 3,
      question: '请总结一份"数据分析脚本交付清单"：你认为一个可交付给团队的数据处理脚本，至少应包含哪些内容？',
      referenceAnswer: `**可交付脚本至少应包含**：

1. **明确的输入输出约定**：输入文件的路径/格式/必需字段，输出表的结构、列名与单位；
2. **配置区**：统计区间、是否剔除取消单、分母定义等口径参数集中在文件顶部并注释；
3. **分阶段函数**：读取、清洗、校验、聚合、输出各自独立、职责单一；
4. **错误处理与质量报告**：非法行进入错误清单、输出失败行数与分布，不静默丢弃；
5. **对账断言**：行数守恒、金额守恒、除零保护；
6. **可复现性**：随机种子固定、依赖版本锁定、脚本执行顺序清晰；
7. **文档**：README 说明运行方式、参数含义、口径定义、已知限制；
8. **测试**：核心指标函数有单元测试（含边界值），关键口径有回归用例；
9. **日志**：关键步骤打印行数与耗时，便于定位性能瓶颈与异常；
10. **版本管理**：用 git 提交，附 commit 说明变更了哪些口径。`,
      explanation: '交付清单反映的是"从脚本到工程"的成熟度。仅罗列"写好注释"得分有限，应覆盖：输入输出契约、口径配置化、分阶段函数、质量报告与对账、可复现性（种子/依赖版本）、测试、日志、版本管理。',
      rubric: [
        { point: '输入输出约定与配置化口径', score: 2 },
        { point: '分阶段函数与职责单一', score: 1 },
        { point: '错误清单、质量报告与对账断言', score: 2 },
        { point: '可复现性（种子、依赖版本）与文档 README', score: 1 },
        { point: '单元测试与日志/版本管理', score: 1 },
      ],
      keywords: ['口径', '配置', '对账', '测试', '日志', '可复现', '文档'],
      tags: ['工程实践'],
    },
  ],
};

export { ch6 };
