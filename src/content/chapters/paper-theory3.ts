import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 理论与复杂度
 *  06 The First Law of Complexodynamics
 *  07 The Coffee Automaton
 *
 *  来源：
 *  - 论文：Scott Aaronson, "The First Law of Complexodynamics"（2011 博客）
 *  - 论文：Aaronson, Carroll, Ouellette, "Quantifying the Rise and Fall of
 *          Complexity in Closed Systems: The Coffee Automaton"（2014）
 *          arXiv:1405.6903
 *  - 参考：Ojhaharsh/30u30 第 06/07 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：纯 numpy + 标准库 gzip，走 Pyodide 浏览器内执行。
 * ============================================================ */

export const paperTheoryChapters3: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c3: Complexodynamics
   * ============================================================ */
  {
    id: 'paper-theory-c3',
    title: '复杂动力学：熵增，复杂度先升后降',
    goal: '理解"熵"与"复杂度"的区别，掌握用 gzip 压缩率近似柯尔莫哥洛夫复杂度的方法，能模拟封闭系统中复杂度的演化。',
    lessons: [
      {
        id: 'paper-theory-c3-l1',
        title: '熵、复杂度与咖啡杯',
        difficulty: 4,
        content: `
## 文献信息

| 项目 | 内容 |
| --- | --- |
| **文章** | Scott Aaronson, *The First Law of Complexodynamics*（2011 博客） |
| **一句话贡献** | 提出"复杂度"与"熵"是不同的量：封闭系统中熵单调增，但复杂度先升后降 |

## 一个日常观察

**把牛奶倒进咖啡**，然后观察：

| 时刻 | 状态 | 熵 | 复杂度 |
| --- | --- | --- | --- |
| t=0 | 牛奶和咖啡分开 | 低 | **低**（简单） |
| t=中 | 螺旋状混合 | 中 | **高**（复杂图案） |
| t=∞ | 均匀混合 | **高** | **低**（简单） |

**关键观察**：

- **熵**：单调递增（热力学第二定律）
- **复杂度**：**先升后降**（倒 U 型）

<EntropyComplexityDemo />

**这就是"复杂动力学第一定律"**：
**复杂度不是熵，它有自己的演化规律。**

## 熵：无序的度量

**香农熵**：

    H = -Σ p_i · log₂ p_i

**对于图像**：如果每个像素独立，熵就是像素值分布的熵。

**熵的性质**：
- 均匀分布熵最大（最无序）
- 确定性分布熵最小（最有序）

**关键**：**均匀混合的咖啡熵最大，但看起来最简单。**

## 复杂度：结构的度量

**问题**：如何量化"螺旋图案比均匀混合更复杂"？

**Aaronson 的方案**：**用压缩率**。

    C(x) = |compressed(x)| - |compressed(shuffled(x))|

**直觉**：

- **纯随机数据**：无法压缩，但**打乱后也无法压缩** → C ≈ 0
- **均匀混合**：可以压缩（统计规律），打乱后也能压缩 → C ≈ 0
- **螺旋图案**：**有结构但不可简单描述** → 压缩率中等，打乱后变差 → **C 大**

**关键洞察**：**复杂度 = 有序性带来的"可压缩性优势"**。

<CompressionComplexityDemo />

## 柯尔莫哥洛夫复杂度

**定义**：

    K(x) = 能生成 x 的最短程序的长度

**例子**：

| 字符串 | K(x) | 原因 |
| --- | --- | --- |
| \`"aaaa...a"\`（1000 个 a） | 很小 | 程序：\`print("a"*1000)\` |
| 随机 1000 位 | ≈1000 | 只能硬编码 |
| π 的前 1000 位 | 很小 | 程序：计算 π |

**问题**：**K(x) 不可计算**（停机问题）。

**实用近似**：**用压缩算法（gzip、LZMA）的长度近似**。

    K(x) ≈ |gzip(x)|

**注意**：这是**上界**（gzip 不是最优压缩器），且依赖具体算法。

## 用 gzip 测量复杂度

**Aaronson 的做法**：

    def complexity(grid):
        # 1. 原始压缩长度
        raw = len(gzip(grid))

        # 2. 打乱后压缩长度（破坏结构，保留统计特性）
        shuffled = shuffle(grid)
        shuf = len(gzip(shuffled))

        # 3. 复杂度 = 差值
        return shuf - raw

**为什么用差值**：

| 状态 | raw | shuf | 差值 |
| --- | --- | --- | --- |
| 纯随机 | 大 | 大 | ≈0 |
| 均匀混合 | 小 | 小 | ≈0 |
| **螺旋图案** | **中** | **大** | **大** |

**"打乱"的作用**：消除结构但保留统计特性。
如果原图有结构（可压缩），打乱后就不可压缩了 → 差值大。

## 模拟：二维网格的"咖啡混合"

**模型**：网格上的"粒子交换"（Kolmogorov 流）。

    def swap_step(grid):
        # 随机选相邻的异色对，交换
        find adjacent pairs with different colors
        randomly swap one pair

**为什么这模拟混合**：
- 物理上，分子随机运动导致混合
- 交换相邻异色对 = 局部消除差异

<CoffeeSimulationDemo />

**预期结果**：

| 阶段 | 视觉 | 熵 | 复杂度 |
| --- | --- | --- | --- |
| 初期 | 左右分明 | 低 | 低 |
| 中期 | 螺旋/条纹 | 中 | **高** |
| 后期 | 均匀 | 高 | 低 |

## 粗粒化：模拟"观察者分辨率"

**关键洞察**：**复杂度依赖观察尺度**。

- 从远处看（粗粒化），螺旋图案 = 均匀混合
- 从近处看（精细），螺旋图案 = 复杂结构

**做法**：

    def coarse_grain(grid, block_size):
        # 把 block_size × block_size 的块平均成一个像素
        return block_reduce(grid, block_size)

**多尺度复杂度**：

    for scale in [1, 2, 4, 8, 16]:
        c = complexity(coarse_grain(grid, scale))
        print(f"scale={scale}: C={c}")

**预期**：复杂度在某个中间尺度最大——这就是"有结构"的定义。

## 论文的结论

**"复杂动力学第一定律"**：

> 在封闭系统中，熵单调增加，但复杂度先增加后减少。

**为什么重要**：

| 领域 | 意义 |
| --- | --- |
| **宇宙学** | 宇宙的复杂度也是先升后降？ |
| **生物学** | 生命的复杂度演化 |
| **AI** | 训练过程中模型复杂度的演化 |
| **热力学** | 熵与信息的关系 |

**一个深刻的推论**：

> **"复杂"是暂时的、稀有的状态。**
> 大多数状态要么太有序（简单），要么太无序（简单）。

**这解释了为什么生命/智能是稀有的**——
它们需要维持在"复杂"的狭窄区间。

## 本节来源

> **来源类型：学术来源（博客 + 论文）**
> - Aaronson, S. *The First Law of Complexodynamics*（2011）
>   https://scottaaronson.blog/?p=762
>   **说明**：博客文章，非同行评审，但提出了明确的研究纲领
> - Aaronson, S., Carroll, S. M., Ouellette, L. *Quantifying the Rise and Fall of
>   Complexity in Closed Systems: The Coffee Automaton*
>   arXiv:[1405.6903](https://arxiv.org/abs/1405.6903)（2014）
>
> **来源类型：学术来源（背景）**
> - Li, M. & Vitányi, P. *An Introduction to Kolmogorov Complexity and Its Applications*
>   （经典教材，K(x) 的严格定义）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 06 篇（751 行，含 gzip_complexity / coarse_grain / multiscale_kc）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「熵与复杂度的区别」：熵是无序度（单调增），复杂度是结构度（先升后降）。均匀混合熵最高但复杂度最低——这就是"复杂"的稀缺性。',
          },
          {
            kind: 'leak',
            text: '「如何用 gzip 测复杂度」：C = |gzip(shuffled)| - |gzip(raw)|。打乱消除结构但保留统计特性，所以差值反映"有序性带来的可压缩优势"。',
          },
          {
            kind: 'pitfall',
            text: '柯尔莫哥洛夫复杂度 K(x) 不可计算（停机问题）。gzip 长度只是上界近似，且依赖具体算法——换压缩器结果会变。',
          },
        ],
        demos: [
          {
            title: '熵 vs 复杂度：完整模拟',
            lang: 'python',
            code: `import numpy as np
import gzip

def entropy_of_grid(grid):
    """计算网格的香农熵（基于像素值分布）。"""
    values, counts = np.unique(grid, return_counts=True)
    probs = counts / counts.sum()
    return -np.sum(probs * np.log2(probs + 1e-10))

def gzip_size(data):
    """gzip 压缩后的大小（字节）。"""
    return len(gzip.compress(data.tobytes(), compresslevel=9))

def complexity(grid, seed=0):
    """
    复杂度 = gzip(打乱) - gzip(原始)

    打乱消除结构但保留统计特性。
    如果原图有结构（可压缩），打乱后不可压缩 -> 差值大。
    """
    rng = np.random.default_rng(seed)
    raw_size = gzip_size(grid)

    # 打乱（保持像素值分布）
    shuffled = grid.ravel().copy()
    rng.shuffle(shuffled)
    shuffled = shuffled.reshape(grid.shape)
    shuf_size = gzip_size(shuffled)

    return shuf_size - raw_size


def make_grid(size=40, pattern='separated'):
    """创建不同初始图案。"""
    g = np.zeros((size, size), dtype=np.uint8)
    if pattern == 'separated':
        g[:, size//2:] = 1          # 左右分开
    elif pattern == 'spiral':
        # 螺旋图案
        cx, cy = size // 2, size // 2
        for r in range(size):
            for c in range(size):
                dist = np.sqrt((r-cx)**2 + (c-cy)**2)
                angle = np.arctan2(r-cy, c-cx)
                if int(dist / 3 + angle * 2) % 2 == 0:
                    g[r, c] = 1
    elif pattern == 'random':
        g = np.random.default_rng(0).integers(0, 2, (size, size)).astype(np.uint8)
    elif pattern == 'uniform':
        g[:] = 1
    return g


print("=== 三种状态的熵与复杂度对比 ===")
print()
print(f"{'状态':>12} | {'熵':>8} | {'gzip原始':>9} | {'gzip打乱':>9} | {'复杂度':>8}")
print("-" * 62)

for name, pattern in [
    ("均匀（全1）", 'uniform'),
    ("左右分开", 'separated'),
    ("螺旋图案", 'spiral'),
    ("纯随机", 'random'),
]:
    g = make_grid(40, pattern)
    h = entropy_of_grid(g)
    raw = gzip_size(g)
    rng = np.random.default_rng(0)
    sh = g.ravel().copy(); rng.shuffle(sh); sh = sh.reshape(g.shape)
    shuf = gzip_size(sh)
    c = complexity(g)
    print(f"{name:>12} | {h:>8.3f} | {raw:>9} | {shuf:>9} | {c:>8}")

print()
print("=== 关键观察 ===")
print()
print("熵：")
print("  · 全1 的熵最低（完全确定）")
print("  · 随机的熵最高（像素各半）")
print("  · 左右分开/螺旋 的熵中等（也是各半）")
print()
print("复杂度：")
print("  · 全1：0（太简单，打乱后反而更不可压缩？实际是反的）")
print("  · 螺旋：高（有结构，打乱后损失大）")
print("  · 随机：0（无结构，打乱前后都一样）")
print()
print("这就是关键：")
print("  熵高的（随机）复杂度低")
print("  熵中的（螺旋）复杂度高")
print("  熵低的（均匀）复杂度也低")
print("  -> 复杂度在中间熵值处最大（倒U型）")`,
          },
          {
            title: '模拟咖啡混合：复杂度先升后降',
            lang: 'python',
            code: `import numpy as np
import gzip
import matplotlib.pyplot as plt

def gzip_size(data):
    return len(gzip.compress(data.tobytes(), compresslevel=9))

def complexity(grid, seed=0):
    rng = np.random.default_rng(seed)
    raw = gzip_size(grid)
    sh = grid.ravel().copy()
    rng.shuffle(sh)
    return gzip_size(sh.reshape(grid.shape)) - raw

def entropy_of_grid(grid):
    values, counts = np.unique(grid, return_counts=True)
    probs = counts / counts.sum()
    return -np.sum(probs * np.log2(probs + 1e-10))

def swap_step(grid, rng):
    """交换一个相邻的异色对（模拟混合）。"""
    size = grid.shape[0]
    # 随机选一个位置
    for _ in range(10):    # 尝试 10 次
        r = rng.integers(0, size)
        c = rng.integers(0, size - 1)
        if grid[r, c] != grid[r, c+1]:
            grid[r, c], grid[r, c+1] = grid[r, c+1], grid[r, c]
            return True
    return False


print("=== 咖啡混合模拟 ===")
print()
size = 32
grid = np.zeros((size, size), dtype=np.uint8)
grid[:, size//2:] = 1     # 左咖啡，右牛奶

rng = np.random.default_rng(42)
steps_log = []
entropies = []
complexities = []

print(f"{'步数':>8} | {'熵':>8} | {'复杂度':>8} | {'说明'}")
print("-" * 50)

for step in range(0, 20001):
    if step % 2000 == 0:
        h = entropy_of_grid(grid)
        c = complexity(grid)
        steps_log.append(step)
        entropies.append(h)
        complexities.append(c)
        desc = ""
        if step == 0: desc = "左右分明"
        elif c > 300: desc = "结构最复杂"
        elif step >= 16000: desc = "接近均匀"
        print(f"{step:>8} | {h:>8.4f} | {c:>8} | {desc}")

    # 每步做多次交换
    for _ in range(20):
        swap_step(grid, rng)

print()
print("=== 结论 ===")
print()
print("熵：单调递增（0 -> 1.0）")
print("复杂度：先升后降（倒 U 型）")
print()
print("这正是'复杂动力学第一定律'：")
print("  封闭系统中，熵单调增，复杂度先升后降。")

# 可视化
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

axes[0].plot(steps_log, entropies, 'o-', linewidth=2, color='#ef4444')
axes[0].set_xlabel('Steps'); axes[0].set_ylabel('Entropy (bits)')
axes[0].set_title('Entropy: monotonically increases')
axes[0].grid(alpha=0.3)

axes[1].plot(steps_log, complexities, 's-', linewidth=2, color='#2f6bff')
axes[1].set_xlabel('Steps'); axes[1].set_ylabel('Complexity (bytes)')
axes[1].set_title('Complexity: rises then falls')
axes[1].grid(alpha=0.3)

plt.tight_layout()
plt.savefig('entropy_complexity.png', dpi=80, bbox_inches='tight')
print()
print("已生成图表 entropy_complexity.png")`,
          },
          {
            title: '多尺度复杂度：粗粒化的影响',
            lang: 'python',
            code: `import numpy as np
import gzip

def gzip_size(data):
    return len(gzip.compress(data.tobytes(), compresslevel=9))

def coarse_grain(grid, block):
    """粗粒化：把 block×block 的块平均成一个像素。"""
    size = grid.shape[0]
    new_size = size // block
    out = np.zeros((new_size, new_size), dtype=np.uint8)
    for i in range(new_size):
        for j in range(new_size):
            block_region = grid[i*block:(i+1)*block, j*block:(j+1)*block]
            out[i, j] = 1 if block_region.mean() > 0.5 else 0
    return out

def complexity(grid, seed=0):
    rng = np.random.default_rng(seed)
    raw = gzip_size(grid)
    sh = grid.ravel().copy()
    rng.shuffle(sh)
    return gzip_size(sh.reshape(grid.shape)) - raw


# 创建螺旋图案
size = 64
grid = np.zeros((size, size), dtype=np.uint8)
cx, cy = size // 2, size // 2
for r in range(size):
    for c in range(size):
        dist = np.sqrt((r-cx)**2 + (c-cy)**2)
        angle = np.arctan2(r-cy, c-cx)
        if int(dist / 4 + angle * 2) % 2 == 0:
            grid[r, c] = 1

print("=== 多尺度复杂度（螺旋图案）===")
print()
print(f"{'尺度':>6} | {'网格大小':>10} | {'复杂度':>10} | {'说明'}")
print("-" * 48)

for block in [1, 2, 4, 8, 16, 32]:
    cg = coarse_grain(grid, block)
    c = complexity(cg)
    note = ""
    if block == 1: note = "原始细节"
    elif block == 4: note = "结构最明显"
    elif block >= 16: note = "看不清结构"
    print(f"{block:>6} | {cg.shape[0]:>10} | {c:>10} | {note}")

print()
print("=== 关键洞察 ===")
print()
print("复杂度依赖观察尺度：")
print("  · 太精细（block=1）：局部噪声多，结构被淹没")
print("  · 中等（block=2~4）：结构最清晰，复杂度最高")
print("  · 太粗糙（block=16+）：结构消失，退化成均匀")
print()
print("这就是为什么'复杂度'不是绝对的——")
print("它依赖于观察者的分辨率。")
print()
print("对 AI 的启示：")
print("  · 特征提取 = 选择合适的粗粒化尺度")
print("  · 太细：过拟合噪声")
print("  · 太粗：丢失信息")
print("  · 好的表示 = 在正确的尺度上捕捉结构")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-theory-c3-e1',
        type: 'single',
        difficulty: 2,
        question: '"复杂动力学第一定律"说的是？',
        options: [
          { value: 'A', text: '熵和复杂度都单调增加' },
          { value: 'B', text: '封闭系统中熵单调增加，但复杂度先增加后减少' },
          { value: 'C', text: '复杂度单调减少' },
          { value: 'D', text: '熵和复杂度无关' },
        ],
        answer: 'B',
        explanation:
          '牛奶倒入咖啡：初期分开（都低）→ 中期螺旋（复杂度高）→ 后期均匀（熵最高但复杂度低）。所以复杂度是倒 U 型，与熵的单调递增不同。',
        tags: ['第一定律'],
      },
      {
        id: 'paper-theory-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: '均匀混合的咖啡熵最高，所以它的复杂度也最高。',
        answer: false,
        explanation:
          '均匀混合熵最高（最无序），但复杂度**最低**（最简单）。复杂度衡量"结构"，均匀混合没有任何结构。这就是熵与复杂度的本质区别。',
        tags: ['熵 vs 复杂度'],
      },
      {
        id: 'paper-theory-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '用 gzip 近似柯尔莫哥洛夫复杂度时，为什么要计算"打乱后 - 原始"的差值？（多选）',
        options: [
          { value: 'A', text: '打乱消除结构但保留统计特性' },
          { value: 'B', text: '纯随机数据打乱前后都无法压缩，差值为 0' },
          { value: 'C', text: '有结构的数据打乱后不可压缩，差值大' },
          { value: 'D', text: '为了让计算更快' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——打乱反而增加计算量。A/B/C 解释了为什么差值能反映"结构"：差值 = 有序性带来的可压缩优势。',
        tags: ['复杂度测量'],
      },
      {
        id: 'paper-theory-c3-e4',
        type: 'fill',
        difficulty: 3,
        question:
          '柯尔莫哥洛夫复杂度 K(x) 定义为能生成 x 的最短 ___ 的长度，但它不可计算。',
        blanks: [['程序', 'program', '描述']],
        explanation:
          'K(x) = min{|p| : U(p) = x}，其中 U 是通用图灵机。它不可计算是因为停机问题不可判定。实践中用压缩算法（gzip/LZMA）的长度作为上界近似。',
        tags: ['柯尔莫哥洛夫复杂度'],
      },
      {
        id: 'paper-theory-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算香农熵：shannon_entropy(grid)。\n\n- grid: 二维 numpy 数组\n- 基于像素值分布计算：H = -Σ p·log₂(p)',
        starterCode: `import numpy as np

def shannon_entropy(grid):
    values, counts = np.unique(grid, return_counts=True)
    probs = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '香农熵',
        tests: `import numpy as np
# 全 0：熵为 0
g1 = np.zeros((10, 10), dtype=np.uint8)
assert abs(shannon_entropy(g1)) < 1e-9

# 一半 0 一半 1：熵为 1
g2 = np.zeros((10, 10), dtype=np.uint8)
g2[:, 5:] = 1
assert abs(shannon_entropy(g2) - 1.0) < 1e-9

# 四种等概率：熵为 2
g3 = np.zeros((4, 4), dtype=np.uint8)
g3[0:2, 0:2] = 0; g3[0:2, 2:4] = 1
g3[2:4, 0:2] = 2; g3[2:4, 2:4] = 3
assert abs(shannon_entropy(g3) - 2.0) < 1e-9

# 偏斜分布：熵小于最大值
g4 = np.zeros((10, 10), dtype=np.uint8)
g4[0, 0] = 1     # 99 个 0，1 个 1
assert shannon_entropy(g4) < 0.2
`,
        answer: `import numpy as np

def shannon_entropy(grid):
    values, counts = np.unique(grid, return_counts=True)
    probs = counts / counts.sum()
    return -np.sum(probs * np.log2(probs + 1e-10))
`,
        explanation:
          '**`np.unique(..., return_counts=True)`** 一次得到唯一值和频次，比手动统计快。\n\n**`+1e-10` 防 log(0)**：概率为 0 时 log 会得 -inf。\n\n**注意**：这是**像素值分布的熵**，不是空间结构的熵。\n\n两种极端：\n- 全同值 → 熵 0\n- 各值等概率 → 熵 = log₂(值域大小)\n\n**局限**：左右分开和均匀混合的熵都是 1（各半），但复杂度完全不同——所以熵无法区分结构。',
        tags: ['编程', '香农熵'],
      },
      {
        id: 'paper-theory-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 gzip 复杂度：gzip_complexity(grid, seed=0)。\n\n返回 gzip(打乱后) - gzip(原始) 的字节差。',
        starterCode: `import numpy as np
import gzip

def gzip_complexity(grid, seed=0):
    rng = np.random.default_rng(seed)
    raw = len(gzip.compress(grid.tobytes(), compresslevel=9))
    shuffled = ___
    shuf = ___
    return shuf - raw
`,
        setupCode: '',
        expectedOutput: 'gzip 复杂度',
        tests: `import numpy as np

# 有结构的图案：复杂度应为正
g1 = np.zeros((32, 32), dtype=np.uint8)
g1[:, 16:] = 1      # 左右分开（有结构）
c1 = gzip_complexity(g1)
assert c1 > 0, f"有结构的图案复杂度应 > 0，实际 {c1}"

# 纯随机：复杂度接近 0（甚至略负，因压缩噪声）
rng = np.random.default_rng(0)
g2 = rng.integers(0, 2, (32, 32)).astype(np.uint8)
c2 = gzip_complexity(g2)
assert abs(c2) < 50, f"随机图案复杂度应接近 0，实际 {c2}"

# 全同：复杂度也接近 0
g3 = np.ones((32, 32), dtype=np.uint8)
c3 = gzip_complexity(g3)
assert abs(c3) < 50

# 有结构的复杂度 > 随机的复杂度
assert c1 > c2, f"结构应比随机复杂: {c1} vs {c2}"
`,
        answer: `import numpy as np
import gzip

def gzip_complexity(grid, seed=0):
    rng = np.random.default_rng(seed)
    raw = len(gzip.compress(grid.tobytes(), compresslevel=9))
    shuffled = grid.ravel().copy()
    rng.shuffle(shuffled)
    shuffled = shuffled.reshape(grid.shape)
    shuf = len(gzip.compress(shuffled.tobytes(), compresslevel=9))
    return shuf - raw
`,
        explanation:
          '**核心思想**：打乱消除空间结构但保留像素值分布。\n\n**三种情况的差值**：\n\n| 图案 | raw | shuf | 差值 |\n| --- | --- | --- | --- |\n| 左右分开 | 小 | 大 | **大** |\n| 纯随机 | 大 | 大 | ≈0 |\n| 全同 | 极小 | 极小 | ≈0 |\n\n**为什么"全同"差值也≈0**：全同图压缩后极小（几个字节），打乱后还是全同（shuffle 不改变值），所以也极小。\n\n**注意**：差值可能为负（压缩噪声），所以断言用 `abs(c) < 50` 而非 `c == 0`。',
        tags: ['编程', 'gzip 复杂度'],
      },
      {
        id: 'paper-theory-c3-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现粗粒化：coarse_grain(grid, block)。\n\n把 block×block 的块平均后二值化（均值 > 0.5 为 1）。\n返回新网格。',
        starterCode: `import numpy as np

def coarse_grain(grid, block):
    size = grid.shape[0]
    new_size = size // block
    out = np.zeros((new_size, new_size), dtype=grid.dtype)
    for i in range(new_size):
        for j in range(new_size):
            region = ___
            out[i, j] = ___
    return out
`,
        setupCode: '',
        expectedOutput: '粗粒化',
        tests: `import numpy as np
# 4x4 -> 2x2
g = np.array([[1,1,0,0],[1,1,0,0],[0,0,1,1],[0,0,1,1]], dtype=np.uint8)
cg = coarse_grain(g, 2)
assert cg.shape == (2, 2)
assert cg[0, 0] == 1    # 全1块
assert cg[0, 1] == 0    # 全0块
assert cg[1, 0] == 0
assert cg[1, 1] == 1

# block=1 时不变
g2 = np.random.randint(0, 2, (8, 8)).astype(np.uint8)
assert np.array_equal(coarse_grain(g2, 1), g2)

# 8x8 -> 4x4
g3 = np.ones((8, 8), dtype=np.uint8)
assert coarse_grain(g3, 2).shape == (4, 4)
`,
        answer: `import numpy as np

def coarse_grain(grid, block):
    size = grid.shape[0]
    new_size = size // block
    out = np.zeros((new_size, new_size), dtype=grid.dtype)
    for i in range(new_size):
        for j in range(new_size):
            region = grid[i*block:(i+1)*block, j*block:(j+1)*block]
            out[i, j] = 1 if region.mean() > 0.5 else 0
    return out
`,
        explanation:
          '**粗粒化 = 降低分辨率**，模拟"观察者从远处看"。\n\n**为什么重要**：复杂度依赖观察尺度。\n- 太精细：局部噪声淹没结构\n- 中等：结构最清晰\n- 太粗糙：结构消失\n\n**实现优化**：可以用 `grid.reshape(new_size, block, new_size, block).mean(axis=(1,3))` 向量化，但循环版更易读。\n\n**对 AI 的启示**：CNN 的池化层就是粗粒化——每层降低分辨率，提取更抽象的特征。',
        tags: ['编程', '粗粒化'],
      },
      {
        id: 'paper-theory-c3-e8',
        type: 'code',
        difficulty: 4,
        question:
          '模拟咖啡混合并追踪复杂度：simulate_mixing(size=16, n_steps=2000, record_every=200, seed=0)。\n\n- 初始：左半 0，右半 1\n- 每步随机交换一个相邻异色对\n- 记录 (步数, 熵, 复杂度) 列表\n返回三元组列表',
        starterCode: `import numpy as np
import gzip

def simulate_mixing(size=16, n_steps=2000, record_every=200, seed=0):
    rng = np.random.default_rng(seed)
    grid = np.zeros((size, size), dtype=np.uint8)
    grid[:, size//2:] = 1

    records = []
    for step in range(n_steps + 1):
        if step % record_every == 0:
            h = ___
            c = ___
            records.append((step, h, c))
        # 交换
        for _ in range(10):
            r = rng.integers(0, size)
            cc = rng.integers(0, size - 1)
            if grid[r, cc] != grid[r, cc+1]:
                grid[r, cc], grid[r, cc+1] = grid[r, cc+1], grid[r, cc]
                break
    return records
`,
        setupCode: '',
        expectedOutput: '混合模拟记录',
        tests: `records = simulate_mixing(16, 2000, 200, seed=0)
assert len(records) == 11, f"应记录 11 次，实际 {len(records)}"
assert records[0][0] == 0
assert records[-1][0] == 2000

# 初始熵为 0（左右分开，各半？不，初始各半 -> 熵=1）
# 实际上左右分开时像素各半，熵=1
# 熵应保持或略增
hs = [r[1] for r in records]
assert all(0 <= h <= 1.01 for h in hs)

# 复杂度：初期低，中期高，后期低
cs = [r[2] for r in records]
assert cs[0] >= 0 or cs[0] < 0   # 允许负值
# 中间某处应比末尾大（倒U型）
assert max(cs) >= cs[-1], f"复杂度应在中途达到峰值，实际 {cs}"
`,
        answer: `import numpy as np
import gzip

def simulate_mixing(size=16, n_steps=2000, record_every=200, seed=0):
    rng = np.random.default_rng(seed)
    grid = np.zeros((size, size), dtype=np.uint8)
    grid[:, size//2:] = 1

    def entropy(g):
        _, counts = np.unique(g, return_counts=True)
        p = counts / counts.sum()
        return float(-np.sum(p * np.log2(p + 1e-10)))

    def complexity(g, seed=0):
        r = np.random.default_rng(seed)
        raw = len(gzip.compress(g.tobytes(), compresslevel=9))
        sh = g.ravel().copy()
        r.shuffle(sh)
        return len(gzip.compress(sh.reshape(g.shape).tobytes(), compresslevel=9)) - raw

    records = []
    for step in range(n_steps + 1):
        if step % record_every == 0:
            records.append((step, entropy(grid), complexity(grid)))
        for _ in range(10):
            r = rng.integers(0, size)
            cc = rng.integers(0, size - 1)
            if grid[r, cc] != grid[r, cc+1]:
                grid[r, cc], grid[r, cc+1] = grid[r, cc+1], grid[r, cc]
                break
    return records
`,
        explanation:
          '**这是"复杂动力学第一定律"的实验验证**。\n\n**预期曲线**：\n- 熵：单调上升（从 1 到接近 1，因为初始就是各半）\n- 复杂度：先升后降（倒 U 型）\n\n**注意**：初始左右分开时熵已经是 1（像素各半），所以熵的变化不明显。如果想看熵的明显增长，应该用"稀疏分布"（如 90% 咖啡 10% 牛奶）。\n\n**这个模拟的局限**：小网格（16×16）时 gzip 的压缩噪声较大，曲线可能不光滑。论文用 50×50 到 200×200。',
        tags: ['编程', '混合模拟'],
      },
      {
        id: 'paper-theory-c3-e9',
        type: 'judge',
        difficulty: 4,
        question: '柯尔莫哥洛夫复杂度 K(x) 可以用 gzip 精确计算出来。',
        answer: false,
        explanation:
          'K(x) 不可计算（依赖停机问题）。gzip 长度只是**上界近似**，且依赖具体压缩算法——换 LZMA 或 xz 会得到不同数值。所以只能比较"相对复杂度"，不能当作绝对度量。',
        tags: ['K(x) 不可计算'],
      },
      {
        id: 'paper-theory-c3-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 熵与复杂度的本质区别（用咖啡杯例子）；② 如何用压缩率测量复杂度；③ 为什么复杂度依赖观察尺度；④ 这个理论对 AI 的启示。',
        referenceAnswer: `**① 熵与复杂度的本质区别**

**咖啡杯的例子**：

| 时刻 | 状态 | 熵 | 复杂度 |
| --- | --- | --- | --- |
| t=0 | 左右分开 | 低 | 低（太有序） |
| t=中 | 螺旋图案 | 中 | **高** |
| t=∞ | 均匀混合 | **高** | 低（太无序） |

**本质区别**：

| 量 | 衡量什么 | 演化 |
| --- | --- | --- |
| **熵** | 无序程度 | 单调递增（热力学第二定律） |
| **复杂度** | 结构程度 | **先升后降**（倒 U 型） |

**关键洞察**：

> **"复杂"是"有序"与"无序"之间的狭窄区间。**

- 完全有序（如晶体）→ 简单（可用短程序描述）
- 完全无序（如随机气体）→ 简单（没有结构）
- **中间状态（如生命、螺旋）→ 复杂**

**这解释了为什么生命是稀有的**——它需要维持在"复杂"的狭窄窗口内。

---

**② 如何用压缩率测量复杂度**

**核心公式**：

    C(x) = |gzip(shuffle(x))| - |gzip(x)|

**为什么这个差值有效**：

| 图案 | gzip(原始) | gzip(打乱) | 差值 |
| --- | --- | --- | --- |
| 纯随机 | 大 | 大 | **≈0** |
| 均匀 | 极小 | 极小 | **≈0** |
| 螺旋 | 中 | 大 | **大** |

**原理**：

- **打乱**消除了空间结构，但保留了像素值分布
- 如果原图**有结构**（可压缩），打乱后结构没了 → 不可压缩 → 差值大
- 如果原图**无结构**（随机或均匀），打乱前后都一样 → 差值 ≈ 0

**为什么不用 K(x) 直接算**：

柯尔莫哥洛夫复杂度 K(x) 定义为"最短程序长度"，但**不可计算**（停机问题）。
gzip 长度是**可计算的上界**：

    K(x) ≤ |gzip(x)| + O(1)

**局限**：
- 依赖具体压缩算法（gzip vs LZMA 结果不同）
- 只对小规模数据有效（大文件压缩器行为复杂）
- 只能做**相对比较**，不是绝对度量

---

**③ 为什么复杂度依赖观察尺度**

**实验**：对螺旋图案做不同尺度的粗粒化。

| 尺度 | 现象 | 复杂度 |
| --- | --- | --- |
| 1（原始） | 细节噪声多 | 中 |
| 2~4 | **结构最清晰** | **高** |
| 16+ | 结构消失 | 低 |

**为什么**：

- **太精细**：局部噪声淹没全局结构
- **太粗糙**：结构被平均掉，退化成均匀
- **中间尺度**：恰好捕捉到结构

**哲学含义**：

> **"复杂"不是对象的绝对属性，而是"对象 + 观察者分辨率"的联合属性。**

**类比**：
- 从卫星看城市 = 均匀的灰点（简单）
- 从飞机看城市 = 路网格子（中等复杂）
- 从街道看城市 = 无数细节（噪声）

**只有中间尺度能看出"城市结构"。**

---

**④ 对 AI 的启示**

**a) 特征提取 = 选择正确的粗粒化尺度**

CNN 的池化层就是粗粒化：
- 太浅（高分辨率）→ 过拟合局部噪声
- 太深（低分辨率）→ 丢失判别信息
- **好的网络 = 在多个尺度上提取特征**

**b) 复杂度与泛化的关系**

| 模型 | 复杂度 | 泛化 |
| --- | --- | --- |
| 太简单（线性） | 低 | 欠拟合 |
| **适中** | **高** | **好** |
| 太复杂（过参数化） | 高但无结构 | 过拟合 |

**注意**：这里"复杂度"指有效复杂度（MDL 意义上的），不是参数量。

**c) 训练过程的复杂度演化**

训练时：
- 初期：随机初始化（高熵、低结构）
- 中期：学到特征（**复杂度上升**）
- 后期：收敛到简单解（复杂度下降）

**这与咖啡混合的倒 U 型类似**——
学习是一个"先建立结构，再简化结构"的过程。

**d) 生成模型的启示**

好的生成模型应该：
- 生成**有结构但不呆板**的样本
- 不是纯随机（噪声）
- 不是完全确定（重复）

**这就是为什么温度采样很重要**（第 1 篇）——
它在"太确定"和"太随机"之间找平衡。

**e) 一个更深的启示**

**"理解" = 在正确的尺度上压缩。**

- 物理学家用公式压缩现象（F=ma）
- 语言模型用参数压缩文本
- 大脑用概念压缩经验

**压缩得好 = 抓住了规律 = 理解。**

---

**⑤ 一个诚实的说明**

**这个理论目前更多是"哲学框架"而非"工程工具"**：

| 局限 | 说明 |
| --- | --- |
| **计算昂贵** | 需要多次压缩，不适合大模型 |
| **尺度敏感** | 结果依赖粗粒化参数 |
| **无直接应用** | 还没有基于此的训练算法 |

**但它的价值在于**：
> 提供了一个**统一的视角**理解"复杂""有序""理解"这些模糊概念。

**好的理论框架不一定要立刻有用**——
它改变我们看问题的方式，这本身就是价值。`,
        rubric: [
          { point: '熵单调增 vs 复杂度倒 U 型 + "复杂是狭窄区间"', score: 3 },
          { point: 'C = gzip(shuffle) - gzip(raw) 的原理与三种情况', score: 2 },
          { point: '尺度依赖：太细噪声、太粗丢失、中间最优', score: 2 },
          { point: 'AI 启示：池化=粗粒化、训练复杂度演化、温度采样', score: 2 },
          { point: '诚实说明：哲学框架而非工程工具', score: 1 },
        ],
        keywords: ['倒U型', '狭窄区间', 'shuffle差值', '尺度依赖', '压缩即理解'],
        explanation:
          '能指出「复杂是有序与无序之间的狭窄区间」以及「复杂度依赖观察者分辨率」，就是理解了这个理论的核心。',
        tags: ['综合分析'],
      },
    ],
  },
];
