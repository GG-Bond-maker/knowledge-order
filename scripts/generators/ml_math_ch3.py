# -*- coding: utf-8 -*-
"""
Chapter 3: 多元微积分、梯度与自动微分 (Multivariable Calculus & Automatic Differentiation)
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_3():
    # ── Lesson 3.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握多元标量函数偏导数、全微分与梯度向量（Gradient Vector）的严格数学定义；
2. 理解方向导数（Directional Derivative）的几何内涵，掌握方向导数与梯度的点积表达式；
3. 运用柯西-施瓦茨不等式（Cauchy-Schwarz Inequality），严密证明函数在某点沿**负梯度方向**具有最快的下降速度；
4. 理解等高线（Contour Line）与超曲面法向量性质，证明梯度向量严格垂直于等高线的切空间；
5. 编写代码对二元非凸函数计算数值梯度与解析梯度，验证负梯度下降方向的局部最速性。

### 前置知识
- 一元微积分导数与切线斜率；
- 向量内积与余弦夹角公式。

### 问题背景与 ML 用途
几乎所有现代机器学习模型的训练过程（线性回归、逻辑回归、神经网络、大语言模型），本质上都是在求解一个高维非凸连续优化问题：
$$\\min_{\\boldsymbol{\\theta} \\in \\mathbb{R}^d} \\mathcal{L}(\\boldsymbol{\\theta})$$
其中参数量 $d$ 可以从几千个（线性模型）到数千亿个（如 GPT-4）。
在高维复杂的损失函数“崇山峻岭”中，我们不可能通过解析求根一步登天。计算机所能依赖的最核心“指南针”，就是多元微积分提供的**梯度向量**。
- 梯度指示了函数增长最快的方向；
- 负梯度则为参数更新指明了“最陡峭的下坡路”；
- 梯度为零的点则是所有极值点与鞍点的必要一阶条件。

### 直觉理解
- **盲人下山与手杖探测**：想象一位双眼被蒙住的登山者置身于浓雾笼罩的山坡上，他的目标是尽快走到山谷底部。由于看不到全貌，他只能用手中的登山杖在脚下周围 360 度画一个单位圆探测一圈（各个方向的方向导数），找出脚下坡度最陡峭向下的那个朝向，然后迈出一小步。这根手杖探测出的最陡下坡朝向，在数学上严格对应的就是**负梯度方向**！
- **垂直于等高线**：梯度的方向总是垂直于等高线。因为沿着等高线走，海拔高度保持不变（方向导数为 0）；而与等高线垂直的方向，穿过等高线最密集，高度变化最剧烈。

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **偏导数** | $\\frac{\\partial f}{\\partial x_i}$ | $\\lim_{h \\to 0} \\frac{f(\\mathbf{x} + h \\mathbf{e}_i) - f(\\mathbf{x})}{h}$ | 单个参数微调对损失的影响敏感度 |
| **梯度向量** | $\\nabla f(\\mathbf{x})$ | $\\left[ \\frac{\\partial f}{\\partial x_1}, \\dots, \\frac{\\partial f}{\\partial x_d} \\right]^T \\in \\mathbb{R}^d$ | 参数更新的一阶指南针、反向传播核心 |
| **方向导数** | $D_{\\mathbf{u}} f(\\mathbf{x})$ | $\\lim_{t \\to 0^+} \\frac{f(\\mathbf{x} + t\\mathbf{u}) - f(\\mathbf{x})}{t} = \\nabla f(\\mathbf{x})^T \\mathbf{u}$ | 任意单位方向 $\\mathbf{u}$ 上的函数瞬时变化率 |
| **等高线正交性** | $\\nabla f \\perp \\mathcal{T}_c$ | $\\nabla f(\\mathbf{x})^T \\mathbf{v} = 0, \\forall \\mathbf{v} \\in \\text{切空间}$ | 约束优化 KKT 条件法向量推导基础 |

### 数学原理与逐步推导
#### 1. 负梯度为最速下降方向的严格柯西-施瓦茨证明
设标量函数 $f: \\mathbb{R}^d \\to \\mathbb{R}$ 在点 $\\mathbf{x}$ 处可微。
对于任意给定的单位步进方向向量 $\\mathbf{u} \\in \\mathbb{R}^d$（满足 $\\|\\mathbf{u}\\|_2 = 1$），函数沿方向 $\\mathbf{u}$ 的方向导数可由梯度与方向向量的内积表示：
$$D_{\\mathbf{u}} f(\\mathbf{x}) = \\nabla f(\\mathbf{x})^T \\mathbf{u}$$
我们希望寻找使该方向导数最小（即下降速度最快、数值最负）的最优单位方向 $\\mathbf{u}^*$：
$$\\min_{\\|\\mathbf{u}\\|_2 = 1} \\nabla f(\\mathbf{x})^T \\mathbf{u}$$
根据柯西-施瓦茨不等式（Cauchy-Schwarz Inequality）：
$$|\\nabla f(\\mathbf{x})^T \\mathbf{u}| \\le \\|\\nabla f(\\mathbf{x})\\|_2 \\cdot \\|\\mathbf{u}\\|_2 = \\|\\nabla f(\\mathbf{x})\\|_2$$
去掉绝对值符号，可得内积的取值范围为：
$$-\\|\\nabla f(\\mathbf{x})\\|_2 \\le \\nabla f(\\mathbf{x})^T \\mathbf{u} \\le \\|\\nabla f(\\mathbf{x})\\|_2$$
当下界达到时，内积取得最小值 $-\\|\\nabla f(\\mathbf{x})\\|_2$。根据柯西-施瓦茨不等式的等号成立条件，当且仅当向量 $\\mathbf{u}$ 与 $\\nabla f(\\mathbf{x})$ 反向共线，即：
$$\\mathbf{u}^* = -\\frac{\\nabla f(\\mathbf{x})}{\\|\\nabla f(\\mathbf{x})\\|_2}$$
**定理得证**：在所有单位方向中，**负梯度方向 $-\\nabla f(\\mathbf{x})$ 使得方向导数取得全局最小值**，即函数在该方向上的瞬时下降速度最快！

### 几何图景与计算图
```
梯度与等高线几何关系：
      f(x) = 15      f(x) = 10      f(x) = 5
       )              )              )
       )      x_0 ────┼──────────────┼────▶ 负梯度方向 -∇f(x_0) (最速下坡)
       )       │      )              )
       )       ▼      )              )
            等高线切线 (沿切线方向导数为 0)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：以为最速下降方向是全局通往极小值的直线方向
> 负梯度方向仅仅是点 $\\mathbf{x}$ 邻域内的**局部极小下降方向**（一阶瞬时最陡），绝不等于从当前点直接连向全局最优点的全局捷径。如果曲面呈狭长狭谷状（如 Rosenbrock 香蕉函数），单纯沿着负梯度方向会发生剧烈的“之字形（Zig-zag）”横向震荡，前进极其缓慢。

### 工业界实践与工程考量
- 在深度学习工程中，单步纯负梯度下降容易在狭长峡谷中卡顿，因此现代优化器（如 SGD with Momentum、AdamW）引入了“动量（Momentum）”，利用梯度的历史滑动平均抑制高频震荡，加速沿低曲率平缓主轴的推进。
- 在数值校验时，为了验证反向传播代码中手写解析梯度（Analytical Gradient）的正确性，工程师会编写中心差分数值梯度（Gradient Check）进行断言测试：
$$\\frac{\\partial f}{\\partial x_i} \\approx \\frac{f(\\mathbf{x} + \\epsilon \\mathbf{e}_i) - f(\\mathbf{x} - \\epsilon \\mathbf{e}_i)}{2\\epsilon}$$

### 延伸思考与进阶阅读
- 阅读 Stephen Boyd《Convex Optimization》第 9.2 节：最速下降法的规范化形式与不同范数下的最速方向。
- 思考：如果在 $L_1$ 范数下度量步长（即要求 $\\|\\mathbf{u}\\|_1 \\le 1$），最速下降方向还是负梯度方向吗？它会产生什么样的稀疏更新？

### 本节小结
- 梯度向量汇集了所有坐标轴的偏导数，垂直于等高线；
- 柯西-施瓦茨不等式严密证明了负梯度方向是欧氏空间中唯一的局部最速下降方向。"""

    l1_code = """import numpy as np

# 定义一个二元凸二次损失函数: f(x1, x2) = 2*x1^2 + 5*x2^2 + 2*x1*x2 - 4*x1 - 6*x2
def loss_func(x):
    x1, x2 = x[0], x[1]
    return 2.0 * x1**2 + 5.0 * x2**2 + 2.0 * x1 * x2 - 4.0 * x1 - 6.0 * x2

# 解析梯度公式:
# df/dx1 = 4*x1 + 2*x2 - 4
# df/dx2 = 10*x2 + 2*x1 - 6
def analytical_gradient(x):
    x1, x2 = x[0], x[1]
    return np.array([4.0 * x1 + 2.0 * x2 - 4.0, 10.0 * x2 + 2.0 * x1 - 6.0])

# 中心差分数值梯度 (Gradient Check)
def numerical_gradient(f, x, eps=1e-5):
    grad = np.zeros_like(x, dtype=float)
    for i in range(len(x)):
        x_plus = x.copy()
        x_minus = x.copy()
        x_plus[i] += eps
        x_minus[i] -= eps
        grad[i] = (f(x_plus) - f(x_minus)) / (2.0 * eps)
    return grad

x_current = np.array([1.5, 2.0])
grad_ana = analytical_gradient(x_current)
grad_num = numerical_gradient(loss_func, x_current)

print("当前测试点:", x_current)
print("解析梯度 (精确值):", np.round(grad_ana, 6))
print("数值梯度 (有限差分):", np.round(grad_num, 6))
print("解析梯度与数值梯度相对误差:", np.linalg.norm(grad_ana - grad_num) / (np.linalg.norm(grad_ana) + 1e-10))

# 验证负梯度方向的最速下降性
# 取负梯度单位向量 vs 随机偏折单位向量
u_steepest = -grad_ana / np.linalg.norm(grad_ana)

# 随机构造一个偏离最速方向 45 度的单位方向
theta = np.pi / 4.0
rot = np.array([[np.cos(theta), -np.sin(theta)], [np.sin(theta), np.cos(theta)]])
u_other = rot @ u_steepest

# 计算步长 alpha = 0.01 后的函数下降量
alpha = 0.01
f_now = loss_func(x_current)
drop_steepest = f_now - loss_func(x_current + alpha * u_steepest)
drop_other = f_now - loss_func(x_current + alpha * u_other)

print(f"沿负梯度方向迈进 {alpha} 下降量:", round(drop_steepest, 6))
print(f"沿偏离 45 度方向迈进 {alpha} 下降量:", round(drop_other, 6))
print("负梯度方向下降量是否显著更优:", drop_steepest > drop_other)
"""

    lesson_1 = lesson(
        lesson_id="ml-math-l3-1",
        title="偏导数、方向导数与最速下降证明：优化的一阶指针",
        content=l1_content,
        difficulty=3,
        tips=[
            tip("柯西-施瓦茨等号条件：内积取极小值当且仅当向量反向共线，这是负梯度方向最速性的唯一数学根源。", "interview"),
            tip("数值梯度校验（Gradient Check）：在手写自定义算子反向传播时，必须使用中心差分数值梯度进行双精度断言，防止求导逻辑潜伏微小 Bug。", "note")
        ],
        demos=[
            demo(code=l1_code, title="解析梯度与有限差分数值梯度及最速下降验证")
        ]
    )

    # ── Lesson 3.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握向量值函数的雅可比矩阵（Jacobian Matrix）与高维线性微分近似；
2. 掌握标量场二阶偏导数矩阵——黑塞矩阵（Hessian Matrix）与 Schwarz 对称性定理；
3. 掌握多元函数的二阶泰勒展开式（Multivariable Second-Order Taylor Expansion）；
4. 通过 Hessian 矩阵的特征值正定性，严谨判定极小值、极大值与**鞍点（Saddle Point）**；
5. 理解高维深度学习优化曲面中“鞍点泛滥（Proliferation of Saddle Points）”理论与逃离鞍点机制。

### 前置知识
- 一阶梯度向量与实对称矩阵特征值；
- 一元二阶泰勒展开公式。

### 问题背景与 ML 用途
梯度只告诉了我们“往哪里走是下坡”，但无法告诉我们“坡度变化有多快”。
- 如果山路非常平坦，我们可以大步流星（增大步长）；
- 如果山路曲率极大，稍不留神就会冲出悬崖（步长过大导致爆炸）。
这种**曲率（Curvature）信息**由二阶导数矩阵——**Hessian 矩阵**完全刻画。
在现代机器学习中：
- 牛顿法（Newton's Method）与拟牛顿法（L-BFGS）利用 Hessian 矩阵的逆进行二阶曲率校正，实现超线性收敛；
- 损失曲面的几何特征分析（Hessian 谱分析）是解释深度神经网络泛化能力（如平坦极小值 Flat Minima）的核心理论工具；
- 雅可比矩阵则是残差网络、生成对抗网络（GAN）的谱归一化（Spectral Normalization）以及常微分方程神经网络（Neural ODE）的底层基础。

### 直觉理解
- **二次抛物面的一叶扁舟**：在多元微积分中，任何光滑函数局部都可以被一个二次抛物面贴近拟合。如果像碗一样底朝下（Hessian 正定，所有特征值大于 0），无论往哪走都是上坡，谷底就是真正的局部极小；如果像马鞍一样，沿着马背方向是极小，沿着马镫方向是极大（Hessian 特征值有正有负），这就是**鞍点**。
- **高维空间的鞍点噩梦**：在 1 维空间，极小值和极值点很常见。但在 $10^6$ 维的神经网络参数空间中，在临界点处所有特征值碰巧“全为正”的概率极其微小（接近 $(1/2)^{10^6}$），**绝大部分一阶临界点全都是高维鞍点**！因此现代深度学习优化算法的核心挑战在于“如何迅速逃离鞍点”，而非传统教科书关注的“如何避免陷入局部极小”。

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **雅可比矩阵** | $J \\in \\mathbb{R}^{m \\times n}$ | $J_{ij} = \\frac{\\partial f_i}{\\partial x_j}$ | 向量映射的一阶导数、反向传播局部导数 |
| **黑塞矩阵** | $H \\in \\mathbb{R}^{n \\times n}$ | $H_{ij} = \\frac{\\partial^2 f}{\\partial x_i \\partial x_j}$ | 损失曲面曲率度量、二阶优化方向 |
| **二阶泰勒展开** | $f(\\mathbf{x}+\\mathbf{p})$ | $\\approx f(\\mathbf{x}) + \\nabla f^T \\mathbf{p} + \\frac{1}{2} \\mathbf{p}^T H \\mathbf{p}$ | 局部二次模型逼近、牛顿法步长推导 |
| **正定 Hessian** | $H \\succ 0$ | 所有特征值 $\\lambda_i > 0$ | 临界点判定为严格局部极小值 |
| **不定 Hessian** | 符号不一 | 既有 $\\lambda_i > 0$ 又有 $\\lambda_j < 0$ | 临界点判定为鞍点（存在负曲率逃离方向） |

### 数学原理与逐步推导
#### 1. 多元二阶泰勒展开与牛顿方向推导
设函数 $f: \\mathbb{R}^n \\to \\mathbb{R}$ 二阶连续可微，在点 $\\mathbf{x}$ 邻域内做二阶泰勒展开：
$$f(\\mathbf{x} + \\mathbf{p}) \\approx m(\\mathbf{p}) = f(\\mathbf{x}) + \\nabla f(\\mathbf{x})^T \\mathbf{p} + \\frac{1}{2} \\mathbf{p}^T H(\\mathbf{x}) \\mathbf{p}$$
若我们希望找到使得二次模型 $m(\\mathbf{p})$ 最小的最优扰动步长 $\\mathbf{p}$，对其关于 $\\mathbf{p}$ 求导并令导数为零：
$$\\nabla_{\\mathbf{p}} m(\\mathbf{p}) = \\nabla f(\\mathbf{x}) + H(\\mathbf{x}) \\mathbf{p} = \\mathbf{0}$$
若 Hessian 矩阵 $H$ 正定可逆，则可直接解出：
$$\\mathbf{p}_{\\text{Newton}} = -H(\\mathbf{x})^{-1} \\nabla f(\\mathbf{x})$$
这就是经典的**牛顿迭代步（Newton Step）**。当目标函数本身就是严格凸二次型时，牛顿法仅需**一步（1 步迭代）**就能精确到达全局极小点！

#### 2. 临界点二阶判定法则
在梯度为零的临界点 $\\nabla f(\\mathbf{x}^*) = \\mathbf{0}$：
- 若 $H(\\mathbf{x}^*) \\succ 0$（正定）：$\\forall \\mathbf{p} \\neq \\mathbf{0}, \\mathbf{p}^T H \\mathbf{p} > 0$，故 $\\mathbf{x}^*$ 是孤立局部极小点；
- 若 $H(\\mathbf{x}^*) \\prec 0$（负定）：$\\forall \\mathbf{p} \\neq \\mathbf{0}, \\mathbf{p}^T H \\mathbf{p} < 0$，故 $\\mathbf{x}^*$ 是孤立局部极大点；
- 若 $H(\\mathbf{x}^*)$ 不定（既有正特征值也有负特征值）：沿负特征值对应的特征向量方向 $\\mathbf{v}_-$，有 $\\mathbf{v}_-^T H \\mathbf{v}_- = \\lambda_- \\|\\mathbf{v}_-\\|^2 < 0$，函数值严格下降，故 $\\mathbf{x}^*$ 是**鞍点**。

### 几何图景与计算图
```
二维马鞍面曲面示意：
        z
        │    鞍点 ∇f = 0
        │    /
        │   /  (沿 x 轴向上弯曲, λ_1 > 0)
   ─────┼──o───────────────────▶ x
       /│   \  (沿 y 轴向下弯曲, λ_2 < 0)
      / │    \
     /  │     ▼ 沿负特征向量方向可以迅速滑下逃离鞍点！
    y   │
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：为什么深度学习不用牛顿法直接算解？
> 虽然牛顿法二次收敛速度极快，但在现代深度学习中计算 $H^{-1}$ 是绝对不可行的：
> 1. 参数量 $n = 10^7$ 时，完整的 Hessian 矩阵包含 $10^{14}$ 个浮点数，需要数百 TB 显存，根本存不下；
> 2. 对其求逆的时间复杂度高达 $O(n^3)$；
> 3. 在非凸区域 Hessian 往往非正定，直接套用牛顿法甚至会把参数推向极大值或鞍点。

### 工业界实践与工程考量
- 工业界在需要二阶曲率校正但无法承受 $O(n^2)$ 存储时，采用**拟牛顿法 L-BFGS**（仅利用最近几步的梯度差值和参数差值，隐式逼近 Hessian 逆矩阵与向量的乘积），在逻辑回归、CRF 和浅层凸优化中性能卓越。
- 随机梯度下降（SGD）中的随机噪声（Mini-batch Noise）在理论上被证明能够天然地帮助优化器“震荡逃离”不稳定鞍点。

### 延伸思考与进阶阅读
- 阅读 Yann LeCun 等《The Loss Surfaces of Multilayer Networks》(2015)：高维非凸优化中鞍点与极小值的统计物理学分布。
- 思考：如果一个临界点的 Hessian 矩阵半正定，但存在特征值严格等于 0，该临界点的性质能仅凭二阶导数确定吗？

### 本节小结
- 雅可比矩阵是一阶向量偏导矩阵，黑塞矩阵是二阶曲率矩阵；
- 临界点的极值与鞍点属性完全由 Hessian 矩阵的特征谱正负性决定。"""

    l2_code = """import numpy as np

# 定义一个具有典型马鞍点特征的二元函数: f(x1, x2) = x1^2 - x2^2 + 0.1*x1^4
def saddle_func(x):
    return x[0]**2 - x[1]**2 + 0.1 * x[0]**4

# 解析一阶梯度与二阶 Hessian 矩阵
def gradient(x):
    return np.array([2.0 * x[0] + 0.4 * x[0]**3, -2.0 * x[1]])

def hessian(x):
    h11 = 2.0 + 1.2 * x[0]**2
    h12 = 0.0
    h21 = 0.0
    h22 = -2.0
    return np.array([[h11, h12], [h21, h22]])

# 考察原点 x* = [0, 0]
x_crit = np.array([0.0, 0.0])
grad_val = gradient(x_crit)
H_val = hessian(x_crit)

print("考察临界点:", x_crit)
print("该点梯度向量:", grad_val, "(梯度为 0，确认是临界点)")
print("该点 Hessian 矩阵:\\n", H_val)

# 对 Hessian 进行特征值分解
eigenvalues, eigenvectors = np.linalg.eigh(H_val)
print("Hessian 特征值:", eigenvalues)

# 临界点类型判定
if np.all(eigenvalues > 0):
    point_type = "严格局部极小点 (Local Minimum)"
elif np.all(eigenvalues < 0):
    point_type = "严格局部极大点 (Local Maximum)"
elif np.any(eigenvalues > 0) and np.any(eigenvalues < 0):
    point_type = "鞍点 (Saddle Point)"
else:
    point_type = "退化临界点 (Degenerate Critical Point)"

print(f"根据 Hessian 特征谱，该点被判定为: 【{point_type}】")

# 寻找负曲率逃离方向
neg_idx = np.where(eigenvalues < 0)[0][0]
escape_direction = eigenvectors[:, neg_idx]
print(f"逃离鞍点的负曲率方向向量 (对应负特征值 {eigenvalues[neg_idx]}):", escape_direction)

# 验证沿逃离方向函数值是否单调下降
delta = 0.1
f_before = saddle_func(x_crit)
f_after = saddle_func(x_crit + delta * escape_direction)
print(f"原点函数值: {f_before}, 沿负曲率方向迈出后函数值: {f_after} (函数值严格下降!)")
"""

    lesson_2 = lesson(
        lesson_id="ml-math-l3-2",
        title="雅可比矩阵、黑塞矩阵与二阶泰勒展开：曲率分析与鞍点识别",
        content=l2_content,
        difficulty=4,
        tips=[
            tip("高维优化第一定律：高维空间中绝大部分驻点是鞍点而非局部极小，优化算法的核心在于利用负曲率方向或随机扰动逃离鞍点。", "interview"),
            tip("二阶计算的算力瓶颈：Hessian 矩阵的存储与求逆复杂度随参数量成平方与立方增长，这是大模型训练普遍采用一阶/准一阶优化器的主因。", "performance")
        ],
        demos=[
            demo(code=l2_code, title="Hessian 特征谱分析与鞍点判定及负曲率逃离")
        ]
    )

    # ── Lesson 3.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握多元复合函数链式法则（Multivariate Chain Rule）的数学形式与雅可比乘积；
2. 理解计算图（Computational Graph）的有向无环图（DAG）拓扑结构与节点前向-反向传播机制；
3. 掌握**前向模式自动微分（Forward-mode AD）**与**反向模式自动微分（Reverse-mode AD）**的根本机制区别；
4. 从计算复杂度严格证明：为什么在“多输入、标量损失”的机器学习场景下，反向模式自动微分具有碾压性的 $O(1)$ 常数时间优势；
5. 编写一个迷你的纯 Python 标量反向自动微分引擎（Micro-Autograd），完成包含加法、乘法和幂次算子的复合函数求导与拓扑逆序反传。

### 前置知识
- 导数链式法则基础；
- 有向无环图（DAG）与拓扑排序基础。

### 问题背景与 ML 用途
如果现代深度学习模型必须依靠人类数学家手写所有参数的偏导数公式，那么整个深度学习浪潮根本不可能发生。
一个拥有 100 层深度、包含残差连接、注意力机制和数百万参数的神经网络，其解析导数公式展开后将达到数千页纸之巨，并且包含海量的重复公共子表达式。
**自动微分（Automatic Differentiation, AD）**是现代深度学习框架（PyTorch、JAX、TensorFlow）最核心的技术基石：
- 它既不是存在舍入误差与步长敏感的**数值微分**；
- 也不是会导致表达式指数膨胀爆炸的**符号微分**；
- 而是通过构建动态计算图，精确追踪基本算子并在拓扑图上应用链式法则的**程序化微分**！

### 直觉理解
- **工厂流水线与反向账单溯源**：前向计算就像一条装配流水线，原材料（输入变量）依次经过切削（加法）、打磨（乘法）、冲压（激活函数），最终产出一个总成本标量（Loss）。如果发现总成本超标了，逆向审计员（反向自动微分）会从最终账单开始逆流而上，按照每道工序的技术规格乘以局部系数（链式法则乘法），精准追溯出每一个源头原材料对总成本变动的贡献权重。

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **计算图** | $G = (V, E)$ | 有向无环图，节点为变量/算子，边为数据流向 | 模型前向执行与内存分配的底层抽象 |
| **多元链式法则** | $\\frac{\\partial z}{\\partial x}$ | $\\sum_{j} \\frac{\\partial z}{\\partial u_j} \\frac{\\partial u_j}{\\partial x}$ | 多个汇聚路径上的偏导数累加和 |
| **伴随变量（梯度）** | $\\bar{v}_i$ | $\\frac{\\partial \\mathcal{L}}{\\partial v_i}$ | 最终标量损失对中间节点 $v_i$ 的敏感度 |
| **VJP (向量-雅可比积)** | $\\mathbf{v}^T J$ | 反向模式核心算子：将输出梯度投影回输入空间 | PyTorch `torch.autograd.backward` 的原子操作 |
| **JVP (雅可比-向量积)** | $J \\mathbf{v}$ | 前向模式核心算子：计算单个输入扰动引起的输出变化 | JAX 正向敏感度分析、导数方向投影 |

### 数学原理与逐步推导
#### 1. 前向模式 vs 反向模式的计算复杂度深度对比
考虑一个具有 $n$ 个输入参数、最终输出 $m$ 个值的函数 $\\mathbf{f}: \\mathbb{R}^n \\to \\mathbb{R}^m$。其雅可比矩阵尺寸为 $m \\times n$。
计算图由若干中间复合变换组成：$f = f_k \\circ f_{k-1} \\circ \\dots \\circ f_1$。
根据链式法则，总雅可比矩阵等于各层局部雅可比矩阵的连乘：
$$J = J_k \\cdot J_{k-1} \\cdots J_2 \\cdot J_1$$
由于矩阵乘法满足结合律，我们有两种截然不同的计算顺序：
1. **前向模式（从右往左结合）**：
   $$((((J_k J_{k-1}) \\dots ) J_2) J_1) \\mathbf{e}_i$$
   每次用一个基底向量 $\\mathbf{e}_i \\in \\mathbb{R}^n$ 从右向左乘入，求出雅可比矩阵的一整**列**。
   为了求出所有 $n$ 个输入的梯度，必须进行 **$n$ 次独立的前向遍历**！时间复杂度与输入维度成正比：$O(n)$。
2. **反向模式（从左往右结合，即反向传播）**：
   $$\\mathbf{e}_j^T (J_k (J_{k-1} \\dots (J_2 J_1)))$$
   用输出空间的基底向量 $\\mathbf{e}_j \\in \\mathbb{R}^m$ 从左向右累乘，求出雅可比矩阵的一整**行**。
   为了求出所有 $m$ 个输出的梯度，必须进行 **$m$ 次反向遍历**！时间复杂度与输出维度成正比：$O(m)$。

#### 2. 深度学习的必然选择
在机器学习模型训练中：
- 待优化的输入参数量 $n$ 极其庞大（通常在 $10^6 \\sim 10^{11}$ 之间）；
- 但目标函数损失值（Loss）永远是一个单一的**标量**，即 $m = 1$！
- 若用前向模式，计算一次全局梯度需要运行上亿次前向传播，训练一步需要数年；
- 若用反向模式，**仅仅需要 1 次反向遍历（$m=1$），就能同时精确求得全部上亿个参数的偏导数**！这就是反向自动微分（Backpropagation）能够开启现代深度学习纪元的真正数学秘密。

### 几何图景与计算图
```
反向模式微分的拓扑传播机制：
输入层 x_1, x_2 ──前向传播──▶ 中间层 v_1, v_2 ──前向传播──▶ 标量损失 L
      │                             │                         │
      ▼                             ▼                         ▼
   dL/dx_i      ◀──反向累乘 VJP──  dL/dv_j      ◀──反向启动── dL/dL = 1.0
(拓扑逆序累加)                  (链式乘积)
```

### 认知负荷与常见误区辨析
> [!CAUTION] 常见误区：以为自动微分会把整张计算图持久常驻内存
> 反向模式在执行反向传播时，必须用到前向传播所计算出的中间激活值（Activation）。因此，前向图的所有中间张量必须在内存/显存中缓存，直到反向传播消费完毕后才能释放。这也是大模型训练显存占用（Activation Memory）往往远超模型参数本身的原因。现代系统采用“梯度检查点（Gradient Checkpointing）”技术，通过在反向时重算部分节点来牺牲算力换取显存。

### 工业界实践与工程考量
- PyTorch 采用基于 C++ 的动态磁带（Tape-based）自动微分引擎，在 Python 执行计算的同时动态记录操作并构建 DAG；
- JAX 采用基于纯函数的追踪编译器（Tracing Compiler），利用 XLA 将计算图静态编译为高度融合的 GPU 核函数，执行速度极快。

### 延伸思考与进阶阅读
- 阅读 Baydin et al.《Automatic Differentiation in Machine Learning: a Survey》(2018)。
- 思考：如果神经网络的损失不仅包含一阶梯度，还包含梯度本身的惩罚项（例如物理信息神经网络 PINN 中的偏微分方程残差），自动微分框架该如何计算“导数的导数（高阶导数）”？

### 本节小结
- 自动微分是现代深度学习的引擎，基于计算图与链式法则精确求导；
- 当多输入单标量输出时，反向模式自动微分以 $O(1)$ 的遍历代价求出全部梯度，是深度学习框架的核心基础。"""

    l3_code = """import math

# 从零实现轻量级标量反向自动微分引擎 (Micro-Autograd)
class Scalar:
    def __init__(self, data, _children=()):
        self.data = float(data)
        self.grad = 0.0
        self._backward = lambda: None
        self._prev = set(_children)

    def __add__(self, other):
        other = other if isinstance(other, Scalar) else Scalar(other)
        out = Scalar(self.data + other.data, (self, other))
        def _backward():
            self.grad += 1.0 * out.grad
            other.grad += 1.0 * out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Scalar) else Scalar(other)
        out = Scalar(self.data * other.data, (self, other))
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out

    def __pow__(self, p):
        out = Scalar(self.data ** p, (self,))
        def _backward():
            self.grad += p * (self.data ** (p - 1)) * out.grad
        out._backward = _backward
        return out

    def backward(self):
        # 1. 对计算图进行拓扑排序
        topo = []
        visited = set()
        def build_topo(v):
            if v not in visited:
                visited.add(v)
                for child in v._prev:
                    build_topo(child)
                topo.append(v)
        build_topo(self)

        # 2. 标量自身对自身的梯度为 1.0
        self.grad = 1.0

        # 3. 拓扑逆序反向传播
        for node in reversed(topo):
            node._backward()

# 构建复合前向表达式: L = (w1 * x1 + w2 * x2)^2
w1 = Scalar(2.0)
x1 = Scalar(3.0)
w2 = Scalar(-1.0)
x2 = Scalar(4.0)

# 前向传播
y = w1 * x1 + w2 * x2   # 2*3 + (-1)*4 = 6 - 4 = 2.0
loss = y ** 2           # 2.0^2 = 4.0

# 触发反向自动微分
loss.backward()

print("前向计算 Loss 值:", loss.data)
print("自动微分求得 dLoss/dw1:", w1.grad)
print("自动微分求得 dLoss/dw2:", w2.grad)

# 数学解析验证:
# dLoss/dw1 = 2 * y * x1 = 2 * 2.0 * 3.0 = 12.0
# dLoss/dw2 = 2 * y * x2 = 2 * 2.0 * 4.0 = 16.0
print("解析梯度校验: dLoss/dw1 是否精确等于 12.0:", math.isclose(w1.grad, 12.0))
print("解析梯度校验: dLoss/dw2 是否精确等于 16.0:", math.isclose(w2.grad, 16.0))
"""

    lesson_3 = lesson(
        lesson_id="ml-math-l3-3",
        title="复合函数链式法则与计算图反向传播：自动微分的算力密码",
        content=l3_content,
        difficulty=4,
        tips=[
            tip("反向模式的复杂度常数：反向传播仅需 1 次反向遍历即可得到关于全部输入参数的梯度，复杂度与输出维度成正比，完美契合深度学习标量 Loss 场景。", "interview"),
            tip("累加梯度而不能直接赋值：在实现反向传播时，必须使用 `self.grad += ...` 累加梯度，因为一个变量可能同时作为多个下游节点的输入（多元链式法则求和）。", "pitfall")
        ],
        demos=[
            demo(code=l3_code, title="微型纯 Python 标量反向自动微分引擎实现")
        ]
    )

    lessons = [lesson_1, lesson_2, lesson_3]

    # ── Exercises for Chapter 3 ──
    exercises = [
        single_choice(
            ex_id="ml-math-c3-ex1",
            question="在欧几里得空间中，标量可微函数 $f(\\mathbf{x})$ 在某点 $\\mathbf{x}_0$ 处的局部最速下降方向在数学上严格定义为什么？",
            options=[
                {"value": "A", "text": "负梯度方向 $-\\nabla f(\\mathbf{x}_0)$"},
                {"value": "B", "text": "正梯度方向 $\\nabla f(\\mathbf{x}_0)$"},
                {"value": "C", "text": "沿坐标轴投影值最大的单位向量"},
                {"value": "D", "text": "Hessian 矩阵最大特征值对应的特征向量"},
            ],
            answer="A",
            explanation="根据柯西-施瓦茨不等式，方向导数 $\\nabla f(\\mathbf{x})^T \\mathbf{u} \\ge -\\|\\nabla f(\mathbf{x})\\|_2 \\|\\mathbf{u}\\|_2$。当下界取得时，单位方向 $\\mathbf{u}$ 必与梯度向量反向共线，因此负梯度方向是唯一的瞬时最速下降方向。",
            difficulty=2,
            related_lesson_id="ml-math-l3-1",
            tags=["负梯度", "最速下降", "柯西施瓦茨不等式"],
        ),
        judge(
            ex_id="ml-math-c3-ex2",
            question="在深度学习的高维参数空间中，当且仅当临界点（一阶梯度为 0 的点）处的 Hessian 矩阵所有特征值都严格小于 0 时，该临界点才是一个严格局部极大值点。",
            answer=True,
            explanation="正确。Hessian 矩阵负定（所有特征值 $\\lambda_i < 0$）保证在该点沿任意方向移动时二阶曲率项 $\\mathbf{p}^T H \\mathbf{p} < 0$，函数值均严格小于临界点函数值，因此是严格局部极大值。",
            difficulty=2,
            related_lesson_id="ml-math-l3-2",
            tags=["Hessian特征值", "局部极大值", "曲率判定"],
        ),
        multiple_choice(
            ex_id="ml-math-c3-ex3",
            question="关于前向模式自动微分（Forward-mode AD）与反向模式自动微分（Reverse-mode AD），下列说法正确的有：",
            options=[
                {"value": "A", "text": "反向模式自动微分的时间复杂度与输出维数成正比，非常适合多输入、单标量输出的深度学习场景"},
                {"value": "B", "text": "前向模式自动微分在计算过程中无需缓存中间激活值，内存开销通常低于反向模式"},
                {"value": "C", "text": "反向模式自动微分本质上是计算向量-雅可比积（Vector-Jacobian Product, VJP）"},
                {"value": "D", "text": "在输入维度为 1、输出维度为 $10^5$ 的轨迹生成问题中，反向模式比前向模式效率更高"},
            ],
            answer=["A", "B", "C"],
            explanation="A、B、C 均正确。D 错误：在单输入、多输出场景下（如参数化曲线），前向模式只需 1 次前向即可求出全部导数，而反向模式需要 $10^5$ 次反向，此时前向模式远比反向模式高效。",
            difficulty=3,
            related_lesson_id="ml-math-l3-3",
            tags=["自动微分", "前向模式", "反向传播", "VJP"],
        ),
        fill(
            ex_id="ml-math-c3-ex4",
            question="在多元函数极值分析中，若某驻点处的梯度为零，但其 Hessian 矩阵的特征值既有正数又有负数，则该驻点在拓扑几何上被称为 ____ 点；反向自动微分在计算图中沿有向边的反方向遍历，其遍历顺序必须满足图论中的 ____ 排序逆序。",
            blanks=[
                ["鞍点", "马鞍点", "鞍"],
                ["拓扑", "拓扑排序", "DAG拓扑"]
            ],
            explanation="特征值正负混合的驻点为鞍点；反向传播必须确保一个节点的所有下游依赖项都已反向计算完毕后，才能反向计算该节点，因此必须遵循 DAG 的拓扑排序逆序。",
            difficulty=2,
            related_lesson_id="ml-math-l3-2",
            tags=["鞍点定义", "拓扑排序", "自动微分原理"],
        ),
        open_ex(
            ex_id="ml-math-c3-ex5",
            question="【严谨数理证明】请根据柯西-施瓦茨不等式（Cauchy-Schwarz Inequality），严密证明标量可微函数 $f: \\mathbb{R}^d \\to \\mathbb{R}$ 在点 $\\mathbf{x}$ 处沿单位向量方向 $\\mathbf{u}$（$\\|\\mathbf{u}\\|_2 = 1$）的方向导数，当且仅当 $\\mathbf{u} = -\\frac{\\nabla f(\\mathbf{x})}{\\|\\nabla f(\\mathbf{x})\\|_2}$ 时取得全局最小值（最速下降方向）。",
            reference_answer="""证明过程如下：
1. 根据方向导数的定义，标量可微函数 $f$ 沿单位方向 $\\mathbf{u}$ 的方向导数等于梯度与该方向的内积：
   $$D_{\\mathbf{u}} f(\\mathbf{x}) = \\nabla f(\\mathbf{x})^T \\mathbf{u}$$
2. 根据柯西-施瓦茨不等式，对于欧氏空间中的任意两非零向量，有：
   $$|\\nabla f(\\mathbf{x})^T \\mathbf{u}| \\le \\|\\nabla f(\\mathbf{x})\\|_2 \\cdot \\|\\mathbf{u}\\|_2$$
   由于 $\\mathbf{u}$ 为单位方向向量，$\\|\\mathbf{u}\\|_2 = 1$，因此：
   $$-\\ |\\nabla f(\\mathbf{x})\\|_2 \\le \\nabla f(\\mathbf{x})^T \\mathbf{u} \\le \\|\\nabla f(\\mathbf{x})\\|_2$$
3. 目标是寻找使方向导数最小的单位向量 $\\mathbf{u}^*$：
   $$\\min_{\\|\\mathbf{u}\\|_2 = 1} \\nabla f(\\mathbf{x})^T \\mathbf{u} = -\\|\\nabla f(\\mathbf{x})\\|_2$$
4. 由柯西-施瓦茨不等式等号成立条件可知，当且仅当向量 $\\mathbf{u}$ 与 $\\nabla f(\\mathbf{x})$ 反向共线，即存在负标量 $c < 0$ 使得 $\\mathbf{u} = c \\nabla f(\\mathbf{x})$ 时取得下界。
   结合单位模长约束 $\\|\\mathbf{u}\\|_2 = 1$，唯一解为：
   $$\\mathbf{u}^* = -\\frac{\\nabla f(\\mathbf{x})}{\\|\\nabla f(\\mathbf{x})\\|_2}$$
   命题得证，负梯度方向是最速下降方向。""",
            explanation="利用柯西-施瓦茨不等式及其等号成立条件，给出负梯度方向最速性的第一性原理严格证明。",
            rubric=[
                {"point": "正确写出方向导数与梯度的点积形式 D_u f = \\nabla f^T u", "score": 25},
                {"point": "正确引用柯西-施瓦茨不等式并代入单位向量模长条件", "score": 25},
                {"point": "严谨推导出方向导数的最小下界为 -||\\nabla f||_2", "score": 25},
                {"point": "准确应用等号成立条件推导出唯一反向共线单位向量表达式", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-math-l3-1",
            tags=["柯西施瓦茨", "数学证明", "最速下降"],
        ),
        # ── Code Exercise 3 ──
        {
            "id": "ml-math-c3-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现通用的高维多元函数有限中心差分数值梯度检验器：\n编写函数 `numerical_gradient(f, x, eps=1e-5)`：\n接收一个多元标量目标函数 `f`（接收一维 NumPy 数组并返回浮点数）和当前计算点 `x`（一维 NumPy 浮点数组），以及扰动步长 `eps`。\n使用中心差分公式：\n$$\\frac{\\partial f}{\\partial x_i} \\approx \\frac{f(\\mathbf{x} + \\epsilon \\mathbf{e}_i) - f(\\mathbf{x} - \\epsilon \\mathbf{e}_i)}{2\\epsilon}$$\n计算各分量偏导数，并返回包含所有偏导数的 Python 列表（各元素使用 `round(val, 4)` 保留 4 位小数）。\n\n最后一行请返回调用示例在测试二次曲面下的计算结果。",
            "starterCode": "import numpy as np\n\ndef numerical_gradient(f, x: np.ndarray, eps: float = 1e-5) -> list:\n    \"\"\"计算多元标量函数在点 x 处的有限中心差分数值梯度\"\"\"\n    # 请在此实现\n    ___\n\nA_demo = np.array([[2.0, 1.0], [1.0, 3.0]])\nb_demo = np.array([-1.0, 2.0])\ndef test_func(x_vec):\n    return float(x_vec.T @ A_demo @ x_vec + b_demo.T @ x_vec)\n\nx_test = np.array([1.0, 2.0])\nnumerical_gradient(test_func, x_test)\n",
            "setupCode": "",
            "expectedOutput": "[7.0, 16.0]",
            "answer": "import numpy as np\n\ndef numerical_gradient(f, x: np.ndarray, eps: float = 1e-5) -> list:\n    grad = np.zeros_like(x, dtype=float)\n    for i in range(len(x)):\n        x_plus = x.copy()\n        x_minus = x.copy()\n        x_plus[i] += eps\n        x_minus[i] -= eps\n        grad[i] = (f(x_plus) - f(x_minus)) / (2.0 * eps)\n    return np.round(grad, 4).tolist()\n\nA_demo = np.array([[2.0, 1.0], [1.0, 3.0]])\nb_demo = np.array([-1.0, 2.0])\ndef test_func(x_vec):\n    return float(x_vec.T @ A_demo @ x_vec + b_demo.T @ x_vec)\n\nx_test = np.array([1.0, 2.0])\nnumerical_gradient(test_func, x_test)\n",
            "tests": "def f2(x):\n    return float(x[0]**2 + 3 * x[1]**2 - 4 * x[0])\ng2 = numerical_gradient(f2, np.array([2.0, 1.0]))\nassert g2 == [0.0, 6.0], f\"数值梯度计算错误: {g2}\"\n",
            "explanation": "利用有限中心差分对每个自变量施加微小双向扰动，消除一阶泰勒误差项，以 O(eps^2) 精度数值逼近偏导数。",
            "tags": ["数值微分", "有限差分", "梯度检验", "NumPy编程实战"],
            "related_lesson_id": "ml-math-l3-1",
        },
        single_choice(
            ex_id="ml-math-c3-ex7",
            question="为什么在深度神经网络中，计算雅可比矩阵的**向量-雅可比积（VJP）**比显式实例化出完整的雅可比矩阵要高效得多？",
            options=[
                {"value": "A", "text": "因为 VJP 可以直接利用内积计算梯度，完全避开了实例化尺寸高达 (参数量 × 输出维数) 的超大密集雅可比矩阵及其天文级显存占用"},
                {"value": "B", "text": "因为 VJP 能够将非线性激活函数自动转化为线性函数"},
                {"value": "C", "text": "因为 VJP 只在 CPU 上执行，不受 GPU 显存带宽限制"},
                {"value": "D", "text": "因为 VJP 计算出的梯度没有任何浮点舍入误差"},
            ],
            answer="A",
            explanation="显式计算并存储超大规模雅可比矩阵 $J$ 在显存和算力上都是不可行的。反向传播只需要计算标量 Loss 对参数的梯度，即 $1 \\times m$ 向量与 $m \\times n$ 雅可比矩阵的乘积（VJP），结果直接是一个 $1 \\times n$ 的行向量，显存开销仅为 $O(n)$，无需存储 $O(m \\times n)$ 的矩阵。",
            difficulty=3,
            related_lesson_id="ml-math-l3-3",
            tags=["VJP", "显存优化", "反向传播机制"],
        ),
    ]

    return chapter(
        chapter_id="ml-math-c3",
        course_id="ml-math",
        order=3,
        title="多元微积分、梯度与自动微分",
        goal="掌握偏导数与梯度几何，严密证明负梯度最速下降，理解曲率 Hessian 矩阵与反向模式自动微分。",
        lessons=lessons,
        exercises=exercises,
    )
