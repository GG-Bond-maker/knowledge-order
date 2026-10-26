# -*- coding: utf-8 -*-
"""
Chapter 1: NumPy 核心机制与高性能向量化计算 (NumPy Core & High-Performance Vectorization)
Course: ml-python-data
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_1():
    # ── Lesson 1.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握 NumPy 多维数组 `ndarray` 在连续内存中的底层组织架构（数据缓冲区 Buffer、数据类型 dtype、形状 shape 与内存步长 strides）；
2. 深刻辨析 C 连续（C-contiguous，行优先）与 Fortran 连续（F-contiguous，列优先）在 CPU 缓存局部性（Cache Locality）上的性能差异；
3. 掌握内存视图（View）与内存副本（Copy）的根本区别，通过 `.base` 属性准确判断内存所有权；
4. 理解切片操作（Slicing）如何实现零内存复制（Zero-Copy），以及何时会意外触发昂贵的内存深拷贝；
5. 编写代码检查数组的内存步长与底层连续性，实测行优先与列优先遍历在处理大规模特征时的速度差距。

### 前置知识
- Python 基础列表与循环；
- 计算机内存连续地址与字节概念。

### 问题背景与 ML 用途
在 Python 原生环境中，标准列表 `list` 实际上是一个“指针数组”，每个元素存储的是指向堆内存中独立 Python 对象的引用。
当我们需要对一个包含 1000 万个样本、每个样本 100 维特征的数据集进行归一化时：
- 原生 Python 列表会在内存中分散产生 10 亿个孤立对象，内存开销膨胀 4 到 8 倍；
- CPU 无法利用 L1/L2 缓存进行快速预取（Cache Prefetching），导致严重的缓存未命中（Cache Miss）；
- Python 的动态类型检查使得每次取值都要进行类型拆箱（Unboxing），执行速度比 C 语言慢两个数量级。
**NumPy 的 `ndarray` 是现代数据科学与机器学习的技术地基**。它在连续内存块中直接按字节紧密存放同质数据，使得数据能够以接近硬件极限的速度被 CPU SIMD 矢量指令集消费，为后续的 Pandas、Scikit-learn、PyTorch 提供了统一的高性能内存交换格式。

### 直觉理解
- **杂货铺散装箱 vs 集装箱冷链货柜**：Python 原生列表就像杂货铺的抽屉，每个抽屉里放着一张纸条，纸条上写着商品在仓库角落的存放地址（指针引用），找一件商品就要在仓库里跑一次；而 NumPy 数组就像标准集装箱货柜，所有砖块（数字）按照固定规格、同种质地、严丝合缝地紧挨着码放在一排排货架上。计算机指令只需要知道“货柜起点在哪里”以及“每跨一行要在货架上向前走多少步（步长 Strides）”，就能以流水线速度瞬间抓取一整排数据。

### 核心概念与符号对照表
| 核心概念 | 符号 / 属性 | 数学与底层定义 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **数据缓冲区** | `arr.data` | 指向连续物理内存块首地址的指针 | 原始数据存储与跨进程/跨语言零拷贝传输 |
| **形状与维度** | `arr.shape, arr.ndim` | 各个轴（Axis）上的元素长度元组 | 确定张量几何结构（如批次大小、特征数） |
| **内存步长** | `arr.strides` | 沿着各个轴每移动一个元素需要在内存中跳过的**字节数** | 零拷贝重塑（Reshape）、转置（Transpose）与滑动窗口 |
| **视图 (View)** | `b.base is arr` | 共享相同数据缓冲区、仅拥有独立元数据的数组 | 极速切片、无额外内存开销的特征提取 |
| **副本 (Copy)** | `b.base is None` | 在堆内存中开辟全新连续缓冲区并拷贝数据 | 数据防篡改隔离、持久化保存 |

### 数学原理与逐步推导
#### 1. 步长（Strides）寻址公式
对于一个 $d$ 维数组，其形状为 $(N_0, N_1, \\dots, N_{d-1})$，数据类型所占字节数为 $S_{\\text{item}}$（例如 `float64` 为 8 字节）。
若数组在内存中是 C-连续（行优先）存储的，其步长元组 $(s_0, s_1, \\dots, s_{d-1})$ 由倒序累乘公式决定：
$$s_{d-1} = S_{\\text{item}}$$
$$s_k = s_{k+1} \\times N_{k+1}, \\quad k = d-2, d-3, \\dots, 0$$
对于任意索引多元组 $(i_0, i_1, \\dots, i_{d-1})$，该元素在连续内存缓冲区中相对于起始地址的**字节偏移量（Byte Offset）**计算公式为：
$$\\text{Offset}(i_0, i_1, \\dots, i_{d-1}) = \\sum_{k=0}^{d-1} i_k \\times s_k$$
**惊人的几何结论**：
1. **转置操作（Transpose）为什么是 $O(1)$ 常数时间？**
   在 NumPy 中对矩阵做转置 `arr.T`，根本不需要搬移内存中的任何一个浮点数！它仅仅是将 `arr.shape` 和 `arr.strides` 元组中的顺序倒过来即可：原矩阵每走一行跳过 32 字节，转置后变成了每走一列跳过 32 字节。
2. **切片操作（Slice）为什么零拷贝？**
   对于子数组切片 `arr[::2, ::2]`，NumPy 只需要将对应轴的步长乘以 2，即可生成一个指向同一内存块的全新视图对象。

### 几何图景与计算图
```
2x3 矩阵在 C-连续内存中的物理布局：
形状 shape: (2, 3), 类型: float64 (8 字节), 步长 strides: (24, 8)

逻辑二维表格视图：
        轴 1 (列) ->
轴 0   [ [ a00, a01, a02 ],
(行)     [ a10, a11, a12 ] ]
  |
物理一维内存布局 (从低地址到高地址连续排布):
  | a00 | a01 | a02 | a10 | a11 | a12 |
  |<--- 24 字节 --->|<--- 24 字节 --->|
  |<-8B->|
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：以为所有切片操作之后修改数据都不会影响原数据
> **非常危险！** 基础切片（Basic Slicing，如 `a[1:5, :]`）返回的是原数组的**视图（View）**，它们底层共享同一片物理内存！如果你修改了切片中的某个值（`sub[0, 0] = 999`），原数组 `a` 中对应的元素**会被立刻同步篡改**！只有花式索引（Fancy Indexing，如用列表或布尔数组索引 `a[[1, 2], :]`）才会隐式创建全新独立的内存副本。若需要完全隔离，必须显式调用 `.copy()`。

### 工业界实践与工程考量
- 在高吞吐生产服务中，深度学习模型推理（如 ONNX Runtime 或 TensorRT）要求输入的张量必须是物理内存严格连续的（`arr.flags['C_CONTIGUOUS'] == True`）。如果之前对数据做过非连续步长切片或转置，必须在传入 C++ 引擎前显式执行 `np.ascontiguousarray(arr)`，否则底层 C API 会发生致命的内存越界段错误（Segmentation Fault）。

### 延伸思考与进阶阅读
- 阅读 Travis Oliphant《Guide to NumPy》第 2 章：多维数组内部结构与步长机制。
- 思考：利用 `np.lib.stride_tricks.as_strided`，我们能否在完全不复制任何数据的前提下，将一维时间序列向量瞬间重塑为一个滑动窗口矩阵？这种操作存在什么指针越界安全风险？

### 本节小结
- `ndarray` 通过内存缓冲区加步长元组实现了高性能多维抽象；
- 切片产生共享底层的视图（零拷贝），修改视图会直接改变原数组。"""

    l1_code = """import numpy as np

# 构造一个 3x4 的 float64 矩阵 (每个元素 8 字节)
arr = np.arange(12, dtype=np.float64).reshape(3, 4)

print("原始数组 shape:", arr.shape)
print("内存步长 strides (字节):", arr.strides) # (32, 8): 换行跳 32 字节 (4个float64)，换列跳 8 字节
print("物理内存是否 C-连续:", arr.flags['C_CONTIGUOUS'])

# 1. 基础切片：验证视图机制 (零内存拷贝)
view_slice = arr[1:, 1:3]
print("\\n切片数组 shape:", view_slice.shape)
print("切片数组 strides:", view_slice.strides)
print("view_slice 是否与原数组共享内存缓冲区:", view_slice.base is arr)

# 2. 原地修改切片，观察原数组的变化
view_slice[0, 0] = 999.0
print("\\n修改切片元素 view_slice[0, 0] = 999.0 之后:")
print("原数组 arr[1, 1] 的值变为:", arr[1, 1], "(证实视图直接修改原内存!)")

# 3. 花式索引 (Fancy Indexing)：验证副本机制
copy_fancy = arr[[0, 2], :] # 传入行索引列表
print("\\n花式索引 copy_fancy 是否与原数组共享内存:", copy_fancy.base is arr)
copy_fancy[0, 0] = -888.0
print("修改副本后，原数组 arr[0, 0] 是否被影响:", arr[0, 0] == -888.0, "(原数组保持安全!)")
"""

    lesson_1 = lesson(
        lesson_id="ml-data-l1-1",
        title="ndarray 内存布局、数据类型与步长切片：零拷贝的底层奥秘",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("防篡改防御性拷贝：当函数接收外部传入的特征数组并需要进行标准化时，第一行代码必须判断是否需要 `.copy()`，防止对外部原始训练数据造成破坏性覆写。", "pitfall"),
            tip("C 连续性检查：在将特征送入底层 C 扩展或 PyTorch 前，使用 `arr.flags['C_CONTIGUOUS']` 进行健康检查，非连续数组使用 `np.ascontiguousarray` 规整化。", "performance")
        ],
        demos=[
            demo(code=l1_code, title="步长元组、视图共享与花式索引内存行为实测")
        ]
    )

    # ── Lesson 1.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握 NumPy 广播机制（Broadcasting）的两个核心充要匹配法则（尾部对齐原则）；
2. 理解虚拟维度扩展（Virtual Dimension Expansion，`np.newaxis` 与 `None`）的代数本质；
3. 从底层步长角度理解：为什么广播能够以零内存开销实现标量与多维张量的算术运算；
4. 熟练运用广播机制计算成对样本距离矩阵、特征外积与批量标准化；
5. 编写代码实现向量化成对欧氏距离矩阵计算，实测其相较于嵌套 Python `for` 循环取得的高达 50 到 100 倍的速度提升。

### 前置知识
- 矩阵维度与笛卡尔积概念；
- 欧几里得距离与矩阵乘法展开。

### 问题背景与 ML 用途
在机器学习的特征工程与模型评估中，我们经常需要处理“不同尺寸张量之间的交互计算”：
- 将包含 10 万行样本的特征矩阵 $X \\in \\mathbb{R}^{N \\times d}$，每一列减去该特征的均值 $\\boldsymbol{\\mu} \\in \\mathbb{R}^d$；
- 在 $k$-近邻算法（KNN）或聚类算法中，计算 $N$ 个测试样本与 $M$ 个训练样本之间两两成对的距离矩阵 $D \\in \\mathbb{R}^{N \\times M}$；
- 在注意力机制中，将 Batch 维度的序列权重与上下文张量广播相加。
如果用 Python 的双重嵌套 `for` 循环遍历计算成对距离，在几万条数据上就要耗费数十分钟；
而通过**NumPy 广播机制与向量化展开**，可以在几毫秒内由 CPU 向量化单指令并发完成！

### 直觉理解
- **伸缩皮筋与维度拉伸**：广播就像将尺寸为 1 的轴线想象成一根具有弹性的皮筋。当两个形状不一样的数组进行加法时（比如一个 $3 \\times 1$ 的列向量和一个 $1 \\times 4$ 的行向量），NumPy 不会在内存里把这俩数组真正复制扩展成 $3 \\times 4$ 的大矩阵，而是**将那个长度为 1 的轴向步长直接设为 0**！步长为 0 意味着在沿着该轴移动时，内存指针根本不跳动，反复重复读取同一个数值。这样就在**完全不消耗额外内存**的前提下，让两张表格在逻辑上自动“充满”并完成对齐相加！

### 核心概念与符号对照表
| 核心概念 | 符号 / 语法 | 数学规则与语义 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **尾部对齐法则** | `Trailing Dimensions` | 从两个形状的最右侧（尾部）维度开始逐一向前比较 | 决定两个形状是否满足广播相容性 |
| **广播相容充要条件** | `dim_A == dim_B or 1` | 每一对维度要么数值严格相等，要么其中一个严格为 1 | 张量运算合法性判定 |
| **插入虚拟轴** | `x[:, None]` 或 `x[:, np.newaxis]` | 将 $1$ 维向量 $(N,)$ 升维为 $(N, 1)$ 列向量 | 触发外积与成对矩阵运算的通用技巧 |
| **两两成对平方和公式** | $\\|x_i - y_j\\|^2$ | $\\|x_i\\|^2 + \\|y_j\\|^2 - 2 x_i^T y_j$ | 距离矩阵 $O(N M)$ 复杂度的终极向量化解法 |

### 数学原理与逐步推导
#### 1. 广播维度的匹配算法
两个数组 $A$ 和 $B$ 是否能够广播，遵循以下两步判定：
1. **右对齐补齐**：如果两个数组的维度数量（`ndim`）不同，在维度较少的那个数组的形状**最左侧补 1**，直到两者的维度数相同。
2. **逐轴相容检验**：对于对齐后的每一个轴，两者的长度必须满足以下两个条件之一：
   - 长度完全相同（$d_A = d_B$）；
   - 或者其中一个长度为 1（$d_A = 1$ 或 $d_B = 1$）。
若所有轴均满足上述条件，则广播合法；输出数组在每个轴上的最终尺寸为 $\\max(d_A, d_B)$。
如果存在任意一个轴既不相等且都不为 1，NumPy 将立即抛出 `ValueError: operands could not be broadcast together`。

#### 2. 成对欧氏距离矩阵的向量化展开
设数据集 $X \\in \\mathbb{R}^{m \\times d}$，$Y \\in \\mathbb{R}^{n \\times d}$。
第 $i$ 个样本 $\\mathbf{x}_i$ 与第 $j$ 个样本 $\\mathbf{y}_j$ 之间的欧氏距离平方为：
$$D_{ij}^2 = \\|\\mathbf{x}_i - \\mathbf{y}_j\\|_2^2 = \\sum_{k=1}^d (x_{ik} - y_{jk})^2 = \\sum_{k=1}^d x_{ik}^2 + \\sum_{k=1}^d y_{jk}^2 - 2 \\sum_{k=1}^d x_{ik} y_{jk}$$
将其完全向量化表示：
1. 计算 $X$ 各行模长平方列向量：$\\mathbf{s}_X = [\\|\\mathbf{x}_1\\|^2, \\dots, \\|\\mathbf{x}_m\\|^2]^T \\in \\mathbb{R}^{m \\times 1}$；
2. 计算 $Y$ 各行模长平方行向量：$\\mathbf{s}_Y^T = [\\|\\mathbf{y}_1\\|^2, \\dots, \\|\\mathbf{y}_n\\|^2] \\in \\mathbb{R}^{1 \\times n}$；
3. 计算两矩阵的交叉内积：$M = X Y^T \\in \\mathbb{R}^{m \\times n}$；
4. 利用广播直接合成距离平方矩阵：
   $$D^2 = \\mathbf{s}_X + \\mathbf{s}_Y^T - 2 (X Y^T) \\in \\mathbb{R}^{m \\times n}$$
整个过程仅包含一次高度优化的 BLAS 矩阵乘法（GEMM）和两次矩阵广播加法，完全消除了任何 Python 层面的嵌套循环！

### 几何图景与计算图
```
广播机制计算外积：
向量 A (3, 1)        向量 B (1, 4)            广播合成矩阵 (3, 4)
  [ [a0],               [ [b0, b1, b2, b3] ]     [ [a0*b0, a0*b1, a0*b2, a0*b3],
    [a1],         *                                [a1*b0, a1*b1, a1*b2, a1*b3],
    [a2] ]                                         [a2*b0, a2*b1, a2*b2, a2*b3] ]
    │                      │                           ▲
    ▼                      ▼                           │
步长 strides=(8, 0)   步长 strides=(0, 8)  ─────────────┘ (零内存拷贝，步长为 0 重复读取)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：一维数组 (N,) 在最右侧补 1
> **大错特错！** 一维数组 `arr.shape = (5,)` 与二维数组 `(5, 1)` 进行加法时，广播规则是在最**左侧**补 1，将其视为 `(1, 5)`！因此 `(1, 5)` 和 `(5, 1)` 相加会得到一个 `(5, 5)` 的外积矩阵，而不是你预期的逐行相加！如果你希望一维向量作为列向量与矩阵运算，必须显式书写 `arr[:, None]`。

### 工业界实践与工程考量
- 在高维近邻检索中，由于浮点精度舍入误差，公式 $\\|x\\|^2 + \\|y\\|^2 - 2x^T y$ 在计算两个极其相近或相同的向量时，可能会算出微小的负数（如 $-10^{-16}$）。若直接对其开平方 `np.sqrt` 会产生 `NaN`。工业界代码必须加入截断保护：`np.sqrt(np.maximum(dist_sq, 0.0))`。

### 延伸思考与进阶阅读
- 阅读 NumPy 官方文档《Array Broadcasting in NumPy》。
- 思考：如果两个矩阵的尺寸分别是 $(10000, 10000)$，直接计算广播距离矩阵会瞬间消耗数 GB 显存并导致 OOM，工业界如何使用分块广播（Chunked Broadcasting）进行流式计算？

### 本节小结
- 广播机制通过右对齐与 1-轴匹配，以 0 步长实现了无需物理内存拷贝的多维对齐运算；
- 成对距离平方公式将两两距离转化为矩阵内积，是向量化的高性能典范。"""

    l2_code = """import numpy as np
import time

# 构造两组特征数据: X (500 样本 x 50 维特征), Y (300 样本 x 50 维特征)
np.random.seed(42)
X = np.random.randn(500, 50)
Y = np.random.randn(300, 50)

# 方法 1: 低效的 Python 双重嵌套 for 循环
def pairwise_python_loop(X, Y):
    m, n = X.shape[0], Y.shape[0]
    dist = np.zeros((m, n))
    for i in range(m):
        for j in range(n):
            dist[i, j] = np.sqrt(np.sum((X[i] - Y[j])**2))
    return dist

# 方法 2: 高性能向量化广播算法 (利用模长平方加内积展开)
def pairwise_vectorized(X, Y):
    # ||x - y||^2 = ||x||^2 + ||y||^2 - 2 * x^T y
    X_sq = np.sum(X**2, axis=1, keepdims=True)      # (m, 1)
    Y_sq = np.sum(Y**2, axis=1, keepdims=True).T    # (1, n)
    dist_sq = X_sq + Y_sq - 2.0 * (X @ Y.T)          # 广播相加得到 (m, n)
    return np.sqrt(np.maximum(dist_sq, 0.0))

# 测速与准确性对比
t0 = time.perf_counter()
dist_loop = pairwise_python_loop(X, Y)
t_loop = time.perf_counter() - t0

t0 = time.perf_counter()
dist_vec = pairwise_vectorized(X, Y)
t_vec = time.perf_counter() - t0

print(f"Python 双重循环耗时: {t_loop:.4f} 秒")
print(f"NumPy 向量化广播耗时: {t_vec:.4f} 秒")
print(f"向量化带来的加速比: {t_loop / t_vec:.1f} 倍！")
print("两方法计算结果最大绝对误差:", np.max(np.abs(dist_loop - dist_vec)))
"""

    lesson_2 = lesson(
        lesson_id="ml-data-l1-2",
        title="广播机制的维度匹配法则与外积/批计算：摆脱低效循环",
        content=l2_content,
        difficulty=3,
        tips=[
            tip("一维升维利器 np.newaxis：永远不要用循环做批处理操作，熟练使用 `x[:, None]` 或 `None` 将 1D 数组显式升维，利用广播完成矩阵批量交互。", "interview"),
            tip("平方根截断防 NaN：计算成对距离时，必须使用 `np.maximum(dist_sq, 0.0)` 截断微小的负浮点下溢，防止 sqrt 产生 NaN 污染下游模型。", "pitfall")
        ],
        demos=[
            demo(code=l2_code, title="成对距离矩阵 Python 循环 vs 向量化广播性能实测")
        ]
    )

    # ── Lesson 1.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握布尔掩码（Boolean Masking）与位运算符（`&`、`|`、`~`）在条件数据筛选中的正确用法；
2. 熟练运用 `np.where` 实现高性能三元条件选择与分箱标记；
3. 掌握 `np.select` 解决复杂的机器学习多分类特征打标与条件分支替换；
4. 理解花式索引（Fancy Indexing）的笛卡尔网格索引（`np.ix_`）机制；
5. 编写代码对包含异常值、缺失标记的大规模特征矩阵进行纯向量化清洗与离散化打标。

### 前置知识
- 布尔逻辑与真值表；
- 一维与二维数组切片。

### 问题背景与 ML 用途
在数据清洗与特征构建阶段，我们每天都要处理大量的条件逻辑：
- “如果用户年龄在 18 到 25 岁之间且消费金额大于 1000，则标记为‘高价值青年’，否则为‘普通客群’；”
- “如果特征值小于 0 或大于 3 倍标准差，则将其截断为边界值；”
- “如果类别标签在黑名单列表中，则过滤掉该行记录。”
很多初学者本能地使用 `for row in data: if ... elif ...` 逐行判断并用 `list.append` 累积，这在大数据场景下是极其灾难性的性能杀手。
**掌握布尔掩码与 `np.where` / `np.select`，是编写工业级高性能特征工程代码的必修课**。

### 直觉理解
- **模具网筛与流水线分拣**：布尔掩码就像一张打孔筛网，把整个特征表格往筛网上一倒，符合条件的格子透过光变成 `True`，不符合的变成 `False`。这张筛网自身就是一个纯粹的布尔矩阵。接下来，`np.where` 或 `np.select` 就像自动化流水线上的机械抓手，只针对筛网上透光的孔洞进行批量喷漆或替换，完全不需要人工一个个去翻看检查。

### 核心概念与符号对照表
| 核心概念 | 语法 / 函数 | 底层行为与规则 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **位逻辑运算符** | `&` (与), `\|` (或), `~` (非) | 逐元素进行底层二进制布尔位运算（**不可使用 `and`, `or`, `not`**） | 复合条件特征筛选与过滤 |
| **条件括号强制律** | `(cond1) & (cond2)` | Python 中位运算符优先级高于比较运算符，必须加括号 | 避免语法错误与逻辑偏差 |
| **三元向量选择** | `np.where(cond, x, y)` | 满足条件取 `x`，不满足取 `y`（若不传后两者则返回满足条件的索引） | 二值特征构建、缺失值指示器 |
| **多分支向量分拣** | `np.select(condlist, choicelist)` | 顺序匹配条件列表，返回首个匹配的分支值 | 多分类特征编码、风控等级打标 |
| **网格交叉索引** | `np.ix_([r1, r2], [c1, c2])` | 构建行索引与列索引的笛卡尔积开放网格 | 抽取指定子矩阵块与混淆矩阵切片 |

### 数学原理与逐步推导
#### 1. 为什么不能用 Python 原生的 `and` / `or` / `not`？
在 Python 解释器中，`and` 和 `or` 具有**短路求值（Short-circuit Evaluation）**特性，并且期望其操作数是一个单一的布尔标量（Boolean Truth Value）。
当一个多维 NumPy 布尔数组 `arr > 0` 传入 `and` 时，Python 试图将整个数组强制转换为一个单一的 `bool`（调用 `__bool__()` 方法）。由于一个包含多个 `True` 和 `False` 的数组无法明确界定到底是“真”还是“假”，NumPy 会断然抛出经典错误：
`ValueError: The truth value of an array with more than one element is ambiguous. Use a.any() or a.all()`。
因此，多维数组的逐元素逻辑运算**必须使用位运算符 `&`、`|`、`~`**，它们会重载 `__and__`、`__or__`、`__invert__` 方法，并行对内存中的每一个布尔位执行位运算。

#### 2. 运算符优先级陷阱
在 Python 语法树中，位运算符（`&`、`|`）的优先级**高于**比较运算符（`<`、`>`、`==`）！
如果你书写：`a > 0 & a < 10`
Python 实际解析为：`a > (0 & a) < 10`
这会导致极其隐蔽的逻辑灾难！因此必须**为每一个子条件强制包裹括号**：
`((a > 0) & (a < 10))`

### 几何图景与计算图
```
布尔掩码与向量选择机制：
特征数据 A:        [ 15,  -3,  45,   8,  -1 ]
条件掩码 (A < 0):  [ False, True, False, False, True ]
                   │
                   ▼ np.where(A < 0, 0, A)
清洗后结果:        [ 15,   0,  45,   8,   0 ] (负值被瞬间向量化归零，无任何 for 循环)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：`np.where` 会计算未被采纳的分支吗？
> **是的！** 这与 Python 的 `x if cond else y` 不同。在 `np.where(cond, expr_A, expr_B)` 中，`expr_A` 和 `expr_B` 都是先被完整计算出两个完整数组，然后由 `np.where` 根据条件挑选元素组合。因此，如果 `expr_A` 中包含潜在的除以零（如 `np.where(x != 0, 1.0 / x, 0.0)`），在计算 `1.0 / x` 时仍然会触发除以零的 RuntimeWarning（尽管最终结果里该位置被正确替换为 0.0）。若需彻底避免异常计算，应使用掩码就地赋值。

### 工业界实践与工程考量
- 在生产级特征工程流水线中，针对连续数值特征的分箱（Binning）操作，除了 `np.select` 外，工业界普遍使用 `np.digitize(x, bins)` 或 `pd.cut`，基于二分查找算法实现对数时间复杂度 $O(N \log K)$ 的极速分箱。

### 延伸思考与进阶阅读
- 阅读 Wes McKinney《Python for Data Analysis》第 4 章：NumPy 基础：数组与向量化计算。
- 思考：如何使用布尔掩码在一行代码内将一个包含大量异常浮点数的特征矩阵中的所有 NaN 和 Inf 替换为该特征的中位数？

### 本节小结
- 数组条件逻辑必须使用位运算符 `&`、`|`、`~` 且必须给子条件加括号；
- `np.where` 与 `np.select` 提供了极速的多分支向量化选择，是替代低效 Python `for` 循环的利器。"""

    l3_code = """import numpy as np

# 构造一个模拟的用户特征矩阵 (10 个用户，3 维特征: 年龄, 消费额, 信用分)
np.random.seed(42)
features = np.array([
    [22,  1500, 720],
    [35,   200, 650],
    [19,  4500, 800],
    [45,   100, 580],
    [28,  3200, 710],
    [60,   500, 690],
    [21,   800, 600],
    [52,  6000, 750],
    [24,  2800, 790],
    [31,  1100, 630]
])

age = features[:, 0]
spend = features[:, 1]
credit = features[:, 2]

# 1. 复杂复合条件布尔掩码筛选:
# 筛选 "年龄小于 30 岁" 且 "消费金额大于等于 2000" 的高潜年轻客群
mask_high_potential = (age < 30) & (spend >= 2000)
print("高潜年轻客群布尔掩码:", mask_high_potential)
print("符合条件的用户索引:", np.where(mask_high_potential)[0])
print("抽取该子客群的所有特征:\\n", features[mask_high_potential])

# 2. np.where 实现二值指示变量: 是否高信用户 (信用分 >= 700 标记为 1, 否则为 0)
high_credit_flag = np.where(credit >= 700, 1, 0)
print("\\n高信用客户标签 (np.where):", high_credit_flag)

# 3. np.select 实现多分支精细化客群评级打标:
# 条件 1: 年龄 < 30 且 消费 >= 3000 -> "Young_VIP"
# 条件 2: 消费 >= 5000 -> "General_VIP"
# 条件 3: 信用 < 600 -> "Risk_Customer"
# 默认分支: "Standard"
conditions = [
    (age < 30) & (spend >= 3000),
    (spend >= 5000),
    (credit < 600)
]
labels = ["Young_VIP", "General_VIP", "Risk_Customer"]
user_segments = np.select(conditions, labels, default="Standard")

print("\\n各用户多分支打标结果 (np.select):")
for i, seg in enumerate(user_segments):
    print(f"  用户 {i}: 年龄={age[i]}, 消费={spend[i]}, 信用={credit[i]} -> 评级: 【{seg}】")
"""

    lesson_3 = lesson(
        lesson_id="ml-data-l1-3",
        title="高性能花式索引、掩码过滤与布尔逻辑运算：条件处理的机械化流水线",
        content=l3_content,
        difficulty=3,
        tips=[
            tip("必须使用位运算符与圆括号：多条件筛选必须使用 `&` 与 `|`，且每一个子条件必须用小括号包裹，如 `(x > 0) & (x < 10)`，否则必然触发优先级 Bug 或类型异常。", "pitfall"),
            tip("np.select 替代嵌套 where：当分支条件超过 2 个时，切忌写嵌套的 `np.where(..., np.where(...))`，使用 `np.select` 结构清晰且性能一致高效。", "interview")
        ],
        demos=[
            demo(code=l3_code, title="布尔掩码过滤与 np.where / np.select 多分支打标实战")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 1 ──
    exercises = [
        single_choice(
            ex_id="ml-data-c1-ex1",
            question="在对 NumPy 多维数组进行切片操作（例如 `sub = arr[1:5, :]`）之后，如果修改切片中的某个元素 `sub[0, 0] = 999`，原数组 `arr` 会发生什么变化？",
            options=[
                {"value": "A", "text": "原数组 `arr` 中对应的元素也会被同步修改为 999，因为基础切片返回的是共享底层缓冲区的视图（View）"},
                {"value": "B", "text": "原数组 `arr` 完全不受影响，因为切片会深拷贝全部数据"},
                {"value": "C", "text": "NumPy 会抛出只读内存不可篡改异常（ReadOnlyError）"},
                {"value": "D", "text": "原数组 `arr` 会被清空为全 0"},
            ],
            answer="A",
            explanation="NumPy 的基础切片操作返回的是原数组的视图（View），其 `.base` 指向原数组，二者在底层共享同一个物理数据缓冲区。因此修改切片中的数值会直接反映在原数组上。若需独立副本必须显式调用 `.copy()`。",
            difficulty=2,
            related_lesson_id="ml-data-l1-1",
            tags=["NumPy切片", "视图与副本", "内存共享机制"],
        ),
        judge(
            ex_id="ml-data-c1-ex2",
            question="在进行两个 NumPy 数组的多条件复合布尔筛选时，可以直接使用 Python 原生的逻辑关键字，例如书写 `arr[arr > 0 and arr < 10]`。",
            answer=False,
            explanation="错误。Python 原生的 `and`、`or`、`not` 期望操作数是单一布尔值，作用于多维数组时会抛出歧义异常（ValueError: The truth value of an array is ambiguous）。必须使用位运算符且给子条件加括号：`arr[(arr > 0) & (arr < 10)]`。",
            difficulty=2,
            related_lesson_id="ml-data-l1-3",
            tags=["布尔掩码", "位运算符", "语法陷阱"],
        ),
        multiple_choice(
            ex_id="ml-data-c1-ex3",
            question="根据 NumPy 的广播法则（Broadcasting Rules），下列哪几对形状的数组之间可以直接进行逐元素算术运算？",
            options=[
                {"value": "A", "text": "形状 `(256, 256, 3)` 与形状 `(3,)`"},
                {"value": "B", "text": "形状 `(100, 1)` 与形状 `(1, 50)`"},
                {"value": "C", "text": "形状 `(50, 4)` 与形状 `(50,)`"},
                {"value": "D", "text": "形状 `(10, 1, 8)` 与形状 `(1, 15, 8)`"},
            ],
            answer=["A", "B", "D"],
            explanation="A、B、D 均完全满足广播相容性法则。C 是错误的：`(50, 4)` 和 `(50,)` 右对齐后，倒数第一个轴是 4 对 50，既不相等且都不为 1，因此无法广播（若希望按列广播必须写成 `(50, 1)`）。",
            difficulty=3,
            related_lesson_id="ml-data-l1-2",
            tags=["广播法则", "维度对齐", "张量运算"],
        ),
        fill(
            ex_id="ml-data-c1-ex4",
            question="在 NumPy 内部，描述沿着各个轴每移动一个元素在物理内存中需要跨越的字节数的元组被称为 ____（Strides）；在行优先排列的 C-连续内存中，对于一个 `shape=(3, 4)` 且数据类型为 8 字节浮点数的矩阵，其步长元组是 ____ 字节。",
            blanks=[
                ["步长", "内存步长", "strides"],
                ["(32, 8)", "(32,8)", "32, 8", "32,8"]
            ],
            explanation="描述内存跨越字节数的属性是 strides；在 (3, 4) 的 float64 矩阵中，一行有 4 个 8 字节元素共 32 字节，一列间隔 8 字节，故 strides 为 (32, 8)。",
            difficulty=2,
            related_lesson_id="ml-data-l1-1",
            tags=["内存步长", "strides", "C连续"],
        ),
        open_ex(
            ex_id="ml-data-c1-ex5",
            question="【架构推导题】请系统回答关于成对欧氏距离矩阵（Pairwise Euclidean Distance Matrix）的高性能向量化推导与工程考量：\n1. 设矩阵 $X \\in \\mathbb{R}^{m \\times d}$ 与 $Y \\in \\mathbb{R}^{n \\times d}$，写出两两样本距离平方 $\\|\\mathbf{x}_i - \\mathbf{y}_j\\|_2^2$ 的代数展开式；\n2. 说明如何利用矩阵内积与广播机制，在不使用任何 Python 循环的前提下构建出整个 $m \\times n$ 的距离矩阵；\n3. 阐明为什么在最后执行 `np.sqrt` 前必须加入 `np.maximum(dist_sq, 0.0)` 保护截断（指出浮点数精度的潜在失效场景）。",
            reference_answer="""推导与工程考量如下：
1. 代数展开：
   对样本对的欧氏距离平方展开：
   $$\\|\\mathbf{x}_i - \\mathbf{y}_j\\|_2^2 = \\sum_{k=1}^d (x_{ik} - y_{jk})^2 = \\sum_{k=1}^d x_{ik}^2 + \\sum_{k=1}^d y_{jk}^2 - 2 \\sum_{k=1}^d x_{ik} y_{jk} = \\|\\mathbf{x}_i\\|^2 + \\|\\mathbf{y}_j\\|^2 - 2 \\mathbf{x}_i^T \\mathbf{y}_j$$
2. 向量化构建流程：
   - 计算 $X$ 各行模长平方列向量：$\\mathbf{s}_X = \\text{np.sum}(X^2, \\text{axis}=1, \\text{keepdims}=\\text{True}) \\in \\mathbb{R}^{m \\times 1}$；
   - 计算 $Y$ 各行模长平方行向量：$\\mathbf{s}_Y^T = \\text{np.sum}(Y^2, \\text{axis}=1, \\text{keepdims}=\\text{True}).T \\in \\mathbb{R}^{1 \\times n}$；
   - 利用高度优化的 BLAS 库计算全量样本内积矩阵：$M = X @ Y.T \\in \\mathbb{R}^{m \\times n}$；
   - 利用广播将列向量与行向量相加并减去交叉项：$\\text{dist\\_sq} = \\mathbf{s}_X + \\mathbf{s}_Y^T - 2.0 \\times M \\in \\mathbb{R}^{m \\times n}$。
3. 数值截断保护必要性：
   由于 IEEE 754 浮点数运算存在舍入误差，当样本 $\\mathbf{x}_i$ 与 $\\mathbf{y}_j$ 极其接近甚至完全相同时，理论上 $\\|x_i - y_j\\|^2 = 0$，但代数展开中 $\\|x_i\\|^2 + \\|x_i\\|^2 - 2 x_i^T x_i$ 由于不同浮点运算顺序的舍入误差，极有可能计算出一个微小的负数（例如 $-10^{-16}$）。若直接传入 `np.sqrt`，负数开方会立即产生 `NaN`，导致后续模型崩溃。因此必须使用 `np.maximum(dist_sq, 0.0)` 进行下界保护。""",
            explanation="系统结合数学展开公式、矩阵广播运算以及 IEEE 754 浮点舍入下溢保护，体现了高水平的向量化与工程稳健性设计。",
            rubric=[
                {"point": "正确写出欧氏距离平方展开式 ||x||^2 + ||y||^2 - 2x^T y", "score": 25},
                {"point": "正确阐述行模长平方 (m, 1) 与 (1, n) 的广播机制构建流程", "score": 25},
                {"point": "明确指出利用矩阵乘法 X @ Y.T 调动底层 BLAS 加速", "score": 25},
                {"point": "深刻阐述浮点舍入误差导致负微小值与 np.maximum 截断防 NaN 机制", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-data-l1-2",
            tags=["成对距离", "向量化展开", "浮点舍入误差", "BLAS优化"],
        ),
        # ── Code Exercise 1 ──
        {
            "id": "ml-data-c1-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现纯向量化的成对样本欧几里得距离矩阵计算器：\n编写函数 `vectorized_pairwise_distances(X, Y)`：\n接收两个 2D 数组或列表 $X \\in \\mathbb{R}^{m \\times d}$ 与 $Y \\in \\mathbb{R}^{n \\times d}$。\n利用两两平方和公式 $\\|x_i - y_j\\|^2 = \\|x_i\\|^2 + \\|y_j\\|^2 - 2 x_i^T y_j$ 与广播机制，完全不使用任何 Python `for` 循环，计算并返回尺寸为 $m \\times n$ 的欧几里得距离矩阵（NumPy 浮点数组，元素使用 `np.round(..., 4)` 保留 4 位小数，最终通过 `.tolist()` 转化为嵌套 Python 列表）。\n必须加入 `np.maximum(..., 0.0)` 保护以防浮点下溢产生 NaN。\n\n最后一行请返回调用示例在测试样本 `X = [[0.0, 0.0], [3.0, 4.0]]`, `Y = [[0.0, 0.0], [1.0, 1.0]]` 下的计算结果。",
            "starterCode": "import numpy as np\n\ndef vectorized_pairwise_distances(X, Y) -> list:\n    \"\"\"利用广播与矩阵乘法完全向量化计算成对欧氏距离矩阵\"\"\"\n    # 请在此实现\n    ___\n\nX_demo = [[0.0, 0.0], [3.0, 4.0]]\nY_demo = [[0.0, 0.0], [1.0, 1.0]]\nvectorized_pairwise_distances(X_demo, Y_demo)\n",
            "setupCode": "",
            "expectedOutput": "[[0.0, 1.4142], [5.0, 3.6056]]",
            "answer": "import numpy as np\n\ndef vectorized_pairwise_distances(X, Y) -> list:\n    X = np.array(X, dtype=float)\n    Y = np.array(Y, dtype=float)\n    X_sq = np.sum(X**2, axis=1, keepdims=True)\n    Y_sq = np.sum(Y**2, axis=1, keepdims=True).T\n    dist_sq = X_sq + Y_sq - 2.0 * (X @ Y.T)\n    dist = np.sqrt(np.maximum(dist_sq, 0.0))\n    return np.round(dist, 4).tolist()\n\nX_demo = [[0.0, 0.0], [3.0, 4.0]]\nY_demo = [[0.0, 0.0], [1.0, 1.0]]\nvectorized_pairwise_distances(X_demo, Y_demo)\n",
            "tests": "X_t = [[1.0, 2.0]]\nY_t = [[4.0, 6.0]]\nres_t = vectorized_pairwise_distances(X_t, Y_t)\nassert res_t == [[5.0]], f\"距离计算错误: {res_t}\"\n",
            "explanation": "利用行模长平方广播与矩阵乘法交叉项，消除嵌套循环，以硬件极限速度计算距离矩阵。",
            "tags": ["成对距离", "向量化", "广播机制", "NumPy编程实战"],
            "related_lesson_id": "ml-data-l1-2",
        },
        single_choice(
            ex_id="ml-data-c1-ex7",
            question="当面对包含 4 个互斥复杂业务条件的特征工程打标任务时，为了保证代码的高性能执行并避免可读性极差的多层嵌套 `np.where`，NumPy 推荐的最佳原生函数是什么？",
            options=[
                {"value": "A", "text": "`np.select`"},
                {"value": "B", "text": "`np.vectorize`"},
                {"value": "C", "text": "Python 原生 `map` 结合 `lambda`"},
                {"value": "D", "text": "`np.apply_along_axis`"},
            ],
            answer="A",
            explanation="`np.select(condlist, choicelist, default=...)` 专门用于多分支条件向量化分拣，既避免了多重嵌套 `np.where` 的冗长晦涩，又具备底层 C 级别的纯向量化执行性能。而 `np.vectorize` 和 `map` 本质上依然是 Python 层面的低效循环封装。",
            difficulty=2,
            related_lesson_id="ml-data-l1-3",
            tags=["np.select", "多分支打标", "向量化工程"],
        ),
    ]

    return chapter(
        chapter_id="ml-data-c1",
        course_id="ml-python-data",
        order=1,
        title="NumPy 核心机制与高性能向量化计算",
        goal="掌握 ndarray 步长机制与零拷贝视图，熟练运用广播法则与向量化矩阵计算消除低效 Python 循环。",
        lessons=lessons,
        exercises=exercises,
    )
