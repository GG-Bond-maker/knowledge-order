# -*- coding: utf-8 -*-
"""
Chapter 2: 反向传播计算图与矩阵微分推导 (Backpropagation & Computational Graphs)
Course: ml-deep-learning
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_2():
    # ── Lesson 2.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握深度学习底层计算引擎的抽象基石：有向无环计算图（Directed Acyclic Graph, DAG）；
2. 深刻辨析四种求导机制的数学原理与计算复杂度：数值微分、符号微分、前向模式自动微分（Forward-mode AD）与反向模式自动微分（Reverse-mode AD）；
3. 严格推导为什么在深度学习“输入超高维参数 $d$（数千万到数万亿）、输出单一标量损失 $\\mathcal{L} \\in \\mathbb{R}$”的场景下，**反向模式自动微分只需一次反向遍历，其计算开销与参数维度 $d$ 彻底解耦（$O(1)$ 常数级反向传递）**；
4. 掌握雅可比-向量积（JVP）与向量-雅可比积（VJP）的对偶数学结构；
5. 编写代码使用纯 Python 面向对象实现微型标量自动求导引擎（微型 Autograd），体验反向图的构建与链式累积。

### 前置知识
- 多元复合函数微积分链式法则；
- 图论拓扑排序（Topological Sort）。

### 问题背景与 ML 用途
如果训练一个拥有一亿参数的深度神经网络：
- 如果使用传统数值微分（有限差分近似）：对每一个参数微扰 $\\epsilon$ 重新跑一次前向传播，计算全部参数的梯度需要做**一亿次前向传播**！网络训练一轮需要几百年，算力直接崩溃；
- 如果使用数学软件的符号微分：链式展开的公式随着深度指数级膨胀（Expression Swell），内存瞬间爆炸；
- **反向模式自动微分（Reverse-mode AD / 反向传播）是深度学习革命的发动机**：
  它在内存中记录前向计算图的依赖轨迹，利用向量-雅可比积（VJP）从最终标量损失出发逆向回溯，**无论网络包含 1 个参数还是 1 万亿个参数，只需要区区 1 次反向遍历，就能毫无遗漏地精确求出所有参数的解析偏导数**！

### 直觉理解
- **顺水推舟与逆流寻根（求导的两个方向）**：
  - 想象一个巨大的由多条水管连接的水网系统。有 100 万个进水阀门（模型参数），汇聚流入最后 1 个总水桶（标量损失）；
  - **前向模式求导（Forward-mode AD）**：如果拧开第 1 个阀门放一滴红墨水，跟着水流往前观察总水桶的变红程度；想测第 2 个阀门，再放一次墨水再看一遍……测完 100 万个阀门要看 100 万次！
  - **反向模式求导（Reverse-mode AD）**：在最终的总水桶里滴入一滴显影剂，顺着所有水管反向逆流回溯！水流在每个三通分支处按照杠杆比例分配显影剂，**仅仅回溯一次，所有 100 万个阀门上的敏感度在同一瞬间全部被显影出来**！

### 核心概念与符号对照表
| 求导技术 | 核心机制 | 单次计算复杂度 | 致命瓶颈 / 工业定位 |
| --- | --- | --- | --- |
| **数值微分** | $\\frac{f(x+\\epsilon) - f(x)}{\\epsilon}$ | $O(d \\cdot \\text{Cost}(f))$ | 极度缓慢，存在浮点舍入截断误差；仅用于单元测试中的**梯度检验（Grad Check）** |
| **符号微分** | 依据数学规则解析展开公式 | 极易发生表达式膨胀 | 产生天量冗余重复子表达式，无法处理条件分支与循环控制流 |
| **前向自动微分** | 计算雅可比-向量积（JVP） | $O(d)$ 次前向求导 | 适合输入维度极小（$n \\ll m$）、输出维度极大的科学计算任务 |
| **反向自动微分** | 计算向量-雅可比积（VJP） | **$O(1)$ 次反向遍历** | **深度学习唯一通用工业标准**（PyTorch、JAX、TensorFlow 底层内核） |

### 数学原理与逐步推导
#### 反向模式自动微分的时间复杂度与参数量无关性证明
设复合函数链式映射为：
$$\\mathbf{x} \\in \\mathbb{R}^d \\xrightarrow{f_1} \\mathbf{h}_1 \\in \\mathbb{R}^{m_1} \\xrightarrow{f_2} \\dots \\xrightarrow{f_L} \\mathbf{h}_L \\in \\mathbb{R}^{m_L} \\xrightarrow{\\text{Loss}} \\mathcal{L} \\in \\mathbb{R}$$
整个雅可比矩阵链式求导为矩阵连续乘积：
$$\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{x}} = \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{h}_L} \\cdot \\frac{\\partial \\mathbf{h}_L}{\\partial \\mathbf{h}_{L-1}} \\cdots \\frac{\\partial \\mathbf{h}_2}{\\partial \\mathbf{h}_1} \\cdot \\frac{\\partial \\mathbf{h}_1}{\\partial \\mathbf{x}}$$
- **方案 A（前向结合：从左往右算雅可比）**：
  先计算 $\\left( \\frac{\\partial \\mathbf{h}_1}{\\partial \\mathbf{x}} \\right) \\in \\mathbb{R}^{m_1 \\times d}$，接着乘以 $\\frac{\\partial \\mathbf{h}_2}{\\partial \\mathbf{h}_1} \\in \\mathbb{R}^{m_2 \\times m_1}$……
  每一次矩阵相乘都包含参数维度 $d$ 的遍历，总计算量严格正比于输入参数量 $d$；
- **方案 B（反向结合：从右往左算向量-雅可比积）**：
  先计算损失关于最后一层的梯度行向量：
  $$\\mathbf{v}_L = \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{h}_L} \\in \\mathbb{R}^{1 \\times m_L}$$
  接着计算行向量与雅可比矩阵的乘积（VJP）：
  $$\\mathbf{v}_{L-1} = \\mathbf{v}_L \\cdot \\left( \\frac{\\partial \\mathbf{h}_L}{\\partial \\mathbf{h}_{L-1}} \\right) \\in \\mathbb{R}^{1 \\times m_{L-1}}$$
  **关键几何洞察**：在反向路径上，每一个步骤都是**一个行向量乘一个雅可比矩阵**，永远只在低维状态空间做向量-矩阵投影，没有任何一步需要穷举参数维度 $d$！
  直到最后一步才将行向量投影到参数空间：
  $$\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{x}} = \\mathbf{v}_1 \\cdot \\frac{\\partial \\mathbf{h}_1}{\\partial \\mathbf{x}}$$
**结论**：反向模式自动微分的时间开销在渐近意义下至多是前向传播的 2 到 3 倍常数因子，**与网络中究竟有 1 个参数还是 1000 亿个参数毫无关系**！

### 真实代码示例与分析
下面展示从零实现一个纯 Python 的微型标量自动求导引擎（包含前向建图与反向拓扑递归回传）："""

    l1_code = """class Value:
    \"\"\"微型自动微分标量节点 (纯 Python 实现 PyTorch Autograd 核心原理)\"\"\"
    def __init__(self, data, _children=(), _op=''):
        self.data = float(data)
        self.grad = 0.0
        self._backward = lambda: None
        self._prev = set(_children)
        self._op = _op

    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), '+')
        
        def _backward():
            self.grad += 1.0 * out.grad
            other.grad += 1.0 * out.grad
        out._backward = _backward
        return out

    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), '*')
        
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
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

        # 2. 标量损失自身关于自身的导数为 1.0
        self.grad = 1.0
        # 3. 逆向遍历拓扑序列，依次触发局部反向求导链式法则
        for v in reversed(topo):
            v._backward()

# 验证计算图: L = (x * y + z)
x = Value(2.0)
y = Value(-3.0)
z = Value(10.0)
q = x * y        # q = -6.0
L = q + z        # L = 4.0

# 触发反向模式自动微分
L.backward()

print("=== 微型标量计算图自动微分验证 ===")
print(f"前向输出 L.data = {L.data:.2f} (期望 4.0)")
print(f"dL/dx = {x.grad:.2f} (期望 y = -3.0)")
print(f"dL/dy = {y.grad:.2f} (期望 x =  2.0)")
print(f"dL/dz = {z.grad:.2f} (期望 1.0)")
"""

    l1_tips = [
        tip("在 PyTorch 中，每次前向传播前必须显式调用 optimizer.zero_grad()！这是因为 Autograd 的反向传播设计采用 self.grad += ...（加法累积机制），如果不手动清零，历史 batch 的梯度会无休止累加导致模型发散崩溃。", "pitfall"),
    ]

    # ── Lesson 2.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握多层全连接神经网络（MLP）前向与反向传播的紧凑矩阵表达；
2. 深刻掌握误差灵敏度向量（Error Sensitivity Vector / 局部梯度）$\\boldsymbol{\delta}^{[l]} = \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{z}^{[l]}}$ 的物理意义；
3. 严格推导并掌握反向传播四大基本方程：
   - 输出层误差项 $\\boldsymbol{\delta}^{[L]}$ 的闭式解；
   - 隐藏层误差反向传递公式：$\\boldsymbol{\delta}^{[l]} = \\left( (W^{[l+1]})^T \\boldsymbol{\delta}^{[l+1]} \\right) \\odot \\sigma'(\\mathbf{z}^{[l]})$；
   - 权重矩阵梯度的外积表达：$\\frac{\\partial \\mathcal{L}}{\\partial W^{[l]}} = \\boldsymbol{\delta}^{[l]} (\\mathbf{a}^{[l-1]})^T$；
   - 偏置向量梯度的求和表达：$\\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{b}^{[l]}} = \\boldsymbol{\delta}^{[l]}$；
4. 熟练证明二元交叉熵损失与 Sigmoid/Softmax 结合时，误差向量优雅化简为 $\\boldsymbol{\delta} = \\mathbf{a} - \\mathbf{y}$ 的美妙抵消；
5. 编写代码使用纯 NumPy 从零构建一个完整的三层全连接网络，实现手写前向传播与反向传播矩阵更新。

### 前置知识
- 矩阵转置乘法与哈达玛积（Hadamard Product / 逐元素乘积 $\\odot$）；
- 多元微积分雅可比矩阵。

### 问题背景与 ML 用途
1986 年，Rumelhart、Hinton 与 Williams 在《Nature》上发表了重磅论文《Learning representations by back-propagating errors》，宣告了多层神经网络反向传播算法的诞生，彻底打破了长达近 20 年的第一次 AI 寒冬。
- 反向传播不是什么玄妙的黑魔法，它本质上就是**矩阵微积分中的复合函数求导链式法则**；
- 搞清楚矩阵维度在每一层的精确流动（例如为什么权重梯度是误差向量与前层激活向量的**外积**而不是内积），是每一位深度学习工程师从“API 调包侠”迈向“底层架构掌控者”的必经之路。

### 直觉理解
- **企业责任倒查机制（反向传播的比喻）**：
  - 一家多层级跨国集团在年终结算时，发现总利润出现亏损（计算标量损失 $\mathcal{L}$）；
  - 集团董事会向最前线的销售总监发问责函：“你这里偏差了多少？”（计算输出层误差 $\boldsymbol{\delta}^{[L]}$）；
  - 销售总监根据各分管部门在业务中的权重（乘上权重矩阵转置 $(W^{[l+1]})^T$），把责任向上一级各部门拆解分摊，各部门还要乘上自己员工的积极性反应程度（激活函数一阶导数 $\sigma'$），得到各中间隐藏层的责任问责值 $\boldsymbol{\delta}^{[l]}$；
  - 最终，每一个岗位员工究竟该扣多少奖金（权重梯度 $\frac{\partial \mathcal{L}}{\partial W}$），**精准取决于该员工自身的表现（前层输入 $\mathbf{a}^{[l-1]}$）与上级给他的问责压力（本层误差 $\boldsymbol{\delta}^{[l]}$）的交叉乘积**！

### 核心概念与符号对照表
| 符号 / 方程 | 维度尺寸 | 物理与数学意义 |
| --- | --- | --- |
| **未激活前向值** $\mathbf{z}^{[l]} = W^{[l]} \mathbf{a}^{[l-1]} + \mathbf{b}^{[l]}$ | $(n_l, 1)$ | 线性组合后的未激活净输入（Pre-activation） |
| **激活输出值** $\mathbf{a}^{[l]} = \sigma(\mathbf{z}^{[l]})$ | $(n_l, 1)$ | 经过非线性激活后的本层特征表示（Post-activation） |
| **误差灵敏度** $\boldsymbol{\delta}^{[l]} = \frac{\partial \mathcal{L}}{\partial \mathbf{z}^{[l]}}$ | $(n_l, 1)$ | 损失函数关于本层未激活净输入的敏感偏导向量 |
| **误差回传方程** $\boldsymbol{\delta}^{[l]} = (W^{[l+1]})^T \boldsymbol{\delta}^{[l+1]} \odot \sigma'(\mathbf{z}^{[l]})$ | $(n_l, 1)$ | 深层误差通过权重转置逆流回传，再经本层激活导数门控 |
| **权重梯度** $\frac{\partial \mathcal{L}}{\partial W^{[l]}} = \boldsymbol{\delta}^{[l]} (\mathbf{a}^{[l-1]})^T$ | $(n_l, n_{l-1})$ | 外积矩阵：本层问责误差与上层激活输入的交叉外积 |

### 数学原理与逐步推导
#### 反向传播四大方程的严格矩阵推导
考虑第 $l$ 层的第 $j$ 个神经元，其净输入为：
$$z_j^{[l]} = \sum_{k} W_{jk}^{[l]} a_k^{[l-1]} + b_j^{[l]}$$
定义误差灵敏度为 $\delta_j^{[l]} = \frac{\partial \mathcal{L}}{\partial z_j^{[l]}}$。
1. **隐藏层误差向上一层传递**：
由多元链式求导法则，损失对前一层净输入 $z_k^{[l-1]}$ 的偏导为通过第 $l$ 层所有神经元传递的贡献之和：
$$\delta_k^{[l-1]} = \frac{\partial \mathcal{L}}{\partial z_k^{[l-1]}} = \sum_{j} \frac{\partial \mathcal{L}}{\partial z_j^{[l]}} \frac{\partial z_j^{[l]}}{\partial a_k^{[l-1]}} \frac{\partial a_k^{[l-1]}}{\partial z_k^{[l-1]}}$$
因为 $z_j^{[l]} = \sum_m W_{jm}^{[l]} a_m^{[l-1]} + b_j^{[l]}$，所以 $\frac{\partial z_j^{[l]}}{\partial a_k^{[l-1]}} = W_{jk}^{[l]}$。
因为 $a_k^{[l-1]} = \sigma(z_k^{[l-1]})$，所以 $\frac{\partial a_k^{[l-1]}}{\partial z_k^{[l-1]}} = \sigma'(z_k^{[l-1]})$。
代入得：
$$\delta_k^{[l-1]} = \left( \sum_j W_{jk}^{[l]} \delta_j^{[l]} \right) \cdot \sigma'(z_k^{[l-1]})$$
写为紧凑的向量-矩阵表达：
$$\boldsymbol{\delta}^{[l-1]} = \left( (W^{[l]})^T \boldsymbol{\delta}^{[l]} \right) \odot \sigma'(\mathbf{z}^{[l-1]})$$
**重点观察**：为什么是权重转置 $(W^{[l]})^T$？
因为在前向传播中，$W^{[l]} \in \mathbb{R}^{n_l \times n_{l-1}}$ 将 $n_{l-1}$ 维向量映射到 $n_l$ 维；在反向传播中，必须用其转置 $(W^{[l]})^T \in \mathbb{R}^{n_{l-1} \times n_l}$ 才能把 $n_l$ 维的误差信号精准回传映射回 $n_{l-1}$ 维！

2. **权重矩阵梯度推导**：
$$\frac{\partial \mathcal{L}}{\partial W_{jk}^{[l]}} = \frac{\partial \mathcal{L}}{\partial z_j^{[l]}} \frac{\partial z_j^{[l]}}{\partial W_{jk}^{[l]}} = \delta_j^{[l]} \cdot a_k^{[l-1]}$$
写成全矩阵外积（Outer Product）：
$$\frac{\partial \mathcal{L}}{\partial W^{[l]}} = \boldsymbol{\delta}^{[l]} (\mathbf{a}^{[l-1]})^T$$
其中 $\boldsymbol{\delta}^{[l]}$ 为列向量 $(n_l, 1)$，$(\mathbf{a}^{[l-1]})^T$ 为行向量 $(1, n_{l-1})$，相乘得到尺寸为 $(n_l, n_{l-1})$ 的完整权重梯度矩阵！

### 真实代码示例与分析
下面展示使用纯 NumPy 实现一个包含 1 个隐藏层的完整三层神经网络，实现手写反向传播矩阵训练："""

    l2_code = """import numpy as np

# 1. 构造一个非线性二分类玩具数据集 (异或问题 XOR)
X = np.array([[0.0, 0.0], [0.0, 1.0], [1.0, 0.0], [1.0, 1.0]])
y = np.array([[0.0], [1.0], [1.0], [0.0]])

# 2. 初始化网络架构: 输入 2 维 -> 隐藏层 4 维 (Tanh) -> 输出 1 维 (Sigmoid)
np.random.seed(42)
W1 = np.random.randn(4, 2) * 0.5
b1 = np.zeros((4, 1))
W2 = np.random.randn(1, 4) * 0.5
b2 = np.zeros((1, 1))

lr = 0.5
epochs = 500

def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -15, 15)))

# 3. 训练循环 (批处理全量样本, X 形状转为 2x4)
X_T = X.T  # 形状 (2, 4)
y_T = y.T  # 形状 (1, 4)
m = X.shape[0]

for epoch in range(epochs):
    # --- 前向传播 ---
    z1 = W1 @ X_T + b1                # (4, 4)
    a1 = np.tanh(z1)                  # (4, 4)
    z2 = W2 @ a1 + b2                 # (1, 4)
    a2 = sigmoid(z2)                  # (1, 4) 预测概率

    # 二元交叉熵损失
    loss = -np.mean(y_T * np.log(a2 + 1e-12) + (1.0 - y_T) * np.log(1.0 - a2 + 1e-12))

    # --- 反向传播四大方程 ---
    # 方程 1: 输出层误差 delta2 = a2 - y (BCE + Sigmoid 优雅化简)
    delta2 = (a2 - y_T)               # (1, 4)
    dW2 = (delta2 @ a1.T) / m         # (1, 4)
    db2 = np.sum(delta2, axis=1, keepdims=True) / m

    # 方程 2: 隐藏层误差 delta1 = (W2^T delta2) * (1 - a1^2) (Tanh 导数)
    delta1 = (W2.T @ delta2) * (1.0 - a1 ** 2)  # (4, 4)
    dW1 = (delta1 @ X_T.T) / m        # (4, 2)
    db1 = np.sum(delta1, axis=1, keepdims=True) / m

    # 参数更新 (SGD)
    W2 -= lr * dW2
    b2 -= lr * db2
    W1 -= lr * dW1
    b1 -= lr * db1

print("=== 纯手写 NumPy 反向传播训练完成 ===")
print(f"最终二元交叉熵损失: {loss:.5f}")
print("模型最终异或预测概率:")
for i in range(4):
    print(f"  输入 {X[i]} -> 真实: {int(y[i,0])} | 预测概率: {a2[0, i]:.4f}")
print("结论: 引入隐藏层和反向传播后，神经网络完美破解了困扰人工智能界 20 年的 XOR 危机！")
"""

    l2_tips = [
        tip("当二元交叉熵损失（BCE）与 Sigmoid 输出层结合，或者多分类交叉熵与 Softmax 结合时，损失关于净输入 z 的导数极其优美地化简为 delta = a - y（预测概率减去真实标签），所有复杂的分母和指数导数项全部在微积分代数中完美相互抵消！", "interview"),
    ]

    lessons = [
        lesson("ml-dl-l2-1", "计算图（Computational Graph）与自动微分体系", l1_content, 3, l1_tips, [demo(code=l1_code, title="从零实现纯 Python 标量自动求导引擎")]),
        lesson("ml-dl-l2-2", "反向传播算法的严密矩阵微积分推导", l2_content, 3, l2_tips, [demo(code=l2_code, title="纯手写 NumPy 三层 MLP 前向反向传播求解异或")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-dl-c2-ex1",
            question="在包含数千万到数千亿参数的大规模深度学习中，为什么现代框架（PyTorch/TensorFlow）无一例外地采用‘反向模式自动微分（Reverse-mode AD）’，而绝不采用前向模式或传统数值微分？",
            options=[
                {"value": "A", "text": "因为深度学习的目标函数输出是单一标量损失（Loss $\\in \\mathbb{R}$），反向模式计算向量-雅可比积只需一次反向遍历即可求出所有参数梯度，时间开销与参数数量 $d$ 彻底解耦"},
                {"value": "B", "text": "因为前向模式自动微分在数学上无法求高阶导数"},
                {"value": "C", "text": "因为反向模式自动微分不需要占用任何显存"},
                {"value": "D", "text": "因为数值微分只适用于连续函数"},
            ],
            answer="A",
            explanation="深度学习网络参数量 d 极其庞大（千万到万亿级），而损失标量只有 1 个。前向模式求导时间复杂度正比于参数量 O(d)，无法承受；反向模式从单一标量损失出发反向回传向量-雅可比积，仅仅需要 1 次反向遍历即可同步求出所有参数的梯度，复杂度与 d 完全解耦。",
            difficulty=2,
            related_lesson_id="ml-dl-l2-1",
            tags=["自动微分", "反向模式", "计算图", "计算复杂度"],
        ),
        judge(
            ex_id="ml-dl-c2-ex2",
            question="在分类神经网络中，当输出层采用 Sigmoid 激活函数并搭配均方误差（MSE）损失函数时，其输出层梯度公式比搭配二元交叉熵损失（BCE）更加稳定且不会发生饱和慢速收敛。",
            answer=False,
            explanation="错误！正好相反。Sigmoid 搭配 MSE 时，输出层误差项中包含 Sigmoid 自身的导数 σ'(z)，当预测严重错误（例如真实 y=1，模型预测接近 0）时，神经元处于饱和区导致导数 σ'(z) 趋于 0，产生‘梯度消失’导致学习停滞。而搭配交叉熵损失时，导数项被对数完美抵消，梯度简化为 a - y，误差越大梯度越大，收敛极速且稳定。",
            difficulty=2,
            related_lesson_id="ml-dl-l2-2",
            tags=["交叉熵", "MSE", "梯度抵消", "损失函数设计"],
        ),
        multiple_choice(
            ex_id="ml-dl-c2-ex3",
            question="关于反向传播算法中的矩阵微积分运算，下列数学命题中正确的有：",
            options=[
                {"value": "A", "text": "第 $l$ 层隐藏层的误差灵敏度向量 $\\boldsymbol{\delta}^{[l]} = \\frac{\\partial \\mathcal{L}}{\\partial \\mathbf{z}^{[l]}}$ 与其净输入 $\\mathbf{z}^{[l]}$ 具有完全相同的维度尺寸"},
                {"value": "B", "text": "权重矩阵梯度的形状与权重矩阵自身严格相同，其数学表达为本层误差向量与前层激活向量的外积：$\\frac{\\partial \\mathcal{L}}{\\partial W^{[l]}} = \\boldsymbol{\delta}^{[l]} (\\mathbf{a}^{[l-1]})^T$"},
                {"value": "C", "text": "误差信号在从第 $l+1$ 层回传至第 $l$ 层时，必须乘以该层权重矩阵的转置 $(W^{[l+1]})^T$，以保证几何维度的逆向匹配"},
                {"value": "D", "text": "偏置项 $\\mathbf{b}^{[l]}$ 的梯度必须乘以输入特征的激活值 $\\mathbf{a}^{[l-1]}$"},
            ],
            answer=["A", "B", "C"],
            explanation="偏置项的输入系数恒为 1，因此偏置梯度直接等于误差向量 delta 本身（或者在 mini-batch 上求和），不需要乘前层激活值，选项 D 错误。A、B、C 均为反向传播核心数学定理。",
            difficulty=2,
            related_lesson_id="ml-dl-l2-2",
            tags=["反向传播", "矩阵微积分", "四大方程", "维度匹配"],
        ),
        fill(
            ex_id="ml-dl-c2-ex4",
            question="在全连接网络的反向传播中，隐藏层误差传递公式为 $\\boldsymbol{\delta}^{[l]} = \\left( (W^{[l+1]})^T \\boldsymbol{\delta}^{[l+1]} \\right) \\odot \\sigma'(\\mathbf{z}^{[l]})$，其中符号 $\\odot$ 代表两个同维度矩阵或向量之间的___乘积（请填写中文专业术语，如“哈达玛”或“逐元素”）。",
            blanks=[["哈达玛", "逐元素", "点乘"]],
            explanation="符号 ⊙ 为哈达玛积（Hadamard product），即逐元素相乘（Element-wise multiplication），将逆流回传的线性加权误差与本层激活函数的局部导数逐点相乘门控。",
            difficulty=2,
            related_lesson_id="ml-dl-l2-2",
            tags=["哈达玛积", "反向传播", "微积分符号"],
        ),
        open_ex(
            ex_id="ml-dl-c2-ex5",
            question="请严密推导全连接神经网络中单个样本的权重矩阵梯度公式：$\\frac{\\partial \\mathcal{L}}{\\partial W^{[l]}} = \\boldsymbol{\delta}^{[l]} (\\mathbf{a}^{[l-1]})^T$，并从线性代数矩阵维度（维度分析）与神经元连接外积（Outer Product）的几何角度，深入解释为什么该梯度的形式不是内积而是外积。",
            reference_answer="严密推导与几何分析如下：\n1. 标量分量求导推导：\n设第 l 层有 n_l 个神经元，第 l-1 层有 n_{l-1} 个神经元。第 l 层第 j 个神经元的未激活输入为：\nz_j^{[l]} = \\sum_{k=1}^{n_{l-1}} W_{jk}^{[l]} a_k^{[l-1]} + b_j^{[l]}\n应用链式法则求损失对权重矩阵中特定元素 W_{jk}^{[l]} 的偏导：\n\\frac{\\partial \\mathcal{L}}{\\partial W_{jk}^{[l]}} = \\frac{\\partial \\mathcal{L}}{\\partial z_j^{[l]}} \\cdot \\frac{\\partial z_j^{[l]}}{\\partial W_{jk}^{[l]}}\n根据误差定义 \\delta_j^{[l]} = \\frac{\\partial \\mathcal{L}}{\\partial z_j^{[l]}}，且 \\frac{\\partial z_j^{[l]}}{\\partial W_{jk}^{[l]}} = a_k^{[l-1]}（因为 z_j 表达式中 W_{jk} 的系数正是 a_k^{[l-1]}），因此：\n\\frac{\\partial \\mathcal{L}}{\\partial W_{jk}^{[l]}} = \\delta_j^{[l]} \\cdot a_k^{[l-1]}\n2. 维度与几何外积分析：\n- 维度匹配：权重矩阵 W^{[l]} 的尺寸为 (n_l, n_{l-1})。误差向量 \\boldsymbol{\\delta}^{[l]} 为列向量 (n_l, 1)，前层激活向量 \\mathbf{a}^{[l-1]} 为列向量 (n_{l-1}, 1)；\n- 外积构建：如果做内积，两个向量必须维度相同且结果退化为标量；而为了更新完整的连接权重矩阵，第 j 个输出神经元的责任问责 \\delta_j 必须与第 k 个输入神经元的信号强弱 a_k 全排列两两组合（共有 n_l * n_{l-1} 个突触连接！）。\n列向量 \\boldsymbol{\\delta}^{[l]} 乘行向量 (\\mathbf{a}^{[l-1]})^T 的外积运算 \\boldsymbol{\\delta}^{[l]} (\\mathbf{a}^{[l-1]})^T 刚好生成一个尺寸为 (n_l, n_{l-1}) 的全排列矩阵，其 (j, k) 位置的元素严格对应标量导数 \\delta_j^{[l]} a_k^{[l-1]}，完成了对所有突触权重的完美协同更新。",
            explanation="从单神经元标量链式法则出发推导权重元素导数，结合突触全连接图与矩阵外积维度匹配给出严密阐述。",
            rubric=[
                {"points": 5, "description": "写出 z_j 表达式并利用标量链式法则严密推导出单个元素导数 ∂L/∂W_jk = δ_j * a_k"},
                {"points": 5, "description": "从矩阵维度 (n_l, 1) * (1, n_{l-1}) = (n_l, n_{l-1}) 与所有神经元两两全连接外积几何意义清晰解释"},
            ],
            difficulty=3,
            related_lesson_id="ml-dl-l2-2",
            tags=["反向传播推导", "矩阵外积", "四大方程", "微积分推导"],
        ),
        # ── Code Exercise 2 ──
        {
            "id": "ml-dl-c2-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现全连接单层的反向传播梯度计算函数：\n编写函数 `dense_backward(delta_out, W, a_in)`：\n1. `delta_out`：当前层的误差灵敏度列向量 $\\boldsymbol{\\delta}^{[l]}$（NumPy 2D 数组，形状 $(n_l, 1)$）；\n2. `W`：当前层的权重矩阵 $W^{[l]}$（NumPy 2D 数组，形状 $(n_l, n_{l-1})$）；\n3. `a_in`：前一层的激活输出列向量 $\\mathbf{a}^{[l-1]}$（NumPy 2D 数组，形状 $(n_{l-1}, 1)$）；\n\n根据反向传播四大方程：\n- 权重矩阵梯度：$dW = \\boldsymbol{\\delta}^{[l]} (\\mathbf{a}^{[l-1]})^T$（形状 $(n_l, n_{l-1})$）；\n- 偏置梯度：$db = \\boldsymbol{\\delta}^{[l]}$（形状 $(n_l, 1)$）；\n- 回传给前一层的未门控误差信号（前层激活值的导数）：$da_{\\text{in}} = (W^{[l]})^T \\boldsymbol{\\delta}^{[l]}$（形状 $(n_{l-1}, 1)$）。\n\n函数返回包含 `(dW.tolist(), db.tolist(), da_in.tolist())` 的元组。\n\n最后一行请以 `d_out = [[0.5], [-0.2]]`, `w_mat = [[1.0, 2.0], [3.0, 4.0]]`, `a_prev = [[0.8], [0.6]]` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import Tuple, List\n\ndef dense_backward(delta_out, W, a_in) -> Tuple[List[List[float]], List[List[float]], List[List[float]]]:\n    \"\"\"从零计算全连接层对权重、偏置及前层输入的反向传播梯度\"\"\"\n    # 请在此实现\n    ___\n\nd_out = [[0.5], [-0.2]]\nw_mat = [[1.0, 2.0], [3.0, 4.0]]\na_prev = [[0.8], [0.6]]\ndense_backward(d_out, w_mat, a_prev)\n",
            "setupCode": "",
            "expectedOutput": "([[0.4, 0.3], [-0.16, -0.12]], [[0.5], [-0.2]], [[-0.1], [0.2]])",
            "answer": "import numpy as np\nfrom typing import Tuple, List\n\ndef dense_backward(delta_out, W, a_in) -> Tuple[List[List[float]], List[List[float]], List[List[float]]]:\n    delta_out = np.array(delta_out, dtype=float)\n    W = np.array(W, dtype=float)\n    a_in = np.array(a_in, dtype=float)\n    \n    # 1. 权重梯度外积\n    dW = delta_out @ a_in.T\n    # 2. 偏置梯度\n    db = delta_out.copy()\n    # 3. 前向输入激活导数 (W^T @ delta)\n    da_in = W.T @ delta_out\n    \n    dW_round = np.round(dW, 4).tolist()\n    db_round = np.round(db, 4).tolist()\n    da_round = np.round(da_in, 4).tolist()\n    return dW_round, db_round, da_round\n\nd_out = [[0.5], [-0.2]]\nw_mat = [[1.0, 2.0], [3.0, 4.0]]\na_prev = [[0.8], [0.6]]\ndense_backward(d_out, w_mat, a_prev)\n",
            "tests": "d_t = [[1.0]]\nw_t = [[2.0, 3.0]]\na_t = [[4.0], [5.0]]\ndW_t, db_t, da_t = dense_backward(d_t, w_t, a_t)\nassert dW_t == [[4.0, 5.0]] and db_t == [[1.0]] and da_t == [[2.0], [3.0]], f\"测试未通过: {dW_t}, {db_t}, {da_t}\"\n",
            "explanation": "利用矩阵外积 @ 计算 dW，利用转置矩阵乘法回传误差 da_in，完全契合反向传播经典四大矩阵方程。",
            "tags": ["反向传播", "矩阵外积", "算法实战", "梯度计算"],
            "related_lesson_id": "ml-dl-l2-2",
        },
        single_choice(
            ex_id="ml-dl-c2-ex7",
            question="在前向模式自动微分（Forward-mode AD）与反向模式自动微分（Reverse-mode AD）的对偶对比中，下列哪种应用场景最适合采用前向模式自动微分？",
            options=[
                {"value": "A", "text": "输入自变量维度极少（如单输入标量 $x \\in \\mathbb{R}$），而输出因变量维度极多（如输出数万维曲线坐标 $\\mathbf{y} \\in \\mathbb{R}^{10000}$）的物理轨迹模拟"},
                {"value": "B", "text": "具有上亿参数的卷积图像分类模型"},
                {"value": "C", "text": "以二元交叉熵标量损失为目标的逻辑回归"},
                {"value": "D", "text": "具有数万亿 Token 的 Transformer 自回归语言模型"},
            ],
            answer="A",
            explanation="前向模式自动微分的时间复杂度正比于输入自变量的维度。当输入维度仅为 1（单标量）而输出维度很大时，前向模式只需 1 次前向传递即可同时求出该标量对所有输出维度的导数，效率远超反向模式。而选项 B、C、D 均属于输入维度巨大、输出单一标量损失的场景，反向模式是绝对唯一的最佳选择。",
            difficulty=2,
            related_lesson_id="ml-dl-l2-1",
            tags=["前向自动微分", "反向自动微分", "适用场景对比"],
        ),
    ]

    return chapter(
        chapter_id="ml-dl-c2",
        course_id="ml-deep-learning",
        order=2,
        title="反向传播计算图与矩阵微分推导",
        goal="掌握计算图与自动微分体系，掌握反向传播四大矩阵方程严格推导，并从零实现纯手写 NumPy 反向传播训练器。",
        lessons=lessons,
        exercises=exercises,
    )
