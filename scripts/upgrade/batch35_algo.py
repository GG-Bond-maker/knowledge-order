# -*- coding: utf-8 -*-
"""batch35 p3：algo 剩余 11 节章主题包升级（TS 源 algo-new.ts / algo-new2.ts）。"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("algo", ["src/content/chapters/algo.ts", "src/content/chapters/algo-new.ts",
                   "src/content/chapters/algo-new2.ts"])
REF = "本课程整理（可参见《算法导论》（CLRS）相应章节与 LeetCode 对应题号官方题解）"

T = {}
T["c1"] = dict(
expected="倍率实测：O(1)=1、O(log n)=1.3、O(n)=10、O(n log n)=13.3、O(n²)=100（n:1e3→1e4），O(2ⁿ) n:20→30 倍率 1024；fib(30)=832040 暴力约 124 ms，fib_memo(300) 仅 0.3 ms；归并 n=1024 递归树总代价 10240 = n×log2(n)（10 层）；递归 fact(900) 栈深 900 → O(n) 空间。",
why=("面试官问「这个解法复杂度多少」，实际在问：数据量扩大 10 倍，你的程序慢多少倍？LeetCode 上 n≤1e5 的题"
     "用 O(n²) 必然超时——复杂度是『能不能过』的判决书，不是学术装饰。本章把大 O 的直觉、量级表、分析三法则"
     "与递归式/主定理一次讲透。"),
intuition=("大 O 是『增长斜率』而非『运行秒数』：T(n)=3n²+5n+100 里，n=1e6 时 3n² 是 3e12 而 5n 只有 5e6，"
           "低阶项和常数在数量级面前不值一提。把算法想成交通工具：O(1) 传送门、O(log n) 电梯（层数翻倍只多走一层）、"
           "O(n) 走楼梯、O(n²) 逐格爬、O(2ⁿ) 细胞分裂——n 变大时，交通工具的种类决定你到不到得了。"),
cerr=("只看最内层循环忽略外层（嵌套相乘法则）；把 O(2n) 写成 O(2n) 而不是 O(n)——大 O 不带常数；"
      "对『循环变量每次减半』的 while 循环按 O(n) 算（应为 O(log n)）。"),
miscon=("1. **『大 O 是精确运行时间』**——它只描述增长上界，常数因子与低阶项被舍弃，实际快慢要靠 benchmark；\\n"
        "2. **『O(n log n) 一定比 O(n) 慢很多』**——n=1e6 时只差约 20 倍常数级，但 O(n²) 差 1e5 倍，量级才是分水岭；\\n"
        "3. **『递归的时间复杂度就是递归次数』**——要看递归式：fib 的 T(n)=T(n-1)+T(n-2) 是 O(2ⁿ)，二分是 O(log n)，"
        "结构决定复杂度。"),
connection=("- **向前**：本章三法则是 c2 数组操作分析与 c4 排序族比较的度量衡；\n"
            "- **向后**：第 8 章动态规划把『记忆化消重复子问题』发展成方法论；\n"
            "- **平行**：python-foundations 的 for/while 基础语法是本章分析的对象。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 大 O | n→∞ 时的增长上界，忽略常数与低阶项 |\n"
         "| 量级表 | 1 < log n < n < n log n < n² < 2ⁿ < n! |\n"
         "| 三法则 | 顺序取最大、嵌套相乘、减半为 log |\n"
         "| 实战 | n≤1e5→O(n log n)；n≤20→可暴搜 |\n"
         "| 主定理 | T=aT(n/b)+f(n)，比较 f 与 n^c（c=log_b a）|"),
)
T["c2"] = dict(
expected="append 1.3 ms vs insert(0) 40 ms（慢约 30 倍）；前缀和 [0,3,4,8,9,14,23,25,31]，sum[2,5)=10；差分还原 [13,11,12,9,3,7,2,6]；和为 8 的子数组 2 个；lower_bound 指向下标 7；'abcabcbb' 无重复最长子串 3。",
why=("数组是最基础也最高频的考点结构：LeetCode 前百题里一半以上是『线性结构 + 指针』。它的 O(1) 随机访问"
     "来自连续内存的地址公式，它的 O(n) 中间插入来自元素搬移——理解内存模型，双指针、滑动窗口、前缀和、"
     "二分这些技巧就都不再是『背模板』而是『必然推论』。"),
intuition=("把数组想成一排连号的储物柜：知道柜号就能一步走到（O(1)），但往中间塞一个新柜子要把后面所有柜子"
           "平移（O(n)）。双指针是两个检修工：对撞指针从两头往中间排除不合格柜子；滑动窗口是一条可伸缩的警戒线，"
           "右端探路、左端收尾。前缀和则是先花一遍工把『1 到 i 号柜合计』抄在账本上，之后任何区间询问都只需查两次账。"),
cerr=("循环里用 list.insert(0,x) 头插构造数组（O(n²)），应该 append 后再反转；二分边界写闭区间却用 lo<hi 判断"
      "导致漏元素；滑动窗口收缩条件用 if 而不是 while，窗口内仍残留非法元素。"),
miscon=("1. **『Python list 的 append 总是 O(1)』**——容量不足时按约 1.125 倍扩容并整体拷贝，单次最坏 O(n)，"
        "但均摊 O(1)；\\n"
        "2. **『字符串可以原地改』**——Python 字符串不可变，原地修改要先转 list；循环里 += 拼接是 O(n²) 陷阱；\\n"
        "3. **『前缀和只适用于求和』**——异或、计数、差分（前缀和的逆运算）都是同一思想，区间修改 O(1) 靠差分。"),
connection=("- **向前**：本章的 O(n) 技巧直接服务 c3 链表的指针操作与 c4 哈希的『空间换时间』；\n"
            "- **向后**：第 5/6 章的排序与查找建立在数组模型上；\n"
            "- **平行**：pandas 课的向量化区间运算就是前缀和/差分思想的库化形态。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 地址公式 | addr = base + i×size → O(1) 随机访问 |\n"
         "| 代价表 | 尾插均摊 O(1)、中间插删 O(n)、查找 O(n) |\n"
         "| 双指针 | 对撞（有序排除）/ 同向滑动窗口（扩右缩左）|\n"
         "| 前缀和 | pre[r+1]-pre[l] 区间和 O(1)；逆运算差分做区间改 |\n"
         "| 二分 | 精确查找 / lower_bound / upper_bound 三形态 |"),
)
T["c3"] = dict(
expected="反转 [5,4,3,2,1]；虚拟头删除 2 → [1,3,4]；中点(1..5)=3；构造环后 has_cycle=True、无环链表 False；下一个更大 [2,1,2,4,3]→[4,2,4,-1,-1]；滑窗最大 k=3 → [3,3,5,5,6,7]。",
why=("链表把『指针操作』考到极致：虚拟头节点、快慢指针、反转三大件几乎是面试必考；栈与队列是两种访问纪律"
     "（LIFO/FIFO），单调栈/单调队列把纪律升级成『维护一个有序视图』，接雨水、滑动窗口最大值这类 Hard 题"
     "由此降到 O(n)。"),
intuition=("数组是连号储物柜，链表是寻宝游戏：每个盒子里只有下一个盒子的地址，找元素必须从头走（O(n)），"
           "但把盒子从链上摘下/插上只需改两个指针（O(1)）。栈是一摞盘子（只能拿最上面的）；队列是排队（队尾进"
           "队头出）。单调栈是『一摞从下到上越来越矮的盘子』：新盘子比栈顶高时，矮的全部被结算掉——每个盘子"
           "只进出各一次，O(n)。"),
cerr=("反转链表先改 cur.next 再存 nxt，链直接断掉（必须先保存后继）；Floyd 判圈用比较值相等而不是 is 同一节点，"
      "值重复会误判；单调栈里存值不存下标，回填结果时无法定位。"),
miscon=("1. **『链表比数组慢』**——随机访问确实 O(n) vs O(1)，但头插/头删 O(1) vs O(n)，按操作模式选结构；\\n"
        "2. **『栈就是 list』**——list 可以当栈，但当队列时 pop(0) 是 O(n)，必须用 deque；\\n"
        "3. **『单调栈只用于 Next Greater』**——柱状图最大矩形、接雨水、每日温度、去除重复字母全是同一模板的变形。"),
connection=("- **向前**：c4 哈希的链地址法桶就是链表的应用；\n"
            "- **向后**：第 5 章 BFS 用队列、DFS 用栈，结构直接决定遍历顺序；\n"
            "- **平行**：python-engineering 的 deque 双端队列是本章队列的标准工程实现。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 链表 vs 数组 | 头插 O(1)/随机访问 O(n) ↔ 数组相反 |\n"
         "| 三大件 | 虚拟头统一删头、快慢指针找中点判圈、三指针反转 |\n"
         "| 栈 | 括号匹配/表达式求值/函数调用栈 |\n"
         "| 单调栈 | 栈内单调 + 每元素进出各一次 → O(n) |\n"
         "| 单调队列 | 队头存最大值下标，滑窗最大值 O(n) |"),
)
T["c4"] = dict(
expected="dict 单次查找：n=10 万约 45 ns、n=100 万约 56 ns（几乎不随规模变化）；模 10 分桶每桶恰好 100 个 key（同桶即冲突）；异位词分组 [[eat,tea,ate],[tan,nat],[bat]]；稳定排序 [('A',90),('C',90),('B',80)]；Top5 堆 5 ms vs 全排序 32 ms 且结果一致。",
why=("哈希表是『空间换时间』的极限形态：平均 O(1) 的查找支撑了从两数之和到 LRU 的一切；排序是『先有序再做事』"
     "的基础设施，稳定性和 n log n 下界决定选型；堆则把『只要前 K 名』从 n log n 压到 n log k。"
     "本章是数组/链表之后最常用的三大件。"),
intuition=("哈希表是『按姓名直接寄存的衣帽间』：hash(key)%容量 算出柜号，平均一步到位；冲突是两人被分到同一柜，"
           "要么在柜里挂一串（链地址），要么往后找空柜（开放寻址），负载因子太高就换更大的衣帽间（扩容 rehash）。"
           "排序是让全体按序站队，稳定排序保证同分的人不互换位置。堆是一棵『父不大于子』的完全二叉树：只承诺堆顶"
           "最小，整棵树不全序——换来插入/删除 O(log n)。"),
cerr=("用 list/dict 做 dict 的 key（unhashable 直接 TypeError）；多级排序先排主条件再排次条件——顺序反了，"
      "应先排次条件再排主条件（稳定性保证后者覆盖前者）；用大根堆求 Top-K 最大值导致淘汰的恰是最大的"
      "（应该用小根堆保留最大的 k 个）。"),
miscon=("1. **『哈希表一定 O(1)』**——平均是；最坏所有 key 冲突退化为 O(n)，扩容瞬间也是 O(n)（均摊后仍 O(1)）；\\n"
        "2. **『比较排序能突破 n log n』**——决策树下界 Ω(n log n) 是数学极限，计数/基数排序靠『不用比较』绕开；\\n"
        "3. **『堆是完全排序的树』**——堆只保证堆序性质（父≥子），中序遍历不是有序输出，取第 k 大必须逐个弹出。"),
connection=("- **向前**：两数之和/前缀和计数把本章哈希用在 c2 的线性结构上；\n"
            "- **向后**：Top-K 的堆直接服务后续调度与优先队列题型；\n"
            "- **平行**：sql 课的索引（B+ 树 vs 哈希索引）是『范围查询为何不能用哈希』的数据库版。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 哈希 | hash(key)%容量 → 平均 O(1)；链地址 vs 开放寻址 |\n"
         "| 扩容 | 负载因子 2/3 触发，rehash O(n)、均摊 O(1) |\n"
         "| 可哈希 | int/str/tuple 可；list/dict/set 不可 |\n"
         "| 排序下界 | 比较排序 Ω(n log n)；Python sorted 稳定（Timsort）|\n"
         "| Top-K | 小根堆 O(n log k) / 快速选择平均 O(n) |"),
)

GOALS = {
"algo-l-1-1": ("1. 用增长上界的语言解释大 O，手推 T(n)=3n²+5n+100→O(n²)；\n"
               "2. 默写量级表与『数据规模→可接受复杂度』对照表（n≤1e5→O(n log n)）；\n"
               "3. 用三法则（顺序取最大/嵌套相乘/减半为 log）分析给定代码的复杂度。"),
"algo-l-1-2": ("1. 区分总空间与『额外空间』，判断给定函数是 O(1) 还是 O(n)；\n"
               "2. 解释递归调用的栈帧成本（fact 递归为 O(n) 空间），说明递归改迭代为何省空间；\n"
               "3. 用 two_sum 对比 O(n²)+O(1) vs O(n)+O(n) 的时空权衡，并复述『先暴力后优化』的面试策略。"),
"algo-l-1-3": ("1. 写出分治递归式 T(n)=aT(n/b)+f(n) 并对归并/二分/树遍历分别求解；\n"
               "2. 用主定理三种情况或递归树法定出复杂度（归并：每层 n × log n 层）；\n"
               "3. 解释 fib 朴素递归 O(2ⁿ) 的重复子问题根源与记忆化修复到 O(n)。"),
"algo-l-2-1": ("1. 用地址公式解释 O(1) 随机访问，列出数组各操作复杂度表；\n"
               "2. 用快慢双指针完成移除元素/移动零的原地操作（fast 扫描、slow 写入）；\n"
               "3. 说出 Python list 扩容机制与字符串不可变带来的拼接陷阱。"),
"algo-l-2-2": ("1. 写对撞指针模板并证明两数之和 II 为何是 O(n)（每次移动排除一个元素）；\n"
               "2. 说明盛水容器『移动较矮一侧』的正确性论证；\n"
               "3. 套用『扩右缩左』滑动窗口模板解无重复字符最长子串。"),
"algo-l-2-3": ("1. 构造前缀和数组并用 pre[r+1]-pre[l] 做 O(1) 区间和；\n"
               "2. 用哈希记录历史前缀和，O(n) 解『和为 k 的子数组个数』；\n"
               "3. 实现差分数组的区间加与还原，并写出二分 lower_bound。"),
"algo-l-3-1": ("1. 对比链表/数组的五维差异（访问/头插/尾插/缓存/额外空间）并按场景选型；\n"
               "2. 用虚拟头节点统一删除逻辑，手写三指针反转（先存 nxt 再改指针）；\n"
               "3. 用快慢指针实现找中点、Floyd 判圈，并复述环入口的 a+b=kL 证明直觉。"),
"algo-l-3-2": ("1. 用 list/deque 实现 LIFO 与 FIFO，并说明 list.pop(0) 的 O(n) 陷阱；\n"
               "2. 写单调栈求『下一个更大元素』并证明每元素进出各一次故 O(n)；\n"
               "3. 用单调队列（存下标、值单调递减）解滑动窗口最大值。"),
"algo-l-4-1": ("1. 画出 key→hash→桶 的映射流程，对比链地址与开放寻址两种冲突处理；\n"
               "2. 用负载因子解释扩容时机（Python dict 2/3）与均摊 O(1)；\n"
               "3. 说出可哈希约束与 __hash__/__eq__ 一致性，实现异位词分组。"),
"algo-l-4-2": ("1. 填出八大排序的平均/最坏/空间/稳定性对照表；\n"
               "2. 解释比较排序 Ω(n log n) 下界与计数/基数排序如何绕开比较；\n"
               "3. 用稳定性实现两级排序（先次后主），并手写 Lomuto 分区快排。"),
"algo-l-4-3": ("1. 用数组下标公式（2i+1/2i+2/(i-1)//2）描述堆，说明建堆是 O(n)；\n"
               "2. 解释 Top-K 为何用小根堆：淘汰当前最小、保留最大 k 个，复杂度 O(n log k)；\n"
               "3. 对比全排序/堆/快速选择三种解法的适用场景。"),
}
PREREQ = {
"algo-l-1-1": "- Python 的 for/while 基础语法；\n- 指数与对数的直观概念。",
"algo-l-1-2": "- 「时间复杂度：大 O 记号到底在说什么」（l1-1）；\n- 函数调用栈的基本概念。",
"algo-l-1-3": "- 「时间复杂度」（l1-1）的三法则；\n- 对数运算 log_b(a)。",
"algo-l-2-1": "- 第 1 章的复杂度三法则；\n- Python list 的基本操作。",
"algo-l-2-2": "- 「数组的内存模型与原地操作」（l2-1）；\n- 循环不变式的思维习惯。",
"algo-l-2-3": "- 「数组的内存模型」（l2-1）与双指针（l2-2）；\n- 哈希表 dict 的用法（详见 c4）。",
"algo-l-3-1": "- 指针/引用的概念；\n- 双指针思想（c2）。",
"algo-l-3-2": "- 栈/队列的语义（LIFO/FIFO）；\n- 数组下标操作（c2）。",
"algo-l-4-1": "- 数组下标寻址（l2-1）；\n- 「空间复杂度与原地算法」（l1-2）的空间换时间。",
"algo-l-4-2": "- 复杂度量级（c1）；\n- 分治递归式（l1-3）。",
"algo-l-4-3": "- 完全二叉树的概念；\n- 排序复杂度（l4-2）。",
}
CODES = {}
CODES["c1"] = '''import math, time
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
print("递归 fact(900) 栈深 =", depth(900), "→ O(n) 空间；迭代版 O(1)")'''
CODES["c2"] = '''import time, random
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
print("无重复最长子串('abcabcbb'):", longest_unique("abcabcbb"))'''
CODES["c3"] = '''from collections import deque

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
print("滑窗最大 k=3:", max_window([1, 3, -1, -3, 5, 3, 6, 7], 3))'''
CODES["c4"] = '''import heapq, random, time
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
print("Top5:", r1, f"| 堆 {1000*(t1-t0):.0f} ms vs 全排序 {1000*(t2-t1):.0f} ms | 结果一致: {r1 == r2}")'''

WHY = {k: T[k]["why"] for k in T}; INTU = {k: T[k]["intuition"] for k in T}
for _k in T: T[_k].setdefault("expected", "")

MD = {}
for lid, g in GOALS.items():
    cid = "c" + lid.split("-l-")[1][0]
    MD[lid] = build_md(lib.orig_content(lid), g, PREREQ[lid], WHY[cid], INTU[cid],
                       CODES[cid], T[cid]["expected"], T[cid]["cerr"], T[cid]["miscon"],
                       T[cid]["connection"], T[cid]["summary"], REF)

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    for cid in ("c1", "c2", "c3", "c4"):
        print("=" * 20, cid)
        exec(compile(CODES[cid], cid, "exec"), dict(globals()))
    print("VERIFY-ONLY")
elif not all(T[c]["expected"] for c in T):
    print("expected 未填，先 verify")
else:
    for lid in GOALS:
        lib.patch_lesson(lid, MD[lid])
    finish(lib)
