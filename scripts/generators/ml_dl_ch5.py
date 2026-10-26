# -*- coding: utf-8 -*-
"""
Chapter 5: 视觉卷积与序列建模核心结构 (CNNs & Sequence RNN/LSTM Models)
Course: ml-deep-learning
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_5():
    # ── Lesson 5.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 深刻理解全连接网络（MLP）处理高维图像时面临的参数爆炸与空间拓扑摧毁缺陷；
2. 掌握卷积神经网络（CNN）的三大核心归纳偏置：局部连接（Local Connectivity）、权值共享（Weight Sharing）与平移等变性（Translation Equivariance）；
3. 熟练掌握卷积前向尺寸计算公式：$O = \\lfloor \\frac{W - K + 2P}{S} \\rfloor + 1$、感受野（Receptive Field）递推与最大池化（MaxPooling）；
4. 掌握经典视觉架构的演化脉络：LeNet-5、AlexNet（ReLU/Dropout/GPU并行）、VGG-16（小卷积核堆叠）；
5. 严格推导何恺明团队 ResNet（残差网络）的数学机理，证明残差连接 $\\mathcal{H}(\\mathbf{x}) = \\mathcal{F}(\\mathbf{x}) + \\mathbf{x}$ 如何通过**反向传播梯度中的“加 1 恒等项”彻底破除网络退化与梯度弥散**；
6. 编写代码使用纯 NumPy 实现二维图像卷积（互相关）运算，直观提取图像的垂直边缘与高频轮廓。

### 前置知识
- 矩阵切片与滑动窗口；
- 二元函数泰勒展开。

### 问题背景与 ML 用途
如果输入一张 $1000 \\times 1000$ 像素的彩色图像（300 万个输入数值）：
- 如果使用全连接隐藏层（设隐藏层包含 1000 个神经元），仅仅这单单一个隐藏层就需要 $300 \\text{万} \\times 1000 = 30$ 亿个浮点参数！
- 更致命的是：全连接层把图像强行展平为一维长向量，像素之间的上下左右二维空间几何邻域关系被彻底割裂粉碎！
**卷积神经网络（CNN）是人类计算机视觉史上的最伟大革命**：
- 它模拟哺乳动物初级视皮层（V1）对局部边缘方向的感受野机制；
- 通过让一个微小的局部卷积核在全图滑窗扫描，参数量从数十亿断崖式缩减至数千个，开启了自动驾驶目标检测、医学影像识别与人脸解锁的现代 AI 视觉时代。

### 直觉理解
- **图章盖印与局部侦探（权值共享直觉）**：
  - 全连接层就像给画面的每一个像素点都雇佣一个专属保镖（300 万个保镖），各干各的，谁也不认识谁；
  - 卷积核就像一个小巧的**特征印章（如一个 $3 \\times 3$ 的‘猫耳朵检测图章’）**。侦探拿着这个图章在整张画面的每一个角落滑动按压盖印：无论猫咪出现在画面的左上角、正中央还是右下角，图章滑到猫耳朵上方时都会爆发出强烈的响应打分！这就赋予了网络极其强悍的**平移等变性**！
- **高速公路与辅道立交桥（ResNet 残差直觉）**：
  - 普通平原网络像是一条连续穿过 100 个收费站的狭窄山路，任何一个收费站堵车断流（梯度衰减），整条路全部瘫痪（网络退化）；
  - **ResNet 残差网络**：在山路旁边架设了一条全封闭、零收费的**高架超导高速公路（残差跳跃连接）**！主干信号与反向梯度顺着高速公路无阻碍直通终点，山路（残差分支 $\\mathcal{F}$）只需要做微小的局部微调！

### 核心概念与符号对照表
| 核心概念 | 数学公式 / 尺寸 | 物理意义 |
| --- | --- | --- |
| **卷积输出尺寸** | $O = \\lfloor \\frac{W - K + 2P}{S} \\rfloor + 1$ | 输入宽 $W$、核大小 $K$、填充 $P$、步长 $S$ 下的特征图宽度 |
| **残差块前向** | $\\mathbf{x}_{l+1} = \\sigma(\\mathbf{x}_l + \\mathcal{F}(\\mathbf{x}_l, \\mathcal{W}_l))$ | 残差分支加上恒等映射直连 |
| **残差反向梯度** | $\\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_l} = \\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_L} \\left( \\mathbf{I} + \\frac{\\partial}{\\partial \\mathbf{x}_l} \\sum \\mathcal{F} \\right)$ | **恒等项 $\\mathbf{I}$ 保证梯度绝不归零**，破除梯度消失 |

### 数学原理与逐步推导
#### ResNet 残差连接打破梯度消失的严格数学证明
考察一个包含 $L$ 个残差块的网络。第 $l$ 个残差单元的前向输出递归表示为：
$$\\mathbf{x}_{l+1} = \\mathbf{x}_l + \\mathcal{F}(\\mathbf{x}_l, \\mathcal{W}_l)$$
对于任意深层 $L$ 和浅层 $l$（$L > l$），展开递归公式：
$$\\mathbf{x}_L = \\mathbf{x}_l + \\sum_{i=l}^{L-1} \\mathcal{F}(\\mathbf{x}_i, \\mathcal{W}_i)$$
根据微积分链式法则，损失 $\\mathcal{E}$ 关于浅层激活 $\\mathbf{x}_l$ 的梯度为：
$$\\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_l} = \\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_L} \\frac{\\partial \\mathbf{x}_L}{\\partial \\mathbf{x}_l} = \\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_L} \\left( \\mathbf{I} + \\frac{\\partial}{\\partial \\mathbf{x}_l} \\sum_{i=l}^{L-1} \\mathcal{F}(\\mathbf{x}_i, \\mathcal{W}_i) \\right)$$
**重大数学结论**：
观察括号内的第一项 **单位矩阵 $\\mathbf{I}$**！
- 无论残差分支的梯度 $\\frac{\\partial}{\\partial \\mathbf{x}_l} \\sum \\mathcal{F}$ 多么微小甚至趋近于零，**括号内部永远恒有一个无条件的“+1 项（单位阵 $\\mathbf{I}$）”作为保底通道**！
- 即使深层网络的权重矩阵范数很小，顶层的损失梯度 $\\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_L}$ 依然能够顺着恒等映射直通车，**完全无损地 100% 直达最浅层输入端 $\\mathbf{x}_l$**！
这就是为什么 ResNet 能够轻松突破上千层深度、彻底斩获 CVPR 2016 最佳论文的数学底层神迹！

### 真实代码示例与分析
下面展示使用纯 NumPy 实现二维卷积（Sobel 水平边缘提取算子）前向扫描："""

    l1_code = """import numpy as np

def conv2d_forward(image: np.ndarray, kernel: np.ndarray, stride: int = 1, padding: int = 0) -> np.ndarray:
    \"\"\"从零实现二维卷积 (互相关) 滑窗前向计算\"\"\"
    if padding > 0:
        image_padded = np.pad(image, ((padding, padding), (padding, padding)), mode='constant')
    else:
        image_padded = image
        
    H, W = image_padded.shape
    k_h, k_w = kernel.shape
    
    # 计算输出特征图尺寸
    out_h = (H - k_h) // stride + 1
    out_w = (W - k_w) // stride + 1
    output = np.zeros((out_h, out_w))
    
    # 局部滑窗点积
    for i in range(out_h):
        for j in range(out_w):
            h_start = i * stride
            w_start = j * stride
            patch = image_padded[h_start:h_start + k_h, w_start:w_start + k_w]
            output[i, j] = np.sum(patch * kernel)
            
    return output

# 1. 构造一个包含清晰水平边缘的 6x6 灰度图像 (上半部分为白色 10，下半部分为黑色 0)
sample_image = np.array([
    [10, 10, 10, 10, 10, 10],
    [10, 10, 10, 10, 10, 10],
    [10, 10, 10, 10, 10, 10],
    [ 0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0],
    [ 0,  0,  0,  0,  0,  0],
], dtype=float)

# 2. 定义经典的 Sobel 水平边缘检测卷积核 (3x3)
sobel_horizontal_kernel = np.array([
    [ 1,  2,  1],
    [ 0,  0,  0],
    [-1, -2, -1]
], dtype=float)

# 3. 执行无填充有效卷积 (Valid Convolution)
edge_feature_map = conv2d_forward(sample_image, sobel_horizontal_kernel, stride=1, padding=0)

print("=== 原始合成图像 (6x6) ===")
print(sample_image)
print("\\n=== Sobel 卷积后特征图 (4x4, 边缘响应特征) ===")
print(np.round(edge_feature_map, 1))
print("验证: 第 2 行爆发出强烈的正响应 40.0，精准捕获了画面中央的明暗分界水平边缘！")
"""

    l1_tips = [
        tip("VGG 网络的核心设计哲学：使用多个 3x3 小卷积核堆叠代替大卷积核（例如两个 3x3 串联感受野等同于一个 5x5，但参数量减少 28%，且增加了非线性层数），这一原则已成为现代 CNN 与 Vision Transformer 的通用准则。", "performance"),
    ]

    # ── Lesson 5.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握时间序列与自然语言序列建模的循环时序假说；
2. 掌握简单循环神经网络（Simple RNN）隐藏状态更新前向方程与时间展开计算图（Unfolded Graph）；
3. 严格推导随时间反向传播（BPTT）算法中权重矩阵 $W_{hh}$ 跨时间步连乘引发**梯度消失与梯度爆炸的微积分机理**；
4. 掌握 Hochreiter & Schmidhuber 提出的 **长短期记忆网络（LSTM, 1997）** 门控架构：细胞状态（Cell State）、遗忘门（$f_t$）、输入门（$i_t$）与输出门（$o_t$）；
5. 从数学加法更新 $C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t$ 严格证明为什么细胞状态能够实现梯度跨越成百上千个时间步无损超导流动；
6. 掌握门控循环单元（GRU, 2014）将隐藏状态与细胞状态合二为一的轻量化演进；
7. 编写代码使用纯 NumPy 实现单时间步 LSTM 前向门控更新。

### 前置知识
- 矩阵微积分链式法则；
- 矩阵特征值与谱半径。

### 问题背景与 ML 用途
语言、音频、股票走势、心电图全都是**动态时间序列**：当前时刻词语的含义极度依赖于前面的上下文（例如“中国队大胜美国队”与“中国队大败美国队”）。
- 简单 RNN 通过隐藏状态 $h_t$ 像接力棒一样跨时间步传递记忆；
- 但在长序列上，BPTT 反向传播会导致权重矩阵 $W_{hh}$ 经历数十次连乘 $(W_{hh})^T$。若特征值模长略小于 1，梯度在 10 步之后灰飞烟灭；若大于 1，梯度瞬间爆炸成 NaN！这使得经典 RNN 根本无法记住超过 10 个词的远距离信息；
- **LSTM 通过精妙的“三重门控与线性加法通道”**，彻底解决了长距离梯度流动的物理难题，成为 Transformer 诞生前统治自然语言处理长达二十年的绝对霸主。

### 直觉理解
- **传送带上的可擦写传送带（LSTM 门控直觉）**：
  - **细胞状态 $C_t$（超长传送带）**：就像一条从无穷远处匀速开来的超长传送带，信息在上面平稳滑行，只要没有人干扰，记忆可以永远保存；
  - **遗忘门 $f_t$（激光擦除器）**：读取当前词后，决定把传送带上过去的哪些旧信息擦掉（例如读到新段落主角换成了小红，遗忘门擦除前面关于小明的旧记忆）；
  - **输入门 $i_t$（新型喷墨头）**：决定把当前句子里哪些至关重要的新事实（如小红的年龄和职业）写入传送带；
  - **输出门 $o_t$（信息筛选滤镜）**：决定把传送带上的哪些综合信息提炼为当前时刻的对外回答输出 $h_t$！

### 核心概念与符号对照表
| 门控结构 | 数学表达式 | 激活函数 | 核心功能 |
| --- | --- | --- | --- |
| **遗忘门 $f_t$** | $\sigma(W_f [h_{t-1}, x_t] + b_f)$ | Sigmoid (0~1) | 0 代表全忘，1 代表全留，按比例滤除历史记忆 |
| **输入门 $i_t$** | $\sigma(W_i [h_{t-1}, x_t] + b_i)$ | Sigmoid (0~1) | 控制候选新记忆写入细胞状态的比例 |
| **候选记忆 $\tilde{C}_t$** | $\tanh(W_c [h_{t-1}, x_t] + b_c)$ | Tanh (-1~1) | 基于当前输入提取的新候选特征 |
| **细胞状态更新** | **$C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t$** | **线性加法更新** | **梯度无阻碍流动的超导高速公路** |
| **输出门 $o_t$** | $\sigma(W_o [h_{t-1}, x_t] + b_o)$ | Sigmoid (0~1) | 控制细胞状态向外部隐藏状态 $h_t$ 的输出 |

### 数学原理与逐步推导
#### LSTM 细胞状态打破 BPTT 梯度消失的数学证明
在标准简单 RNN 中，前向方程为 $h_t = \tanh(W_{hh} h_{t-1} + W_{xh} x_t)$。
损失对早期隐藏状态 $h_1$ 的梯度包含连乘雅可比矩阵：
$$\frac{\partial h_T}{\partial h_1} = \prod_{t=2}^T \frac{\partial h_t}{\partial h_{t-1}} = \prod_{t=2}^T \text{diag}(1 - h_t^2) W_{hh}^T$$
由于矩阵连乘 $(W_{hh}^T)^{T-1}$，当最大特征值不等于 1 时，必然导致梯度指数级爆炸或衰减为 0。
现在考察 **LSTM 细胞状态 $C_t$ 的梯度反向流动**：
$$C_t = f_t \odot C_{t-1} + i_t \odot \tilde{C}_t$$
求偏导：
$$\frac{\partial C_t}{\partial C_{t-1}} = \text{diag}(f_t) + \dots$$
在长距离反向回传中：
$$\frac{\partial C_T}{\partial C_1} = \prod_{t=2}^T \text{diag}(f_t) + \dots$$
**核心数学奇迹**：
- 如果网络学会将遗忘门设为 $f_t \approx 1$（保持长远记忆），则导数 $\frac{\partial C_t}{\partial C_{t-1}} \approx 1$！
- 连乘项变成了 $\prod 1.0 = 1.0$！梯度既不会爆炸，也不会消失，而是**顺着细胞状态加法通道无损回传了上百个时间步**！

### 真实代码示例与分析
下面展示纯手写实现单个时间步的 LSTM 单元（Cell）前向门控更新："""

    l2_code = """import numpy as np

def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -15, 15)))

class SimpleLSTMCell:
    def __init__(self, input_dim: int, hidden_dim: int):
        self.hidden_dim = hidden_dim
        concat_dim = input_dim + hidden_dim
        
        # 初始化 4 个门控的权重与偏置 (采用统一大矩阵加速)
        np.random.seed(42)
        self.W_f = np.random.randn(hidden_dim, concat_dim) * 0.1
        self.b_f = np.ones((hidden_dim, 1))  # 遗忘门偏置初始化为 1 (初始默认全记住)
        
        self.W_i = np.random.randn(hidden_dim, concat_dim) * 0.1
        self.b_i = np.zeros((hidden_dim, 1))
        
        self.W_c = np.random.randn(hidden_dim, concat_dim) * 0.1
        self.b_c = np.zeros((hidden_dim, 1))
        
        self.W_o = np.random.randn(hidden_dim, concat_dim) * 0.1
        self.b_o = np.zeros((hidden_dim, 1))

    def forward_step(self, x_t: np.ndarray, h_prev: np.ndarray, c_prev: np.ndarray) -> tuple:
        \"\"\"单步执行 LSTM 门控运算\"\"\"
        # 拼接前一时刻隐藏状态与当前输入: concat 形状 (input_dim + hidden_dim, 1)
        concat = np.vstack([h_prev, x_t])
        
        # 1. 遗忘门: 遗忘过去多少旧细胞状态
        f_t = sigmoid(self.W_f @ concat + self.b_f)
        
        # 2. 输入门与候选新记忆
        i_t = sigmoid(self.W_i @ concat + self.b_i)
        c_tilde = np.tanh(self.W_c @ concat + self.b_c)
        
        # 3. 细胞状态加法更新 (核心超导公路)
        c_t = f_t * c_prev + i_t * c_tilde
        
        # 4. 输出门与当前对外隐藏状态
        o_t = sigmoid(self.W_o @ concat + self.b_o)
        h_t = o_t * np.tanh(c_t)
        
        return h_t, c_t, f_t, i_t, o_t

# 测试单步 LSTM 门控流转
cell = SimpleLSTMCell(input_dim=3, hidden_dim=2)
x = np.array([[1.0], [0.5], [-0.5]])
h0 = np.zeros((2, 1))
c0 = np.zeros((2, 1))

h1, c1, f, i, o = cell.forward_step(x, h0, c0)

print("=== LSTM 门控前向单步计算验证 ===")
print("遗忘门 f_t 开度 (初始约 1.0):", np.round(f.ravel(), 3))
print("输入门 i_t 开度:", np.round(i.ravel(), 3))
print("输出门 o_t 开度:", np.round(o.ravel(), 3))
print("新细胞状态 c_1 记忆:", np.round(c1.ravel(), 4))
print("新隐藏状态 h_1 输出:", np.round(h1.ravel(), 4))
"""

    l2_tips = [
        tip("LSTM 工业工程经验：在初始化 LSTM 时，务必将遗忘门的偏置项 b_f 初始化为全 1.0（如 self.b_f = np.ones(...)）！这使得初始状态下 f_t = sigmoid(1.0) ≈ 0.73，保证在训练刚开始时不会盲目擦除过往上下文，训练稳定性大幅飙升。", "interview"),
    ]

    lessons = [
        lesson("ml-dl-l5-1", "卷积神经网络（CNN）与经典视觉骨架", l1_content, 2, l1_tips, [demo(code=l1_code, title="从零实现 2D 卷积前向计算与 Sobel 边缘提取")]),
        lesson("ml-dl-l5-2", "循环神经网络（RNN）与长短期记忆（LSTM）", l2_content, 3, l2_tips, [demo(code=l2_code, title="纯 NumPy 手写单时间步 LSTM 门控前向流转")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-dl-c5-ex1",
            question="何恺明团队提出的 **ResNet（残差网络）** 在数学上能够成功训练超过 152 层甚至 1000 层的超深网络，其最关键的数学破局点是什么？",
            options=[
                {"value": "A", "text": "残差跳跃连接将反向传播链式求导展开式中引入了一个无条件的恒等项单位阵 $\\mathbf{I}$（‘加 1 保证’），即使卷积残差分支的梯度极小，顶层监督信号依然能顺着恒等捷径无损直达浅层"},
                {"value": "B", "text": "ResNet 彻底抛弃了反向传播，改用前向学习"},
                {"value": "C", "text": "ResNet 将所有卷积核的大小都强制设置为了 100x100"},
                {"value": "D", "text": "ResNet 取消了所有的非线性激活函数"},
            ],
            answer="A",
            explanation="由公式 ∂E/∂x_l = ∂E/∂x_L * (I + ∂/∂x_l ∑ F)，括号内的单位阵 I 是恒等映射的导数。它保证了反向传播梯度永远不会因为连乘小于 1 的权重矩阵而衰减为 0，彻底化解了超深网络的退化与梯度弥散难题。",
            difficulty=2,
            related_lesson_id="ml-dl-l5-1",
            tags=["ResNet", "残差连接", "恒等映射", "梯度超导"],
        ),
        judge(
            ex_id="ml-dl-c5-ex2",
            question="在传统的简单循环神经网络（Simple RNN）中，参数矩阵 $W_{hh}$ 在所有的 $T$ 个时间步之间是完全权值共享的，因此在长序列随时间反向传播（BPTT）中会导致 $(W_{hh})^T$ 的多次连续矩阵幂次连乘，必然不可避免地引发梯度指数级爆炸或消失。",
            answer=True,
            explanation="正确。简单 RNN 的 BPTT 链式法则包含对 W_hh 权重的多次连续幂乘，其最大特征值（谱半径）若大于 1 则梯度爆炸，若小于 1 则梯度消失，使得其难以捕获超过十几个时间步的长程上下文关联。",
            difficulty=2,
            related_lesson_id="ml-dl-l5-2",
            tags=["RNN", "BPTT", "长距离依赖", "梯度爆炸"],
        ),
        multiple_choice(
            ex_id="ml-dl-c5-ex3",
            question="在长短期记忆网络（LSTM）的三重门控设计中，下列各门控组件的功能陈述正确的有：",
            options=[
                {"value": "A", "text": "遗忘门（Forget Gate）：输出在 $[0, 1]$ 之间，用于控制上一时刻细胞状态 $C_{t-1}$ 中有多少旧记忆应当被擦除遗忘"},
                {"value": "B", "text": "输入门（Input Gate）：与候选记忆配合，用于决定当前时刻提取的新特征有多少应当被写入细胞状态"},
                {"value": "C", "text": "细胞状态更新采用线性和 $C_t = f_t \\odot C_{t-1} + i_t \\odot \\tilde{C}_t$，这是保障长程梯度不衰减的超导核心通道"},
                {"value": "D", "text": "输出门完全不使用当前输入 $x_t$，只根据历史记忆决定输出"},
            ],
            answer=["A", "B", "C"],
            explanation="输出门公式为 o_t = sigmoid(W_o [h_{t-1}, x_t] + b_o)，明确接收当前输入 x_t，因此选项 D 错误。A、B、C 均为 LSTM 门控核心机制。",
            difficulty=2,
            related_lesson_id="ml-dl-l5-2",
            tags=["LSTM", "遗忘门", "输入门", "细胞状态"],
        ),
        fill(
            ex_id="ml-dl-c5-ex4",
            question="在二维卷积神经网络中，若输入特征图的高宽为 $W=32$，卷积核尺寸为 $K=5$，填充边界为 $P=2$，滑动步长为 $S=1$。根据经典尺寸公式 $O = \\lfloor \\frac{W - K + 2P}{S} \\rfloor + 1$，输出特征图的高宽 $O$ 精确为 ___（请填写整数）。",
            blanks=[["32"]],
            explanation="O = (32 - 5 + 2 * 2) / 1 + 1 = (32 - 5 + 4) / 1 + 1 = 31 + 1 = 32。这也是经典所谓的‘Same Convolution’（尺寸保持不变）。",
            difficulty=1,
            related_lesson_id="ml-dl-l5-1",
            tags=["卷积尺寸", "SamePadding", "特征图计算"],
        ),
        open_ex(
            ex_id="ml-dl-c5-ex5",
            question="请详细推导 ResNet 残差连接的反向传播梯度公式：$\\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_l} = \\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_L} \\left( \\mathbf{I} + \\frac{\\partial}{\\partial \\mathbf{x}_l} \\sum_{i=l}^{L-1} \\mathcal{F}(\\mathbf{x}_i, \\mathcal{W}_i) \\right)$，并深入论述为什么 152 层的 ResNet 能够极其顺畅地训练收敛，而没有任何跳跃连接的 20 层普通平原网络（Plain Net）却会遭遇严重的退化（Degradation）与训练崩溃。",
            reference_answer="1. 残差反向梯度公式推导：\n设残差单元前向更新为 x_{i+1} = x_i + F(x_i, W_i)。对于深层 L 和浅层 l，累加展开得：\nx_L = x_l + \\sum_{i=l}^{L-1} F(x_i, W_i)\n损失函数 E 关于浅层输入 x_l 的梯度，由链式法则可得：\n\\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_l} = \\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_L} \\cdot \\frac{\\partial \\mathbf{x}_L}{\\partial \\mathbf{x}_l} = \\frac{\\partial \\mathcal{E}}{\\partial \\mathbf{x}_L} \\left( \\mathbf{I} + \\frac{\\partial}{\\partial \\mathbf{x}_l} \\sum_{i=l}^{L-1} \\mathcal{F}(\\mathbf{x}_i, \\mathcal{W}_i) \\right)\n2. 为什么平原网络崩溃而 152 层 ResNet 顺畅收敛：\n- 平原网络的连乘死穴：在普通的平原网络中，x_{l+1} = \\sigma(W_l x_l)。深层梯度回传是 L-l 个权重矩阵与激活导数的连乘 ∏ W_i^T σ'。当层数达到 20 层时，连乘因子的范数如果小于 1，浅层梯度几乎以指数级归零（梯度弥散）；同时，由于网络非凸优化极其困难，即使加入了 BN 缓解了梯度消失，多层嵌套的非线性变换使得优化器极难找到一组权重来实现最起码的‘恒等映射’，导致深层网络的训练误差反而比浅层网络更高（即网络退化现象）；\n- ResNet 的超导破局：在 ResNet 中，括号内存在一个无条件的恒等项单位阵 I。无论后面的复杂非线性残差映射 F 的梯度多么微弱或者混乱，顶层梯度 ∂E/∂x_L 乘以 I 之后，都能 100% 毫无损耗地直接回传到浅层 x_l！\n此外，当某几层是冗余无需学习的新特征时，优化器只需极其简单地将残差权重 W 衰减置零（令 F(x) = 0），整个残差块就自然退化为一个纯净的恒等传递（Identity Mapping），保证了深层模型的假说空间必然单调包含浅层模型，彻底消除了网络退化，让 152 层的超深网络能够被极速稳定优化。",
            explanation="从前向累加展开推导带有单位阵 I 的反向梯度公式，从矩阵连乘衰减与恒等映射优化难度两方面对比平原网络退化与 ResNet 超导收敛机理。",
            rubric=[
                {"points": 5, "description": "严密推导包含单位矩阵 I 的反向传播链式梯度表达式"},
                {"points": 5, "description": "从梯度超导无损直传浅层与残差 F(x) 容易置零退化为恒等映射两个核心维度解释其破解退化的本质"},
            ],
            difficulty=4,
            related_lesson_id="ml-dl-l5-1",
            tags=["ResNet", "残差网络推导", "梯度超导", "网络退化"],
        ),
        # ── Code Exercise 5 ──
        {
            "id": "ml-dl-c5-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现单通道 2D 卷积有效特征提取（Valid Convolution）：\n编写函数 `conv2d_valid(image, kernel)`：\n1. `image`：2D 输入灰度图像数组或嵌套列表（尺寸 $H \\times W$）；\n2. `kernel`：2D 卷积核数组或嵌套列表（尺寸 $K_h \\times K_w$）；\n在无填充（`padding=0`）且步长为 1（`stride=1`）下执行标准的二维互相关运算：\n输出特征图的尺寸为 $(H - K_h + 1) \\times (W - K_w + 1)$。在每个局部窗口内执行对应元素乘积累加求和。\n\n函数返回包含各元素四舍五入保留 2 位小数的 2D 嵌套列表 `output.round(2).tolist()`。\n\n最后一行请以 `img_demo = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]`, `k_demo = [[1, 0], [0, -1]]` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import List\n\ndef conv2d_valid(image: List[List[float]], kernel: List[List[float]]) -> List[List[float]]:\n    \"\"\"从零执行单通道 2D 有效卷积 (步长 1, 无填充)\"\"\"\n    # 请在此实现\n    ___\n\nimg_demo = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\nk_demo = [[1, 0], [0, -1]]\nconv2d_valid(img_demo, k_demo)\n",
            "setupCode": "",
            "expectedOutput": "[[-4.0, -4.0], [-4.0, -4.0]]",
            "answer": "import numpy as np\nfrom typing import List\n\ndef conv2d_valid(image: List[List[float]], kernel: List[List[float]]) -> List[List[float]]:\n    img = np.array(image, dtype=float)\n    k = np.array(kernel, dtype=float)\n    H, W = img.shape\n    kh, kw = k.shape\n    \n    out_h = H - kh + 1\n    out_w = W - kw + 1\n    out = np.zeros((out_h, out_w))\n    \n    for i in range(out_h):\n        for j in range(out_w):\n            patch = img[i:i+kh, j:j+kw]\n            out[i, j] = np.sum(patch * k)\n            \n    return np.round(out, 2).tolist()\n\nimg_demo = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]\nk_demo = [[1, 0], [0, -1]]\nconv2d_valid(img_demo, k_demo)\n",
            "tests": "im_t = [[1, 1], [1, 1]]\nk_t = [[1, 1], [1, 1]]\nres_t = conv2d_valid(im_t, k_t)\nassert res_t == [[4.0]], f\"测试不匹配: {res_t}\"\n",
            "explanation": "双层嵌套循环遍历滑动窗口，在每个切片区域与卷积核执行哈达玛积后求和，生成局部特征图。",
            "tags": ["2D卷积", "CNN基础", "滑窗互相关", "算法实战"],
            "related_lesson_id": "ml-dl-l5-1",
        },
        single_choice(
            ex_id="ml-dl-c5-ex7",
            question="门控循环单元（GRU, Gated Recurrent Unit）相较于标准长短期记忆网络（LSTM），在结构设计上做出的最主要精简是什么？",
            options=[
                {"value": "A", "text": "取消了独立的细胞状态（Cell State $C_t$），将遗忘门与输入门融合为一个更新门（Update Gate），参数量减少约 25% 且训练速度显著提升"},
                {"value": "B", "text": "完全取消了所有激活函数"},
                {"value": "C", "text": "不再支持按时间反向传播"},
                {"value": "D", "text": "强制序列长度必须是偶数"},
            ],
            answer="A",
            explanation="GRU 将 LSTM 的遗忘门和输入门巧妙合并为单一的更新门（Update Gate z_t），并结合重置门（Reset Gate r_t），直接通过隐藏状态 h_t 传递记忆，参数量相较 LSTM 缩减约 1/4，在中小规模序列数据上表现优异且轻量。",
            difficulty=2,
            related_lesson_id="ml-dl-l5-2",
            tags=["GRU", "LSTM对比", "门控循环单元", "轻量化模型"],
        ),
    ]

    return chapter(
        chapter_id="ml-dl-c5",
        course_id="ml-deep-learning",
        order=5,
        title="视觉卷积与序列建模核心结构",
        goal="掌握 CNN 局部连接平移等变性与 ResNet 残差超导数学推导，精通 RNN/BPTT 局限与 LSTM 门控超导通道。",
        lessons=lessons,
        exercises=exercises,
    )
