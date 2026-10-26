import type { Chapter } from '../../types';

/* 数据挖掘 · M2 频繁模式 · c2 FP-Growth、c3 规则评估、c4 序列模式 */

export const miningFreqChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'mining-freq-c2',
    title: 'FP-Growth：不产生候选集的挖掘',
    goal: '理解 FP-Tree 的压缩原理与条件模式基递归，掌握它相对 Apriori 的优势。',
    lessons: [
      {
        id: 'mining-freq-c2-l1',
        title: 'FP-Tree 构建与条件模式基',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 按课内示例手工构建 FP-Tree（header 表/共享前缀/计数）；
2. 推导 c 的条件模式基并得到条件 FP-Tree；
3. 解释为什么只需扫描数据库 2 遍。

### 前置知识

- 「支持度、置信度与 Apriori 原理」（c1-l1）。

### 问题背景

Apriori 两个死穴：候选集爆炸（百万级）与 K 层扫描 K 遍数据库。FP-Growth 用 FP-Tree『相同前缀只存一次』的压缩结构 + 条件模式基递归，完全不生成候选、只扫 2 遍。

### 直觉理解

FP-Tree 像图书馆把所有书按首字母-次字母排架：大量事务共享前缀（a→b→c），共同前缀只架一次并累加计数。挖『c 的模式』时只看 c 的链表回溯祖先路径（条件模式基），在这个迷你子库里递归——数据库从不用再扫第三遍。

### 核心概念与原理详解

## Apriori 的两个死穴

1. **候选集爆炸**：k 层候选可能达到百万级；
2. **多次扫描**：K 层要扫 K 遍数据库。

**FP-Growth 的解法**：**完全不生成候选集**，只扫 **2 遍**。

## 核心结构：FP-Tree

**第一遍**：统计每个项的频次，按频次降序得到 header 表，删掉不频繁项。

**第二遍**：把每个事务按 header 顺序重排，插入树中（**相同前缀共享路径**）。

假设最小支持度计数 = 2，事务集：

    T1: {a, b, c, d}
    T2: {a, c}
    T3: {a, b}
    T4: {b, c}

**频次**：a:3, b:3, c:3, d:1 → 删除 d（不频繁）

**重排后**：

    T1': a, b, c
    T2': a, c
    T3': a, b
    T4': b, c

**建树**（根为 null）：

    null
     ├─ a:3 ─┬─ b:1 ── c:1
     │       └─ c:1
     └─ b:1 ── c:1

**关键洞察**：T1' 和 T3' 共享前缀 a，T2' 也走 a 分支——
**共同前缀只存一次**，这就是压缩。

## 条件模式基（Conditional Pattern Base）

**挖每个项，只考虑以它为后缀的路径**。

以 **c** 为例（c 出现 3 次）：
- 沿 c 的链表找到 3 个节点；
- 每个节点的**祖先路径**（去掉 c 本身）就是它的条件模式基：

    c 的节点1（a→b→c） → 前缀 {a, b}
    c 的节点2（a→c）    → 前缀 {a}
    c 的节点3（b→c）    → 前缀 {b}

**再统计**（支持度计数取该路径的计数）：
{a,b}:1, {a}:2(累加 a→b→c 与 a→c 路径), {b}:2

不满足 min_sup=2 的删掉 → 得 c 的**条件 FP-Tree**：只有 a:2, b:2（各自独立）。

**递归**：对每个频繁项重复这个过程，得到所有频繁项集。

## 为什么只需扫 2 遍

- 第 1 遍：算频次、定顺序；
- 第 2 遍：建树。

之后的挖掘全部在**内存中的树**上做，不再碰数据库。
这就是它在大数据上比 Apriori 快得多的根本原因。

## FP-Growth vs Apriori

| 维度 | Apriori | FP-Growth |
| --- | --- | --- |
| 扫描次数 | K 遍 | **2 遍** |
| 候选集 | 需要生成 | **不需要** |
| 内存 | 小 | 需容纳整棵树 |
| 速度快慢 | 慢（大数据） | **快 1~2 个数量级** |
| 实现复杂度 | 简单 | 较复杂 |
| 增减数据 | 直接重跑 | 树结构难增量更新 |

**实践建议**：数据能放进内存时优先 FP-Growth（sklearn/Spark 都有实现）。

## 一个实践细节：单路径优化

如果树是**单路径**（所有事务共享同一前缀），
直接枚举该路径的所有子集即可，无需递归。这能显著加速。

## 局限

- **树可能很大**：高基数稀疏数据下压缩效果差；
- **增量更新困难**：新增事务要重建树（或用 FP-Growth* 等变体）；
- **并行化较难**：树结构不易切分（Spark 用"分块独立挖掘再合并"的方式）。

## 后续：频繁模式的更多形态

| 变体 | 说明 |
| --- | --- |
| **最大频繁项集** | 不被任何其他频繁项集包含（数量少，但仍能导出全部） |
| **闭合频繁项集** | 与其所有超集支持度都不同的项集（无损压缩） |
| **Top-K 频繁项集** | 不设 min_sup，直接要支持度最高的 K 个 |
| **加权频繁项集** | 不同项有不同权重（如利润） |

<FPTreeDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
D = [["a","b","c"], ["a","c"], ["a","b"], ["b","c"]]   # d 不频繁被删
freq = {}
for t in D:
    for i in t: freq[i] = freq.get(i, 0) + 1
order = sorted([i for i, c in freq.items() if c >= 2], key=lambda x: -freq[x])
print("header 表:", [(i, freq[i]) for i in order])
paths = [[i for i in order if i in t] for t in D]
print("重排事务:", paths)
tree = {}
for p in paths:
    for depth, node in enumerate(p):
        tree.setdefault(tuple(p[:depth+1]), 0)
        tree[tuple(p[:depth+1])] += 1
print("FP-Tree 节点（路径:计数）:", {"→".join(k): v for k, v in sorted(tree.items())})
# c 的条件模式基
base = {}
for p in paths:
    if "c" in p:
        idx = p.index("c")
        if idx: base[tuple(p[:idx])] = base.get(tuple(p[:idx]), 0) + 1
print("c 的条件模式基:", {"→".join(k): v for k, v in base.items()}, "-> 条件 FP-Tree: a:2, b:2")\`\`\`

预期输出（实测）：header 表 a:3/b:3/c:3（d 不频繁删除）；重排后建 FP-Tree：a:3, a→b:2, a→b→c:1, a→c:1, b:1, b→c:1（共享前缀压缩）；c 的条件模式基 {a→b:1, a:1, b:1} → 条件 FP-Tree a:2, b:2。

**常见错误**：频次排序忘记降序（前缀压缩失效，树退化）；删除不频繁项前就建树（树爆炸）；条件模式基的计数没按路径计数累加，支持度算错。

### 常见误区

1. **『FP-Growth 比 Apriori 永远快』**——稀疏长模式数据集上建树与递归开销可能反超；\\n2. **『FP-Tree 存的是事务』**——存的是压缩的前缀共享路径 + 频次；\\n3. **『只需扫 2 遍是近似』**——结果与 Apriori 完全一致，是精确算法。

### 知识关联

- **向前**：c1 的反单调性与本章的『删除不频繁项』同源；
- **向后**：c4 的 PrefixSpan 把『不生成候选+投影递归』搬到序列上；
- **平行**：mining-graph c4 的概要数据结构共享『压缩换内存』思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 两遍 | 第 1 遍频次定序，第 2 遍建树 |
| FP-Tree | 相同前缀共享路径 + 节点计数 |
| 条件模式基 | 沿项的链表回溯祖先路径 |
| 递归 | 每个频繁项建条件 FP-Tree |
| 对比 | 无候选集、结果与 Apriori 一致 |

### 权威学术与经典教材来源

> **来源类型：国际经典教材 · 顶级大学公开课程 (A 类)**
> - Jiawei Han, Micheline Kamber, & Jian Pei (2011). *Data Mining: Concepts and Techniques* (3rd ed.). Morgan Kaufmann / University of Illinois at Urbana-Champaign (UIUC). (计算机学会经典数据挖掘教材)
> - Jure Leskovec, Anand Rajaraman, & Jeffrey D. Ullman (2020). *Mining of Massive Datasets* (3rd ed.). Cambridge University Press / Stanford CS246. (大规模图挖掘、流数据处理与频繁项集)


### 核心图解与交互演示

<Diagram type="fptree" />
`,
        tips: [
          {
            kind: 'interview',
            text: '「FP-Growth 相比 Apriori 的核心优势」：不生成候选集、只需扫描数据库 2 遍（Apriori 需 K 遍），在大数据上快 1~2 个数量级。',
          },
          {
            kind: 'leak',
            text: 'FP-Tree 的压缩来自"相同前缀共享路径"。条件模式基就是某节点的祖先路径集合，递归挖掘时只在这些路径上做统计。',
          },
          {
            kind: 'note',
            text: '闭合频繁项集是无损压缩：数量比全部频繁项集少几个数量级，但仍能还原所有频繁项集及其支持度。',
          },
        ],
        demos: [
          {
            title: '手写 FP-Tree 构建与条件模式基',
            lang: 'python',
            code: `from collections import defaultdict, Counter

transactions = [
    {"a", "b", "c", "d"},
    {"a", "c"},
    {"a", "b"},
    {"b", "c"},
]
MIN_SUP = 2

# ── 第一遍：频次统计 ──
freq = Counter()
for t in transactions:
    freq.update(t)
print("原始频次:", dict(freq))

# 保留频繁项，按频次降序
header = {k: v for k, v in freq.items() if v >= MIN_SUP}
order = sorted(header, key=lambda x: (-header[x], x))
print(f"header（降序）: {[(k, header[k]) for k in order]}")
print(f"被删除的不频繁项: {[k for k in freq if k not in header]}")
print()

# ── 第二遍：按序重排并建树 ──
class Node:
    def __init__(self, name, parent):
        self.name = name
        self.count = 1
        self.parent = parent
        self.children = {}

def build_tree(trans, order):
    root = Node(None, None)
    for t in trans:
        items = [i for i in order if i in t]
        cur = root
        for it in items:
            if it in cur.children:
                cur.children[it].count += 1
            else:
                cur.children[it] = Node(it, cur)
            cur = cur.children[it]
    return root

tree = build_tree(transactions, order)

def print_tree(node, depth=0):
    for name, child in sorted(node.children.items(), key=lambda x: order.index(x[0])):
        print("  " * depth + f"{name}:{child.count}")
        print_tree(child, depth + 1)

print("FP-Tree 结构:")
print_tree(tree)
print()

# ── 条件模式基 ──
def find_paths(node, target, prefix, results):
    """从树中找以 target 结尾的所有路径（返回前缀）。"""
    for name, child in node.children.items():
        if name == target:
            results.append((list(prefix), child.count))
        find_paths(child, target, prefix + [name], results)

for item in order:
    results = []
    find_paths(tree, item, [], results)
    print(f"「{item}」的条件模式基:")
    for path, cnt in results:
        print(f"   {path} (计数 {cnt})")
    # 统计前缀中各项的累计支持度
    accum = Counter()
    for path, cnt in results:
        for p in path:
            accum[p] += cnt
    cond = {k: v for k, v in accum.items() if v >= MIN_SUP}
    print(f"   -> 条件 FP-Tree 中的项: {cond}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-freq-c2-e1',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'single',
        difficulty: 2,
        question: 'FP-Growth 相比 Apriori 最大的优势是？',
        options: [
          { value: 'A', text: '实现更简单' },
          { value: 'B', text: '不生成候选集，只需扫描数据库 2 遍' },
          { value: 'C', text: '内存占用更小' },
          { value: 'D', text: '支持更多数据类型' },
        ],
        answer: 'B',
        explanation:
          'Apriori 要扫 K 遍并生成大量候选。FP-Growth 用 FP-Tree 压缩数据，只扫 2 遍（一遍统计、一遍建树），之后全在内存中递归挖掘，快 1~2 个数量级。',
        tags: ['FP-Growth'],
      },
      {
        id: 'mining-freq-c2-e2',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'judge',
        difficulty: 2,
        question: 'FP-Tree 的压缩效果来自"相同前缀的事务共享同一条路径"。',
        answer: true,
        explanation:
          '事务按频次降序重排后，很多事务共享相同前缀（如都以频繁项 a 开头），这些前缀只存一份，计数累加。这就是 FP-Tree 比原始数据小得多的原因。',
        tags: ['FP-Tree'],
      },
      {
        id: 'mining-freq-c2-e3',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'FP-Growth 的局限有哪些？（多选）',
        options: [
          { value: 'A', text: '树可能很大，高基数稀疏数据压缩效果差' },
          { value: 'B', text: '增量更新困难（新增数据要重建树）' },
          { value: 'C', text: '并行化较难（树结构不易切分）' },
          { value: 'D', text: '需要生成大量候选项集' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误——FP-Growth 恰恰不生成候选集，这是它的核心优势。A/B/C 是它在工程上的真实局限。',
        tags: ['FP-Growth 局限'],
      },
      {
        id: 'mining-freq-c2-e4',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'fill',
        difficulty: 3,
        question: 'FP-Growth 中，以某个项结尾的所有祖先路径集合称为该项的 ___。',
        blanks: [['条件模式基', 'conditional pattern base', '条件模式']],
        explanation:
          '条件模式基（Conditional Pattern Base）是挖掘某个项时用到的所有前缀路径。对它统计频次、过滤低频项，就得到"条件 FP-Tree"，递归挖掘即可得到所有包含该项的频繁项集。',
        tags: ['条件模式基'],
      },
      {
        id: 'mining-freq-c2-e5',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 FP-Growth 的第一遍：build_header(transactions, min_sup)。\n\n统计每项频次，返回按 (频次降序, 项名字典序) 排序的频繁项列表（只含 list，不含计数）。',
        starterCode: `from collections import Counter

def build_header(transactions, min_sup):
    freq = Counter()
    for t in transactions:
        freq.update(t)
    ___
    return ___
`,
        setupCode:
          'transactions = [{"a","b","c","d"}, {"a","c"}, {"a","b"}, {"b","c"}]\nmin_sup = 2',
        expectedOutput: "['a','b','c']",
        tests: `transactions = [{"a","b","c","d"}, {"a","c"}, {"a","b"}, {"b","c"}]
out = build_header(transactions, 2)
assert out == ["a","b","c"], f"应为 ['a','b','c']，实际 {out}"
# d 只出现 1 次应被过滤
assert "d" not in out, "d 不频繁应被删除"
# 频次降序：a(3) b(3) c(3) 字典序
out2 = build_header([{"x"},{"x"},{"y"},{"y"},{"z"}], 2)
assert out2 == ["x","y"], f"应为 ['x','y']，实际 {out2}"
# min_sup 高时结果更少
assert build_header(transactions, 4) == [], "min_sup=4 时无频繁项"
`,
        answer: `from collections import Counter

def build_header(transactions, min_sup):
    freq = Counter()
    for t in transactions:
        freq.update(t)
    items = [k for k, v in freq.items() if v >= min_sup]
    return sorted(items, key=lambda x: (-freq[x], x))
`,
        explanation:
          '这是 FP-Growth 的第一步，也是决定树形状的关键。\n\n**排序规则**：频次降序（让高频项靠近根，最大化前缀共享），频次相同时按字典序（保证结果确定）。\n\n这一步完成后，每个事务都会被重排成"高频项在前"的顺序。',
        tags: ['编程', 'FP-Growth'],
      },
      {
        id: 'mining-freq-c2-e6',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现事务重排：reorder(transactions, header)。\n\n按 header 的顺序重排每个事务中的项，过滤掉不在 header 中的项。返回重排后的事务列表（每项为 list）。',
        starterCode: `def reorder(transactions, header):
    result = []
    ___
    return result
`,
        setupCode:
          'transactions = [{"a","b","c","d"}, {"a","c"}, {"b","c"}]\nheader = ["a","b","c"]',
        expectedOutput: "[[a,b,c], [a,c], [b,c]]",
        tests: `transactions = [{"a","b","c","d"}, {"a","c"}, {"b","c"}]
header = ["a","b","c"]
out = reorder(transactions, header)
assert out == [["a","b","c"], ["a","c"], ["b","c"]], f"结果不正确: {out}"
# d 应被删除
assert all("d" not in t for t in out), "d 不在 header 中应被删除"
# 顺序应为 header 顺序
assert out[0][0] == "a", "应按 header 顺序排列"
# 空事务
out2 = reorder([{"z"}], header)
assert out2 == [[]], "全被过滤后应为空 list"
`,
        answer: `def reorder(transactions, header):
    result = []
    for t in transactions:
        result.append([i for i in header if i in t])
    return result
`,
        explanation:
          '`[i for i in header if i in t]` 一行完成两件事：**按 header 排序** + **过滤非频繁项**。\n\n重排后，相似的事务会自然形成相同前缀，这是 FP-Tree 压缩的前提。\n\n**注意**：空事务（全被过滤）会变成 `[]`，建树时应跳过。',
        tags: ['编程', '事务重排'],
      },
      {
        id: 'mining-freq-c2-e7',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'code',
        difficulty: 4,
        question:
          '实现条件模式基统计：conditional_counts(paths, min_sup)。\n\n- paths: list of (prefix_list, count)，即某节点的所有祖先路径及其节点计数\n- 统计 prefix 中每一项的累计计数，过滤低于 min_sup 的\n- 返回 dict {项: 累计计数}',
        starterCode: `from collections import Counter

def conditional_counts(paths, min_sup):
    accum = Counter()
    ___
    return ___
`,
        setupCode:
          'paths = [(["a","b"], 1), (["a"], 1), (["b"], 1)]\nmin_sup = 2',
        expectedOutput: "{'a': 2, 'b': 2}",
        tests: `paths = [(["a","b"], 1), (["a"], 1), (["b"], 1)]
out = conditional_counts(paths, 2)
assert out == {"a": 2, "b": 2}, f"结果不正确: {out}"
# 低于 min_sup 的应被过滤
out2 = conditional_counts([(["a","b"],1), (["x"],1)], 2)
assert "x" not in out2, "x 只有 1 次应被过滤"
assert out2.get("a") == 1 or "a" not in out2, "a 只有 1 次也应被过滤"
# 单一路径
out3 = conditional_counts([(["a"], 5)], 2)
assert out3 == {"a": 5}, f"应为 {{'a': 5}}，实际 {out3}"
`,
        answer: `from collections import Counter

def conditional_counts(paths, min_sup):
    accum = Counter()
    for prefix, cnt in paths:
        for p in prefix:
            accum[p] += cnt
    return {k: v for k, v in accum.items() if v >= min_sup}
`,
        explanation:
          '这是 FP-Growth 递归挖掘的核心：**沿路径累加计数，过滤低频项**。\n\n`accum[p] += cnt` 而不是 `+= 1`——因为路径的重数（count）代表该路径出现了多少次。\n\n过滤后的结果就构成了"条件 FP-Tree"的项集，继续递归即可得到所有频繁项集。',
        tags: ['编程', '条件模式基'],
      },
      {
        id: 'mining-freq-c2-e8',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'judge',
        difficulty: 3,
        question: '闭合频繁项集（Closed Itemset）是无损压缩，能还原所有频繁项集及其支持度。',
        answer: true,
        explanation:
          '闭合项集的定义是"不存在与其支持度相同的真超集"。这意味着任何频繁项集都可追溯到唯一的闭合项集，且支持度相同。因此它数量少几个数量级但仍无损。',
        tags: ['闭合项集'],
      },
      {
        id: 'mining-freq-c2-e9',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'single',
        difficulty: 3,
        question: 'FP-Tree 只剩下单条路径时，最优做法是？',
        options: [
          { value: 'A', text: '继续递归挖掘' },
          { value: 'B', text: '直接枚举该路径的所有子集，无需递归' },
          { value: 'C', text: '重建树' },
          { value: 'D', text: '报告无频繁项集' },
        ],
        answer: 'B',
        explanation:
          '单路径意味着所有事务共享同一前缀。此时该路径的所有子集都是频繁项集（因为支持度等于路径上最小计数），直接枚举即可，这是 FP-Growth 的标准加速优化。',
        tags: ['单路径优化'],
      },
      {
        id: 'mining-freq-c2-e10',
        relatedLessonId: 'mining-freq-c2-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请完整对比 Apriori 与 FP-Growth：说明各自的核心机制、复杂度来源，以及在什么场景下该选哪个。并举出一个 FP-Growth 反而更慢的实际情形。',
        referenceAnswer: `**一、核心机制对比**

**Apriori：逐层候选生成**

    1. 统计 1-项集 → L1
    2. 循环：L(k-1) 连接生成候选 Ck → 剪枝 → 扫库计数 → Lk

- 依赖**反单调性**剪枝：不频繁项集的所有超集不频繁；
- 复杂度来源：**候选集数量**（最坏指数级）与**扫描次数**（K 层扫 K 遍）。

**FP-Growth：树压缩 + 递归挖掘**

    1. 第 1 遍：统计频次 → header 表（降序）
    2. 第 2 遍：事务按 header 重排，建 FP-Tree（共享前缀）
    3. 对每个项：取条件模式基 → 建条件 FP-Tree → 递归

- 复杂度来源：**树的大小**（内存）与递归深度。

**二、复杂度对比**

| 维度 | Apriori | FP-Growth |
| --- | --- | --- |
| 数据库扫描 | K 遍（K=最大频繁项集长度） | **固定 2 遍** |
| 候选集 | 需生成，可能爆炸 | **不生成** |
| 主要瓶颈 | I/O + 候选数量 | 内存（树大小） |
| 时间复杂度 | O(2^d · 扫描成本) 最坏 | 通常远低于 Apriori |

**三、选型建议**

**选 Apriori**：
- 数据小或最大频繁项集很短（K ≤ 3）；
- 内存紧张（树放不下）；
- 需要简单的实现或教学演示。

**选 FP-Growth**：
- 数据量大、需要多次扫描代价高（磁盘/分布式存储）；
- 频繁项集较长、候选爆炸严重；
- 数据能整体放进内存。

**实践**：sklearn 的 FP-Growth 实现是首选；Spark MLlib 也提供。

**四、FP-Growth 反而更慢的情形**

**情形 1：数据极度稀疏、基数极高**

例如 10 万种商品、每个购物篮只有 3 件商品。
- FP-Tree 几乎无法共享前缀（每个事务都是独立分支）；
- 树的大小接近原始数据，甚至因为指针开销更大；
- 递归时条件模式基短而多，建立条件树的开销超过收益。

此时 Apriori 的 2-项集、3-项集剪枝反而更高效。

**情形 2：min_sup 设得很高**

频繁项集很少、很短时：
- Apriori 只需 2~3 轮就结束；
- FP-Growth 仍要完整建树 + 递归，**固定开销更大**。

**情形 3：需要增量更新**

Apriori 可以直接重跑（或只重算增量部分）；
FP-Growth 的树结构必须重建，频繁更新场景下不划算。

**情形 4：内存受限**

树必须全部驻留内存。如果数据量超出内存，
FP-Growth 直接不可用，而 Apriori 可以边读边算。

**五、一句话总结**

> Apriori 用**计算换内存**（多次扫描、简单结构），
> FP-Growth 用**内存换计算**（一次建树、快速挖掘）。
> 选择取决于数据规模、稀疏度与内存约束。`,
        rubric: [
          { point: '两种机制的核心流程', score: 2 },
          { point: '复杂度来源对比（候选爆炸 vs 树大小）', score: 2 },
          { point: '选型建议：按数据规模、稀疏度、内存', score: 2 },
          { point: '举出 FP-Growth 更慢的实际情形（稀疏高基数、高 min_sup、增量、内存受限）', score: 3 },
          { point: '总结"计算换内存 vs 内存换计算"', score: 1 },
        ],
        keywords: ['反单调性', '候选集', 'FP-Tree', '2 遍扫描', '稀疏高基数', '增量更新'],
        explanation:
          '能举出"稀疏高基数下 FP-Tree 反而更大"这个反例，说明不是简单地认为 FP-Growth 永远更好。',
        tags: ['算法对比', '综合'],
      },
    ],
  },

  {
    id: 'mining-freq-c3',
    title: '规则评估与冗余消除',
    goal: '掌握关联规则的多维评估指标、统计显著性检验与规则去冗余方法。',
    lessons: [
      {
        id: 'mining-freq-c3-l1',
        title: '从 lift 到显著性检验',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 计算规则的 leverage/conviction 并与 lift 对比；
2. 对 2×2 列联表做卡方检验并应用 Bonferroni 校正；
3. 用支持度计数下限过滤『高 lift 低覆盖』的不可行动规则。

### 前置知识

- c1 的三大指标；
- 假设检验基础（p 值）。

### 问题背景

lift 也有缺陷：高 lift 可能只覆盖 5 笔交易（不可行动），小样本下波动极大。leverage/conviction/卡方检验 + Bonferroni 校正，是把『看起来有关联』升级为『统计显著且可行动』的组合拳。

### 直觉理解

lift 是比值（相对强几倍），leverage 是差值（多覆盖了多少比例的事务）——lift=50 但只覆盖 0.1% 的小规则，leverage≈0 毫无商业价值。conviction 回答『违反这条规则的情况有多罕见』（完美规则为 ∞）。卡方检验则是『这条规则是不是运气』——挖几千条规则时必须 Bonferroni 除以规则数。

### 核心概念与原理详解

## 为什么需要更多指标

前面讲过：**只看置信度会被高支持度的 Y 误导**，所以要加 lift。

但 **lift 也有缺陷**：
- 高 lift 的规则可能只覆盖**极少数**事务（支持度极低）→ 不可行动；
- 小样本下 lift 波动极大，可能是随机噪声。

所以需要一套组合拳。

## 五个核心指标

设 n = 总事务数，σ(X) = X 的支持度计数。

| 指标 | 公式 | 含义 |
| --- | --- | --- |
| 支持度 | σ(X∪Y)/n | 覆盖率 |
| 置信度 | σ(X∪Y)/σ(X) | 条件概率 |
| **提升度 lift** | conf / sup(Y) | 相对提升倍数 |
| **杠杆率 leverage** | sup(X∪Y) − sup(X)·sup(Y) | 绝对提升量 |
| **确信度 conviction** | (1−sup(Y)) / (1−conf) | 对反例的敏感度 |

**lift vs leverage 的区别**：
- lift 是**比值**：适合比较不同规则的相对强度；
- leverage 是**差值**：直接反映"多覆盖了多少比例"。

**leverage = 0** 表示完全独立。它对低支持度的规则更敏感。

**conviction 的直觉**：如果 A→B 是完美规则（conf=1），conviction = ∞。
值越大说明"违反规则"的情况越不可能发生。

## 统计显著性：规则是不是噪声

即使 lift = 3，如果该规则只覆盖 5 笔交易，也可能是偶然。

**做法**：卡方检验（χ²）

    检验 X 与 Y 是否独立。
    构造 2×2 列联表：
                    Y       ¬Y
        X        σ(XY)    σ(X¬Y)
        ¬X       σ(¬XY)   σ(¬X¬Y)

    χ² = n·(ad - bc)² / [(a+b)(c+d)(a+c)(b+d)]

**p 值 < 0.05** 才认为关联显著。
**注意**：多重检验问题——挖出几千条规则时，
即使全部独立也会有 5% 随机显著。应做 **Bonferroni 校正**（阈值除以规则数）
或控制 **FDR**（Benjamini-Hochberg）。

## 冗余规则消除

同一批事务会产生大量**互相蕴含**的规则：

    {A,B} → C    (conf 0.9)
    {A} → C      (conf 0.85)
    {B} → C      (conf 0.8)

如果 {A,B} → C 成立，那 A→C 和 B→C 提供的信息更少。

**消除方法**：

1. **最小前件规则**：只保留前件最小的规则；
2. **提升度支配**：若规则 R1 的 lift 和 support 都 ≥ R2，则 R2 可删；
3. **闭合项集**：先用闭合频繁项集压缩，再从闭合集导出规则（不重复）。

## 一个实战建议：规则要"可行动"

**统计上显著 ≠ 业务上可用**。筛选时要问：

| 问题 | 不合格的例子 |
| --- | --- |
| 支持度够吗？ | 只覆盖 3 笔交易，无法用于推荐 |
| 有合理解释吗？ | "买螺丝刀 → 买牛奶" 无因果逻辑 |
| 能采取行动吗？ | "买 A → 买 B" 但 B 已经买了 |
| 提升是真的吗？ | 没做 A/B 实验，可能只是共现 |

**实践流程**：

    频繁项集 → 生成规则（多阈值过滤）→ 显著性检验
      → 冗余消除 → 人工业务审核 → A/B 实验验证增益

**最后一步最容易被跳过，但最重要**：
关联规则只能告诉你"共现"，不能证明"推荐能带来增益"。

<AprioriLattice />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
n = 1000
a = 80; b_ = 20; c = 120; d = 780            # 列联表: X∩Y, X∩¬Y, ¬X∩Y, ¬X¬Y
supX, supY = (a+b_)/n, (a+c)/n
supXY = a/n
conf = supXY/supX; lift = conf/supY
lev = supXY - supX*supY
conv = (1-supY)/(1-conf)
chi2 = n*(a*d - b_*c)**2/((a+b_)*(c+d)*(a+c)*(b_+d))
print(f"conf={conf:.2f} lift={lift:.2f} leverage={lev:.4f} conviction={conv:.2f} χ²={chi2:.1f}")
from scipy.stats import chi2 as chi2d
p = 1 - chi2d.cdf(chi2, 1)
print(f"p 值={p:.4f}", "显著" if p < 0.05 else "不显著")
print(f"挖 5000 条规则时 Bonferroni 阈值 = {0.05/5000:.1e}")
print("低支持度陷阱: lift=50 但 σ(XY)=5/1000 → leverage≈0，不可行动")\`\`\`

预期输出（实测）：列联表规则：conf=0.80、lift=4.00、leverage=0.06、conviction=4.00、χ²=250（p<0.0001 显著）；5000 条规则的 Bonferroni 阈值=1e-5；『lift=50 但 σ(XY)=5/1000 → leverage≈0』不可行动。

**常见错误**：只按 lift 排序导出 Top 规则（全是低支持度噪声）；卡方检验不做多重校正，5000 条规则里约 250 条纯随机『显著』；把连续变量的关联硬塞进项集框架。

### 常见误区

1. **『lift 大就值得上线』**——先看支持度计数是否足够大（比如 ≥50 单）；\\n2. **『p<0.05 就是真的』**——多重检验下必须校正；\\n3. **『规则可直接用于定价』**——需要 A/B 验证因果，关联只是候选假设。

### 知识关联

- **向前**：c1 的三大指标是本章的基石；
- **向后**：c4 的序列模式把时间维度引入后需重新评估；
- **平行**：quant-backtest c3 的 DSR 与本章共享多重检验校正思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| leverage | sup(XY) − sup(X)sup(Y)，绝对差值 |
| conviction | (1−sup Y)/(1−conf)，反例稀有度 |
| 卡方 | 2×2 列联表独立性检验，p<0.05 |
| 多重检验 | Bonferroni：阈值 ÷ 规则数 |
| 可行动性 | 支持度计数下限 + 业务成本 |

### 权威学术与经典教材来源

> **来源类型：国际经典教材 · 顶级大学公开课程 (A 类)**
> - Jiawei Han, Micheline Kamber, & Jian Pei (2011). *Data Mining: Concepts and Techniques* (3rd ed.). Morgan Kaufmann / University of Illinois at Urbana-Champaign (UIUC). (计算机学会经典数据挖掘教材)
> - Jure Leskovec, Anand Rajaraman, & Jeffrey D. Ullman (2020). *Mining of Massive Datasets* (3rd ed.). Cambridge University Press / Stanford CS246. (大规模图挖掘、流数据处理与频繁项集)
`,
        tips: [
          {
            kind: 'interview',
            text: '「lift 与 leverage 的区别」：lift 是比值（相对提升倍数），leverage 是差值（绝对覆盖增量）。lift 对高支持度 Y 不敏感，leverage 对低支持度规则更敏感。',
          },
          {
            kind: 'leak',
            text: '挖出几千条规则时存在多重检验问题：即使全部独立也有 5% 随机显著。需做 Bonferroni 校正或控制 FDR。',
          },
          {
            kind: 'pitfall',
            text: '统计显著不代表业务可用。关联规则只能证明"共现"，要证明"推荐能带来增益"必须做 A/B 实验或 uplift 建模。',
          },
        ],
        demos: [
          {
            title: '五指标计算与显著性检验',
            lang: 'python',
            code: `import numpy as np
from scipy import stats

# 事务数据：n=1000
n = 1000
sup_x = 200      # 含 X 的事务
sup_y = 300      # 含 Y 的事务
sup_xy = 120     # 同时含 X 和 Y

# ── 五个指标 ──
support = sup_xy / n
confidence = sup_xy / sup_x
lift = confidence / (sup_y / n)
leverage = support - (sup_x / n) * (sup_y / n)
conviction = (1 - sup_y / n) / (1 - confidence) if confidence < 1 else float("inf")

print("规则 X → Y 的五个指标:")
print(f"  支持度      = {support:.4f}  (覆盖 {sup_xy}/{n} 笔)")
print(f"  置信度      = {confidence:.4f}")
print(f"  提升度 lift = {lift:.4f}   {'> 1 正相关' if lift > 1 else '< 1 负相关'}")
print(f"  杠杆率      = {leverage:.4f}")
print(f"  确信度      = {conviction:.4f}")
print()

# ── 卡方检验 ──
# 2x2 列联表
a = sup_xy                    # X 且 Y
b = sup_x - sup_xy            # X 且 ¬Y
c = sup_y - sup_xy            # ¬X 且 Y
d = n - sup_x - sup_y + sup_xy  # ¬X 且 ¬Y

table = np.array([[a, b], [c, d]])
chi2, p, dof, expected = stats.chi2_contingency(table, correction=False)

print("2×2 列联表:")
print(f"          Y      ¬Y")
print(f"  X    {a:5d}  {b:5d}")
print(f"  ¬X   {c:5d}  {d:5d}")
print()
print(f"卡方统计量 = {chi2:.4f}")
print(f"p 值       = {p:.6e}  {'显著 ✓' if p < 0.05 else '不显著 ✗'}")
print()

# ── 对比：小样本下的"高 lift"规则 ──
print("=== 对比：只覆盖 5 笔交易的规则 ===")
n2 = 1000
sx2, sy2, sxy2 = 5, 300, 4
conf2 = sxy2 / sx2
lift2 = conf2 / (sy2 / n2)
a2, b2 = sxy2, sx2 - sxy2
c2, d2 = sy2 - sxy2, n2 - sx2 - sy2 + sxy2
chi2_2, p2, _, _ = stats.chi2_contingency(np.array([[a2, b2], [c2, d2]]), correction=False)
print(f"  lift = {lift2:.2f} (很高！)")
print(f"  p 值 = {p2:.4f}  {'显著' if p2 < 0.05 else '不显著 —— 可能是噪声 ✗'}")
print()
print("结论：lift 高不代表规则可靠，小样本下必须做显著性检验")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-freq-c3-e1',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'single',
        difficulty: 2,
        question: 'lift 与 leverage 的核心区别是？',
        options: [
          { value: 'A', text: 'lift 是比值，leverage 是差值' },
          { value: 'B', text: 'lift 更准' },
          { value: 'C', text: 'leverage 只适用于小数据' },
          { value: 'D', text: '两者等价' },
        ],
        answer: 'A',
        explanation:
          'lift = conf/sup(Y) 是相对比值，适合比较规则强度；leverage = sup(XY) − sup(X)·sup(Y) 是绝对差值，对低支持度规则更敏感。leverage=0 表示独立。',
        tags: ['评估指标'],
      },
      {
        id: 'mining-freq-c3-e2',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'judge',
        difficulty: 2,
        question: '一条规则的 lift 很高，说明它一定是可靠有用的规则。',
        answer: false,
        explanation:
          '高 lift 可能来自极低的样本量（只覆盖几笔交易），也可能是随机噪声。必须同时看支持度（是否可行动）与显著性检验（p 值）。',
        tags: ['指标局限'],
      },
      {
        id: 'mining-freq-c3-e3',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'multiple',
        difficulty: 3,
        question: '为什么挖掘出的规则需要做多重检验校正？（多选）',
        options: [
          { value: 'A', text: '挖出几千条规则时，即使全部独立也会有 5% 随机显著' },
          { value: 'B', text: '可以用 Bonferroni 校正（阈值除以规则数）' },
          { value: 'C', text: '或控制 FDR（Benjamini-Hochberg）' },
          { value: 'D', text: '因为卡方检验本身有错误' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——卡方检验本身正确，问题在于"多次检验"导致假阳性累积。这就是多重检验问题，需校正。',
        tags: ['多重检验'],
      },
      {
        id: 'mining-freq-c3-e4',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'fill',
        difficulty: 3,
        question: '确信度 conviction = (1 − support(Y)) / (1 − ___)。',
        blanks: [['confidence', '置信度', 'conf']],
        explanation:
          'conviction 衡量"违反规则"的不可能程度。完美规则（conf=1）时 conviction = ∞。值越大说明反例越不可能出现。',
        tags: ['conviction'],
      },
      {
        id: 'mining-freq-c3-e5',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'code',
        difficulty: 2,
        question:
          '计算 leverage：compute_leverage(sup_x, sup_y, sup_xy)，三者都是比例（0~1）。返回保留 6 位小数。',
        starterCode: `def compute_leverage(sup_x, sup_y, sup_xy):
    ___
`,
        setupCode: 'sup_x, sup_y, sup_xy = 0.2, 0.3, 0.12',
        expectedOutput: '0.06',
        tests: `assert abs(compute_leverage(0.2, 0.3, 0.12) - 0.06) < 1e-9, f"应为 0.06，实际 {compute_leverage(0.2,0.3,0.12)}"
# 完全独立时 leverage = 0
assert abs(compute_leverage(0.5, 0.5, 0.25)) < 1e-9, "独立时应为 0"
# 正相关
assert compute_leverage(0.5, 0.5, 0.4) > 0, "共现高于期望时应为正"
# 负相关
assert compute_leverage(0.5, 0.5, 0.1) < 0, "共现低于期望时应为负"
`,
        answer: `def compute_leverage(sup_x, sup_y, sup_xy):
    return round(sup_xy - sup_x * sup_y, 6)
`,
        explanation:
          'leverage = 实际共现比例 − 独立假设下的期望共现比例。\n\n- = 0：完全独立；\n- > 0：正相关（共现比随机多）；\n- < 0：负相关（互相抑制）。\n\n比 lift 更直观地反映"多覆盖了多少"。',
        tags: ['编程', 'leverage'],
      },
      {
        id: 'mining-freq-c3-e6',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现卡方检验的列联表构建：chi2_table(n, sup_x, sup_y, sup_xy)。\n\nsup_* 都是计数（非比例），返回 2×2 列表 `[[a,b],[c,d]]`，其中 a=σ(XY), b=σ(X¬Y), c=σ(¬XY), d=σ(¬X¬Y)。',
        starterCode: `def chi2_table(n, sup_x, sup_y, sup_xy):
    a = ___
    b = ___
    c = ___
    d = ___
    return [[a, b], [c, d]]
`,
        setupCode: 'n, sup_x, sup_y, sup_xy = 1000, 200, 300, 120',
        expectedOutput: '[[120, 80], [180, 620]]',
        tests: `t = chi2_table(1000, 200, 300, 120)
assert t == [[120, 80], [180, 620]], f"结果不正确: {t}"
# 行和/列和应正确
assert t[0][0] + t[0][1] == 200, "第一行和应等于 sup_x"
assert t[0][0] + t[1][0] == 300, "第一列和应等于 sup_y"
assert sum(t[0]) + sum(t[1]) == 1000, "总和应等于 n"
# 完全独立的情况
t2 = chi2_table(100, 50, 50, 25)
assert t2 == [[25,25],[25,25]], f"独立时应为 25，实际 {t2}"
`,
        answer: `def chi2_table(n, sup_x, sup_y, sup_xy):
    a = sup_xy
    b = sup_x - sup_xy
    c = sup_y - sup_xy
    d = n - sup_x - sup_y + sup_xy
    return [[a, b], [c, d]]
`,
        explanation:
          '四个格子分别对应 2×2 列联表：\n\n    含X且含Y   = σ(XY)\n    含X不含Y   = σ(X) - σ(XY)\n    不含X含Y   = σ(Y) - σ(XY)\n    都不含      = n - σ(X) - σ(Y) + σ(XY)\n\n最后一个用容斥原理计算。这张表是卡方检验、互信息、lift 等所有指标的基础。',
        tags: ['编程', '列联表'],
      },
      {
        id: 'mining-freq-c3-e7',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现规则冗余判定：is_redundant(rule, kept_rules)。\n\n- rule: dict，含 antecedent(set), consequent(str), lift(float)\n- kept_rules: 已保留规则列表\n- 若存在某条已保留规则，其前件是 rule 前件的**子集**且 lift 更高，则认为 rule 冗余，返回 True',
        starterCode: `def is_redundant(rule, kept_rules):
    for k in kept_rules:
        if k["consequent"] != rule["consequent"]:
            continue
        if ___
            return True
    return False
`,
        setupCode:
          'kept = [{"antecedent": {"A"}, "consequent": "C", "lift": 2.0}]\nrule = {"antecedent": {"A","B"}, "consequent": "C", "lift": 1.5}',
        expectedOutput: 'True（A→C 更强，AB→C 冗余）',
        tests: `kept = [{"antecedent": {"A"}, "consequent": "C", "lift": 2.0}]
# AB→C 的 lift 更低，且 A 是前件子集 -> 冗余
r1 = {"antecedent": {"A","B"}, "consequent": "C", "lift": 1.5}
assert is_redundant(r1, kept) == True, "应判为冗余"
# AB→C 的 lift 更高 -> 不冗余
r2 = {"antecedent": {"A","B"}, "consequent": "C", "lift": 3.0}
assert is_redundant(r2, kept) == False, "lift 更高不应冗余"
# 后件不同 -> 不冗余
r3 = {"antecedent": {"A","B"}, "consequent": "D", "lift": 1.0}
assert is_redundant(r3, kept) == False
# 前件不是子集 -> 不冗余
r4 = {"antecedent": {"B","C"}, "consequent": "C", "lift": 1.0}
assert is_redundant(r4, kept) == False
`,
        answer: `def is_redundant(rule, kept_rules):
    for k in kept_rules:
        if k["consequent"] != rule["consequent"]:
            continue
        if k["antecedent"] < rule["antecedent"] and k["lift"] >= rule["lift"]:
            return True
    return False
`,
        explanation:
          '`<` 是**真子集**运算符：`{A} < {A,B}` 为 True。\n\n判定逻辑：如果已有规则的**前件更简单、lift 更高**，那更复杂的规则提供的信息更少，可以删除。\n\n这是规则去冗余的标准做法之一（另一种是基于提升度支配）。',
        tags: ['编程', '冗余消除'],
      },
      {
        id: 'mining-freq-c3-e8',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'judge',
        difficulty: 3,
        question: 'Bonferroni 校正的做法是把显著性阈值除以检验次数。',
        answer: true,
        explanation:
          '若做 m 次检验，就把阈值从 0.05 改为 0.05/m。这控制了族错误率（FWER），但过于保守（容易漏掉真信号）。更常用的折中是控制 FDR（Benjamini-Hochberg）。',
        tags: ['多重检验'],
      },
      {
        id: 'mining-freq-c3-e9',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'single',
        difficulty: 3,
        question: '规则 {A}→C 的 lift=2.5，{A,B}→C 的 lift=1.8。应该保留哪条？',
        options: [
          { value: 'A', text: '保留 {A,B}→C，因为它条件更多更精确' },
          { value: 'B', text: '保留 {A}→C，它前件更简单且 lift 更高，{A,B}→C 冗余' },
          { value: 'C', text: '两条都保留' },
          { value: 'D', text: '两条都删除' },
        ],
        answer: 'B',
        explanation:
          '{A}→C 的前件是 {A,B}→C 前件的子集，且 lift 更高，说明加入 B 反而降低了关联强度。{A,B}→C 提供的信息更少，属于冗余规则。',
        tags: ['冗余消除'],
      },
      {
        id: 'mining-freq-c3-e10',
        relatedLessonId: 'mining-freq-c3-l1',
        type: 'open',
        difficulty: 4,
        question:
          '你从 50 万条交易中挖出 3000 条关联规则。请设计完整的筛选流程，从 3000 条中挑出真正可用于运营的规则，并说明每一步排除什么、用什么指标。',
        referenceAnswer: `**一、整体流程**

    3000 条规则
      ↓ ① 支持度过滤（可行动性）
      ↓ ② lift 过滤（真实关联）
      ↓ ③ 显著性检验 + 多重检验校正（非噪声）
      ↓ ④ 冗余消除（避免重复）
      ↓ ⑤ 业务合理性审核
      ↓ ⑥ 去"平凡关联"（Y 高支持度）
      → 50~200 条候选
      ↓ ⑦ A/B 实验验证真实增益
      → 最终可用规则

**二、每一步细节**

**① 支持度过滤**

- 50 万交易中，支持度 0.1% = 500 笔，0.5% = 2500 笔；
- 建议阈值：**min_sup = 0.2%~0.5%**（覆盖 1000~2500 笔）；
- **排除**：只覆盖几十笔的规则——即使 lift 很高也无法规模化运营。

**② lift 过滤**

- 要求 **lift ≥ 1.2**（有些场景要 ≥ 1.5）；
- **排除**：lift ≈ 1 的独立规则（如"买钻石→买牛奶"）。

**③ 显著性检验**

- 对每条规则做卡方检验，要求 p < 0.05；
- **多重检验校正**：3000 次检验，Bonferroni 阈值 = 0.05/3000 ≈ 1.7e-5；
  或用 **Benjamini-Hochberg 控制 FDR = 0.05**（更推荐，不会漏太多真信号）；
- **排除**：统计上可能是噪声的规则。

**④ 冗余消除**

- 若规则 R1 的前件是 R2 前件的真子集，且 R1 的 lift ≥ R2 → 删除 R2；
- 或用闭合频繁项集压缩后统一导出规则；
- **排除**：{A,B}→C 与 {A}→C 同时存在时，通常只保留更强的那个（或按业务需求保留细粒度的）。

**⑤ 业务合理性审核**

- 让业务方逐条看"这条规则有解释吗"；
- **排除**：
  - 无因果逻辑的（如"买螺丝刀→买牛奶"）；
  - 由于数据采集方式造成的伪关联（如同一个页面推荐位一起曝光）；
  - 已过时的（如季节性商品）。

**⑥ 去平凡关联**

- 若 support(Y) > 0.7，任何 X→Y 的 lift 都不会高，但 conf 会虚高；
- **排除**：Y 是"几乎所有订单都有"的商品（如塑料袋）的规则。

**⑦ A/B 实验**

- 选 20~50 条规则做小流量实验；
- 实验组：按规则做交叉推荐；对照组：随机推荐或热门推荐；
- **看真实增量**：转化率、客单价、GMV 的提升；
- **排除**：实验无显著提升的（说明只是共现而非因果）。

**三、指标使用对照**

| 步骤 | 主指标 | 辅助 |
| --- | --- | --- |
| ① 支持度 | support | 覆盖笔数 |
| ② lift | lift | leverage |
| ③ 显著性 | p 值 / FDR | 卡方统计量 |
| ④ 冗余 | 前件包含关系 + lift 支配 | 闭合项集 |
| ⑤ 业务 | 人工判断 | — |
| ⑥ 平凡 | support(Y) | conviction |
| ⑦ 验证 | 相对提升 / p 值 | uplift |

**四、一个关键认知**

**3000 条规则里，最终能落地的可能只有几十条。**
这不是筛选太严，而是关联规则的本质决定的：
- 大部分规则是**共现而非因果**；
- 大部分规则的覆盖量**不足以支撑运营动作**；
- 多重检验下大量"显著"是**假阳性**。

**不要把"挖出多少条规则"当成果，要看"落地了几条、带来多少增益"。**`,
        rubric: [
          { point: '支持度过滤：排除覆盖过少的规则', score: 2 },
          { point: 'lift 过滤 + 去平凡关联（Y 高支持度）', score: 2 },
          { point: '显著性检验 + 多重检验校正（FDR/Bonferroni）', score: 3 },
          { point: '冗余消除（前件子集 + lift 支配）', score: 2 },
          { point: '业务审核 + A/B 实验验证真实增益', score: 2 },
        ],
        keywords: ['min_sup', 'lift', 'FDR', 'Bonferroni', '冗余', 'A/B 实验'],
        explanation:
          '能指出"3000 条最终只用几十条"并强调多重检验假阳性，就理解了关联规则落地的真实难度。',
        tags: ['规则筛选', '综合'],
      },
    ],
  },

  {
    id: 'mining-freq-c4',
    title: '序列模式：考虑时间顺序的挖掘',
    goal: '理解序列模式与关联规则的区别，掌握 GSP 与 PrefixSpan 的核心思想。',
    lessons: [
      {
        id: 'mining-freq-c4-l1',
        title: '序列模式与 PrefixSpan',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 判定子序列关系并区分 ⟨{a},{b}⟩ 与 ⟨{a,b}⟩；
2. 计算序列支持度并实现支持度函数；
3. 描述 PrefixSpan 的前缀投影递归流程与 GSP 的候选爆炸。

### 前置知识

- c1~c3 全部；
- 递归思想。

### 问题背景

关联规则只看同笔共现，但业务真问题是『买了手机的人 60 天内会买手机壳』——时间顺序是信息的另一半。序列模式把无序集合升级为有序事务列表，PrefixSpan 用前缀投影避免候选爆炸。

### 直觉理解

序列像看连续剧：⟨{手机},{手机壳},{贴膜}⟩ 是三集剧情。子序列判定像跳着看但绝不倒放——⟨{b},{a}⟩ 不是 ⟨{a},{b}⟩。PrefixSpan 像『以某集为开头往下找』：把所有包含 a 的序列取 a 之后的尾巴（投影数据库），在尾巴里递归找下一个频繁项——从不凭空造候选。

### 核心概念与原理详解

## 从"同时买"到"先后买"

关联规则只看**同一笔交易内**的共现。但很多业务问题是**时间序列**的：

    用户A: 买手机 → 30天后买手机壳 → 7天后买贴膜
    用户B: 买手机 → 45天后买手机壳
    用户C: 买手机 → 60天后买耳机

**序列模式挖掘**要找的是：
"买了手机的客户，通常会在 60 天内买手机壳"。

**关键区别**：

| 类型 | 数据单元 | 顺序 | 例子 |
| --- | --- | --- | --- |
| 关联规则 | 事务（无序集合） | 无 | {啤酒, 尿布} |
| 序列模式 | 序列（有序事务列表） | **有** | ⟨{手机}, {手机壳}, {贴膜}⟩ |

## 序列的基本概念

**序列**：有序的事务列表，每个事务是项的集合。

    S = ⟨{a, c}, {b}, {a, e}⟩

**子序列**：如果序列 S2 可以从 S1 中删除若干项（保持顺序）得到，
则 S2 是 S1 的子序列（记 S2 ⊆ S1）。

    ⟩{a}, {b}⟩ ⊆ ⟩{a, c}, {b}, {a, e}⟩   ✓
    ⟩{b}, {a}⟩ ⊆ ⟩{a, c}, {b}, {a, e}⟩   ✓（顺序 b 在 a 前）
    ⟩{e}, {a}⟩ ⊆ ⟩{a, c}, {b}, {a, e}⟩   ✗（e 在原序列最后）

**支持度**：包含该子序列的序列数 / 总序列数。

**序列模式**：支持度 ≥ min_sup 的子序列。

## GSP：Apriori 的序列版

**思路**：与 Apriori 一样逐层生成候选，但"连接"规则不同。

**Apriori-gen（序列版）**：
若两个 k 序列**去掉首项**后相同 → 可以连接（前向连接）。

    s1 = ⟨{a}, {b}, {c}⟩
    s2 = ⟨{b}, {c}, {d}⟩
    去掉首项后都是 ⟨{b}, {c}⟩ → 连接得 ⟨{a}, {b}, {c}, {d}⟩

**问题**：序列的候选数量比项集更大（因为顺序组合）。

## PrefixSpan：前缀投影（主流方法）

**核心思想**：与 FP-Growth 类似——**不生成候选集，用投影数据库递归挖掘**。

**算法**：

    1. 扫描一遍序列数据库，找出所有频繁 1-项（作为前缀）
    2. 对每个频繁项 a：
       a. 用 a 作为前缀
       b. 构造投影数据库：把所有包含 a 的序列，
          截取 a 之后的部分（投影）
       c. 在投影数据库上递归挖掘下一个项
    3. 直到无法扩展

**举例**：

    序列库：
      S1 = ⟨{a}, {b}, {c}⟩
      S2 = ⟨{a}, {c}, {b}⟩
      S3 = ⟨{b}, {a}, {c}⟩
    min_sup = 2

    频繁 1-项：a(3), b(3), c(3)

    以 a 为前缀 → 投影：
      S1: ⟨{b}, {c}⟩    （a 之后）
      S2: ⟨{c}, {b}⟩
      S3: ⟨{c}⟩
    统计投影中的项：b(2), c(3) → 都频繁
      → ⟨{a}, {b}⟩ 支持度 2
      → ⟨{a}, {c}⟩ 支持度 3
    继续递归...

**优势**：
- **不生成候选集**；
- 投影数据库**不断收缩**（每层变小），效率高；
- 内存友好（不需要完整树结构）。

**这是目前序列模式挖掘的主流算法。**

## 关键参数：maxGap 与 maxSpan

原始 PrefixSpan 只要求"顺序"，但实际业务常需要**时间约束**：

| 参数 | 含义 | 例子 |
| --- | --- | --- |
| **maxSpan** | 整个序列的最大时间跨度 | 90 天内 |
| **maxGap** | 相邻两项的最大间隔 | 7 天内 |
| **minGap** | 相邻两项的最小间隔 | 至少 1 天 |

加了时间约束后，可以挖出：
"买手机后 **7~30 天**内买手机壳"——这才是可运营的规则。

## 实际应用

| 场景 | 序列模式的应用 |
| --- | --- |
| **电商** | 购买路径、复购周期、交叉销售的时机 |
| **医疗** | 症状出现顺序、用药组合、并发症预警 |
| **风控** | 欺诈行为的操作序列（登录→改密→转账） |
| **Web 日志** | 用户浏览路径、流失前的行为序列 |
| **运维** | 故障发生的前兆序列 |

## 一个实践建议：先做时间分桶

原始时间戳太细（秒级），直接挖会产生海量模式。

**做法**：把时间**离散化成箱**（如按天、按周），
事务 = 同一天内的行为。这样序列长度可控，模式也更容易解释。

**代价**：丢失箱内顺序。若箱内顺序重要，改用"每个行为一个事务"。

<FPTreeDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
S = [[("手机",), ("手机壳",), ("贴膜",)], [("手机",), ("手机壳",)], [("手机",), ("耳机",)],
     [("电脑",), ("键盘",)]]
n = len(S)
def support(seq, S):
    cnt = 0
    for s in S:
        i = 0
        for ev in seq:
            while i < len(s) and not set(ev) <= set(s[i]): i += 1
            if i == len(s): break
            i += 1
        else: cnt += 1
    return cnt/n
seqs = [(("手机",), ("手机壳",)), (("手机",),), (("手机",), ("耳机",))]
for q in seqs:
    print(f"⟨{','.join(q[0])}...⟩ 支持度: {support(q, S):.0%}")
print("⟨{b},{a}⟩ ⊄ ⟨{a,c},{b}⟩（顺序不可倒）| ⟨{a},{b}⟩ ⊆ ⟨{a,c},{b}⟩ ✓")
print("PrefixSpan: 以『手机』开头的投影 = [⟨手机壳,贴膜⟩, ⟨手机壳⟩, ⟨耳机⟩] → 递归挖后续")\`\`\`

预期输出（实测）：序列支持度：⟨手机⟩=75%、⟨手机,手机壳⟩=50%、⟨手机,耳机⟩=25%；⟨{b},{a}⟩ ⊄ ⟨{a,c},{b}⟩（顺序不可倒）；PrefixSpan 以『手机』为前缀的投影数据库 [⟨手机壳,贴膜⟩,⟨手机壳⟩,⟨耳机⟩] 递归挖掘。

**常见错误**：把 ⟨{a},{b}⟩ 与 ⟨{a,b}⟩ 混为一谈（前者是两个事件，后者是同一事件内两项）；窗口约束（60 天内）漏加，跨年购买也算连续；支持度按『出现次数』而不是『包含序列数』统计。

### 常见误区

1. **『序列模式=时间序列预测』**——它挖的是离散事件顺序的频繁模式，不预测连续数值；\\n2. **『候选生成不可避免』**——GSP 会，PrefixSpan 不会；\\n3. **『顺序挖掘必须存时间戳』**——只需要事件间的相对顺序，绝对时间用于窗口过滤。

### 知识关联

- **向前**：c1~c3 的项集与规则评估是本章的基础设施；
- **向后**：mining-recsys c4 的序列推荐把模式用于在线排序；
- **平行**：llm-a1 的 token 序列与本章的序列支持度共享『子序列』定义。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 序列 vs 项集 | 有序事务列表，子序列保持顺序 |
| 支持度 | 包含该子序列的序列数/总序列数 |
| GSP | Apriori 的序列版，候选爆炸 |
| PrefixSpan | 前缀投影递归，主流 |
| 窗口 | 时间约束按业务加（如 60 天）|

### 权威学术与经典教材来源

> **来源类型：国际经典教材 · 顶级大学公开课程 (A 类)**
> - Jiawei Han, Micheline Kamber, & Jian Pei (2011). *Data Mining: Concepts and Techniques* (3rd ed.). Morgan Kaufmann / University of Illinois at Urbana-Champaign (UIUC). (计算机学会经典数据挖掘教材)
> - Jure Leskovec, Anand Rajaraman, & Jeffrey D. Ullman (2020). *Mining of Massive Datasets* (3rd ed.). Cambridge University Press / Stanford CS246. (大规模图挖掘、流数据处理与频繁项集)
`,
        tips: [
          {
            kind: 'interview',
            text: '「序列模式与关联规则的区别」：关联规则看同一事务内的无序共现；序列模式看有序的事务序列（含时间约束）。前者答"一起买什么"，后者答"买了之后多久买什么"。',
          },
          {
            kind: 'leak',
            text: 'PrefixSpan 用"前缀投影数据库"递归挖掘，不生成候选集，投影库逐层收缩，是当前序列模式挖掘的主流算法。',
          },
          {
            kind: 'note',
            text: '实际业务要加时间约束（maxSpan/maxGap），否则"买了手机→买手机壳"可能间隔三年，毫无运营意义。',
          },
        ],
        demos: [
          {
            title: 'PrefixSpan 核心逻辑演示',
            lang: 'python',
            code: `from collections import Counter

# 序列数据库
db = [
    [{"a"}, {"b"}, {"c"}],
    [{"a"}, {"c"}, {"b"}],
    [{"b"}, {"a"}, {"c"}],
]
MIN_SUP = 2

def is_subseq(sub, seq):
    """判断 sub 是否为 seq 的子序列。"""
    it = iter(seq)
    return all(any(x <= s for s in it) for x in sub)

def prefixspan(db, min_sup, prefix=None, results=None):
    """递归挖掘序列模式。"""
    if prefix is None:
        prefix = []
    if results is None:
        results = []

    # 统计投影数据库中出现的所有项
    cnt = Counter()
    for seq in db:
        seen = set()
        for txn in seq:
            for item in txn:
                if item not in seen:
                    cnt[item] += 1
                    seen.add(item)

    # 对每个频繁项递归
    for item, c in cnt.items():
        if c < min_sup:
            continue
        new_prefix = prefix + [frozenset([item])]
        results.append((new_prefix, c))

        # 构造投影数据库：截取 item 之后的部分
        proj = []
        for seq in db:
            for i, txn in enumerate(seq):
                if item in txn:
                    rest = seq[i + 1:]
                    if rest:
                        proj.append(rest)
                    break
        if proj:
            prefixspan(proj, min_sup, new_prefix, results)

    return results

results = prefixspan(db, MIN_SUP)

print("频繁序列模式（min_sup=2）:")
for pat, sup in sorted(results, key=lambda x: (len(x[0]), x[1])):
    readable = " -> ".join(sorted(list(s))[0] for s in pat)
    print(f"  <{readable}>  支持度 {sup}")

print()
print(f"共 {len(results)} 个序列模式")

# 验证一个具体的子序列判断
print()
print("子序列判断验证:")
print(f"  ⟩b⟩ ⊆ ⟩a,c⟩,⟩b⟩ ? {is_subseq([frozenset('b')], [frozenset('ac'), frozenset('b')])}")
print(f"  ⟩c⟩,⟩b⟩ ⊆ ⟩a,c⟩,⟩b⟩ ? {is_subseq([frozenset('c'), frozenset('b')], [frozenset('ac'), frozenset('b')])}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-freq-c4-e1',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'single',
        difficulty: 2,
        question: '序列模式挖掘与关联规则挖掘的核心区别是？',
        options: [
          { value: 'A', text: '序列模式数据量更大' },
          { value: 'B', text: '序列模式考虑事务之间的时间顺序，关联规则只看事务内共现' },
          { value: 'C', text: '序列模式不需要支持度' },
          { value: 'D', text: '两者完全相同' },
        ],
        answer: 'B',
        explanation:
          '关联规则的数据单元是无序事务（{啤酒,尿布}）；序列模式的数据单元是有序事务列表（⟨{手机},{手机壳}⟩）。前者答"一起买什么"，后者答"先后买什么"。',
        tags: ['序列模式'],
      },
      {
        id: 'mining-freq-c4-e2',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'judge',
        difficulty: 2,
        question: '序号 ⟨{a}, {b}⟩ 是 ⟨{b}, {a}, {c}⟩ 的子序列。',
        answer: false,
        explanation:
          '子序列要求保持相对顺序。在 ⟨{b},{a},{c}⟩ 中 a 出现在 b 之后，所以 ⟨{a},{b}⟩ 不是它的子序列（反过来 ⟨{b},{a}⟩ 才是）。',
        tags: ['子序列'],
      },
      {
        id: 'mining-freq-c4-e3',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'PrefixSpan 相比 GSP 的优势有？（多选）',
        options: [
          { value: 'A', text: '不生成候选集' },
          { value: 'B', text: '投影数据库逐层收缩，效率高' },
          { value: 'C', text: '不需要完整树结构，内存友好' },
          { value: 'D', text: '完全不需要扫描数据' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——PrefixSpan 仍需扫描数据库（第一遍统计 + 构造投影）。但之后全在收缩的投影库上递归，避免了候选爆炸。',
        tags: ['PrefixSpan'],
      },
      {
        id: 'mining-freq-c4-e4',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'fill',
        difficulty: 3,
        question: '业务中限制"买手机后 7~30 天内买手机壳"，需要给序列挖掘加上 maxGap 与 ___ 约束。',
        blanks: [['minGap', 'mingap', '最小间隔']],
        explanation:
          'maxGap 限制相邻项的最大间隔，minGap 限制最小间隔。再加 maxSpan 限制整个序列的跨度，才能挖出"有时效性、可运营"的序列规则。',
        tags: ['时间约束'],
      },
      {
        id: 'mining-freq-c4-e5',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现子序列判断：is_subsequence(sub, seq)。\n\n- sub 与 seq 都是「事务列表」，每个事务是 set\n- 若 sub 的每个事务都能按顺序在 seq 中找到包含它的事务，返回 True',
        starterCode: `def is_subsequence(sub, seq):
    i = 0
    for txn in seq:
        if ___:
            i += 1
        if ___:
            return True
    return ___
`,
        setupCode:
          'sub = [{"a"}, {"c"}]\nseq = [{"a","b"}, {"b"}, {"c","d"}]',
        expectedOutput: 'True',
        tests: `# 正常子序列
assert is_subsequence([{"a"},{"c"}], [{"a","b"},{"b"},{"c","d"}]) == True
# 顺序反了
assert is_subsequence([{"c"},{"a"}], [{"a","b"},{"b"},{"c","d"}]) == False
# 完全匹配
assert is_subsequence([{"a","b"}], [{"a","b"},{"c"}]) == True
# 单事务子序列
assert is_subsequence([{"b"}], [{"a"},{"b"},{"c"}]) == True
# 空子序列
assert is_subsequence([], [{"a"}]) == True
`,
        answer: `def is_subsequence(sub, seq):
    i = 0
    for txn in seq:
        if i < len(sub) and sub[i] <= txn:
            i += 1
        if i == len(sub):
            return True
    return len(sub) == 0
`,
        explanation:
          '双指针思路：遍历 seq，每找到一个能容纳 sub[i] 的事务就前进一格。\n\n`sub[i] <= txn` 是集合包含判断——sub[i] 中的项必须全在该事务中。\n\n遍历结束时若 i 走到 sub 末尾，说明全部匹配。',
        tags: ['编程', '子序列'],
      },
      {
        id: 'mining-freq-c4-e6',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'code',
        difficulty: 3,
        question:
          '统计序列数据库中每个项的频次（序列级的"出现即计 1"）：count_items(db)。\n\n注意：同一个序列中某项出现多次，只计 1 次（序列模式的支持度按序列计）。\n返回 dict。',
        starterCode: `from collections import Counter

def count_items(db):
    cnt = Counter()
    for seq in db:
        ___
    return dict(cnt)
`,
        setupCode:
          'db = [[{"a"},{"b"},{"c"}], [{"a"},{"c"},{"b"}], [{"b"},{"a"},{"c"}]]',
        expectedOutput: "{'a': 3, 'b': 3, 'c': 3}",
        tests: `db = [[{"a"},{"b"},{"c"}], [{"a"},{"c"},{"b"}], [{"b"},{"a"},{"c"}]]
out = count_items(db)
assert out == {"a":3,"b":3,"c":3}, f"结果不正确: {out}"
# 同一序列内重复项只计一次
db2 = [[{"a"},{"a"},{"a"},{"b"}]]
out2 = count_items(db2)
assert out2 == {"a":1,"b":1}, f"同序列重复应只计 1 次，实际 {out2}"
# 单序列
assert count_items([[{"x"},{"y"}]]) == {"x":1,"y":1}
`,
        answer: `from collections import Counter

def count_items(db):
    cnt = Counter()
    for seq in db:
        seen = set()
        for txn in seq:
            seen |= txn
        for item in seen:
            cnt[item] += 1
    return dict(cnt)
`,
        explanation:
          '**关键**：序列模式的支持度是"**包含该子序列的序列数**"，不是出现次数。\n\n所以同一个序列里 a 出现 3 次，对 a 的支持度贡献仍只有 1。\n\n这与关联规则（按事务计数）不同——是序列挖掘最容易搞错的地方。',
        tags: ['编程', '支持度'],
      },
      {
        id: 'mining-freq-c4-e7',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'code',
        difficulty: 4,
        question:
          '构造投影数据库：project(db, item)。\n\n对每个含 item 的序列，截取 item **之后**的事务作为投影。\n返回投影列表（若 item 之后无内容，则不加入）。',
        starterCode: `def project(db, item):
    proj = []
    for seq in db:
        for i, txn in enumerate(seq):
            if item in txn:
                ___
                break
    return proj
`,
        setupCode:
          'db = [[{"a"},{"b"},{"c"}], [{"a"},{"c"},{"b"}], [{"b"},{"a"},{"c"}]]',
        expectedOutput: "[{b},{c}], [{c},{b}], [{c}]",
        tests: `db = [[{"a"},{"b"},{"c"}], [{"a"},{"c"},{"b"}], [{"b"},{"a"},{"c"}]]
out = project(db, "a")
assert out == [[{"b"},{"c"}], [{"c"},{"b"}], [{"c"}]], f"结果不正确: {out}"
# item 在末尾时无投影
out2 = project([[{"a"},{"b"}]], "b")
assert out2 == [], f"末尾项不应产生投影，实际 {out2}"
# 不存在项
assert project(db, "z") == []
`,
        answer: `def project(db, item):
    proj = []
    for seq in db:
        for i, txn in enumerate(seq):
            if item in txn:
                rest = seq[i + 1:]
                if rest:
                    proj.append(rest)
                break
    return proj
`,
        explanation:
          '这是 PrefixSpan 的核心步骤：**对每个含该前缀项的序列，截取其后的部分**。\n\n`break` 很重要——只用**第一次**出现的位置（因为子序列匹配按最早匹配原则）。\n\n投影数据库会逐层收缩：越挖越短，所以效率很高。',
        tags: ['编程', '投影数据库'],
      },
      {
        id: 'mining-freq-c4-e8',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'judge',
        difficulty: 3,
        question: '序列模式挖掘中，同一个项在一条序列里出现多次，支持度计数应累加多次。',
        answer: false,
        explanation:
          '序列模式的支持度定义是"包含该模式的**序列数**"，不是出现次数。同一序列内重复出现只计 1。这与关联规则按事务计数不同。',
        tags: ['支持度定义'],
      },
      {
        id: 'mining-freq-c4-e9',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'single',
        difficulty: 3,
        question: '电商要挖"买了手机后多久买手机壳"的规律，直接对原始时间戳挖掘的问题是？',
        options: [
          { value: 'A', text: '算法不支持时间戳' },
          { value: 'B', text: '会产生海量细碎模式，且"间隔三年"的规则无运营意义' },
          { value: 'C', text: '数据量太大' },
          { value: 'D', text: '没有影响' },
        ],
        answer: 'B',
        explanation:
          '原始时间戳太细会导致模式爆炸，且缺少时间约束时会挖出"买了手机后三年内买手机壳"这种无意义规则。应先做时间分桶（按天/周），并加 maxGap/maxSpan 约束。',
        tags: ['实践建议'],
      },
      {
        id: 'mining-freq-c4-e10',
        relatedLessonId: 'mining-freq-c4-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请解释序列模式挖掘：与关联规则的区别、PrefixSpan 的算法流程、时间约束的作用，并给出一个电商场景的完整落地方案。',
        referenceAnswer: `**一、与关联规则的区别**

| 维度 | 关联规则 | 序列模式 |
| --- | --- | --- |
| 数据单元 | 事务（无序集合） | 序列（有序事务列表） |
| 是否有时序 | 无 | **有** |
| 回答的问题 | 一起买什么 | 先后买什么、多久后买 |
| 支持度 | 包含该项集的事务数 | 包含该子序列的**序列数** |

**二、PrefixSpan 算法流程**

1. **扫描数据库**，统计每个项的序列支持度，得到频繁 1-项；
2. **对每个频繁项 a**：
   - 以 a 为前缀；
   - 构造**投影数据库**：对所有包含 a 的序列，截取 a 之后的部分；
   - 在投影库上递归执行 1-2；
3. 直到无法扩展为止。

**关键优势**：
- 不生成候选集（避免 GSP 的候选爆炸）；
- 投影库逐层收缩（越挖越短），效率高；
- 不需要完整树结构，内存友好。

**三、时间约束的作用**

原始 PrefixSpan 只要求顺序，不管间隔。实际需要三个参数：

- **maxSpan**：整个模式的最大时间跨度（如 90 天）；
- **maxGap**：相邻两项的最大间隔（如 30 天）；
- **minGap**：相邻两项的最小间隔（如 1 天，排除同次购买）。

加了约束才能挖出可运营的规则：
"买手机后 **7~30 天**内买手机壳"。

**四、电商落地完整方案**

**① 数据准备**

- 数据：用户 ID、商品 ID、购买时间、类目；
- **时间分桶**：按天聚合（同一天买的多个商品视为一个事务）；
- 时间跨度：取最近 12 个月的订单。

**② 序列构造**

    用户A: ⟨{手机(p1)}, {耳机(p2)}, {手机壳(p3)}⟩
    用户B: ⟨{手机(p1)}, {手机壳(p3)}⟩

每个用户一条序列，事务是当天的购买集合。

**③ 挖掘参数**

- min_sup = 0.5%（至少覆盖 500 个用户）；
- maxSpan = 90 天；
- maxGap = 30 天；
- 只在**类目级**挖掘（商品 SKU 太细，模式稀疏）。

**④ 结果示例**

    ⟨{手机}, {手机壳}⟩   支持度 32%，平均间隔 12 天
    ⟨{手机}, {充电器}⟩   支持度 28%，平均间隔 3 天
    ⟨{奶粉}, {尿不湿}⟩   支持度 45%，平均间隔 7 天

**⑤ 落地应用**

| 应用 | 做法 |
| --- | --- |
| **定时触达** | 买手机后第 10 天推手机壳优惠券 |
| **购物车推荐** | 加购手机时推荐充电器（间隔 3 天内的强关联） |
| **生命周期营销** | 按序列阶段推送不同内容 |
| **流失预警** | 若某用户序列中断（该买手机壳却 30 天未买），标记为异常 |

**⑥ 验证**

- 分层 A/B：一组按序列模式触达，一组按常规营销；
- 看**增量转化率**与**触达成本**的 ROI；
- 注意"本来就买"的用户（自然转化），要用 holdout 组扣除。

**五、一个关键认知**

**序列模式的价值在于"时机"**，而不只是"关联"。
"买手机 → 买手机壳"这个关联用普通规则也能发现，
但"**12 天内**触达效果最好"这个时机信息只有序列模式能给。`,
        rubric: [
          { point: '与关联规则的区别（有序 + 序列级支持度）', score: 2 },
          { point: 'PrefixSpan 流程（投影库递归，不生成候选）', score: 3 },
          { point: '时间约束三参数（maxSpan/maxGap/minGap）的作用', score: 2 },
          { point: '电商方案：时间分桶、类目级挖掘、具体参数', score: 2 },
          { point: '落地：定时触达 + A/B 验证 + 指出"时机"是关键价值', score: 1 },
        ],
        keywords: ['PrefixSpan', '投影数据库', 'maxGap', 'maxSpan', '序列级支持度', '时机'],
        explanation:
          '能指出"序列模式的核心价值是时机而非关联"，就抓住了它在业务上的独特定位。',
        tags: ['序列模式', '综合'],
      },
    ],
  },
];
