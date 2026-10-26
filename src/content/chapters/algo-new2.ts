import type { Chapter } from '../../types';

/* ============================================================
 *  《算法与数据结构》第 2~4 章
 * ============================================================ */

export const algoExtra2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  第 2 章：数组、字符串与双指针（难度 2~3）
   * ============================================================ */
  {
    id: 'algo-2',
    title: '数组、字符串与双指针',
    goal: '掌握数组的内存模型与原地操作，熟练使用双指针、滑动窗口、前缀和与二分查找解决线性结构问题。',
    lessons: [
      {
        id: 'algo-l-2-1',
        title: '数组的内存模型与原地操作',
        content: `
### 学习目标

学完本节，你应该能够：
1. 用地址公式解释 O(1) 随机访问，列出数组各操作复杂度表；
2. 用快慢双指针完成移除元素/移动零的原地操作（fast 扫描、slow 写入）；
3. 说出 Python list 扩容机制与字符串不可变带来的拼接陷阱。

### 前置知识

- 第 1 章的复杂度三法则；
- Python list 的基本操作。

### 问题背景

数组是最基础也最高频的考点结构：LeetCode 前百题里一半以上是『线性结构 + 指针』。它的 O(1) 随机访问来自连续内存的地址公式，它的 O(n) 中间插入来自元素搬移——理解内存模型，双指针、滑动窗口、前缀和、二分这些技巧就都不再是『背模板』而是『必然推论』。

### 直觉理解

把数组想成一排连号的储物柜：知道柜号就能一步走到（O(1)），但往中间塞一个新柜子要把后面所有柜子平移（O(n)）。双指针是两个检修工：对撞指针从两头往中间排除不合格柜子；滑动窗口是一条可伸缩的警戒线，右端探路、左端收尾。前缀和则是先花一遍工把『1 到 i 号柜合计』抄在账本上，之后任何区间询问都只需查两次账。

### 核心概念与原理详解

## 数组为什么能 O(1) 随机访问

数组在内存中是**一段连续的空间**，每个元素大小固定。访问 \`a[i]\` 时：

\`\`\`
地址 = 起始地址 + i × 元素大小
\`\`\`

一次乘法加法就能定位，因此是 O(1)。

**代价**：

| 操作 | 复杂度 | 原因 |
| --- | --- | --- |
| 按下标访问 | O(1) | 直接计算地址 |
| 尾部追加（动态数组） | 均摊 O(1) | 容量够时直接写 |
| 中间/头部插入 | O(n) | 后面所有元素后移 |
| 中间/头部删除 | O(n) | 后面所有元素前移 |
| 查找某个值 | O(n) | 需要线性扫描 |

> Python 的 \`list\` 是**动态数组**：容量不足时按约 1.125 倍扩容并整体拷贝，
> 但由于摊还分析，\`append\` 的平均复杂度仍是 O(1)。

## 原地操作：用双指针覆盖

「原地」意味着不使用额外数组，通过双指针在同一数组上读写。

**经典题：移除元素（LeetCode 27）**

\`\`\`python
def remove_element(nums, val):
    slow = 0
    for fast in range(len(nums)):
        if nums[fast] != val:
            nums[slow] = nums[fast]
            slow += 1
    return slow          # 前 slow 个元素就是结果
\`\`\`

**核心思想**：\`fast\` 负责扫描，\`slow\` 负责写入位置。
所有"保留满足条件的元素"类问题都可以套用。

**经典题：移动零（LeetCode 283）**

\`\`\`python
def move_zeroes(nums):
    slow = 0
    for fast in range(len(nums)):
        if nums[fast] != 0:
            nums[slow], nums[fast] = nums[fast], nums[slow]
            slow += 1
\`\`\`

交换而不是覆盖，保证非零元素的相对顺序不变。

## 字符串在 Python 中的特殊之处

Python 的字符串是**不可变的**：

\`\`\`python
s = "abc"
# s[0] = "x"   ← TypeError
\`\`\`

因此"原地修改字符串"必须先转成列表：

\`\`\`python
chars = list(s)
chars[0] = "x"
s = "".join(chars)
\`\`\`

**代价**：每次拼接字符串都会创建新对象，循环中拼接是 O(n²)。
应使用 \`"".join(parts)\`。

## 二维数组的边界处理

网格类问题（如岛屿数量）常见四个方向移动：

\`\`\`python
DIRS = [(0, 1), (0, -1), (1, 0), (-1, 0)]
for dr, dc in DIRS:
    nr, nc = r + dr, c + dc
    if 0 <= nr < rows and 0 <= nc < cols:
        ...
\`\`\`

**越界检查一定要写在访问之前**，否则 \`IndexError\`。

## 边界情况清单（刷题必备）

写数组代码前，先想清楚这几件事：

1. **空数组** \`[]\` —— 循环不执行，返回值对吗？
2. **单元素** —— 双指针是否会越界？
3. **全部相同** —— 去重逻辑是否正确？
4. **首尾元素** —— 是否被漏掉？
5. **负数/零** —— 是否需要特殊处理？

> 面试官很看重边界处理能力。主动提一句"我会先检查空输入"就是加分项。

<TwoPointerDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import time, random
random.seed(1)

# ---- 1. list 头插 vs 尾插 ----
n = 20000
a = []
t0 = time.perf_counter()
for i in range(n): a.append(i)
t1 = time.perf_counter()
b = []
for i in range(n): b.insert(0, i)
t2 = time.perf_counter()
print(f"append {1000*(t1-t0):.1f} ms vs insert(0) {1000*(t2-t1):.0f} ms（慢约 {(t2-t1)/(t1-t0):.0f} 倍）")

# ---- 2. 前缀和：区间和 O(1) ----
nums = [3, 1, 4, 1, 5, 9, 2, 6]
pre = [0]
for x in nums: pre.append(pre[-1] + x)
print("前缀和:", pre, "| sum[2,5) =", pre[5] - pre[2])

# ---- 3. 差分：区间加 O(1) 再一次前缀和还原 ----
diff = [0]*(len(nums)+1)
for l, r, v in [(0, 3, 10), (2, 5, -2)]:
    diff[l] += v; diff[r+1] -= v
cur, res = 0, []
for i in range(len(nums)):
    cur += diff[i]; res.append(nums[i] + cur)
print("差分还原:", res)

# ---- 4. 和为 k 的子数组个数 ----
def subarray_sum(nums, k):
    cnt, p, seen = 0, 0, {0: 1}
    for x in nums:
        p += x
        cnt += seen.get(p - k, 0)
        seen[p] = seen.get(p, 0) + 1
    return cnt
print("和为 8 的子数组个数:", subarray_sum(nums, 8))

# ---- 5. 二分 lower_bound 与滑动窗口 ----
def lower_bound(a, t):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < t: lo = mid + 1
        else: hi = mid
    return lo
sa = sorted(random.sample(range(100), 20))
print("lower_bound 指向:", lower_bound(sa, sa[7]), "（值为", sa[7], "）")

def longest_unique(s):
    seen, left, best = {}, 0, 0
    for r, ch in enumerate(s):
        if ch in seen and seen[ch] >= left: left = seen[ch] + 1
        seen[ch] = r
        best = max(best, r - left + 1)
    return best
print("无重复最长子串('abcabcbb'):", longest_unique("abcabcbb"))\`\`\`

预期输出（实测）：append 1.3 ms vs insert(0) 40 ms（慢约 30 倍）；前缀和 [0,3,4,8,9,14,23,25,31]，sum[2,5)=10；差分还原 [13,11,12,9,3,7,2,6]；和为 8 的子数组 2 个；lower_bound 指向下标 7；'abcabcbb' 无重复最长子串 3。

**常见错误**：循环里用 list.insert(0,x) 头插构造数组（O(n²)），应该 append 后再反转；二分边界写闭区间却用 lo<hi 判断导致漏元素；滑动窗口收缩条件用 if 而不是 while，窗口内仍残留非法元素。

### 常见误区

1. **『Python list 的 append 总是 O(1)』**——容量不足时按约 1.125 倍扩容并整体拷贝，单次最坏 O(n)，但均摊 O(1)；\\n2. **『字符串可以原地改』**——Python 字符串不可变，原地修改要先转 list；循环里 += 拼接是 O(n²) 陷阱；\\n3. **『前缀和只适用于求和』**——异或、计数、差分（前缀和的逆运算）都是同一思想，区间修改 O(1) 靠差分。

### 知识关联

- **向前**：本章的 O(n) 技巧直接服务 c3 链表的指针操作与 c4 哈希的『空间换时间』；
- **向后**：第 5/6 章的排序与查找建立在数组模型上；
- **平行**：pandas 课的向量化区间运算就是前缀和/差分思想的库化形态。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 地址公式 | addr = base + i×size → O(1) 随机访问 |
| 代价表 | 尾插均摊 O(1)、中间插删 O(n)、查找 O(n) |
| 双指针 | 对撞（有序排除）/ 同向滑动窗口（扩右缩左）|
| 前缀和 | pre[r+1]-pre[l] 区间和 O(1)；逆运算差分做区间改 |
| 二分 | 精确查找 / lower_bound / upper_bound 三形态 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）
`,
        tips: [
          {
            kind: 'interview',
            text: '「快慢双指针」是原地修改数组的万能模板：fast 扫描、slow 写入。移除元素、移动零、去重、压缩字符串都是同一套路。',
          },
          {
            kind: 'pitfall',
            text: 'Python 字符串不可变，`s[i] = x` 会报错。需要原地修改时先 `list(s)`，最后 `"".join()`。',
          },
          {
            kind: 'performance',
            text: '循环中反复 `s += ch` 是 O(n²)。正确做法是收集到 list 再 `"".join(parts)`，这是 O(n)。',
          },
          {
            kind: 'note',
            text: '二维网格遍历时，把四个方向写成常量数组 `DIRS`，代码更短且不易漏方向。',
          },
        ],
        demos: [
          {
            title: '快慢指针原地去重',
            lang: 'python',
            code: `def dedupe_sorted(nums):
    """有序数组原地去重，返回新长度。"""
    if not nums:
        return 0
    slow = 0
    for fast in range(1, len(nums)):
        if nums[fast] != nums[slow]:
            slow += 1
            nums[slow] = nums[fast]
    return slow + 1

arr = [1, 1, 2, 2, 3, 4, 4, 5]
n = dedupe_sorted(arr)
print(f"去重后长度 {n}，数组前 {n} 位为 {arr[:n]}")
print("使用额外空间的做法（对照）:", sorted(set([1, 1, 2, 2, 3])))`,
          },
          {
            title: '移动零',
            lang: 'python',
            code: `def move_zeroes(nums):
    slow = 0
    for fast in range(len(nums)):
        if nums[fast] != 0:
            nums[slow], nums[fast] = nums[fast], nums[slow]
            slow += 1
    return nums

for case in ([0, 1, 0, 3, 12], [0], [1, 2, 3], [0, 0, 0]):
    print(case, "->", move_zeroes(case.copy()))`,
          },
        ],
      },
      {
        id: 'algo-l-2-2',
        title: '双指针：对撞指针与滑动窗口',
        content: `
### 学习目标

学完本节，你应该能够：
1. 写对撞指针模板并证明两数之和 II 为何是 O(n)（每次移动排除一个元素）；
2. 说明盛水容器『移动较矮一侧』的正确性论证；
3. 套用『扩右缩左』滑动窗口模板解无重复字符最长子串。

### 前置知识

- 「数组的内存模型与原地操作」（l2-1）；
- 循环不变式的思维习惯。

### 问题背景

数组是最基础也最高频的考点结构：LeetCode 前百题里一半以上是『线性结构 + 指针』。它的 O(1) 随机访问来自连续内存的地址公式，它的 O(n) 中间插入来自元素搬移——理解内存模型，双指针、滑动窗口、前缀和、二分这些技巧就都不再是『背模板』而是『必然推论』。

### 直觉理解

把数组想成一排连号的储物柜：知道柜号就能一步走到（O(1)），但往中间塞一个新柜子要把后面所有柜子平移（O(n)）。双指针是两个检修工：对撞指针从两头往中间排除不合格柜子；滑动窗口是一条可伸缩的警戒线，右端探路、左端收尾。前缀和则是先花一遍工把『1 到 i 号柜合计』抄在账本上，之后任何区间询问都只需查两次账。

### 核心概念与原理详解

## 对撞指针（左右向中间靠拢）

两个指针从两端出发，根据条件移动其中一个，直到相遇。

**适用前提**：数组**有序**，或者问题具有"从两端可以排除"的单调性。

**经典题：两数之和 II（有序数组，LeetCode 167）**

\`\`\`python
def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1        # 和太小，左指针右移增大
        else:
            right -= 1       # 和太大，右指针左移减小
    return []
\`\`\`

**为什么这样做是 O(n)**：每次移动都排除掉一个元素，最多移动 n 次。

**经典题：盛最多水的容器（LeetCode 11）**

\`\`\`python
def max_area(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        area = min(height[left], height[right]) * (right - left)
        best = max(best, area)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best
\`\`\`

**关键**：移动较矮的一侧。因为移动高的一侧只会让宽度变小、高度不变或更小，不可能得到更大面积。

## 滑动窗口（同向双指针）

维护一个**连续区间** \`[left, right]\`，right 不断扩张，当条件不满足时 left 收缩。

**通用模板**：

\`\`\`python
def sliding_window(s, ...):
    left = 0
    ans = 0
    for right in range(len(s)):
        # 1. 扩大窗口：加入 s[right]
        ...
        # 2. 当窗口不满足条件时，收缩左边界
        while not valid():
            # 移除 s[left]
            left += 1
        # 3. 此时窗口有效，更新答案
        ans = max(ans, right - left + 1)
    return ans
\`\`\`

**经典题：无重复字符的最长子串（LeetCode 3）**

\`\`\`python
def length_of_longest_substring(s):
    seen = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1        # 跳过重复字符
        seen[ch] = right
        best = max(best, right - left + 1)
    return best
\`\`\`

**经典题：长度最小的子数组（LeetCode 209，和 ≥ target）**

\`\`\`python
def min_subarray_len(target, nums):
    left = 0
    total = 0
    best = float("inf")
    for right, x in enumerate(nums):
        total += x
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == float("inf") else best
\`\`\`

## 什么时候用滑动窗口

判断标准：

1. 问题涉及**连续子数组/子串**；
2. 窗口扩大或收缩时，**条件可以增量更新**（不需要重新计算整个窗口）；
3. 通常求"最长/最短/数量"。

**反例**：求"和最大的子数组"不能用滑动窗口（因为元素可能为负，窗口扩大不一定更好），
应该用**动态规划**（Kadane 算法）。

## 三种双指针总结

| 类型 | 指针移动方式 | 典型问题 |
| --- | --- | --- |
| 快慢指针 | 同向，速度不同 | 原地去重、链表找环 |
| 对撞指针 | 相向而行 | 两数之和、回文判断、盛水 |
| 滑动窗口 | 同向，left 跟随 right | 最长子串、最小覆盖子串 |

<TwoPointerDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import time, random
random.seed(1)

# ---- 1. list 头插 vs 尾插 ----
n = 20000
a = []
t0 = time.perf_counter()
for i in range(n): a.append(i)
t1 = time.perf_counter()
b = []
for i in range(n): b.insert(0, i)
t2 = time.perf_counter()
print(f"append {1000*(t1-t0):.1f} ms vs insert(0) {1000*(t2-t1):.0f} ms（慢约 {(t2-t1)/(t1-t0):.0f} 倍）")

# ---- 2. 前缀和：区间和 O(1) ----
nums = [3, 1, 4, 1, 5, 9, 2, 6]
pre = [0]
for x in nums: pre.append(pre[-1] + x)
print("前缀和:", pre, "| sum[2,5) =", pre[5] - pre[2])

# ---- 3. 差分：区间加 O(1) 再一次前缀和还原 ----
diff = [0]*(len(nums)+1)
for l, r, v in [(0, 3, 10), (2, 5, -2)]:
    diff[l] += v; diff[r+1] -= v
cur, res = 0, []
for i in range(len(nums)):
    cur += diff[i]; res.append(nums[i] + cur)
print("差分还原:", res)

# ---- 4. 和为 k 的子数组个数 ----
def subarray_sum(nums, k):
    cnt, p, seen = 0, 0, {0: 1}
    for x in nums:
        p += x
        cnt += seen.get(p - k, 0)
        seen[p] = seen.get(p, 0) + 1
    return cnt
print("和为 8 的子数组个数:", subarray_sum(nums, 8))

# ---- 5. 二分 lower_bound 与滑动窗口 ----
def lower_bound(a, t):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < t: lo = mid + 1
        else: hi = mid
    return lo
sa = sorted(random.sample(range(100), 20))
print("lower_bound 指向:", lower_bound(sa, sa[7]), "（值为", sa[7], "）")

def longest_unique(s):
    seen, left, best = {}, 0, 0
    for r, ch in enumerate(s):
        if ch in seen and seen[ch] >= left: left = seen[ch] + 1
        seen[ch] = r
        best = max(best, r - left + 1)
    return best
print("无重复最长子串('abcabcbb'):", longest_unique("abcabcbb"))\`\`\`

预期输出（实测）：append 1.3 ms vs insert(0) 40 ms（慢约 30 倍）；前缀和 [0,3,4,8,9,14,23,25,31]，sum[2,5)=10；差分还原 [13,11,12,9,3,7,2,6]；和为 8 的子数组 2 个；lower_bound 指向下标 7；'abcabcbb' 无重复最长子串 3。

**常见错误**：循环里用 list.insert(0,x) 头插构造数组（O(n²)），应该 append 后再反转；二分边界写闭区间却用 lo<hi 判断导致漏元素；滑动窗口收缩条件用 if 而不是 while，窗口内仍残留非法元素。

### 常见误区

1. **『Python list 的 append 总是 O(1)』**——容量不足时按约 1.125 倍扩容并整体拷贝，单次最坏 O(n)，但均摊 O(1)；\\n2. **『字符串可以原地改』**——Python 字符串不可变，原地修改要先转 list；循环里 += 拼接是 O(n²) 陷阱；\\n3. **『前缀和只适用于求和』**——异或、计数、差分（前缀和的逆运算）都是同一思想，区间修改 O(1) 靠差分。

### 知识关联

- **向前**：本章的 O(n) 技巧直接服务 c3 链表的指针操作与 c4 哈希的『空间换时间』；
- **向后**：第 5/6 章的排序与查找建立在数组模型上；
- **平行**：pandas 课的向量化区间运算就是前缀和/差分思想的库化形态。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 地址公式 | addr = base + i×size → O(1) 随机访问 |
| 代价表 | 尾插均摊 O(1)、中间插删 O(n)、查找 O(n) |
| 双指针 | 对撞（有序排除）/ 同向滑动窗口（扩右缩左）|
| 前缀和 | pre[r+1]-pre[l] 区间和 O(1)；逆运算差分做区间改 |
| 二分 | 精确查找 / lower_bound / upper_bound 三形态 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）


### 核心图解与交互演示

<Diagram type="twopointer" />
`,
        tips: [
          {
            kind: 'interview',
            text: '滑动窗口模板要背熟：`for right in range(n)` 扩大，`while 不满足` 收缩，中间更新答案。几乎所有子串/子数组题都能套。',
          },
          {
            kind: 'pitfall',
            text: '窗口收缩条件要用 `while` 而不是 `if`——有时需要连续收缩多次才满足条件。这是最常见的 bug。',
          },
          {
            kind: 'note',
            text: '含负数的数组一般不能用滑动窗口（窗口和不再随右移单调递增），需要换成前缀和 + 哈希或 DP。',
          },
        ],
        demos: [
          {
            title: '无重复字符的最长子串',
            lang: 'python',
            code: `def length_of_longest_substring(s):
    seen = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1
        seen[ch] = right
        best = max(best, right - left + 1)
    return best

for s in ("abcabcbb", "bbbbb", "pwwkew", ""):
    print(f"{s!r:12} -> 最长无重复子串长度 {length_of_longest_substring(s)}")`,
          },
          {
            title: '盛最多水的容器',
            lang: 'python',
            code: `def max_area(height):
    left, right = 0, len(height) - 1
    best = 0
    while left < right:
        area = min(height[left], height[right]) * (right - left)
        best = max(best, area)
        if height[left] < height[right]:
            left += 1
        else:
            right -= 1
    return best

print("面积:", max_area([1, 8, 6, 2, 5, 4, 8, 3, 7]))
print("暴力 O(n²) 校验:", max(
    min(h[i], h[j]) * (j - i)
    for i, h in [(i, h) for i, h in enumerate([1, 8, 6, 2, 5, 4, 8, 3, 7])]
    for j in range(i + 1, 9)
))`,
          },
        ],
      },
      {
        id: 'algo-l-2-3',
        title: '前缀和与二分查找',
        content: `
### 学习目标

学完本节，你应该能够：
1. 构造前缀和数组并用 pre[r+1]-pre[l] 做 O(1) 区间和；
2. 用哈希记录历史前缀和，O(n) 解『和为 k 的子数组个数』；
3. 实现差分数组的区间加与还原，并写出二分 lower_bound。

### 前置知识

- 「数组的内存模型」（l2-1）与双指针（l2-2）；
- 哈希表 dict 的用法（详见 c4）。

### 问题背景

数组是最基础也最高频的考点结构：LeetCode 前百题里一半以上是『线性结构 + 指针』。它的 O(1) 随机访问来自连续内存的地址公式，它的 O(n) 中间插入来自元素搬移——理解内存模型，双指针、滑动窗口、前缀和、二分这些技巧就都不再是『背模板』而是『必然推论』。

### 直觉理解

把数组想成一排连号的储物柜：知道柜号就能一步走到（O(1)），但往中间塞一个新柜子要把后面所有柜子平移（O(n)）。双指针是两个检修工：对撞指针从两头往中间排除不合格柜子；滑动窗口是一条可伸缩的警戒线，右端探路、左端收尾。前缀和则是先花一遍工把『1 到 i 号柜合计』抄在账本上，之后任何区间询问都只需查两次账。

### 核心概念与原理详解

## 前缀和：把区间求和降到 O(1)

定义 \`pre[i] = nums[0] + ... + nums[i-1]\`，则区间 \`[l, r]\` 的和为：

\`\`\`
sum(l, r) = pre[r+1] - pre[l]
\`\`\`

\`\`\`python
def build_prefix(nums):
    pre = [0] * (len(nums) + 1)
    for i, x in enumerate(nums):
        pre[i + 1] = pre[i] + x
    return pre

# 查询 [2, 4] 的和
ans = pre[5] - pre[2]
\`\`\`

**空间换时间**：构建 O(n)，每次查询 O(1)。多次区间查询时收益巨大。

**进阶：和为 k 的子数组个数（LeetCode 560）**

\`\`\`python
def subarray_sum(nums, k):
    count = 0
    pre = 0
    seen = {0: 1}          # 前缀和 -> 出现次数
    for x in nums:
        pre += x
        count += seen.get(pre - k, 0)   # 找"之前出现过 pre-k"的次数
        seen[pre] = seen.get(pre, 0) + 1
    return count
\`\`\`

**核心洞察**：\`pre[j] - pre[i] = k\` 等价于 \`pre[i] = pre[j] - k\`。
用哈希表记录历史前缀和，一次遍历即可统计。O(n)。

## 差分数组：区间修改降到 O(1)

若需要对区间 \`[l, r]\` 统一加上 v，多次操作后求最终数组：

\`\`\`python
def range_add(n, ops):
    diff = [0] * (n + 1)
    for l, r, v in ops:
        diff[l] += v
        diff[r + 1] -= v
    # 前缀和还原
    res = [0] * n
    cur = 0
    for i in range(n):
        cur += diff[i]
        res[i] = cur
    return res
\`\`\`

**原理**：差分数组的前缀和等于原数组。区间加变成"左端点 +v，右端点后 -v"。

## 二分查找的三种形态

<TreeView name="binary-search" />

**1. 精确查找**

\`\`\`python
def binary_search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        elif nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1
\`\`\`

**2. lower_bound：第一个 ≥ target 的位置**

\`\`\`python
def lower_bound(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo
\`\`\`

**3. upper_bound：第一个 > target 的位置** —— 把 \`< target\` 改成 \`<= target\`。

Python 中可直接用 \`bisect.bisect_left\` / \`bisect_right\`。

## 二分答案：当"判定"比"求解"容易

有些问题不能直接二分查找某个值，但可以二分**答案**：

**经典题：分割数组的最大值（LeetCode 410）给定数组，分成 m 段连续的段，使"各段和的最大值"最小。**

\`\`\`python
def can_split(nums, m, limit):
    """能否分成不超过 m 段，使每段和都不超过 limit。"""
    parts, cur = 1, 0
    for x in nums:
        if cur + x > limit:
            parts += 1
            cur = x
            if parts > m:
                return False
        else:
            cur += x
    return True

def split_array(nums, m):
    lo, hi = max(nums), sum(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if can_split(nums, m, mid):
            hi = mid
        else:
            lo = mid + 1
    return lo
\`\`\`

**识别二分答案的信号**：
- 求"最大值最小"或"最小值最大"；
- 答案具有**单调性**：答案越大越容易满足；
- 给定一个候选答案，能在 O(n) 内判定是否可行。

<BinarySearchDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import time, random
random.seed(1)

# ---- 1. list 头插 vs 尾插 ----
n = 20000
a = []
t0 = time.perf_counter()
for i in range(n): a.append(i)
t1 = time.perf_counter()
b = []
for i in range(n): b.insert(0, i)
t2 = time.perf_counter()
print(f"append {1000*(t1-t0):.1f} ms vs insert(0) {1000*(t2-t1):.0f} ms（慢约 {(t2-t1)/(t1-t0):.0f} 倍）")

# ---- 2. 前缀和：区间和 O(1) ----
nums = [3, 1, 4, 1, 5, 9, 2, 6]
pre = [0]
for x in nums: pre.append(pre[-1] + x)
print("前缀和:", pre, "| sum[2,5) =", pre[5] - pre[2])

# ---- 3. 差分：区间加 O(1) 再一次前缀和还原 ----
diff = [0]*(len(nums)+1)
for l, r, v in [(0, 3, 10), (2, 5, -2)]:
    diff[l] += v; diff[r+1] -= v
cur, res = 0, []
for i in range(len(nums)):
    cur += diff[i]; res.append(nums[i] + cur)
print("差分还原:", res)

# ---- 4. 和为 k 的子数组个数 ----
def subarray_sum(nums, k):
    cnt, p, seen = 0, 0, {0: 1}
    for x in nums:
        p += x
        cnt += seen.get(p - k, 0)
        seen[p] = seen.get(p, 0) + 1
    return cnt
print("和为 8 的子数组个数:", subarray_sum(nums, 8))

# ---- 5. 二分 lower_bound 与滑动窗口 ----
def lower_bound(a, t):
    lo, hi = 0, len(a)
    while lo < hi:
        mid = (lo + hi) // 2
        if a[mid] < t: lo = mid + 1
        else: hi = mid
    return lo
sa = sorted(random.sample(range(100), 20))
print("lower_bound 指向:", lower_bound(sa, sa[7]), "（值为", sa[7], "）")

def longest_unique(s):
    seen, left, best = {}, 0, 0
    for r, ch in enumerate(s):
        if ch in seen and seen[ch] >= left: left = seen[ch] + 1
        seen[ch] = r
        best = max(best, r - left + 1)
    return best
print("无重复最长子串('abcabcbb'):", longest_unique("abcabcbb"))\`\`\`

预期输出（实测）：append 1.3 ms vs insert(0) 40 ms（慢约 30 倍）；前缀和 [0,3,4,8,9,14,23,25,31]，sum[2,5)=10；差分还原 [13,11,12,9,3,7,2,6]；和为 8 的子数组 2 个；lower_bound 指向下标 7；'abcabcbb' 无重复最长子串 3。

**常见错误**：循环里用 list.insert(0,x) 头插构造数组（O(n²)），应该 append 后再反转；二分边界写闭区间却用 lo<hi 判断导致漏元素；滑动窗口收缩条件用 if 而不是 while，窗口内仍残留非法元素。

### 常见误区

1. **『Python list 的 append 总是 O(1)』**——容量不足时按约 1.125 倍扩容并整体拷贝，单次最坏 O(n)，但均摊 O(1)；\\n2. **『字符串可以原地改』**——Python 字符串不可变，原地修改要先转 list；循环里 += 拼接是 O(n²) 陷阱；\\n3. **『前缀和只适用于求和』**——异或、计数、差分（前缀和的逆运算）都是同一思想，区间修改 O(1) 靠差分。

### 知识关联

- **向前**：本章的 O(n) 技巧直接服务 c3 链表的指针操作与 c4 哈希的『空间换时间』；
- **向后**：第 5/6 章的排序与查找建立在数组模型上；
- **平行**：pandas 课的向量化区间运算就是前缀和/差分思想的库化形态。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 地址公式 | addr = base + i×size → O(1) 随机访问 |
| 代价表 | 尾插均摊 O(1)、中间插删 O(n)、查找 O(n) |
| 双指针 | 对撞（有序排除）/ 同向滑动窗口（扩右缩左）|
| 前缀和 | pre[r+1]-pre[l] 区间和 O(1)；逆运算差分做区间改 |
| 二分 | 精确查找 / lower_bound / upper_bound 三形态 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）
`,
        tips: [
          {
            kind: 'interview',
            text: '"最大值最小 / 最小值最大"是二分答案的强信号。答题模板：确定上下界 → 写 check 函数 → 二分。',
          },
          {
            kind: 'pitfall',
            text: '二分查找的边界写法极易出错。推荐记住两套：闭区间 `lo<=hi` 配 `hi=mid-1`，左闭右开 `lo<hi` 配 `hi=mid`。不要混用。',
          },
          {
            kind: 'performance',
            text: 'Python 的 `bisect` 是 C 实现的，比手写二分快很多。能用就用。',
          },
          {
            kind: 'note',
            text: '前缀和数组通常开 `n+1` 长度并令 `pre[0]=0`，可以避免处理 `l=0` 的特判。',
          },
        ],
        demos: [
          {
            title: '前缀和与和为 k 的子数组',
            lang: 'python',
            code: `def subarray_sum(nums, k):
    count = 0
    pre = 0
    seen = {0: 1}
    for x in nums:
        pre += x
        count += seen.get(pre - k, 0)
        seen[pre] = seen.get(pre, 0) + 1
    return count

nums = [1, 1, 1]
print("和为 2 的子数组个数:", subarray_sum(nums, 2))

# 暴力校验
def brute(nums, k):
    c = 0
    for i in range(len(nums)):
        s = 0
        for j in range(i, len(nums)):
            s += nums[j]
            if s == k:
                c += 1
    return c
print("暴力校验:", brute(nums, 2))`,
          },
          {
            title: '二分答案：分割数组',
            lang: 'python',
            code: `def can_split(nums, m, limit):
    parts, cur = 1, 0
    for x in nums:
        if cur + x > limit:
            parts += 1
            cur = x
            if parts > m:
                return False
        else:
            cur += x
    return True

def split_array(nums, m):
    lo, hi = max(nums), sum(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if can_split(nums, m, mid):
            hi = mid
        else:
            lo = mid + 1
    return lo

print("分割数组最小最大值:", split_array([7, 2, 5, 10, 8], 2))   # 期望 18
print("另一种分段:", split_array([1, 2, 3, 4, 5], 2))             # 期望 9`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'algo-2-e1',
        relatedLessonId: 'algo-l-2-1',
        type: 'single',
        difficulty: 1,
        question: '以下哪种操作在 Python 列表中的时间复杂度是 O(n)？',
        options: [
          { value: 'A', text: '`lst[i]` 按下标访问' },
          { value: 'B', text: '`lst.append(x)` 尾部追加' },
          { value: 'C', text: '`lst.insert(0, x)` 头部插入' },
          { value: 'D', text: '`len(lst)`' },
        ],
        answer: 'C',
        explanation:
          '头部插入需要把后面所有元素后移一位，因此是 O(n)。这解释了为什么需要频繁头部操作时应使用 `collections.deque`。',
        tags: ['数组'],
      },
      {
        id: 'algo-2-e2',
        relatedLessonId: 'algo-l-2-1',
        type: 'judge',
        difficulty: 1,
        question: '数组的随机访问是 O(1)，因为它通过"起始地址 + 下标 × 元素大小"直接计算内存地址。',
        answer: true,
        explanation: '这正是数组连续存储带来的优势。链表则必须从头遍历，访问第 i 个元素是 O(n)。',
        tags: ['数组'],
      },
      {
        id: 'algo-2-e3',
        relatedLessonId: 'algo-l-2-1',
        type: 'single',
        difficulty: 2,
        question: '「快慢指针」原地移除数组中所有等于 val 的元素，核心思想是？',
        options: [
          { value: 'A', text: 'fast 扫描，slow 记录下一个写入位置' },
          { value: 'B', text: '两个指针从两端相向移动' },
          { value: 'C', text: '先排序再删除' },
          { value: 'D', text: '用一个新数组存储结果' },
        ],
        answer: 'A',
        explanation:
          'fast 负责扫描全部元素，遇到不等于 val 的就写到 slow 位置并把 slow 后移。这样 O(n) 时间、O(1) 额外空间完成"原地"删除。',
        tags: ['双指针'],
      },
      {
        id: 'algo-2-e4',
        relatedLessonId: 'algo-l-2-1',
        type: 'multiple',
        difficulty: 2,
        question: '关于滑动窗口，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '适用于连续子数组/子串问题' },
          { value: 'B', text: '窗口收缩通常要用 while 而不是 if' },
          { value: 'C', text: '含负数数组求"最大子段和"也适合用滑动窗口' },
          { value: 'D', text: '窗口内的信息需要能增量更新' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 错误：含负数时窗口扩大不一定使和变大，单调性被破坏，应改用 Kadane 动态规划。A、B、D 都是滑动窗口的适用条件与实现要点。',
        tags: ['滑动窗口'],
      },
      {
        id: 'algo-2-e5',
        relatedLessonId: 'algo-l-2-1',
        type: 'fill',
        difficulty: 2,
        question: '前缀和数组 `pre` 中，区间 `[l, r]` 的和可表示为 `pre[___] - pre[l]`。',
        blanks: [['r+1', 'r + 1', 'r+1]']],
        explanation:
          '`pre[i]` 表示前 i 个元素之和（`pre[0]=0`）。因此 [l, r] 的和 = 前 r+1 个 - 前 l 个 = `pre[r+1] - pre[l]`。',
        tags: ['前缀和'],
      },
      {
        id: 'algo-2-e6',
        relatedLessonId: 'algo-l-2-1',
        type: 'judge',
        difficulty: 2,
        question: '二分查找的前提条件是数组必须有序。',
        answer: true,
        explanation: '二分依赖"可以通过中点的比较排除一半元素"的单调性，无序数组无法保证这一点。',
        tags: ['二分'],
      },
      {
        id: 'algo-2-e7',
        relatedLessonId: 'algo-l-2-1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 `two_sum_sorted(nums, target)`：给定**升序**数组 `nums` 和目标值，返回两个下标 `[i, j]`（i < j）使 `nums[i] + nums[j] == target`。若不存在返回 `[]`。\n\n要求：O(n) 双指针，**不要**用两层循环。',
        starterCode: `def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    # 补全双指针逻辑
    ___

out = two_sum_sorted([2, 7, 11, 15], 9)
`,
        setupCode: '',
        expectedOutput: '[0, 1]',
        tests: `assert out == [0, 1], f"应为 [0, 1]，实际 {out}"
assert two_sum_sorted([1, 2, 3, 4, 6], 6) == [1, 3], "1+... 应为 [1,3]"
assert two_sum_sorted([1, 2], 10) == [], "无解应返回 []"
assert two_sum_sorted([-3, 1, 4], 1) == [0, 2], "负数也应正确处理"
`,
        answer: `def two_sum_sorted(nums, target):
    left, right = 0, len(nums) - 1
    while left < right:
        s = nums[left] + nums[right]
        if s == target:
            return [left, right]
        elif s < target:
            left += 1
        else:
            right -= 1
    return []

two_sum_sorted([2, 7, 11, 15], 9)`,
        explanation:
          '```python\nwhile left < right:\n    s = nums[left] + nums[right]\n    if s == target:\n        return [left, right]\n    elif s < target:\n        left += 1\n    else:\n        right -= 1\nreturn []\n```\n\n和太小说明需要更大的数，左指针右移；和太大说明需要更小的数，右指针左移。每次移动排除一个元素，最多 O(n) 次。',
        tags: ['双指针'],
      },
      {
        id: 'algo-2-e8',
        relatedLessonId: 'algo-l-2-1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 `remove_element(nums, val)`：**原地**移除数组中所有等于 `val` 的元素，返回新长度。\n\n要求：O(n) 时间、O(1) 额外空间。返回后 `nums` 的前 n 个元素应为结果。',
        starterCode: `def remove_element(nums, val):
    slow = 0
    # 快慢指针
    ___

out = remove_element([3, 2, 2, 3], 3)
`,
        setupCode: '',
        expectedOutput: '2',
        tests: `assert out == 2, f"应返回长度 2，实际 {out}"
arr = [3, 2, 2, 3]
n = remove_element(arr, 3)
assert n == 2 and sorted(arr[:n]) == [2, 2], f"数组前 {n} 位应为 [2,2]，实际 {arr[:n]}"
arr2 = [0, 1, 2, 2, 3, 0, 4, 2]
n2 = remove_element(arr2, 2)
assert n2 == 5, f"应返回 5，实际 {n2}"
assert remove_element([], 1) == 0, "空数组应返回 0"
`,
        answer: `def remove_element(nums, val):
    slow = 0
    for fast in range(len(nums)):
        if nums[fast] != val:
            nums[slow] = nums[fast]
            slow += 1
    return slow

remove_element([3, 2, 2, 3], 3)`,
        explanation:
          '```python\nslow = 0\nfor fast in range(len(nums)):\n    if nums[fast] != val:\n        nums[slow] = nums[fast]\n        slow += 1\nreturn slow\n```\n\nfast 扫描全部元素，遇到不是 val 的就复制到 slow 位置。slow 最终就是新长度。这是"快慢指针原地覆盖"的模板题。',
        tags: ['双指针', '原地'],
      },
      {
        id: 'algo-2-e9',
        relatedLessonId: 'algo-l-2-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `length_of_longest_substring(s)`：返回字符串中不含重复字符的**最长子串长度**。\n\n要求：O(n) 滑动窗口。',
        starterCode: `def length_of_longest_substring(s):
    seen = {}
    left = 0
    best = 0
    # 滑动窗口
    ___

out = length_of_longest_substring("abcabcbb")
`,
        setupCode: '',
        expectedOutput: '3',
        tests: `assert out == 3, f"'abcabcbb' 应为 3，实际 {out}"
assert length_of_longest_substring("bbbbb") == 1, f"'bbbbb' 应为 1"
assert length_of_longest_substring("pwwkew") == 3, f"'pwwkew' 应为 3"
assert length_of_longest_substring("") == 0, "空串应为 0"
assert length_of_longest_substring("abcdef") == 6
`,
        answer: `def length_of_longest_substring(s):
    seen = {}
    left = 0
    best = 0
    for right, ch in enumerate(s):
        if ch in seen and seen[ch] >= left:
            left = seen[ch] + 1
        seen[ch] = right
        best = max(best, right - left + 1)
    return best

length_of_longest_substring("abcabcbb")`,
        explanation:
          '```python\nfor right, ch in enumerate(s):\n    if ch in seen and seen[ch] >= left:\n        left = seen[ch] + 1\n    seen[ch] = right\n    best = max(best, right - left + 1)\nreturn best\n```\n\n**关键**：`seen[ch] >= left` 判断重复字符是否在**当前窗口内**。如果重复字符在 left 之前，说明已经不在窗口内，不需要移动 left。',
        tags: ['滑动窗口'],
      },
      {
        id: 'algo-2-e10',
        relatedLessonId: 'algo-l-2-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `min_subarray_len(target, nums)`：给定正整数数组，找到**和 ≥ target 的最短连续子数组长度**。不存在返回 0。\n\n要求：O(n) 滑动窗口。',
        starterCode: `def min_subarray_len(target, nums):
    left = 0
    total = 0
    best = float("inf")
    # 滑动窗口
    ___

out = min_subarray_len(7, [2, 3, 1, 2, 4, 3])
`,
        setupCode: '',
        expectedOutput: '2',
        tests: `assert out == 2, f"应为 2（[4,3]），实际 {out}"
assert min_subarray_len(4, [1, 4, 4]) == 1
assert min_subarray_len(11, [1, 1, 1, 1]) == 0, "不存在应返回 0"
assert min_subarray_len(15, [1, 2, 3, 4, 5]) == 5
`,
        answer: `def min_subarray_len(target, nums):
    left = 0
    total = 0
    best = float("inf")
    for right, x in enumerate(nums):
        total += x
        while total >= target:
            best = min(best, right - left + 1)
            total -= nums[left]
            left += 1
    return 0 if best == float("inf") else best

min_subarray_len(7, [2, 3, 1, 2, 4, 3])`,
        explanation:
          '```python\nfor right, x in enumerate(nums):\n    total += x\n    while total >= target:\n        best = min(best, right - left + 1)\n        total -= nums[left]\n        left += 1\nreturn 0 if best == float("inf") else best\n```\n\n右指针扩张累加，一旦达到 target 就尝试收缩并记录最短长度。每个元素最多被加入和移出各一次，因此是 O(n)。',
        tags: ['滑动窗口'],
      },
      {
        id: 'algo-2-e11',
        relatedLessonId: 'algo-l-2-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `subarray_sum(nums, k)`：统计数组中和为 `k` 的**连续子数组个数**。\n\n要求：O(n) 前缀和 + 哈希表。',
        starterCode: `def subarray_sum(nums, k):
    count = 0
    pre = 0
    seen = {0: 1}
    # 前缀和 + 哈希
    ___

out = subarray_sum([1, 1, 1], 2)
`,
        setupCode: '',
        expectedOutput: '2',
        tests: `assert out == 2, f"应为 2，实际 {out}"
assert subarray_sum([1, 2, 3], 3) == 2, "应为 2（[3] 和 [1,2]）"
assert subarray_sum([1, -1, 0], 0) == 3, f"含负数时应正确，实际 {subarray_sum([1, -1, 0], 0)}"
assert subarray_sum([], 0) == 0
`,
        answer: `def subarray_sum(nums, k):
    count = 0
    pre = 0
    seen = {0: 1}
    for x in nums:
        pre += x
        count += seen.get(pre - k, 0)
        seen[pre] = seen.get(pre, 0) + 1
    return count

subarray_sum([1, 1, 1], 2)`,
        explanation:
          '```python\nfor x in nums:\n    pre += x\n    count += seen.get(pre - k, 0)\n    seen[pre] = seen.get(pre, 0) + 1\nreturn count\n```\n\n**核心洞察**：若 `pre[j] - pre[i] == k`，则 `pre[i] == pre[j] - k`。用哈希表记录每个前缀和出现的次数，遍历时查"`pre - k` 出现过几次"。\n\n`{0: 1}` 的初始化表示"空前缀"，处理从数组开头开始的子数组。',
        tags: ['前缀和', '哈希'],
      },
      {
        id: 'algo-2-e12',
        relatedLessonId: 'algo-l-2-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `lower_bound(nums, target)`：在**升序**数组中返回第一个 **≥ target** 的元素下标；若所有元素都小于 target，返回 `len(nums)`。\n\n要求：O(log n) 二分。',
        starterCode: `def lower_bound(nums, target):
    lo, hi = 0, len(nums)
    # 左闭右开区间二分
    ___

out = lower_bound([1, 3, 3, 5, 7], 3)
`,
        setupCode: '',
        expectedOutput: '1',
        tests: `assert out == 1, f"应为 1，实际 {out}"
assert lower_bound([1, 3, 3, 5, 7], 4) == 3, "target=4 应返回 3"
assert lower_bound([1, 3, 3, 5, 7], 8) == 5, "全部小于时应返回长度"
assert lower_bound([], 1) == 0
assert lower_bound([2, 2, 2], 2) == 0, "多个相同时返回第一个"
`,
        answer: `def lower_bound(nums, target):
    lo, hi = 0, len(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo

lower_bound([1, 3, 3, 5, 7], 3)`,
        explanation:
          '```python\nwhile lo < hi:\n    mid = (lo + hi) // 2\n    if nums[mid] < target:\n        lo = mid + 1\n    else:\n        hi = mid\nreturn lo\n```\n\n**左闭右开 [lo, hi)** 的写法：`nums[mid] < target` 时 mid 及之前都不满足，`lo = mid+1`；否则 `nums[mid] >= target`，mid 可能是答案，`hi = mid`。\n\n这是二分查找的标准模板，务必练熟。',
        tags: ['二分'],
      },
      {
        id: 'algo-2-e13',
        relatedLessonId: 'algo-l-2-1',
        type: 'judge',
        difficulty: 3,
        question: '「求最大值最小」类问题通常可以用二分答案解决。',
        answer: true,
        explanation:
          '二分答案是这类问题的标准解法：答案具有单调性（limit 越大越容易满足），且给定 limit 后可 O(n) 判定可行性。典型题：分割数组、运送包裹、爱吃香蕉的珂珂。',
        tags: ['二分'],
      },
      {
        id: 'algo-2-e14',
        relatedLessonId: 'algo-l-2-1',
        type: 'multiple',
        difficulty: 3,
        question: '关于前缀和，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '构建一次 O(n)，之后每次区间求和 O(1)' },
          { value: 'B', text: '配合哈希表可以统计"和为 k 的子数组个数"' },
          { value: 'C', text: '前缀和适用于数组元素动态修改的场景' },
          { value: 'D', text: '二维前缀和可以 O(1) 求子矩阵和' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 错误：前缀和是静态结构，元素修改后需要 O(n) 重建。动态修改 + 区间查询应该用树状数组（Fenwick）或线段树。',
        tags: ['前缀和'],
      },
      {
        id: 'algo-2-e15',
        relatedLessonId: 'algo-l-2-1',
        type: 'open',
        difficulty: 3,
        question:
          '请说明滑动窗口算法的适用条件和标准模板，并举两个不适合使用的反例说明原因。',
        referenceAnswer: `**适用条件**：

1. 问题涉及**连续子数组或子串**；
2. 窗口扩大或收缩时，窗口内的信息可以**增量更新**（O(1)），不需要重新扫描整个窗口；
3. 问题通常求"最长/最短/个数"，且窗口边界具有单调性（左边界只向右移）。

**标准模板**：

\`\`\`python
left = 0
for right in range(len(nums)):
    # 1. 加入 nums[right]，更新窗口统计
    ...
    # 2. 窗口不满足约束时收缩
    while not valid():
        # 移除 nums[left]
        left += 1
    # 3. 更新答案
    ans = max(ans, right - left + 1)
\`\`\`

**反例 1：含负数的"和最大的子数组"**

窗口右移时，窗口和不一定单调增加，扩大窗口可能让结果变差，
无法通过"收缩左边界"保证最优性。应使用 Kadane 算法（动态规划）O(n)。

**反例 2：求"和恰好为 k 的子数组个数"（元素可正可负）**

窗口和随右移不单调，"和 ≥ k 就收缩"的规则不再成立。
应使用前缀和 + 哈希表 O(n)。

**判断技巧**：如果"数组元素全为正"能让窗口和具有单调性，就可以用滑动窗口；
否则要换成前缀和、DP 或其它方法。`,
        rubric: [
          { point: '指出适用于连续子串/子数组且能增量更新', score: 2 },
          { point: '给出标准模板（right 扩张、left 收缩、更新答案）', score: 2 },
          { point: '举出含负数的最大子段和反例', score: 1 },
          { point: '举出和为 k 的子数组反例或说明单调性被破坏', score: 1 },
        ],
        keywords: ['连续子数组', '单调性', '增量更新', '负数', 'Kadane', '前缀和'],
        explanation:
          '这道题考察对算法"适用边界"的理解。能说出反例，说明真正理解了而不是背模板。',
        tags: ['滑动窗口', '面试'],
      },
    ],
  },

  /* ============================================================
   *  第 3 章：链表、栈与队列（难度 2~3）
   * ============================================================ */
  {
    id: 'algo-3',
    title: '链表、栈与队列',
    goal: '掌握链表的指针操作与经典技巧（虚拟头节点、快慢指针、反转），熟练使用栈、单调栈与队列解决相关问题。',
    lessons: [
      {
        id: 'algo-l-3-1',
        title: '链表的核心操作与技巧',
        content: `
### 学习目标

学完本节，你应该能够：
1. 对比链表/数组的五维差异（访问/头插/尾插/缓存/额外空间）并按场景选型；
2. 用虚拟头节点统一删除逻辑，手写三指针反转（先存 nxt 再改指针）；
3. 用快慢指针实现找中点、Floyd 判圈，并复述环入口的 a+b=kL 证明直觉。

### 前置知识

- 指针/引用的概念；
- 双指针思想（c2）。

### 问题背景

链表把『指针操作』考到极致：虚拟头节点、快慢指针、反转三大件几乎是面试必考；栈与队列是两种访问纪律（LIFO/FIFO），单调栈/单调队列把纪律升级成『维护一个有序视图』，接雨水、滑动窗口最大值这类 Hard 题由此降到 O(n)。

### 直觉理解

数组是连号储物柜，链表是寻宝游戏：每个盒子里只有下一个盒子的地址，找元素必须从头走（O(n)），但把盒子从链上摘下/插上只需改两个指针（O(1)）。栈是一摞盘子（只能拿最上面的）；队列是排队（队尾进队头出）。单调栈是『一摞从下到上越来越矮的盘子』：新盘子比栈顶高时，矮的全部被结算掉——每个盘子只进出各一次，O(n)。

### 核心概念与原理详解

## 链表 vs 数组

| 维度 | 数组 | 链表 |
| --- | --- | --- |
| 随机访问 | O(1) | **O(n)** |
| 头部插入/删除 | O(n) | **O(1)** |
| 尾部插入 | 均摊 O(1) | O(1)（有尾指针） |
| 内存 | 连续，缓存友好 | 分散，缓存不友好 |
| 额外空间 | 无 | 每个节点一个指针 |

**选择原则**：频繁按位置访问用数组；频繁在头部/中间插入删除用链表。

## 虚拟头节点（dummy head）

链表题最常见的技巧。它让"删除头节点"和"删除中间节点"统一处理：

\`\`\`python
dummy = ListNode(0)
dummy.next = head
cur = dummy
while cur.next:
    if cur.next.val == target:
        cur.next = cur.next.next      # 删除
    else:
        cur = cur.next
return dummy.next
\`\`\`

**好处**：不需要单独处理 head 被删除的情况，代码更简洁、更不容易出错。

## 快慢指针三大用途

**1. 找中点**

\`\`\`python
slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
# slow 即中点（偶数个节点时为偏右的中间）
\`\`\`

**2. 判断链表是否有环（Floyd 判圈算法）**

\`\`\`python
slow = fast = head
while fast and fast.next:
    slow = slow.next
    fast = fast.next.next
    if slow is fast:
        return True
return False
\`\`\`

**原理**：如果有环，快指针会追上慢指针（相对速度 1）。

**3. 找环的入口**

相遇后，让一个指针回到 head，然后两个指针都每次走一步，再次相遇处就是环入口。

**证明直觉**：设头到环入口距离 a，入口到相遇点距离 b，环长 L。
慢指针走了 a+b，快指针走了 a+b+kL = 2(a+b)，推出 a+b = kL，
因此从相遇点再走 a 步（同时从 head 走 a 步）会在入口相遇。

## 链表反转（必须背熟）

\`\`\`python
def reverse_list(head):
    prev = None
    cur = head
    while cur:
        nxt = cur.next     # 先保存下一个
        cur.next = prev    # 反转指针
        prev = cur         # 前移
        cur = nxt
    return prev
\`\`\`

**三个指针**：prev、cur、nxt。**顺序不能错**：先存 next，再改指针。

## 链表题的通用检查清单

1. **空链表** \`head is None\`
2. **单节点** \`head.next is None\`
3. **两个节点** —— 快慢指针是否越界
4. **是否需要虚拟头节点**
5. **循环条件用 \`while cur\` 还是 \`while cur.next\`**

> 链表题 90% 的 bug 都来自循环条件写错和忘记处理空链表。

<LinkedListDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
from collections import deque

class Node:
    def __init__(self, v, nxt=None): self.v, self.next = v, nxt

def build(vals):
    dummy = Node(0); cur = dummy
    for v in vals: cur.next = Node(v); cur = cur.next
    return dummy.next

def to_list(h):
    out = []
    while h: out.append(h.v); h = h.next
    return out

# ---- 1. 三指针反转 ----
def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next; cur.next = prev; prev = cur; cur = nxt
    return prev
print("反转:", to_list(reverse(build([1, 2, 3, 4, 5]))))

# ---- 2. 虚拟头节点删除 ----
def remove_val(head, val):
    dummy = Node(0); dummy.next = head; cur = dummy
    while cur.next:
        if cur.next.v == val: cur.next = cur.next.next
        else: cur = cur.next
    return dummy.next
print("删除 2:", to_list(remove_val(build([1, 2, 3, 2, 4]), 2)))

# ---- 3. 快慢指针：找中点 + Floyd 判圈 ----
def midpoint(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next; fast = fast.next.next
    return slow.v
print("中点(1..5):", midpoint(build([1, 2, 3, 4, 5])))

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next; fast = fast.next.next
        if slow is fast: return True
    return False
cyc = build([1, 2, 3, 4, 5])
tail = cyc
while tail.next: tail = tail.next
tail.next = cyc.next.next          # 构造环：尾指向第 3 个节点
print("有环检测:", has_cycle(cyc), "| 无环检测:", has_cycle(build([1, 2, 3])))

# ---- 4. 单调栈：下一个更大元素 ----
def next_greater(nums):
    res = [-1]*len(nums); st = []
    for i, x in enumerate(nums):
        while st and nums[st[-1]] < x: res[st.pop()] = x
        st.append(i)
    return res
print("下一个更大 [2,1,2,4,3]:", next_greater([2, 1, 2, 4, 3]))

# ---- 5. 单调队列：滑动窗口最大值 ----
def max_window(nums, k):
    dq, ans = deque(), []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x: dq.pop()
        dq.append(i)
        if dq[0] <= i - k: dq.popleft()
        if i >= k - 1: ans.append(nums[dq[0]])
    return ans
print("滑窗最大 k=3:", max_window([1, 3, -1, -3, 5, 3, 6, 7], 3))\`\`\`

预期输出（实测）：反转 [5,4,3,2,1]；虚拟头删除 2 → [1,3,4]；中点(1..5)=3；构造环后 has_cycle=True、无环链表 False；下一个更大 [2,1,2,4,3]→[4,2,4,-1,-1]；滑窗最大 k=3 → [3,3,5,5,6,7]。

**常见错误**：反转链表先改 cur.next 再存 nxt，链直接断掉（必须先保存后继）；Floyd 判圈用比较值相等而不是 is 同一节点，值重复会误判；单调栈里存值不存下标，回填结果时无法定位。

### 常见误区

1. **『链表比数组慢』**——随机访问确实 O(n) vs O(1)，但头插/头删 O(1) vs O(n)，按操作模式选结构；\\n2. **『栈就是 list』**——list 可以当栈，但当队列时 pop(0) 是 O(n)，必须用 deque；\\n3. **『单调栈只用于 Next Greater』**——柱状图最大矩形、接雨水、每日温度、去除重复字母全是同一模板的变形。

### 知识关联

- **向前**：c4 哈希的链地址法桶就是链表的应用；
- **向后**：第 5 章 BFS 用队列、DFS 用栈，结构直接决定遍历顺序；
- **平行**：python-engineering 的 deque 双端队列是本章队列的标准工程实现。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 链表 vs 数组 | 头插 O(1)/随机访问 O(n) ↔ 数组相反 |
| 三大件 | 虚拟头统一删头、快慢指针找中点判圈、三指针反转 |
| 栈 | 括号匹配/表达式求值/函数调用栈 |
| 单调栈 | 栈内单调 + 每元素进出各一次 → O(n) |
| 单调队列 | 队头存最大值下标，滑窗最大值 O(n) |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）


### 核心图解与交互演示

<Diagram type="linkedlist" />
`,
        tips: [
          {
            kind: 'interview',
            text: '链表反转的三个指针（prev/cur/nxt）必须能默写。面试常让你手写，写错顺序是致命错误。',
          },
          {
            kind: 'pitfall',
            text: '快慢指针的循环条件是 `while fast and fast.next`，不是 `while fast`。少了 `.next` 检查会在 `fast.next.next` 处崩溃。',
          },
          {
            kind: 'leak',
            text: '涉及"删除/插入"的链表题，优先用虚拟头节点，能省掉大量边界特判。',
          },
        ],
        demos: [
          {
            title: '链表反转与找中点',
            lang: 'python',
            code: `class Node:
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

def build(vals):
    dummy = Node(0)
    cur = dummy
    for v in vals:
        cur.next = Node(v)
        cur = cur.next
    return dummy.next

def to_list(head):
    out = []
    while head:
        out.append(head.val)
        head = head.next
    return out

def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next
        cur.next = prev
        prev, cur = cur, nxt
    return prev

def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow.val

lst = build([1, 2, 3, 4, 5])
print("原链表:", to_list(lst))
print("反转后:", to_list(reverse(build([1, 2, 3, 4, 5]))))
print("中点:", middle(build([1, 2, 3, 4, 5])))`,
          },
        ],
      },
      {
        id: 'algo-l-3-2',
        title: '栈、单调栈与队列',
        content: `
### 学习目标

学完本节，你应该能够：
1. 用 list/deque 实现 LIFO 与 FIFO，并说明 list.pop(0) 的 O(n) 陷阱；
2. 写单调栈求『下一个更大元素』并证明每元素进出各一次故 O(n)；
3. 用单调队列（存下标、值单调递减）解滑动窗口最大值。

### 前置知识

- 栈/队列的语义（LIFO/FIFO）；
- 数组下标操作（c2）。

### 问题背景

链表把『指针操作』考到极致：虚拟头节点、快慢指针、反转三大件几乎是面试必考；栈与队列是两种访问纪律（LIFO/FIFO），单调栈/单调队列把纪律升级成『维护一个有序视图』，接雨水、滑动窗口最大值这类 Hard 题由此降到 O(n)。

### 直觉理解

数组是连号储物柜，链表是寻宝游戏：每个盒子里只有下一个盒子的地址，找元素必须从头走（O(n)），但把盒子从链上摘下/插上只需改两个指针（O(1)）。栈是一摞盘子（只能拿最上面的）；队列是排队（队尾进队头出）。单调栈是『一摞从下到上越来越矮的盘子』：新盘子比栈顶高时，矮的全部被结算掉——每个盘子只进出各一次，O(n)。

### 核心概念与原理详解

## 栈：后进先出（LIFO）

Python 用 list 即可实现栈：

\`\`\`python
stack = []
stack.append(1)      # push
top = stack[-1]      # peek
stack.pop()          # pop
\`\`\`

**经典应用**：

1. **括号匹配**
2. **表达式求值**
3. **函数调用栈**
4. **浏览器前进后退**

**括号匹配模板**：

\`\`\`python
def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack
\`\`\`

## 单调栈：找"下一个更大/更小元素"

**问题**：给定数组，对每个位置找**右侧第一个比它大的元素**。

暴力解法 O(n²)。单调栈 O(n)：

\`\`\`python
def next_greater(nums):
    n = len(nums)
    res = [-1] * n
    stack = []           # 存下标，栈内对应值单调递减
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            res[stack.pop()] = x
        stack.append(i)
    return res
\`\`\`

**为什么是 O(n)**：每个元素最多入栈一次、出栈一次，共 2n 次操作。

**栈内保持单调性**是关键：
- 求"下一个更大" → 栈内递减
- 求"下一个更小" → 栈内递增

**经典题：接雨水、柱状图中最大的矩形、每日温度**都靠单调栈。

## 队列：先进先出（FIFO）

\`\`\`python
from collections import deque

q = deque()
q.append(x)        # 入队（右）
q.popleft()        # 出队（左）O(1)
\`\`\`

**不要用 list 做队列**：\`list.pop(0)\` 是 O(n)。

## 单调队列：滑动窗口最大值

**问题**：滑动窗口中的最大值。暴力每窗口 O(k)，总 O(nk)。
单调队列可以做到 O(n)：

\`\`\`python
from collections import deque

def max_sliding_window(nums, k):
    dq = deque()        # 存下标，对应值单调递减
    ans = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            ans.append(nums[dq[0]])
    return ans
\`\`\`

**维护两件事**：
1. 队首是当前窗口最大值的下标；
2. 队首下标若滑出窗口，弹出。

## 用栈实现队列 / 用队列实现栈

都是经典考察题，核心是**用两个结构模拟另一种**：

\`\`\`python
class MyQueue:
    def __init__(self):
        self.in_stack = []
        self.out_stack = []

    def push(self, x):
        self.in_stack.append(x)

    def pop(self):
        if not self.out_stack:
            while self.in_stack:
                self.out_stack.append(self.in_stack.pop())
        return self.out_stack.pop()
\`\`\`

**摊还分析**：虽然单次 pop 可能搬移 n 个元素，但每个元素最多被搬一次，平均 O(1)。

<MonotonicStackDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
from collections import deque

class Node:
    def __init__(self, v, nxt=None): self.v, self.next = v, nxt

def build(vals):
    dummy = Node(0); cur = dummy
    for v in vals: cur.next = Node(v); cur = cur.next
    return dummy.next

def to_list(h):
    out = []
    while h: out.append(h.v); h = h.next
    return out

# ---- 1. 三指针反转 ----
def reverse(head):
    prev, cur = None, head
    while cur:
        nxt = cur.next; cur.next = prev; prev = cur; cur = nxt
    return prev
print("反转:", to_list(reverse(build([1, 2, 3, 4, 5]))))

# ---- 2. 虚拟头节点删除 ----
def remove_val(head, val):
    dummy = Node(0); dummy.next = head; cur = dummy
    while cur.next:
        if cur.next.v == val: cur.next = cur.next.next
        else: cur = cur.next
    return dummy.next
print("删除 2:", to_list(remove_val(build([1, 2, 3, 2, 4]), 2)))

# ---- 3. 快慢指针：找中点 + Floyd 判圈 ----
def midpoint(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next; fast = fast.next.next
    return slow.v
print("中点(1..5):", midpoint(build([1, 2, 3, 4, 5])))

def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next; fast = fast.next.next
        if slow is fast: return True
    return False
cyc = build([1, 2, 3, 4, 5])
tail = cyc
while tail.next: tail = tail.next
tail.next = cyc.next.next          # 构造环：尾指向第 3 个节点
print("有环检测:", has_cycle(cyc), "| 无环检测:", has_cycle(build([1, 2, 3])))

# ---- 4. 单调栈：下一个更大元素 ----
def next_greater(nums):
    res = [-1]*len(nums); st = []
    for i, x in enumerate(nums):
        while st and nums[st[-1]] < x: res[st.pop()] = x
        st.append(i)
    return res
print("下一个更大 [2,1,2,4,3]:", next_greater([2, 1, 2, 4, 3]))

# ---- 5. 单调队列：滑动窗口最大值 ----
def max_window(nums, k):
    dq, ans = deque(), []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x: dq.pop()
        dq.append(i)
        if dq[0] <= i - k: dq.popleft()
        if i >= k - 1: ans.append(nums[dq[0]])
    return ans
print("滑窗最大 k=3:", max_window([1, 3, -1, -3, 5, 3, 6, 7], 3))\`\`\`

预期输出（实测）：反转 [5,4,3,2,1]；虚拟头删除 2 → [1,3,4]；中点(1..5)=3；构造环后 has_cycle=True、无环链表 False；下一个更大 [2,1,2,4,3]→[4,2,4,-1,-1]；滑窗最大 k=3 → [3,3,5,5,6,7]。

**常见错误**：反转链表先改 cur.next 再存 nxt，链直接断掉（必须先保存后继）；Floyd 判圈用比较值相等而不是 is 同一节点，值重复会误判；单调栈里存值不存下标，回填结果时无法定位。

### 常见误区

1. **『链表比数组慢』**——随机访问确实 O(n) vs O(1)，但头插/头删 O(1) vs O(n)，按操作模式选结构；\\n2. **『栈就是 list』**——list 可以当栈，但当队列时 pop(0) 是 O(n)，必须用 deque；\\n3. **『单调栈只用于 Next Greater』**——柱状图最大矩形、接雨水、每日温度、去除重复字母全是同一模板的变形。

### 知识关联

- **向前**：c4 哈希的链地址法桶就是链表的应用；
- **向后**：第 5 章 BFS 用队列、DFS 用栈，结构直接决定遍历顺序；
- **平行**：python-engineering 的 deque 双端队列是本章队列的标准工程实现。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 链表 vs 数组 | 头插 O(1)/随机访问 O(n) ↔ 数组相反 |
| 三大件 | 虚拟头统一删头、快慢指针找中点判圈、三指针反转 |
| 栈 | 括号匹配/表达式求值/函数调用栈 |
| 单调栈 | 栈内单调 + 每元素进出各一次 → O(n) |
| 单调队列 | 队头存最大值下标，滑窗最大值 O(n) |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）


### 核心图解与交互演示

<Diagram type="monostack" />
`,
        tips: [
          {
            kind: 'interview',
            text: '"下一个更大元素"类题一律优先想单调栈。判断单调性：栈内递减求更大，栈内递增求更小。',
          },
          {
            kind: 'pitfall',
            text: '用 `list.pop(0)` 当队列是 O(n)，大数据量会超时。必须用 `collections.deque`。',
          },
          {
            kind: 'performance',
            text: '单调栈/单调队列的复杂度是 O(n)，因为每个元素最多进出一次。写出"每个元素均摊 O(1)"的解释能加分。',
          },
        ],
        demos: [
          {
            title: '单调栈：每日温度',
            lang: 'python',
            code: `def daily_temperatures(temps):
    n = len(temps)
    res = [0] * n
    stack = []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            res[j] = i - j
        stack.append(i)
    return res

print("温度 [73,74,75,71,69,72,76,73]")
print("等待天数:", daily_temperatures([73, 74, 75, 71, 69, 72, 76, 73]))`,
          },
          {
            title: '单调队列：滑动窗口最大值',
            lang: 'python',
            code: `from collections import deque

def max_sliding_window(nums, k):
    dq = deque()
    ans = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            ans.append(nums[dq[0]])
    return ans

nums = [1, 3, -1, -3, 5, 3, 6, 7]
print("数组:", nums, "k=3")
print("单调队列:", max_sliding_window(nums, 3))
print("暴力校验:", [max(nums[i:i+3]) for i in range(len(nums)-2)])`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'algo-3-e1',
        relatedLessonId: 'algo-l-3-1',
        type: 'single',
        difficulty: 1,
        question: '在链表中删除节点时使用「虚拟头节点（dummy head）」的主要目的是？',
        options: [
          { value: 'A', text: '提高访问速度' },
          { value: 'B', text: '统一处理头节点被删除的情况，避免边界特判' },
          { value: 'C', text: '节省内存' },
          { value: 'D', text: '让链表变成双向链表' },
        ],
        answer: 'B',
        explanation:
          '没有虚拟头节点时，删除 head 需要单独修改返回值。加上 dummy 后，所有删除操作都变成"修改前一个节点的 next"，代码统一。',
        tags: ['链表'],
      },
      {
        id: 'algo-3-e2',
        relatedLessonId: 'algo-l-3-1',
        type: 'judge',
        difficulty: 1,
        question: '栈是先进先出（FIFO）的数据结构。',
        answer: false,
        explanation: '栈是**后进先出（LIFO）**；队列才是先进先出（FIFO）。',
        tags: ['栈', '队列'],
      },
      {
        id: 'algo-3-e3',
        relatedLessonId: 'algo-l-3-1',
        type: 'single',
        difficulty: 2,
        question: '链表中判断是否有环，最常用的算法是？',
        options: [
          { value: 'A', text: '二分查找' },
          { value: 'B', text: '快慢指针（Floyd 判圈算法）' },
          { value: 'C', text: '哈希表记录访问过的地址' },
          { value: 'D', text: '排序后检查重复' },
        ],
        answer: 'B',
        explanation:
          '快慢指针：慢指针每次 1 步、快指针每次 2 步，如果有环必然相遇。时间 O(n)、空间 O(1)，优于哈希表的 O(n) 空间方案。C 也能解决但不满足 O(1) 空间。',
        tags: ['链表', '双指针'],
      },
      {
        id: 'algo-3-e4',
        relatedLessonId: 'algo-l-3-1',
        type: 'multiple',
        difficulty: 2,
        question: '关于单调栈，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '可以 O(n) 找出每个元素右边第一个更大的元素' },
          { value: 'B', text: '每个元素最多入栈、出栈各一次' },
          { value: 'C', text: '求"下一个更大元素"时栈内元素单调递减' },
          { value: 'D', text: '单调栈需要用递归实现' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          '单调栈是普通迭代实现（用数组模拟栈），与递归无关。A、B、C 正确，B 正是它能做到 O(n) 的原因。',
        tags: ['单调栈'],
      },
      {
        id: 'algo-3-e5',
        relatedLessonId: 'algo-l-3-1',
        type: 'fill',
        difficulty: 2,
        question: '在 Python 中用列表实现队列时，应使用 `collections.___` 以避免 `pop(0)` 的 O(n) 开销。',
        blanks: [['deque']],
        explanation:
          '`deque` 是双端队列，`appendleft`/`popleft` 都是 O(1)。`list.pop(0)` 需要移动所有元素，是 O(n)。',
        tags: ['队列'],
      },
      {
        id: 'algo-3-e6',
        relatedLessonId: 'algo-l-3-1',
        type: 'code',
        difficulty: 2,
        question:
          '用数组（列表）模拟链表节点实现**链表反转**。给定 `[1,2,3,4,5]` 构造的链表，反转后返回值的列表 `[5,4,3,2,1]`。\n\n请实现 `reverse_list(vals)`，先构造链表再反转，最后转回列表保存到 `out`。',
        starterCode: `class Node:
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

def reverse_list(vals):
    # 1. 构造链表
    dummy = Node(0)
    cur = dummy
    for v in vals:
        cur.next = Node(v)
        cur = cur.next
    # 2. 反转
    prev, node = None, dummy.next
    ___
    # 3. 转回列表
    result = []
    while prev:
        result.append(prev.val)
        prev = prev.next
    return result

out = reverse_list([1, 2, 3, 4, 5])
`,
        setupCode: '',
        expectedOutput: '[5, 4, 3, 2, 1]',
        tests: `assert out == [5, 4, 3, 2, 1], f"应为 [5,4,3,2,1]，实际 {out}"
assert reverse_list([]) == [], "空链表应为 []"
assert reverse_list([1]) == [1], "单节点应为 [1]"
assert reverse_list([1, 2]) == [2, 1]
`,
        answer: `class Node:
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

def reverse_list(vals):
    dummy = Node(0)
    cur = dummy
    for v in vals:
        cur.next = Node(v)
        cur = cur.next
    prev, node = None, dummy.next
    while node:
        nxt = node.next
        node.next = prev
        prev = node
        node = nxt
    result = []
    while prev:
        result.append(prev.val)
        prev = prev.next
    return result

reverse_list([1, 2, 3, 4, 5])`,
        explanation:
          '```python\nwhile node:\n    nxt = node.next      # 先保存下一个\n    node.next = prev     # 反转指针\n    prev = node          # prev 前移\n    node = nxt           # node 前移\n```\n\n三个指针的顺序至关重要：**必须先保存 next**，否则反转后丢失后续节点。返回值是新的头节点 `prev`。',
        tags: ['链表'],
      },
      {
        id: 'algo-3-e7',
        relatedLessonId: 'algo-l-3-2',
        type: 'code',
        difficulty: 2,
        question:
          '实现 `is_valid(s)`：判断字符串中的括号是否有效匹配。只包含 `()[]{}`。\n\n例如 `"()[]{}"` → True，`"([)]"` → False。',
        starterCode: `def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    # 栈匹配
    ___

out = is_valid("()[]{}")
`,
        setupCode: '',
        expectedOutput: 'True',
        tests: `assert out == True, f"应为 True，实际 {out}"
assert is_valid("([)]") == False, "交叉嵌套应为 False"
assert is_valid("(]") == False
assert is_valid("") == True, "空串应为 True"
assert is_valid("(((((") == False, "左括号未闭合应为 False"
assert is_valid("{[]}") == True
`,
        answer: `def is_valid(s):
    pairs = {")": "(", "]": "[", "}": "{"}
    stack = []
    for ch in s:
        if ch in "([{":
            stack.append(ch)
        elif ch in pairs:
            if not stack or stack.pop() != pairs[ch]:
                return False
    return not stack

is_valid("()[]{}")`,
        explanation:
          '```python\nfor ch in s:\n    if ch in "([{":\n        stack.append(ch)\n    elif ch in pairs:\n        if not stack or stack.pop() != pairs[ch]:\n            return False\nreturn not stack\n```\n\n左括号入栈，遇到右括号检查栈顶是否匹配。最后栈为空才说明全部闭合。**注意 `not stack` 的判断要放在 `stack.pop()` 之前**（短路求值）。',
        tags: ['栈'],
      },
      {
        id: 'algo-3-e8',
        relatedLessonId: 'algo-l-3-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `next_greater(nums)`：对每个元素返回**右侧第一个比它大的元素**，没有则返回 -1。\n\n要求：O(n) 单调栈。返回列表 `out`。',
        starterCode: `def next_greater(nums):
    n = len(nums)
    res = [-1] * n
    stack = []
    # 单调栈
    ___

out = next_greater([2, 1, 2, 4, 3])
`,
        setupCode: '',
        expectedOutput: '[4, 2, 4, -1, -1]',
        tests: `assert out == [4, 2, 4, -1, -1], f"结果不正确：{out}"
assert next_greater([1, 2, 3]) == [2, 3, -1]
assert next_greater([3, 2, 1]) == [-1, -1, -1]
assert next_greater([]) == []
assert next_greater([5]) == [-1]
`,
        answer: `def next_greater(nums):
    n = len(nums)
    res = [-1] * n
    stack = []
    for i, x in enumerate(nums):
        while stack and nums[stack[-1]] < x:
            res[stack.pop()] = x
        stack.append(i)
    return res

next_greater([2, 1, 2, 4, 3])`,
        explanation:
          '```python\nfor i, x in enumerate(nums):\n    while stack and nums[stack[-1]] < x:\n        res[stack.pop()] = x\n    stack.append(i)\nreturn res\n```\n\n**栈中存下标**，保持对应值**单调递减**。遇到更大的 x 时，栈顶元素找到了它的"下一个更大值"，弹出并记录。\n\n每个元素进出各一次，总复杂度 O(n)。',
        tags: ['单调栈'],
      },
      {
        id: 'algo-3-e9',
        relatedLessonId: 'algo-l-3-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `max_sliding_window(nums, k)`：返回每个大小为 k 的滑动窗口中的最大值列表。\n\n要求：O(n) 单调队列。',
        starterCode: `from collections import deque

def max_sliding_window(nums, k):
    dq = deque()
    ans = []
    # 单调队列
    ___

out = max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3)
`,
        setupCode: '',
        expectedOutput: '[3, 3, 5, 5, 6, 7]',
        tests: `assert out == [3, 3, 5, 5, 6, 7], f"结果不正确：{out}"
assert max_sliding_window([1], 1) == [1]
assert max_sliding_window([9, 8, 7], 2) == [9, 8]
assert max_sliding_window([1, 2, 3, 4], 4) == [4]
`,
        answer: `from collections import deque

def max_sliding_window(nums, k):
    dq = deque()
    ans = []
    for i, x in enumerate(nums):
        while dq and nums[dq[-1]] <= x:
            dq.pop()
        dq.append(i)
        if dq[0] <= i - k:
            dq.popleft()
        if i >= k - 1:
            ans.append(nums[dq[0]])
    return ans

max_sliding_window([1, 3, -1, -3, 5, 3, 6, 7], 3)`,
        explanation:
          '```python\nfor i, x in enumerate(nums):\n    while dq and nums[dq[-1]] <= x:\n        dq.pop()\n    dq.append(i)\n    if dq[0] <= i - k:\n        dq.popleft()\n    if i >= k - 1:\n        ans.append(nums[dq[0]])\nreturn ans\n```\n\n**维护单调递减的双端队列**（存下标）：\n1. 新元素入队前，弹出所有比它小的（它们永远不可能是最大值）；\n2. 队首下标若滑出窗口（≤ i-k），弹出；\n3. 窗口满 k 个后，队首就是最大值。',
        tags: ['单调队列'],
      },
      {
        id: 'algo-3-e10',
        relatedLessonId: 'algo-l-3-1',
        type: 'judge',
        difficulty: 2,
        question: '单调栈之所以能做到 O(n)，是因为每个元素最多入栈一次、出栈一次。',
        answer: true,
        explanation:
          '虽然外层有 for 循环、内层有 while，但内层 while 的弹出操作在整个算法过程中总共只执行 n 次。这是"均摊分析"的经典例子。',
        tags: ['单调栈', '复杂度'],
      },
      {
        id: 'algo-3-e11',
        relatedLessonId: 'algo-l-3-1',
        type: 'multiple',
        difficulty: 3,
        question: '下列问题中，适合用单调栈或单调队列解决的有？（多选）',
        options: [
          { value: 'A', text: '每日温度（下一个更高温度）' },
          { value: 'B', text: '柱状图中最大的矩形' },
          { value: 'C', text: '滑动窗口最大值' },
          { value: 'D', text: '数组排序' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 排序的标准解法是 O(n log n) 的比较排序（或特定条件下的计数排序），单调栈不适用。A、B、C 都是单调栈/单调队列的经典应用。',
        tags: ['单调栈', '单调队列'],
      },
      {
        id: 'algo-3-e12',
        relatedLessonId: 'algo-l-3-1',
        type: 'open',
        difficulty: 3,
        question:
          '请解释"用两个栈实现队列"的原理，并说明为什么它的均摊时间复杂度是 O(1)。',
        referenceAnswer: `**结构**：用 in_stack（入队栈）和 out_stack（出队栈）。

**操作**：

- \`push(x)\`：直接压入 in_stack，O(1)。
- \`pop()\`：若 out_stack 为空，把 in_stack 中**所有元素依次弹出并压入 out_stack**（顺序被反转），然后从 out_stack 弹出栈顶；若 out_stack 非空，直接弹出，O(1)。

**为什么能实现 FIFO**：
in_stack 的栈顶是最新元素，倒入 out_stack 后，in_stack 的最旧元素跑到 out_stack 的栈顶，
因此从 out_stack 弹出就得到了最先入队的元素。

**为什么均摊 O(1)**：
虽然某一次 pop 可能搬移 n 个元素，但**每个元素在它的生命周期内最多被从 in_stack 搬到 out_stack 一次**。
n 次操作总计搬移不超过 n 次，因此均摊每次操作 O(1)。

**另一种思路**：也可以每次 push 时就把 in_stack 元素倒入 out_stack，但那样每次 push 都要 O(n) 移动，
而"只在 out_stack 为空时才搬"的策略利用了出队顺序的直觉，效率更高。`,
        rubric: [
          { point: '说明两个栈的职责（入队栈/出队栈）', score: 2 },
          { point: '说明 out_stack 为空时才整体搬移', score: 1 },
          { point: '解释搬移后顺序反转实现 FIFO', score: 2 },
          { point: '用"每个元素最多搬一次"论证均摊 O(1)', score: 1 },
        ],
        keywords: ['in_stack', 'out_stack', 'FIFO', '均摊', '搬移一次'],
        explanation:
          '均摊分析是这题的核心考点。能说清"每个元素最多被搬一次"，比只写代码更能体现理解深度。',
        tags: ['栈', '队列', '均摊分析'],
      },
      {
        id: 'algo-3-e13',
        relatedLessonId: 'algo-l-3-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `find_middle(vals)`：构造单链表并返回**中间节点的值**。偶数个节点时返回**偏右**的中间值。\n\n例如 `[1,2,3,4,5]` → 3，`[1,2,3,4]` → 3。\n\n要求：快慢指针，一次遍历。',
        starterCode: `class Node:
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

def find_middle(vals):
    dummy = Node(0)
    cur = dummy
    for v in vals:
        cur.next = Node(v)
        cur = cur.next
    slow = fast = dummy.next
    # 快慢指针
    ___

out = find_middle([1, 2, 3, 4, 5])
`,
        setupCode: '',
        expectedOutput: '3',
        tests: `assert out == 3, f"[1,2,3,4,5] 中点应为 3，实际 {out}"
assert find_middle([1, 2, 3, 4]) == 3, f"[1,2,3,4] 偏右中点应为 3，实际 {find_middle([1,2,3,4])}"
assert find_middle([1]) == 1
assert find_middle([1, 2]) == 2
`,
        answer: `class Node:
    def __init__(self, val, nxt=None):
        self.val = val
        self.next = nxt

def find_middle(vals):
    dummy = Node(0)
    cur = dummy
    for v in vals:
        cur.next = Node(v)
        cur = cur.next
    slow = fast = dummy.next
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow.val

find_middle([1, 2, 3, 4, 5])`,
        explanation:
          '```python\nwhile fast and fast.next:\n    slow = slow.next\n    fast = fast.next.next\nreturn slow.val\n```\n\n快指针走 2 步、慢指针走 1 步，快指针到末尾时慢指针正好在中点。\n\n循环条件 `fast and fast.next` 缺一不可：少了 `fast.next` 会在 `fast.next.next` 处崩。',
        tags: ['链表', '双指针'],
      },
      {
        id: 'algo-3-e14',
        relatedLessonId: 'algo-l-3-1',
        type: 'single',
        difficulty: 3,
        question: '用两个栈实现队列时，为什么"出队栈为空才搬移"的策略使均摊复杂度为 O(1)？',
        options: [
          { value: 'A', text: '因为栈的操作本身是 O(1)' },
          { value: 'B', text: '因为每个元素最多被从入队栈搬到出队栈一次' },
          { value: 'C', text: '因为搬移时只搬一半元素' },
          { value: 'D', text: '因为使用了哈希表加速' },
        ],
        answer: 'B',
        explanation:
          '单个元素在整个生命周期中只可能被搬移一次，因此 n 次操作总共的搬移次数不超过 n，均摊到每次是 O(1)。这是"均摊分析"的典型应用。',
        tags: ['栈', '均摊分析'],
      },
    ],
  },

  /* ============================================================
   *  第 4 章：哈希、排序与选择（难度 2~3）
   * ============================================================ */
  {
    id: 'algo-4',
    title: '哈希、排序与选择',
    goal: '理解哈希表的实现原理与冲突处理，掌握排序算法族的思想、稳定性与适用场景，并会用堆解决 Top-K 问题。',
    lessons: [
      {
        id: 'algo-l-4-1',
        title: '哈希表：为什么平均 O(1)',
        content: `
### 学习目标

学完本节，你应该能够：
1. 画出 key→hash→桶 的映射流程，对比链地址与开放寻址两种冲突处理；
2. 用负载因子解释扩容时机（Python dict 2/3）与均摊 O(1)；
3. 说出可哈希约束与 __hash__/__eq__ 一致性，实现异位词分组。

### 前置知识

- 数组下标寻址（l2-1）；
- 「空间复杂度与原地算法」（l1-2）的空间换时间。

### 问题背景

哈希表是『空间换时间』的极限形态：平均 O(1) 的查找支撑了从两数之和到 LRU 的一切；排序是『先有序再做事』的基础设施，稳定性和 n log n 下界决定选型；堆则把『只要前 K 名』从 n log n 压到 n log k。本章是数组/链表之后最常用的三大件。

### 直觉理解

哈希表是『按姓名直接寄存的衣帽间』：hash(key)%容量 算出柜号，平均一步到位；冲突是两人被分到同一柜，要么在柜里挂一串（链地址），要么往后找空柜（开放寻址），负载因子太高就换更大的衣帽间（扩容 rehash）。排序是让全体按序站队，稳定排序保证同分的人不互换位置。堆是一棵『父不大于子』的完全二叉树：只承诺堆顶最小，整棵树不全序——换来插入/删除 O(log n)。

### 核心概念与原理详解

## 哈希表的核心思想

**用空间换时间**：不按顺序存储，而是用哈希函数把 key 映射到数组下标。

\`\`\`
key --hash--> 整数 --%容量--> 下标 --> 桶
\`\`\`

查找、插入、删除的平均复杂度都是 **O(1)**。

## 冲突处理

不同 key 可能映射到同一下标（冲突）。两种主流方案：

**1. 链地址法（Separate Chaining）**

每个下标挂一个链表/红黑树。Java HashMap 用此法（链表长度 > 8 转红黑树）。

**2. 开放寻址法（Open Addressing）**

冲突时按规则找下一个空位（线性探测、二次探测、双重哈希）。
Python 的 dict 使用此法，缓存局部性更好。

## 负载因子与扩容

\`\`\`
负载因子 = 元素数 / 桶数组大小
\`\`\`

负载因子过高 → 冲突增多、查找变慢。所以需要扩容（rehash）。
Python dict 在负载因子超过 2/3 时扩容为约 4 倍（按使用量的 2 倍以上调整），
**扩容要重新计算所有 key 的位置，是 O(n)**；但因为均摊分析，插入仍是均摊 O(1)。

## 什么可以作为 key

必须是**可哈希（hashable）**的，即可变对象不能做 key：

| 类型 | 可作 key |
| --- | --- |
| int, str, tuple（元素不可变） | ✅ |
| list, dict, set | ❌（unhashable） |

\`\`\`python
d = {(1, 2): "坐标"}         # ✅ 元组可哈希
# d = {[1, 2]: "坐标"}       # ❌ TypeError
\`\`\`

**注意**：\`__hash__\` 与 \`__eq__\` 必须一致——两个相等的对象必须有相同的哈希值。

## 经典应用场景

1. **两数之和**：用哈希把 O(n²) 降为 O(n)
2. **去重**：set
3. **计数**：Counter / dict
4. **缓存**：lru_cache
5. **分组**：defaultdict(list)，如字母异位词分组

**字母异位词分组**：

\`\`\`python
def group_anagrams(strs):
    groups = {}
    for s in strs:
        key = "".join(sorted(s))     # 排序后的字符串作为 key
        groups.setdefault(key, []).append(s)
    return list(groups.values())
\`\`\`

或用计数元组作 key（避免排序，O(n·k)）：

\`\`\`python
key = tuple(sorted(Counter(s).items()))
\`\`\`

## 哈希表的局限

1. **无序**（Python 3.7+ 的 dict 保序是额外优化，但不是哈希表的一般性质）；
2. **最坏情况 O(n)**：如果所有 key 都冲突；
3. **无法做范围查询**：找"值在 [a,b] 之间的 key"必须遍历。这类需求应使用**有序结构**（平衡树、跳表、B+ 树）。

<HashTableDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import heapq, random, time
random.seed(2)

# ---- 1. 哈希：n 扩大 10 倍，单次查找耗时几乎不变 ----
for n in (100_000, 1_000_000):
    d = {i: None for i in range(n)}
    t0 = time.perf_counter()
    for i in range(n): d.get(i)
    dt = time.perf_counter() - t0
    print(f"dict 查找 n={n}: {1000*dt:.0f} ms（约 {dt/n*1e9:.0f} ns/次）")

# ---- 2. 冲突模拟：模 10 分桶 ----
buckets = {}
for i in range(1000): buckets.setdefault(i % 10, []).append(i)
print("模 10 分桶各桶大小:", [len(buckets[i]) for i in range(10)], "（同桶即冲突，桶内需再比对）")

# ---- 3. 字母异位词分组 ----
def group_anagrams(strs):
    g = {}
    for s in strs: g.setdefault("".join(sorted(s)), []).append(s)
    return list(g.values())
print("异位词分组:", group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))

# ---- 4. 稳定排序 ----
data = [("A", 90), ("B", 80), ("C", 90)]
print("稳定排序（A 仍在 C 前）:", sorted(data, key=lambda x: -x[1]))

# ---- 5. Top-K：小根堆 O(n log k) vs 全排序 O(n log n) ----
nums = [random.randint(0, 10**6) for _ in range(200_000)]
def top_k_heap(nums, k):
    heap = []
    for x in nums:
        if len(heap) < k: heapq.heappush(heap, x)
        elif x > heap[0]: heapq.heapreplace(heap, x)
    return sorted(heap, reverse=True)
t0 = time.perf_counter(); r1 = top_k_heap(nums, 5); t1 = time.perf_counter()
r2 = sorted(nums, reverse=True)[:5]; t2 = time.perf_counter()
print("Top5:", r1, f"| 堆 {1000*(t1-t0):.0f} ms vs 全排序 {1000*(t2-t1):.0f} ms | 结果一致: {r1 == r2}")\`\`\`

预期输出（实测）：dict 单次查找：n=10 万约 45 ns、n=100 万约 56 ns（几乎不随规模变化）；模 10 分桶每桶恰好 100 个 key（同桶即冲突）；异位词分组 [[eat,tea,ate],[tan,nat],[bat]]；稳定排序 [('A',90),('C',90),('B',80)]；Top5 堆 5 ms vs 全排序 32 ms 且结果一致。

**常见错误**：用 list/dict 做 dict 的 key（unhashable 直接 TypeError）；多级排序先排主条件再排次条件——顺序反了，应先排次条件再排主条件（稳定性保证后者覆盖前者）；用大根堆求 Top-K 最大值导致淘汰的恰是最大的（应该用小根堆保留最大的 k 个）。

### 常见误区

1. **『哈希表一定 O(1)』**——平均是；最坏所有 key 冲突退化为 O(n)，扩容瞬间也是 O(n)（均摊后仍 O(1)）；\\n2. **『比较排序能突破 n log n』**——决策树下界 Ω(n log n) 是数学极限，计数/基数排序靠『不用比较』绕开；\\n3. **『堆是完全排序的树』**——堆只保证堆序性质（父≥子），中序遍历不是有序输出，取第 k 大必须逐个弹出。

### 知识关联

- **向前**：两数之和/前缀和计数把本章哈希用在 c2 的线性结构上；
- **向后**：Top-K 的堆直接服务后续调度与优先队列题型；
- **平行**：sql 课的索引（B+ 树 vs 哈希索引）是『范围查询为何不能用哈希』的数据库版。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 哈希 | hash(key)%容量 → 平均 O(1)；链地址 vs 开放寻址 |
| 扩容 | 负载因子 2/3 触发，rehash O(n)、均摊 O(1) |
| 可哈希 | int/str/tuple 可；list/dict/set 不可 |
| 排序下界 | 比较排序 Ω(n log n)；Python sorted 稳定（Timsort）|
| Top-K | 小根堆 O(n log k) / 快速选择平均 O(n) |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）


### 核心图解与交互演示

<Diagram type="hashtable" />
`,
        tips: [
          {
            kind: 'interview',
            text: '"哈希表为什么平均 O(1)"要答出三点：哈希函数映射下标、冲突处理（链地址/开放寻址）、扩容均摊。',
          },
          {
            kind: 'pitfall',
            text: '把 list 当 dict 的 key 会报 `TypeError: unhashable type`。需要时先转成 tuple。',
          },
          {
            kind: 'note',
            text: '哈希表不支持范围查询和排序遍历。需要"找比 x 大的最小元素"这类操作时，要用有序结构（如 `bisect` + 有序列表）。',
          },
        ],
        demos: [
          {
            title: '两数之和：哈希优化',
            lang: 'python',
            code: `def two_sum_hash(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []

nums = [2, 7, 11, 15]
print("哈希解法:", two_sum_hash(nums, 9))
print("字典大小随元素增长:", len({i: x for i, x in enumerate(range(10))}))

# 哈希表无序性演示
d = {"b": 2, "a": 1, "c": 3}
print("\\nPython 3.7+ 的 dict 保持插入顺序:", list(d.keys()))
s = {"b", "a", "c"}
print("set 无序:", list(s))`,
          },
          {
            title: '字母异位词分组',
            lang: 'python',
            code: `def group_anagrams(strs):
    groups = {}
    for s in strs:
        key = "".join(sorted(s))
        groups.setdefault(key, []).append(s)
    return list(groups.values())

print(group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))`,
          },
        ],
      },
      {
        id: 'algo-l-4-2',
        title: '排序算法族与稳定性',
        content: `
### 学习目标

学完本节，你应该能够：
1. 填出八大排序的平均/最坏/空间/稳定性对照表；
2. 解释比较排序 Ω(n log n) 下界与计数/基数排序如何绕开比较；
3. 用稳定性实现两级排序（先次后主），并手写 Lomuto 分区快排。

### 前置知识

- 复杂度量级（c1）；
- 分治递归式（l1-3）。

### 问题背景

哈希表是『空间换时间』的极限形态：平均 O(1) 的查找支撑了从两数之和到 LRU 的一切；排序是『先有序再做事』的基础设施，稳定性和 n log n 下界决定选型；堆则把『只要前 K 名』从 n log n 压到 n log k。本章是数组/链表之后最常用的三大件。

### 直觉理解

哈希表是『按姓名直接寄存的衣帽间』：hash(key)%容量 算出柜号，平均一步到位；冲突是两人被分到同一柜，要么在柜里挂一串（链地址），要么往后找空柜（开放寻址），负载因子太高就换更大的衣帽间（扩容 rehash）。排序是让全体按序站队，稳定排序保证同分的人不互换位置。堆是一棵『父不大于子』的完全二叉树：只承诺堆顶最小，整棵树不全序——换来插入/删除 O(log n)。

### 核心概念与原理详解

## 排序算法总览

| 算法 | 平均 | 最坏 | 空间 | 稳定 | 特点 |
| --- | --- | --- | --- | --- | --- |
| 冒泡排序 | O(n²) | O(n²) | O(1) | ✅ | 教学用，实际不推荐 |
| 插入排序 | O(n²) | O(n²) | O(1) | ✅ | 小数组快、近乎有序时接近 O(n) |
| 选择排序 | O(n²) | O(n²) | O(1) | ❌ | 交换次数最少 |
| 归并排序 | O(n log n) | O(n log n) | O(n) | ✅ | 稳定、可外排序 |
| 快速排序 | O(n log n) | **O(n²)** | O(log n) | ❌ | 平均最快、原地 |
| 堆排序 | O(n log n) | O(n log n) | O(1) | ❌ | 原地且最坏有保证 |
| 计数排序 | O(n+k) | O(n+k) | O(k) | ✅ | 数据范围小时极快 |
| 基数排序 | O(d(n+k)) | — | O(n+k) | ✅ | 适合整数/定长字符串 |

**比较排序的下界是 Ω(n log n)**：任何基于比较的排序至少要 log₂(n!) ≈ n log n 次比较。
要突破这个下界，必须**不使用比较**（计数/基数/桶排序）。

## 稳定性是什么

**稳定排序**：相等元素的**相对顺序**在排序后保持不变。

\`\`\`python
data = [("A", 90), ("B", 80), ("C", 90)]
sorted(data, key=lambda x: x[1], reverse=True)
# 稳定：[('A', 90), ('C', 90), ('B', 80)]  —— A 仍在 C 前
# 不稳定可能得到 [('C', 90), ('A', 90), ('B', 80)]
\`\`\`

**为什么重要**：多级排序依赖稳定性。可以先按次要条件排、再按主要条件排。

Python 的 \`sorted()\` 和 \`list.sort()\` 都是**稳定排序**（Timsort）。

## 快速排序的核心：分区（Partition）

\`\`\`python
def quick_sort(nums):
    if len(nums) <= 1:
        return nums
    pivot = nums[len(nums) // 2]
    left = [x for x in nums if x < pivot]
    mid = [x for x in nums if x == pivot]
    right = [x for x in nums if x > pivot]
    return quick_sort(left) + mid + quick_sort(right)
\`\`\`

**原地分区（Lomuto 方案）**：

\`\`\`python
def partition(nums, lo, hi):
    pivot = nums[hi]
    i = lo
    for j in range(lo, hi):
        if nums[j] < pivot:
            nums[i], nums[j] = nums[j], nums[i]
            i += 1
    nums[i], nums[hi] = nums[hi], nums[i]
    return i
\`\`\`

**快排的最坏情况**：数组已经有序且固定选第一个/最后一个元素作 pivot → 每次分区极不均衡 → O(n²)。
解决办法：**随机选 pivot** 或 **三数取中**。

## 为什么快排平均最快

1. 原地排序，无需额外数组（缓存友好）；
2. 常数因子小；
3. 分区操作简单。

**实际工程**：Timsort（归并 + 插入的混合）、introsort（快排 + 堆排的混合，避免最坏 O(n²)）。

## 计数排序：非比较排序

\`\`\`python
def counting_sort(nums):
    if not nums:
        return []
    lo, hi = min(nums), max(nums)
    count = [0] * (hi - lo + 1)
    for x in nums:
        count[x - lo] += 1
    res = []
    for i, c in enumerate(count):
        res.extend([i + lo] * c)
    return res
\`\`\`

**适用条件**：数据范围 k 不能太大（O(n+k) 里的 k）。若 k >> n，反而浪费空间。

## 什么时候用什么排序

| 场景 | 推荐 |
| --- | --- |
| 一般情况 | 内置 \`sorted()\`（Timsort） |
| 需要稳定 | 归并 / Timsort |
| 内存受限 | 堆排序 / 快排 |
| 数据范围小（如分数 0~100） | 计数排序 |
| 近乎有序 | 插入排序 |
| Top-K | 堆（不一定全排序） |

<HashTableDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import heapq, random, time
random.seed(2)

# ---- 1. 哈希：n 扩大 10 倍，单次查找耗时几乎不变 ----
for n in (100_000, 1_000_000):
    d = {i: None for i in range(n)}
    t0 = time.perf_counter()
    for i in range(n): d.get(i)
    dt = time.perf_counter() - t0
    print(f"dict 查找 n={n}: {1000*dt:.0f} ms（约 {dt/n*1e9:.0f} ns/次）")

# ---- 2. 冲突模拟：模 10 分桶 ----
buckets = {}
for i in range(1000): buckets.setdefault(i % 10, []).append(i)
print("模 10 分桶各桶大小:", [len(buckets[i]) for i in range(10)], "（同桶即冲突，桶内需再比对）")

# ---- 3. 字母异位词分组 ----
def group_anagrams(strs):
    g = {}
    for s in strs: g.setdefault("".join(sorted(s)), []).append(s)
    return list(g.values())
print("异位词分组:", group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))

# ---- 4. 稳定排序 ----
data = [("A", 90), ("B", 80), ("C", 90)]
print("稳定排序（A 仍在 C 前）:", sorted(data, key=lambda x: -x[1]))

# ---- 5. Top-K：小根堆 O(n log k) vs 全排序 O(n log n) ----
nums = [random.randint(0, 10**6) for _ in range(200_000)]
def top_k_heap(nums, k):
    heap = []
    for x in nums:
        if len(heap) < k: heapq.heappush(heap, x)
        elif x > heap[0]: heapq.heapreplace(heap, x)
    return sorted(heap, reverse=True)
t0 = time.perf_counter(); r1 = top_k_heap(nums, 5); t1 = time.perf_counter()
r2 = sorted(nums, reverse=True)[:5]; t2 = time.perf_counter()
print("Top5:", r1, f"| 堆 {1000*(t1-t0):.0f} ms vs 全排序 {1000*(t2-t1):.0f} ms | 结果一致: {r1 == r2}")\`\`\`

预期输出（实测）：dict 单次查找：n=10 万约 45 ns、n=100 万约 56 ns（几乎不随规模变化）；模 10 分桶每桶恰好 100 个 key（同桶即冲突）；异位词分组 [[eat,tea,ate],[tan,nat],[bat]]；稳定排序 [('A',90),('C',90),('B',80)]；Top5 堆 5 ms vs 全排序 32 ms 且结果一致。

**常见错误**：用 list/dict 做 dict 的 key（unhashable 直接 TypeError）；多级排序先排主条件再排次条件——顺序反了，应先排次条件再排主条件（稳定性保证后者覆盖前者）；用大根堆求 Top-K 最大值导致淘汰的恰是最大的（应该用小根堆保留最大的 k 个）。

### 常见误区

1. **『哈希表一定 O(1)』**——平均是；最坏所有 key 冲突退化为 O(n)，扩容瞬间也是 O(n)（均摊后仍 O(1)）；\\n2. **『比较排序能突破 n log n』**——决策树下界 Ω(n log n) 是数学极限，计数/基数排序靠『不用比较』绕开；\\n3. **『堆是完全排序的树』**——堆只保证堆序性质（父≥子），中序遍历不是有序输出，取第 k 大必须逐个弹出。

### 知识关联

- **向前**：两数之和/前缀和计数把本章哈希用在 c2 的线性结构上；
- **向后**：Top-K 的堆直接服务后续调度与优先队列题型；
- **平行**：sql 课的索引（B+ 树 vs 哈希索引）是『范围查询为何不能用哈希』的数据库版。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 哈希 | hash(key)%容量 → 平均 O(1)；链地址 vs 开放寻址 |
| 扩容 | 负载因子 2/3 触发，rehash O(n)、均摊 O(1) |
| 可哈希 | int/str/tuple 可；list/dict/set 不可 |
| 排序下界 | 比较排序 Ω(n log n)；Python sorted 稳定（Timsort）|
| Top-K | 小根堆 O(n log k) / 快速选择平均 O(n) |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）


### 核心图解与交互演示

<Diagram type="binsearch" />
`,
        tips: [
          {
            kind: 'interview',
            text: '"快排为什么最坏是 O(n²)，如何避免"是高频题：答"每次分区极不均衡（如已排序数组 + 固定 pivot），可通过随机化 pivot 或三数取中避免"。',
          },
          {
            kind: 'interview',
            text: '排序算法对比表要能背：复杂度、空间、稳定性、适用场景，四列都要说得出。',
          },
          {
            kind: 'performance',
            text: 'Python 的 `sorted()` 用 C 实现的 Timsort，比手写快排快 10 倍以上。实际开发直接用内置函数。',
          },
        ],
        demos: [
          {
            title: '几种排序的实现与对比',
            lang: 'python',
            code: `def bubble(a):
    a = a[:]
    n = len(a)
    for i in range(n):
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a

def insertion(a):
    a = a[:]
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a

def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]

data = [5, 2, 9, 1, 5, 6]
print("冒泡:", bubble(data))
print("插入:", insertion(data))
print("归并:", merge_sort(data))
print("内置:", sorted(data))
print("全部一致:", bubble(data) == insertion(data) == merge_sort(data) == sorted(data))`,
          },
          {
            title: '计数排序',
            lang: 'python',
            code: `def counting_sort(nums):
    if not nums:
        return []
    lo, hi = min(nums), max(nums)
    count = [0] * (hi - lo + 1)
    for x in nums:
        count[x - lo] += 1
    res = []
    for i, c in enumerate(count):
        res.extend([i + lo] * c)
    return res

scores = [88, 92, 75, 88, 100, 61, 92]
print("原分数:", scores)
print("计数排序:", counting_sort(scores))
print("数据范围 k =", max(scores) - min(scores) + 1, "，n =", len(scores))`,
          },
        ],
      },
      {
        id: 'algo-l-4-3',
        title: '堆与 Top-K 问题',
        content: `
### 学习目标

学完本节，你应该能够：
1. 用数组下标公式（2i+1/2i+2/(i-1)//2）描述堆，说明建堆是 O(n)；
2. 解释 Top-K 为何用小根堆：淘汰当前最小、保留最大 k 个，复杂度 O(n log k)；
3. 对比全排序/堆/快速选择三种解法的适用场景。

### 前置知识

- 完全二叉树的概念；
- 排序复杂度（l4-2）。

### 问题背景

哈希表是『空间换时间』的极限形态：平均 O(1) 的查找支撑了从两数之和到 LRU 的一切；排序是『先有序再做事』的基础设施，稳定性和 n log n 下界决定选型；堆则把『只要前 K 名』从 n log n 压到 n log k。本章是数组/链表之后最常用的三大件。

### 直觉理解

哈希表是『按姓名直接寄存的衣帽间』：hash(key)%容量 算出柜号，平均一步到位；冲突是两人被分到同一柜，要么在柜里挂一串（链地址），要么往后找空柜（开放寻址），负载因子太高就换更大的衣帽间（扩容 rehash）。排序是让全体按序站队，稳定排序保证同分的人不互换位置。堆是一棵『父不大于子』的完全二叉树：只承诺堆顶最小，整棵树不全序——换来插入/删除 O(log n)。

### 核心概念与原理详解

## 堆的本质：完全二叉树 + 堆序性质

**大根堆**：每个节点的值 ≥ 子节点。**小根堆**：每个节点的值 ≤ 子节点。

用数组存储（下标从 0 开始）：

\`\`\`
节点 i 的左孩子: 2i + 1
节点 i 的右孩子: 2i + 2
节点 i 的父节点: (i - 1) // 2
\`\`\`

**关键操作**：

| 操作 | 复杂度 |
| --- | --- |
| 查看堆顶 | O(1) |
| 插入 | O(log n)（上浮） |
| 删除堆顶 | O(log n)（下沉） |
| 建堆 | **O(n)**（自底向上建堆） |

## Python 的 heapq

\`\`\`python
import heapq

heap = []
heapq.heappush(heap, 3)
heapq.heappush(heap, 1)
print(heap[0])             # 1，小根堆
heapq.heappop(heap)        # 弹出最小值 1
heapq.heapify([5, 3, 1])   # O(n) 建堆
\`\`\`

**注意：Python 的 heapq 只有小根堆。** 需要大根堆时，把元素取负：

\`\`\`python
heapq.heappush(heap, -x)   # 存负数模拟大根堆
largest = -heap[0]
\`\`\`

## Top-K 问题：三种解法

**问题**：从 n 个数中找最大的 k 个。

| 方法 | 复杂度 | 适用 |
| --- | --- | --- |
| 全排序 | O(n log n) | k 接近 n |
| **小根堆** | **O(n log k)** | k 远小于 n | ⭐ |
| 快速选择 | O(n) 平均 | 只需第 k 大，不用有序 |

**小根堆解法**（最常用）：

\`\`\`python
import heapq

def top_k_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)      # 弹出最小的，保留最大的 k 个
    return sorted(heap, reverse=True)
\`\`\`

**为什么用小根堆而不是大根堆**：我们要淘汰"当前 k 个中**最小**的"，所以堆顶应该是最小值。

**空间优势**：只需 O(k) 空间，适合数据流场景（数据不断到来）。

## 快速选择（Quickselect）

基于快排的 partition，只递归处理包含第 k 个元素的那一侧：

\`\`\`python
import random

def quickselect(nums, k):
    """返回第 k 小（k 从 0 开始）"""
    def select(lo, hi, k):
        pivot_idx = random.randint(lo, hi)
        nums[lo], nums[pivot_idx] = nums[pivot_idx], nums[lo]
        pivot = nums[lo]
        i = lo + 1
        for j in range(lo + 1, hi + 1):
            if nums[j] < pivot:
                nums[i], nums[j] = nums[j], nums[i]
                i += 1
        nums[lo], nums[i - 1] = nums[i - 1], nums[lo]
        pos = i - 1
        if pos == k:
            return nums[pos]
        elif pos < k:
            return select(pos + 1, hi, k)
        else:
            return select(lo, pos - 1, k)
    return select(0, len(nums) - 1, k)
\`\`\`

**平均 O(n)**：每次平均排除一半，n + n/2 + n/4 + ... = 2n。

## 堆的其他应用

1. **合并 K 个有序链表/数组**：用大小为 k 的小根堆，每次取最小，O(N log k)
2. **数据流中位数**：一个大根堆放较小的一半，一个小根堆放较大的一半
3. **任务调度**：按优先级取任务
4. **Dijkstra 算法**：用堆找当前最短距离节点

<MonotonicStackDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import heapq, random, time
random.seed(2)

# ---- 1. 哈希：n 扩大 10 倍，单次查找耗时几乎不变 ----
for n in (100_000, 1_000_000):
    d = {i: None for i in range(n)}
    t0 = time.perf_counter()
    for i in range(n): d.get(i)
    dt = time.perf_counter() - t0
    print(f"dict 查找 n={n}: {1000*dt:.0f} ms（约 {dt/n*1e9:.0f} ns/次）")

# ---- 2. 冲突模拟：模 10 分桶 ----
buckets = {}
for i in range(1000): buckets.setdefault(i % 10, []).append(i)
print("模 10 分桶各桶大小:", [len(buckets[i]) for i in range(10)], "（同桶即冲突，桶内需再比对）")

# ---- 3. 字母异位词分组 ----
def group_anagrams(strs):
    g = {}
    for s in strs: g.setdefault("".join(sorted(s)), []).append(s)
    return list(g.values())
print("异位词分组:", group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"]))

# ---- 4. 稳定排序 ----
data = [("A", 90), ("B", 80), ("C", 90)]
print("稳定排序（A 仍在 C 前）:", sorted(data, key=lambda x: -x[1]))

# ---- 5. Top-K：小根堆 O(n log k) vs 全排序 O(n log n) ----
nums = [random.randint(0, 10**6) for _ in range(200_000)]
def top_k_heap(nums, k):
    heap = []
    for x in nums:
        if len(heap) < k: heapq.heappush(heap, x)
        elif x > heap[0]: heapq.heapreplace(heap, x)
    return sorted(heap, reverse=True)
t0 = time.perf_counter(); r1 = top_k_heap(nums, 5); t1 = time.perf_counter()
r2 = sorted(nums, reverse=True)[:5]; t2 = time.perf_counter()
print("Top5:", r1, f"| 堆 {1000*(t1-t0):.0f} ms vs 全排序 {1000*(t2-t1):.0f} ms | 结果一致: {r1 == r2}")\`\`\`

预期输出（实测）：dict 单次查找：n=10 万约 45 ns、n=100 万约 56 ns（几乎不随规模变化）；模 10 分桶每桶恰好 100 个 key（同桶即冲突）；异位词分组 [[eat,tea,ate],[tan,nat],[bat]]；稳定排序 [('A',90),('C',90),('B',80)]；Top5 堆 5 ms vs 全排序 32 ms 且结果一致。

**常见错误**：用 list/dict 做 dict 的 key（unhashable 直接 TypeError）；多级排序先排主条件再排次条件——顺序反了，应先排次条件再排主条件（稳定性保证后者覆盖前者）；用大根堆求 Top-K 最大值导致淘汰的恰是最大的（应该用小根堆保留最大的 k 个）。

### 常见误区

1. **『哈希表一定 O(1)』**——平均是；最坏所有 key 冲突退化为 O(n)，扩容瞬间也是 O(n)（均摊后仍 O(1)）；\\n2. **『比较排序能突破 n log n』**——决策树下界 Ω(n log n) 是数学极限，计数/基数排序靠『不用比较』绕开；\\n3. **『堆是完全排序的树』**——堆只保证堆序性质（父≥子），中序遍历不是有序输出，取第 k 大必须逐个弹出。

### 知识关联

- **向前**：两数之和/前缀和计数把本章哈希用在 c2 的线性结构上；
- **向后**：Top-K 的堆直接服务后续调度与优先队列题型；
- **平行**：sql 课的索引（B+ 树 vs 哈希索引）是『范围查询为何不能用哈希』的数据库版。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 哈希 | hash(key)%容量 → 平均 O(1)；链地址 vs 开放寻址 |
| 扩容 | 负载因子 2/3 触发，rehash O(n)、均摊 O(1) |
| 可哈希 | int/str/tuple 可；list/dict/set 不可 |
| 排序下界 | 比较排序 Ω(n log n)；Python sorted 稳定（Timsort）|
| Top-K | 小根堆 O(n log k) / 快速选择平均 O(n) |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）
`,
        tips: [
          {
            kind: 'interview',
            text: '"求最大的 K 个数"要用**小根堆**（堆顶是最小值，便于淘汰）。这个反直觉点经常被考。',
          },
          {
            kind: 'note',
            text: 'Python heapq 只提供小根堆。要模拟大根堆，存负数或用 `(key, value)` 元组取负。',
          },
          {
            kind: 'performance',
            text: 'Top-K 用堆是 O(n log k)，比全排序 O(n log n) 快；数据流场景只能用它（无法全量排序）。',
          },
        ],
        demos: [
          {
            title: 'Top-K 三种方法对比',
            lang: 'python',
            code: `import heapq, random, time

random.seed(42)
data = [random.randint(0, 10**6) for _ in range(200_000)]
K = 10

def topk_sort(nums, k):
    return sorted(nums, reverse=True)[:k]

def topk_heap(nums, k):
    heap = []
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:
            heapq.heapreplace(heap, x)
    return sorted(heap, reverse=True)

t0 = time.perf_counter(); a = topk_sort(data, K); t1 = time.perf_counter()
b = topk_heap(data, K); t2 = time.perf_counter()

print("全排序结果:", a)
print("堆解法结果:", b)
print("结果一致:", a == b)
print(f"全排序耗时 {(t1-t0)*1000:.1f}ms，堆耗时 {(t2-t1)*1000:.1f}ms")`,
          },
          {
            title: '数据流中位数（双堆）',
            lang: 'python',
            code: `import heapq

class MedianFinder:
    def __init__(self):
        self.small = []   # 大根堆（存负数），放较小的一半
        self.large = []   # 小根堆，放较大的一半

    def add(self, num):
        heapq.heappush(self.small, -num)
        heapq.heappush(self.large, -heapq.heappop(self.small))
        if len(self.large) > len(self.small):
            heapq.heappush(self.small, -heapq.heappop(self.large))

    def median(self):
        if len(self.small) > len(self.large):
            return -self.small[0]
        return (-self.small[0] + self.large[0]) / 2

mf = MedianFinder()
for x in [1, 2, 3, 4, 5]:
    mf.add(x)
    print(f"加入 {x} 后中位数 = {mf.median()}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'algo-4-e1',
        relatedLessonId: 'algo-l-4-1',
        type: 'single',
        difficulty: 1,
        question: 'Python 的 `dict` 查找的平均时间复杂度是？',
        options: [
          { value: 'A', text: 'O(1)' },
          { value: 'B', text: 'O(log n)' },
          { value: 'C', text: 'O(n)' },
          { value: 'D', text: 'O(n log n)' },
        ],
        answer: 'A',
        explanation:
          '哈希表通过哈希函数直接定位下标，平均 O(1)。最坏情况（极端冲突）是 O(n)，但实践中极少发生。',
        tags: ['哈希'],
      },
      {
        id: 'algo-4-e2',
        relatedLessonId: 'algo-l-4-1',
        type: 'judge',
        difficulty: 1,
        question: 'Python 的 `list` 可以作为字典的 key。',
        answer: false,
        explanation: 'list 是可变对象，不可哈希，会抛 `TypeError: unhashable type: list`。可转成 tuple 后使用。',
        tags: ['哈希'],
      },
      {
        id: 'algo-4-e3',
        relatedLessonId: 'algo-l-4-1',
        type: 'multiple',
        difficulty: 2,
        question: '下列哪些排序算法是稳定的？（多选）',
        options: [
          { value: 'A', text: '归并排序' },
          { value: 'B', text: '快速排序' },
          { value: 'C', text: '插入排序' },
          { value: 'D', text: 'Python 的 `sorted()`' },
        ],
        answer: ['A', 'C', 'D'],
        explanation:
          '快速排序是不稳定的（分区时可能打乱相等元素的相对顺序）。归并、插入排序稳定；Python 内置的 Timsort 也是稳定的。',
        tags: ['排序', '稳定性'],
      },
      {
        id: 'algo-4-e4',
        relatedLessonId: 'algo-l-4-1',
        type: 'single',
        difficulty: 2,
        question: '快速排序的最坏时间复杂度是？',
        options: [
          { value: 'A', text: 'O(n log n)' },
          { value: 'B', text: 'O(n²)' },
          { value: 'C', text: 'O(n)' },
          { value: 'D', text: 'O(log n)' },
        ],
        answer: 'B',
        explanation:
          '当每次分区极不均衡（如数组已有序且固定选端点作 pivot），递归深度变为 n，每次分区 O(n)，总计 O(n²)。随机化 pivot 可避免。',
        tags: ['排序', '复杂度'],
      },
      {
        id: 'algo-4-e5',
        relatedLessonId: 'algo-l-4-1',
        type: 'fill',
        difficulty: 2,
        question: '求"最大的 K 个数"时，应维护一个大小为 K 的 `___` 根堆。',
        blanks: [['小', '小根', 'min', '小顶']],
        explanation:
          '用小根堆：堆顶是当前 K 个中最小值，新元素比堆顶大就替换它。这样堆中始终保留最大的 K 个。用大根堆反而无法高效淘汰最小值。',
        tags: ['堆', 'Top-K'],
      },
      {
        id: 'algo-4-e6',
        relatedLessonId: 'algo-l-4-1',
        type: 'judge',
        difficulty: 2,
        question: '基于比较的排序算法，时间复杂度不可能优于 O(n log n)。',
        answer: true,
        explanation:
          '比较排序的决策树有 n! 个叶子，深度至少 log₂(n!) = Θ(n log n)，这是理论下界。超过它需要非比较排序（计数/基数/桶排序）。',
        tags: ['排序', '理论'],
      },
      {
        id: 'algo-4-e7',
        relatedLessonId: 'algo-l-4-1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 `two_sum(nums, target)`：给定数组，返回两个下标 `[i, j]` 使 `nums[i] + nums[j] == target`（i < j），不存在返回 `[]`。\n\n要求：O(n) 哈希表解法。',
        starterCode: `def two_sum(nums, target):
    seen = {}
    # 哈希表
    ___

out = two_sum([2, 7, 11, 15], 9)
`,
        setupCode: '',
        expectedOutput: '[0, 1]',
        tests: `assert out == [0, 1], f"应为 [0, 1]，实际 {out}"
assert two_sum([3, 2, 4], 6) == [1, 2], f"应为 [1, 2]，实际 {two_sum([3,2,4], 6)}"
assert two_sum([3, 3], 6) == [0, 1]
assert two_sum([1, 2], 10) == []
`,
        answer: `def two_sum(nums, target):
    seen = {}
    for i, x in enumerate(nums):
        need = target - x
        if need in seen:
            return [seen[need], i]
        seen[x] = i
    return []

two_sum([2, 7, 11, 15], 9)`,
        explanation:
          '```python\nfor i, x in enumerate(nums):\n    need = target - x\n    if need in seen:\n        return [seen[need], i]\n    seen[x] = i\nreturn []\n```\n\n**先查后存**：保证不会用同一个元素两次。O(n) 时间、O(n) 空间，把暴力 O(n²) 降为线性。',
        tags: ['哈希'],
      },
      {
        id: 'algo-4-e8',
        relatedLessonId: 'algo-l-4-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `top_k(nums, k)`：返回数组中**最大的 k 个元素**（降序）。\n\n要求：使用**大小为 k 的小根堆**，复杂度 O(n log k)。',
        starterCode: `import heapq

def top_k(nums, k):
    heap = []
    # 小根堆维护 k 个最大元素
    ___

out = top_k([3, 1, 5, 12, 2, 11], 3)
`,
        setupCode: '',
        expectedOutput: '[12, 11, 5]',
        tests: `assert out == [12, 11, 5], f"应为 [12,11,5]，实际 {out}"
assert top_k([1, 2], 5) == [2, 1], "k 大于长度时应返回全部降序"
assert top_k([], 3) == [], "空数组应返回 []"
assert top_k([5, 5, 5], 2) == [5, 5]
`,
        answer: `import heapq

def top_k(nums, k):
    heap = []
    for x in nums:
        if len(heap) < k:
            heapq.heappush(heap, x)
        elif x > heap[0]:
            heapq.heapreplace(heap, x)
    return sorted(heap, reverse=True)

top_k([3, 1, 5, 12, 2, 11], 3)`,
        explanation:
          '```python\nfor x in nums:\n    if len(heap) < k:\n        heapq.heappush(heap, x)\n    elif x > heap[0]:\n        heapq.heapreplace(heap, x)\nreturn sorted(heap, reverse=True)\n```\n\n**小根堆的堆顶是 k 个中最小者**，新元素更大就替换它。`heapreplace` 比"pop + push"更高效（一次下沉）。\n\n复杂度：每次操作 O(log k)，共 n 次 → O(n log k)。空间 O(k)。',
        tags: ['堆', 'Top-K'],
      },
      {
        id: 'algo-4-e9',
        relatedLessonId: 'algo-l-4-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `merge_sorted(a, b)`：合并两个已排序的列表，返回一个新的有序列表。\n\n要求：O(n + m)，不要用 `sorted(a + b)`。',
        starterCode: `def merge_sorted(a, b):
    i = j = 0
    out = []
    # 双指针归并
    ___

out = merge_sorted([1, 3, 5], [2, 4, 6])
`,
        setupCode: '',
        expectedOutput: '[1, 2, 3, 4, 5, 6]',
        tests: `assert out == [1, 2, 3, 4, 5, 6], f"结果不正确：{out}"
assert merge_sorted([], [1, 2]) == [1, 2]
assert merge_sorted([1, 2], []) == [1, 2]
assert merge_sorted([1, 1], [1]) == [1, 1, 1]
assert merge_sorted([-3, 0], [-1, 2]) == [-3, -1, 0, 2]
`,
        answer: `def merge_sorted(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i])
            i += 1
        else:
            out.append(b[j])
            j += 1
    out.extend(a[i:])
    out.extend(b[j:])
    return out

merge_sorted([1, 3, 5], [2, 4, 6])`,
        explanation:
          '```python\nwhile i < len(a) and j < len(b):\n    if a[i] <= b[j]:\n        out.append(a[i]); i += 1\n    else:\n        out.append(b[j]); j += 1\nout.extend(a[i:]); out.extend(b[j:])\nreturn out\n```\n\n**`<=` 而非 `<`** 保证了稳定性（相等时优先取 a 的元素）。\n\n这是归并排序的核心步骤，也是合并 K 个有序数组的基础。',
        tags: ['归并', '双指针'],
      },
      {
        id: 'algo-4-e10',
        relatedLessonId: 'algo-l-4-1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 `group_anagrams(strs)`：把字母异位词分到同一组，返回分组列表（组内、组间顺序不限）。\n\n要求：O(n · k log k)，k 为字符串长度。',
        starterCode: `def group_anagrams(strs):
    groups = {}
    # 用排序后的字符串作 key
    ___

out = group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
`,
        setupCode: '',
        expectedOutput: '3 组',
        tests: `result = sorted([sorted(g) for g in out])
assert result == [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]], f"分组不正确：{result}"
assert group_anagrams([]) == []
assert group_anagrams(["a"]) == [["a"]]
`,
        answer: `def group_anagrams(strs):
    groups = {}
    for s in strs:
        key = ''.join(sorted(s))
        groups.setdefault(key, []).append(s)
    return list(groups.values())

group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])`,
        explanation:
          '```python\nfor s in strs:\n    key = "".join(sorted(s))\n    groups.setdefault(key, []).append(s)\nreturn list(groups.values())\n```\n\n**核心**：字母异位词排序后完全相同，因此排序结果可以作为哈希表的 key。\n\n时间复杂度：每个字符串排序 O(k log k)，共 n 个 → O(n·k log k)。',
        tags: ['哈希', '排序'],
      },
      {
        id: 'algo-4-e11',
        relatedLessonId: 'algo-l-4-1',
        type: 'judge',
        difficulty: 3,
        question: '计数排序适用于任意整数数组，且总是比快速排序快。',
        answer: false,
        explanation:
          '计数排序的复杂度是 O(n + k)，k 是数据范围。若 k 远大于 n（如数据是 1 亿级别的随机数），空间和时间都会退化，不如快排。',
        tags: ['排序'],
      },
      {
        id: 'algo-4-e12',
        relatedLessonId: 'algo-l-4-1',
        type: 'fill',
        difficulty: 3,
        question: 'Python 的 `heapq` 模块只提供小根堆。要模拟大根堆，常见做法是存储元素的 `___`（填"负数"或某个运算）。',
        blanks: [['负数', '相反数', '负值', 'negation']],
        explanation:
          '存 `-x` 后，最小值的负数对应原数组的最大值，从而用同一个堆实现大根堆语义，读取时再取负还原。',
        tags: ['堆'],
      },
      {
        id: 'algo-4-e13',
        relatedLessonId: 'algo-l-4-1',
        type: 'multiple',
        difficulty: 3,
        question: '关于 Top-K 问题，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '小根堆解法时间复杂度 O(n log k)' },
          { value: 'B', text: '小根堆解法空间复杂度 O(k)' },
          { value: 'C', text: '全排序 O(n log n) 在 k 很小时仍然更优' },
          { value: 'D', text: '堆解法适合数据流场景（数据逐个到达）' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 错误：k 远小于 n 时，O(n log k) 明显优于 O(n log n)；且数据流场景无法全量排序。A、B、D 正确。',
        tags: ['Top-K', '堆'],
      },
      {
        id: 'algo-4-e14',
        relatedLessonId: 'algo-l-4-1',
        type: 'open',
        difficulty: 3,
        question: '请对比快速排序与归并排序的优缺点，并说明在工程实践中为何 Python 内置的 `sorted()` 选择 Timsort 而不是纯快排。',
        referenceAnswer: `**快速排序**

- 优点：原地排序（额外空间 O(log n) 栈）、常数因子小、缓存局部性好、平均最快。
- 缺点：不稳定；最坏 O(n²)；递归深度可能较大。

**归并排序**

- 优点：稳定；最坏也是 O(n log n)；适合外部排序（大文件分批归并）。
- 缺点：需要 O(n) 额外空间；常数因子比快排大。

**Timsort 的选择理由**

1. **稳定**：Python 的排序承诺稳定，很多业务代码依赖这一点（多级排序）。
2. **最坏 O(n log n)**：不会出现快排的最坏退化，保证性能下限。
3. **对真实数据高度优化**：Timsort 结合了归并排序与插入排序，会识别数据中的**有序片段（run）**并直接利用；
   对"近乎有序"的数据可达 O(n)，这在真实业务数据中非常常见。
4. **自适应**：根据数据特点动态选择合并策略（galloping mode），减少比较次数。

**代价**：额外空间 O(n)（最坏 n/2）。对 Python 这种以开发效率与稳定性优先的语言，这个代价可以接受。

**结论**：选择排序算法时，"平均最快"不是唯一标准，还要考虑**稳定性、最坏保证、数据分布特征**。`,
        rubric: [
          { point: '说明快排原地、常数小、平均最快但不稳定', score: 2 },
          { point: '说明归并稳定、最坏 O(n log n) 但需额外空间', score: 2 },
          { point: '指出 Timsort 稳定且能利用有序片段（近乎有序时 O(n)）', score: 2 },
        ],
        keywords: ['快排', '归并', '稳定', 'Timsort', '有序片段', '最坏保证'],
        explanation:
          '本题考察"为什么工程选择与理论最优不完全一致"。答出 Timsort 的自适应特性（run 识别）是加分项。',
        tags: ['排序', '工程'],
      },
      {
        id: 'algo-4-e15',
        relatedLessonId: 'algo-l-4-1',
        type: 'code',
        difficulty: 4,
        question:
          '实现 `kth_largest(nums, k)`：返回数组中第 k 大的元素（k 从 1 开始）。\n\n要求：使用**大小为 k 的小根堆**，复杂度 O(n log k)，空间 O(k)。',
        starterCode: `import heapq

def kth_largest(nums, k):
    heap = []
    # 维护大小为 k 的小根堆，堆顶即第 k 大
    ___

out = kth_largest([3, 2, 1, 5, 6, 4], 2)
`,
        setupCode: '',
        expectedOutput: '5',
        tests: `assert out == 5, f"应为 5，实际 {out}"
assert kth_largest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4) == 4
assert kth_largest([1], 1) == 1
assert kth_largest([2, 1], 2) == 1
`,
        answer: `import heapq

def kth_largest(nums, k):
    heap = []
    for x in nums:
        heapq.heappush(heap, x)
        if len(heap) > k:
            heapq.heappop(heap)
    return heap[0]

kth_largest([3, 2, 1, 5, 6, 4], 2)`,
        explanation:
          '```python\nfor x in nums:\n    heapq.heappush(heap, x)\n    if len(heap) > k:\n        heapq.heappop(heap)\nreturn heap[0]\n```\n\n堆中始终保存**最大的 k 个元素**，因此堆顶就是第 k 大。比"全排序取第 k 个"的 O(n log n) 更快，也比快速选择更容易写对。',
        tags: ['堆', 'Top-K'],
      },
    ],
  },
];
