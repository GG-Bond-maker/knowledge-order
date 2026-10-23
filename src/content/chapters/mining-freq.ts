import type { Chapter } from '../../types';

/* ============================================================
 *  数据挖掘 · M2 频繁模式与关联规则（第一章）
 *  参考：Stanford CS246（Frequent Itemsets / Association Rules）
 * ============================================================ */

export const miningFreqChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'mining-freq-c1',
    title: '频繁项集：从购物篮到 Apriori',
    goal: '理解支持度、置信度与 Apriori 的逐层剪枝原理，能手写频繁项集挖掘。',
    lessons: [
      {
        id: 'mining-freq-c1-l1',
        title: '支持度、置信度与 Apriori 原理',
        content: `
## 一个经典故事

零售商用「啤酒与尿布」的关联规则发现：买尿布的顾客也常买啤酒。
这个故事的真实性存疑，但它揭示的**关联规则挖掘**确实是数据挖掘最经典的技术之一。

## 三个核心指标

设 X、Y 是项集，D 是全部事务（购物篮）集合。

**支持度（Support）**：同时包含 X 和 Y 的事务比例

    support(X → Y) = count(X ∪ Y) / |D|

**置信度（Confidence）**：包含 X 的事务中，也包含 Y 的比例

    confidence(X → Y) = count(X ∪ Y) / count(X)

**提升度（Lift）**：Y 的出现是否真的被 X 促进

    lift(X → Y) = confidence(X → Y) / support(Y)

| lift 值 | 含义 |
| --- | --- |
| > 1 | 正相关（X 促进 Y） |
| = 1 | 独立（无关联） |
| < 1 | 负相关（X 抑制 Y） |

**关键**：**只看置信度会被误导**。
「买钻石 → 买牛奶」置信度可能很高（买钻石的人通常会顺手买牛奶），
但牛奶本身就是高支持度商品，lift 接近 1——**没有实际关联价值**。

## Apriori 的核心洞察：反单调性

**Apriori 原理**：

> 如果一个项集是频繁的，那么它的所有子集也必须频繁。
> 等价地：如果一个项集不频繁，那么它的所有超集都不频繁。

**为什么**：加入更多项只会让事务数**单调不增**。

    count({A,B,C}) ≤ count({A,B}) ≤ count({A})

**这条性质带来的剪枝**：如果 {A,B} 不频繁，
那么 {A,B,C}、{A,B,D}、{A,B,C,D}……全都不用算了。

**这就是 Apriori 能把指数搜索变成可行的关键。**

<AprioriLattice />

## Apriori 算法流程

    # 伪代码
    C1 = 所有单项
    L1 = {c ∈ C1 : count(c) ≥ min_sup}
    k = 2
    while L(k-1) 非空:
        Ck = 从 L(k-1) 连接生成候选
        # 剪枝：任何 (k-1) 子集不在 L(k-1) 中的候选直接丢弃
        Ck = {c ∈ Ck : 所有 (k-1) 子集都在 L(k-1)}
        扫描数据库统计 Ck 的计数
        Lk = {c ∈ Ck : count(c) ≥ min_sup}
        k += 1
    return 所有 Lk 的并集

**两步交替**：
1. **连接（join）**：把 L(k-1) 中前 k-2 项相同的两两合并；
2. **剪枝（prune）**：删掉含有不频繁子集的候选。

## 复杂度分析

**瓶颈 1：候选项集数量**
最坏情况是指数级（2^d 个项集）。剪枝能大幅减少但理论复杂度仍高。

**瓶颈 2：多次扫描数据库**
每一层都要完整扫一遍 D。若最大频繁项集长度为 K，就要扫 K 遍。
**在大数据上这是致命的**——磁盘 I/O 是主要成本。

**改进方向**：
- **FP-Growth**：不生成候选集，用树结构压缩数据（只需扫 2 遍）；
- **PCY**：用哈希表在第一次扫描时过滤候选；
- **采样/分区**：在子集上挖掘或分块处理。

## 一个重要的工程细节：min_sup 怎么定

- **太低**：候选爆炸，跑不动；
- **太高**：挖不出有意义的规则。

**经验**：先看数据规模。10 万事务、上千商品时，
min_sup 常取 0.001~0.01（绝对计数 100~1000）。

**更好的做法**：用**多级阈值**或先在小样本上试，找到"规则数量可接受"的区间。
`,
        tips: [
          {
            kind: 'interview',
            text: '「Apriori 原理」：频繁项集的所有子集必频繁，反之不频繁项集的所有超集不频繁。这带来剪枝，是算法可行的关键。',
          },
          {
            kind: 'leak',
            text: '只看置信度会被误导。必须看 lift：lift < 1 说明负相关，lift ≈ 1 说明独立（高置信度可能只是 Y 本身支持度高）。',
          },
          {
            kind: 'performance',
            text: 'Apriori 要对数据库扫描 K 遍（K = 最大频繁项集长度），大数据上 I/O 是瓶颈。改进方案是 FP-Growth（只扫 2 遍）。',
          },
        ],
        demos: [
          {
            title: '手写 Apriori（含剪枝与 lift 计算）',
            lang: 'python',
            code: `from itertools import combinations

# 购物篮数据
transactions = [
    {"面包", "牛奶"},
    {"面包", "尿布", "啤酒", "鸡蛋"},
    {"牛奶", "尿布", "啤酒", "可乐"},
    {"面包", "牛奶", "尿布", "啤酒"},
    {"面包", "牛奶", "尿布", "可乐"},
]

MIN_SUP = 3

def count_itemsets(trans, candidates):
    """统计每个候选集出现在多少事务中。"""
    counts = {}
    for c in candidates:
        cs = set(c)
        counts[c] = sum(1 for t in trans if cs <= t)
    return counts

# 第 1 层
items = sorted({i for t in transactions for i in t})
C1 = [(i,) for i in items]
counts1 = count_itemsets(transactions, C1)
L1 = {k: v for k, v in counts1.items() if v >= MIN_SUP}

print(f"第 1 层候选 {len(C1)} 个，频繁 {len(L1)} 个:")
print("  " + ", ".join(f"{'/'.join(k)}:{v}" for k, v in L1.items()))

# 迭代到第 k 层
all_frequent = dict(L1)
k = 2
prev = list(L1.keys())
while prev:
    # ① 连接：前 k-2 项相同的合并
    candidates = set()
    for i in range(len(prev)):
        for j in range(i + 1, len(prev)):
            a, b = prev[i], prev[j]
            if a[:k-2] == b[:k-2]:
                candidates.add(tuple(sorted(set(a) | set(b))))
    # ② 剪枝：所有 (k-1) 子集必须频繁
    pruned = set()
    for c in candidates:
        subs = combinations(c, k-1)
        if all(tuple(sorted(s)) in all_frequent for s in subs):
            pruned.add(c)

    print(f"\\n第 {k} 层: 候选 {len(candidates)} 个 → 剪枝后 {len(pruned)} 个")
    if not pruned:
        break
    counts = count_itemsets(transactions, sorted(pruned))
    Lk = {kk: v for kk, v in counts.items() if v >= MIN_SUP}
    print(f"  频繁 {len(Lk)} 个: " + (", ".join(f"{'/'.join(kk)}:{v}" for kk, v in Lk.items()) or "无"))
    all_frequent.update(Lk)
    prev = sorted(Lk.keys())
    k += 1

print(f"\\n=== 全部频繁项集 ({len(all_frequent)} 个) ===")

# 生成关联规则并计算 lift
print("\\n=== 关联规则（置信度 ≥ 0.6）===")
n = len(transactions)
for itemset, sup_count in all_frequent.items():
    if len(itemset) < 2:
        continue
    for r in range(1, len(itemset)):
        for left in combinations(itemset, r):
            right = tuple(x for x in itemset if x not in left)
            sup_left = all_frequent.get(tuple(sorted(left)), 0)
            if sup_left == 0:
                continue
            conf = sup_count / sup_left
            if conf < 0.6:
                continue
            sup_right = all_frequent.get(tuple(sorted(right)), 0) / n
            lift = conf / sup_right if sup_right else 0
            print(f"  {'/'.join(left)} -> {'/'.join(right)}  conf={conf:.2f}  lift={lift:.2f}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'mining-freq-c1-e1',
        type: 'single',
        difficulty: 2,
        question: 'Apriori 算法能大幅剪枝的核心依据是？',
        options: [
          { value: 'A', text: '事务数量很大' },
          { value: 'B', text: '频繁项集的所有子集必频繁（反单调性）' },
          { value: 'C', text: '项集长度有限' },
          { value: 'D', text: '支持度阈值很高' },
        ],
        answer: 'B',
        explanation:
          '加入更多项只会让支持度单调不增，所以不频繁项集的所有超集都不频繁。这让大量候选可以直接跳过，把指数搜索变成可行。',
        tags: ['Apriori 原理'],
      },
      {
        id: 'mining-freq-c1-e2',
        type: 'judge',
        difficulty: 2,
        question: '关联规则的置信度高就说明这条规则有价值。',
        answer: false,
        explanation:
          '必须看 lift。如果 Y 本身支持度就很高（如买牛奶），"X → Y"的置信度自然高，但 lift 可能接近 1，说明没有实际关联价值。',
        tags: ['置信度 vs lift'],
      },
      {
        id: 'mining-freq-c1-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Apriori 的主要性能瓶颈是？（多选）',
        options: [
          { value: 'A', text: '候选项集数量可能指数增长' },
          { value: 'B', text: '需要多次完整扫描数据库（K 层扫 K 遍）' },
          { value: 'C', text: '不支持并行计算' },
          { value: 'D', text: '无法处理稀疏数据' },
        ],
        answer: ['A', 'B'],
        explanation:
          'C 错误（Apriori 可以并行化）。D 也不准确。真正的瓶颈是候选爆炸与多次全表扫描——后者催生了 FP-Growth（只需扫 2 遍）。',
        tags: ['性能'],
      },
      {
        id: 'mining-freq-c1-e4',
        type: 'fill',
        difficulty: 3,
        question: 'lift(X → Y) = confidence(X → Y) / ___。',
        blanks: [['support(Y)', 'support of Y', '支持度(Y)', 'sup(Y)']],
        explanation:
          'lift 衡量 X 对 Y 的促进作用相对于 Y 本身的基准流行度。lift > 1 正相关，= 1 独立，< 1 负相关。',
        tags: ['lift'],
      },
      {
        id: 'mining-freq-c1-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算支持度：support(transactions, itemset)，返回包含该 itemset 的事务比例（保留 4 位小数）。',
        starterCode: `def support(transactions, itemset):
    target = set(itemset)
    cnt = ___
    return ___
`,
        setupCode:
          'transactions = [{1,2,3}, {1,2}, {2,3}, {1,3}, {1,2,3}]\nitemset = {1,2}',
        expectedOutput: '0.6',
        tests: `transactions = [{1,2,3}, {1,2}, {2,3}, {1,3}, {1,2,3}]
assert abs(support(transactions, {1,2}) - 0.6) < 1e-6, f"应为 0.6，实际 {support(transactions,{1,2})}"
assert abs(support(transactions, {3}) - 0.8) < 1e-6, "3 出现 4/5 次"
assert support(transactions, {9}) == 0.0, "不存在的项应为 0"
assert abs(support(transactions, {1,2,3}) - 0.4) < 1e-6
`,
        answer: `def support(transactions, itemset):
    target = set(itemset)
    cnt = sum(1 for t in transactions if target <= set(t))
    return round(cnt / len(transactions), 4)
`,
        explanation:
          '```python\ncnt = sum(1 for t in transactions if target <= set(t))\nreturn round(cnt / len(transactions), 4)\n```\n\n用 `target <= set(t)`（子集判断）比 `itemset.issubset(t)` 更简洁。\n\n支持度是 Apriori 每一步的统计核心。',
        tags: ['编程', '支持度'],
      },
      {
        id: 'mining-freq-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算 lift：lift(transactions, x, y)，返回 lift(X→Y)。\n\n若 support(X) 或 support(Y) 为 0 则返回 0.0，结果保留 4 位小数。',
        starterCode: `def lift(transactions, x, y):
    sx = ___
    sy = ___
    sxy = ___
    if sx == 0 or sy == 0:
        return 0.0
    return ___
`,
        setupCode:
          'transactions = [{1,2,3}, {1,2}, {2,3}, {1,3}, {1,2,3}]',
        expectedOutput: 'lift({1} -> {2})',
        tests: `t = [{1,2,3}, {1,2}, {2,3}, {1,3}, {1,2,3}]
# sup({1})=4/5, sup({2})=4/5, sup({1,2})=3/5 -> conf=3/4, lift=0.75/0.8=0.9375
assert abs(lift(t, {1}, {2}) - 0.9375) < 1e-3, f"应为 0.9375，实际 {lift(t,{1},{2})}"
assert lift(t, {9}, {1}) == 0.0, "不存在的项应返回 0"
# 完全相同项集
l = lift(t, {1,2,3}, {1,2})
assert l > 1, f"子集必然正相关，lift 应 > 1，实际 {l}"
`,
        answer: `def support(transactions, itemset):
    target = set(itemset)
    cnt = sum(1 for t in transactions if target <= set(t))
    return round(cnt / len(transactions), 4)

def lift(transactions, x, y):
    sx = support(transactions, x)
    sy = support(transactions, y)
    sxy = support(transactions, set(x) | set(y))
    if sx == 0 or sy == 0:
        return 0.0
    conf = sxy / sx
    return round(conf / sy, 4)
`,
        explanation:
          '```python\nsx = support(transactions, x)\nsy = support(transactions, y)\nsxy = support(transactions, set(x) | set(y))\nif sx == 0 or sy == 0:\n    return 0.0\nconf = sxy / sx\nreturn round(conf / sy, 4)\n```\n\nlift = confidence(X→Y) / support(Y)，也等于 support(X∪Y) / (support(X)·support(Y))。\n\n**若 Y 是 X∪Z 的子集，lift 必然 > 1**——这是数学上的必然，可作为检验。',
        tags: ['编程', 'lift'],
      },
      {
        id: 'mining-freq-c1-e7',
        type: 'judge',
        difficulty: 3,
        question: '若规则 A → B 的 lift = 0.8，说明 A 与 B 相互抑制（负相关）。',
        answer: true,
        explanation:
          'lift < 1 表示 A 出现时 B 的概率低于 B 的基准概率，即 A 抑制 B 的出现。但需注意统计显著性——小样本下 lift 波动很大。',
        tags: ['lift'],
      },
      {
        id: 'mining-freq-c1-e8',
        type: 'open',
        difficulty: 4,
        question:
          '请完整解释 Apriori 算法：核心原理、算法流程、为什么需要多次扫描、以及在大数据场景下有哪些改进方案。',
        referenceAnswer: `**一、核心原理：反单调性（Apriori 原理）**

> 频繁项集的所有子集必然也是频繁的；
> 等价地，非频繁项集的所有超集必然也是非频繁的。

**证明**：设 X ⊂ Y，则任何包含 Y 的事务必然包含 X，
所以 count(Y) ≤ count(X)。若 count(X) < min_sup，则 count(Y) 也必然 < min_sup。

**价值**：把指数级的候选空间大幅剪枝。
若 {A,B} 不频繁，则 {A,B,C}、{A,B,D}、{A,B,C,D}… 全部可以跳过。

**二、算法流程**

    1. 扫描 D，统计所有单项计数 → L1（频繁 1-项集）
    2. k = 2
    3. while L(k-1) 非空:
         a. 连接：L(k-1) 中前 k-2 项相同的项集两两合并，得到 Ck
         b. 剪枝：删除 Ck 中含有非频繁 (k-1) 子集的候选
         c. 扫描 D，统计 Ck 中每个候选的计数
         d. Lk = {c ∈ Ck : count(c) ≥ min_sup}
         e. k += 1
    4. 输出所有 Lk 的并集

**三、为什么需要多次扫描**

Apriori 是**逐层（level-wise）**的：先找全部 1-项集，再 2-项集……

- 每一层都需要知道候选集的**精确计数**；
- 而计数只能通过扫描数据库得到；
- 所以最大频繁项集长度为 K 时，需要扫描 K 遍。

**为什么这是致命的**：大数据场景下数据在磁盘/分布式存储上，
每遍扫描都是大量的 I/O。K=10 就意味着读 10 遍全量数据。

**四、改进方案**

**① FP-Growth（最主流）**

- 用 FP-Tree 压缩数据库（相同前缀共享路径）；
- **不需要生成候选集**；
- **只需扫描 2 遍**（一遍计数、一遍建树）；
- 通过递归挖掘条件模式基得到频繁项集。

**② PCY（Park-Chen-Yu）**

- 第一遍扫描时用哈希表统计 2-项集的桶计数；
- 用桶计数做剪枝（类似 Bloom filter 的思想）；
- 减少第二遍的候选数量。

**③ 采样与分区**

- **采样**：在数据子集上挖掘，用略低的 min_sup 保证召回；
- **分区**：把 D 分成若干块，各块独立挖掘，再合并（可能产生少量假阳性，需二次验证）。

**④ 并行与分布式**

- 按数据划分（各节点处理数据分片，然后汇总计数）；
- 按候选划分（各节点负责不同候选集）；
- 典型实现：Spark 的 FP-Growth。

**五、实践建议**

1. **小数据用 Apriori**：实现简单、结果精确；
2. **大数据用 FP-Growth**：避免多次扫描与候选爆炸；
3. **min_sup 要调**：太低跑不动，太高没结果。先在小样本上试，找到规则数可接受的区间；
4. **务必看 lift**：只用支持度/置信度会挖出一堆"买钻石→买牛奶"式的伪关联。`,
        rubric: [
          { point: '反单调性原理及简要证明', score: 2 },
          { point: '完整算法流程（连接 + 剪枝 + 计数）', score: 2 },
          { point: '解释为什么逐层需要多次扫描，I/O 是瓶颈', score: 2 },
          { point: '至少三种改进方案（FP-Growth / PCY / 采样分区 / 并行）', score: 3 },
          { point: '强调 lift 的作用与 min_sup 调参', score: 1 },
        ],
        keywords: ['反单调性', '连接', '剪枝', '逐层', 'FP-Growth', 'PCY', 'lift'],
        explanation:
          '能说清"逐层扫描导致 K 遍 I/O"这个瓶颈，就理解了为什么 FP-Growth 是更优解。',
        tags: ['Apriori', '综合'],
      },
      {
        id: 'mining-freq-c1-e9',
        type: 'code',
        difficulty: 3,
        question:
          '实现 Apriori 的剪枝检查：is_candidate_valid(candidate, prev_frequent, k)。\n\n- candidate: 候选 k-项集（tuple）\n- prev_frequent: 上一层的频繁 (k-1)-项集集合\n- 若 candidate 的所有 (k-1)-子集都在 prev_frequent 中，返回 True',
        starterCode: `from itertools import combinations

def is_candidate_valid(candidate, prev_frequent, k):
    ___
`,
        setupCode: '',
        expectedOutput: '检查所有子集是否频繁',
        tests: `L2 = {(1,2), (1,3), (2,3)}
assert is_candidate_valid((1,2,3), L2, 3) == True, "所有子集都频繁，应通过"
L2b = {(1,2), (1,4)}
assert is_candidate_valid((1,2,4), L2b, 3) == False, "(2,4) 不频繁，应剪掉"
assert is_candidate_valid((5,6,7), L2, 3) == False
L1 = {(1,), (2,)}
assert is_candidate_valid((1,2), L1, 2) == True
`,
        answer: `from itertools import combinations

def is_candidate_valid(candidate, prev_frequent, k):
    for sub in combinations(candidate, k - 1):
        if tuple(sorted(sub)) not in prev_frequent:
            return False
    return True
`,
        explanation:
          '这是 Apriori 剪枝的核心：任何 (k-1)-子集不频繁，该候选必然不频繁。\n\n`tuple(sorted(sub))` 保证与 prev_frequent 的存储形式一致（有序）。',
        tags: ['编程', 'Apriori 剪枝'],
      },
      {
        id: 'mining-freq-c1-e10',
        type: 'open',
        difficulty: 4,
        question:
          '零售商的关联规则挖掘结果里出现了「买钻石 → 买牛奶」，置信度 0.85，但运营认为这条规则没有价值。请分析原因，并说明应该用什么指标判断、如何筛选出真正有用的规则。',
        referenceAnswer: `**一、为什么这条规则没价值**

置信度 0.85 表示买钻石的人有 85% 也买牛奶，看起来很强。
但关键在于：牛奶本身就是高支持度商品。

假设：
- 买钻石的顾客占 0.1%
- 买牛奶的顾客占 80%

那么对随机一个顾客，买牛奶的先验概率就是 0.8。
买钻石的人买牛奶的概率是 0.85，只比基准高 0.05。

    lift = confidence / support(牛奶) = 0.85 / 0.80 = 1.06

lift 接近 1，说明几乎独立——钻石并不能促进牛奶销售，
只是买钻石的人本来就会买牛奶。

**二、应该看哪些指标**

| 指标 | 作用 |
| --- | --- |
| lift | 最重要。大于 1 才说明正相关，接近 1 无价值 |
| 支持度 | 规则覆盖多少交易，太低则不可行动 |
| 置信度 | 条件概率，单独看会误导 |
| leverage = support(X∪Y) - support(X)·support(Y) | 关联强度的绝对量 |
| conviction = (1-support(Y)) / (1-confidence) | 对规则违反的敏感度 |

**三、筛选真正有用的规则**

1. 同时设三个阈值：min_sup（可行动）+ min_conf（可靠）+ min_lift（大于 1.2）；
2. 剔除平凡规则：如果 Y 的支持度大于 0.7，任何 X→Y 的 lift 都不会高；
3. 按业务价值排序：lift 高但支持度极低的规则不可行动，需要平衡；
4. 验证因果性：关联不等于因果，要用 A/B 实验或 uplift 模型验证；
5. 人工审核：让业务方看规则是否有合理解释。

**四、更好的做法：直接建模 uplift**

关联规则只能发现共现，不能告诉你能不能通过推荐 X 来促进 Y。
现代做法是用 uplift modeling 直接估计"推荐 X 后购买 Y 的概率提升了多少"。

**五、结论**

    置信度 0.85 + 牛奶支持度 0.8
    → lift 约 1.06，几乎独立
    → 统计上常见但业务上无用的典型

判断标准始终是：这条规则能否带来可行动的、可验证的业务增益。`,
        rubric: [
          { point: '指出牛奶本身高支持度导致 lift 接近 1', score: 3 },
          { point: '正确计算 lift 并解释其含义', score: 2 },
          { point: '列出应关注的指标（lift/leverage/conviction）', score: 2 },
          { point: '提出多阈值 + 剔除平凡规则 + 业务价值排序', score: 2 },
          { point: '提到关联≠因果，建议 uplift 或 A/B 验证', score: 1 },
        ],
        keywords: ['lift', '高支持度', '平凡规则', 'leverage', 'uplift', '因果'],
        explanation:
          '核心是理解「置信度会被 Y 的基准流行度污染」。能算出 lift 并指出这是典型的高置信度伪关联，就掌握了关联规则评估的本质。',
        tags: ['关联规则', '综合'],
      },
    ],
  },
];
