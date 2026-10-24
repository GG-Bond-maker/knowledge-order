import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 理论与复杂度
 *  07 The Coffee Automaton (Aaronson, Carroll, Ouellette 2014)
 *  27 Machine Super Intelligence (Legg & Hutter 2007)
 *
 *  来源：
 *  - arXiv:1405.6903 "Quantifying the Rise and Fall of Complexity in Closed Systems"
 *  - arXiv:0712.3329 "Universal Intelligence: A Definition of Machine Intelligence"
 *  - 参考：Ojhaharsh/30u30 第 07/27 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：纯 numpy + 标准库，走 Pyodide 浏览器内执行。
 * ============================================================ */

export const paperTheoryChapters5: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c5: Coffee Automaton
   * ============================================================ */
  {
    id: 'paper-theory-c5',
    title: '咖啡自动机：两种混合模型的对比',
    goal: '理解"相互作用"与"非相互作用"两种混合模型的本质区别，掌握复杂度测量的完整流程，理解为什么复杂度的"先升后降"依赖于模型假设。',
    lessons: [
      {
        id: 'paper-theory-c5-l1',
        title: '粒子是否相互作用，结果完全不同',
        difficulty: 5,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说出两种混合模型的规则差异（独立随机游走 vs 局部模仿）与物理类比（理想气体 vs 表面张力）；
2. 复述实验设计与测量指标（gzip 复杂度、同色相邻占比），解释「倒 U」为何依赖模型假设；
3. 用 numpy 实现两模型对照，实测纯扩散归约到无结构、交互模型保留团簇。

### 前置知识

- c3 的 gzip 复杂度与粗粒化度量；
- 香农熵；
- 基本蒙特卡洛模拟直觉。

### 问题背景

「复杂度先升后降」在 c3 还是漂亮的假设——科学的态度是把假设变成对照实验。Aaronson 等人设计两种混合模型：粒子互不理睬的纯扩散，与粒子相互模仿的交互模型，用同一把 gzip 尺子测量。结论出人意料又合乎直觉：中间结构只在相互作用模型中出现——「图案」来自粒子感知彼此。这也是方法论范本：明确假设→可计算模型→可测指标→对照实验→诚实报告。

### 直觉理解

一群人走出礼堂：如果人人闭眼乱走（非相互作用），人群从分区到均匀，中间只有「边界模糊」没有图案；如果人与人互相看齐（相互作用），走动中会自发抱团——中期出现真正的「结构」。结构不是混合的副产品，是互动的产物。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Quantifying the Rise and Fall of Complexity in Closed Systems: The Coffee Automaton |
| **作者** | Scott Aaronson, Sean M. Carroll, Lauren Ouellette |
| **发表** | arXiv 2014 |
| **arXiv** | [1405.6903](https://arxiv.org/abs/1405.6903) |
| **一句话贡献** | 用两种混合模型做实验，发现"复杂度先升后降"只在**相互作用**模型中成立 |

## 上一节的遗留问题

第 3 章讲了"复杂动力学第一定律"：复杂度先升后降。

**但这是一个假设，还是可验证的结论？**

**Aaronson 等人的贡献**：把这个问题变成**可计算的实验**。

## 两种混合模型

**关键区别**：粒子是否"感知"彼此。

### 模型 A：非相互作用（Non-interacting）

**规则**：每个粒子独立随机游走，**无视其他粒子**。

    for each particle:
        move randomly (up/down/left/right)
        # 不管邻居是什么

**物理类比**：理想气体——分子之间无碰撞。

**特点**：

| 性质 | 说明 |
| --- | --- |
| 粒子独立 | 每个粒子的轨迹与其他无关 |
| 混合速度快 | 扩散过程 |
| **熵单调增** | 标准热力学 |

### 模型 B：相互作用（Interacting）

**规则**：粒子倾向于与**同色**粒子聚集。

    for each particle:
        if 邻居是同色:
            倾向停留/靠近
        else:
            倾向移动/远离

**物理类比**：有表面张力的液体。

**特点**：

| 性质 | 说明 |
| --- | --- |
| 粒子相互影响 | 形成团簇 |
| 混合过程复杂 | 先形成结构再消散 |
| **可能产生中间结构** | 螺旋、条纹 |

<CoffeeModelCompareDemo />

## 实验设计

**初始状态**：左半咖啡（黑），右半牛奶（白）。

**测量指标**：

| 指标 | 计算方式 |
| --- | --- |
| **熵** | 像素值分布的香农熵 |
| **复杂度** | \`gzip(粗粒化后) - gzip(粗粒化后打乱)\` |
| **混合度** | 不同颜色相邻对的比例 |

**粗粒化**：把 g×g 的块平均，模拟"观察者分辨率"。

## 实验结果

### 非相互作用模型

| 时间 | 熵 | 复杂度 | 现象 |
| --- | --- | --- | --- |
| 早 | 低 | 低 | 左右分明 |
| 中 | 中 | **中** | 边界模糊 |
| 晚 | 高 | 低 | 均匀 |

**复杂度曲线**：几乎单调递减（从低到更低）。

**为什么**：粒子独立扩散，**不产生中间结构**——
只是边界越来越模糊，没有"图案"。

### 相互作用模型

| 时间 | 熵 | 复杂度 | 现象 |
| --- | --- | --- | --- |
| 早 | 低 | 低 | 左右分明 |
| 中 | 中 | **高** | **形成条纹/团簇** |
| 晚 | 高 | 低 | 均匀 |

**复杂度曲线**：**明显的倒 U 型**。

**为什么**：粒子相互吸引形成团簇，团簇再慢慢消散。
**中间阶段产生了"结构"**。

## 论文的核心结论

**"复杂动力学第一定律"依赖于模型假设**：

| 模型 | 复杂度曲线 | 是否支持"先升后降" |
| --- | --- | --- |
| 非相互作用 | 单调递减 | ❌ |
| **相互作用** | **倒 U 型** | ✅ |

**这是一个重要的科学态度**：

> **不是先有结论再找证据，而是设计实验检验假设。**

**Aaronson 的诚实**：
他在论文中明确说"我们不确定这是否就是宇宙的真相，
但这是一个可计算的模型"。

## 混合度的度量

**Aaronson 用了一个巧妙的方法**：\`row_majority_adjust\`。

**问题**：简单的"不同颜色相邻对比例"不能区分
"条纹"和"均匀混合"——两者都有很多异色边界。

**解决**：先做**行主方向调整**。

    def row_majority_adjust(thresholded):
        # 对每一行，如果某颜色占多数，把该行的"噪声"归为多数色
        for row in rows:
            if majority(row) > threshold:
                row = majority_color
        return adjusted

**效果**：
- 条纹（水平方向）：行主调整后**结构被保留** → 复杂度高
- 均匀混合：行主调整后**变得更均匀** → 复杂度低

**这就是"有方向性的结构"的检测方法。**

## 与 AI 的联系

**① 复杂度依赖于"生成机制"**

同样的"混合程度"，不同的动力学产生不同的复杂度。

**类比**：
- 随机初始化的神经网络（非相互作用）→ 训练只是调整，不产生结构
- **有归纳偏置的网络（相互作用）** → 训练中形成特征结构

**② 中间结构的价值**

**为什么"中间阶段"最复杂**：

    太有序：所有粒子一样 → 没有信息
    太无序：完全随机 → 没有结构
    中间：有团簇/边界 → 承载信息

**这与深度学习的"特征层级"类似**：
- 底层：原始像素（信息量大但无结构）
- 中层：边缘/纹理（**有结构**）
- 高层：物体（语义但抽象）

**③ 一个方法论的启示**

**Aaronson 的实验设计值得学习**：

| 步骤 | 做法 |
| --- | --- |
| 1. 明确假设 | "复杂度先升后降" |
| 2. 设计可计算模型 | 两种混合规则 |
| 3. 定义可测量指标 | gzip 复杂度 |
| 4. 对照实验 | 相互作用 vs 非相互作用 |
| 5. 诚实报告 | 结论依赖模型 |

**这是"把哲学问题变成科学实验"的范例。**

## 本节来源

> **来源类型：学术来源**
> - Aaronson, S., Carroll, S. M., Ouellette, L.
>   *Quantifying the Rise and Fall of Complexity in Closed Systems: The Coffee Automaton*
>   arXiv:[1405.6903](https://arxiv.org/abs/1405.6903)（2014）
> - Aaronson, S. *The First Law of Complexodynamics*（2011 博客，问题提出）
>   https://scottaaronson.blog/?p=762
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 07 篇（501 行，含 CoffeeAutomaton 类、两种模型、row_majority_adjust）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np, gzip
rng = np.random.default_rng(10)
def complexity(a):
    return len(gzip.compress(rng.permutation(a.ravel()).tobytes())) - len(gzip.compress(a.tobytes()))
def run(interact, steps=9000):
    g = np.zeros((12, 24), np.uint8); g[:, :12] = 1
    for _ in range(steps):
        y, x = rng.integers(0, 12), rng.integers(0, 24)
        dy, dx = rng.choice([-1, 0, 1], 2)
        ny, nx = (y+dy) % 12, (x+dx) % 24
        if (ny, nx) == (y, x): continue
        if interact and rng.random() < 0.9: g[y, x] = g[ny, nx]   # 模仿邻居=相互作用
        else: g[y, x], g[ny, nx] = g[ny, nx], g[y, x]             # 交换=独立扩散
    return g
for name, it in (("非相互作用", False), ("相互作用", True)):
    g = run(it)
    print(f"{name}: 同色相邻占比={np.mean(g[:, :-1] == g[:, 1:]):.2f}  gzip复杂度={complexity(g):+d}")
print("纯扩散→无结构(≈0.5, ≈0); 相互作用→团簇结构")\`\`\`

预期输出（实测）：实测（9000 步）：非相互作用模型同色相邻占比 0.57（趋近随机值 0.5）、gzip 复杂度 -2（≈0，无结构）；相互作用模型同色占比 0.74、复杂度 +5——粒子互不理睬时只有「越来越模糊」，中间结构需要相互作用。

**常见错误**：两模型的步数/交互强度不对齐就下结论，对照失效；交互概率设 0.5 太弱，结构被扩散淹没测不出差异；只看混合度不看结构指标——条纹与均匀混合的异色边界数可以一样多（论文的 row_majority_adjust 正为此设计）。

### 常见误区

1. **倒 U 是物理定律**——它是模型依赖的实验结论，纯扩散模型就不出现；
2. **相互作用=碰撞**——本模型里是「模仿邻居」的对齐倾向，物理类比是表面张力而非硬碰撞；
3. **复杂度测量完全客观**——粗粒化尺度等指标选择本身影响读数，必须诚实报告。

### 知识关联

- **向前**：c3 提出假设，本节完成「假设→实验」的闭环；
- **向后**：深度学习特征层级（中层最「有结构」）与训练复杂度演化的类比；
- **平行**：c1/c4 的压缩度量是全部实验的尺子。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 对照 | 非相互作用（独立游走）vs 相互作用（局部模仿） |
| 结果 | 中间结构只在相互作用模型出现 |
| 实测 | 纯扩散→占比 0.57/复杂度 -2；交互→0.74/+5 |
| 方法论 | 假设→可计算模型→可测指标→对照→诚实报告 |
| 启示 | 结构来自互动：太有序/太无序都简单 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Aaronson, Carroll & Ouellette, Quantifying the Rise and Fall of Complexity in Closed Systems: The Coffee Automaton, arXiv:1405.6903）
`,
        tips: [
          {
            kind: 'interview',
            text: '「两种混合模型的区别」：非相互作用（粒子独立随机游走）复杂度单调递减；相互作用（同色聚集）产生中间结构，复杂度倒 U 型。所以"第一定律"依赖模型假设。',
          },
          {
            kind: 'leak',
            text: '「row_majority_adjust 的作用」：简单异色边界比例无法区分"条纹"和"均匀混合"。行主调整保留水平结构、消除随机噪声，从而区分两者。',
          },
          {
            kind: 'pitfall',
            text: '复杂度的测量依赖粗粒化尺度。太精细时噪声主导，太粗糙时结构消失。论文用多个尺度（grain_size）做对比。',
          },
        ],
        demos: [
          {
            title: '两种混合模型的对比实验',
            lang: 'python',
            code: `import numpy as np
import gzip

def gzip_size(grid):
    return len(gzip.compress(grid.tobytes(), compresslevel=9))

def measure_complexity(grid, seed=0):
    """gzip(打乱) - gzip(原始)"""
    rng = np.random.default_rng(seed)
    raw = gzip_size(grid)
    sh = grid.ravel().copy()
    rng.shuffle(sh)
    return gzip_size(sh.reshape(grid.shape)) - raw

def measure_entropy(grid):
    _, counts = np.unique(grid, return_counts=True)
    p = counts / counts.sum()
    return -np.sum(p * np.log2(p + 1e-10))

def coarse_grain(grid, g):
    """粗粒化：g×g 块平均后二值化。"""
    n = grid.shape[0] // g
    out = np.zeros((n, n), dtype=np.uint8)
    for i in range(n):
        for j in range(n):
            out[i, j] = 1 if grid[i*g:(i+1)*g, j*g:(j+1)*g].mean() > 0.5 else 0
    return out


def simulate(size=32, steps=5000, mode='interacting', seed=0):
    """模拟混合过程。"""
    rng = np.random.default_rng(seed)
    grid = np.zeros((size, size), dtype=np.uint8)
    grid[:, size//2:] = 1     # 左咖啡，右牛奶

    for step in range(steps):
        # 随机选两个相邻位置
        r = rng.integers(0, size)
        c = rng.integers(0, size - 1)

        if grid[r, c] == grid[r, c+1]:
            continue

        if mode == 'non_interacting':
            # 独立随机游走：无条件交换
            grid[r, c], grid[r, c+1] = grid[r, c+1], grid[r, c]
        else:
            # 相互作用：只与同色邻居"抱团" -> 异色交换概率降低
            # 简化：以 0.7 概率交换（倾向保持现状 = 聚集）
            if rng.random() < 0.7:
                grid[r, c], grid[r, c+1] = grid[r, c+1], grid[r, c]

    return grid


print("=== 两种模型的最终状态对比 ===")
print()
print(f"{'模型':>16} | {'熵':>8} | {'复杂度':>8} | {'说明'}")
print("-" * 56)

results = {}
for mode, name in [('non_interacting', '非相互作用'), ('interacting', '相互作用')]:
    g = simulate(32, 5000, mode, seed=42)
    h = measure_entropy(g)
    c = measure_complexity(g)
    results[mode] = (h, c)
    note = "均匀混合" if h > 0.9 else "仍有结构"
    print(f"{name:>16} | {h:>8.4f} | {c:>8} | {note}")

print()
print("=== 关键观察 ===")
print()
print("两种模型最终都趋向均匀（熵接近 1），但：")
print("  · 非相互作用：过程是纯扩散，无中间结构")
print("  · 相互作用：中间会形成团簇/条纹")
print()
print("所以：")
print("  · 只看最终状态，两者无法区分")
print("  · 必须看过程（复杂度的时间演化）")
print()
print("=== 时间演化对比（采样若干时刻）===")
print()
print(f"{'步数':>8} | {'非相互作用':>12} | {'相互作用':>12}")
print("-" * 42)

for steps in [100, 500, 2000, 5000]:
    g1 = simulate(24, steps, 'non_interacting', seed=1)
    g2 = simulate(24, steps, 'interacting', seed=1)
    c1 = measure_complexity(coarse_grain(g1, 2))
    c2 = measure_complexity(coarse_grain(g2, 2))
    print(f"{steps:>8} | {c1:>12} | {c2:>12}")

print()
print("注意：小网格（24×24）时 gzip 噪声较大，")
print("论文用 50×50 ~ 200×200 得到更光滑的曲线。")`,
          },
          {
            title: 'row_majority_adjust：检测方向性结构',
            lang: 'python',
            code: `import numpy as np

def row_majority_adjust(thresholded, majority_ratio=0.7):
    """
    行主方向调整。

    对每一行，如果某颜色占比超过 majority_ratio，
    把该行的少数色"归为"多数色（消除噪声）。
    """
    out = thresholded.copy()
    n_rows = out.shape[0]

    for i in range(n_rows):
        row = out[i]
        ones = row.sum()
        zeros = len(row) - ones

        if ones / len(row) > majority_ratio:
            out[i] = 1     # 该行主要是 1 -> 全部设为 1
        elif zeros / len(row) > majority_ratio:
            out[i] = 0     # 该行主要是 0 -> 全部设为 0
        # 否则保持原样（该行是混合的）

    return out


print("=== 为什么需要 row_majority_adjust ===")
print()

# 场景 1：水平条纹（有方向性结构）
stripes = np.zeros((8, 8), dtype=np.uint8)
for i in range(0, 8, 2):
    stripes[i, :] = 1

# 场景 2：均匀随机（无结构）
rng = np.random.default_rng(42)
random_grid = rng.integers(0, 2, (8, 8)).astype(np.uint8)

print("水平条纹：")
print(stripes)
print()

print("随机噪声：")
print(random_grid)
print()

# 简单指标：异色相邻对数量
def boundary_count(g):
    """水平和垂直方向异色相邻对数量。"""
    h_diff = np.sum(g[:, :-1] != g[:, 1:])
    v_diff = np.sum(g[:-1, :] != g[1:, :])
    return h_diff + v_diff

print(f"条纹的边界数: {boundary_count(stripes)}")
print(f"随机的边界数: {boundary_count(random_grid)}")
print()
print("-> 简单边界数无法区分！两者都差不多。")
print()

# 应用 row_majority_adjust
stripes_adj = row_majority_adjust(stripes)
random_adj = row_majority_adjust(random_grid)

print("=== 应用 row_majority_adjust 后 ===")
print()
print("条纹调整后：")
print(stripes_adj)
print()
print("随机调整后：")
print(random_adj)
print()

print(f"条纹边界数: {boundary_count(stripes_adj)} (原 {boundary_count(stripes)})")
print(f"随机边界数: {boundary_count(random_adj)} (原 {boundary_count(random_grid)})")
print()
print("=== 关键洞察 ===")
print()
print("row_majority_adjust 的作用：")
print("  · 条纹：每行都是单一颜色 -> 调整后保持条纹结构")
print("  · 随机：每行约各半 -> 调整后可能变成全0或全1（噪声被抹平）")
print()
print("所以调整后：")
print("  · 条纹仍有结构（复杂度高）")
print("  · 随机变得均匀（复杂度低）")
print()
print("这就是'检测方向性结构'的技巧。")
print("论文用多方向（行/列/对角）的版本。")`,
          },
          {
            title: '多尺度复杂度分析',
            lang: 'python',
            code: `import numpy as np
import gzip

def gzip_size(g):
    return len(gzip.compress(g.tobytes(), compresslevel=9))

def complexity(g, seed=0):
    rng = np.random.default_rng(seed)
    raw = gzip_size(g)
    sh = g.ravel().copy()
    rng.shuffle(sh)
    return gzip_size(sh.reshape(g.shape)) - raw

def coarse_grain(grid, k):
    n = grid.shape[0] // k
    out = np.zeros((n, n), dtype=np.uint8)
    for i in range(n):
        for j in range(n):
            out[i, j] = 1 if grid[i*k:(i+1)*k, j*k:(j+1)*k].mean() > 0.5 else 0
    return out


# 生成"中等复杂"的图案：随机大小的方块
def make_blobs(size=48, n_blobs=20, seed=0):
    rng = np.random.default_rng(seed)
    g = np.zeros((size, size), dtype=np.uint8)
    for _ in range(n_blobs):
        r = rng.integers(0, size - 6)
        c = rng.integers(0, size - 6)
        h = rng.integers(2, 7)
        w = rng.integers(2, 7)
        g[r:r+h, c:c+w] = 1
    return g


grid = make_blobs(48, 25, seed=7)

print("=== 多尺度复杂度（随机方块图案）===")
print()
print(f"{'粗粒化':>8} | {'网格大小':>10} | {'复杂度':>10} | {'说明'}")
print("-" * 50)

for k in [1, 2, 3, 4, 6, 8, 12]:
    cg = coarse_grain(grid, k)
    if cg.shape[0] < 2:
        continue
    c = complexity(cg)
    note = ""
    if k == 1: note = "原始（噪声多）"
    elif k in (2, 3, 4): note = "结构清晰"
    elif k >= 8: note = "结构模糊"
    print(f"{k:>8} | {cg.shape[0]:>10} | {c:>10} | {note}")

print()
print("=== 关键观察 ===")
print()
print("复杂度在中等粗粒化尺度（k=2~4）最高：")
print("  · k=1：原始像素级，局部噪声掩盖全局结构")
print("  · k=2~4：方块结构最清晰")
print("  · k>=8：方块被平均掉，退化为均匀")
print()
print("这验证了第 3 章的结论：")
print("  '复杂'是对象与观察尺度的联合属性。")
print()
print("=== 对 AI 的启示 ===")
print()
print("CNN 的多层结构本质上就是多尺度分析：")
print("  · 浅层（高分辨率）：边缘、纹理")
print("  · 中层（中分辨率）：部件、图案")
print("  · 深层（低分辨率）：物体、场景")
print()
print("好的网络 = 在多个尺度上同时提取结构。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-theory-c5-e1',
        type: 'single',
        difficulty: 2,
        question: 'Coffee Automaton 论文对比了哪两种混合模型？',
        options: [
          { value: 'A', text: '快速混合 vs 慢速混合' },
          { value: 'B', text: '非相互作用（粒子独立）vs 相互作用（同色聚集）' },
          { value: 'C', text: '二维 vs 三维' },
          { value: 'D', text: '离散 vs 连续' },
        ],
        answer: 'B',
        explanation:
          '非相互作用模型中粒子独立随机游走（如理想气体），复杂度单调递减；相互作用模型中粒子倾向与同色聚集，产生中间结构，复杂度呈倒 U 型。',
        tags: ['两种模型'],
      },
      {
        id: 'paper-theory-c5-e2',
        type: 'judge',
        difficulty: 2,
        question: '论文证明了"复杂度先升后降"是封闭系统的普遍规律，与模型假设无关。',
        answer: false,
        explanation:
          '恰恰相反。论文发现这个规律**只在相互作用模型中成立**。非相互作用模型的复杂度单调递减。所以"第一定律"依赖模型假设——这是论文的重要诚实之处。',
        tags: ['结论条件'],
      },
      {
        id: 'paper-theory-c5-e3',
        type: 'multiple',
        difficulty: 3,
        question: '为什么需要 row_majority_adjust？（多选）',
        options: [
          { value: 'A', text: '简单异色边界数无法区分"条纹"和"均匀混合"' },
          { value: 'B', text: '行主调整能保留水平方向的结构' },
          { value: 'C', text: '行主调整能抹平随机噪声' },
          { value: 'D', text: '为了加快压缩速度' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——调整反而增加计算。A/B/C 是核心原因：条纹和均匀混合的边界数相近，但行主调整后条纹保留结构、随机被抹平，从而可区分。',
        tags: ['row_majority_adjust'],
      },
      {
        id: 'paper-theory-c5-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'Coffee Automaton 中，复杂度用 gzip(打乱后) - gzip(原始) 计算，其中"打乱"的作用是消除 ___ 但保留统计特性。',
        blanks: [['结构', '空间结构', 'structure']],
        explanation:
          '打乱消除空间结构（像素位置关系），但保留像素值分布。所以差值反映"结构带来的可压缩优势"——这就是复杂度的度量。',
        tags: ['复杂度测量'],
      },
      {
        id: 'paper-theory-c5-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现非相互作用混合的一步：swap_random_pair(grid, rng)。\n\n随机选一个水平相邻对，若颜色不同则交换。返回是否发生交换。',
        starterCode: `import numpy as np

def swap_random_pair(grid, rng):
    size = grid.shape[0]
    r = rng.integers(0, size)
    c = rng.integers(0, size - 1)
    if grid[r, c] == grid[r, c+1]:
        return False
    ___
    return True
`,
        setupCode: '',
        expectedOutput: '交换结果',
        tests: `import numpy as np
rng = np.random.default_rng(0)

# 全 0：不会交换
g1 = np.zeros((10, 10), dtype=np.uint8)
assert swap_random_pair(g1, rng) == False
assert np.all(g1 == 0)

# 左 0 右 1：多次调用应发生交换
g2 = np.zeros((10, 10), dtype=np.uint8)
g2[:, 5:] = 1
initial_ones = g2.sum()
for _ in range(100):
    swap_random_pair(g2, rng)
# 交换不改变总数
assert g2.sum() == initial_ones, "交换不应改变颜色总数"
# 但应该发生了混合
assert not np.array_equal(g2[:, :5], np.zeros((10,5))), "应发生混合"
`,
        answer: `import numpy as np

def swap_random_pair(grid, rng):
    size = grid.shape[0]
    r = rng.integers(0, size)
    c = rng.integers(0, size - 1)
    if grid[r, c] == grid[r, c+1]:
        return False
    grid[r, c], grid[r, c+1] = grid[r, c+1], grid[r, c]
    return True
`,
        explanation:
          '**这是非相互作用模型的核心步骤**：无条件交换相邻异色对。\n\n**关键性质**：交换**不改变颜色总数**（只是位置变化），所以熵的变化只来自空间分布。\n\n**为什么叫"非相互作用"**：交换概率与邻居颜色无关——粒子"看不见"彼此。\n\n**对比相互作用**：同色邻居会降低交换概率（倾向聚集），这才产生中间结构。',
        tags: ['编程', '非相互作用'],
      },
      {
        id: 'paper-theory-c5-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现 row_majority_adjust：row_majority_adjust(grid, ratio=0.7)。\n\n对每一行，若某颜色占比 > ratio，整行设为该颜色；否则保持原样。',
        starterCode: `import numpy as np

def row_majority_adjust(grid, ratio=0.7):
    out = grid.copy()
    for i in range(out.shape[0]):
        row = out[i]
        ones_ratio = ___
        if ones_ratio > ratio:
            ___
        elif (1 - ones_ratio) > ratio:
            ___
    return out
`,
        setupCode: '',
        expectedOutput: '行主调整',
        tests: `import numpy as np
# 全 1 的行：保持
g1 = np.ones((3, 10), dtype=np.uint8)
assert np.array_equal(row_majority_adjust(g1), g1)

# 全 0 的行：保持
g2 = np.zeros((3, 10), dtype=np.uint8)
assert np.array_equal(row_majority_adjust(g2), g2)

# 90% 是 1 的行：变成全 1
g3 = np.zeros((1, 10), dtype=np.uint8)
g3[0, :9] = 1
out3 = row_majority_adjust(g3)
assert np.all(out3 == 1), f"应变成全1，实际 {out3}"

# 50/50 的行：保持原样
g4 = np.zeros((1, 10), dtype=np.uint8)
g4[0, :5] = 1
out4 = row_majority_adjust(g4)
assert np.array_equal(out4, g4), "50/50 应保持原样"
`,
        answer: `import numpy as np

def row_majority_adjust(grid, ratio=0.7):
    out = grid.copy()
    for i in range(out.shape[0]):
        row = out[i]
        ones_ratio = row.sum() / len(row)
        if ones_ratio > ratio:
            out[i] = 1
        elif (1 - ones_ratio) > ratio:
            out[i] = 0
    return out
`,
        explanation:
          '**目的**：检测"方向性结构"。\n\n**效果对比**：\n\n| 图案 | 调整前 | 调整后 |\n| --- | --- | --- |\n| 水平条纹 | 每行单一色 | **保持条纹** |\n| 随机噪声 | 每行约各半 | 部分行被抹平 |\n\n**为什么 ratio=0.7**：太严格（0.9）会漏掉弱结构，太宽松（0.5）会把混合行也归为单色。\n\n**论文的完整版**：对行、列、对角线都做调整，取最大复杂度。',
        tags: ['编程', '行主调整'],
      },
      {
        id: 'paper-theory-c5-e7',
        type: 'code',
        difficulty: 3,
        question:
          '模拟相互作用混合：simulate_interacting(grid, n_steps, rng, stickiness=0.7)。\n\n每次随机选相邻对，若异色则以 (1-stickiness) 的概率交换（stickiness 越大越倾向不交换=聚集）。',
        starterCode: `import numpy as np

def simulate_interacting(grid, n_steps, rng, stickiness=0.7):
    size = grid.shape[0]
    for _ in range(n_steps):
        r = rng.integers(0, size)
        c = rng.integers(0, size - 1)
        if grid[r, c] == grid[r, c+1]:
            continue
        if rng.random() < (1 - stickiness):
            ___
    return grid
`,
        setupCode: '',
        expectedOutput: '相互作用模拟',
        tests: `import numpy as np
rng = np.random.default_rng(42)
g = np.zeros((16, 16), dtype=np.uint8)
g[:, 8:] = 1
initial = g.sum()

out = simulate_interacting(g.copy(), 2000, rng, stickiness=0.9)
assert out.sum() == initial, "交换不改变颜色总数"
# 高 stickiness 时混合较慢
assert out.shape == (16, 16)

# 低 stickiness 混合更快
rng2 = np.random.default_rng(42)
g2 = np.zeros((16, 16), dtype=np.uint8)
g2[:, 8:] = 1
out2 = simulate_interacting(g2, 2000, rng2, stickiness=0.1)

def mixed_ratio(grid):
    """不同颜色相邻对的比例。"""
    h = np.sum(grid[:, :-1] != grid[:, 1:])
    v = np.sum(grid[:-1, :] != grid[1:, :])
    total = grid.shape[0]*(grid.shape[1]-1) + (grid.shape[0]-1)*grid.shape[1]
    return (h + v) / total

assert mixed_ratio(out2) > mixed_ratio(out), "低 stickiness 应混合更快"
`,
        answer: `import numpy as np

def simulate_interacting(grid, n_steps, rng, stickiness=0.7):
    size = grid.shape[0]
    for _ in range(n_steps):
        r = rng.integers(0, size)
        c = rng.integers(0, size - 1)
        if grid[r, c] == grid[r, c+1]:
            continue
        if rng.random() < (1 - stickiness):
            grid[r, c], grid[r, c+1] = grid[r, c+1], grid[r, c]
    return grid
`,
        explanation:
          '**`stickiness` 是"粘性"参数**：\n- stickiness=0：完全随机交换（等价非相互作用）\n- stickiness=0.7：70% 概率不交换（倾向保持现状 = 聚集）\n- stickiness=1：完全不交换（永远不混合）\n\n**为什么这产生中间结构**：\n同色区域一旦形成，内部交换概率低 → 团簇稳定存在 → 产生结构。\n\n**论文的更精细版本**：交换概率依赖于"周围同色邻居数"（真正的局部相互作用）。',
        tags: ['编程', '相互作用'],
      },
      {
        id: 'paper-theory-c5-e8',
        type: 'code',
        difficulty: 4,
        question:
          '对比两种模型的复杂度演化：compare_models(size=16, n_steps=2000, checkpoints=None, seed=0)。\n\n返回 dict：{"non_interacting": [(step, complexity), ...], "interacting": [...]}\n\n用 coarse_grain(k=2) 后测复杂度。',
        starterCode: `import numpy as np
import gzip

def compare_models(size=16, n_steps=2000, checkpoints=None, seed=0):
    if checkpoints is None:
        checkpoints = [0, 500, 1000, 1500, 2000]

    def complexity(g):
        rng = np.random.default_rng(seed)
        raw = len(gzip.compress(g.tobytes(), compresslevel=9))
        sh = g.ravel().copy()
        rng.shuffle(sh)
        return len(gzip.compress(sh.reshape(g.shape).tobytes(), compresslevel=9)) - raw

    def coarse(g, k=2):
        n = g.shape[0] // k
        out = np.zeros((n, n), dtype=np.uint8)
        for i in range(n):
            for j in range(n):
                out[i, j] = 1 if g[i*k:(i+1)*k, j*k:(j+1)*k].mean() > 0.5 else 0
        return out

    result = {"non_interacting": [], "interacting": []}

    for mode in ["non_interacting", "interacting"]:
        rng = np.random.default_rng(seed)
        grid = np.zeros((size, size), dtype=np.uint8)
        grid[:, size//2:] = 1

        for step in range(n_steps + 1):
            if step in checkpoints:
                result[mode].append((step, complexity(coarse(grid))))
            # 执行一步
            r = rng.integers(0, size)
            c = rng.integers(0, size - 1)
            if grid[r, c] != grid[r, c+1]:
                if mode == "non_interacting":
                    ___
                else:
                    if rng.random() < 0.3:
                        ___
    return result
`,
        setupCode: '',
        expectedOutput: '两模型对比',
        tests: `r = compare_models(16, 1000, [0, 500, 1000], seed=1)
assert "non_interacting" in r and "interacting" in r
assert len(r["non_interacting"]) == 3
assert len(r["interacting"]) == 3
# 初始状态复杂度应较高（左右分明有结构）
assert r["non_interacting"][0][0] == 0
# 最终状态复杂度应较低（接近均匀）
assert r["non_interacting"][-1][1] < r["non_interacting"][0][1] + 50
`,
        answer: `import numpy as np
import gzip

def compare_models(size=16, n_steps=2000, checkpoints=None, seed=0):
    if checkpoints is None:
        checkpoints = [0, 500, 1000, 1500, 2000]

    def complexity(g):
        rng = np.random.default_rng(seed)
        raw = len(gzip.compress(g.tobytes(), compresslevel=9))
        sh = g.ravel().copy()
        rng.shuffle(sh)
        return len(gzip.compress(sh.reshape(g.shape).tobytes(), compresslevel=9)) - raw

    def coarse(g, k=2):
        n = g.shape[0] // k
        out = np.zeros((n, n), dtype=np.uint8)
        for i in range(n):
            for j in range(n):
                out[i, j] = 1 if g[i*k:(i+1)*k, j*k:(j+1)*k].mean() > 0.5 else 0
        return out

    result = {"non_interacting": [], "interacting": []}

    for mode in ["non_interacting", "interacting"]:
        rng = np.random.default_rng(seed)
        grid = np.zeros((size, size), dtype=np.uint8)
        grid[:, size//2:] = 1

        for step in range(n_steps + 1):
            if step in checkpoints:
                result[mode].append((step, complexity(coarse(grid))))
            r = rng.integers(0, size)
            c = rng.integers(0, size - 1)
            if grid[r, c] != grid[r, c+1]:
                if mode == "non_interacting":
                    grid[r, c], grid[r, c+1] = grid[r, c+1], grid[r, c]
                else:
                    if rng.random() < 0.3:
                        grid[r, c], grid[r, c+1] = grid[r, c+1], grid[r, c]
    return result
`,
        explanation:
          '**这个对比实验就是论文的核心**。\n\n**预期结果**：\n- 非相互作用：复杂度从初值单调下降到接近 0\n- 相互作用：复杂度可能在中途出现峰值（倒 U 型）\n\n**小网格的局限**：16×16 时 gzip 噪声大，倒 U 型可能不明显。论文用 50~200 的网格。\n\n**关键洞察**：\n同样的"混合任务"，不同的动力学产生不同的复杂度演化。\n所以"复杂度先升后降"不是普遍规律，而是**特定模型的产物**。',
        tags: ['编程', '模型对比'],
      },
      {
        id: 'paper-theory-c5-e9',
        type: 'judge',
        difficulty: 4,
        question: 'Coffee Automaton 论文的主要贡献是证明了宇宙的复杂度必然先升后降。',
        answer: false,
        explanation:
          '论文只是在一个**简化模型**中验证了这个规律，并明确指出它依赖模型假设（相互作用）。Aaronson 本人在文中表示不确定这是否反映真实宇宙。这是诚实科学态度的典范。',
        tags: ['科学态度'],
      },
      {
        id: 'paper-theory-c5-e10',
        type: 'open',
        difficulty: 5,
        question:
          '请分析：① 两种混合模型的机制差异；② 为什么只有相互作用模型产生倒 U 型；③ row_majority_adjust 为什么必要；④ 这个研究的科学方法论价值。',
        referenceAnswer: `**① 两种混合模型的机制差异**

**非相互作用模型**：

    每个粒子独立随机游走
    交换概率与邻居颜色无关
    物理类比：理想气体

**相互作用模型**：

    粒子倾向与同色邻居聚集
    交换概率依赖局部环境
    物理类比：有表面张力的液体

**关键区别**：

| 维度 | 非相互作用 | 相互作用 |
| --- | --- | --- |
| 粒子感知 | 无 | 有 |
| 动力学 | 纯扩散 | 扩散 + 聚集 |
| 中间结构 | **不产生** | **产生团簇/条纹** |
| 熵 | 单调增 | 单调增 |
| 复杂度 | 单调减 | **倒 U 型** |

---

**② 为什么只有相互作用模型产生倒 U 型**

**非相互作用的过程**：

    t=0:  左右分明（结构简单）
    t=中: 边界模糊（没有"图案"，只是渐变）
    t=∞:  均匀（无结构）

**为什么没有中间峰值**：
粒子独立扩散，边界只是越来越模糊。
**"模糊的边界"不是"结构"**——它只是两个均匀区域的过渡带。

**相互作用的过程**：

    t=0:  左右分明
    t=中: 形成团簇、条纹、螺旋 ← 关键！
    t=∞:  均匀

**为什么产生峰值**：
- 粒子聚集 → 形成**有明确边界的团簇**
- 团簇之间又有边界 → **多层次结构**
- 这种"结构中的结构"正是高复杂度的来源

**类比**：
- 非相互作用：把两种颜色的沙子倒在一起摇晃 → 均匀混合
- 相互作用：把油和水倒在一起 → 形成**乳滴**（中间态有结构）

---

**③ row_majority_adjust 为什么必要**

**问题**：简单的"异色边界数"无法区分结构。

**具体例子**：

    水平条纹：
      11111111
      00000000
      11111111
      00000000
      边界数：3 条水平边界

    均匀随机：
      10110010
      01101001
      11010010
      01001011
      边界数：约 40% 的相邻对

**问题**：随机图案的边界数**更多**！所以"边界多 = 复杂"是错的。

**row_majority_adjust 的作用**：

    对每一行：
      如果某色占多数（>70%），整行设为该色

**效果**：

| 图案 | 调整前 | 调整后 |
| --- | --- | --- |
| 条纹 | 每行单一色 | **保持条纹**（结构不变） |
| 随机 | 每行约各半 | **部分行被抹平**（结构消失） |

**所以调整后**：
- 条纹仍有结构 → 复杂度高
- 随机变均匀 → 复杂度低

**这就是"检测方向性结构"的关键技巧。**

论文的完整版对行、列、对角线都做调整，取最大复杂度。

---

**④ 科学方法论价值**

**这个研究的最大贡献不是结论，而是方法。**

**五个值得学习的步骤**：

**a) 把哲学问题变成可计算模型**

    模糊问题："复杂度会先升后降吗？"
      ↓
    可计算问题："在二维格子模型中，gzip 复杂度如何演化？"

**b) 设计对照实验**

    不是只做一个模型就下结论
    而是做两个模型对比（相互作用 vs 非相互作用）

**c) 定义可测量指标**

    gzip(打乱) - gzip(原始)
    这是可计算的、可复现的

**d) 诚实报告条件依赖**

    论文明确说："我们的结论依赖模型假设"
    没有声称这是宇宙的普遍规律

**e) 开源代码**

    代码公开，任何人都能复现
    （30u30 项目就是基于这些代码）

**对比"不诚实的做法"**：

| 不诚实 | 诚实（本论文） |
| --- | --- |
| 只报告支持假设的结果 | 报告两种模型的差异 |
| 声称"证明了普遍规律" | 说"在这个模型中成立" |
| 隐藏模型选择的任意性 | 明确讨论模型假设 |

**Aaronson 的原话**（大意）：

> 我们不知道这是否就是真实宇宙的规律，
> 但这是一个**可以计算**的模型，
> 而且它给出了有趣的结果。

**这才是科学的态度**：把不确定的东西变成可检验的，
然后诚实地报告检验结果。

---

**⑤ 对 AI 的启示**

**a) 复杂度依赖"生成机制"**

同样的"混合程度"，不同动力学产生不同复杂度。

**类比神经网络**：
- 随机初始化 → 无结构
- 训练中 → **形成特征结构**（类似相互作用产生团簇）
- 收敛后 → 结构简化（类似均匀）

**b) 中间层最"复杂"**

    输入层：原始像素（信息量大但无结构）
    中间层：边缘/纹理/部件（**有结构**）
    输出层：类别（语义但抽象）

**这与倒 U 型一致**——中间表示承载最多结构信息。

**c) 多尺度分析的必要性**

复杂度依赖观察尺度。
CNN 的多层池化正是多尺度分析。

**好的表示 = 在正确的尺度上捕捉结构。**`,
        rubric: [
          { point: '两模型机制差异：粒子是否感知彼此、是否产生中间结构', score: 3 },
          { point: '非相互作用无峰值（只是边界模糊）vs 相互作用产生团簇', score: 2 },
          { point: 'row_majority_adjust：随机边界数反而更多，需检测方向性', score: 2 },
          { point: '方法论五步：可计算模型、对照实验、可测指标、诚实报告、开源', score: 2 },
          { point: 'AI 启示：训练中形成结构、中间层最复杂、多尺度', score: 1 },
        ],
        keywords: ['粒子感知', '边界模糊非结构', '方向性检测', '对照实验', '诚实报告'],
        explanation:
          '能指出「随机图案的边界数反而更多，所以需要 row_majority_adjust 检测方向性」以及「本论文最大的贡献是方法论而非结论」，就是真正理解了这篇论文。',
        tags: ['综合分析'],
      },
    ],
  },

  /* ============================================================
   *  c6: Machine Super Intelligence
   * ============================================================ */
  {
    id: 'paper-theory-c6',
    title: '机器超级智能：如何度量智能',
    goal: '理解 Legg & Hutter 的通用智能定义 U(pi)，掌握"复杂度加权"的奥卡姆先验，理解为什么这个度量理论优美但不可计算。',
    lessons: [
      {
        id: 'paper-theory-c6-l1',
        title: '智能 = 在广泛环境中达成目标的能力',
        difficulty: 5,
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出 U(π)=Σ 2^-K(μ) V_μ(π) 并解释三项含义（环境集、Solomonoff 权重、期望回报）；
2. 说明三个设计动机（所有环境而非特定任务、回报而非对错、K 而非人为难度），以及 AIXI=argmax U 的「北极星」地位；
3. 用 numpy 在 4 个环境上计算 3 种智能体的 U，验证通用性在加权总分上胜出。

### 前置知识

- c4 的 K(x) 与 2^-K 先验；
- 强化学习的回报概念；
- 归一化加权平均。

### 问题背景

「这个 AI 聪明吗」——IQ 测试、图灵测试、单项榜单都答不好：要么只测人类相关能力，要么主观，要么过拟合单一任务。Legg & Hutter 2007 给出第一个数学上严格的通用智能定义：U(π)=Σ 2^-K(μ)·V_μ(π)——在所有可能环境中的加权平均回报，环境越简单权重越大（Solomonoff 先验）。它让 AGI 从口号变成数学对象，直接催生 AIXI，也塑造了今天基准设计的「广覆盖」精神（ARC、GAIA）。

### 直觉理解

评价运动员不该只看举重，而是看「所有体育项目上的加权总分」：越基础的项目权重越大。专才在一个项目满分、其余 0 分；通才每项都不差——按总分通才赢。且「项目清单」不是人造的，是按环境复杂度自动加权的所有可能世界。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Universal Intelligence: A Definition of Machine Intelligence |
| **作者** | Shane Legg, Marcus Hutter |
| **发表** | Minds and Machines, 2007 |
| **arXiv** | [0712.3329](https://arxiv.org/abs/0712.3329) |
| **一句话贡献** | 给出智能的数学定义：在所有可能环境中的加权平均表现，权重为 2^(-K(环境)) |

## 问题：如何定义"智能"

**常见定义的问题**：

| 定义 | 问题 |
| --- | --- |
| **IQ 测试** | 只测人类相关的能力，不通用 |
| **图灵测试** | 依赖人类判断，主观 |
| **特定任务表现** | 只能测窄领域（下棋、翻译） |
| **"像人一样思考"** | 循环定义，且人类不一定最优 |

**Legg & Hutter 的目标**：

> 给出一个**数学上严格**、**通用**、**可比较**的智能定义。

## 核心定义

**智能 U(pi)**：

    U(pi) = Sum_mu  2^(-K(mu)) * V_mu(pi)

**三项的含义**：

| 符号 | 含义 |
| --- | --- |
| **mu** | 一个环境（任务） |
| **K(mu)** | 环境的柯尔莫哥洛夫复杂度（简单环境复杂度低） |
| **V_mu(pi)** | 策略 pi 在环境 mu 中的表现（期望回报） |
| **2^(-K(mu))** | 权重：越简单的环境权重越大 |

**直觉**：

> **智能 = 在"简单到复杂"的各种任务上的加权平均表现。**
> 简单的任务权重大（更基础），复杂的任务权重小。

<UniversalIntelligenceDemo />

## 为什么权重是 2^(-K)

**这是奥卡姆剃刀的数学形式**：

    P(mu) = 2^(-K(mu))

**性质**：

| K(mu) | 权重 | 含义 |
| --- | --- | --- |
| 小（简单） | 大 | 常见环境，权重大 |
| 大（复杂） | 小 | 罕见环境，权重小 |

**为什么这合理**：

- 简单环境（如"总是给奖励"）应该被重视
- 复杂环境（如"随机奖励"）价值低
- 权重之和有限（Sum 2^(-K) <= 1）

**这就是 Solomonoff 先验**（第 4 篇提过）。

## 三个关键设计

### ① 用"所有环境"而非"特定任务"

**问题**：如果只测下棋，那"下棋 AI"看起来最智能。

**解决**：遍历**所有可能的环境**（按复杂度加权）。

**这意味着**：

    一个真正智能的系统，应该在任何任务上都不差。

**这与"通用人工智能（AGI）"的理念一致。**

### ② 用"表现"而非"能力"

**V_mu(pi)** 是在环境中获得的**期望回报**。

**为什么用回报而非"正确率"**：
- 回报可以表达"多好"
- 正确率只能表达"对/错"

**这允许部分正确的行为获得部分分数。**

### ③ 用 K(mu) 而非人为设定的难度

**问题**：人为设定难度是主观的。

**解决**：用环境的**内在复杂度**（K(mu)）。

**但 K(mu) 不可计算**（第 4 篇讲过）——
所以这个定义**理论上优美，实践中不可计算**。

## 与 AIXI 的关系

**AIXI**（Hutter 2005）是**理论最优的智能体**：

    AIXI = argmax_pi U(pi)

**AIXI 的做法**：

    1. 维护所有可能环境的概率分布（按 2^(-K) 加权）
    2. 在每个时间步，选择能使期望未来回报最大的动作

**AIXI 的性质**：

| 性质 | 说明 |
| --- | --- |
| **理论最优** | 在所有环境中，AIXI 的累积回报接近最优 |
| **不可计算** | 需要枚举所有程序，不可实现 |
| **不可近似** | 甚至不能用有限资源逼近 |

**所以 AIXI 是"北极星"而非"实现方案"**——
它告诉我们"最优智能是什么样"，但不告诉我们"怎么实现"。

## 实践中的近似

**既然 U(pi) 不可计算，实际怎么评估智能？**

### 有限环境集

用 N 个代表性任务（而非所有可能环境）：

    U_approx = Sum w_i * V_i(pi)

**问题**：任务选择是主观的（回到了起点）。

### 标准基准

| 基准 | 覆盖 |
| --- | --- |
| **GLUE / SuperGLUE** | 语言理解 |
| **MMLU** | 多学科知识 |
| **HumanEval** | 代码生成 |
| **ARC** | 抽象推理 |
| **GAIA** | 通用助手任务 |

**这些是"有限环境集"的实例化。**

<BenchmarkLimitationsDemo />

## 这个定义的局限

| 局限 | 说明 |
| --- | --- |
| **不可计算** | K(mu) 和"所有环境"都不可枚举 |
| **环境空间未定义** | "所有可能环境"需要严格定义（论文用交互式图灵机） |
| **回报函数主观** | 什么算"好"仍需要人定义 |
| **不考虑效率** | 理论上最优但可能要算到宇宙末日 |
| **不考虑意识/理解** | 只测行为，不测内在 |

**论文的诚实**：
Legg & Hutter 明确说这是一个**理论定义**，
不是"可以直接用的评估工具"。

## 对 AI 发展的影响

**① 提供了"通用智能"的严格框架**

在此之前，"AGI"是个模糊概念。
这篇论文让它变成可讨论的数学对象。

**② 启发了 AI 安全研究**

如果智能是"在所有环境中的表现"，
那么"超级智能"意味着"在任何任务上都很强"——
**包括可能有害的任务**。

**这直接启发了 AI 对齐研究**。

**③ 影响了基准设计**

现代基准（如 ARC、GAIA）都在追求"广泛覆盖"——
这正是 U(pi) 精神的实践。

**④ 一个反直觉的推论**

按这个定义，专门的系统智能很低：

    下棋 AI：围棋上 V=1，其他环境 V=0
    U(下棋AI) 约等于 2^(-K(围棋))，很小

而通用系统智能高：能处理多种任务的系统，加权平均更高。

**这就是为什么"通用性"是智能的核心。**

## 本节来源

> **来源类型：学术来源**
> - Legg & Hutter, *Universal Intelligence: A Definition of Machine Intelligence*（2007）
>   arXiv:[0712.3329](https://arxiv.org/abs/0712.3329)
> - Hutter, *Universal Artificial Intelligence*（Springer 2005，AIXI 完整理论）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 27 篇（371 行）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
envs = [("总给奖励", 1), ("交替奖励", 3), ("棋盘世界", 8), ("复杂物理", 12)]
raw = {name: 2.0**(-K) for name, K in envs}
tot = sum(raw.values())
w = {k: v / tot for k, v in raw.items()}          # 归一化的 2^-K 权重
agents = {
  "专用棋手  ": {"总给奖励": 0.1, "交替奖励": 0.1, "棋盘世界": 0.95, "复杂物理": 0.0},
  "反射机器人": {"总给奖励": 0.9, "交替奖励": 0.2, "棋盘世界": 0.05, "复杂物理": 0.0},
  "通用学习者": {"总给奖励": 0.9, "交替奖励": 0.7, "棋盘世界": 0.6, "复杂物理": 0.3},
}
print("环境权重: " + "  ".join(f"{e}={w[e]:.3f}" for e, _ in envs))
for name, V in agents.items():
    U = sum(w[e] * V[e] for e in V)
    print(f"{name}: U = {U:.4f}")
print("通用性胜出: 简单环境权重高, 但 breadth 决定总和")\`\`\`

预期输出（实测）：实测：归一化环境权重 总给奖励=0.795、交替奖励=0.199、棋盘世界=0.006、复杂物理=0.0004；U(专用棋手)=0.1052（只在棋盘世界 0.95）、U(反射机器人)=0.7553（吃定简单环境）、U(通用学习者)=0.8582（每项都不差）——广度战胜单项专精。

**常见错误**：忘归一化 2^-K 权重就计算 U，量纲混乱无法比较；把 AIXI 当实现方案——它不可计算也不可有限近似，只是理论参照系；用单一任务分数外推通用智能，正是定义要治的病。

### 常见误区

1. **智能=某榜单第一**——U 的精神是「任何任务都不差」，单项冠军的智能值可以很低；
2. **这个定义可直接实测**——K(μ) 不可计算、环境空间不可枚举，实践中用有限基准近似其精神；
3. **回报函数客观**——定义只解决「如何聚合」，「什么算好」仍需人定义。

### 知识关联

- **向前**：c4 的 K(μ) 与 Solomonoff 先验是权重的来源，c1 MDL 同属「简单者优先」哲学；
- **向后**：AIXI 理论、AI 安全（超级智能=任何任务都强，包括有害任务）、ARC/GAIA 广覆盖基准；
- **平行**：paper-theory 全课的「压缩/简单性」主线在此收束。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 定义 | U(π)=Σ 2^-K(μ)·V_μ(π)：所有环境的加权回报 |
| 权重 | 2^-K=Solomonoff/奥卡姆先验，简单环境权重大 |
| 实测 | 通用 0.858 > 反射 0.755 > 专用 0.105 |
| AIXI | argmax U：理论北极星，不可计算 |
| 影响 | AGI 数学化、AI 安全、广覆盖基准 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Legg & Hutter, Universal Intelligence: A Definition of Machine Intelligence, arXiv:0712.3329）
`,
        tips: [
          {
            kind: 'interview',
            text: '「Legg-Hutter 智能定义」：U(pi) = Sum_mu 2^(-K(μ))·V_μ(π)。在所有环境中的加权平均表现，权重是环境的复杂度（越简单权重越大）。',
          },
          {
            kind: 'leak',
            text: '「为什么 2^(-K) 是奥卡姆剃刀」：简单环境 K 小 → 权重大；复杂环境 K 大 → 权重小。这就是 Solomonoff 先验，权重之和 ≤ 1。',
          },
          {
            kind: 'pitfall',
            text: '这个定义理论上优美但**不可计算**（K(μ) 不可计算，且需枚举所有环境）。所以 AIXI 是"北极星"而非实现方案。',
          },
        ],
        demos: [
          {
            title: '通用智能度量实现',
            lang: 'python',
            code: `import numpy as np

class Environment:
    """环境基类。"""
    def __init__(self, name, complexity, optimal_return=1.0):
        self.name = name
        self.complexity = complexity
        self.optimal_return = optimal_return

    def reset(self):
        raise NotImplementedError

    def step(self, action):
        raise NotImplementedError


class ConstantRewardEnv(Environment):
    """总是给固定奖励的环境（最简单）。"""
    def __init__(self):
        super().__init__("constant_reward", complexity=2)

    def reset(self):
        return 0

    def step(self, action):
        return 1, 1.0, True


class SequenceEnv(Environment):
    """需要记住序列的环境（较复杂）。"""
    def __init__(self, pattern=(0, 1, 2)):
        super().__init__("sequence", complexity=8)
        self.pattern = pattern
        self.pos = 0

    def reset(self):
        self.pos = 0
        return 0

    def step(self, action):
        correct = self.pattern[self.pos % len(self.pattern)]
        reward = 1.0 if action == correct else 0.0
        self.pos += 1
        done = self.pos >= len(self.pattern)
        return self.pos, reward, done


class GridWorldEnv(Environment):
    """网格寻路（更复杂）。"""
    def __init__(self, size=3):
        super().__init__("gridworld", complexity=20)
        self.size = size
        self.pos = (0, 0)
        self.target = (size-1, size-1)

    def reset(self):
        self.pos = (0, 0)
        return self.pos

    def step(self, action):
        r, c = self.pos
        if action == 0: c = max(0, c-1)
        elif action == 1: c = min(self.size-1, c+1)
        elif action == 2: r = max(0, r-1)
        elif action == 3: r = min(self.size-1, r+1)
        self.pos = (r, c)
        done = self.pos == self.target
        reward = 1.0 if done else -0.01
        return self.pos, reward, done


class Agent:
    """简单智能体基类。"""
    def act(self, obs):
        raise NotImplementedError
    def observe(self, obs, reward, done):
        pass


class RandomAgent(Agent):
    def __init__(self, seed=0):
        self.rng = np.random.default_rng(seed)
    def act(self, obs):
        return int(self.rng.integers(0, 4))


class SequenceAgent(Agent):
    """会数数的智能体。"""
    def __init__(self):
        self.count = 0
    def act(self, obs):
        a = self.count % 3
        self.count += 1
        return a
    def observe(self, obs, reward, done):
        if done:
            self.count = 0


def universal_intelligence(agent, environments, episodes=5):
    """
    U(pi) = Sum_mu 2^(-K(μ)) · V_μ(π)

    注意：这里用有限环境集近似"所有环境"。
    """
    total = 0.0
    total_weight = 0.0
    details = []

    for env in environments:
        # 奥卡姆先验：2^(-K)
        weight = 2.0 ** (-env.complexity)

        # 评估表现
        returns = []
        for _ in range(episodes):
            obs = env.reset()
            agent.count = 0 if hasattr(agent, 'count') else None
            done = False
            total_r = 0.0
            steps = 0
            while not done and steps < 100:
                action = agent.act(obs)
                obs, reward, done = env.step(action)
                agent.observe(obs, reward, done)
                total_r += reward
                steps += 1
            returns.append(total_r)

        v = np.mean(returns)
        contribution = weight * v
        total += contribution
        total_weight += weight
        details.append({
            "env": env.name,
            "K": env.complexity,
            "weight": weight,
            "return": v,
            "contribution": contribution,
        })

    return {
        "upsilon": total,
        "normalized": total / total_weight if total_weight > 0 else 0,
        "details": details,
    }


print("=== 通用智能度量 ===")
print()

envs = [ConstantRewardEnv(), SequenceEnv(), GridWorldEnv(3)]

print(f"环境集: {[e.name for e in envs]}")
print(f"复杂度: {[e.complexity for e in envs]}")
print()

for agent_name, agent in [("随机智能体", RandomAgent()), ("序列智能体", SequenceAgent())]:
    result = universal_intelligence(agent, envs, episodes=3)
    print(f"--- {agent_name} ---")
    print(f"{'环境':>16} | {'K':>3} | {'权重':>8} | {'回报':>7} | {'贡献':>9}")
    print("-" * 56)
    for d in result["details"]:
        print(f"{d['env']:>16} | {d['K']:>3} | {d['weight']:>8.6f} | {d['return']:>7.3f} | {d['contribution']:>9.6f}")
    print(f"{'U(pi)':>16} | {'':>3} | {'':>8} | {'':>7} | {result['upsilon']:>9.6f}")
    print(f"{'归一化':>16} | {'':>3} | {'':>8} | {'':>7} | {result['normalized']:>9.4f}")
    print()

print("=== 关键观察 ===")
print()
print("1. 简单环境（K=2）权重 0.25，复杂环境（K=20）权重 1e-6")
print("   -> 智能主要由'简单但基础'的能力决定")
print()
print("2. 随机智能体在 constant_reward 上也能得 1.0（因为总是给奖励）")
print("   但在 sequence 和 gridworld 上表现差")
print()
print("3. 序列智能体在 sequence 上好，但 gridworld 仍随机")
print("   -> 没有'全才'，U 反映综合能力")`,
          },
          {
            title: '权重与智能：2^(-K) 的直观',
            lang: 'python',
            code: `import numpy as np

print("=== 奥卡姆先验 2^(-K) 的分布 ===")
print()
print(f"{'K':>4} | {'权重 2^-K':>12} | {'占比':>8} | {'说明'}")
print("-" * 50)

total_weight = sum(2.0**(-k) for k in range(1, 21))
for k in range(1, 13):
    w = 2.0 ** (-k)
    pct = w / total_weight * 100
    note = ""
    if k <= 3: note = "极简环境"
    elif k <= 8: note = "简单环境"
    elif k <= 15: note = "中等复杂"
    else: note = "复杂环境"
    print(f"{k:>4} | {w:>12.6f} | {pct:>7.2f}% | {note}")

print()
print(f"K=1..20 的权重总和: {sum(2.0**(-k) for k in range(1, 21)):.6f}")
print("（理论上 K 到无穷大时总和 = 1）")
print()
print("=== 关键洞察 ===")
print()
print("权重衰减极快：")
print("  K=1 权重 0.5，K=10 权重 0.001（差 500 倍）")
print("  K=20 权重 1e-6")
print()
print("所以 U(pi) 主要由'简单环境的表现'决定。")
print()
print("这意味着：")
print("  · 在基础任务上做不好，智能分数会很低")
print("  · 在极难任务上很强，但对总分贡献很小")
print()
print("=== 与人类智能的类比 ===")
print()
analogy = [
    ("K=2: 识别物体", "几乎所有正常人都会", "权重高"),
    ("K=5: 简单算术", "大多人会", "权重中"),
    ("K=10: 下棋", "少数人强", "权重低"),
    ("K=20: 证明新定理", "极少数人", "权重极低"),
]
for env, human, weight in analogy:
    print(f"  {env:20} | {human:12} | {weight}")

print()
print("所以按这个定义：")
print("  · '通用能力'比'专精'更重要")
print("  · 一个在基础任务上稳定表现的 AI，U 会高于'只会下棋'的 AI")
print()
print("=== 一个反直觉的计算 ===")
print()

def upsilon(scores, complexities):
    """scores: 各环境表现；complexities: 对应复杂度。"""
    return sum(2.0**(-k) * v for k, v in zip(complexities, scores))

# 专家系统：只在一个任务上强
specialist = upsilon([1.0, 0.0, 0.0, 0.0], [2, 5, 10, 20])
# 通才：各任务都还行
generalist = upsilon([0.8, 0.8, 0.6, 0.3], [2, 5, 10, 20])

print(f"专才（只在一个任务满分）: U = {specialist:.4f}")
print(f"通才（各任务中等）:       U = {generalist:.4f}")
print()
print(f"通才比专才高 {(generalist/specialist - 1)*100:.0f}%")
print()
print("这就是为什么'通用人工智能'比'专用AI'更受重视——")
print("按这个定义，通用性本身就是智能的核心。")`,
          },
          {
            title: '基准测试的局限',
            lang: "python",
            code: `import numpy as np

print("=== 为什么标准基准不等于通用智能 ===")
print()

benchmarks = [
    ("MMLU", "多学科知识", 57, "知识记忆", "无法测推理"),
    ("HumanEval", "代码生成", 164, "编程能力", "无法测其他"),
    ("GSM8K", "数学应用题", 1319, "数学推理", "无法测语言"),
    ("ARC", "抽象推理", 800, "模式识别", "无法测知识"),
    ("GAIA", "通用助手", 466, "多步任务", "范围有限"),
]

print(f"{'基准':>12} | {'题数':>6} | {'测什么':>10} | {'盲点'}")
print("-" * 62)
for name, desc, n, tests, blind in benchmarks:
    print(f"{name:>12} | {n:>6} | {tests:>10} | {blind}")

print()
print("=== 三个根本问题 ===")
print()
print("问题 1：任务选择是主观的")
print("  · 为什么选 MMLU 而不是别的？")
print("  · Legg-Hutter 定义要求'所有环境'，但基准只是有限子集")
print()
print("问题 2：数据污染")
print("  · 训练数据可能包含测试题")
print("  · 高分不代表真会")
print()
print("问题 3：Goodhart 定律")
print("  · 一旦某个指标成为目标，它就不再是好指标")
print("  · 模型可能'刷榜'而非真正提升能力")
print()

print("=== 一个具体的 Goodhart 例子 ===")
print()

# 模拟：模型在测试集上"过拟合"
np.random.seed(42)
true_ability = np.linspace(0.5, 0.9, 10)      # 真实能力逐步提升
test_scores = true_ability + np.random.randn(10) * 0.02
leaderboard_scores = true_ability + np.random.randn(10) * 0.08   # 刷榜噪声更大

print(f"{'模型':>8} | {'真实能力':>9} | {'测试分':>8} | {'刷榜分':>8} | {'排名偏差':>9}")
print("-" * 56)
for i in range(10):
    true_rank = 10 - np.argsort(np.argsort(true_ability))[i]
    board_rank = 10 - np.argsort(np.argsort(leaderboard_scores))[i]
    diff = board_rank - true_rank
    print(f"model{i:>3} | {true_ability[i]:>9.3f} | {test_scores[i]:>8.3f} | {leaderboard_scores[i]:>8.3f} | {diff:>+9d}")

print()
print("注意排名偏差：有些模型真实能力低但刷榜分高（噪声运气）。")
print()
print("=== 更接近 U(pi) 精神的评估 ===")
print()
principles = [
    ("覆盖广度", "任务类型要多样（不只语言/不只代码）"),
    ("难度梯度", "从简单到困难都有（对应 2^-K 权重）"),
    ("防污染", "测试集必须与训练数据隔离"),
    ("持续更新", "定期换新题，防止刷榜"),
    ("多维度", "不只看准确率，也看效率、鲁棒性"),
]
for name, desc in principles:
    print(f"  {name:12} -> {desc}")

print()
print("这些原则本质上是在'近似' Legg-Hutter 的定义：")
print("  用有限但多样的任务集，近似'所有可能环境'。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-theory-c6-e1',
        type: 'single',
        difficulty: 2,
        question: 'Legg & Hutter 的通用智能定义 U(pi) 是？',
        options: [
          { value: 'A', text: 'IQ 测试分数的平均' },
          { value: 'B', text: '在所有可能环境中加权平均表现，权重为 2^(-K(环境))' },
          { value: 'C', text: '完成任务的速度' },
          { value: 'D', text: '模型的参数量' },
        ],
        answer: 'B',
        explanation:
          'U(pi) = Sum_mu 2^(-K(μ))·V_μ(π)。遍历所有环境，按环境复杂度加权（越简单权重越大），取表现的平均。这体现了"通用性"是智能核心。',
        tags: ['智能定义'],
      },
      {
        id: 'paper-theory-c6-e2',
        type: 'judge',
        difficulty: 2,
        question: '按 Legg-Hutter 的定义，一个只会在围棋上达到超人水平的系统，智能分数会很高。',
        answer: false,
        explanation:
          '恰恰相反。它只在围棋（K 较大）上表现好，其他所有环境 V=0。所以 U ≈ 2^(-K(围棋)) × 1，非常小。按这个定义，通用系统比专家系统智能更高。',
        tags: ['通用性'],
      },
      {
        id: 'paper-theory-c6-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'Legg-Hutter 智能定义的局限包括？（多选）',
        options: [
          { value: 'A', text: '不可计算（K(μ) 不可计算，需枚举所有环境）' },
          { value: 'B', text: '回报函数仍需人为定义' },
          { value: 'C', text: '不考虑计算效率（理论最优但可能算到宇宙末日）' },
          { value: 'D', text: '只适用于语言模型' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——这个定义完全通用，不限于语言模型。A/B/C 是真实局限，所以论文明确说这是理论定义而非实用工具。',
        tags: ['定义局限'],
      },
      {
        id: 'paper-theory-c6-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'Legg-Hutter 定义中的权重 2^(-K(μ)) 体现了 ___ 剃刀：越简单的环境权重越大。',
        blanks: [['奥卡姆', 'Occam', 'occam']],
        explanation:
          '这就是 Solomonoff 先验的数学形式：P(μ) = 2^(-K(μ))。简单环境（K 小）概率高、权重大；复杂环境权重小。权重之和 ≤ 1。',
        tags: ['奥卡姆剃刀'],
      },
      {
        id: 'paper-theory-c6-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算奥卡姆先验权重：occam_weight(complexity)。\n\n返回 2^(-complexity)。',
        starterCode: `def occam_weight(complexity):
    return ___
`,
        setupCode: '',
        expectedOutput: '权重',
        tests: `# K=1: 权重 0.5
assert abs(occam_weight(1) - 0.5) < 1e-9
# K=2: 0.25
assert abs(occam_weight(2) - 0.25) < 1e-9
# K=10: 约 0.000977
assert abs(occam_weight(10) - 2**-10) < 1e-12
# K=0: 权重 1
assert occam_weight(0) == 1.0
# 单调递减
assert occam_weight(1) > occam_weight(2) > occam_weight(5)
`,
        answer: `def occam_weight(complexity):
    return 2.0 ** (-complexity)
`,
        explanation:
          '**这是 Solomonoff 先验的核心公式**。\n\n**为什么是 2^(-K)**：\n\n在 Solomonoff 的框架中，长度为 L 的程序数量是 2^L。\n所以"随机选一个程序，恰好是某个特定程序 p"的概率是 2^(-|p|)。\n\n**性质**：\n- K=0 → 权重 1（唯一的最简程序）\n- K 增大 → 权重指数衰减\n- Sum_{k=1}^∞ 2^(-k) = 1（归一化）\n\n**这意味着**：简单假设的权重占了绝大部分。',
        tags: ['编程', '奥卡姆先验'],
      },
      {
        id: 'paper-theory-c6-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算通用智能分数：universal_intelligence(performances, complexities)。\n\n- performances: 各环境的表现列表\n- complexities: 对应复杂度列表\n- 返回 Sum 2^(-K)·V',
        starterCode: `def universal_intelligence(performances, complexities):
    total = 0.0
    for v, k in zip(performances, complexities):
        ___
    return total
`,
        setupCode: '',
        expectedOutput: 'U(pi)',
        tests: `# 单环境
assert abs(universal_intelligence([1.0], [1]) - 0.5) < 1e-9
assert abs(universal_intelligence([1.0], [2]) - 0.25) < 1e-9

# 多环境
u = universal_intelligence([1.0, 1.0], [1, 2])
assert abs(u - (0.5 + 0.25)) < 1e-9

# 专才 vs 通才：注意权重衰减极快，专才在 K=2 满分时反而更高
specialist = universal_intelligence([1.0, 0.0, 0.0], [2, 5, 10])
generalist = universal_intelligence([0.8, 0.8, 0.6], [2, 5, 10])
assert abs(specialist - 0.25) < 1e-9
assert specialist > generalist, f"此例专才更高（权重衰减过快）: {specialist} vs {generalist}"
# 但如果通才在简单环境也不差，则通才更高
balanced = universal_intelligence([0.95, 0.8, 0.6], [2, 5, 10])
assert balanced > specialist, f"简单环境也强则通才更高: {balanced} vs {specialist}"

# 空列表
assert universal_intelligence([], []) == 0.0
`,
        answer: `def universal_intelligence(performances, complexities):
    total = 0.0
    for v, k in zip(performances, complexities):
        total += (2.0 ** (-k)) * v
    return total
`,
        explanation:
          '**这是 U(pi) 的直接实现**（有限环境集版本）。\n\n**注意权重衰减极快**：\n- K=2 权重 0.25\n- K=10 权重 0.001\n- K=20 权重 1e-6\n\n**所以**：简单环境的表现主导总分。\n\n**专才 vs 通才的对比**：\n- 专才：K=2 得 1.0，其他 0 → U = 0.25\n- 通才：K=2 得 0.8，K=5 得 0.8，K=10 得 0.6 → U ≈ 0.20 + 0.025 + 0.0006 ≈ 0.23\n\n**等等，专才反而更高？**\n\n这说明：**权重衰减太快时，"基础能力"比"广泛覆盖"更重要**。\n这也是这个定义的一个争议点。',
        tags: ['编程', '智能分数'],
      },
      {
        id: 'paper-theory-c6-e7',
        type: 'code',
        difficulty: 3,
        question:
          '评估智能体在环境中的表现：evaluate_agent(agent, env, episodes=5)。\n\n返回平均回报。agent 需要有 act(obs) 和 observe(obs, reward, done) 方法。',
        starterCode: `import numpy as np

def evaluate_agent(agent, env, episodes=5):
    returns = []
    for _ in range(episodes):
        obs = env.reset()
        done = False
        total = 0.0
        steps = 0
        while not done and steps < 100:
            action = ___
            obs, reward, done = env.step(action)
            ___
            total += reward
            steps += 1
        returns.append(total)
    return float(np.mean(returns))
`,
        setupCode: '',
        expectedOutput: '平均回报',
        tests: `import numpy as np

class SimpleEnv:
    def reset(self): return 0
    def step(self, a):
        return 1, (1.0 if a == 1 else 0.0), True

class SmartAgent:
    def act(self, obs): return 1
    def observe(self, obs, reward, done): pass

class DumbAgent:
    def act(self, obs): return 0
    def observe(self, obs, reward, done): pass

env = SimpleEnv()
assert evaluate_agent(SmartAgent(), env, 3) == 1.0
assert evaluate_agent(DumbAgent(), env, 3) == 0.0

# 多次 episode
class CountEnv:
    def __init__(self): self.n = 0
    def reset(self): self.n = 0; return 0
    def step(self, a):
        self.n += 1
        return self.n, 1.0, self.n >= 3

r = evaluate_agent(SmartAgent(), CountEnv(), 2)
assert r == 3.0, f"应得 3.0，实际 {r}"
`,
        answer: `import numpy as np

def evaluate_agent(agent, env, episodes=5):
    returns = []
    for _ in range(episodes):
        obs = env.reset()
        done = False
        total = 0.0
        steps = 0
        while not done and steps < 100:
            action = agent.act(obs)
            obs, reward, done = env.step(action)
            agent.observe(obs, reward, done)
            total += reward
            steps += 1
        returns.append(total)
    return float(np.mean(returns))
`,
        explanation:
          '**标准的智能体评估循环**。\n\n**三个关键点**：\n1. `env.reset()` 每 episode 重置环境\n2. `agent.act(obs)` 决策，`env.step(action)` 执行\n3. `agent.observe(...)` 让智能体学习（可选）\n\n**`steps < 100` 是安全阀**：防止无限循环（如智能体卡住）。\n\n**多次 episode 取平均**：降低随机性影响，更可靠。\n\n**这与 Legg-Hutter 的 V_μ(π) 对应**：在环境 μ 中策略 π 的期望回报。',
        tags: ['编程', '智能体评估'],
      },
      {
        id: 'paper-theory-c6-e8',
        type: 'code',
        difficulty: 4,
        question:
          '对比专才与通才：compare_specialist_generalist()。\n\n构造两个智能体在 3 个环境（K=2,5,10）上的表现：\n- 专才：[1.0, 0.0, 0.0]\n- 通才：[0.8, 0.8, 0.6]\n\n返回 (专才U, 通才U)，并说明哪个更高。',
        starterCode: `def compare_specialist_generalist():
    complexities = [2, 5, 10]
    specialist = [1.0, 0.0, 0.0]
    generalist = [0.8, 0.8, 0.6]

    def upsilon(perfs):
        return ___

    return upsilon(specialist), upsilon(generalist)
`,
        setupCode: '',
        expectedOutput: '两者 U 对比',
        tests: `s, g = compare_specialist_generalist()
# 专才：0.25*1 + 0 + 0 = 0.25
assert abs(s - 0.25) < 1e-9, f"专才应 0.25，实际 {s}"
# 通才：0.25*0.8 + 0.03125*0.8 + 0.000977*0.6
expected_g = 0.25*0.8 + 0.03125*0.8 + (2**-10)*0.6
assert abs(g - expected_g) < 1e-9, f"通才应 {expected_g}，实际 {g}"
# 这个例子中专才更高（因为 K=2 权重占主导）
assert s > g, f"此例中专才更高: {s} vs {g}"
`,
        answer: `def compare_specialist_generalist():
    complexities = [2, 5, 10]
    specialist = [1.0, 0.0, 0.0]
    generalist = [0.8, 0.8, 0.6]

    def upsilon(perfs):
        return sum((2.0 ** (-k)) * v for k, v in zip(complexities, perfs))

    return upsilon(specialist), upsilon(generalist)
`,
        explanation:
          '**这个结果揭示了一个争议点**：\n\n专才 0.25 > 通才 0.229\n\n**为什么**：权重 2^(-K) 衰减太快，K=2 的环境占了 0.25（约 88% 的权重）。\n\n**这意味着**：\n- 如果专才恰好在"最简单的环境"上满分，它就能赢\n- 通才需要在简单环境上也表现很好才能超过\n\n**这是 Legg-Hutter 定义的一个批评点**：\n权重衰减太快可能过度强调"基础能力"。\n\n**可能的修正**：\n- 用更平缓的权重（如 1/K²）\n- 或者要求"在所有环境上都不低于某阈值"\n\n**但论文的原意是**：\n真正通用的系统应该在**所有**环境上都好，包括简单的。\n所以专才在 K=2 上满分、其他全 0，本来就不是"智能"。',
        tags: ['编程', '专才 vs 通才'],
      },
      {
        id: 'paper-theory-c6-e9',
        type: 'judge',
        difficulty: 4,
        question: 'Legg-Hutter 的智能定义可以直接用来评估现有的大语言模型。',
        answer: false,
        explanation:
          '不可直接使用：K(μ) 不可计算、"所有环境"不可枚举、回报函数需人为定义。所以论文明确说这是理论定义。实践中用有限基准（MMLU/HumanEval 等）近似，但有 Goodhart 定律等问题。',
        tags: ['实用性'],
      },
      {
        id: 'paper-theory-c6-e10',
        type: 'open',
        difficulty: 5,
        question:
          '请分析：① Legg-Hutter 智能定义的三要素；② 为什么 2^(-K) 权重体现奥卡姆剃刀；③ 这个定义的三个局限；④ 对现代 AI 评估的启示。',
        referenceAnswer: `**① 三要素**

**U(pi) = Sum_mu 2^(-K(μ)) · V_μ(π)**

| 要素 | 含义 | 作用 |
| --- | --- | --- |
| **μ（所有环境）** | 遍历所有可能的任务 | 保证"通用性" |
| **K(μ)（复杂度）** | 环境的柯尔莫哥洛夫复杂度 | 决定权重 |
| **V_μ(π)（表现）** | 策略在该环境的期望回报 | 衡量能力 |

**设计哲学**：

> **智能不是"在某任务上强"，而是"在广泛任务上都好"。**

**对比其他定义**：

| 定义 | 局限 |
| --- | --- |
| IQ 测试 | 只测人类相关能力 |
| 图灵测试 | 主观、可被欺骗 |
| 特定任务 | 窄领域（下棋、翻译） |
| **Legg-Hutter** | **通用但不可计算** |

---

**② 为什么 2^(-K) 体现奥卡姆剃刀**

**数学来源**：

Solomonoff 的通用先验：

    P(μ) = 2^(-K(μ))

**为什么是这个形式**：

长度 L 的程序有 2^L 个。
所以"随机选一个程序，恰好是特定程序 p"的概率 = 2^(-|p|)。

**权重分布**：

| K | 权重 | 累计占比 |
| --- | --- | --- |
| 1 | 0.5 | 50% |
| 2 | 0.25 | 75% |
| 3 | 0.125 | 87.5% |
| 10 | 0.001 | 99.9% |

**所以**：简单环境占了绝大部分权重。

**这符合奥卡姆剃刀**：

> 简单的假设更可能是正确的（也更重要）。

**直觉**：
- "总是给奖励"（K=2）是最基础的环境
- "需要记忆 100 步序列"（K=20）是极复杂的环境
- **能在基础环境上做好，比在极端环境上做好更重要**

---

**③ 三个局限**

**a) 不可计算**

| 需要什么 | 为什么不可行 |
| --- | --- |
| K(μ) | 柯尔莫哥洛夫复杂度不可计算 |
| 所有环境 | 无限多，无法枚举 |
| 精确积分 | 需要无限计算资源 |

**所以 AIXI（理论最优智能体）只是"北极星"**，无法实现。

**b) 回报函数仍需人为定义**

**V_μ(π)** 是"期望回报"，但**什么算好**仍需定义。

**问题**：
- 下棋：赢 = +1，输 = -1（清楚）
- 写文章：怎么打分？（主观）
- 做决策：长期影响怎么算？（复杂）

**所以"价值对齐"问题并没有被这个定义解决。**

**c) 权重衰减可能过快**

**例子**（我的 demo）：

    专才（K=2 满分，其他 0）: U = 0.25
    通才（K=2/5/10 都是 0.8/0.8/0.6）: U = 0.229

**专才反而更高！**

**为什么**：K=2 的权重 0.25 占了 88%，其他环境几乎无影响。

**这是一个合理的批评**：
真正的智能应该"在所有环境都不差"，
但当前权重让"在一个简单环境满分"就能拿高分。

**可能的修正**：
- 用更平缓的权重（1/K² 或 log 衰减）
- 或者加"最小表现约束"

---

**④ 对现代 AI 评估的启示**

**a) 为什么需要"广泛覆盖"的基准**

**按 Legg-Hutter 的精神**，好的基准应该：
- 覆盖多种任务类型（不只语言）
- 有难度梯度（对应 2^-K）
- 定期更新（防污染）

**现代基准的演进**：

| 时期 | 基准 | 特点 |
| --- | --- | --- |
| 2018 | GLUE | 单一任务（语言理解） |
| 2020 | SuperGLUE, MMLU | 多任务 |
| 2023 | HELM, BIG-bench | **广泛覆盖** |
| 2024 | ARC-AGI, GAIA | **通用能力** |

**趋势正是"从窄到宽"**——向 U(pi) 的精神靠拢。

**b) Goodhart 定律的警示**

> 一旦某个指标成为目标，它就不再是好指标。

**具体表现**：
- 训练数据包含测试题（污染）
- 针对基准优化（刷榜）
- 只在基准上表现好（过拟合）

**对策**：
- 保留私有测试集
- 定期换新题
- 多维度评估（不只看准确率）

**c) 效率也是智能的一部分**

**Legg-Hutter 的定义不考虑计算效率**（AIXI 要算到宇宙末日）。

**现代评估开始纳入效率**：

    智能 = 能力 / 成本

- 每 token 成本
- 每次推理延迟
- 能耗

**这是对原始定义的重要补充。**

**d) 一个更深的问题**

**"通用智能"是否等价于"安全"？**

**按 Legg-Hutter**：
超级智能 = 在所有环境（包括有害环境）中都很强。

**这意味着**：
- 一个真正通用的系统，也能做**坏事**
- 能力与安全是**正交**的

**这就是 AI 对齐研究的起点**：
如何确保"能力强"的系统"目标正确"？

**Legg 本人后来创办了 DeepMind 的 AGI 安全团队**——
这个定义直接影响了他的研究路径。

---

**⑤ 一个诚实的总结**

**这个定义的价值**：

| 方面 | 价值 |
| --- | --- |
| **理论** | 给出严格的智能数学定义 |
| **哲学** | 明确"通用性"是智能核心 |
| **实践** | 启发了广泛覆盖的基准设计 |
| **安全** | 揭示"能力 ≠ 安全" |

**但它不是"评估工具"**：
- 不可计算
- 需要人为定义回报
- 权重有争议

**所以正确的理解是**：

> **这是一个"理解智能的框架"，而非"测量智能的尺子"。**

**框架的价值**：让我们能讨论"什么是通用智能"、
"如何评估"、"能力与安全的关系"这些根本问题。

**这比一个具体的分数更有意义。**`,
        rubric: [
          { point: '三要素：所有环境 + K(μ) 权重 + V_μ(π) 表现', score: 3 },
          { point: '2^(-K) 来自 Solomonoff 先验，简单环境占绝大部分权重', score: 2 },
          { point: '三局限：不可计算、回报需人为定义、权重衰减过快（专才例）', score: 2 },
          { point: '现代启示：广泛覆盖基准、Goodhart、效率维度', score: 2 },
          { point: '能力≠安全，启发 AI 对齐；框架而非尺子', score: 1 },
        ],
        keywords: ['所有环境', 'Solomonoff', '专才反例', 'Goodhart', '能力正交安全', '框架非尺子'],
        explanation:
          '能指出「专才反而可能比通才分数高（权重衰减过快）」以及「能力与安全正交」，就是真正理解了这篇论文的贡献与局限。',
        tags: ['综合分析'],
      },
    ],
  },
];
