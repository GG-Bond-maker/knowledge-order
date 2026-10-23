import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 理论与复杂度
 *  26 Kolmogorov Complexity and Algorithmic Randomness
 *  27 Machine Super Intelligence
 *
 *  来源：
 *  - 论文：Li & Vitányi, "An Introduction to Kolmogorov Complexity"（教材）
 *  - 论文：Shane Legg & Marcus Hutter, "Universal Intelligence: A Definition of
 *          Machine Intelligence"（2007）arXiv:0712.3329
 *  - 参考：Ojhaharsh/30u30 第 26/27 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：纯 numpy + 标准库，走 Pyodide 浏览器内执行。
 * ============================================================ */

export const paperTheoryChapters4: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c4: 柯尔莫哥洛夫复杂度
   * ============================================================ */
  {
    id: 'paper-theory-c4',
    title: '柯尔莫哥洛夫复杂度与算法随机性',
    goal: '理解 K(x) 的定义与不可计算性，掌握用编码器（Huffman/算术编码）近似复杂度的方法，理解"随机"的严格定义。',
    lessons: [
      {
        id: 'paper-theory-c4-l1',
        title: '什么是"随机"：从编码到不可压缩',
        difficulty: 4,
        content: `
## 文献信息

| 项目 | 内容 |
| --- | --- |
| **主题** | 柯尔莫哥洛夫复杂度与算法随机性 |
| **奠基论文** | Kolmogorov (1965), Solomonoff (1964), Chaitin (1966) |
| **经典教材** | Li & Vitányi, *An Introduction to Kolmogorov Complexity and Its Applications* |
| **一句话贡献** | 用"最短程序长度"严格定义了"复杂度"与"随机"，把信息论与计算理论统一 |

## 一个根本问题：什么是"随机"

**直觉**：随机 = 没有规律。

**但怎么严格定义**？

考虑三个 20 位二进制串：

| 串 | 描述 | 是随机的吗 |
| --- | --- | --- |
| \`00000000000000000000\` | 20 个 0 | ❌ 有明显规律 |
| \`01010101010101010101\` | 交替 | ❌ 有明显规律 |
| \`11010010101100100101\` | 看不出规律 | ✅ 直觉上随机 |

**问题**：直觉不可靠。怎么用数学定义？

## 柯尔莫哥洛夫复杂度的定义

**核心定义**：

    K(x) = 能生成 x 的最短程序的长度（比特）

**例子**：

| 串 | 最短程序 | K(x) |
| --- | --- | --- |
| \`"0"*20\` | \`print("0"*20)\` | ~50 比特（程序本身长度） |
| \`"01"*10\` | \`print("01"*10)\` | ~55 比特 |
| 随机 20 位 | \`print("110100...")\` | ~20 比特 + 程序框架 |

**等等，这看起来反了**——随机串的 K 更小？

**修正**：应该看**"程序长度"而非"输出长度"**。

    随机 20 位："11010010101100100101"
    最短程序 = 直接打印这个字符串
    程序长度 ≈ 20（字符串）+ 30（print 框架）= 50 比特

    "0"*20：
    最短程序 = print("0"*20)
    程序长度 ≈ 10（"0"*20 的表示）+ 30 = 40 比特

**所以 K(随机串) > K(规律串)** ✓

**关键洞察**：**K(x) 衡量"描述 x 需要多少信息"，而非"x 有多长"。**

## 不可压缩性 = 随机性

**定义**：如果 \`K(x) ≈ |x|\`（无法压缩），则 x 是**算法随机**的。

**为什么**：

- 如果 K(x) << |x|，说明有更短的描述 → 有规律
- 如果 K(x) ≈ |x|，说明只能硬编码 → 无规律

**定理（不可压缩串的存在性）**：

    对任意长度 n，存在至少 2^n - 2^(n-1) 个串满足 K(x) > n - 1

**直觉**：大部分串是随机的（无法压缩）。

**为什么**：

    长度 < n-1 的程序总数 = 2^0 + 2^1 + ... + 2^(n-2) = 2^(n-1) - 1
    长度 n 的串总数 = 2^n
    所以至少 2^n - 2^(n-1) = 2^(n-1) 个串无法被压缩

**这是"随机是常态，规律是例外"的严格版本。**

<RandomnessDemo />

## K(x) 不可计算

**定理**：K(x) 不可计算（不存在能计算任意 x 的 K(x) 的算法）。

**证明思路**（Berry 悖论）：

假设存在程序 P 能计算 K(x)。那么构造：

    找"最短程序长度 > 1000"的最小串
    （用 P 枚举所有串，检查 K(x) > 1000）

但找到这个串后，我们用一个短程序描述了它：

    "找 K(x) > 1000 的最小串"

这个描述本身 < 1000 比特，矛盾！

**所以 K(x) 不可计算。**

**后果**：

| 问题 | 状态 |
| --- | --- |
| 判断 x 是否随机 | ❌ 不可判定 |
| 计算 K(x) 的精确值 | ❌ 不可计算 |
| 上界近似 | ✅ 可用压缩器 |

## 实用近似：编码器

**既然 K(x) 不可计算，怎么实用？**

**答案**：用**具体的编码器**给出上界。

    K(x) ≤ |encoder(x)| + O(1)

**三种编码器**：

<EncoderCompareDemo />

### ① Huffman 编码

**原理**：高频符号用短码，低频用长码。

**构建**：贪心合并两个最低频节点。

**性质**：

| 性质 | 说明 |
| --- | --- |
| **最优性** | 对给定符号频率，Huffman 是最优的前缀码 |
| **局限** | 只能达到整数比特/符号 |
| **复杂度** | O(n log n) |

**例**：

    符号频率: a:0.5, b:0.25, c:0.15, d:0.10
    熵 H = 1.85 比特/符号
    Huffman 平均码长 = 0.5×1 + 0.25×2 + 0.15×3 + 0.10×3 = 1.95 比特/符号

**差 0.1 比特**——因为 Huffman 只能用整数长度。

### ② 算术编码

**原理**：把整个序列映射到 [0,1) 的一个小区间。

**优势**：

| 编码器 | 平均码长 | 与熵的差距 |
| --- | --- | --- |
| Huffman | 1.95 | +0.10 |
| **算术编码** | **1.85** | **≈0** |

**为什么更好**：可以编码"分数比特"。

**代价**：实现复杂，计算量大。

### ③ LZ 系列（gzip）

**原理**：找重复子串，用引用替代。

**优势**：
- 适合长文本
- 实现简单
- 对结构敏感

**这就是上一节用来测复杂度的方法**。

## 算法随机性的三个等价定义

**Martin-Löf 随机**（1966）：

> x 是随机的，当且仅当它通不过所有"有效"的统计检验。

**等价形式**：

| 定义 | 表述 |
| --- | --- |
| **不可压缩** | K(x) ≥ \|x\| - c（几乎不可压缩） |
| **通不过检验** | 不存在能预测 x 的有效算法 |
| **Martin-Löf** | 不在任何可构造的零测集里 |

**这三个定义是等价的**——这是算法信息论的核心定理。

## 对 AI 的启示

**① "压缩即智能"的理论基础**

上一节讲了经验观察（语言模型压缩率），这里给出理论：

    智能 = 找规律的能力
    找规律 = 压缩数据的能力
    压缩能力 = K(x) 的近似能力

**② 归纳推理 = 找最短程序**

**Solomonoff 归纳**：

    给定数据 D，预测下一个 x 的最优方式是：
    对所有能生成 D 的程序加权（短的权重大）

    这就是"奥卡姆剃刀的贝叶斯版本"

**③ 大模型的"压缩"本质**

    语言模型损失 = 交叉熵
                  = 平均编码长度
                  = 压缩率的倒数

**训练语言模型 = 学习更好的压缩器。**

**④ 为什么"预测下一个 token"有效**

如果模型能完美预测下一个 token，它就在做无损压缩。
而好的压缩器必须理解数据生成机制——
**所以预测能力 = 理解能力**。

## 本节来源

> **来源类型：学术来源**
> - Kolmogorov, A. N. *Three approaches to the quantitative definition of information*（1965）
> - Solomonoff, R. J. *A Formal Theory of Inductive Inference*（1964）
> - Li, M. & Vitányi, P. *An Introduction to Kolmogorov Complexity and Its Applications*
>   （第 3 版，Springer 2008）
> - Martin-Löf, P. *The definition of random sequences*（1966）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 26 篇（215 行，含 HuffmanCoder / ArithmeticCoder / ComplexityMetrics）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「K(x) 的定义与直觉」：能生成 x 的最短程序长度。规律串的 K 小（有短程序），随机串的 K ≈ |x|（只能硬编码）。所以"不可压缩 = 随机"。',
          },
          {
            kind: 'leak',
            text: '「K(x) 不可计算」：用 Berry 悖论证明——"找 K(x)>1000 的最小串"这个描述本身 <1000 比特，矛盾。所以只能用压缩器近似上界。',
          },
          {
            kind: 'pitfall',
            text: 'Huffman 编码只能达到整数比特/符号，与熵有最多 1 比特的差距。算术编码能达到分数比特，接近熵。',
          },
        ],
        demos: [
          {
            title: 'Huffman 编码实现与复杂度',
            lang: 'python',
            code: `import numpy as np
from collections import Counter
import heapq

class HuffmanNode:
    def __init__(self, char=None, freq=0, left=None, right=None):
        self.char = char
        self.freq = freq
        self.left = left
        self.right = right

    def __lt__(self, other):
        return self.freq < other.freq


def build_huffman_tree(text):
    """构建 Huffman 树。"""
    freq = Counter(text)
    heap = [HuffmanNode(ch, f) for ch, f in freq.items()]
    heapq.heapify(heap)

    while len(heap) > 1:
        left = heapq.heappop(heap)
        right = heapq.heappop(heap)
        merged = HuffmanNode(freq=left.freq + right.freq, left=left, right=right)
        heapq.heappush(heap, merged)

    return heap[0] if heap else None


def build_codes(node, prefix='', codes=None):
    """生成编码表。"""
    if codes is None:
        codes = {}
    if node is None:
        return codes
    if node.char is not None:
        codes[node.char] = prefix or '0'
    else:
        build_codes(node.left, prefix + '0', codes)
        build_codes(node.right, prefix + '1', codes)
    return codes


def huffman_compress(text):
    """返回 (压缩后比特数, 编码表, 熵)。"""
    if not text:
        return 0, {}, 0

    tree = build_huffman_tree(text)
    codes = build_codes(tree)

    # 压缩后长度
    compressed_bits = sum(len(codes[ch]) for ch in text)

    # 理论熵
    freq = Counter(text)
    total = len(text)
    entropy = -sum((f/total) * np.log2(f/total) for f in freq.values())

    return compressed_bits, codes, entropy


print("=== Huffman 编码示例 ===")
texts = [
    ("均匀分布", "abcd" * 50),
    ("偏斜分布", "a" * 200 + "b" * 50 + "c" * 30 + "d" * 20),
    ("高度偏斜", "a" * 290 + "b" * 10),
]

for name, text in texts:
    bits, codes, entropy = huffman_compress(text)
    n = len(text)
    print(f"\\n{name} (n={n})")
    print(f"  编码表: {codes}")
    print(f"  理论熵: {entropy:.3f} 比特/符号")
    print(f"  Huffman: {bits/n:.3f} 比特/符号")
    print(f"  总比特: {bits}")
    print(f"  差距: {bits/n - entropy:.3f} 比特/符号")

print()
print("=== 关键观察 ===")
print()
print("Huffman 只能产生整数长度的码字：")
print("  · 均匀分布（4 符号）：每个 2 比特，正好 = 熵 2.0")
print("  · 偏斜分布：平均码长 > 熵（差 0~1 比特）")
print()
print("这就是 Huffman 的局限：无法达到分数比特。")
print("算术编码可以，但实现更复杂。")`,
          },
          {
            title: '算术编码：接近理论极限',
            lang: 'python',
            code: `import numpy as np
from collections import Counter
from fractions import Fraction

def arithmetic_encode(text):
    """
    算术编码（简化版，用分数精确计算）。

    把整个序列映射到 [0,1) 的一个区间。
    """
    if not text:
        return Fraction(0), Fraction(1)

    freq = Counter(text)
    total = len(text)

    # 计算每个符号的累积区间
    symbols = sorted(freq.keys())
    cum = {}
    acc = Fraction(0)
    for s in symbols:
        p = Fraction(freq[s], total)
        cum[s] = (acc, acc + p)
        acc += p

    # 编码：逐步缩小区间
    low, high = Fraction(0), Fraction(1)
    for ch in text:
        range_size = high - low
        lo_p, hi_p = cum[ch]
        high = low + range_size * hi_p
        low = low + range_size * lo_p

    return low, high


def arithmetic_code_length(low, high):
    """计算编码所需比特数 = -log2(区间长度)。"""
    length = high - low
    if length <= 0:
        return float('inf')
    return -np.log2(float(length))


def theoretical_entropy(text):
    freq = Counter(text)
    total = len(text)
    return -sum((f/total) * np.log2(f/total) for f in freq.values())


print("=== 算术编码 vs 理论熵 ===")
print()
print(f"{'文本':>20} | {'n':>5} | {'熵':>8} | {'算术编码':>10} | {'差距':>8}")
print("-" * 62)

texts = [
    ("均匀 4 符号", "abcd" * 25),
    ("偏斜", "a"*200 + "b"*50 + "c"*30 + "d"*20),
    ("高度偏斜", "a"*290 + "b"*10),
    ("两个符号", "ab" * 100),
]

for name, text in texts:
    low, high = arithmetic_encode(text)
    bits = arithmetic_code_length(low, high)
    entropy = theoretical_entropy(text)
    per_symbol = bits / len(text)
    print(f"{name:>20} | {len(text):>5} | {entropy:>8.4f} | {per_symbol:>10.4f} | {per_symbol - entropy:>8.4f}")

print()
print("=== 关键观察 ===")
print()
print("算术编码的每符号比特数 ≈ 理论熵（差距 < 0.01）")
print()
print("为什么算术编码更优：")
print("  · 它把整个序列编码成一个数，而非逐符号编码")
print("  · 可以表达'分数比特'（如 1.85 比特/符号）")
print()
print("这给出 K(x) 的一个更好的上界：")
print("  K(x) <= 算术编码长度 + O(1)")
print("  ≈ n * H(x) + O(1)")
print()
print("所以：随机性 ≈ 不可压缩性 ≈ 熵")`,
          },
          {
            title: '随机性的不可压缩性演示',
            lang: 'python',
            code: `import numpy as np
import gzip

def kolmogorov_approx(s):
    """用 gzip 近似 K(x)。"""
    return len(gzip.compress(s.encode() if isinstance(s, str) else s, compresslevel=9))

print("=== 不同字符串的 K(x) 近似 ===")
print()
print(f"{'字符串类型':>16} | {'长度':>6} | {'gzip':>6} | {'比值':>7} | {'随机?':>6}")
print("-" * 56)

rng = np.random.default_rng(42)

cases = [
    ("全 0", "0" * 1000),
    ("交替 01", "01" * 500),
    ("递增数字", "".join(str(i % 10) for i in range(1000))),
    ("随机二进制", "".join(str(x) for x in rng.integers(0, 2, 1000))),
    ("随机字母", "".join(chr(97 + x) for x in rng.integers(0, 26, 1000))),
]

for name, s in cases:
    k = kolmogorov_approx(s)
    ratio = k / len(s)
    is_random = "是" if ratio > 0.6 else "否"
    print(f"{name:>16} | {len(s):>6} | {k:>6} | {ratio:>7.3f} | {is_random:>6}")

print()
print("=== 关键洞察 ===")
print()
print("压缩比（gzip长度 / 原长度）：")
print("  · 全 0 / 交替：极小（高度可压缩）")
print("  · 随机：接近 1（几乎不可压缩）")
print()
print("所以：")
print("  K(x) ≈ |x|  ->  随机")
print("  K(x) << |x| ->  有规律")
print()
print("=== 不可压缩串占多数（理论证明）===")
print()
print("长度为 n 的串总数: 2^n")
print("长度 < n-1 的程序数: 2^(n-1) - 1")
print()
for n in [10, 20, 30]:
    total = 2 ** n
    compressible = 2 ** (n - 1)
    ratio = compressible / total
    print(f"n={n}: 最多 {ratio:.1%} 的串可以被压缩到 < n-1 比特")
print()
print("所以至少 50% 的串是不可压缩的（随机的）。")
print("'随机是常态，规律是例外' —— 这是算法信息论的核心结论。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-theory-c4-e1',
        type: 'single',
        difficulty: 2,
        question: '柯尔莫哥洛夫复杂度 K(x) 的定义是？',
        options: [
          { value: 'A', text: 'x 的字节数' },
          { value: 'B', text: '能生成 x 的最短程序的长度' },
          { value: 'C', text: 'x 的熵' },
          { value: 'D', text: 'x 中不同字符的个数' },
        ],
        answer: 'B',
        explanation:
          'K(x) = min{|p| : U(p) = x}。规律串有短程序（K 小），随机串只能硬编码（K ≈ |x|）。所以"不可压缩 = 随机"。',
        tags: ['K(x) 定义'],
      },
      {
        id: 'paper-theory-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: '柯尔莫哥洛夫复杂度 K(x) 可以用计算机精确计算出来。',
        answer: false,
        explanation:
          'K(x) 不可计算（Berry 悖论证明）。只能用压缩器（gzip/Huffman/算术编码）给出上界近似。这也是为什么实际中都用压缩率作为代理指标。',
        tags: ['不可计算'],
      },
      {
        id: 'paper-theory-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: '算法随机性的等价定义包括？（多选）',
        options: [
          { value: 'A', text: '不可压缩：K(x) ≥ |x| - c' },
          { value: 'B', text: '通不过任何有效的统计检验（Martin-Löf）' },
          { value: 'C', text: '不存在能预测它的有效算法' },
          { value: 'D', text: '看起来没有规律' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是直觉，不是严格定义。A/B/C 是三个严格等价的数学定义（不可压缩性、Martin-Löf 随机性、不可预测性）。',
        tags: ['随机性定义'],
      },
      {
        id: 'paper-theory-c4-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'Huffman 编码的平均码长与熵的差距最多为 ___ 比特/符号，因为它只能产生整数长度的码字。',
        blanks: [['1', '一', '1.0']],
        explanation:
          'Huffman 是整数比特编码，所以每个符号最多浪费 1 比特。算术编码可以编码分数比特，差距接近 0。',
        tags: ['Huffman 局限'],
      },
      {
        id: 'paper-theory-c4-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算字符串的香农熵：string_entropy(s)。\n\n返回 -Σ p·log₂(p)，单位比特/符号。',
        starterCode: `import numpy as np
from collections import Counter

def string_entropy(s):
    if not s:
        return 0.0
    freq = Counter(s)
    total = len(s)
    probs = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '字符串熵',
        tests: `from collections import Counter
# 单字符：熵 0
assert abs(string_entropy("aaaa")) < 1e-9
# 两字符等概率：熵 1
assert abs(string_entropy("abab") - 1.0) < 1e-9
# 四字符等概率：熵 2
assert abs(string_entropy("abcd") - 2.0) < 1e-9
# 偏斜：熵介于 0 和 1
e = string_entropy("aaaaab")
assert 0 < e < 1
# 空串
assert string_entropy("") == 0.0
`,
        answer: `import numpy as np
from collections import Counter

def string_entropy(s):
    if not s:
        return 0.0
    freq = Counter(s)
    total = len(s)
    probs = np.array([c / total for c in freq.values()])
    return float(-np.sum(probs * np.log2(probs + 1e-10)))
`,
        explanation:
          '**`Counter` 统计频次**，除以总数得概率。\n\n**`+1e-10` 防 log(0)**。\n\n**这是 K(x) 的下界**：\n\n    K(x) ≥ n·H(x) - O(log n)\n\n因为任何编码器的平均长度不可能低于熵（香农信源编码定理）。\n\n**所以熵给出压缩的理论极限**——这也是为什么 Hinton 用 log(σ) 做 MDL 惩罚（第 2 篇）。',
        tags: ['编程', '字符串熵'],
      },
      {
        id: 'paper-theory-c4-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 Huffman 编码：huffman_codes(text)。\n\n返回 dict：字符 → 二进制码字符串。\n\n用 heapq 合并最低频的两个节点。',
        starterCode: `import heapq
from collections import Counter

def huffman_codes(text):
    if not text:
        return {}
    freq = Counter(text)
    if len(freq) == 1:
        return {list(freq)[0]: '0'}

    heap = [(f, i, ch) for i, (ch, f) in enumerate(freq.items())]
    heapq.heapify(heap)
    # 树结构：用 dict 表示 {node_id: (left_id, right_id)}
    nodes = {}
    counter = len(heap)

    while len(heap) > 1:
        f1, _, n1 = heapq.heappop(heap)
        f2, _, n2 = heapq.heappop(heap)
        nodes[counter] = (n1, n2)
        heapq.heappush(heap, (f1 + f2, counter, counter))
        counter += 1

    root = heap[0][2]
    codes = {}

    def traverse(node, prefix):
        if node not in nodes:
            # 叶子
            for ch in freq:
                pass
        # 实现见答案
        pass

    # 简化：直接构建
    def build(node, prefix, out):
        if node not in nodes:
            # 叶子，找对应字符
            return
        left, right = nodes[node]
        for child, bit in [(left, '0'), (right, '1')]:
            if child in nodes:
                build(child, prefix + bit, out)
            else:
                out[child] = prefix + bit
    build(root, '', codes)
    # 映射回字符
    result = {}
    leaf_chars = list(freq.keys())
    for node_id, code in codes.items():
        if node_id < len(leaf_chars):
            result[leaf_chars[node_id]] = code
    return result
`,
        setupCode: '',
        expectedOutput: 'Huffman 编码表',
        tests: `# 三符号：高频符号码更短（两符号时长度必然都是1，无法比较）
codes = huffman_codes("aaaaaaaaabbbcd")
assert set(codes.keys()) == {'a', 'b', 'c', 'd'}
assert len(codes['a']) <= len(codes['c']), f"高频符号码应更短或等长: {codes}"
assert len(codes['a']) == 1, f"最高频符号应为1比特: {codes}"

# 四符号等频：所有码长相同
codes2 = huffman_codes("abcd")
assert len(set(len(c) for c in codes2.values())) == 1, f"等频应等长: {codes2}"

# 前缀性质：没有码是另一个的前缀
codes3 = huffman_codes("aaaaabbbccd")
all_codes = list(codes3.values())
for c1 in all_codes:
    for c2 in all_codes:
        if c1 != c2:
            assert not c2.startswith(c1), f"{c1} 是 {c2} 的前缀"
`,
        answer: `import heapq
from collections import Counter

def huffman_codes(text):
    if not text:
        return {}
    freq = Counter(text)
    if len(freq) == 1:
        return {list(freq)[0]: '0'}

    # 节点用 (id, char) 表示，char=None 表示内部节点
    heap = []
    for i, (ch, f) in enumerate(freq.items()):
        heap.append((f, i, i, ch))
    heapq.heapify(heap)

    nodes = {}   # node_id -> (left_id, right_id)
    counter = len(heap)
    char_of = {i: ch for i, (ch, f) in enumerate(freq.items())}

    while len(heap) > 1:
        f1, _, n1, _ = heapq.heappop(heap)
        f2, _, n2, _ = heapq.heappop(heap)
        nodes[counter] = (n1, n2)
        heapq.heappush(heap, (f1 + f2, counter, counter, None))
        counter += 1

    root = heap[0][2]
    codes = {}

    def build(node, prefix):
        if node not in nodes:
            codes[char_of[node]] = prefix
            return
        left, right = nodes[node]
        build(left, prefix + '0')
        build(right, prefix + '1')

    build(root, '')
    return codes
`,
        explanation:
          '**Huffman 的核心**：每次合并两个最低频节点，直到只剩一个根。\n\n**关键性质**：\n1. **前缀码**：没有任何码是另一个的前缀（保证可解码）\n2. **最优性**：对给定频率分布，Huffman 是最优的前缀码\n3. **整数比特**：每个码字长度是整数\n\n**`char_of` 映射**：叶子节点 ID 对应字符。\n\n**为什么高频符号码更短**：它在树中更深？不，是更**浅**——合并得晚，离根近。',
        tags: ['编程', 'Huffman'],
      },
      {
        id: 'paper-theory-c4-e7',
        type: 'code',
        difficulty: 3,
        question:
          '用 gzip 近似 K(x)：kolmogorov_approx(data)。\n\n- data 可以是 str 或 bytes\n- 返回 gzip 压缩后的字节数',
        starterCode: `import gzip

def kolmogorov_approx(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    return ___
`,
        setupCode: '',
        expectedOutput: 'K(x) 近似',
        tests: `# 高度规律：压缩后很小
k1 = kolmogorov_approx("0" * 10000)
assert k1 < 200, f"全0应高度可压缩，实际 {k1}"

# 随机：压缩后接近原长度
import numpy as np
rng = np.random.default_rng(0)
random_bytes = bytes(rng.integers(0, 256, 10000, dtype=np.uint8))
k2 = kolmogorov_approx(random_bytes)
assert k2 > 9000, f"随机数据应几乎不可压缩，实际 {k2}"

# 规律数据比随机数据压缩得好
assert k1 < k2 / 10

# bytes 输入
k3 = kolmogorov_approx(b"abcabc" * 100)
assert k3 < 100
`,
        answer: `import gzip

def kolmogorov_approx(data):
    if isinstance(data, str):
        data = data.encode('utf-8')
    return len(gzip.compress(data, compresslevel=9))
`,
        explanation:
          '**gzip 给出 K(x) 的上界**：\n\n    K(x) ≤ |gzip(x)| + O(1)\n\n**三种数据的对比**：\n\n| 数据 | 原长度 | gzip | 比值 |\n| --- | --- | --- | --- |\n| 全 0 | 10000 | ~50 | 0.005 |\n| 随机 | 10000 | ~10050 | 1.005 |\n| 重复 abc | 600 | ~50 | 0.08 |\n\n**注意**：gzip 对随机数据可能**膨胀**（比值 > 1），因为要加压缩头。\n\n**这是"随机性 = 不可压缩性"的实用检验。**',
        tags: ['编程', 'K(x) 近似'],
      },
      {
        id: 'paper-theory-c4-e8',
        type: 'code',
        difficulty: 4,
        question:
          '判断字符串是否"算法随机"：is_algorithmically_random(s, threshold=0.8)。\n\n用 gzip 压缩率判断：若 gzip长度/原长度 > threshold，认为是随机。\n\n返回 bool。',
        starterCode: `import gzip

def is_algorithmically_random(s, threshold=0.5):
    if not s or len(s) < 10:
        return False
    data = s.encode('utf-8') if isinstance(s, str) else s
    compressed = ___
    ratio = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '随机性判断',
        tests: `import numpy as np
# 高度规律：不随机
assert is_algorithmically_random("0" * 1000) == False
assert is_algorithmically_random("abc" * 500) == False
assert is_algorithmically_random("01" * 500) == False

# 随机：是随机的（26 字母随机串 gzip 比值约 0.63，超过阈值 0.5）
rng = np.random.default_rng(0)
random_str = "".join(chr(97 + x) for x in rng.integers(0, 26, 2000))
assert is_algorithmically_random(random_str) == True, f"随机字符串应判为随机"

# 太短的不判断
assert is_algorithmically_random("ab") == False
assert is_algorithmically_random("") == False
`,
        answer: `import gzip

def is_algorithmically_random(s, threshold=0.5):
    if not s or len(s) < 10:
        return False
    data = s.encode('utf-8') if isinstance(s, str) else s
    compressed = len(gzip.compress(data, compresslevel=9))
    ratio = compressed / len(data)
    return ratio > threshold
`,
        explanation:
          '**这是"不可压缩性 = 随机性"的实用实现**。\n\n**阈值 0.5 的选择**：\n- gzip 对字节随机数据比值约 1.0\n- 对 26 字母随机串约 0.63（字符集小，理论上限 log2(26)/8 = 0.59）\n- 对自然语言文本约 0.3~0.4\n- 对重复数据 < 0.1\n\n所以 0.5 能区分"随机"和"有规律"。\n\n**局限**：\n- 依赖压缩算法（LZMA 会更严格）\n- 短字符串不可靠（压缩头开销占比大）\n- 只适用于"可压缩性"这一维度\n\n**理论保证**：如果 K(x) ≥ |x| - c，则任何压缩器都无法显著压缩它。',
        tags: ['编程', '随机性判断'],
      },
      {
        id: 'paper-theory-c4-e9',
        type: 'judge',
        difficulty: 4,
        question: '大部分二进制串是可压缩的（有规律），随机串是少数。',
        answer: false,
        explanation:
          '恰恰相反。长度为 n 的串有 2^n 个，但长度 < n-1 的程序只有 2^(n-1) - 1 个。所以至少 50% 的串不可压缩。"随机是常态，规律是例外"——这是算法信息论的核心结论。',
        tags: ['随机是常态'],
      },
      {
        id: 'paper-theory-c4-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① K(x) 的定义与"不可压缩 = 随机"；② 为什么 K(x) 不可计算；③ Huffman 与算术编码的区别；④ 算法信息论对 AI 的启示（压缩即智能）。',
        referenceAnswer: `**① K(x) 的定义与"不可压缩 = 随机"**

**定义**：

    K(x) = 能生成 x 的最短程序的长度

**关键对比**：

| 串 | 最短程序 | K(x) | 压缩率 |
| --- | --- | --- | --- |
| \`"0"*1000\` | \`print("0"*1000)\` | 极小 | 高 |
| \`"01"*500\` | \`print("01"*500)\` | 极小 | 高 |
| 随机 1000 位 | 硬编码 | ≈1000 | ≈1 |

**"不可压缩 = 随机"**：

    K(x) ≈ |x|  ->  没有规律 -> 随机
    K(x) << |x| ->  有规律   -> 可压缩

**严格定义（算法随机）**：

    x 是随机的  ⟺  K(x) ≥ |x| - c（c 是常数）

**为什么这个定义合理**：

如果 x 有规律，就能用短程序生成它（K 小）。
如果没有规律，只能硬编码（K ≈ |x|）。

---

**② 为什么 K(x) 不可计算**

**Berry 悖论式证明**：

假设存在程序 P 能计算 K(x)。

构造程序 Q：

    用 P 枚举所有字符串
    找到第一个满足 K(x) > 1000 的串
    输出它

**矛盾**：

Q 的描述是"找 K(x)>1000 的最小串"——
这个描述本身远小于 1000 比特。

但 Q 输出的串 x 满足 K(x) > 1000，而 Q 是生成 x 的程序，
所以 K(x) ≤ |Q| < 1000。**矛盾！**

**结论**：不存在能计算 K(x) 的程序。

**实际影响**：

| 问题 | 状态 |
| --- | --- |
| 精确计算 K(x) | ❌ |
| 判断是否随机 | ❌ |
| 上界近似（压缩） | ✅ |

**所以我们用压缩器给出上界**：

    K(x) ≤ |gzip(x)| + O(1)

---

**③ Huffman vs 算术编码**

| 维度 | Huffman | 算术编码 |
| --- | --- | --- |
| **原理** | 变长前缀码 | 映射到 [0,1) 区间 |
| **码字长度** | 整数比特 | **分数比特** |
| **与熵的差距** | 最多 1 比特/符号 | **≈0** |
| **实现复杂度** | 简单（贪心） | 复杂（高精度小数） |
| **解码** | 逐符号 | 需要知道整个区间 |

**具体例子**（频率 a:0.5, b:0.25, c:0.15, d:0.10）：

    熵 H = 1.85 比特/符号

    Huffman: a=1, b=2, c=3, d=3
    平均码长 = 0.5×1 + 0.25×2 + 0.15×3 + 0.10×3 = 1.95 比特
    差距 = +0.10

    算术编码：把整个序列编码成一个区间
    每符号 ≈ 1.85 比特
    差距 ≈ 0

**为什么 Huffman 有差距**：它只能分配整数长度的码字，
而最优编码需要分数长度（如 1.85 比特）。

**算术编码如何做到**：整个序列对应一个区间 [low, high)，
区间长度的负对数就是所需比特数。这个长度可以是任意实数。

---

**④ 算法信息论对 AI 的启示**

**a) "压缩即智能"的理论基础**

**逻辑链条**：

    智能 = 找规律的能力
    找规律 = 压缩数据的能力
    压缩能力 = 逼近 K(x) 的能力

**所以**：**更好的压缩器 = 更智能的系统**。

**b) 语言模型就是压缩器**

**交叉熵损失 = 平均编码长度**：

    L = -Σ log₂ P(token | context) / n
      = 每 token 的平均比特数
      = 压缩率

**训练语言模型 = 学习更好的压缩器。**

**实测数据**：

| 系统 | 压缩率（bits/char） |
| --- | --- |
| gzip | 2.9 |
| 早期 LM | 1.5 |
| GPT-4 级 | 0.6~0.8 |
| 人类估计 | 0.5~1.0 |

**c) Solomonoff 归纳：奥卡姆剃刀的贝叶斯版**

**问题**：给定数据 D，如何预测下一个观测？

**Solomonoff 的答案**：

    对所有能生成 D 的程序 p，按 2^(-|p|) 加权
    预测 = Σ_p P(x|p) · 2^(-|p|)

**直觉**：短的（简单的）程序权重大 → 奥卡姆剃刀。

**这是理论最优的归纳推理**，但不可计算（需要枚举所有程序）。

**d) 为什么"预测下一个 token"有效**

**关键洞察**：

    能完美预测 = 能完美压缩
    能完美压缩 = 理解了生成机制

**所以**：**预测能力 = 理解能力**。

**这解释了**：
- 为什么 LLM 通过"预测下一个词"能学到语法、事实、推理
- 为什么 Scaling Laws 有效（更大的模型 = 更好的压缩器）
- 为什么"涌现能力"可能对应压缩率的相变

**e) 一个诚实的边界**

**"压缩即智能"不是全部**：

| 压缩能解释 | 压缩难解释 |
| --- | --- |
| 知识（事实、规律） | 意图（想做什么） |
| 推理（逻辑链条） | 意识（主观体验） |
| 泛化（举一反三） | 价值（什么重要） |

**所以**：压缩是智能的**必要条件**，可能不是充分条件。

---

**⑤ 一个统一视角**

**信息论（香农）** → 通信的极限
**算法信息论（柯尔莫哥洛夫）** → 描述的极限
**MDL（Rissanen）** → 学习的极限
**Solomonoff 归纳** → 推理的极限

**这四个理论从不同角度回答同一个问题**：

> **"信息是什么？如何最优地处理信息？"**

**对 AI 的意义**：

> 大模型不是"魔法"，而是**逼近这些理论极限的工程实现**。
> 理解理论，才能理解模型为什么有效、极限在哪里。`,
        rubric: [
          { point: 'K(x) 定义 + 不可压缩=随机 + Berry 悖论证明', score: 3 },
          { point: 'Huffman（整数比特，差≤1）vs 算术编码（分数比特，≈0）', score: 2 },
          { point: '压缩即智能：交叉熵=编码长度，Solomonoff 归纳', score: 2 },
          { point: '预测能力=理解能力，Scaling Laws 对应压缩率', score: 2 },
          { point: '诚实边界：压缩能解释知识/推理，难解释意图/意识', score: 1 },
        ],
        keywords: ['最短程序', 'Berry 悖论', '整数 vs 分数比特', '交叉熵=编码长度', '压缩的必要非充分'],
        explanation:
          '能说清「压缩是智能的必要非充分条件」以及「交叉熵就是编码长度」，就是理解了算法信息论与深度学习的深层联系。',
        tags: ['综合分析'],
      },
    ],
  },
];
