# -*- coding: utf-8 -*-
"""
Chapter 1: 神经网络基石与前向感知机 (Perceptrons & Feedforward Neural Networks)
Course: ml-deep-learning
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_1():
    # ── Lesson 1.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握人工神经网络的发展简史与生物神经元抽象计算模型（McCulloch-Pitts 神经元）；
2. 掌握 Rosenblatt 感知机（Perceptron, 1958）的数学定义、决策超平面与权重更新收敛定理；
3. 深刻理解感知机的线性本质与著名的“XOR（异或问题）”线性不可分困境；
4. 掌握明斯基（Marvin Minsky, 1969）对单层感知机理论局限的批判如何引发第一次人工智能寒冬；
5. 编写代码从零实现感知机学习算法，并在可分与异或数据上直观对比收敛与震荡。

### 前置知识
- 向量内积与超平面点法式方程；
- 阶跃函数与二分类符号判决。

### 问题背景与 ML 用途
今天，当具有数万亿参数的超大规模多模态大语言模型（如 GPT-4、Gemini、Claude）展现出惊人的推理能力时，其最深层的原子构件依然起源于 70 年前对人脑神经元电信号传递的数学抽象。
- 1943 年，McCulloch 与 Pitts 提出了历史上第一个神经元数学模型（M-P 神经元），开启了计算神经科学；
- 1958 年，Frank Rosenblatt 发明了**感知机（Perceptron）**，首次实现了由数据驱动、能够自主学习权重的自适应机器；
- 理解感知机的几何分割机理与非线性表达瓶颈（XOR 危机），是彻底读懂为何需要多层感知机（MLP）以及非线性激活函数的历史起点。

### 直觉理解
- **神经元的开火阈值**：生物神经元的树突接收成千上万个来自其他神经元的输入电信号。每个突触对信号有不同的传导效率（权重 $w$）。当这些信号在胞体中累加汇总，超过了某个神经膜电位阈值 $\theta$ 时，神经元突然“开火”（Fire），沿着轴突向外发射一个动作电位脉冲（输出 1）；如果没达标，就保持静默（输出 0）。
- **非线性的阻隔（为什么 1 根棍子分不开异或？）**：如果在一个四方形桌面上，左下角 $(0, 0)$ 和右上角 $(1, 1)$ 放绿球，左上角 $(0, 1)$ 和右下角 $(1, 0)$ 放红球。单层感知机就像一根笔直的硬木棍。你无论在桌面上怎么摆弄这根木棍，都绝对无法只切一刀就把红球和绿球彻底分开！这就是异或问题。

### 核心概念与符号对照表
| 核心概念 | 符号 / 公式 | 数学与物理意义 | 核心局限 / 作用 |
| --- | --- | --- | --- |
| **M-P 神经元** | $y = f\\left( \\sum w_i x_i - \\theta \\right)$ | 仿生加权求和与固定阈值对比 | 权重是人工硬编码设计的，无法自动学习 |
| **感知机模型** | $f(\\mathbf{x}) = \\text{sign}(\\mathbf{w}^T \\mathbf{x} + b)$ | 超平面二分类器，输出 $\\{-1, +1\\}$ | 能够自主学习权重；但仅能解决**线性可分**问题 |
| **感知机损失** | $L(\\mathbf{w}, b) = -\\sum_{x_i \\in \\mathcal{M}} y_i (\\mathbf{w}^T \\mathbf{x}_i + b)$ | 误分类点到超平面的无模长几何距离之和 | 仅对误分类样本 $\\mathcal{M}$ 进行惩罚求导 |
| **Novikoff 定理** | $k \\le (R / \\gamma)^2$ | 感知机在线学习算法在有限步内必然收敛的界限 | 保证了线性可分数据集上的绝对收敛性 |

### 数学原理与逐步推导
#### 1. 感知机学习算法与随机梯度下降
设训练样本 $(\\mathbf{x}_i, y_i)$，其中 $y_i \\in \\{-1, +1\\}$。
超平面为 $\\mathbf{w}^T \\mathbf{x} + b = 0$。
若样本 $(\\mathbf{x}_i, y_i)$ 被正确分类，则 $y_i (\\mathbf{w}^T \\mathbf{x}_i + b) > 0$。
若样本被误分类，则 $y_i (\\mathbf{w}^T \\mathbf{x}_i + b) < 0$。误分类点到超平面的带符号距离为 $-\\frac{y_i (\\mathbf{w}^T \\mathbf{x}_i + b)}{\\|\\mathbf{w}\\|}$。
忽略分母，定义误分类损失函数为：
$$L(\\mathbf{w}, b) = -\\sum_{x_i \\in \\mathcal{M}} y_i (\\mathbf{w}^T \\mathbf{x}_i + b)$$
对单个误分类样本计算梯度：
$$\\nabla_{\\mathbf{w}} L = -y_i \\mathbf{x}_i, \\quad \\frac{\\partial L}{\\partial b} = -y_i$$
采用随机梯度下降（SGD），每次遇到一个误分类样本 $(\\mathbf{x}_i, y_i)$ 时，执行参数逆梯度更新：
$$\\mathbf{w} \\leftarrow \\mathbf{w} + \\eta y_i \\mathbf{x}_i$$
$$b \\leftarrow b + \\eta y_i$$
其中 $\\eta \\in (0, 1]$ 为学习率。这一更新将超平面法向量朝该样本的方向旋转拉拽，迫使未来对该样本的判定趋向正确。

#### 2. XOR（异或）不可分的代数严格证明
异或布尔运算真值表如下：
$x_1=0, x_2=0 \\implies y=0$（或 -1）
$x_1=1, x_2=0 \\implies y=1$
$x_1=0, x_2=1 \\implies y=1$
$x_1=1, x_2=1 \\implies y=0$（或 -1）
假设存在一组感知机参数 $(w_1, w_2, b)$ 能解决该问题，则必须同时满足以下 4 个不等式：
1. $w_1 \\cdot 0 + w_2 \\cdot 0 + b < 0 \\implies b < 0$
2. $w_1 \\cdot 1 + w_2 \\cdot 0 + b > 0 \\implies w_1 + b > 0$
3. $w_1 \\cdot 0 + w_2 \\cdot 1 + b > 0 \\implies w_2 + b > 0$
4. $w_1 \\cdot 1 + w_2 \\cdot 1 + b < 0 \\implies w_1 + w_2 + b < 0$
将不等式 2 和 3 相加：
$$(w_1 + b) + (w_2 + b) > 0 \\implies w_1 + w_2 + 2b > 0$$
结合不等式 4：$w_1 + w_2 + b < 0$，两式相减：
$$(w_1 + w_2 + 2b) - (w_1 + w_2 + b) > 0 - 0 \\implies b > 0$$
**出现毁灭性矛盾**：与不等式 1（$b < 0$）产生直接冲突！
**证毕**：单层感知机在代数上 100% 不可能拟合异或逻辑！

### 真实代码示例与分析
下面展示从零实现感知机，验证其在与门（AND，线性可分）上快速收敛，而在异或门（XOR，线性不可分）上陷入死循环震荡："""

    l1_code = """import numpy as np

class ToyPerceptron:
    def __init__(self, lr=0.1, max_epochs=50):
        self.lr = lr
        self.max_epochs = max_epochs
        self.w = None
        self.b = 0.0

    def fit(self, X, y):
        n_samples, n_features = X.shape
        self.w = np.zeros(n_features)
        self.b = 0.0
        
        for epoch in range(1, self.max_epochs + 1):
            errors = 0
            for i in range(n_samples):
                # 判决条件 sign(w^T x + b)
                pred = 1 if (np.dot(self.w, X[i]) + self.b) >= 0 else -1
                if pred != y[i]:
                    # 误分类样本执行参数更新
                    self.w += self.lr * y[i] * X[i]
                    self.b += self.lr * y[i]
                    errors += 1
            if errors == 0:
                return f"第 {epoch} 轮成功收敛停机！无任何误分类。"
        return f"达到最大上限 {self.max_epochs} 轮，无法收敛（陷入不可分震荡）！"

# 1. 测试线性可分任务: 逻辑与 (AND)
X_and = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y_and = np.array([-1, -1, -1, 1])  # 只有 (1, 1) 为 +1

p_and = ToyPerceptron(lr=0.5, max_epochs=20)
res_and = p_and.fit(X_and, y_and)
print("=== 1. 逻辑与 (AND, 线性可分) 训练测试 ===")
print(res_and)
print(f"学到的决策面参数: w = {p_and.w}, b = {p_and.b:.2f}")

# 2. 测试线性不可分任务: 逻辑异或 (XOR)
X_xor = np.array([[0, 0], [0, 1], [1, 0], [1, 1]], dtype=float)
y_xor = np.array([-1, 1, 1, -1])  # (0,1) 与 (1,0) 为 +1

p_xor = ToyPerceptron(lr=0.5, max_epochs=20)
res_xor = p_xor.fit(X_xor, y_xor)
print("\\n=== 2. 逻辑异或 (XOR, 线性不可分) 训练测试 ===")
print(res_xor)
"""

    l1_tips = [
        tip("如果数据集存在噪声或者不是严格线性可分的，感知机学习算法将永远无法收敛，权重向量会在解空间内反复震荡。这就是为什么现代机器学习改用连续光滑凸损失（如对数损失、合页损失）结合梯度下降的原因。", "pitfall"),
    ]

    # ── Lesson 1.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握多层前馈神经网络（Multilayer Perceptron, MLP）的分层结构与隐藏层表征映射；
2. 掌握**通用近似定理（Universal Approximation Theorem, Cybenko 1989）**的数学物理内涵，理解为什么只要一个包含有限神经元的隐藏层就能以任意精度逼近任意紧集上的连续函数；
3. 深刻理解为什么深度网络**必须引入非线性激活函数**（若无非线性激活，千层神经网络在数学上等价于单层矩阵乘法线性映射）；
4. 掌握常用激活函数全景族谱：Sigmoid、Tanh、ReLU（线性整流单元）、LeakyReLU 与现代大模型标配 GELU（高斯误差线性单元）；
5. 掌握各激活函数的导数性质、饱和区（Saturation）与引发**梯度消失（Vanishing Gradient）**的微积分机理。

### 前置知识
- 矩阵乘法结合律与复合函数求导；
- 微积分极限与高斯误差积分。

### 问题背景与 ML 用途
既然单层感知机被困在异或问题的牢笼中，破局的唯一钥匙就是**引入隐藏层（Hidden Layers）与非线性激活函数（Activation Functions）**：
- 如果没有激活函数，第 1 层输出 $z_1 = W_1 x$，第 2 层输出 $z_2 = W_2 z_1 = W_2 W_1 x$……哪怕堆叠 100 层，全网络等价于单个矩阵 $W = W_{100} \cdots W_1$ 的单层线性回归，模型容量毫无增加！
- 非线性激活函数赋予了神经网络扭曲特征空间、折叠空间流形的神奇魔力；
- 万能近似定理证明了：只要非线性激活函数不是多项式，一个单隐层的 MLP 就可以逼近真实世界的任意连续物理规律！

### 直觉理解
- **折叠折纸艺术（空间扭曲直觉）**：回到前面分不开的异或红绿球桌面。线性模型是一把直尺，怎么画也分不开。但如果我们在桌面上垫了一张富有弹性的硅胶垫（隐藏层非线性激活函数），我们把硅胶垫的两角提起来对折一下（非线性空间折叠），原本散落在对角线的两个红球瞬间靠拢重叠在了一起！这时候拿起直尺轻轻一划，完美切分！
- **现代大模型的 GELU 软开关**：ReLU 在输入负数时直接切断导数（硬归零），导致部分神经元可能永久“死掉（Dead ReLU）”。而现代大模型（GPT-4、BERT）标配的 GELU 则根据高斯正态分布赋予一个平滑概率：数值越小通过概率越低，但保留极其平缓的光滑非零导数，让训练极度平稳。

### 核心概念与符号对照表
| 激活函数 | 数学表达式 | 导数表达式 $\\sigma'(x)$ | 优缺点对比 | 适用领域 |
| --- | --- | --- | --- | --- |
| **Sigmoid** | $\\frac{1}{1 + e^{-x}}$ | $\\sigma(x)(1 - \\sigma(x)) \\le 0.25$ | 导数最大仅 0.25，两端严重饱和引发**严重梯度消失**；非零均值 | 二分类输出层 |
| **Tanh** | $\\frac{e^x - e^{-x}}{e^x + e^{-x}}$ | $1 - \\tanh^2(x) \\le 1.0$ | 零中心化输出（Zero-centered）；但在远端依然饱和引发梯度消失 | 早期隐藏层、RNN 内部循环 |
| **ReLU** | $\\max(0, x)$ | $\\begin{cases} 1, & x > 0 \\\\ 0, & x < 0 \\end{cases}$ | **计算极快，正向导数恒为 1 彻底攻克正半轴梯度消失**；但负半轴死神经元 | 经典视觉与传统 MLP |
| **GELU** | $x \\cdot \\Phi(x) = x P(X \\le x)$ | 滑畅连续，带概率自适应遮蔽 | **兼具非线性与概率自适应性**，全域光滑无硬折角 | **现代大语言模型唯一工业通用标配** |

### 数学原理与逐步推导
#### 1. 神经网络多层线性塌陷定理
假设有一个 $L$ 层的无激活函数网络，输入为 $\\mathbf{x}$。各层权重为 $W_1, W_2, \\dots, W_L$，偏置为 $\\mathbf{b}_1, \\mathbf{b}_2, \\dots, \\mathbf{b}_L$。
第 1 层：$\\mathbf{h}_1 = W_1 \\mathbf{x} + \\mathbf{b}_1$
第 2 层：$\\mathbf{h}_2 = W_2 \\mathbf{h}_1 + \\mathbf{b}_2 = W_2 (W_1 \\mathbf{x} + \\mathbf{b}_1) + \\mathbf{b}_2 = (W_2 W_1) \\mathbf{x} + (W_2 \\mathbf{b}_1 + \\mathbf{b}_2)$
依此类推，经过 $L$ 层线性和组合：
$$\\mathbf{y} = W_{\\text{eff}} \\mathbf{x} + \\mathbf{b}_{\\text{eff}}$$
其中等效综合权重 $W_{\\text{eff}} = \\prod_{l=1}^L W_l$。
**结论**：没有非线性激活函数，深度堆叠千层网络在假说空间表达能力上**完全等价于最普通的单层线性回归**！因此，非线性激活函数是赋予深度网络阶跃表达能力的灵魂之眼。

#### 2. Sigmoid 梯度消失的数学严格推导
Sigmoid 函数 $\\sigma(x) = \\frac{1}{1 + e^{-x}}$。
其一阶导数为：
$$\\sigma'(x) = \\sigma(x)(1 - \\sigma(x))$$
由基本不等式，当 $\\sigma(x) = 0.5$（即 $x = 0$）时，导数取得全局极大值：
$$\\max_{x} \\sigma'(x) = 0.5 \\times (1 - 0.5) = 0.25 = \\frac{1}{4}$$
在反向传播链式法则中，穿过 $k$ 个隐藏层需要连乘 $k$ 个激活函数的导数：
$$\\prod_{l=1}^k \\sigma'(z_l) \\le \\left( \\frac{1}{4} \\right)^k$$
当网络堆叠到仅 10 层时：$(\\frac{1}{4})^{10} \\approx 10^{-6}$！底层的梯度信号被缩小百万倍直接归零，导致浅层权重完全无法更新！这就是深层网络无法使用 Sigmoid 隐藏层的数学死穴。

### 真实代码示例与分析
下面展示对比常见激活函数（Sigmoid, ReLU, GELU）的函数输出与导数曲线计算："""

    l2_code = """import numpy as np

# 1. 定义激活函数及其解析导数
def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -20, 20)))

def sigmoid_grad(x):
    s = sigmoid(x)
    return s * (1.0 - s)

def relu(x):
    return np.maximum(0.0, x)

def relu_grad(x):
    return np.where(np.array(x) > 0, 1.0, 0.0)

def gelu(x):
    # 工业界最常用的 GELU 快速 tanh 近似实现 (Hendrycks & Gimpel)
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2.0 / np.pi) * (x + 0.044715 * (x ** 3))))

# 2. 模拟反向传播中经过 5 层激活函数梯度的连乘衰减
np.random.seed(42)
test_inputs = np.array([-3.0, -1.0, 0.0, 1.0, 3.0])

print("=== 激活函数及其导数响应 ===")
print("测试输入点:", test_inputs)
print("Sigmoid 导数:", np.round(sigmoid_grad(test_inputs), 4), f"(最大值仅 {sigmoid_grad(0.0):.2f})")
print("ReLU 导数   :", relu_grad(test_inputs))

# 计算连续 5 层饱和区 (x=3.0) 梯度反向传递保留比率
grad_decay_sigmoid = sigmoid_grad(3.0) ** 5
grad_decay_relu = relu_grad(3.0) ** 5
print(f"\\n5 层深网梯度反向保留比率 (x=3.0):")
print(f"  Sigmoid 衰减保留率: {grad_decay_sigmoid:.8f} (梯度彻底灰飞烟灭!)")
print(f"  ReLU    衰减保留率: {grad_decay_relu:.4f} (梯度 100% 完美无损传导!)")
"""

    l2_tips = [
        tip("在现代深度学习或 Transformer 架构中，隐藏层绝对不要使用 Sigmoid 作为激活函数！隐藏层首选 GELU（语言模型标配）或 Swish/SiLU（视觉模型），全连接与经典视觉首选 ReLU/LeakyReLU。", "performance"),
    ]

    lessons = [
        lesson("ml-dl-l1-1", "生物神经元启蒙与感知机极限", l1_content, 2, l1_tips, [demo(code=l1_code, title="从零实现感知机并验证与门收敛与异或震荡")]),
        lesson("ml-dl-l1-2", "多层感知机（MLP）与非线性激活函数", l2_content, 3, l2_tips, [demo(code=l2_code, title="Sigmoid 梯度衰减与 ReLU/GELU 激活特性对比")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-dl-c1-ex1",
            question="1969 年明斯基（Marvin Minsky）在《Perceptrons》一书中严密指出了单层感知机的致命局限性，导致了第一次人工智能寒冬的爆发。该书证明的单层感知机无法解决的最核心问题是什么？",
            options=[
                {"value": "A", "text": "无法解决异或（XOR）等线性不可分的布尔逻辑模式识别问题"},
                {"value": "B", "text": "无法在计算机中使用浮点数运算"},
                {"value": "C", "text": "无法拟合普通的逻辑与（AND）和逻辑或（OR）运算"},
                {"value": "D", "text": "模型参数量无法超过 10 个"},
            ],
            answer="A",
            explanation="单层感知机本质上是一个线性超平面分类器。对于异或问题（XOR），同类样本分布在二维平面的对角两端，在几何上不可能用单一超平面完成二分类，这一致命发现打破了当时对感知机全能性的幻想。",
            difficulty=2,
            related_lesson_id="ml-dl-l1-1",
            tags=["感知机", "XOR问题", "线性不可分", "深度学习历史"],
        ),
        judge(
            ex_id="ml-dl-c1-ex2",
            question="在一个 100 层的多层感知机中，只要去掉所有隐藏层的非线性激活函数，让每一层只执行矩阵乘法 $\\mathbf{z}^{[l]} = W^{[l]} \\mathbf{x}^{[l-1]} + \\mathbf{b}^{[l]}$，由于参数矩阵数量庞大，该网络依然能轻松拟合高维复杂的非线性曲面。",
            answer=False,
            explanation="错误！矩阵相乘满足结合律与线性传递性。根据线性塌陷定理，多个线性变换的复合依然是一个严格的线性变换，100 层无激活函数的网络在数学假说空间上完全等价于最普通的单层线性回归，根本无法学习任何非线性特征。",
            difficulty=2,
            related_lesson_id="ml-dl-l1-2",
            tags=["激活函数", "线性塌陷", "MLP理论"],
        ),
        multiple_choice(
            ex_id="ml-dl-c1-ex3",
            question="相较于传统的 Sigmoid 激活函数，现代深度学习中普遍采用 ReLU（线性整流单元，$\\max(0, x)$）作为隐藏层激活函数，主要具备下列哪些优势？",
            options=[
                {"value": "A", "text": "在正半轴 $x > 0$ 时导数恒为 1，彻底克服了正区间的反向传播梯度消失问题"},
                {"value": "B", "text": "计算极度简便高效，仅需简单的阈值比较操作，无需进行昂贵的自然指数 $\\exp$ 运算"},
                {"value": "C", "text": "使部分神经元输出为 0，带来天然的表征稀疏性（Sparse Representation）"},
                {"value": "D", "text": "其输出范围被严格限制在 $[-1, 1]$ 之间且是完全零均值化的"},
            ],
            answer=["A", "B", "C"],
            explanation="ReLU 的三大核心红利在于：正半轴导数无衰减破解梯度消失、计算开销几乎为零、以及负半轴归零诱导的稀疏激活。选项 D 描述的是 Tanh 而非 ReLU（ReLU 输出在 $[0, +\\infty)$），因此 D 错误。",
            difficulty=2,
            related_lesson_id="ml-dl-l1-2",
            tags=["ReLU", "激活函数", "梯度消失", "深度学习"],
        ),
        fill(
            ex_id="ml-dl-c1-ex4",
            question="标准 Sigmoid 激活函数 $\\sigma(x) = \\frac{1}{1 + e^{-x}}$ 的导数表达式为 $\\sigma(x)(1 - \\sigma(x))$。该导数在实数域能取得的最大全局极限峰值精确为 ___（请填写小数，如 0.5 或 0.25）。",
            blanks=[["0.25", "1/4"]],
            explanation="当 x = 0 时，sigmoid(0) = 0.5，导数取得极大值 0.5 * (1 - 0.5) = 0.25。这也是 Sigmoid 即使在原点附近依然会导致每层梯度缩减至 1/4 的根本数学诱因。",
            difficulty=2,
            related_lesson_id="ml-dl-l1-2",
            tags=["Sigmoid", "导数极值", "梯度消失", "数值计算"],
        ),
        open_ex(
            ex_id="ml-dl-c1-ex5",
            question="请详细阐述为什么在深度前馈神经网络中，使用 Sigmoid 作为深层隐藏层激活函数必然会导致严重的‘梯度消失（Vanishing Gradient）’，并从微积分导数与反向传播链式法则的角度，严格证明为什么 ReLU 能在正半轴彻底化解该难题。",
            reference_answer="1. Sigmoid 导致梯度消失的数学证明：\n- 导数上界限制：Sigmoid 的导数为 σ'(z) = σ(z)(1 - σ(z))。由于二次函数在 σ(z)=0.5 时取得极大值，其导数的理论最大全局上界仅为 0.25（σ'(z) <= 0.25 < 1）；\n- 链式法则累乘衰减：根据反向传播算法，第 1 层浅层参数的梯度反向传递需要穿透后续所有深层，包含连续连乘 L-1 个隐藏层激活函数的导数项：∏_{l=1}^{L-1} σ'(z^{[l]}) <= (0.25)^{L-1}；\n- 指数级衰减毁灭：当层数 L 达到 10 层以上时，梯度因子以 (1/4)^9 ≈ 3.8e-6 的速度指数级萎缩，导致传回浅层的梯度几乎归零，浅层神经元权重无法更新，网络训练彻底瘫痪。\n2. ReLU 化解难题的机理：\n- ReLU 定义为 f(z) = max(0, z)，其在正半轴（z > 0）的一阶导数严格恒等于 1：f'(z) = 1；\n- 此时在反向传播链式法则中，正激活神经元的导数连乘项为 ∏ 1.0 = 1.0，完全保持等比例恒等传递，彻底消除了导数小于 1 引发的指数级连续萎缩，使得上百层的深层网络能够顺畅地将监督信号回传至最底层输入端。",
            explanation="系统基于 Sigmoid 导数最大值为 0.25 的代数事实推导链式法则指数衰减，对比 ReLU 在正半轴导数严格恒为 1 的无损传递机理。",
            rubric=[
                {"points": 5, "description": "结合 Sigmoid 导数上界不超过 0.25 和链式法则连乘展开，证明梯度呈指数级衰减至零"},
                {"points": 5, "description": "推导 ReLU 在正半轴导数恒为 1，证明其在正激活路径上能实现梯度无损传递"},
            ],
            difficulty=3,
            related_lesson_id="ml-dl-l1-2",
            tags=["梯度消失", "反向传播", "链式法则", "ReLU优势"],
        ),
        # ── Code Exercise 1 ──
        {
            "id": "ml-dl-c1-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现感知机单步参数更新器：\n编写函数 `perceptron_update_step(w, b, x, y, lr=0.1)`：\n1. `w`：当前权重一维数组或列表（长度 $D$）；\n2. `b`：当前偏置项标量浮点数；\n3. `x`：当前输入的单样本特征一维数组或列表（长度 $D$）；\n4. `y`：该样本的二分类真实标签（值为 -1 或 +1）；\n5. `lr`：学习率浮点数。\n\n规则：\n- 计算感知机预测打分：$z = \\mathbf{w}^T \\mathbf{x} + b$；\n- 判决条件：若 $z \\ge 0$，预测类别为 +1；若 $z < 0$，预测类别为 -1；\n- 若预测类别与真实标签 $y$ 一致（分类正确）：权重 `w` 与偏置 `b` 保持不变，返回 `(w_list, b, False)`；\n- 若预测类别与真实标签 $y$ 不一致（误分类）：执行感知机 SGD 更新：\n  $$\\mathbf{w}_{\\text{new}} = \\mathbf{w} + \\text{lr} \\cdot y \\cdot \\mathbf{x}$$\n  $$b_{\\text{new}} = b + \\text{lr} \\cdot y$$\n  返回 `(w_new_list, round(b_new, 4), True)`，其中权重列表各元素四舍五入保留 4 位小数。\n\n最后一行请以 `w0 = [0.0, 0.0]`, `b0 = 0.0`, `x0 = [1.0, 2.0]`, `y0 = -1`, `lr0 = 0.5` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import Tuple, List\n\ndef perceptron_update_step(\n    w: List[float], b: float, x: List[float], y: int, lr: float = 0.1\n) -> Tuple[List[float], float, bool]:\n    \"\"\"根据单个样本的分类情况执行感知机权重更新\"\"\"\n    # 请在此实现\n    ___\n\nw0 = [0.0, 0.0]\nb0 = 0.0\nx0 = [1.0, 2.0]\ny0 = -1\nlr0 = 0.5\nperceptron_update_step(w0, b0, x0, y0, lr0)\n",
            "setupCode": "",
            "expectedOutput": "([-0.5, -1.0], -0.5, True)",
            "answer": "import numpy as np\nfrom typing import Tuple, List\n\ndef perceptron_update_step(\n    w: List[float], b: float, x: List[float], y: int, lr: float = 0.1\n) -> Tuple[List[float], float, bool]:\n    w = np.array(w, dtype=float)\n    x = np.array(x, dtype=float)\n    b = float(b)\n    \n    score = float(np.dot(w, x) + b)\n    pred = 1 if score >= 0.0 else -1\n    \n    if pred == y:\n        return [round(float(val), 4) for val in w], round(b, 4), False\n    else:\n        w_new = w + lr * y * x\n        b_new = b + lr * y\n        return [round(float(val), 4) for val in w_new], round(float(b_new), 4), True\n\nw0 = [0.0, 0.0]\nb0 = 0.0\nx0 = [1.0, 2.0]\ny0 = -1\nlr0 = 0.5\nperceptron_update_step(w0, b0, x0, y0, lr0)\n",
            "tests": "w_t, b_t, updated = perceptron_update_step([1.0], 0.0, [2.0], 1, 0.1)\n# 1.0 * 2.0 + 0 = 2.0 >= 0 -> pred=1 == y -> no update\nassert not updated and w_t == [1.0] and b_t == 0.0, f\"测试不匹配: {w_t}, {b_t}, {updated}\"\n",
            "explanation": "计算线性决策打分并得出预测符号，若误分类则根据梯度更新公式修正权重与偏置，返回更新后的参数元组。",
            "tags": ["感知机", "参数更新", "SGD", "算法实战"],
            "related_lesson_id": "ml-dl-l1-1",
        },
        single_choice(
            ex_id="ml-dl-c1-ex7",
            question="在现代大语言模型（如 GPT-4、BERT、LLaMA 变体）中，前馈网络（FFN）普遍舍弃传统的 ReLU，而全面拥抱 **GELU（高斯误差线性单元）** 或 **SiLU/Swish**。这主要是因为 GELU 具备下列哪项关键优势？",
            options=[
                {"value": "A", "text": "全域光滑、处处可微，且在负值区域保留平缓光滑的极小负导数，既具备类似 Dropout 的概率自适应门控机制，又彻底杜绝了神经元永久坏死（Dead Neurons）的隐患"},
                {"value": "B", "text": "运算完全不需要任何浮点乘除法，只用加法完成"},
                {"value": "C", "text": "能够自动将输入维度缩减为原来的 1/10"},
                {"value": "D", "text": "只输出严格的整数 0 或 1"},
            ],
            answer="A",
            explanation="GELU 基于正态累积分布构造 x * P(X <= x)，在全域光滑无锐角折折点，在负区间提供了非零的自适应微小梯度响应，有效避免了 ReLU 在负值区域导数硬断裂引发的神经元不可逆失活，极大地提升了大模型的深层训练动态稳定性。",
            difficulty=2,
            related_lesson_id="ml-dl-l1-2",
            tags=["GELU", "大语言模型", "激活函数演进", "神经元坏死"],
        ),
    ]

    return chapter(
        chapter_id="ml-dl-c1",
        course_id="ml-deep-learning",
        order=1,
        title="神经网络基石与前向感知机",
        goal="掌握 M-P 神经元与感知机异或线性不可分瓶颈，掌握多层前馈感知机万能近似定理与激活函数梯度消失机理。",
        lessons=lessons,
        exercises=exercises,
    )
