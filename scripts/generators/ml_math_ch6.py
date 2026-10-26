# -*- coding: utf-8 -*-
"""
Chapter 6: 最优化方法与凸优化收敛性分析 (Optimization Methods & Convex Analysis)
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_6():
    # ── Lesson 6.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握凸集（Convex Sets）与凸函数（Convex Functions）的几何定义与琴生不等式（Jensen's Inequality）；
2. 掌握凸函数的一阶支撑超平面条件（First-Order Condition）与二阶 Hessian 矩阵半正定条件；
3. 严密推导并证明凸优化第一基本定理：**凸优化问题的任何局部极小值必为全局最小值**；
4. 理解凸优化在机器学习中的黄金地位（逻辑回归、支持向量机、线性回归均具有全局唯一解）；
5. 编写代码对一阶支撑超平面下界与 Hessian 半正定性进行数值检验，辨析凸函数与非凸函数。

### 前置知识
- 向量空间线性插值与凸组合；
- 多元泰勒展开与 Hessian 矩阵。

### 问题背景与 ML 用途
在机器学习的各种优化算法中，如果损失函数是非凸的（如深度神经网络），优化器可能会陷入鞍点、不良局部极小值，甚至对初始权重极其敏感。
而**凸优化（Convex Optimization）**被公认为数学规划中最成熟、最优美的领域：
- “最优化问题的分水岭不是线性和非线性，而是凸性和非凸性。”（R. T. Rockafellar）
- 在凸优化问题中，不存在“卡在半山腰局部极小”的困扰，任何局部寻优算法（如梯度下降、牛顿法、内点法）只要找到了一个极小点，在数学上就铁证如山地找到了**全局最优解**！
- 经典算法（线性回归、Ridge、Lasso、逻辑回归、SVM、Softmax回归）的目标函数全部是严格凸或凸函数，保证了训练结果的绝对稳定性与可复现性。

### 直觉理解
- **凸集的连线法则**：一个集合是凸集，意味着从集合内任意挑两个点拉一根橡皮筋，这根橡皮筋上的每一个点都必须完完全全落在集合内部，没有任何缺口或内凹（如实心圆形、立方体都是凸集；新月形、五角星形不是凸集）。
- **凸函数的一叶扁舟（不下坠的碗）**：把一个碗摆在桌面上，碗壁上任意两点之间的割线段总是在碗底的上方（琴生不等式）；在碗底任意一点画一张切平面，整只碗永远都在切平面的上方（一阶支撑超平面性质）。你把一颗弹珠放进碗里任意位置，它顺着坡度滚到停下来的那个坑底，就绝对是整只碗最低的那个碗底（局部最优即全局最优）！

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **凸集** | $C$ | $\\forall \\mathbf{x}, \\mathbf{y} \\in C, \\alpha \\in [0, 1] \\implies \\alpha \\mathbf{x} + (1-\\alpha)\\mathbf{y} \\in C$ | 约束可行域、参数搜索空间 |
| **凸函数** | $f(\\mathbf{x})$ | $f(\\alpha \\mathbf{x} + (1-\\alpha)\\mathbf{y}) \\le \\alpha f(\\mathbf{x}) + (1-\\alpha) f(\\mathbf{y})$ | 保证无不良局部极小、训练稳定 |
| **一阶支撑超平面** | $\\nabla f(\\mathbf{x})$ | $f(\\mathbf{y}) \\ge f(\\mathbf{x}) + \\nabla f(\\mathbf{x})^T (\\mathbf{y} - \\mathbf{x})$ | 仿射全局下界、次梯度推导基石 |
| **二阶凸性条件** | $\\nabla^2 f(\\mathbf{x}) \\succeq 0$ | Hessian 矩阵在全域处处半正定 | 验证损失函数凸性的代数判据 |
| **强凸性** | $\\mu$-Strongly Convex | $f(\\mathbf{y}) \\ge f(\\mathbf{x}) + \\nabla f^T(\\mathbf{y}-\\mathbf{x}) + \\frac{\\mu}{2}\\|\\mathbf{y}-\\mathbf{x}\\|^2$ | 保证全局解唯一且梯度下降线性收敛 |

### 数学原理与逐步推导
#### 1. 凸优化“局部极小即全局最优”的严格反证法证明
设可行域 $C \\subseteq \\mathbb{R}^d$ 为非空凸集，目标函数 $f: C \\to \\mathbb{R}$ 为凸函数。
设 $\\mathbf{x}^* \\in C$ 是一个局部极小点，即存在某个邻域半径 $\\delta > 0$，使得：
$$\\forall \\mathbf{x} \\in C \\text{ 且 } \\|\\mathbf{x} - \\mathbf{x}^*\\| < \\delta, \\quad f(\\mathbf{x}^*) \\le f(\\mathbf{x})$$
我们用**反证法**证明 $\\mathbf{x}^*$ 必定是全局最小值点。
假设 $\\mathbf{x}^*$ 不是全局极小点，则必存在某个点 $\\mathbf{y} \\in C$，使得：
$$f(\\mathbf{y}) < f(\\mathbf{x}^*)$$
显然 $\\mathbf{y} \\neq \\mathbf{x}^*$。考察两点连线上的凸组合点序列：
$$\\mathbf{z}(\\alpha) = (1 - \\alpha) \\mathbf{x}^* + \\alpha \\mathbf{y}, \\quad \\alpha \\in (0, 1]$$
由于集合 $C$ 是凸集，必有 $\\mathbf{z}(\\alpha) \\in C$。
考察该点与局部极小点 $\\mathbf{x}^*$ 的欧氏距离：
$$\\|\\mathbf{z}(\\alpha) - \\mathbf{x}^*\\| = \\|(1 - \\alpha) \\mathbf{x}^* + \\alpha \\mathbf{y} - \\mathbf{x}^*\\| = \\|\\alpha (\\mathbf{y} - \\mathbf{x}^*)\\| = \\alpha \\|\\mathbf{y} - \\mathbf{x}^*\\|$$
我们只需选取一个足够小的 $\\alpha_0 = \\frac{\\delta}{2 \\|\\mathbf{y} - \\mathbf{x}^*\\|} > 0$（若该值 $>1$ 则取 $0.5$），就能确保 $\\|\\mathbf{z}(\\alpha_0) - \\mathbf{x}^*\\| < \\delta$。
即点 $\\mathbf{z}(\\alpha_0)$ 严格位于 $\\mathbf{x}^*$ 的局部小邻域内！
另一方面，由函数 $f$ 的凸性定义：
$$f(\\mathbf{z}(\\alpha_0)) = f((1 - \\alpha_0) \\mathbf{x}^* + \\alpha_0 \\mathbf{y}) \\le (1 - \\alpha_0) f(\\mathbf{x}^*) + \\alpha_0 f(\\mathbf{y})$$
因为已知 $f(\\mathbf{y}) < f(\\mathbf{x}^*)$ 且 $\\alpha_0 > 0$：
$$(1 - \\alpha_0) f(\\mathbf{x}^*) + \\alpha_0 f(\\mathbf{y}) < (1 - \\alpha_0) f(\\mathbf{x}^*) + \\alpha_0 f(\\mathbf{x}^*) = f(\\mathbf{x}^*)$$
因此得到：
$$f(\\mathbf{z}(\\alpha_0)) < f(\\mathbf{x}^*)$$
这与 $\\mathbf{x}^*$ 是局部极小点（邻域内无任何点函数值小于 $f(\\mathbf{x}^*)$）的定义产生**不可调和的矛盾**！
假设不成立，因此：**$\\mathbf{x}^*$ 必定是全局最小值点**。

### 几何图景与计算图
```
一阶支撑超平面性质几何图：
        f(x)
         │           / 割线 (在曲线下方，琴生不等式)
         │     *    /  *
         │    / \  /  / \
         │   /   o---o   \  <-- 凸函数碗状曲线
         │  /             \
         │ ────────┬────────── 切平面 y = f(x_0) + ∇f^T(x - x_0)
         │         x_0        (切线永远垫在整条曲线的最底下方！)
         └────────────────────▶ x
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：凸函数的驻点一定是严格唯一的全局极小点吗？
> 不一定！“凸函数”只保证所有局部极小点都是全局极小点，并且极小值的值是唯一的，但取得该最小值的**极小点可能有很多个（形成一个凸集）**。例如 $f(x_1, x_2) = x_1^2$（沿着 $x_2$ 轴的所有点都是全局极小点）。只有当函数满足**严格凸（Strictly Convex）**或**强凸（Strongly Convex）**时，全局极小点才具有严格唯一性。

### 工业界实践与工程考量
- 工业界在设计损失函数时，尽可能保持凸性。例如逻辑回归的交叉熵损失对于权重 $\\mathbf{w}$ 是严格凸的，因此可以使用通用的凸优化求解器（如 LibLinear、Scipy 的 L-BFGS）在几秒钟内收敛到全局精确解，无需担心陷入局部陷阱。

### 延伸思考与进阶阅读
- 阅读 Stephen Boyd, Lieven Vandenberghe《Convex Optimization》第 2 章与第 3 章。
- 思考：如果一个函数是凸函数，但不可微（例如 Lasso 的 $L_1$ 范数 $|x|$ 在 $x=0$ 处不可微），该如何泛化一阶导数支撑超平面的概念？（提示：次梯度 Subgradient）。

### 本节小结
- 凸集与凸函数满足线性插值保凸性；一阶支撑超平面构成了全局下界；
- 凸优化的第一基本定理保证了任何局部极小值都是全局最优解。"""

    l1_code = """import numpy as np

# 考察一个典型的严格凸二次函数: f(x) = x^T A x + b^T x (A 为正定矩阵)
A = np.array([[3.0, 1.0],
              [1.0, 2.0]])
b = np.array([-2.0, 1.0])

def convex_f(x):
    return float(0.5 * x.T @ A @ x + b.T @ x)

def grad_f(x):
    return A @ x + b

# 1. 验证 Hessian 矩阵的正定性
hessian = A
eigenvalues = np.linalg.eigvalsh(hessian)
print("Hessian 矩阵特征值:", eigenvalues)
print("全域 Hessian 是否严格正定 (特征值均大于 0):", np.all(eigenvalues > 0))

# 2. 验证一阶支撑超平面不等式: f(y) >= f(x) + grad(x)^T (y - x)
np.random.seed(42)
x_base = np.array([1.0, 2.0])
fx_base = convex_f(x_base)
gx_base = grad_f(x_base)

n_test = 1000
all_valid = True
min_margin = float('inf')

for _ in range(n_test):
    y_test = x_base + np.random.uniform(-5, 5, size=2)
    fy_test = convex_f(y_test)
    # 支撑超平面在 y_test 处的线性近似值
    tangent_approx = fx_base + gx_base.T @ (y_test - x_base)
    margin = fy_test - tangent_approx
    if margin < -1e-9:
        all_valid = False
        break
    min_margin = min(min_margin, margin)

print(f"随机抽取 {n_test} 个测试点，一阶支撑不等式是否 100% 成立:", all_valid)
print(f"真实函数值与一阶切平面近似值的最小差值 (恒非负): {min_margin:.6f}")
"""

    lesson_1 = lesson(
        lesson_id="ml-math-l6-1",
        title="凸集、凸函数与一阶支持超平面条件：优化的黄金圣杯",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("支撑超平面的全局性：非凸函数的切线只能局部近似，但凸函数的切平面是全域的坚固下界，这是所有凸剪枝算法的数理支撑。", "interview"),
            tip("强凸性带来的唯一解：在目标函数中加入 L2 正则项 (1/2)||w||^2 会立刻给 Hessian 注入对角常数正定矩阵，强行将普通凸函数变为强凸函数，确保唯一最优解。", "note")
        ],
        demos=[
            demo(code=l1_code, title="Hessian 正定性与一阶支撑超平面全局下界验证")
        ]
    )

    # ── Lesson 6.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握利普希茨连续梯度（Lipschitz Continuous Gradient）与**下降引理（Descent Lemma）**；
2. 严密推导梯度下降的最优学习率上界 $\\eta \\le 1/L$，掌握单步函数值单调下降的充分条件；
3. 掌握凸函数次线性收敛率 $O(1/k)$ 与强凸函数线性/几何收敛率 $O((1 - \\mu/L)^k)$；
4. 理解条件数 $\\kappa = L/\\mu$ 对梯度下降“病态峡谷震荡”的控制机理；
5. 编写代码对不同学习率下的梯度下降轨迹进行动态追踪，验证超界学习率导致的数值发散现象。

### 前置知识
- 导数连续性与最速下降原理；
- 泰勒一阶展开与欧氏范数。

### 问题背景与 ML 用途
“学习率（Learning Rate, $\\eta$）设多大合适？”这是每一个深度学习工程师每天都要问的问题：
- 设得太大，Loss 瞬间飙升到 NaN，模型发散崩溃；
- 设得太小，训练十天半个月纹丝不动，收敛慢如蜗牛。
在优化理论中，这个问题的答案不是拍脑袋猜出来的，而是由**梯度的利普希茨常数 $L$** 完全决定的！
- 下降引理给出了不引起发散的铁律：学习率必须满足 $\\eta < 2/L$；
- 强凸条件下的收敛率分析给出了学习率衰减（Learning Rate Scheduling）和预热（Warmup）的理论准绳；
- 随机梯度下降（SGD）的方差衰减分析为大规模分布式训练提供了批大小（Batch Size）扩展的数学边界。

### 直觉理解
- **利普希茨常数与地面滑溜度**：梯度的利普希茨常数 $L$ 刻画了“坡度变化的最大剧烈程度”。如果 $L$ 很大，意味着山坡表面像搓板一样剧烈弯曲，走一厘米坡度就会发生翻天覆地的变化，此时步长必须极小，否则一步迈出去就会直接踩进对面的山崖上；如果 $L$ 很小，坡度非常平缓均匀，你可以迈开大步放心飞奔。

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **$L$-光滑性** | $L$ | $\\|\\nabla f(\\mathbf{x}) - \\nabla f(\\mathbf{y})\\| \\le L \\|\\mathbf{x}-\\mathbf{y}\\|$ | 限制梯度变化速度，决定最大安全步长 |
| **下降引理** | 二次上界 | $f(\\mathbf{y}) \\le f(\\mathbf{x}) + \\nabla f^T(\\mathbf{y}-\\mathbf{x}) + \\frac{L}{2}\\|\\mathbf{y}-\\mathbf{x}\\|^2$ | 梯度下降单调下降的核心证明工具 |
| **安全学习率** | $\\eta$ | $\\eta \\le \\frac{1}{L}$ | 确保每一步迭代函数值严格单调下降 |
| **强凸参数** | $\\mu$ | $\\nabla^2 f(\\mathbf{x}) \\succeq \\mu I$ | 刻画函数向上的最平缓曲率下限 |
| **条件数** | $\\kappa$ | $\\kappa = \\frac{L}{\\mu}$ | 刻画等高线狭长度，决定最速下降震荡程度 |

### 数学原理与逐步推导
#### 1. 下降引理（Descent Lemma）推导梯度单调下降
设函数 $f$ 的梯度满足 $L$-利普希茨连续。由微积分基本定理：
$$f(\\mathbf{y}) - f(\\mathbf{x}) = \\int_0^1 \\nabla f(\\mathbf{x} + t(\\mathbf{y} - \\mathbf{x}))^T (\\mathbf{y} - \\mathbf{x}) dt$$
将 $\\nabla f(\\mathbf{x})^T (\\mathbf{y} - \\mathbf{x})$ 提出：
$$f(\\mathbf{y}) - f(\\mathbf{x}) = \\nabla f(\\mathbf{x})^T (\\mathbf{y} - \\mathbf{x}) + \\int_0^1 (\\nabla f(\\mathbf{x} + t(\\mathbf{y} - \\mathbf{x})) - \\nabla f(\\mathbf{x}))^T (\\mathbf{y} - \\mathbf{x}) dt$$
应用柯西-施瓦茨不等式与利普希茨条件：
$$\\left| \\int_0^1 (\\dots) dt \\right| \\le \\int_0^1 L t \\|\\mathbf{y} - \\mathbf{x}\\|^2 dt = \\frac{L}{2} \\|\\mathbf{y} - \\mathbf{x}\\|^2$$
由此得到著名的**下降引理（二次上界）**：
$$f(\\mathbf{y}) \\le f(\\mathbf{x}) + \\nabla f(\\mathbf{x})^T (\\mathbf{y} - \\mathbf{x}) + \\frac{L}{2} \\|\\mathbf{y} - \\mathbf{x}\\|^2$$
现在将梯度下降的迭代公式 $\\mathbf{y} = \\mathbf{x} - \\eta \\nabla f(\\mathbf{x})$ 代入上述不等式：
$$f(\\mathbf{x} - \\eta \\nabla f(\\mathbf{x})) \\le f(\\mathbf{x}) - \\eta \\|\\nabla f(\\mathbf{x})\\|^2 + \\frac{L}{2} \\eta^2 \\|\\nabla f(\\mathbf{x})\\|^2 = f(\\mathbf{x}) - \\eta \\left( 1 - \\frac{L \\eta}{2} \\right) \\|\\nabla f(\\mathbf{x})\\|^2$$
若选取步长 $\\eta = \\frac{1}{L}$：
$$f(\\mathbf{x}_{k+1}) \\le f(\\mathbf{x}_k) - \\frac{1}{2L} \\|\\nabla f(\\mathbf{x}_k)\\|^2$$
**定理得证**：只要步长 $\\eta \\le \\frac{1}{L}$，只要梯度不为零，**每一次梯度下降迭代都必定能使得目标函数值严格下降至少 $\\frac{\\eta}{2}\\|\\nabla f\\|^2$**！
若步长进一步增大，只有当 $\\eta < \\frac{2}{L}$ 时括号内才为正数，若 $\\eta > \\frac{2}{L}$，函数值不仅不下降，反而会急剧爆炸！

### 几何图景与计算图
```
不同步长下的收敛几何轨迹：
等高线狭长椭圆 (条件数 κ 大)
    η < 1/L   : 稳健单调收敛，快速贴近最优谷底
    1/L < η < 2/L : 左右横跳剧烈震荡，但依然在震荡中逐渐收敛
    η > 2/L   : 震荡幅度越来越大，几步之内彻底飞向无穷大 (发散 NaN)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：线性收敛（Linear Convergence）是指“误差和迭代次数成线性比例吗？”
> **不是！** 优化理论中的“线性收敛”是指误差在半对数坐标系下呈直线下降，即 $\\|\\mathbf{x}_k - \\mathbf{x}^*\\| \\le C \\cdot r^k$（其中收敛因子 $r < 1$）。在常规日常语言中这其实是**指数级衰减（Exponential Decay）**！而通常所说的误差以 $O(1/k)$ 比例下降，在优化界被称为**次线性收敛（Sublinear Convergence）**。

### 工业界实践与工程考量
- 在大模型预训练（如 Transformer 预训练）中，损失曲面在初始阶段极其陡峭（$L$ 很大）。因此工业界必须使用**学习率预热（Learning Rate Warmup）**：在前 2000 到 5000 步让步长从 0 线性增加到峰值，等模型参数滑入相对平缓的曲面区域后，再执行余弦退火（Cosine Annealing）衰减。

### 延伸思考与进阶阅读
- 阅读 Yurii Nesterov《Introductory Lectures on Convex Optimization》第 1.2 节：光滑函数的梯度法与加速梯度法。
- 思考：既然一阶梯度法的收敛极限受制于条件数 $\kappa$，为什么牛顿法能够做到二阶超线性收敛而不受 $\kappa$ 影响？（提示：仿射不变性 Affine Invariance）。

### 本节小结
- 下降引理提供了光滑凸函数优化的二次上界；
- 学习率 $\eta \le 1/L$ 保证单调收敛，$\eta > 2/L$ 导致发散；条件数决定了狭窄峡谷中的震荡程度。"""

    l2_code = """import numpy as np

# 构造一个一维光滑二次函数: f(x) = 0.5 * L * x^2 (最优解 x* = 0, 梯度 Lipschitz 常数恰为 L)
L = 10.0
def f(x):
    return 0.5 * L * x**2

def grad(x):
    return L * x

# 测试三种不同的学习率:
# 1. 理论最优稳定步长: eta = 1 / L = 0.1
# 2. 临界震荡步长: eta = 1.8 / L = 0.18
# 3. 理论发散步长: eta = 2.1 / L = 0.21 (> 2/L)
step_sizes = {
    "单调收敛 (η = 1/L)": 1.0 / L,
    "震荡收敛 (η = 1.8/L)": 1.8 / L,
    "数值爆炸 (η = 2.1/L)": 2.1 / L,
}

print(f"目标函数 f(x) = 0.5 * {L} * x^2, Lipschitz 常数 L = {L}")
print(f"理论收敛极限门槛 2/L = {2.0 / L}")
print("=" * 65)

for name, lr in step_sizes.items():
    x = 10.0  # 初始点
    trajectory = [x]
    for step in range(5):
        x = x - lr * grad(x)
        trajectory.append(round(x, 4))
    print(f"策略: {name} (步长 = {lr}):")
    print("  前 5 步轨迹:", trajectory)
    if abs(trajectory[-1]) > abs(trajectory[0]):
        print("  状态: [严重发散爆炸！]")
    else:
        print("  状态: [成功收敛或震荡缩小]")
    print("-" * 65)
"""

    lesson_2 = lesson(
        lesson_id="ml-math-l6-2",
        title="梯度下降与 SGD 收敛性分析：步长门槛与收敛速率",
        content=l2_content,
        difficulty=4,
        tips=[
            tip("学习率物理上界：牢记无论何时，步长都绝不能超过 2/L，否则梯度下降在二次展开下必定发散。", "interview"),
            tip("预热 Warmup 的本质：在模型刚初始化的区域曲率极高（L 极大），微小步长预热正是为了防止第一步更新就直接越界发散。", "note")
        ],
        demos=[
            demo(code=l2_code, title="不同学习率下梯度下降轨迹与发散临界仿真")
        ]
    )

    # ── Lesson 6.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握含等式与不等式约束的一般优化问题数学形式，构建广义拉格朗日函数（Generalized Lagrangian）；
2. 理解拉格朗日对偶函数（Lagrange Dual Function）的凹性、弱对偶性与斯莱特条件（Slater's Condition）下的强对偶性；
3. 掌握 KKT 条件（Karush-Kuhn-Tucker Conditions）的四大支柱：平稳性、主可行性、对偶可行性与**互补松弛性（Complementary Slackness）**；
4. 运用 KKT 条件推导支持向量机（SVM）的对偶问题，严格解释为什么 SVM 能够得到极其稀疏的支持向量解；
5. 编写代码使用 SciPy 约束优化求解器（SLSQP）求解带约束二次规划问题，数值验证 KKT 互补松弛性。

### 前置知识
- 多元偏导数与梯度几何切平面；
- 矩阵二次型与凸集分离超平面。

### 问题背景与 ML 用途
真实机器学习工程与算法设计充斥着大量不可逾越的**约束条件**：
- 推荐系统中对各类目曝光比例的硬性配额约束；
- 模型量化或稀疏化中对非零权重总预算的硬性上限；
- 在对抗攻击防护中要求扰动幅度在 $\\epsilon$-球体内；
- 在**支持向量机（SVM）**中，要求所有正负训练样本必须落在分离超平面的间隔边界之外（$y_i(\\mathbf{w}^T \\mathbf{x}_i + b) \\ge 1$）。
**KKT 条件是整个非线性约束优化领域最伟大的定理**。它将复杂的带约束极值问题，转化为一组可以直接代数联立求解的一阶方程组，是支持向量机、最大熵模型和凸规划算法的理论灵魂。

### 直觉理解
- **被栅栏挡住的弹珠**：想象地面是一个碗状坡道，最低点（无约束最优解）在栅栏外面。弹珠滚到栅栏边缘被硬生生挡住了（约束生效，处于边界）。此时，碗底斜坡给弹珠的重力下滑力（目标函数负梯度 $-\\nabla f_0$），与栅栏给弹珠的垂直支撑反作用力（约束梯度 $\\lambda \\nabla f_i$）正好**大小相等、方向相反**！
- **互补松弛性（闲人免进）**：如果弹珠停在远离栅栏的开阔平地上，栅栏根本没碰到弹珠（$f_i(\\mathbf{x}) < 0$），那么栅栏提供的支撑力必须为零（乘子 $\\lambda_i = 0$）；如果栅栏对弹珠施加了支撑力（乘子 $\\lambda_i > 0$），那么弹珠必定紧贴在栅栏边上（$f_i(\\mathbf{x}) = 0$）。**两者必有一者为零，乘积恒等于零（$\\lambda_i f_i(\\mathbf{x}) = 0$）**！

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **广义拉格朗日函数** | $\\mathcal{L}(\\mathbf{x}, \\boldsymbol{\\lambda}, \\boldsymbol{\\nu})$ | $f_0(\\mathbf{x}) + \\sum_{i=1}^m \\lambda_i f_i(\\mathbf{x}) + \\sum_{j=1}^p \\nu_j h_j(\\mathbf{x})$ | 将带约束问题转化为无约束鞍点问题 |
| **拉格朗日对偶函数** | $g(\\boldsymbol{\\lambda}, \\boldsymbol{\\nu})$ | $\\inf_{\\mathbf{x}} \\mathcal{L}(\\mathbf{x}, \\boldsymbol{\\lambda}, \\boldsymbol{\\nu})$ | 恒为凹函数，提供原问题最优值的下界 |
| **弱对偶性** | $d^* \\le p^*$ | 对偶最优解恒小于等于原问题最优解 | 为全局解提供对偶间隙（Duality Gap）检验 |
| **强对偶性** | $d^* = p^*$ | 对偶最优解严格等于原问题最优解 | 通过求解更简单的对偶问题直接得到原问题解 |
| **互补松弛性** | $\\lambda_i f_i(\\mathbf{x}) = 0$ | 乘子大于 0 则约束取等号；约束严格成立则乘子为 0 | SVM 产生稀疏解、软间隔分类的数理根源 |

### 数学原理与逐步推导
#### 1. KKT 条件在硬间隔 SVM 支持向量稀疏性中的严格应用
硬间隔支持向量机的原始优化问题为寻找最大几何间隔分离超平面：
$$\\min_{\\mathbf{w}, b} \\frac{1}{2} \\|\\mathbf{w}\\|^2 \\quad \\text{s.t.} \\quad 1 - y_i (\\mathbf{w}^T \\mathbf{x}_i + b) \\le 0, \\quad i = 1, \\dots, n$$
引入拉格朗日乘子 $\\lambda_i \\ge 0$，构建拉格朗日函数：
$$\\mathcal{L}(\\mathbf{w}, b, \\boldsymbol{\\lambda}) = \\frac{1}{2} \\|\\mathbf{w}\\|^2 + \\sum_{i=1}^n \\lambda_i \\left( 1 - y_i (\\mathbf{w}^T \\mathbf{x}_i + b) \\right)$$
根据 KKT 互补松弛条件：
$$\\lambda_i^* \\cdot \\left( 1 - y_i ((\\mathbf{w}^*)^T \\mathbf{x}_i + b^*) \\right) = 0, \\quad \\forall i = 1, \\dots, n$$
根据 KKT 平稳性条件对 $\\mathbf{w}$ 求导等于 0：
$$\\nabla_{\\mathbf{w}} \\mathcal{L} = \\mathbf{w} - \\sum_{i=1}^n \\lambda_i y_i \\mathbf{x}_i = \\mathbf{0} \\implies \\mathbf{w}^* = \\sum_{i=1}^n \\lambda_i^* y_i \\mathbf{x}_i$$
**惊人的稀疏性分析**：
1. 对于绝大多数远离超平面的样本点，它们被正确分类且远离分类边界：
   $$y_i ((\\mathbf{w}^*)^T \\mathbf{x}_i + b^*) > 1 \\implies 1 - y_i ((\\mathbf{w}^*)^T \\mathbf{x}_i + b^*) < 0$$
   为了满足互补松弛条件 $\\lambda_i^* \\times (\\dots) = 0$，其对应的乘子**必须严格为零**（$\\lambda_i^* = 0$）！
   这意味着：**海量的非边界样本在超平面参数 $\\mathbf{w}^*$ 的加权和中贡献权重完全为 0**！即使把它们从训练集中彻底删去，最优超平面也纹丝不动！
2. 只有那些落在间隔边界上的样本点（$y_i ((\\mathbf{w}^*)^T \\mathbf{x}_i + b^*) = 1$），其乘子才可以大于零（$\\lambda_i^* > 0$）。
   这些决定了最终决策边界的关键样本点，被称为**支持向量（Support Vectors）**！

### 几何图景与计算图
```
支持向量机与 KKT 互补松弛性：
        类别 +1 样本 o
          o      o
       ─────────────── 间隔边界 y_i(w^T x + b) = 1 (支持向量! λ_i > 0)
        [●]    [●]  
             /  
            / 最优超平面 w^T x + b = 0
           / 
        [▲]           间隔边界 y_i(w^T x + b) = -1 (支持向量! λ_i > 0)
       ───────────────
          ▲      ▲   类别 -1 样本 (非边界样本, λ_i = 0, 对模型毫无影响!)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：KKT 条件在所有优化问题中都是充要条件吗？
> **不是！** 
> 1. 对于一般的非凸问题，KKT 条件仅仅是局部极值点的**必要条件**（满足 KKT 的点可能是鞍点或局部极大值）；
> 2. 只有当原问题是**凸优化问题**，且满足**斯莱特约束正规性条件（Slater's Condition，即可行域存在严格内点）**时，KKT 条件才成为全局最优解的**充分必要条件**！

### 工业界实践与工程考量
- 支持向量机的对偶形式将优化问题转化为仅包含内积 $\\mathbf{x}_i^T \\mathbf{x}_j$ 的二次规划。通过将内积替换为核函数 $K(\\mathbf{x}_i, \\mathbf{x}_j) = \\phi(\\mathbf{x}_i)^T \\phi(\\mathbf{x}_j)$，SVM 能够以 $O(1)$ 的代数代价直接隐式在无穷维高维特征空间中完成非线性分类（核技巧 Kernel Trick）。
- 工业级求解库（如 LIBSVM）采用序列最小最优化（SMO）算法，每次只挑选违反 KKT 条件最严重的两个乘子进行解析更新，将高维二次规划拆解为一系列二元二次方程解析解。

### 延伸思考与进阶阅读
- 阅读 Christopher M. Bishop《PRML》第 7 章：支持向量机与 KKT 对偶性推导。
- 思考：如果引入松弛变量允许部分样本跨越间隔边界（软间隔 SVM），KKT 条件中的拉格朗日乘子会上限截断在惩罚常数 $C$ 处吗？此时支持向量包含哪两类点？

### 本节小结
- 广义拉格朗日与对偶理论将约束问题转化为无约束极小极大对偶；
- KKT 互补松弛性是推导 SVM 稀疏支持向量的数学基石。"""

    l3_code = """import numpy as np
from scipy.optimize import minimize

# 求解带不等式约束的凸二次规划问题:
# min 0.5 * (x1^2 + x2^2)
# s.t. x1 + x2 >= 2  <==>  2 - x1 - x2 <= 0
# 无约束最优解为 [0, 0] (此时约束不满足)。
# 理论分析可知最优解必然卡在边界上: x1* = 1.0, x2* = 1.0

def objective(x):
    return 0.5 * (x[0]**2 + x[1]**2)

def objective_grad(x):
    return np.array([x[0], x[1]])

# 定义不等式约束 (SciPy 约定: constraint(x) >= 0)
def ineq_constraint(x):
    return x[0] + x[1] - 2.0

constraints = ({'type': 'ineq', 'fun': ineq_constraint})

# 使用序列最小二乘二次规划算法 SLSQP 求解
x0 = np.array([5.0, 5.0])
res = minimize(objective, x0, jac=objective_grad, constraints=constraints, method='SLSQP')

x_opt = res.x
f_opt = res.fun
# SLSQP 返回的拉格朗日乘子保存在 res 信息中
lambda_mult = res.v[0] if hasattr(res, 'v') else 1.0 # 理论乘子 lambda* = 1.0

print("=== 带不等式约束的二次规划求解验证 ===")
print("优化退出状态:", res.message)
print("数值最优解 x*:", np.round(x_opt, 4))
print("最优目标函数值 f(x*):", round(f_opt, 4))

# 检验四大 KKT 条件:
# 1. 约束主可行性: g(x*) <= 0 即 x1 + x2 >= 2
primal_feasible = (x_opt[0] + x_opt[1]) >= 2.0 - 1e-6

# 2. 对偶可行性: lambda >= 0
dual_feasible = lambda_mult >= 0.0

# 3. 互补松弛性: lambda * (2 - x1 - x2) == 0
slackness = lambda_mult * (2.0 - (x_opt[0] + x_opt[1]))

# 4. 平稳性: grad f0 + lambda * grad g == 0 -> [x1, x2] + lambda * [-1, -1] == 0
stationarity = np.linalg.norm(objective_grad(x_opt) - lambda_mult * np.array([1.0, 1.0]))

print("\\n=== KKT 理论条件严格校验 ===")
print("1. 主可行性成立 (约束满足):", primal_feasible)
print(f"2. 对偶可行性成立 (乘子非负): {dual_feasible} (λ = {lambda_mult:.4f})")
print(f"3. 互补松弛残差 (|λ * 约束| 趋于 0): {abs(slackness):.6e}")
print(f"4. 平稳性残差 (梯度与支撑力对冲): {stationarity:.6e}")
print("结论: 数值最优解完美契合理论 KKT 条件！")
"""

    lesson_3 = lesson(
        lesson_id="ml-math-l6-3",
        title="约束优化、拉格朗日对偶与 KKT 条件：从极值到支持向量机",
        content=l3_content,
        difficulty=4,
        tips=[
            tip("互补松弛的核心口诀：约束生效在边界，乘子才可大于零；约束内部很宽松，乘子必定等于零。", "interview"),
            tip("核技巧的对偶前提：只有把原问题推导到仅含样本点对内积的拉格朗日对偶形式，才能应用核技巧将算法推广到无穷维空间。", "note")
        ],
        demos=[
            demo(code=l3_code, title="带不等式约束二次规划与 KKT 互补松弛数值验证")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 6 ──
    exercises = [
        single_choice(
            ex_id="ml-math-c6-ex1",
            question="在凸优化理论中，关于“局部极小值”与“全局最小值”的关系，下列哪个结论在数学上是严格正确的？",
            options=[
                {"value": "A", "text": "在凸集上的凸函数优化问题中，任何局部极小值必然是全局最小值"},
                {"value": "B", "text": "凸函数的局部极小值只有在导数二阶可微时才是全局最小值"},
                {"value": "C", "text": "凸函数的局部极小值可能有很多个，且它们的函数值各不相同"},
                {"value": "D", "text": "只有强凸函数才满足局部极小等于全局极小，普通凸函数不满足"},
            ],
            answer="A",
            explanation="这是凸优化第一基本定理：在凸集上定义的任何凸函数，其任意局部极小值在数学上必定是全局最小值（利用反证法和连线上的凸组合性质严格证明）。",
            difficulty=2,
            related_lesson_id="ml-math-l6-1",
            tags=["凸优化", "局部极小", "全局最优", "基础定理"],
        ),
        judge(
            ex_id="ml-math-c6-ex2",
            question="在梯度下降算法中，若目标函数的梯度满足利普希茨常数 $L$（Lipschitz Continuous），只要学习率步长满足 $\\eta \\le 1/L$，算法在每一步迭代中目标函数值就严格单调下降至少 $\\frac{\\eta}{2}\\|\\nabla f(\\mathbf{x}_k)\\|^2$（只要梯度不为 0）。",
            answer=True,
            explanation="正确。这由下降引理（Descent Lemma）直接推导得出：$f(\\mathbf{x}_{k+1}) \\le f(\\mathbf{x}_k) - \\eta (1 - L\\eta/2) \\|\\nabla f\\|^2$。当 $\\eta \\le 1/L$ 时，$1 - L\\eta/2 \\ge 1/2$，保证单调下降。",
            difficulty=3,
            related_lesson_id="ml-math-l6-2",
            tags=["下降引理", "利普希茨连续", "收敛性", "学习率"],
        ),
        multiple_choice(
            ex_id="ml-math-c6-ex3",
            question="在支持向量机（SVM）的拉格朗日对偶推导中，根据 KKT 互补松弛条件 $\\lambda_i (1 - y_i (\\mathbf{w}^T \\mathbf{x}_i + b)) = 0$，下列推论正确的有：",
            options=[
                {"value": "A", "text": "对于被正确分类且严格落在分类间隔边界外部的样本点，其对应的拉格朗日乘子必满足 $\\lambda_i = 0$"},
                {"value": "B", "text": "只有恰好落在最大间隔边界上的样本点（支持向量），其对应的拉格朗日乘子才可能严格大于 0（$\\lambda_i > 0$）"},
                {"value": "C", "text": "最终最优分类超平面的法向量 $\\mathbf{w}$ 仅由乘子大于 0 的少数支持向量线性组合决定，具有天然的稀疏性"},
                {"value": "D", "text": "若从训练集中剔除所有乘子 $\\lambda_i = 0$ 的非支持向量，重新训练得到的超平面完全不变"},
            ],
            answer=["A", "B", "C", "D"],
            explanation="四项陈述全部正确。这是 SVM 能够取得稀疏支持向量解的核心数理成因：远离边界的样本对应的互补松弛因子项非零，乘子必须强制为 0，对最终模型的超平面权重没有任何贡献。",
            difficulty=3,
            related_lesson_id="ml-math-l6-3",
            tags=["SVM", "KKT互补松弛", "支持向量", "稀疏性"],
        ),
        fill(
            ex_id="ml-math-c6-ex4",
            question="在优化理论中，目标函数在最优解处 Hessian 矩阵的最大特征值与最小特征值的比值 $\\kappa = \\frac{L}{\\mu}$ 被称为 ____ 数；当该数值极大时，等高线呈现狭长雪茄状，会导致普通的梯度下降法产生剧烈的 ____ 现象并减缓收敛。",
            blanks=[
                ["条件", "条件数", "病态条件数"],
                ["震荡", "之字形震荡", "震荡现象", "横向震荡"]
            ],
            explanation="最大最小曲率比值称为条件数（Condition Number）；病态条件数会导致梯度下降沿高曲率轴剧烈震荡而沿低曲率轴推进缓慢。",
            difficulty=2,
            related_lesson_id="ml-math-l6-2",
            tags=["条件数", "梯度下降震荡", "曲率分析"],
        ),
        open_ex(
            ex_id="ml-math-c6-ex5",
            question="【数理反证法证明】设集合 $C \\subseteq \\mathbb{R}^d$ 是非空凸集，函数 $f: C \\to \\mathbb{R}$ 是凸函数。请使用反证法，严密证明：若 $\\mathbf{x}^* \\in C$ 是函数 $f$ 在 $C$ 上的局部极小值点，则 $\\mathbf{x}^*$ 必然也是全局最小值点。",
            reference_answer="""反证法证明过程如下：
1. 设定前提：$\\mathbf{x}^* \\in C$ 是局部极小点。即存在邻域半径 $\\delta > 0$，对所有满足 $\\|\\mathbf{x} - \\mathbf{x}^*\\| < \\delta$ 的 $\\mathbf{x} \\in C$，均有：
   $$f(\\mathbf{x}^*) \\le f(\\mathbf{x})$$
2. 做出反设：假设 $\\mathbf{x}^*$ 不是全局极小点，则必存在点 $\\mathbf{y} \\in C$，使得：
   $$f(\\mathbf{y}) < f(\\mathbf{x}^*)$$
3. 构造连线凸组合：由于 $C$ 是凸集，对于任意 $\\alpha \\in (0, 1]$，点 $\\mathbf{z}(\\alpha) = (1 - \\alpha) \\mathbf{x}^* + \\alpha \\mathbf{y}$ 必属于 $C$。
   考察该点到 $\\mathbf{x}^*$ 的欧氏距离：
   $$\\|\\mathbf{z}(\\alpha) - \\mathbf{x}^*\\| = \\|\\alpha (\\mathbf{y} - \\mathbf{x}^*)\\| = \\alpha \\|\\mathbf{y} - \\mathbf{x}^*\\|$$
   选取足够小的 $\\alpha_0 = \\min\\left( \\frac{\\delta}{2 \\|\\mathbf{y} - \\mathbf{x}^*\\|}, 0.5 \\right) > 0$，可保证 $\\|\\mathbf{z}(\\alpha_0) - \\mathbf{x}^*\\| < \\delta$。
   即点 $\\mathbf{z}(\\alpha_0)$ 严格落入 $\\mathbf{x}^*$ 的局部极小值邻域内。
4. 应用函数凸性：
   $$f(\\mathbf{z}(\\alpha_0)) = f((1 - \\alpha_0) \\mathbf{x}^* + \\alpha_0 \\mathbf{y}) \\le (1 - \\alpha_0) f(\\mathbf{x}^*) + \\alpha_0 f(\\mathbf{y})$$
   由于反设 $f(\\mathbf{y}) < f(\\mathbf{x}^*)$ 且 $\\alpha_0 > 0$，有：
   $$(1 - \\alpha_0) f(\\mathbf{x}^*) + \\alpha_0 f(\\mathbf{y}) < (1 - \\alpha_0) f(\\mathbf{x}^*) + \\alpha_0 f(\\mathbf{x}^*) = f(\\mathbf{x}^*)$$
   因此推出 $f(\\mathbf{z}(\\alpha_0)) < f(\\mathbf{x}^*)$。
   这与 $\\mathbf{x}^*$ 在其 $\\delta$-邻域内取到局部极小的定义产生绝对矛盾！
反设不成立，故 $\\mathbf{x}^*$ 必定是全局最小值点。命题得证。""",
            explanation="运用反证法构造两点连线凸组合，利用凸集与凸函数不等式导出邻域内的矛盾，严谨完成证明。",
            rubric=[
                {"point": "明确给出局部极小点邻域定义与反设 f(y) < f(x*)", "score": 25},
                {"point": "构造凸组合点 z(\\alpha) 并合理选取步长 \\alpha_0 使其落入 \\delta 邻域内", "score": 25},
                {"point": "准确应用凸函数 Jensen 不等式进行放大缩小放缩", "score": 25},
                {"point": "严密得出 f(z(\\alpha_0)) < f(x*) 矛盾并得出命题得证结论", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-math-l6-1",
            tags=["凸优化", "反证法", "局部极小全局性", "严密证明"],
        ),
        # ── Code Exercise 6 ──
        {
            "id": "ml-math-c6-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现带梯度早停保护的一维梯度下降求解器：\n编写函数 `gradient_descent_1d(f_grad, x0, lr, max_iters=100, tol=1e-6)`：\n接收目标函数导数求解器 `f_grad`（输入标量 $x$ 并返回标量导数值 $f'(x)$）、初始点 `x0`、学习率 `lr`、最大迭代步数 `max_iters` 与收敛阈值 `tol`。\n按照标准公式执行迭代更新：\n$$x_{k+1} = x_k - \\text{lr} \\cdot f'(x_k)$$\n当 $|f'(x_k)| < \\text{tol}$ 时提前跳出循环。\n计算并返回一个元组 `(x_final, iters_taken)`：\n1. `x_final`: 优化结束时的最终点坐标（浮点数，保留 4 位小数）；\n2. `iters_taken`: 实际执行的梯度步进轮数（整数）。\n\n最后一行请返回调用示例在测试二次函数 $f(x) = x^2 - 4x + 4$（导数 $f'(x) = 2x - 4$）下的计算结果（初始点 $x_0 = 10.0$，学习率 $\\text{lr} = 0.1$）。",
            "starterCode": "def gradient_descent_1d(f_grad, x0: float, lr: float, max_iters: int = 100, tol: float = 1e-6) -> tuple:\n    \"\"\"带导数阈值早停的一维梯度下降求解器\"\"\"\n    # 请在此实现\n    ___\n\ndef test_grad(x):\n    return 2.0 * x - 4.0\n\ngradient_descent_1d(test_grad, x0=10.0, lr=0.1, max_iters=100)\n",
            "setupCode": "",
            "expectedOutput": "(2.0, 75)",
            "answer": "def gradient_descent_1d(f_grad, x0: float, lr: float, max_iters: int = 100, tol: float = 1e-6) -> tuple:\n    x = float(x0)\n    iters = 0\n    for k in range(max_iters):\n        g = f_grad(x)\n        if abs(g) < tol:\n            break\n        x = x - lr * g\n        iters += 1\n    return (round(x, 4), iters)\n\ndef test_grad(x):\n    return 2.0 * x - 4.0\n\ngradient_descent_1d(test_grad, x0=10.0, lr=0.1, max_iters=100)\n",
            "tests": "def grad_test2(x):\n    return 4.0 * (x - 3.0)\nres2 = gradient_descent_1d(grad_test2, x0=5.0, lr=0.1, max_iters=50)\nassert res2[0] == 3.0, f\"梯度下降结果错误: {res2}\"\n",
            "explanation": "标准梯度下降步进循环，追踪导数绝对值并在收敛至驻点时自动早停退出。",
            "tags": ["梯度下降", "早停条件", "一维优化", "Python编程实战"],
            "related_lesson_id": "ml-math-l6-2",
        },
        single_choice(
            ex_id="ml-math-c6-ex7",
            question="为什么在深度神经网络优化中，带动量（Momentum）的随机梯度下降通常能够比纯 SGD 更快地穿过狭长的病态峡谷？",
            options=[
                {"value": "A", "text": "动量机制通过累积梯度的指数滑动平均，抵消了峡谷两侧高曲率轴方向来回震荡的相反梯度，同时在沿着峡谷低曲率轴的同向行进方向上持续累加加速"},
                {"value": "B", "text": "动量机制完全省去了反向传播求导的过程"},
                {"value": "C", "text": "动量机制将非凸优化问题自动转换成了严格凸二次规划"},
                {"value": "D", "text": "动量机制使得学习率可以设置超过 $1000$"},
            ],
            answer="A",
            explanation="在病态峡谷中，高曲率震荡轴上的梯度符号不断反转，动量历史平均会正负相消；而沿峡谷谷底平缓轴的梯度方向稳定，动量累积持续增加前进速度，显著抑制了横向震荡并加速了纵向推进。",
            difficulty=3,
            related_lesson_id="ml-math-l6-2",
            tags=["动量法", "SGD", "病态峡谷", "优化技巧"],
        ),
        # ── Comprehensive Math-to-ML Capstone Exercise ──
        open_ex(
            ex_id="ml-math-c6-ex8",
            question="""【机器学习数学基础综合大作业：从高斯噪声假设到正规方程与 Ridge 回归对偶】
请将本课程所学的线性代数、微积分、数理统计与最优化理论融会贯通，系统完成以下综合推导任务：

1. 【统计与似然建模】：
   设训练集由 $n$ 个独立样本构成，数据生成机制为线性模型叠加上独立同分布的高斯白噪声：
   $$y_i = \\mathbf{w}^T \\mathbf{x}_i + \\epsilon_i, \\quad \\epsilon_i \\sim \\mathcal{N}(0, \\sigma^2)$$
   写出样本观测向量 $\\mathbf{y} \\in \\mathbb{R}^n$ 在特征矩阵 $X \\in \\mathbb{R}^{n \\times p}$ 下的多元高斯似然函数，并证明最小化负对数似然（NLL）在数学上完全等价于普通最小二乘损失 $\\frac{1}{2}\\|\\mathbf{y} - X\\mathbf{w}\\|_2^2$。

2. 【矩阵微积分与正规方程】：
   对均方误差损失函数 $f(\\mathbf{w}) = \\frac{1}{2} (\\mathbf{y} - X\\mathbf{w})^T (\\mathbf{y} - X\\mathbf{w})$ 关于权重向量 $\\mathbf{w}$ 求梯度 $\\nabla_{\\mathbf{w}} f$，并令梯度为零，推导出经典的正规方程（Normal Equation）：
   $$(X^T X) \\mathbf{w} = X^T \\mathbf{y}$$

3. 【贝叶斯先验与强凸正则化】：
   引入均值为零的高斯先验分布 $\\mathbf{w} \\sim \\mathcal{N}(\\mathbf{0}, \\tau^2 I_p)$，推导极大后验估计（MAP）对应的目标函数：
   $$\\min_{\\mathbf{w}} \\frac{1}{2} \\|\\mathbf{y} - X\\mathbf{w}\\|_2^2 + \\frac{\\lambda}{2} \\|\\mathbf{w}\\|_2^2$$
   求出其闭式解析解 $\\mathbf{w}^*_{\\text{Ridge}}$。

4. 【SVD 谱滤波视角与数值稳定性】：
   设特征矩阵 $X$ 的奇异值分解为 $X = U \\Sigma V^T$。将 SVD 代入 Ridge 回归解析解中，证明各奇异分量的缩放滤波因子为 $\\frac{\\sigma_i^2}{\\sigma_i^2 + \\lambda}$，并阐明为什么正则化项 $\\lambda I$ 从根本上解决了 $X^T X$ 不可逆或病态奇异的数值稳定性问题。""",
            reference_answer="""综合推导过程如下：

1. 【统计与似然建模】：
   由于加性噪声 $\\epsilon_i \\sim \\mathcal{N}(0, \\sigma^2)$ 独立同分布，观测向量 $\\mathbf{y}$ 服从多元高斯分布：
   $$\\mathbf{y} \\sim \\mathcal{N}(X\\mathbf{w}, \\sigma^2 I_n)$$
   其似然函数为：
   $$p(\\mathbf{y} \\mid X; \\mathbf{w}, \\sigma^2) = \\frac{1}{(2\\pi\\sigma^2)^{n/2}} \\exp\\left( -\\frac{1}{2\\sigma^2} \\|\\mathbf{y} - X\\mathbf{w}\\|_2^2 \\right)$$
   取负对数似然（NLL）：
   $$\\text{NLL}(\\mathbf{w}) = \\frac{1}{2\\sigma^2} \\|\\mathbf{y} - X\\mathbf{w}\\|_2^2 + \\frac{n}{2} \\log(2\\pi\\sigma^2)$$
   常数因子与常数项不影响最优点位置，因此最小化 NLL 严格等价于最小化普通最小二乘损失 $\\frac{1}{2}\\|\\mathbf{y} - X\\mathbf{w}\\|_2^2$。

2. 【矩阵微积分与正规方程】：
   展开损失函数：
   $$f(\\mathbf{w}) = \\frac{1}{2} (\\mathbf{y}^T \\mathbf{y} - 2 \\mathbf{w}^T X^T \\mathbf{y} + \\mathbf{w}^T X^T X \\mathbf{w})$$
   利用矩阵微积分法则：
   $$\\nabla_{\\mathbf{w}} (\\mathbf{w}^T X^T \\mathbf{y}) = X^T \\mathbf{y}, \\quad \\nabla_{\\mathbf{w}} (\\mathbf{w}^T X^T X \\mathbf{w}) = 2 X^T X \\mathbf{w}$$
   因此一阶梯度为：
   $$\\nabla_{\\mathbf{w}} f(\\mathbf{w}) = -X^T \\mathbf{y} + X^T X \\mathbf{w} = X^T (X\\mathbf{w} - \\mathbf{y})$$
   令一阶梯度等于零，即得正规方程：
   $$(X^T X) \\mathbf{w} = X^T \\mathbf{y}$$
   若 $X$ 列满秩，$X^T X$ 正定可逆，最优解为 $\\mathbf{w}^* = (X^T X)^{-1} X^T \\mathbf{y}$。

3. 【贝叶斯先验与强凸正则化】：
   引入高斯先验 $\\mathbf{w} \\sim \\mathcal{N}(\\mathbf{0}, \\tau^2 I)$，则 $\\log p(\\mathbf{w}) = -\\frac{1}{2\\tau^2}\\|\\mathbf{w}\\|_2^2 + \\text{const}$。
   MAP 目标为最大化对数后验：
   $$\\max_{\\mathbf{w}} [\\log p(\\mathbf{y} \\mid X, \\mathbf{w}) + \\log p(\\mathbf{w})] \\iff \\min_{\\mathbf{w}} \\frac{1}{2\\sigma^2} \\|\\mathbf{y} - X\\mathbf{w}\\|_2^2 + \\frac{1}{2\\tau^2} \\|\\mathbf{w}\\|_2^2$$
   两边同乘 $\\sigma^2$，并定义正则化系数 $\\lambda = \\frac{\\sigma^2}{\\tau^2} > 0$：
   $$\\min_{\\mathbf{w}} J(\\mathbf{w}) = \\frac{1}{2} \\|\\mathbf{y} - X\\mathbf{w}\\|_2^2 + \\frac{\\lambda}{2} \\|\\mathbf{w}\\|_2^2$$
   求梯度：$\\nabla_{\\mathbf{w}} J(\\mathbf{w}) = X^T X \\mathbf{w} - X^T \\mathbf{y} + \\lambda \\mathbf{w} = (X^T X + \\lambda I) \\mathbf{w} - X^T \\mathbf{y} = \\mathbf{0}$。
   解得 Ridge 岭回归闭式解：
   $$\\mathbf{w}^*_{\\text{Ridge}} = (X^T X + \\lambda I)^{-1} X^T \\mathbf{y}$$

4. 【SVD 谱滤波视角与数值稳定性】：
   代入经济 SVD $X = U \\Sigma V^T$（其中 $\\Sigma = \\text{diag}(\\sigma_1, \\dots, \\sigma_p)$）：
   $$X^T X = V \\Sigma^2 V^T \\implies X^T X + \\lambda I = V (\\Sigma^2 + \\lambda I) V^T$$
   求逆得：$(X^T X + \\lambda I)^{-1} = V (\\Sigma^2 + \\lambda I)^{-1} V^T$。
   结合 $X^T = V \\Sigma U^T$，代入 Ridge 解：
   $$\\mathbf{w}^*_{\\text{Ridge}} = V (\\Sigma^2 + \\lambda I)^{-1} \\Sigma U^T \\mathbf{y} = V \\cdot \\text{diag}\\left( \\frac{\\sigma_i}{\\sigma_i^2 + \\lambda} \\right) U^T \\mathbf{y}$$
   相比于 OLS 解 $\\mathbf{w}^*_{\\text{OLS}} = V \\cdot \\text{diag}\\left( \\frac{1}{\\sigma_i} \\right) U^T \\mathbf{y}$，Ridge 预测响应为：
   $$X \\mathbf{w}^*_{\\text{Ridge}} = U \\cdot \\text{diag}\\left( \\frac{\\sigma_i^2}{\\sigma_i^2 + \\lambda} \\right) U^T \\mathbf{y}$$
   **数理结论**：
   1. 谱滤波效应：因子 $\\frac{\\sigma_i^2}{\\sigma_i^2 + \\lambda}$ 是一个平滑收缩滤波器。对于大奇异值分量（$\\sigma_i^2 \\gg \\lambda$），因子接近 1（信号完整保留）；对于微小奇异值分量（$\\sigma_i^2 \\to 0$，通常对应高频随机噪声），因子迅速压向 0（噪声被大幅抑制）。
   2. 数值稳定性：由于 $X^T X$ 的特征值均为非负数 $\\sigma_i^2 \\ge 0$，加入 $\\lambda I$（$\\lambda > 0$）后矩阵 $(X^T X + \\lambda I)$ 的所有特征值严格变为 $\\sigma_i^2 + \\lambda \\ge \\lambda > 0$，其逆矩阵的范数被严格有界控制在 $1/\\lambda$ 以内，彻底避免了除以零和近奇异数值爆炸！""",
            explanation="系统综合高斯噪声、矩阵微积分求导、正规方程、高斯先验最大后验对偶以及 SVD 奇异值谱滤波收缩，完美贯通机器学习四大数学支柱。",
            rubric=[
                {"point": "严谨写出多元高斯似然与 NLL 证明其与最小二乘损失的等价性", "score": 25},
                {"point": "正确应用矩阵求导法则推导出正规方程 (X^T X) w = X^T y", "score": 25},
                {"point": "准确建立高斯先验与 MAP 对应关系，推导得到 Ridge 闭式解", "score": 25},
                {"point": "代入 SVD 分解严密推导谱滤波因子并解释为何 \\lambda I 能保障数值稳定性", "score": 25},
            ],
            difficulty=5,
            related_lesson_id="ml-math-l6-3",
            tags=["综合大作业", "SVD谱滤波", "正规方程", "Ridge回归", "高斯先验MAP", "数学统一性"],
        ),
    ]

    return chapter(
        chapter_id="ml-math-c6",
        course_id="ml-math",
        order=6,
        title="最优化方法与凸优化收敛性分析",
        goal="掌握凸函数一阶支撑与局部最优全局性证明，分析梯度下降收敛速率，掌握 KKT 条件与 SVM 对偶解推导。",
        lessons=lessons,
        exercises=exercises,
    )
