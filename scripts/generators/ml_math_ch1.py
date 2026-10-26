# -*- coding: utf-8 -*-
"""
Chapter 1: 线性代数与向量空间几何 (Linear Algebra & Vector Space Geometry)
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_1():
    # ── Lesson 1.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握向量的代数表示与几何表示，理解向量线性组合（Linear Combination）与张成空间（Span）；
2. 深刻掌握内积（Dot Product）的几何定义与代数运算，熟练计算两向量的夹角余弦与正交性判决；
3. 从几何推导点到子空间的正交投影算子（Orthogonal Projection），推导投影矩阵 $P = A(A^T A)^{-1} A^T$；
4. 理解普通最小二乘法（OLS）在几何本质上正是观测向量在特征列空间上的正交投影；
5. 运行代码实现正交投影计算器，直观观察向量投影前后的残差正交性。

### 前置知识
- 基础解析几何直角坐标系概念；
- 矩阵转置与向量点积基础。

### 问题背景与 ML 用途
在机器学习中，数据首先是以特征向量的形式存在的。每一个用户、每一幅图像、每一篇新闻，都是高维空间中的一个点或一个向量：
$$\\mathbf{x} = [x_1, x_2, \\dots, x_d]^T \\in \\mathbb{R}^d$$
当我们需要判断两个用户的兴趣偏好是否相似时，本质是在计算其特征向量的**内积与余弦夹角**；
当我们需要用少量几个特征去逼近拟合复杂目标时，本质是在寻找目标向量在由这些特征张成的低维超平面上的**正交投影**。
没有正交投影，就无法理解线性回归、无法理解主成分分析（PCA），也无法理解支持向量机（SVM）的超平面间隔。

### 直觉理解
- **向量内积**：影子的长度乘以地面的长度。把向量 $\\mathbf{a}$ 投影到向量 $\\mathbf{b}$ 所在的直线上，形成的影子长度就是 $\\|\\mathbf{a}\\| \\cos\\theta$。如果两向量相互垂直（夹角 90 度），影子长度为 0，内积严格为 0（代表两特征完全正交、毫无冗余线性相关性）。
- **正交投影（最小二乘的几何化）**：你在平原上竖立了一根高耸的旗杆，旗杆顶端是真实标签向量 $\\mathbf{y}$。太阳正当顶垂直照射（正交投影），旗杆顶在地面（特征子空间）上投下的阴影点就是你的模型预测值 $\\hat{\\mathbf{y}}$。影子的顶点到真实旗杆顶点的垂直距离（残差），在地面上所有可能的点中是**绝对最短的**！

### 核心概念与符号对照表
| 核心概念 | 符号 | 数学定义 / 表达式 | 在机器学习中的核心用途 |
| --- | --- | --- | --- |
| **列向量** | $\\mathbf{x} \\in \\mathbb{R}^d$ | 默认均为 $d \\times 1$ 列向量 | 表示单个样本的 $d$ 个特征取值 |
| **张成空间** | $\\text{span}(\\mathbf{a}_1, \\dots, \\mathbf{a}_k)$ | $\\{\\sum c_i \\mathbf{a}_i \\mid c_i \\in \\mathbb{R}\\}$ | 模型所有可能预测值构成的假说超曲面 |
| **向量内积** | $\\mathbf{a} \\cdot \\mathbf{b}$ 或 $\\mathbf{a}^T \\mathbf{b}$ | $\\sum_{i=1}^d a_i b_i = \\|\\mathbf{a}\\| \\|\\mathbf{b}\\| \\cos\\theta$ | 相似度度量、线性前向传播输出 |
| **正交条件** | $\\mathbf{a} \\perp \\mathbf{b}$ | $\\mathbf{a}^T \\mathbf{b} = 0$ | 特征去相关、正交基底分解 |
| **投影矩阵** | $P_A$ | $A(A^T A)^{-1} A^T$ | 最小二乘正规方程、线性重构映射 |
| **残差向量** | $\\mathbf{e}$ | $\\mathbf{e} = \\mathbf{y} - \\hat{\\mathbf{y}}$ | 模型未捕获的误差，满足 $\\mathbf{e} \\perp C(A)$ |

### 数学原理与逐步推导
#### 1. 正交投影矩阵的严格几何推导
设矩阵 $A \\in \\mathbb{R}^{n \\times p}$ 的各列张成特征子空间 $C(A)$。
我们希望在子空间中找到一个最接近向量 $\\mathbf{y} \\in \\mathbb{R}^n$ 的投影点 $\\hat{\\mathbf{y}} = A \\mathbf{x}$。
根据几何最短距离原理，残差向量 $\\mathbf{e} = \\mathbf{y} - A \\mathbf{x}$ 必须**正交于子空间中的任意向量**，也就是说残差必须正交于矩阵 $A$ 的每一列：
$$A^T (\\mathbf{y} - A \\mathbf{x}) = \\mathbf{0}$$
将其展开：
$$A^T \\mathbf{y} - A^T A \\mathbf{x} = \\mathbf{0} \\implies A^T A \\mathbf{x} = A^T \\mathbf{y}$$
若 $A$ 列满秩，两边左乘 $(A^T A)^{-1}$，求出系数向量：
$$\\mathbf{x}^* = (A^T A)^{-1} A^T \\mathbf{y}$$
因此，投影点（最优预测值）为：
$$\\hat{\\mathbf{y}} = A \\mathbf{x}^* = \\underbrace{A (A^T A)^{-1} A^T}_{P} \\mathbf{y}$$
定义**投影矩阵** $P = A(A^T A)^{-1} A^T$。

#### 2. 投影矩阵的两大神奇代数性质
1. **幂等性（Idempotence）**：投影一次和投影一百次结果完全相同：
   $$P^2 = A(A^T A)^{-1} A^T A (A^T A)^{-1} A^T = A (A^T A)^{-1} A^T = P$$
2. **对称性（Symmetry）**：
   $$P^T = (A(A^T A)^{-1} A^T)^T = A ((A^T A)^{-1})^T A^T = A(A^T A)^{-1} A^T = P$$

### 逐步实现与代码解析
下面的 Python 脚本实现投影矩阵计算，并数值验证残差向量与特征子空间各列的点积是否精确为 0：

```python
import numpy as np

# 1. 构造一个 3 维空间中的二维子空间 (矩阵 A: 3x2)
A = np.array([
    [1.0, 0.0],
    [1.0, 1.0],
    [0.0, 1.0]
])

# 目标观测向量 y (不在子空间内)
y = np.array([2.0, 3.0, 4.0])

# 2. 计算正交投影矩阵 P = A (A^T A)^{-1} A^T
inv_AtA = np.linalg.inv(A.T @ A)
P = A @ inv_AtA @ A.T

# 计算投影点 y_hat 与残差向量 e
y_hat = P @ y
e = y - y_hat

print("=== 最小二乘正交投影几何验证 ===")
print("投影预测点 y_hat:", y_hat.round(4))
print("残差向量 e:      ", e.round(4))

# 3. 几何验证：残差必须与 A 的两列分别严格正交 (内积为 0)
dot_col0 = np.dot(e, A[:, 0])
dot_col1 = np.dot(e, A[:, 1])
print(f"残差与特征第0列的点积: {dot_col0:.6e} (理论为 0)")
print(f"残差与特征第1列的点积: {dot_col1:.6e} (理论为 0)")

# 4. 验证投影矩阵幂等性 P^2 == P
diff_P = np.max(np.abs(P @ P - P))
print(f"投影矩阵幂等性偏差 max|P^2 - P|: {diff_P:.6e}")
```

### 常见易错点与典型反例
1. **混淆行向量与列向量点积顺序**：
   - 若 $\\mathbf{a}, \\mathbf{b}$ 均为 $d \\times 1$ 列向量，$\\mathbf{a}^T \\mathbf{b}$ 是一个标量（内积）；而 $\\mathbf{a} \\mathbf{b}^T$ 是一个 $d \\times d$ 矩阵（外积，Outer Product）。外积在深度学习自注意力机制 $Q K^T$ 中随处可见，必须分清形状。
2. **以为任意两特征向量都能求夹角**：
   - 余弦相似度计算前提是向量不能为全零向量，否则分母分母模长为 0 引发除以零未定义。

### 知识联系与进阶桥梁
- **上承**：解析几何与坐标系；
- **下接**：1.2 节矩阵的四种乘法与线性变换空间几何；
- **算法桥梁**：本节推导的 $P = A(A^T A)^{-1} A^T$ 正是后续《经典机器学习算法》中普通多元线性回归（OLS）闭式解的几何本质。

### 本节总结与自查清单
- [ ] 为什么残差向量 $y - \\hat{y}$ 必须垂直于特征矩阵 $A$ 的列空间？
- [ ] 投影矩阵 $P$ 必须满足哪两个代数条件（对称性与幂等性）？
- [ ] 两个特征完全不相关的几何表述是什么？

### 权威来源与延伸阅读
- Gilbert Strang (2016). *Introduction to Linear Algebra*, Chapter 4: Orthogonality and Projections, Wellesley-Cambridge Press.
- Gilbert Strang (2019). *Linear Algebra and Learning from Data*, Chapter 1: The Geometry of Vectors and Matrices."""

    # ── Lesson 1.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握矩阵乘法的 4 种本质解读视角（列组合、行组合、秩 1 外积和、标量点积）；
2. 从线性映射几何视角，理解矩阵变换如何对高维数据流形进行旋转（Rotation）、反射（Reflection）与伸缩（Scaling）；
3. 掌握矩阵的四个基本子空间（列空间、零空间、行空间、左零空间）与奇异性判定；
4. 理解矩阵的秩（Rank）在数据降维、低秩压缩与矩阵分解中的决定性意义。

### 前置知识
- 1.1 节向量线性组合与正交投影；
- 矩阵行列式（Determinant）的计算直觉。

### 问题背景与 ML 用途
大多数初学者在大学线性代数课上学到的矩阵乘法，只是一套枯燥的“第 $i$ 行乘第 $j$ 列相加”的死板算术。
然而在现代机器学习中，如果我们只把矩阵看作数字表格，就永远无法理解：
- 为什么神经网络的一层前向计算 $y = Wx + b$ 能够把纠缠在一起的数据流形扭曲展开？
- 为什么矩阵低秩分解（Low-Rank Factorization）能够将数百万参数的 LLM 压缩 90% 以上（如 LoRA 技术）？
**矩阵的灵魂是线性变换**。矩阵的列代表变换后新基底的坐标落点，矩阵的秩代表数据真正蕴含的信息自由度。

### 直觉理解
- **矩阵乘向量 $A \\mathbf{x}$ 的列视角**：它绝不仅是一组点积，而是**用系数 $x_1, x_2, \\dots, x_n$ 对矩阵 $A$ 的各个列向量进行加权求和（线性组合）**！
  $$A \\mathbf{x} = x_1 \\mathbf{a}_1 + x_2 \\mathbf{a}_2 + \\dots + x_n \\mathbf{a}_n$$
- **外积求和视角 $A B = \\sum \\mathbf{a}_k \\mathbf{b}_k^T$**：矩阵相乘是若干个极度简单的“秩 1 骨架矩阵”层层堆叠叠加。现代大语言模型微调 LoRA正式利用此原理：把巨大的增量矩阵 $\\Delta W$ 拆解为两个细长低秩矩阵的外积 $B A$！
- **行列式的几何直觉**：行列式 $|\\det(A)|$ 就是把单位超立方体变换后，体积被放大了几倍。若 $\\det(A) = 0$，说明空间被拍扁降维了（体积坍缩为 0），信息发生不可逆丢失，因此矩阵不可逆！

### 核心概念与符号对照表
| 概念 | 符号 | 几何 / 代数定义 | 在机器学习中的核心场景 |
| --- | --- | --- | --- |
| **列空间** | $C(A)$ | $\\{\\mathbf{y} \\mid \\mathbf{y} = A\\mathbf{x}\\}$ | 模型能够拟合出的所有可能预测曲面 |
| **零空间** | $N(A)$ | $\\{\\mathbf{x} \\mid A\\mathbf{x} = \\mathbf{0}\\}$ | 被模型完全抹杀、不留痕迹的信息盲区方向 |
| **矩阵的秩** | $\\text{rank}(A)$ | 线性无关列/行向量的最大数量 | 数据有效特征维数、信息无冗余度 |
| **行列式** | $\\det(A)$ | 线性变换带来的超体积缩放因子 | 矩阵可逆判定、多元正态分布归一化常数 |
| **正交矩阵** | $Q^T Q = I$ | 列向量相互正交且长度为 1 | 纯旋转与镜像变换，严格保持距离与内积不变 |

### 数学原理与逐步推导
#### 1. 矩阵乘法的四大视角推导
设 $A \\in \\mathbb{R}^{m \\times k}, B \\in \\mathbb{R}^{k \\times n}$，记 $C = A B \\in \\mathbb{R}^{m \\times n}$：
1. **点积视角（Dot Product）**：$c_{ij} = \\text{row}_i(A) \\cdot \\text{col}_j(B)$；
2. **列向量组合视角（Column Combinations）**：
   $$C = [A \\mathbf{b}_1, A \\mathbf{b}_2, \\dots, A \\mathbf{b}_n]$$
   $C$ 的每一列都是 $A$ 的列向量的线性组合。**推论**：$C(AB) \\subseteq C(A)$，矩阵相乘绝不可能创造出超越前者的全新空间维度！
3. **行向量组合视角（Row Combinations）**：
   $C$ 的每一行都是 $B$ 的行向量的线性组合；
4. **外积之和视角（Sum of Rank-1 Outer Products）**：
   $$A B = \\sum_{r=1}^k \\mathbf{a}_r \\mathbf{b}_r^T$$
   其中 $\\mathbf{a}_r$ 为 $A$ 的第 $r$ 列（$m \\times 1$），$\\mathbf{b}_r^T$ 为 $B$ 的第 $r$ 行（$1 \\times n$）。每一项 $\\mathbf{a}_r \\mathbf{b}_r^T$ 都是一个极简的秩 1 矩阵（Rank-1 Matrix）。

#### 2. 正交矩阵的刚性保距特性（Isometry）
设 $Q$ 为正交矩阵（$Q^T Q = I$），则对任意向量 $\\mathbf{x}$，变换后的欧氏模长完全守恒：
$$\\|Q\\mathbf{x}\\|_2^2 = (Q\\mathbf{x})^T (Q\\mathbf{x}) = \\mathbf{x}^T (Q^T Q) \\mathbf{x} = \\mathbf{x}^T I \\mathbf{x} = \\|\\mathbf{x}\\|_2^2$$
变换后的两向量内积亦完全守恒：
$$(Q\\mathbf{x})^T (Q\\mathbf{z}) = \\mathbf{x}^T Q^T Q \\mathbf{z} = \\mathbf{x}^T \\mathbf{z}$$
**结论**：正交变换是一种刚体刚性变换（仅包含空间旋转和镜像），绝对不拉伸、不压缩任何空间尺度，因此在数值优化算法（如 QR 分解、SVD）中具有极佳的数值稳定性。

### 逐步实现与代码解析
下面的 Python 脚本用代码分解演示矩阵相乘的外积拆解视角，以及正交矩阵的保模长特性：

```python
import numpy as np

# 1. 验证矩阵乘法即为秩 1 外积之和
A = np.array([[1.0, 2.0], [3.0, 4.0]])
B = np.array([[5.0, 6.0], [7.0, 8.0]])

# 标准矩阵乘法
C_standard = A @ B

# 外积之和分解
C_outer = np.zeros_like(A)
for k in range(A.shape[1]):
    col_a = A[:, k:k+1]      # m x 1
    row_b = B[k:k+1, :]      # 1 x n
    rank1 = col_a @ row_b    # 秩 1 矩阵
    C_outer += rank1

print("=== 矩阵乘法：外积之和视角验证 ===")
print("标准矩阵乘法 C:\\n", C_standard)
print("外积累加求和 C:\\n", C_outer)
print("两者是否完全一致:", np.allclose(C_standard, C_outer))

# 2. 验证正交矩阵的保距离与保夹角特性 (旋转矩阵)
theta = np.pi / 4  # 旋转 45 度
Q = np.array([
    [np.cos(theta), -np.sin(theta)],
    [np.sin(theta),  np.cos(theta)]
])

v = np.array([3.0, 4.0])
v_rot = Q @ v

print("\\n=== 正交旋转变换验证 ===")
print(f"原始向量模长:   ||v||     = {np.linalg.norm(v):.4f}")
print(f"旋转后向量模长: ||Qv||    = {np.linalg.norm(v_rot):.4f} (严格相等！)")
```

### 常见易错点与典型反例
1. **以为非奇异矩阵可以改变维度**：
   - 只要 $A$ 是满秩方阵，它对空间做的是可逆仿射拉伸，绝不丢失信息。一旦矩阵降秩（$\\text{rank}(A) < d$），空间必定坍缩至低维子空间，此时零空间存在非零向量，信息发生永久丢失。

### 知识联系与进阶桥梁
- **上承**：1.1 节向量投影；
- **下接**：1.3 节各种范数几何；
- **大模型关联**：低秩自适应微调（LoRA）通过将巨大权重增量分解为 $W_0 + \\Delta W = W_0 + B A$（其中 $B \\in \\mathbb{R}^{d \\times r}, A \\in \\mathbb{R}^{r \\times k}, r \\ll d$），完全依赖了本节外积求和秩约束的代数理论。

### 本节总结与自查清单
- [ ] 为什么说矩阵乘向量 $Ax$ 是对 $A$ 的列进行线性组合？
- [ ] 什么是正交矩阵？正交矩阵乘法为什么不会改变向量的欧几里得范数？
- [ ] 两个秩为 1 的矩阵相加，得到的矩阵秩最大是多少？

### 权威来源与延伸阅读
- Gilbert Strang (2016). *Introduction to Linear Algebra*, Chapter 2: Solving Linear Equations, Wellesley-Cambridge Press.
- Gilbert Strang (2019). *Linear Algebra and Learning from Data*, Section 1.3: Matrix Multiplication."""

    # ── Lesson 1.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 掌握向量范数（Norm）的严格数学公理化三要素（非负性、齐次性、三角不等式）；
2. 绘制并对比 $L_0, L_1, L_2, L_p, L_\\infty$ 范数在二维平面上的单位等高线球几何形态；
3. 掌握矩阵诱导范数（谱范数）与矩阵元素级范数（Frobenius 范数、核范数）的数学定义；
4. 理解核范数（Nuclear Norm）作为矩阵秩（Rank）凸松弛在推荐系统矩阵补全（Matrix Completion）中的核心用途；
5. 运行代码实现不同范数度量计算器与单位球点阵生成。

### 前置知识
- 绝对值与欧氏距离公式；
- 矩阵奇异值分解（SVD）初步概念。

### 问题背景与 ML 用途
在机器学习目标函数中，我们无时无刻不在与范数打交道：
- 线性回归中的正则化惩罚：为何岭回归加的是 $\\|\\mathbf{w}\\|_2^2$，而 Lasso 加的是 $\\|\\mathbf{w}\\|_1$？
- 生成对抗网络（GAN）中的谱归一化（Spectral Normalization）：为何要约束判别器权重的谱范数 $\\|W\\|_2 \\le 1$ 满足 Lipschitz 连续？
- 推荐系统协同过滤中的缺失矩阵恢复：为何把离散不可导的 $\\min \\text{rank}(X)$ 松弛替换为核范数 $\\min \\|X\\|_*$？
**范数是高维空间中衡量大小、长度与复杂度的通用标尺**。

### 直觉理解
- **$L_1$ 范数（菱形钻石）**：网格出租车距离。沿坐标轴行走，各轴交点处具有尖锐棱角，具有强烈的稀疏导向；
- **$L_2$ 范数（光滑圆球）**：欧氏物理直线距离。各向同性对称，处处光滑可导，偏向让所有权重均匀平滑衰减；
- **$L_\\infty$ 范数（正方形盒子）**：木桶原理，只取决于所有特征维度中绝对值最大的那个最长分量；
- **核范数（Nuclear Norm）**：矩阵奇异值的绝对值之和。正如 $L_1$ 范数是向量稀疏（非零元最少）的凸松弛，核范数是矩阵低秩（非零奇异值最少）的极佳凸松弛替代品！

### 核心概念与符号对照表
| 范数名称 | 数学表达式 | 几何单位球形态 | 机器学习核心应用场景 |
| --- | --- | --- | --- |
| **$L_1$ 范数** | $\\|\\mathbf{x}\\|_1 = \\sum_{i=1}^d |x_i|$ | 菱形 / 正多面体（有尖角） | Lasso 回归、稀疏编码、特征选择 |
| **$L_2$ 范数** | $\\|\\mathbf{x}\\|_2 = \\sqrt{\\sum_{i=1}^d x_i^2}$ | 完美超球体（光滑） | 岭回归、SVM 间隔、权重衰减 |
| **$L_\\infty$ 范数** | $\\|\\mathbf{x}\\|_\\infty = \\max_i |x_i|$ | 超立方体（正方形盒子） | 对抗样本扰动约束（FGSM 攻击） |
| **Frobenius 范数** | $\\|A\\|_F = \\sqrt{\\sum \\sum a_{ij}^2}$ | 矩阵元素视作向量求 $L_2$ | 矩阵重建误差、自编码器重建损失 |
| **谱范数 (2-范数)** | $\\|A\\|_2 = \\sigma_{\\max}(A)$ | 矩阵能带来的最大伸缩比率 | Lipschitz 连续性约束、梯度爆炸防护 |
| **核范数** | $\\|A\\|_* = \\sum \\sigma_i(A)$ | 奇异值向量的 $L_1$ 范数 | 低秩矩阵补全、推荐系统 NetFlix 挑战赛 |

### 数学原理与逐步推导
#### 1. 范数的公理化严格定义
设空间 $V$ 为实向量空间，映射 $\\|\\cdot\\|: V \\rightarrow \\mathbb{R}$ 称作范数，当且仅当满足以下三大公理：
1. **非负性与非退化性**：对任意 $\\mathbf{x} \\in V$，$\\|\\mathbf{x}\\| \\ge 0$；且 $\\|\\mathbf{x}\\| = 0 \\iff \\mathbf{x} = \\mathbf{0}$；
2. **绝对齐次性**：对任意标量 $\\alpha \\in \\mathbb{R}$，$\\|\\alpha \\mathbf{x}\\| = |\\alpha| \\|\\mathbf{x}\\|$；
3. **次可加性（三角不等式）**：对任意 $\\mathbf{x}, \\mathbf{y} \\in V$，$\\|\\mathbf{x} + \\mathbf{y}\\| \\le \\|\\mathbf{x}\\| + \\|\\mathbf{y}\\|$。

#### 2. 矩阵诱导算子范数（Operator Norm）
对于矩阵 $A \\in \\mathbb{R}^{m \\times n}$，其由向量 $p$-范数诱导的矩阵算子范数定义为：
$$\\|A\\|_p = \\sup_{\\mathbf{x} \\neq \\mathbf{0}} \\frac{\\|A \\mathbf{x}\\|_p}{\\|\\mathbf{x}\\|_p} = \\max_{\\|\\mathbf{x}\\|_p = 1} \\|A \\mathbf{x}\\|_p$$
特别地，当 $p=2$ 时，矩阵谱范数恰好等于该矩阵的**最大奇异值**：
$$\\|A\\|_2 = \\sqrt{\\lambda_{\\max}(A^T A)} = \\sigma_1(A)$$
**物理意义**：谱范数度量了当向量通过矩阵 $A$ 变换后，几何长度被放大的最大倍数。如果一个神经网络权重的谱范数被严格限制在 1 以内，整个网络就是 1-Lipschitz 连续的，从数学上杜绝了梯度爆炸！

### 逐步实现与代码解析
下面的 Python 脚本展示如何使用 NumPy 与 SciPy 计算向量的各阶范数以及矩阵的 Frobenius 范数、谱范数与核范数：

```python
import numpy as np

# 1. 向量范数计算
v = np.array([-3.0, 4.0, 0.0])
print("=== 向量范数度量 ===")
print(f"向量 v: {v}")
print(f"L1 范数 (曼哈顿): ||v||_1   = {np.linalg.norm(v, ord=1):.4f} (| -3 | + | 4 | + 0 = 7)")
print(f"L2 范数 (欧氏):   ||v||_2   = {np.linalg.norm(v, ord=2):.4f} (sqrt(9 + 16) = 5)")
print(f"L-inf 范数 (最大): ||v||_inf = {np.linalg.norm(v, ord=np.inf):.4f} (max(|-3|, |4|) = 4)")

# 2. 矩阵范数计算
M = np.array([
    [1.0, 2.0],
    [0.0, 3.0]
])

norm_fro = np.linalg.norm(M, ord='fro')
norm_spec = np.linalg.norm(M, ord=2)   # 谱范数 (最大奇异值)
U, S, Vt = np.linalg.svd(M)
norm_nuc = np.sum(S)                   # 核范数 (奇异值之和)

print("\\n=== 矩阵范数度量 ===")
print("矩阵 M:\\n", M)
print(f"Frobenius 范数 ||M||_F  = {norm_fro:.4f} (sqrt(1^2 + 2^2 + 0 + 3^2) = sqrt(14))")
print(f"谱范数 ||M||_2 (最大奇异值) = {norm_spec:.4f}")
print(f"核范数 ||M||_* (奇异值之和) = {norm_nuc:.4f}")
```

### 常见易错点与典型反例
1. **误以为 $L_0$ 范数是严格的数学范数**：
   - $L_0$ 范数被通俗指代为“非零元素的个数”。但严格来说，$L_0$ 根本不满足齐次性公理（例如 $\\|2 \\mathbf{x}\\|_0 = \\|\\mathbf{x}\\|_0 \\neq 2 \\|\\mathbf{x}\\|_0$），因此在数学上不是范数，无法直接进行连续凸优化。这正是必须用 $L_1$ 范数作为凸松弛替代的根因。

### 知识联系与进阶桥梁
- **上承**：1.2 节矩阵变换与正交矩阵；
- **下接**：第 2 章特征值与奇异值分解（SVD）。

### 本节总结与自查清单
- [ ] 范数公理化三要素是什么？
- [ ] 为什么谱范数等于矩阵的最大奇异值？
- [ ] 核范数在低秩矩阵补全中扮演了什么角色？

### 权威来源与延伸阅读
- Gene H. Golub, Charles F. Van Loan (2013). *Matrix Computations*, Section 2.3: Matrix Norms, Johns Hopkins.
- Stephen Boyd, Lieven Vandenberghe (2004). *Convex Optimization*, Appendix A: Mathematical Background, Cambridge University Press."""

    lessons = [
        lesson(
            lesson_id="ml-math-l1-1",
            title="向量、内积与几何正交投影：特征空间的距离与夹角",
            content=l1_content,
            difficulty=2,
            tips=[
                tip("几何第一性原理：普通线性回归最小二乘正规方程 (X^T X) w = X^T y 的几何本质，就是要求残差向量 y - Xw 必须垂直正交于 X 的列空间！", "interview"),
                tip("投影矩阵判决：判断一个方阵 P 是否为正交投影矩阵，只需快速检验其是否满足两个条件：① P^T = P（对称性）；② P^2 = P（幂等性）。", "performance"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 简单正交投影验证
a = np.array([2.0, 1.0])  # 直线方向向量
y = np.array([3.0, 4.0])  # 待投影点

# 投影公式: p = (a^T y / a^T a) * a
proj = (np.dot(a, y) / np.dot(a, a)) * a
residual = y - proj

print(f"待投影向量 y: {y}")
print(f"投影点 p:     {proj.round(3)}")
print(f"残差向量 e:   {residual.round(3)}")
print(f"残差与直线垂直验证 dot(e, a) = {np.dot(residual, a):.6f}")
""",
                    lang="python",
                    title="二维平面向量正交投影极简算例",
                )
            ],
        ),
        lesson(
            lesson_id="ml-math-l1-2",
            title="矩阵乘法、秩与线性变换：高维数据的空间旋转与伸缩",
            content=l2_content,
            difficulty=2,
            tips=[
                tip("高频面试核心：请以列组合视角解释矩阵与向量乘法 Ax 的几何内涵。为什么大模型 LoRA 微调要将巨型权重增量矩阵拆为两个低秩矩阵相乘？", "interview"),
                tip("正交矩阵特性：若 Q 为正交矩阵，则 ||Qx|| == ||x|| 严格成立。正交变换保持几何欧氏长度和内积角度完全不变，无任何数值失真。", "note"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 验证矩阵秩对列空间维度的限制
# 构造一个 3x3 矩阵，但第3列是前两列的和 (秩=2)
A = np.array([
    [1.0, 2.0, 3.0],
    [4.0, 5.0, 9.0],
    [7.0, 8.0, 15.0]
])

rank_A = np.linalg.matrix_rank(A)
det_A = np.linalg.det(A)
print(f"矩阵秩: rank(A) = {rank_A} (只有 2 列线性无关)")
print(f"行列式: det(A) = {det_A:.6f} (体积坍缩为 0，矩阵奇异不可逆！)")
""",
                    lang="python",
                    title="降秩与矩阵奇异性数值模拟",
                )
            ],
        ),
        lesson(
            lesson_id="ml-math-l1-3",
            title="范数与距离度量：L1、L2 与核范数在机器学习中的几何物理意义",
            content=l3_content,
            difficulty=3,
            tips=[
                tip("L0 vs L1 澄清：L0 范数（非零元个数）不满足绝对齐次性，严格不是范数且不可导（NP-Hard）；L1 范数是其在凸优化框架下的最佳凸松弛（Convex Relaxation）。", "interview"),
                tip("深度学习稳定性：在对抗攻击与防御中，FGSM 攻击通常限制扰动向量的 L-inf 范数不超过 epsilon，使得单个像素变化微小但累积效应最大化。", "note"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 计算矩阵奇异值并求核范数
M = np.array([[1.0, 0.0], [0.0, 2.0], [3.0, 0.0]])
U, s, Vt = np.linalg.svd(M)

print("矩阵 M:\\n", M)
print("矩阵奇异值:", s.round(4))
print(f"核范数 (奇异值求和): {np.sum(s):.4f}")
print(f"谱范数 (最大奇异值): {np.max(s):.4f}")
""",
                    lang="python",
                    title="矩阵奇异值与核范数计算",
                )
            ],
        ),
    ]

    # ── Exercises for Chapter 1 ──
    exercises = [
        single_choice(
            ex_id="ml-math-c1-ex1",
            question="设矩阵 $A \\in \\mathbb{R}^{n \\times p}$ 列满秩，其正交投影矩阵定义为 $P = A(A^T A)^{-1} A^T$。关于该投影矩阵的性质，以下哪项叙述是错误的？",
            options=[
                {"value": "A", "text": "对任意向量 $\\mathbf{y}$，向量 $P \\mathbf{y}$ 必定落在矩阵 $A$ 的列空间中"},
                {"value": "B", "text": "该矩阵满足幂等性，即 $P^2 = P$"},
                {"value": "C", "text": "该矩阵必定是对称矩阵，即 $P^T = P$"},
                {"value": "D", "text": "该矩阵必定是满秩可逆方阵，其行列式始终等于 1"},
            ],
            answer="D",
            explanation="选项 D 错误。当 $p < n$ 时，投影矩阵将 $n$ 维空间中的任意向量投影到一个 $p$ 维的真子空间中，其秩严格等于 $p$（$\\text{rank}(P) = p < n$），因此 $P$ 是奇异不可逆的，其行列式为 0（除非 $p=n$ 满空间映射）。选项 A、B、C 均为投影矩阵的标准数学性质。",
            difficulty=2,
            related_lesson_id="ml-math-l1-1",
            tags=["正交投影", "投影矩阵", "线性代数"],
        ),
        judge(
            ex_id="ml-math-c1-ex2",
            question="若矩阵 $Q$ 为实正交矩阵（满足 $Q^T Q = I$），则对空间中任意两个非零向量 $\\mathbf{x}$ 与 $\\mathbf{y}$，经 $Q$ 变换后的向量夹角余弦与变换前的夹角余弦严格相等，且向量模长保持守恒。",
            answer=True,
            explanation="正确。由于 $(Q\\mathbf{x})^T (Q\\mathbf{y}) = \\mathbf{x}^T Q^T Q \\mathbf{y} = \\mathbf{x}^T \\mathbf{y}$，正交变换严格保持两向量内积守恒；同时 $\\|Q\\mathbf{x}\\|_2 = \\|\\mathbf{x}\\|_2$，模长守恒。因此夹角余弦 $\\frac{(Qx)^T (Qy)}{\\|Qx\\| \\|Qy\\|} = \\frac{x^T y}{\\|x\\| \\|y\\|}$ 严格恒等，具有完全的保距保角刚体变换特性。",
            difficulty=2,
            related_lesson_id="ml-math-l1-2",
            tags=["正交矩阵", "刚体变换", "内积保距"],
        ),
        multiple_choice(
            ex_id="ml-math-c1-ex3",
            question="关于范数（Norm）在机器学习中的数学本质与应用，以下哪些说法是正确的？",
            options=[
                {"value": "A", "text": "向量范数必须满足非负性、绝对齐次性与三角不等式三大公理"},
                {"value": "B", "text": "$L_1$ 范数的单位等高线在坐标轴上具有尖锐棱角顶点，这是 Lasso 回归产生稀疏解的几何第一性原理"},
                {"value": "C", "text": "矩阵的谱范数（2-范数）在数值上严格等于该矩阵的最大奇异值 $\\sigma_{\\max}$，度量了该矩阵对向量长度的最大放大倍数"},
                {"value": "D", "text": "$L_0$ 范数（统计非零元素个数）是一个连续光滑的凸函数，可以直接使用梯度下降求解"},
            ],
            answer=["A", "B", "C"],
            explanation="选项 A、B、C 均正确。选项 D 错误：$L_0$ 范数不满足绝对齐次性，且处处导数为 0（非光滑非凸且离散），极小化 $L_0$ 属于 NP-hard 组合优化难题，梯度下降法完全无法求解。",
            difficulty=3,
            related_lesson_id="ml-math-l1-3",
            tags=["范数公理", "L1正则", "谱范数", "L0缺陷"],
        ),
        fill(
            ex_id="ml-math-c1-ex4",
            question="在普通最小二乘法（OLS）中，残差向量 $\\mathbf{e} = \\mathbf{y} - \\mathbf{X}\\hat{\\mathbf{w}}$ 与特征矩阵 $\\mathbf{X}$ 的任意列向量点积严格等于 ____；若方阵 $A$ 满足 $A^2 = A$，则该矩阵在代数上被称为 ____ 矩阵。",
            blanks=[
                ["0", "0.0", "零"],
                ["幂等", "幂等矩阵"]
            ],
            explanation="根据最小二乘正交几何性质，残差向量垂直于特征列空间，因此与任意列向量内积恒为 0；平方等于自身的矩阵在代数上称为【幂等（Idempotent）矩阵】。",
            difficulty=2,
            related_lesson_id="ml-math-l1-1",
            tags=["最小二乘", "几何正交", "幂等矩阵"],
        ),
        open_ex(
            ex_id="ml-math-c1-ex5",
            question="【推导与综合分析题】\n1. 设矩阵 $A \\in \\mathbb{R}^{n \\times p}$ 列满秩，求证：正交投影矩阵 $P = A(A^T A)^{-1} A^T$ 的迹（Trace）严格等于矩阵 $A$ 的秩 $p$；\n2. 解释该数学结论在统计线性回归模型中自由度（Degrees of Freedom）判定上的物理意义。",
            reference_answer="""1. 证明投影矩阵的迹等于其秩：
利用矩阵迹（Trace）的循环移位性质（Cyclic Permutation Property）：对于任意形状相配的矩阵 $X, Y$，满足 $\\text{Tr}(X Y) = \\text{Tr}(Y X)$。
将投影矩阵 $P$ 视为两个子块相乘：令 $X = A$，令 $Y = (A^T A)^{-1} A^T$。
则：
$$\\text{Tr}(P) = \\text{Tr}\\left( A \\cdot (A^T A)^{-1} A^T \\right) = \\text{Tr}\\left( (A^T A)^{-1} A^T \\cdot A \\right)$$
观察括号内右侧项：
$$(A^T A)^{-1} (A^T A) = I_p$$
其中 $I_p$ 为 $p \\times p$ 的单位矩阵。
因此：
$$\\text{Tr}(P) = \\text{Tr}(I_p) = p = \\text{rank}(A)$$
证毕。

2. 在统计线性回归自由度上的物理意义：
- 投影矩阵 $P$（在统计学中又称帽矩阵 Hat Matrix，$\\hat{\\mathbf{y}} = H \\mathbf{y}$）将一个 $n$ 维连续空间中的随机向量投影到一个 $p$ 维的线性超平面上。
- 其迹 $\\text{Tr}(P) = p$ 代表该线性模型在拟合过程中消耗的【有效参数自由度（Effective Degrees of Freedom）】。
- 相应地，残差投影矩阵 $M = I - P$ 的迹为 $\\text{Tr}(I_n - P) = n - p$。这在统计学中严格解释了为什么普通最小二乘残差方差的无偏估计量分母必须是 $n - p$（而不是 $n$）：因为数据中原有的 $n$ 个自由度，被模型估计消耗了 $p$ 个，只剩下 $n - p$ 个自由度用于客观估计残差噪声方差 $\\sigma^2$。""",
            explanation="本题将矩阵代数技巧（迹的循环性）与经典统计学中的线性回归自由度惩罚建立起严密的数学映射。",
            rubric=[
                {"point": "熟练运用矩阵迹的循环移位性质 Tr(XY) = Tr(YX)", "score": 25},
                {"point": "严谨推导得到 Tr(P) = Tr(I_p) = p", "score": 25},
                {"point": "明确指出投影矩阵的迹对应模型拟合消耗的有效自由度 p", "score": 25},
                {"point": "合理解释残差方差估计除以 (n - p) 自由度校正的几何与统计成因", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-math-l1-1",
            tags=["矩阵的迹", "自由度推导", "数学物理意义"],
        ),
        # ── Code Exercise 1 ──
        {
            "id": "ml-math-c1-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现列满秩特征子空间的正交投影与残差检验器：\n编写函数 `calc_orthogonal_projection(A, y)`：\n接收一个 2D NumPy 数组 $A \\in \\mathbb{R}^{n \\times p}$（特征矩阵，假定列满秩）和一个 1D NumPy 数组 $y \\in \\mathbb{R}^n$（目标观测向量）。\n计算并返回一个元组 `(y_hat, residual_norm)`：\n1. `y_hat`: 投影预测点向量 $\\hat{y} = A(A^T A)^{-1} A^T y$（一维 NumPy 浮点数组）；\n2. `residual_norm`: 残差向量 $e = y - \\hat{y}$ 的欧氏范数 $\\|e\\|_2$（浮点数，保留 4 位小数）。\n\n最后一行请返回调用示例在给定测试数据下的计算结果（元组中的数组使用 `np.round(..., 4)` 保留 4 位小数）。",
            "starterCode": "import numpy as np\n\ndef calc_orthogonal_projection(A: np.ndarray, y: np.ndarray) -> tuple:\n    \"\"\"计算目标向量在特征列空间上的正交投影点与残差模长\"\"\"\n    # 请在此实现\n    ___\n\nA_demo = np.array([[1.0, 0.0], [1.0, 1.0], [0.0, 1.0]])\ny_demo = np.array([2.0, 3.0, 4.0])\ny_hat_demo, res_demo = calc_orthogonal_projection(A_demo, y_demo)\n(list(np.round(y_hat_demo, 4)), res_demo)\n",
            "setupCode": "",
            "expectedOutput": "([1.6667, 3.3333, 3.6667], 0.5774)",
            "answer": "import numpy as np\n\ndef calc_orthogonal_projection(A: np.ndarray, y: np.ndarray) -> tuple:\n    P = A @ np.linalg.inv(A.T @ A) @ A.T\n    y_hat = P @ y\n    e = y - y_hat\n    res_norm = float(round(float(np.linalg.norm(e)), 4))\n    return (y_hat, res_norm)\n\nA_demo = np.array([[1.0, 0.0], [1.0, 1.0], [0.0, 1.0]])\ny_demo = np.array([2.0, 3.0, 4.0])\ny_hat_demo, res_demo = calc_orthogonal_projection(A_demo, y_demo)\n(list(np.round(y_hat_demo, 4)), res_demo)\n",
            "tests": "A_t = np.array([[1.0], [1.0]])\ny_t = np.array([3.0, 5.0])\ny_h, r_n = calc_orthogonal_projection(A_t, y_t)\nassert list(np.round(y_h, 2)) == [4.0, 4.0], f\"投影点计算有误: {y_h}\"\nassert round(r_n, 4) == 1.4142, f\"残差模长计算有误: {r_n}\"\n",
            "explanation": "根据正规方程闭式解 P = A (A^T A)^{-1} A^T，求解投影点并计算几何残差模长。",
            "tags": ["投影矩阵", "正交分解", "NumPy矩阵计算"],
            "related_lesson_id": "ml-math-l1-1",
        },
        single_choice(
            ex_id="ml-math-c1-ex7",
            question="在推荐系统与低秩矩阵分解中，由于矩阵的真实秩 $\\text{rank}(X)$ 是非凸且离散不可导的，因此在凸优化求解时，学术界与工业界通常将其替换为哪种范数作为最优的凸松弛（Convex Relaxation）？",
            options=[
                {"value": "A", "text": "核范数（Nuclear Norm，即矩阵奇异值之和 $\\sum \\sigma_i$）"},
                {"value": "B", "text": "Frobenius 范数（矩阵各元素平方和开根号）"},
                {"value": "C", "text": "谱范数（矩阵的最大奇异值 $\\sigma_{\\max}$）"},
                {"value": "D", "text": "行列式的绝对值（$|\\det(X)|$）"},
            ],
            answer="A",
            explanation="正如 $L_1$ 范数是向量稀疏性（$L_0$ 范数）的紧致凸松弛一样，矩阵的核范数（Nuclear Norm / Trace Norm，定义为所有非零奇异值之和）是矩阵非零奇异值个数（即矩阵的秩）在单位球内的最优凸近似，广泛用于低秩矩阵补全与协同过滤。",
            difficulty=3,
            related_lesson_id="ml-math-l1-3",
            tags=["核范数", "低秩分解", "凸松弛"],
        ),
    ]

    return chapter(
        chapter_id="ml-math-c1",
        course_id="ml-math",
        order=1,
        title="线性代数与向量空间几何",
        goal="掌握向量空间与正交投影的代数推导，透彻理解矩阵变换的四大乘法视角与范数几何体系。",
        lessons=lessons,
        exercises=exercises,
    )
