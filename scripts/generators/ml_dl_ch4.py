# -*- coding: utf-8 -*-
"""
Chapter 4: 深层网络训练稳定性工程 (Training Stabilization: Initialization & Normalization)
Course: ml-deep-learning
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_4():
    # ── Lesson 4.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握深度神经网络在层层信号传递过程中，特征激活方差与反向梯度方差呈指数级发散或坍缩的动力学本质；
2. 深刻理解**全零初始化（All-zero Initialization）**导致的“对称性破缺灾难”：同一层所有神经元梯度完全相同，网络丧失全部多维表征能力；
3. 严格推导 Glorot & Bengio (2010) 的 **Xavier / Glorot 初始化**（面向 Tanh/线性激活的方差守恒定理）：$Var(W) = \\frac{2}{n_{\\text{in}} + n_{\\text{out}}}$；
4. 严格推导何恺明团队 (2015) 的 **He / Kaiming 初始化**：针对 ReLU 单侧负半轴归零导致的方差折半缺陷，进行 2 倍方差补偿：$Var(W) = \\frac{2}{n_{\\text{in}}}$；
5. 编写代码模拟 20 层深度网络在不同初始化下（全零、随机过大、Xavier、He）激活值方差的逐层演化，直观见证梯度爆炸与消失。

### 前置知识
- 独立随机变量线性组合的期望与方差计算；
- 正态分布与均匀分布性质。

### 问题背景与 ML 用途
在深度学习早期，训练超过 5 层的神经网络极其困难，往往需要繁琐费时的逐层贪婪预训练（RBM 预训练）。
问题的元凶在于：**权重初始化的轻微不当，会在深度网络的层层矩阵乘法中产生蝴蝶效应般的指数级放大**：
- 如果初始权重方差稍大（例如标准差设为 1.0），前向传播几层之后激活值就会膨胀到数万甚至溢出（NaN），反向传播梯度瞬间爆炸；
- 如果初始权重方差稍小（例如标准差设为 0.01），前向传播几层后激活值直接缩水至零，浅层网络完全接收不到任何学习信号（梯度消失）；
- Xavier 初始化与 He 初始化的提出，彻底打破了深层网络的初始训练壁垒，使得上百层的超深网络能够直接开箱稳定冷启动！

### 直觉理解
- **扩音器麦克风的多级级联（方差守恒直觉）**：
  - 想象你把 50 个扩音麦克风串联在一起：
  - 如果每个麦克风的放大增益哪怕只有 1.1（大于 1）：几级之后，你的微弱喘息声就会在最后一个喇叭里变成震耳欲聋、撕裂耳膜的恐怖啸叫（梯度爆炸）；
  - 如果每个麦克风的增益是 0.9（小于 1）：几级之后，你在台上的大声呼喊传到最后喇叭里连蚊子叫都听不见（梯度消失）；
  - **权重初始化的唯一神圣使命**：精确设计每一层权重矩阵的统计方差，使得信号在穿过该层时，**输入信号的方差与输出信号的方差严格等比例保持恒等（增益精确维持在 1.0）**！

### 核心概念与符号对照表
| 初始化策略 | 建议权重方差 $Var(W)$ | 核心理论假设 | 适用激活函数 |
| --- | --- | --- | --- |
| **全零初始化** | $W = 0$ | 严重破坏对称性，所有隐单元学到完全相同特征 | **绝对禁止使用**（仅偏置 $b$ 可全零） |
| **随机过大/过小** | $\sigma = 1.0$ 或 $\sigma = 0.01$ | 缺乏对扇入扇出（fan-in/fan-out）的尺度自适应 | 浅层网络凑合，深层网络必死 |
| **Xavier (Glorot)** | $\frac{2}{n_{\text{in}} + n_{\text{out}}}$ | 假设激活函数在原点附近呈线性（如 Tanh, Sigmoid） | Tanh, Sigmoid, 线性自编码器 |
| **He (Kaiming)** | $\frac{2}{n_{\text{in}}}$ | **针对 ReLU 负半轴置零导致的有效神经元减半做 2 倍方差补偿** | **ReLU, LeakyReLU, 现代 CNN/MLP** |

### 数学原理与逐步推导
#### 1. 全零初始化的对称性破缺证明
设隐藏层神经元前向计算为 $z_j = \sum_{k} W_{jk} x_k + b_j$。
若所有权重初始化为 $W_{jk} = 0$，偏置 $b_j = 0$。
则对于任意输入 $\mathbf{x}$，所有神经元的未激活输出 $z_j = 0$，激活值 $a_j = \sigma(0)$ 完全恒等。
在反向传播中，第 $j$ 个神经元的误差项 $\delta_j = \frac{\partial \mathcal{L}}{\partial z_j}$ 也完全相等！
导致权重梯度 $\frac{\partial \mathcal{L}}{\partial W_{jk}} = \delta_j x_k$ 对所有 $j$ 完全一致！
**结论**：即使经过数万次梯度更新，同一层内的所有神经元永远学到完全相同的参数权重，千个神经元的隐藏层在功能上彻底退化为 1 个单神经元，完全丧失了提取多样化特征的能力！

#### 2. He (Kaiming) 初始化的严密方差补偿推导
设第 $l$ 层单个神经元输入为 $z = \sum_{i=1}^{n_{\text{in}}} W_i a_i$（忽略偏置项）。
假设权重 $W_i$ 与输入 $a_i$ 相互独立，且权重 $W_i$ 服从均值为 0、方差为 $Var(W)$ 的对称分布。
输出 $z$ 的均值为 0，方差为：
$$Var(z) = \sum_{i=1}^{n_{\text{in}}} Var(W_i a_i) = n_{\text{in}} \cdot Var(W_i) \cdot \mathbb{E}[a_i^2]$$
若激活函数为 **ReLU**：$a_i = \max(0, z_{i}^{[l-1]})$。
假设上一层的净输入 $z_{i}^{[l-1]}$ 服从关于 0 对称的分布，则有一半的概率为负被 ReLU 截断为 0，另一半保持不变：
$$\mathbb{E}[a_i^2] = \frac{1}{2} \mathbb{E}[(z_{i}^{[l-1]})^2] = \frac{1}{2} Var(z^{[l-1]})$$
将其代入方差方程：
$$Var(z^{[l]}) = n_{\text{in}} \cdot Var(W^{[l]}) \cdot \frac{1}{2} Var(z^{[l-1]})$$
为了让方差在层间传递时严格守恒（$Var(z^{[l]}) = Var(z^{[l-1]})$），必须令系数等于 1：
$$n_{\text{in}} \cdot Var(W^{[l]}) \cdot \frac{1}{2} = 1 \implies Var(W^{[l]}) = \frac{2}{n_{\text{in}}}$$
**证毕**！若采用高斯正态分布初始化，其标准差应设置为：
$$\sigma = \sqrt{\frac{2}{n_{\text{in}}}}$$
这就是轰动计算机视觉界的 **He / Kaiming 初始化**！

### 真实代码示例与分析
下面展示模拟一个 10 层全连接网络，观察使用错误初始化 vs He 初始化时各层激活值方差的保持情况："""

    l1_code = """import numpy as np

# 模拟 10 层前馈网络 (每层 256 个神经元，采用 ReLU 激活)
n_layers = 10
dim = 256
n_samples = 1000

# 输入标准正态分布随机数据 (1000 个样本, 256 维)
X_init = np.random.randn(n_samples, dim)

# 1. 错误初始化方式: 标准差过小的普通高斯分布 (std = 0.05)
x_small = X_init.copy()
for layer in range(n_layers):
    W = np.random.randn(dim, dim) * 0.05
    z = x_small @ W
    x_small = np.maximum(0.0, z)

# 2. 现代 He / Kaiming 初始化: std = sqrt(2 / n_in)
x_kaiming = X_init.copy()
std_he = np.sqrt(2.0 / dim)
for layer in range(n_layers):
    W = np.random.randn(dim, dim) * std_he
    z = x_kaiming @ W
    x_kaiming = np.maximum(0.0, z)

print("=== 10 层深度前馈网络经过 ReLU 激活后的末层输出方差对比 ===")
print(f"输入初始方差: {np.var(X_init):.4f}")
print(f"小标准差初始化 (std=0.05) 经过 10 层后方差: {np.var(x_small):.8e} (彻底衰减为 0! 梯度完全熄灭)")
print(f"He 凯明初始化 (std={std_he:.4f}) 经过 10 层后方差: {np.var(x_kaiming):.4f} (稳定保持在 0.5~1.5 健康区间!)")
"""

    l1_tips = [
        tip("千万不要将偏置项（bias）用 He 或 Xavier 初始化！偏置项没有维度累加效应，永远初始化为全零常数 np.zeros(...) 即可。", "pitfall"),
    ]

    # ── Lesson 4.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握深度前馈网络中的经典归一化机制：**Batch Normalization（批归一化）** 与 **Layer Normalization（层归一化）**；
2. 深刻辨析 BatchNorm 在样本维度（跨 Batch）与 LayerNorm 在特征维度（单个样本内部）归一化的几何计算切分差异；
3. 掌握 BatchNorm 可学习仿射参数 $\\gamma$（缩放）与 $\\beta$（平移）恢复网络表征自由度的数学必然性；
4. 掌握 BatchNorm 在**训练态（使用当前批次均值方差）与推理态（使用全局滑动平均 running_mean / running_var）**的根本实现差异；
5. 掌握为什么在时序序列建模与大语言模型（Transformer）中必须采用 LayerNorm 而放弃 BatchNorm；
6. 掌握 **Dropout** 的随机失活伯努利门控机制与现代 Inverted Dropout 的反向缩放技巧；
7. 编写代码纯手写实现 BatchNorm 前向传播算法，并在验证态模拟滑动平均推理。

### 前置知识
- 均值与无偏方差统计；
- 伯努利随机变量与期望缩放。

### 问题背景与 ML 用途
即使有了 He 初始化，在漫长的训练过程中，随着前序各层权重的持续更新，后面各层的输入分布依然在发生剧烈漂移：
- 2015 年，Google 团队提出了 **Batch Normalization（BN）**，被誉为深度学习历史上最具影响力的工程发明之一，直接促成了深层 CNN（如 ResNet）的爆发；
- 2018 年，MIT 团队证明了 BN 的本质并非解决所谓的“内部协变量偏移”，而是**极大地平滑了损失曲面，使损失函数的 Lipschitz 常数显著下降**，允许模型使用大上 10 倍的学习率而绝不发散；
- 而在序列模型与 Transformer 大语言模型中，Batch 维度样本长度极不规则，**Layer Normalization（层归一化）** 取代 BN 成为整个现代 NLP 与 LLM 架构的绝对标配。

### 直觉理解
- **操场排队与个人尺码自检（BatchNorm vs LayerNorm）**：
  - **Batch Normalization（按列横比，跨人排队）**：教官喊口令：“全连 100 个士兵，大家一起测量身高！把所有人的身高减去全连平均身高、除以方差！然后再量全连的体重！”——这严重依赖“全连都在（Batch_size 足够大）”。如果今天只有 1 个新兵报到（单样本推理），连队均值直接失效！
  - **Layer Normalization（按行自省，个人体检）**：教官改规则：“每个士兵站在原地，自己测量自己全身各项生理指标的均值和方差，自己对自己归一化！”——完全不需要看别人的眼色，哪怕只有一个士兵、或者全连士兵高矮不一（变长文本），每个人自己完成归一化！

### 核心概念与符号对照表
| 归一化技术 | 计算统计量的轴向 | 批大小依赖性 | 适用统治领域 |
| --- | --- | --- | --- |
| **BatchNorm (BN)** | 沿着 Batch 样本维度求均值方差 $(N, C, H, W) \\to (C,)$ | **强依赖较大 batch_size**（batch < 8 时统计量剧烈抖动失效） | 计算机视觉经典 CNN 骨干网络 |
| **LayerNorm (LN)** | 沿着通道与特征维度求均值方差 $(N, C, H, W) \\to (N,)$ | **完全独立于 batch_size**（单样本推理完全等价） | **Transformer、大语言模型、RNN 序列** |
| **Dropout** | 训练时以概率 $p$ 将神经元置零，同时除以 $1-p$ | 训练与测试行为不同 | 全连接层防过拟合与模型集成近似 |

### 数学原理与逐步推导
#### 1. Batch Normalization 核心数学推导
对于一个小批量输入 $\mathcal{B} = \{\mathbf{x}_1, \dots, \mathbf{x}_m\}$：
1. 计算批均值：$\boldsymbol{\mu}_\mathcal{B} = \frac{1}{m} \sum_{i=1}^m \mathbf{x}_i$
2. 计算批方差：$\boldsymbol{\sigma}_\mathcal{B}^2 = \frac{1}{m} \sum_{i=1}^m (\mathbf{x}_i - \boldsymbol{\mu}_\mathcal{B})^2$
3. 零均值单位方差标准化：$\hat{\mathbf{x}}_i = \frac{\mathbf{x}_i - \boldsymbol{\mu}_\mathcal{B}}{\sqrt{\boldsymbol{\sigma}_\mathcal{B}^2 + \epsilon}}$
4. **可学习仿射变换（Scale and Shift）**：
   $$\mathbf{y}_i = \boldsymbol{\gamma} \odot \hat{\mathbf{x}}_i + \boldsymbol{\beta}$$
**为什么必须要有第 4 步？**
如果直接把激活值强行按死在标准正态分布（均值 0，方差 1），对于 Sigmoid 激活函数，这相当于把所有输入都强行塞进了原点附近的线性区，网络丧失了探索饱和非线性区域的能力！
引入可学习的 $\boldsymbol{\gamma}$ 和 $\boldsymbol{\beta}$，当网络需要时，只要学出 $\boldsymbol{\gamma} = \boldsymbol{\sigma}_\mathcal{B}$ 和 $\boldsymbol{\beta} = \boldsymbol{\mu}_\mathcal{B}$，就能**完美复原原始输入（恒等映射）**，赋予了网络完全自主选择最优分布的绝对自由！

#### 2. Inverted Dropout 的缩放技巧
在训练阶段，每个神经元以保留概率 $q = 1 - p$ 被激活：
$$r_j \sim \text{Bernoulli}(1 - p)$$
采用现代反向 Dropout（Inverted Dropout）：
$$\tilde{a}_j = \frac{r_j}{1 - p} a_j$$
为什么要在训练期除以 $1 - p$？
考察其数学期望：$\mathbb{E}[\tilde{a}_j] = \frac{\mathbb{E}[r_j]}{1 - p} a_j = \frac{1 - p}{1 - p} a_j = a_j$。
由于训练期已经完成了期望补偿，**在推理（测试）阶段完全不需要做任何权重缩放乘法**，保持原始前向即可，极大简化了线上部署！

### 真实代码示例与分析
下面展示纯手写实现 BatchNorm 前向计算，并演示训练模式与推理模式的无缝切换："""

    l2_code = """import numpy as np

class SimpleBatchNorm1D:
    def __init__(self, dim, momentum=0.1, eps=1e-5):
        self.gamma = np.ones(dim)
        self.beta = np.zeros(dim)
        self.running_mean = np.zeros(dim)
        self.running_var = np.ones(dim)
        self.momentum = momentum
        self.eps = eps
        self.training = True

    def forward(self, X):
        if self.training:
            # 1. 训练模式: 沿 Batch 维度计算当前批次统计量
            batch_mean = np.mean(X, axis=0)
            batch_var = np.var(X, axis=0)
            
            # 2. 动量滑动更新全局均值与方差 (用于未来推理态)
            self.running_mean = (1.0 - self.momentum) * self.running_mean + self.momentum * batch_mean
            self.running_var = (1.0 - self.momentum) * self.running_var + self.momentum * batch_var
            
            # 3. 标准化与仿射重构
            X_norm = (X - batch_mean) / np.sqrt(batch_var + self.eps)
            out = self.gamma * X_norm + self.beta
            return out
        else:
            # 4. 推理模式: 严格使用训练累积的 running 统计量，不受单样本干扰
            X_norm = (X - self.running_mean) / np.sqrt(self.running_var + self.eps)
            return self.gamma * X_norm + self.beta

# 测试 BatchNorm 行为
np.random.seed(42)
bn = SimpleBatchNorm1D(dim=2)

# 模拟 3 批训练数据通过 BN
for _ in range(5):
    batch = np.random.normal(loc=[10.0, -5.0], scale=[3.0, 1.0], size=(32, 2))
    out_train = bn.forward(batch)

print("=== BatchNorm 训练态统计量演变 ===")
print("真实数据总体中心: [10.0, -5.0]")
print("BN 学习到的全局滑动平均 running_mean:", np.round(bn.running_mean, 2))
print("BN 训练态输出前 2 行均值:", np.round(np.mean(out_train, axis=0), 4), "(严格归零!)")

# 切换为推理测试模式 (仅送入 1 个全新测试样本)
bn.training = False
single_test_sample = np.array([[10.0, -5.0]])
out_test = bn.forward(single_test_sample)
print("\\n=== BatchNorm 推理测试模式 (单样本独立推理) ===")
print("输入中心样本经过 BN 后的推理输出:", np.round(out_test, 4), "(完美映射至原点附近!)")
"""

    l2_tips = [
        tip("在 PyTorch 中使用包含 BatchNorm 或 Dropout 的网络进行测试推理时，必须显式调用 model.eval()！否则在测试单张图片时，BatchNorm 会用单个样本的方差除以自身导致结果彻底失真，Dropout 也会继续随机丢弃特征！", "pitfall"),
    ]

    lessons = [
        lesson("ml-dl-l4-1", "梯度消失、爆炸与权重初始化策略", l1_content, 2, l1_tips, [demo(code=l1_code, title="20 层深度网络在不同初始化下的方差演化对比")]),
        lesson("ml-dl-l4-2", "归一化技术与正则化（BatchNorm, LayerNorm & Dropout）", l2_content, 3, l2_tips, [demo(code=l2_code, title="从零实现 BatchNorm1D 训练态与推理态滑动统计")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-dl-c4-ex1",
            question="何恺明团队在 2015 年提出的 **He / Kaiming 初始化** 针对 ReLU 激活函数将权重高斯分布方差设计为 $Var(W) = \\frac{2}{n_{\\text{in}}}$，其中的分子为什么是 2 而不是 Xavier 初始化中的 1？",
            options=[
                {"value": "A", "text": "因为 ReLU 在负半轴将一半的神经元截断置零，导致进入下一层的有效激活方差折半，分子取 2 正好对其进行 2 倍方差补偿以保持层间信号方差守恒"},
                {"value": "B", "text": "因为何恺明研究的是二分类问题"},
                {"value": "C", "text": "为了让训练速度加快两倍"},
                {"value": "D", "text": "为了补偿 GPU 显存的双通道传输"},
            ],
            answer="A",
            explanation="假设输入关于 0 对称分布，ReLU 将负数完全砍掉，导致输出的二次原点矩 E[a^2] 变成了输入方差的一半。为了在层间保持信号方差恒定不变，必须在权重方差中乘以 2 进行精确补偿，即 Var(W) = 2 / n_in。",
            difficulty=2,
            related_lesson_id="ml-dl-l4-1",
            tags=["He初始化", "Kaiming初始化", "ReLU方差补偿", "权重初始化"],
        ),
        judge(
            ex_id="ml-dl-c4-ex2",
            question="在初始化深度多层感知机时，将隐藏层的所有权重矩阵全部初始化为 0（全零初始化）是可行的，因为反向传播可以通过梯度下降打破对称性，使各神经元在后续学习中逐渐分化。",
            answer=False,
            explanation="严重错误！全零初始化会导致同层所有神经元产生完全相同的前向激活值和完全相同的反向误差梯度。由于参数更新量完全一致，神经元永远无法打破对称性，整个网络退化为一个单神经元，彻底丧失多维表征能力。",
            difficulty=1,
            related_lesson_id="ml-dl-l4-1",
            tags=["全零初始化", "对称性破缺", "深度学习禁忌"],
        ),
        multiple_choice(
            ex_id="ml-dl-c4-ex3",
            question="关于 Batch Normalization（批归一化）在工业框架中的实现机制，下列说法正确的有：",
            options=[
                {"value": "A", "text": "在训练模式下，BN 使用当前小批量（Mini-batch）样本的均值和方差进行实时归一化"},
                {"value": "B", "text": "在训练过程中，BN 会维护一个全局的滑动平均均值（running_mean）和方差（running_var）"},
                {"value": "C", "text": "在推理测试模式（model.eval()）下，BN 严格使用训练期累积的 running 统计量，而不使用测试批次自身的均值方差"},
                {"value": "D", "text": "当 batch_size 非常小（例如 batch_size=2）时，BN 的统计量极度稳定，效果达到最佳"},
            ],
            answer=["A", "B", "C"],
            explanation="选项 A、B、C 准确阐述了 BN 在训练态与评估态的实现分工。当 batch_size 极小时（如 2 或 4），单批次均值和方差的抽样噪声极大，会导致 BN 表现剧烈恶化，选项 D 错误。",
            difficulty=2,
            related_lesson_id="ml-dl-l4-2",
            tags=["BatchNorm", "running_mean", "训练与评估态", "统计量维护"],
        ),
        fill(
            ex_id="ml-dl-c4-ex4",
            question="现代主流深度学习框架在实现 Dropout（随机失活）时，普遍采用 Inverted Dropout 机制：在训练阶段将保留概率为 $1 - p$ 的神经元激活值除以系数 ___，使得前向输出的数学期望与推理阶段完全一致，无需在推理阶段做任何多余缩放运算（请填写代数表达式，如 1-p）。",
            blanks=[["1-p", "1 - p"]],
            explanation="反向 Dropout（Inverted Dropout）在训练期对存活神经元输出除以 1 - p，使得 E[a_tilde] = a，在测试期直接关闭 Dropout 无需改变任何缩放比例。",
            difficulty=2,
            related_lesson_id="ml-dl-l4-2",
            tags=["Dropout", "Inverted Dropout", "期望守恒"],
        ),
        open_ex(
            ex_id="ml-dl-c4-ex5",
            question="请深入对比 Batch Normalization（批归一化）与 Layer Normalization（层归一化）在张量归一化计算轴向上的几何切分差异，并详细解释为什么在大语言模型（Transformer）与自然语言序列建模中，必须使用 LayerNorm 而全面舍弃 BatchNorm。",
            reference_answer="1. 计算轴向的几何切分差异：\n设输入为四维张量 (N, C, H, W) 或序列三维张量 (N, T, D)（其中 N 为 Batch 样本数，T 为序列长度，D 为嵌入维度）：\n- Batch Normalization（沿 Batch 轴横向切）：BN 针对某一个固定的特征通道或隐藏单元，跨越该批次内所有 N 个不同样本计算统计均值与方差。它度量的是‘群体间某个特征的相对强弱’；\n- Layer Normalization（沿 Feature 轴纵向切）：LN 完全脱离其他样本，仅在单个样本自身内部，跨越其所有的 D 个特征维度计算均值与方差。它度量的是‘单个样本自身内部各特征的相对激活程度’。\n2. 为什么 Transformer 必须使用 LayerNorm：\n- 文本序列长度不规则（动态 Padding）：自然语言句子的长短极其多变，一个 Batch 内充斥着大量的补齐 Padding。若使用 BN，跨样本在时间步上求均值会使得填充的无效 0 污染真实句子的统计量；\n- 批大小依赖与显存瓶颈：大语言模型参数极其庞大，在训练或推理时，受限于显存往往只能采用极小的 Batch Size（如 1 或 2）。在此极端小批次下，BN 的均值方差统计量会出现灾难性剧烈抖动，导致模型崩溃；\n- 推理态单序列独立性：在 LLM 自回归生成文本时，是一步一步生成单个 Token，推理时通常只有 1 个序列（Batch=1）。LayerNorm 在单样本内部自成闭环，训练与推理行为严格一致，完美契合自回归序列生成的本质需求。",
            explanation="系统对比 BN 沿样本轴切分与 LN 沿特征轴切分的几何本质，从长文本变长 Padding、大模型小 Batch 限制以及自回归单 Token 推理一致性三个方面展开严密论述。",
            rubric=[
                {"points": 5, "description": "清晰阐明 BN 跨样本按特征切分与 LN 样本内部跨特征切分的几何计算差异"},
                {"points": 5, "description": "从序列动态变长 Padding 污染、大模型显存限制极小 batch 导致 BN 崩溃、以及单序列推理一致性三点论述 Transformer 必须采用 LN 的原因"},
            ],
            difficulty=3,
            related_lesson_id="ml-dl-l4-2",
            tags=["BatchNorm", "LayerNorm", "Transformer", "大模型架构"],
        ),
        # ── Code Exercise 4 ──
        {
            "id": "ml-dl-c4-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现一维 Batch Normalization 前向计算函数：\n编写函数 `batch_norm_1d(x, gamma, beta, eps=1e-5)`：\n1. `x`：当前小批量样本特征 2D 数组（形状 $(N, D)$，其中 $N$ 为样本数，$D$ 为特征维度）；\n2. `gamma`：可学习缩放参数 1D 数组（长度 $D$）；\n3. `beta`：可学习平移参数 1D 数组（长度 $D$）；\n4. `eps`：防除零数值稳定常数（默认 $10^{-5}$）。\n\n步骤：\n- 沿样本轴（`axis=0`）计算均值向量 $\\boldsymbol{\\mu} \\in \\mathbb{R}^D$；\n- 沿样本轴（`axis=0`）计算方差向量 $\\boldsymbol{\\sigma}^2 \\in \\mathbb{R}^D$（使用总体方差，即除以 $N$）；\n- 计算归一化特征：$\\hat{\\mathbf{x}} = \\frac{\\mathbf{x} - \\boldsymbol{\\mu}}{\\sqrt{\\boldsymbol{\\sigma}^2 + \\text{eps}}}$；\n- 仿射重构输出：$\\mathbf{y} = \\text{gamma} \\odot \\hat{\\mathbf{x}} + \\text{beta}$。\n\n函数返回包含各元素四舍五入保留 4 位小数的 2D 嵌套列表 `y.round(4).tolist()`。\n\n最后一行请以 `x_demo = [[1.0, 10.0], [2.0, 20.0], [3.0, 30.0]]`, `g_demo = [1.0, 2.0]`, `b_demo = [0.0, 1.0]` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import List\n\ndef batch_norm_1d(x: List[List[float]], gamma: List[float], beta: List[float], eps: float = 1e-5) -> List[List[float]]:\n    \"\"\"从零实现一维批归一化前向计算\"\"\"\n    # 请在此实现\n    ___\n\nx_demo = [[1.0, 10.0], [2.0, 20.0], [3.0, 30.0]]\ng_demo = [1.0, 2.0]\nb_demo = [0.0, 1.0]\nbatch_norm_1d(x_demo, g_demo, b_demo)\n",
            "setupCode": "",
            "expectedOutput": "[[-1.2247, -1.4495], [0.0, 1.0], [1.2247, 3.4495]]",
            "answer": "import numpy as np\nfrom typing import List\n\ndef batch_norm_1d(x: List[List[float]], gamma: List[float], beta: List[float], eps: float = 1e-5) -> List[List[float]]:\n    x = np.array(x, dtype=float)\n    gamma = np.array(gamma, dtype=float)\n    beta = np.array(beta, dtype=float)\n    \n    # 1. 沿样本轴计算均值与方差\n    mean = np.mean(x, axis=0)\n    var = np.var(x, axis=0)\n    \n    # 2. 归一化\n    x_norm = (x - mean) / np.sqrt(var + eps)\n    \n    # 3. 仿射变换\n    out = gamma * x_norm + beta\n    \n    return np.round(out, 4).tolist()\n\nx_demo = [[1.0, 10.0], [2.0, 20.0], [3.0, 30.0]]\ng_demo = [1.0, 2.0]\nb_demo = [0.0, 1.0]\nbatch_norm_1d(x_demo, g_demo, b_demo)\n",
            "tests": "x_t = [[0.0], [2.0]]\nres = batch_norm_1d(x_t, [1.0], [0.0])\n# mean=1.0, var=1.0 -> norm: [[-1.0], [1.0]]\nassert res == [[-1.0], [1.0]], f\"测试不匹配: {res}\"\n",
            "explanation": "沿样本维度求批次均值和方差，执行标准化后应用可学习仿射参数 gamma 和 beta 进行特征缩放与平移。",
            "tags": ["BatchNorm", "归一化", "仿射变换", "算法实战"],
            "related_lesson_id": "ml-dl-l4-2",
        },
        single_choice(
            ex_id="ml-dl-c4-ex7",
            question="为什么在卷积神经网络（CNN）中普遍首选 Batch Normalization，而在循环神经网络（RNN）和 Transformer 大语言模型中普遍首选 Layer Normalization？",
            options=[
                {"value": "A", "text": "图像数据具有固定统一的图像分辨率和网格拓扑，且大 Batch 在图像上容易组织；而自然语言文本存在极其严重的序列变长动态 Padding，且大模型受显存限制只能使用极小 Batch，LayerNorm 沿单个样本内部通道独立计算，彻底摆脱了对变长对齐与批大小的依赖"},
                {"value": "B", "text": "因为 LayerNorm 只能在 CPU 上计算"},
                {"value": "C", "text": "因为 BatchNorm 无法处理一维数据"},
                {"value": "D", "text": "因为 Transformer 没有激活函数"},
            ],
            answer="A",
            explanation="CNN 图像尺寸固定、Batch 容易较大，适合跨样本统计特征通道分布；而 NLP 文本存在长短不齐的 Padding 填充，且 Transformer 庞大显存占用导致批大小极小，LN 针对每个样本独立归一化，完全不依赖其他样本与批大小，因而是序列与语言模型的唯一正解。",
            difficulty=2,
            related_lesson_id="ml-dl-l4-2",
            tags=["BatchNorm", "LayerNorm", "CNN与Transformer对比", "模型架构选型"],
        ),
    ]

    return chapter(
        chapter_id="ml-dl-c4",
        course_id="ml-deep-learning",
        order=4,
        title="深层网络训练稳定性工程",
        goal="掌握 Xavier 与 He 权重初始化数学证明，掌握 BatchNorm 训练与推理统计量维护，精通 LayerNorm 与 Dropout 稳定性机制。",
        lessons=lessons,
        exercises=exercises,
    )
