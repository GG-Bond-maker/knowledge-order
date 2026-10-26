import type { Chapter } from '../../types';

/* ============================================================
 *  《算法与数据结构》课程
 *
 *  权威参考：《算法导论》(CLRS)、MIT 6.006、Princeton Algorithms、
 *           《剑指 Offer》/ LeetCode 高频题、Sedgewick & Wayne。
 *
 *  写作约定：
 *    1. 正文 / 题干 / 解析 / tips 中的行内代码用转义反引号 \`代码\`；
 *    2. 代码字段（code / starterCode / tests / setupCode / answer）内部禁止出现反引号；
 *    3. 编程题在浏览器 Pyodide（Python 3.13）中执行，只用标准库；
 *    4. 编程题 tests 每行一条 assert，逐行计分，可用变量 out。
 *
 *  难度分级：第 1 章 1~2；第 2~4 章 2~3；第 5~7 章 3~4；第 8 章 3~5。
 * ============================================================ */

export const algoExtra1: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  第 1 章：复杂度与算法思维（难度 1~2）
   * ============================================================ */
  {
    id: 'algo-1',
    title: '复杂度与算法思维',
    goal: '掌握大 O 记号、常见复杂度量级与空间复杂度分析，能对一段代码快速估算运行时间，并理解递归式与主定理的直观含义。',
    lessons: [
      {
        id: 'algo-l-1-1',
        title: '时间复杂度：大 O 记号到底在说什么',
        content: `
### 学习目标

学完本节，你应该能够：
1. 用增长上界的语言解释大 O，手推 T(n)=3n²+5n+100→O(n²)；
2. 默写量级表与『数据规模→可接受复杂度』对照表（n≤1e5→O(n log n)）；
3. 用三法则（顺序取最大/嵌套相乘/减半为 log）分析给定代码的复杂度。

### 前置知识

- Python 的 for/while 基础语法；
- 指数与对数的直观概念。

### 问题背景

面试官问「这个解法复杂度多少」，实际在问：数据量扩大 10 倍，你的程序慢多少倍？LeetCode 上 n≤1e5 的题用 O(n²) 必然超时——复杂度是『能不能过』的判决书，不是学术装饰。本章把大 O 的直觉、量级表、分析三法则与递归式/主定理一次讲透。

### 直觉理解

大 O 是『增长斜率』而非『运行秒数』：T(n)=3n²+5n+100 里，n=1e6 时 3n² 是 3e12 而 5n 只有 5e6，低阶项和常数在数量级面前不值一提。把算法想成交通工具：O(1) 传送门、O(log n) 电梯（层数翻倍只多走一层）、O(n) 走楼梯、O(n²) 逐格爬、O(2ⁿ) 细胞分裂——n 变大时，交通工具的种类决定你到不到得了。

### 核心概念与原理详解

## 为什么要先学复杂度

同一道题，暴力解法可能跑 10 秒，优化后只要 0.1 秒。**判断一个算法"能不能过"的依据就是复杂度**。
面试官问"你的解法复杂度是多少"，本质上是在问：**数据量扩大 10 倍时，你的程序会慢多少倍？**

## 大 O 的直观定义

大 O 描述的是**输入规模 n 趋于无穷时，运行时间的增长上界**，忽略常数和低阶项：

\`\`\`
T(n) = 3n² + 5n + 100  →  O(n²)
T(n) = 2n + 7          →  O(n)
T(n) = 1000            →  O(1)
\`\`\`

**为什么可以忽略常数**：当 n = 10⁶ 时，3n² 项是 3×10¹²，而 5n 只有 5×10⁶——
常数和大小的差距在数量级面前不值一提。

## 常见复杂度量级（从快到慢）

| 复杂度 | 名称 | n=10⁶ 时的操作数 | 典型算法 |
| --- | --- | --- | --- |
| O(1) | 常数 | 1 | 哈希查找、数组下标 |
| O(log n) | 对数 | ≈ 20 | 二分查找、平衡树 |
| O(n) | 线性 | 10⁶ | 一次遍历、前缀和 |
| O(n log n) | 线性对数 | ≈ 2×10⁷ | 归并排序、堆排序 |
| O(n²) | 平方 | 10¹²（超时） | 双重循环、冒泡排序 |
| O(n³) | 立方 | 10¹⁸（不可行） | 朴素矩阵乘法 |
| O(2ⁿ) | 指数 | 天文数字 | 朴素递归斐波那契 |
| O(n!) | 阶乘 | 更夸张 | 全排列 |

## 实战：看到数据量猜复杂度

这是刷题和面试中**最实用的一条经验**：

| 数据规模 n | 可接受的复杂度 |
| --- | --- |
| ≤ 10 | O(n!) / O(2ⁿ) |
| ≤ 20 | O(2ⁿ) |
| ≤ 100 | O(n³) |
| ≤ 1000 | O(n²) |
| ≤ 10⁵ ~ 10⁶ | O(n log n) |
| ≤ 10⁷ ~ 10⁸ | O(n) |
| 任意 | O(log n) / O(1) |

> 记住这条表：**看到 n ≤ 10⁵ 就该想 O(n log n)，看到 n ≤ 20 才考虑状压/暴搜。**

## 如何分析一段代码

**rule 1：顺序语句取最大**

\`\`\`python
a = 1            # O(1)
for i in range(n):   # O(n)
    ...
total = sum(x)   # O(n)
# 整体：O(n) + O(n) = O(n)
\`\`\`

**rule 2：嵌套循环相乘**

\`\`\`python
for i in range(n):        # n 次
    for j in range(n):    # 每次 n 次
        ...               # 共 n² 次 → O(n²)

for i in range(n):
    for j in range(i):    # 1+2+...+n = n(n-1)/2
        ...               # → 仍是 O(n²)
\`\`\`

**rule 3：循环变量每次除以常数**

\`\`\`python
while n > 1:
    n //= 2        # n 变成 n/2, n/4, ... 共 log₂n 次
# → O(log n)
\`\`\`

**rule 4：循环变量每步加常数**

\`\`\`python
i = 0
while i < n:
    i += 3        # n/3 次 → O(n)
\`\`\`

## 最好、最坏、平均复杂度

\`\`\`python
def find(arr, target):
    for i, x in enumerate(arr):
        if x == target:
            return i
    return -1
\`\`\`

- **最好**：目标在第一位 → O(1)
- **最坏**：目标不在数组里 → O(n)
- **平均**：假设均匀分布 → O(n)

算法分析通常关注**最坏情况**（保证上限），有时也关注平均（如快速排序）。

## 一个易错点：循环里的内置操作

\`\`\`python
for x in nums:
    if x in result:      # result 是 list → 每次 O(k)，总 O(n·k) = O(n²)
        ...
    result.append(x)
\`\`\`

看似一个循环，实际是 O(n²)。改用 \`set\` 后降到 O(n)——
**这是刷题中最高频的优化点之一。**

<ComplexityGrowthDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import math, time
from functools import lru_cache

# ---- 1. n 扩大 10 倍：各复杂度操作数的倍率 ----
fs = [("O(1)", lambda n: 1), ("O(log n)", lambda n: math.log2(n)), ("O(n)", lambda n: n),
      ("O(n log n)", lambda n: n*math.log2(n)), ("O(n^2)", lambda n: n*n), ("O(2^n)", lambda n: 2.0**min(n, 60))]
pairs = {"O(2^n)": (20, 30)}
for name, f in fs:
    n1, n2 = pairs.get(name, (10**3, 10**4))
    a, b = f(n1), f(n2)
    print(f"{name:10} n:{n1:g}->{n2:g}  {a:>9.3g} -> {b:>9.3g}  倍率 {b/a:>6.1f}")

# ---- 2. 暴力 fib vs 记忆化：重复子问题的代价 ----
def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)
@lru_cache(maxsize=None)
def fib_memo(n): return n if n < 2 else fib_memo(n-1) + fib_memo(n-2)
t0 = time.perf_counter(); r1 = fib(30); t1 = time.perf_counter()
r2 = fib_memo(300); t2 = time.perf_counter()
print(f"fib(30)={r1} 暴力 {1000*(t1-t0):.1f} ms | fib_memo(300) {1000*(t2-t1):.3f} ms")

# ---- 3. 递归树模拟主定理：归并排序每层代价 n、共 log2(n) 层 ----
n = 1024
total, width, layers = 0, n, 0
while width > 1:
    total += n; width //= 2; layers += 1
print(f"归并 n={n}: 总代价 {total} = n × log2(n)（{layers} 层）")

# ---- 4. 递归的空间：栈帧深度 ----
def depth(n):
    return 1 if n <= 1 else 1 + depth(n-1)
print("递归 fact(900) 栈深 =", depth(900), "→ O(n) 空间；迭代版 O(1)")\`\`\`

预期输出（实测）：倍率实测：O(1)=1、O(log n)=1.3、O(n)=10、O(n log n)=13.3、O(n²)=100（n:1e3→1e4），O(2ⁿ) n:20→30 倍率 1024；fib(30)=832040 暴力约 124 ms，fib_memo(300) 仅 0.3 ms；归并 n=1024 递归树总代价 10240 = n×log2(n)（10 层）；递归 fact(900) 栈深 900 → O(n) 空间。

**常见错误**：只看最内层循环忽略外层（嵌套相乘法则）；把 O(2n) 写成 O(2n) 而不是 O(n)——大 O 不带常数；对『循环变量每次减半』的 while 循环按 O(n) 算（应为 O(log n)）。

### 常见误区

1. **『大 O 是精确运行时间』**——它只描述增长上界，常数因子与低阶项被舍弃，实际快慢要靠 benchmark；\\n2. **『O(n log n) 一定比 O(n) 慢很多』**——n=1e6 时只差约 20 倍常数级，但 O(n²) 差 1e5 倍，量级才是分水岭；\\n3. **『递归的时间复杂度就是递归次数』**——要看递归式：fib 的 T(n)=T(n-1)+T(n-2) 是 O(2ⁿ)，二分是 O(log n)，结构决定复杂度。

### 知识关联

- **向前**：本章三法则是 c2 数组操作分析与 c4 排序族比较的度量衡；
- **向后**：第 8 章动态规划把『记忆化消重复子问题』发展成方法论；
- **平行**：python-foundations 的 for/while 基础语法是本章分析的对象。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 大 O | n→∞ 时的增长上界，忽略常数与低阶项 |
| 量级表 | 1 < log n < n < n log n < n² < 2ⁿ < n! |
| 三法则 | 顺序取最大、嵌套相乘、减半为 log |
| 实战 | n≤1e5→O(n log n)；n≤20→可暴搜 |
| 主定理 | T=aT(n/b)+f(n)，比较 f 与 n^c（c=log_b a）|

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）


### 核心图解与交互演示

<Diagram type="cxgrowth" />
`,
        tips: [
          {
            kind: 'interview',
            text: '面试答题模板："时间复杂度 O(n log n)，因为外层遍历 n 次，每次内部排序 log n；空间复杂度 O(n)，用了额外结果数组。"主动报复杂度是加分项。',
          },
          {
            kind: 'performance',
            text: 'Python 中 `x in list` 是 O(n)，`x in set` 是 O(1)。把内层循环的 list 查找改成 set，是最常见的从 O(n²) 降到 O(n) 的手段。',
          },
          {
            kind: 'pitfall',
            text: '嵌套循环不一定是 O(n²)：如果内层循环次数与外层无关且很小（如遍历 26 个字母），可以视为常数，整体仍是 O(n)。',
          },
          {
            kind: 'note',
            text: '空间复杂度要算"额外空间"，不包含输入本身。递归的空间复杂度还要算上调用栈深度。',
          },
        ],
        demos: [
          {
            title: '用实测验证复杂度',
            lang: 'python',
            code: `import time

def count_ops_linear(n):
    c = 0
    for i in range(n):
        c += 1
    return c

def count_ops_quadratic(n):
    c = 0
    for i in range(n):
        for j in range(n):
            c += 1
    return c

for n in (100, 200, 400):
    t0 = time.perf_counter(); count_ops_linear(n); t1 = time.perf_counter()
    t2 = time.perf_counter(); count_ops_quadratic(n); t3 = time.perf_counter()
    print(f"n={n:4d}  线性 {(t1-t0)*1e3:7.3f}ms  平方 {(t3-t2)*1e3:8.3f}ms")
print("\\nn 翻倍时：线性耗时约 ×2，平方耗时约 ×4 —— 这就是复杂度")`,
          },
        ],
      },
      {
        id: 'algo-l-1-2',
        title: '空间复杂度与原地算法',
        content: `
### 学习目标

学完本节，你应该能够：
1. 区分总空间与『额外空间』，判断给定函数是 O(1) 还是 O(n)；
2. 解释递归调用的栈帧成本（fact 递归为 O(n) 空间），说明递归改迭代为何省空间；
3. 用 two_sum 对比 O(n²)+O(1) vs O(n)+O(n) 的时空权衡，并复述『先暴力后优化』的面试策略。

### 前置知识

- 「时间复杂度：大 O 记号到底在说什么」（l1-1）；
- 函数调用栈的基本概念。

### 问题背景

面试官问「这个解法复杂度多少」，实际在问：数据量扩大 10 倍，你的程序慢多少倍？LeetCode 上 n≤1e5 的题用 O(n²) 必然超时——复杂度是『能不能过』的判决书，不是学术装饰。本章把大 O 的直觉、量级表、分析三法则与递归式/主定理一次讲透。

### 直觉理解

大 O 是『增长斜率』而非『运行秒数』：T(n)=3n²+5n+100 里，n=1e6 时 3n² 是 3e12 而 5n 只有 5e6，低阶项和常数在数量级面前不值一提。把算法想成交通工具：O(1) 传送门、O(log n) 电梯（层数翻倍只多走一层）、O(n) 走楼梯、O(n²) 逐格爬、O(2ⁿ) 细胞分裂——n 变大时，交通工具的种类决定你到不到得了。

### 核心概念与原理详解

## 空间复杂度看的是"额外空间"

空间复杂度 O(f(n)) 衡量的是**除输入外额外占用的空间**。

\`\`\`python
def sum_list(nums):        # O(1) 额外空间：只有一个累加变量
    s = 0
    for x in nums:
        s += x
    return s

def double_all(nums):      # O(n) 额外空间：新建了同规模的列表
    return [x * 2 for x in nums]
\`\`\`

## 递归的空间：调用栈也是空间

\`\`\`python
def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)
\`\`\`

递归深度为 n，每层一个栈帧 → **空间复杂度 O(n)**。
改成迭代：

\`\`\`python
def fact_iter(n):
    r = 1
    for i in range(2, n + 1):
        r *= i
    return r      # O(1) 空间
\`\`\`

**这就是"递归改迭代"常被当作优化点的原因之一。**

## 原地算法（in-place）

「原地」指只使用 O(1) 额外空间修改输入。常见的原地操作：

| 操作 | 原地版本 | 非原地版本 |
| --- | --- | --- |
| 反转数组 | 双指针交换 | \`a[::-1]\` |
| 排序 | \`list.sort()\`（O(log n) 栈） | \`sorted(a)\` |
| 去重 | 双指针覆盖 | \`list(set(a))\` |

\`\`\`python
def reverse_in_place(a):
    i, j = 0, len(a) - 1
    while i < j:
        a[i], a[j] = a[j], a[i]
        i += 1
        j -= 1
\`\`\`

## 空间换时间：哈希表

最经典的权衡：

\`\`\`python
# O(n²) 时间，O(1) 空间
def two_sum_slow(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]

# O(n) 时间，O(n) 空间
def two_sum_fast(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        if target - x in seen:
            return [seen[target - x], i]
        seen[x] = i
\`\`\`

**面试建议**：先说暴力解（并说明复杂度），再说优化方向（空间换时间），最后写优化解。
这展示了完整的思考过程，比直接写最优解更容易拿高分。

## 内存中的常数因子也很重要

同为 O(n) 空间，一个存整数列表和一个存字典的开销相差数倍。
在内存受限场景（如 LeetCode 的内存限制），常数因子会影响能否通过。

> 记住一句话：**复杂度的常数在理论上可以忽略，在工程上往往决定成败。**

<ComplexityGrowthDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import math, time
from functools import lru_cache

# ---- 1. n 扩大 10 倍：各复杂度操作数的倍率 ----
fs = [("O(1)", lambda n: 1), ("O(log n)", lambda n: math.log2(n)), ("O(n)", lambda n: n),
      ("O(n log n)", lambda n: n*math.log2(n)), ("O(n^2)", lambda n: n*n), ("O(2^n)", lambda n: 2.0**min(n, 60))]
pairs = {"O(2^n)": (20, 30)}
for name, f in fs:
    n1, n2 = pairs.get(name, (10**3, 10**4))
    a, b = f(n1), f(n2)
    print(f"{name:10} n:{n1:g}->{n2:g}  {a:>9.3g} -> {b:>9.3g}  倍率 {b/a:>6.1f}")

# ---- 2. 暴力 fib vs 记忆化：重复子问题的代价 ----
def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)
@lru_cache(maxsize=None)
def fib_memo(n): return n if n < 2 else fib_memo(n-1) + fib_memo(n-2)
t0 = time.perf_counter(); r1 = fib(30); t1 = time.perf_counter()
r2 = fib_memo(300); t2 = time.perf_counter()
print(f"fib(30)={r1} 暴力 {1000*(t1-t0):.1f} ms | fib_memo(300) {1000*(t2-t1):.3f} ms")

# ---- 3. 递归树模拟主定理：归并排序每层代价 n、共 log2(n) 层 ----
n = 1024
total, width, layers = 0, n, 0
while width > 1:
    total += n; width //= 2; layers += 1
print(f"归并 n={n}: 总代价 {total} = n × log2(n)（{layers} 层）")

# ---- 4. 递归的空间：栈帧深度 ----
def depth(n):
    return 1 if n <= 1 else 1 + depth(n-1)
print("递归 fact(900) 栈深 =", depth(900), "→ O(n) 空间；迭代版 O(1)")\`\`\`

预期输出（实测）：倍率实测：O(1)=1、O(log n)=1.3、O(n)=10、O(n log n)=13.3、O(n²)=100（n:1e3→1e4），O(2ⁿ) n:20→30 倍率 1024；fib(30)=832040 暴力约 124 ms，fib_memo(300) 仅 0.3 ms；归并 n=1024 递归树总代价 10240 = n×log2(n)（10 层）；递归 fact(900) 栈深 900 → O(n) 空间。

**常见错误**：只看最内层循环忽略外层（嵌套相乘法则）；把 O(2n) 写成 O(2n) 而不是 O(n)——大 O 不带常数；对『循环变量每次减半』的 while 循环按 O(n) 算（应为 O(log n)）。

### 常见误区

1. **『大 O 是精确运行时间』**——它只描述增长上界，常数因子与低阶项被舍弃，实际快慢要靠 benchmark；\\n2. **『O(n log n) 一定比 O(n) 慢很多』**——n=1e6 时只差约 20 倍常数级，但 O(n²) 差 1e5 倍，量级才是分水岭；\\n3. **『递归的时间复杂度就是递归次数』**——要看递归式：fib 的 T(n)=T(n-1)+T(n-2) 是 O(2ⁿ)，二分是 O(log n)，结构决定复杂度。

### 知识关联

- **向前**：本章三法则是 c2 数组操作分析与 c4 排序族比较的度量衡；
- **向后**：第 8 章动态规划把『记忆化消重复子问题』发展成方法论；
- **平行**：python-foundations 的 for/while 基础语法是本章分析的对象。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 大 O | n→∞ 时的增长上界，忽略常数与低阶项 |
| 量级表 | 1 < log n < n < n log n < n² < 2ⁿ < n! |
| 三法则 | 顺序取最大、嵌套相乘、减半为 log |
| 实战 | n≤1e5→O(n log n)；n≤20→可暴搜 |
| 主定理 | T=aT(n/b)+f(n)，比较 f 与 n^c（c=log_b a）|

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）
`,
        tips: [
          {
            kind: 'interview',
            text: '被问"能不能不用额外空间"时，一般考察"双指针""原地修改"技巧，如移除元素、移动零、颜色分类。',
          },
          {
            kind: 'pitfall',
            text: '递归的空间复杂度容易漏算调用栈。一个 O(1) 额外变量的递归函数，空间仍是 O(递归深度)。',
          },
          {
            kind: 'note',
            text: '`sorted()` 使用 Timsort，额外空间 O(n)；`list.sort()` 原地排序，额外空间 O(log n)。',
          },
        ],
        demos: [
          {
            title: '原地反转 vs 切片反转',
            lang: 'python',
            code: `def reverse_in_place(a):
    i, j = 0, len(a) - 1
    while i < j:
        a[i], a[j] = a[j], a[i]
        i += 1
        j -= 1
    return a

data = [1, 2, 3, 4, 5]
print("原地反转:", reverse_in_place(data), "（原列表被修改）")

data2 = [1, 2, 3, 4, 5]
print("切片反转:", data2[::-1], "（原列表未变:", data2, "）")`,
          },
        ],
      },
      {
        id: 'algo-l-1-3',
        title: '分治、递归式与主定理',
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出分治递归式 T(n)=aT(n/b)+f(n) 并对归并/二分/树遍历分别求解；
2. 用主定理三种情况或递归树法定出复杂度（归并：每层 n × log n 层）；
3. 解释 fib 朴素递归 O(2ⁿ) 的重复子问题根源与记忆化修复到 O(n)。

### 前置知识

- 「时间复杂度」（l1-1）的三法则；
- 对数运算 log_b(a)。

### 问题背景

面试官问「这个解法复杂度多少」，实际在问：数据量扩大 10 倍，你的程序慢多少倍？LeetCode 上 n≤1e5 的题用 O(n²) 必然超时——复杂度是『能不能过』的判决书，不是学术装饰。本章把大 O 的直觉、量级表、分析三法则与递归式/主定理一次讲透。

### 直觉理解

大 O 是『增长斜率』而非『运行秒数』：T(n)=3n²+5n+100 里，n=1e6 时 3n² 是 3e12 而 5n 只有 5e6，低阶项和常数在数量级面前不值一提。把算法想成交通工具：O(1) 传送门、O(log n) 电梯（层数翻倍只多走一层）、O(n) 走楼梯、O(n²) 逐格爬、O(2ⁿ) 细胞分裂——n 变大时，交通工具的种类决定你到不到得了。

### 核心概念与原理详解

## 递归式是什么

分治算法的复杂度通常写成递归式（递推关系）：

\`\`\`
T(n) = a·T(n/b) + f(n)
\`\`\`

含义：把规模 n 的问题拆成 **a** 个子问题，每个规模 **n/b**，合并需要 f(n) 时间。

## 三个经典例子

| 算法 | 递归式 | 复杂度 |
| --- | --- | --- |
| 归并排序 | T(n) = 2T(n/2) + O(n) | **O(n log n)** |
| 二分查找 | T(n) = T(n/2) + O(1) | **O(log n)** |
| 二叉树遍历 | T(n) = 2T(n/2) + O(1) | **O(n)** |

## 主定理（Master Theorem）速记

对 T(n) = a·T(n/b) + f(n)，令 c = log_b(a)：

1. **f(n) 增长慢于 n^c** → T(n) = O(n^c)（叶子主导）
2. **f(n) 与 n^c 同阶** → T(n) = O(n^c · log n)
3. **f(n) 增长快于 n^c** → T(n) = O(f(n))（根节点主导）

**用归并排序验证**：a=2, b=2, c=log₂2=1，f(n)=O(n) 与 n¹ 同阶 → 第 2 种 → **O(n log n)** ✓

**用二分查找验证**：a=1, b=2, c=log₂1=0，f(n)=O(1) 与 n⁰ 同阶 → **O(log n)** ✓

## 递归树法（更直观）

以归并排序为例，画递归树：

\`\`\`
                    n              ← 第 0 层，代价 n
           n/2            n/2       ← 第 1 层，总代价 n
       n/4 n/4        n/4 n/4       ← 第 2 层，总代价 n
       ...                          ← 共 log n 层
\`\`\`

每层总代价都是 n，共 log n 层 → **O(n log n)**。

> 递归树法几乎能解决所有常见递归式，考试和面试都用得上。

## 递归的代价

\`\`\`python
def fib(n):
    if n < 2:
        return n
    return fib(n - 1) + fib(n - 2)
\`\`\`

T(n) = T(n-1) + T(n-2) + O(1) → **O(2ⁿ)**，n=40 就要跑几秒。

原因：**重复子问题**。fib(3) 在计算 fib(5) 时被算了 2 次，fib(2) 被算了 3 次……

<TreeView name="fib-recursion" />

解法：**记忆化**（缓存结果），把重复计算消掉：

\`\`\`python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib_memo(n):
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)
\`\`\`

复杂度降到 **O(n)** —— 这就是动态规划的核心思想（第 8 章详讲）。

## 分治的四个步骤

1. **分解**：把问题拆成若干规模更小的同类子问题
2. **解决**：递归求解子问题（规模足够小时直接求解）
3. **合并**：把子问题的解合并成原问题的解
4. **边界**：确定递归终止条件

经典分治算法：归并排序、快速排序、快速幂、大整数乘法、最近点对。

<ComplexityGrowthDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import math, time
from functools import lru_cache

# ---- 1. n 扩大 10 倍：各复杂度操作数的倍率 ----
fs = [("O(1)", lambda n: 1), ("O(log n)", lambda n: math.log2(n)), ("O(n)", lambda n: n),
      ("O(n log n)", lambda n: n*math.log2(n)), ("O(n^2)", lambda n: n*n), ("O(2^n)", lambda n: 2.0**min(n, 60))]
pairs = {"O(2^n)": (20, 30)}
for name, f in fs:
    n1, n2 = pairs.get(name, (10**3, 10**4))
    a, b = f(n1), f(n2)
    print(f"{name:10} n:{n1:g}->{n2:g}  {a:>9.3g} -> {b:>9.3g}  倍率 {b/a:>6.1f}")

# ---- 2. 暴力 fib vs 记忆化：重复子问题的代价 ----
def fib(n): return n if n < 2 else fib(n-1) + fib(n-2)
@lru_cache(maxsize=None)
def fib_memo(n): return n if n < 2 else fib_memo(n-1) + fib_memo(n-2)
t0 = time.perf_counter(); r1 = fib(30); t1 = time.perf_counter()
r2 = fib_memo(300); t2 = time.perf_counter()
print(f"fib(30)={r1} 暴力 {1000*(t1-t0):.1f} ms | fib_memo(300) {1000*(t2-t1):.3f} ms")

# ---- 3. 递归树模拟主定理：归并排序每层代价 n、共 log2(n) 层 ----
n = 1024
total, width, layers = 0, n, 0
while width > 1:
    total += n; width //= 2; layers += 1
print(f"归并 n={n}: 总代价 {total} = n × log2(n)（{layers} 层）")

# ---- 4. 递归的空间：栈帧深度 ----
def depth(n):
    return 1 if n <= 1 else 1 + depth(n-1)
print("递归 fact(900) 栈深 =", depth(900), "→ O(n) 空间；迭代版 O(1)")\`\`\`

预期输出（实测）：倍率实测：O(1)=1、O(log n)=1.3、O(n)=10、O(n log n)=13.3、O(n²)=100（n:1e3→1e4），O(2ⁿ) n:20→30 倍率 1024；fib(30)=832040 暴力约 124 ms，fib_memo(300) 仅 0.3 ms；归并 n=1024 递归树总代价 10240 = n×log2(n)（10 层）；递归 fact(900) 栈深 900 → O(n) 空间。

**常见错误**：只看最内层循环忽略外层（嵌套相乘法则）；把 O(2n) 写成 O(2n) 而不是 O(n)——大 O 不带常数；对『循环变量每次减半』的 while 循环按 O(n) 算（应为 O(log n)）。

### 常见误区

1. **『大 O 是精确运行时间』**——它只描述增长上界，常数因子与低阶项被舍弃，实际快慢要靠 benchmark；\\n2. **『O(n log n) 一定比 O(n) 慢很多』**——n=1e6 时只差约 20 倍常数级，但 O(n²) 差 1e5 倍，量级才是分水岭；\\n3. **『递归的时间复杂度就是递归次数』**——要看递归式：fib 的 T(n)=T(n-1)+T(n-2) 是 O(2ⁿ)，二分是 O(log n)，结构决定复杂度。

### 知识关联

- **向前**：本章三法则是 c2 数组操作分析与 c4 排序族比较的度量衡；
- **向后**：第 8 章动态规划把『记忆化消重复子问题』发展成方法论；
- **平行**：python-foundations 的 for/while 基础语法是本章分析的对象。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 大 O | n→∞ 时的增长上界，忽略常数与低阶项 |
| 量级表 | 1 < log n < n < n log n < n² < 2ⁿ < n! |
| 三法则 | 顺序取最大、嵌套相乘、减半为 log |
| 实战 | n≤1e5→O(n log n)；n≤20→可暴搜 |
| 主定理 | T=aT(n/b)+f(n)，比较 f 与 n^c（c=log_b a）|

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）
`,
        tips: [
          {
            kind: 'interview',
            text: '"为什么归并排序是 O(n log n)"是高频问题：答"分治树共 log n 层，每层合并代价 O(n)"即可。',
          },
          {
            kind: 'performance',
            text: '看到"递归超时"先想两件事：是否存在重复子问题（→ 记忆化/DP），递归深度是否过大（→ 改迭代或加缓存）。',
          },
          {
            kind: 'pitfall',
            text: '`@lru_cache` 要求参数可哈希。传列表会报 `TypeError: unhashable type`，需要先转成 tuple。',
          },
        ],
        demos: [
          {
            title: '递归 vs 记忆化的差距',
            lang: 'python',
            code: `import time
from functools import lru_cache

def fib_naive(n):
    return n if n < 2 else fib_naive(n - 1) + fib_naive(n - 2)

@lru_cache(maxsize=None)
def fib_memo(n):
    return n if n < 2 else fib_memo(n - 1) + fib_memo(n - 2)

for n in (20, 25, 30):
    t0 = time.perf_counter(); r1 = fib_naive(n); t1 = time.perf_counter()
    t2 = time.perf_counter(); r2 = fib_memo(n); t3 = time.perf_counter()
    print(f"n={n}: 递归 {(t1-t0)*1000:9.2f}ms  记忆化 {(t3-t2)*1000:.3f}ms  结果一致={r1 == r2}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'algo-1-e1',
        relatedLessonId: 'algo-l-1-1',
        type: 'single',
        difficulty: 1,
        question: '下面代码的时间复杂度是？\n\n```python\nfor i in range(n):\n    for j in range(n):\n        print(i, j)\n```',
        options: [
          { value: 'A', text: 'O(n)' },
          { value: 'B', text: 'O(n log n)' },
          { value: 'C', text: 'O(n²)' },
          { value: 'D', text: 'O(2ⁿ)' },
        ],
        answer: 'C',
        explanation: '两层循环各执行 n 次，总执行次数 n×n = n²，因此是 O(n²)。嵌套循环的复杂度是各层次数相乘。',
        tags: ['复杂度'],
      },
      {
        id: 'algo-1-e2',
        relatedLessonId: 'algo-l-1-1',
        type: 'judge',
        difficulty: 1,
        question: '时间复杂度 O(3n + 100) 的算法，可以简记为 O(n)。',
        answer: true,
        explanation: '大 O 只关注增长趋势，忽略常数系数和低阶项。3n + 100 随 n 线性增长，因此是 O(n)。',
        tags: ['复杂度'],
      },
      {
        id: 'algo-1-e3',
        relatedLessonId: 'algo-l-1-1',
        type: 'single',
        difficulty: 2,
        question: '下面代码的时间复杂度是？\n\n```python\ni = 1\nwhile i < n:\n    i *= 2\n```',
        options: [
          { value: 'A', text: 'O(n)' },
          { value: 'B', text: 'O(log n)' },
          { value: 'C', text: 'O(n²)' },
          { value: 'D', text: 'O(1)' },
        ],
        answer: 'B',
        explanation: 'i 依次为 1, 2, 4, 8, …，执行次数是 log₂n，因此是 O(log n)。**循环变量每次乘/除以常数**都是 O(log n)。',
        tags: ['复杂度'],
      },
      {
        id: 'algo-1-e4',
        relatedLessonId: 'algo-l-1-1',
        type: 'multiple',
        difficulty: 2,
        question: '下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'O(1) < O(log n) < O(n) < O(n log n) < O(n²)' },
          { value: 'B', text: '嵌套循环的复杂度一定高于单层循环' },
          { value: 'C', text: '空间复杂度只计算额外使用的空间' },
          { value: 'D', text: '递归函数的空间复杂度不需要考虑调用栈' },
        ],
        answer: ['A', 'C'],
        explanation:
          'B 错误：内层循环若是固定次数（如遍历 26 个字母），整体仍是 O(n)。D 错误：递归每层占用一个栈帧，必须计入空间复杂度。',
        tags: ['复杂度', '空间'],
      },
      {
        id: 'algo-1-e5',
        relatedLessonId: 'algo-l-1-1',
        type: 'fill',
        difficulty: 2,
        question: '若一道题的数据规模 n ≤ 10⁵，通常期望的算法复杂度是 O(n ___) 或更优。（填一个词）',
        blanks: [['log n', 'logn', 'log(n)', 'log n)', 'n log n']],
        explanation:
          '经验规则：n ≤ 10⁵ 时，O(n²)=10¹⁰ 会超时，O(n log n)≈1.7×10⁶ 可行。看到数据量就能反推该用什么复杂度的算法。',
        tags: ['复杂度', '经验'],
      },
      {
        id: 'algo-1-e6',
        relatedLessonId: 'algo-l-1-1',
        type: 'judge',
        difficulty: 2,
        question: '在 Python 中判断 `x in some_list` 的时间复杂度是 O(1)。',
        answer: false,
        explanation:
          '列表的成员判断是**线性扫描** O(n)。改用 `set` 才是 O(1)（哈希查找）。这是把 O(n²) 优化成 O(n) 最常用的手段。',
        tags: ['复杂度', 'Python'],
      },
      {
        id: 'algo-1-e7',
        relatedLessonId: 'algo-l-1-1',
        type: 'code',
        difficulty: 2,
        question:
          '实现函数 `sum_of_squares(n)`，返回 1² + 2² + ... + n²。\n\n要求：**时间复杂度 O(1)**（提示：使用求和公式 n(n+1)(2n+1)/6），不要用循环。',
        starterCode: `def sum_of_squares(n):
    # 使用公式，O(1) 时间
    return ___

out = sum_of_squares(10)
`,
        setupCode: '',
        expectedOutput: '385',
        tests: `assert out == 385, f"前 10 个平方和应为 385，实际 {out}"
assert sum_of_squares(1) == 1
assert sum_of_squares(0) == 0
assert sum_of_squares(100) == 338350, f"n=100 时应为 338350，实际 {sum_of_squares(100)}"
`,
        answer: `def sum_of_squares(n):
    return n * (n + 1) * (2 * n + 1) // 6

sum_of_squares(10)`,
        explanation:
          '```python\nreturn n * (n + 1) * (2 * n + 1) // 6\n```\n\n这是等差数列平方和的闭式解。用公式代替循环，把 O(n) 优化为 O(1)，是"数学优化"的典型例子。注意用 `//` 而不是 `/`，避免浮点误差。',
        tags: ['复杂度', '数学'],
      },
      {
        id: 'algo-1-e8',
        relatedLessonId: 'algo-l-1-1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 `is_unique(s)`，判断字符串 `s` 中的字符是否全部不重复。\n\n要求：**时间复杂度 O(n)**（不要用两层循环）。返回布尔值。',
        starterCode: `def is_unique(s):
    # 用 set 实现 O(n)
    return ___

out = is_unique("abcdef")
`,
        setupCode: '',
        expectedOutput: 'True',
        tests: `assert out == True, f"'abcdef' 应返回 True，实际 {out}"
assert is_unique("abcade") == False, "'abcade' 有重复，应返回 False"
assert is_unique("") == True, "空字符串应返回 True"
assert is_unique("a") == True
assert is_unique("abcdefghijklmnopqrstuvwxyz") == True
`,
        answer: `def is_unique(s):
    return len(set(s)) == len(s)

is_unique("abcdef")`,
        explanation:
          '```python\nreturn len(set(s)) == len(s)\n```\n\n把字符串转成集合后，重复字符会被合并，长度变短就说明有重复。集合构建 O(n) + 长度比较 O(1) = O(n)。\n\n如果用两层循环，复杂度是 O(n²)，在长字符串上会很慢。',
        tags: ['哈希', '复杂度'],
      },
      {
        id: 'algo-1-e9',
        relatedLessonId: 'algo-l-1-1',
        type: 'single',
        difficulty: 3,
        question: '归并排序的递归式是 T(n) = 2T(n/2) + O(n)，其时间复杂度是？',
        options: [
          { value: 'A', text: 'O(n)' },
          { value: 'B', text: 'O(n log n)' },
          { value: 'C', text: 'O(n²)' },
          { value: 'D', text: 'O(log n)' },
        ],
        answer: 'B',
        explanation:
          '递归树共 log₂n 层，每层合并总代价为 O(n)，总计 O(n log n)。这正是归并排序成为最优比较排序（下界 Ω(n log n)）的原因。',
        tags: ['分治', '复杂度'],
      },
      {
        id: 'algo-1-e10',
        relatedLessonId: 'algo-l-1-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `count_pairs(nums, target)`，统计数组中和**小于** `target` 的数对 `(i, j)` 个数（i < j）。\n\n要求：先排序 + 双指针，复杂度 **O(n log n)**。',
        starterCode: `def count_pairs(nums, target):
    # 排序 + 双指针
    ___

out = count_pairs([1, 2, 3, 4, 5], 6)
`,
        setupCode: '',
        expectedOutput: '4',
        tests: `assert out == 4, f"应为 4 对，实际 {out}"
assert count_pairs([1, 1, 1], 3) == 3, f"1+1=2 小于 3，应有 3 对，实际 {count_pairs([1, 1, 1], 3)}"
assert count_pairs([1, 2, 3], 10) == 3, "全部 3 对都满足"
assert count_pairs([], 5) == 0
assert count_pairs([5], 10) == 0
`,
        answer: `def count_pairs(nums, target):
    nums = sorted(nums)
    left, right = 0, len(nums) - 1
    count = 0
    while left < right:
        if nums[left] + nums[right] < target:
            count += right - left
            left += 1
        else:
            right -= 1
    return count

count_pairs([1, 2, 3, 4, 5], 6)`,
        explanation:
          '```python\nnums = sorted(nums)\nleft, right = 0, len(nums) - 1\ncount = 0\nwhile left < right:\n    if nums[left] + nums[right] < target:\n        count += right - left\n        left += 1\n    else:\n        right -= 1\nreturn count\n```\n\n**关键洞察**：排序后，若 `nums[left] + nums[right] < target`，则 `nums[left]` 能与 `left+1..right` 之间所有元素配对，一次贡献 `right-left` 对。\n\n复杂度：排序 O(n log n) + 双指针 O(n) = O(n log n)。暴力枚举需要 O(n²)。',
        tags: ['双指针', '排序'],
      },
      {
        id: 'algo-1-e11',
        relatedLessonId: 'algo-l-1-1',
        type: 'judge',
        difficulty: 3,
        question: '记忆化递归（如 `lru_cache`）能把朴素递归斐波那契的 O(2ⁿ) 降到 O(n)。',
        answer: true,
        explanation:
          '朴素递归的问题在于重复子问题：fib(3) 会被计算多次。记忆化缓存每个 n 的结果，每个 n 只算一次，因此是 O(n) 时间、O(n) 空间。',
        tags: ['递归', '优化'],
      },
      {
        id: 'algo-1-e12',
        relatedLessonId: 'algo-l-1-1',
        type: 'open',
        difficulty: 3,
        question:
          '请解释为什么在 LeetCode 中，看到题目"数据规模 n ≤ 10⁵"时，通常应避免写 O(n²) 的算法，并说明你会如何选择算法。',
        referenceAnswer: `**为什么 O(n²) 不可行**：

- n = 10⁵ 时，n² = 10¹⁰ 次操作；
- 以 Python 每秒约 10⁷~10⁸ 次简单操作为基准，10¹⁰ 次需要 100 秒以上，必然超时（通常限制 1~2 秒）。
- 而 O(n log n) 约 1.7×10⁶ 次操作，运行时间在 0.1 秒量级，完全可行。

**如何据数据规模选算法（经验表）**：

| n 规模 | 可用复杂度 |
| --- | --- |
| ≤ 10 | O(n!) / O(2ⁿ) 暴搜 |
| ≤ 20 | O(2ⁿ) 状压/暴搜 |
| ≤ 100 | O(n³) |
| ≤ 1000 | O(n²) |
| ≤ 10⁵ | O(n log n) |
| ≤ 10⁷ | O(n) |
| 任意 | O(log n) / O(1) |

**选择策略**：
1. 先读数据范围，反推复杂度上限；
2. 想暴力解，判断是否超限；
3. 若超限，寻找排序（O(n log n)）、哈希（O(n)）、双指针、二分、单调栈等优化手段；
4. 写完后主动算一遍复杂度，确认不超限。`,
        rubric: [
          { point: '说明 n=10⁵ 时 n²=10¹⁰ 会导致超时', score: 2 },
          { point: '给出数据规模与复杂度的对应经验表', score: 2 },
          { point: '说明先判断暴力解、再做优化的策略', score: 1 },
          { point: '提到排序/哈希/双指针/二分等优化手段', score: 1 },
        ],
        keywords: ['10⁵', '超时', '复杂度', 'O(n log n)', '数据范围'],
        explanation: '这道题考察"数据范围反推复杂度"的工程直觉，是刷题的第一课。',
        tags: ['复杂度', '面试'],
      },
      {
        id: 'algo-1-e13',
        relatedLessonId: 'algo-l-1-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `fast_pow(base, exp, mod)`，计算 `base^exp % mod`。\n\n要求使用**快速幂**，时间复杂度 O(log exp)。\n\n然后令 `out = fast_pow(3, 100, 1000000007)`。',
        starterCode: `def fast_pow(base, exp, mod):
    # 快速幂：每次把指数折半
    result = 1
    while exp > 0:
        ___
    return result

out = fast_pow(3, 100, 1000000007)
`,
        setupCode: '',
        expectedOutput: '约 5.15e9 量级内的结果',
        tests: `assert fast_pow(2, 10, 1000) == 24, f"2^10 % 1000 应为 24，实际 {fast_pow(2, 10, 1000)}"
assert fast_pow(3, 0, 1000) == 1
assert fast_pow(5, 3, 1000) == 125
assert out == pow(3, 100, 1000000007), f"结果与内置 pow 不一致"
`,
        answer: `def fast_pow(base, exp, mod):
    result = 1
    base %= mod
    while exp > 0:
        if exp & 1:
            result = result * base % mod
        base = base * base % mod
        exp >>= 1
    return result

fast_pow(3, 100, 1000000007)`,
        explanation:
          '```python\nresult = 1\nbase %= mod\nwhile exp > 0:\n    if exp & 1:\n        result = result * base % mod\n    base = base * base % mod\n    exp >>= 1\nreturn result\n```\n\n**原理**：把指数按二进制拆解。3¹⁰⁰ = 3^(64+32+4)，每次平方得到更高次幂，指数右移一位。\n\n复杂度 O(log exp)。直接循环乘 exp 次是 O(exp)，exp=10¹⁸ 时不可行——这是 RSA 加密的基础算法。',
        tags: ['快速幂', '分治'],
      },
      {
        id: 'algo-1-e14',
        relatedLessonId: 'algo-l-1-1',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些操作可以帮助把 O(n²) 的算法优化到 O(n log n) 或 O(n)？（多选）',
        options: [
          { value: 'A', text: '把内层的 list 查找改为 set 查找' },
          { value: 'B', text: '先排序再用双指针代替双重循环' },
          { value: 'C', text: '用哈希表缓存"已经出现过的值"' },
          { value: 'D', text: '给每个循环加一层 try-except' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'A、B、C 都是经典的降复杂度手段（空间换时间 / 有序性利用）。D 与复杂度无关，反而更慢。',
        tags: ['优化'],
      },
      {
        id: 'algo-1-e15',
        relatedLessonId: 'algo-l-1-1',
        type: 'fill',
        difficulty: 3,
        question: '二分查找的递归式为 T(n) = T(n/2) + O(1)，其时间复杂度是 O(___) 。',
        blanks: [['log n', 'logn', 'log(n)', 'log n)']],
        explanation:
          '每次把问题规模减半，约 log₂n 次后规模变为 1，因此为 O(log n)。这是查找类问题的理论下界（对于有序数组）。',
        tags: ['复杂度', '二分'],
      },
    ],
  },
];
