import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 视觉架构
 *  08 AlexNet  ·  09 ResNet
 *
 *  来源：
 *  - AlexNet: Krizhevsky, Sutskever, Hinton (2012) arXiv:1207.0580
 *  - ResNet:  He, Zhang, Ren, Sun (2015) arXiv:1512.03385
 *  - 参考：Ojhaharsh/30u30 第 08/09 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行（hybridRunner 自动路由）。
 * ============================================================ */

export const paperVisionChapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c1: AlexNet
   * ============================================================ */
  {
    id: 'paper-vision-c1',
    title: 'AlexNet：深度学习的引爆点',
    goal: '理解端到端学习为什么能突破手工特征的天花板，掌握五个关键技巧的原理与代价，能手写并验证简化版 AlexNet。',
    lessons: [
      {
        id: 'paper-vision-c1-l1',
        title: '为什么 2012 年是分水岭',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 说明手工特征工程的天花板与「数据/算力/算法」三条件为何缺一不可；
2. 熟练用 out=⌊(in+2pad-k)/stride⌋+1 推导 AlexNet 逐层特征图尺寸，并计算参数量分布（全连接占 94%）；
3. 解释 ReLU（导数恒 1 防梯度消失，代价 dying ReLU）、inverted Dropout（保持期望）与数据增强的原理与代价。

### 前置知识

- 神经网络基础与反向传播；
- 卷积操作的定义；
- 过拟合概念。

### 问题背景

2012 年前视觉是手工特征（SIFT/HOG）+分类器的天下——「识别猫需要什么特征」没人说得清，人的想象力就是模型的上限。AlexNet 在 ImageNet 上一口气把 Top-5 错误率砍掉 10 个点（26.2%→15.3%），靠的不是单一算法突破，而是数据（120 万张）、算力（GPU 512 核）、算法（ReLU+Dropout）三条件同时成熟，加上「端到端学特征」的范式替换。此后特征工程师退场，深度学习进场。

### 直觉理解

传统视觉像「师傅带徒弟」：人先把猫耳、胡须总结成规则（SIFT/HOG），分类器只做最后判断。AlexNet 像「放羊式教育」：只给题目和答案（图与标签），让 8 层网络自己摸索——第一层摸出边缘条纹（和 SIFT 撞车），第三层之后摸出轮子、眼睛这些人类从未写进规则的特征。机器终于超过了出题人的想象力。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | ImageNet Classification with Deep Convolutional Neural Networks |
| **作者** | Alex Krizhevsky, Ilya Sutskever, Geoffrey Hinton |
| **发表** | NeurIPS 2012 |
| **arXiv** | [1207.0580](https://arxiv.org/abs/1207.0580) |
| **一句话贡献** | 用 GPU 训练的深度 CNN 把 ImageNet Top-5 错误率从 26.2% 降到 15.3% |

**这个 10.9 个百分点的差距意味着什么**：

ImageNet 竞赛（ILSVRC）的传统是——每年进步 1~2 个点就算不错。
AlexNet 一年跳了 10 个点，**而且第二名用的还是传统方法 + 大量手工调优**。

这不是"改进"，这是**范式更替**。

## 2012 年之前：特征工程的天花板

**传统视觉流程**：

    图像 → [人工设计的特征] → [分类器] → 类别
              ↑
         SIFT / HOG / SURF / LBP...

**每个特征都是人想出来的**：

| 特征 | 捕捉什么 | 谁设计的 |
| --- | --- | --- |
| **SIFT** | 尺度不变的关键点 | David Lowe, 1999 |
| **HOG** | 梯度方向直方图（轮廓） | Dalal & Triggs, 2005 |
| **LBP** | 局部二值模式（纹理） | Ojala et al., 1994 |

**问题在哪**：

> **人只能想到"边缘""角点""纹理"这些低级特征。**
> **什么样的特征对"识别猫"有用？没人知道。**

**这就是特征工程的天花板**——人类的想象力限制了模型的上限。

<FeatureEngineeringDemo />

## 为什么是 2012 年：三个条件同时成熟

很多人以为 AlexNet 的成功是"算法突破"，其实它是**三个条件交汇**的结果。

<ThreeConditionsDemo />

### 条件一：数据（ImageNet）

| 时间 | 数据集 | 规模 |
| --- | --- | --- |
| 2000s | Caltech-101 | 约 9,000 张 |
| 2009 | **ImageNet** | **120 万张**，1000 类 |
| 2012 | ImageNet 竞赛 | 同上 |

**为什么关键**：深度网络有 6000 万参数，
用 9,000 张图训练必然过拟合。**120 万张才够**。

**李飞飞团队的贡献常被低估**——没有 ImageNet，AlexNet 无处施展。

### 条件二：算力（GPU）

**CNN 的计算特点**：

    卷积 = 大量的小矩阵乘法
    全连接 = 大矩阵乘法
    → 都是高度并行的

**CPU vs GPU**：

| 硬件 | 核心数 | 适合 |
| --- | --- | --- |
| CPU（2012） | 4~8 核 | 串行逻辑 |
| **GTX 580** | **512 CUDA 核** | **并行矩阵运算** |

**关键事件**：CUDA 于 2007 年发布，让 GPU 能做通用计算。

**AlexNet 用了 2 块 GTX 580（各 3GB 显存），训练 5~6 天**。
用当时的 CPU 需要数月。

### 条件三：算法（ReLU + Dropout）

**ReLU**（2010 年前后被广泛采用）解决了深层网络的梯度消失。
**Dropout**（Hinton 2012）解决了大模型的过拟合。

**三个条件缺一不可**：

| 缺什么 | 后果 |
| --- | --- |
| 缺数据 | 6000 万参数在 9000 张图上严重过拟合 |
| 缺算力 | 训练需要数月，无法迭代 |
| 缺 ReLU | 8 层网络梯度消失，训不动 |

**这就是为什么更早不行**：2010 年之前，三个条件都不具备。

## 核心突破：端到端学习

**AlexNet 的根本改变**：不告诉模型该提取什么特征。

    传统：图像 → [人设计的特征] → 分类器
    AlexNet：图像 → [CNN 自己学的特征] → 分类器

**CNN 学到了什么**（可视化各层卷积核）：

| 层 | 学到的特征 |
| --- | --- |
| **第 1 层** | 边缘、颜色斑块、方向条纹（类似 Gabor 滤波器） |
| **第 2 层** | 角点、纹理、简单形状 |
| **第 3 层** | 物体部件（轮子、眼睛、叶子） |
| **第 4-5 层** | 完整物体、场景 |
| **FC 层** | 类别语义 |

**关键洞察**：**第 1 层学到的和 SIFT 手工设计的很像**——
但第 3 层之后，人根本设计不出来。

**这就是"端到端"的威力**：机器能发现人想不到的特征。

## AlexNet 的完整结构

<AlexNetArchDemo />

**逐层尺寸推导**（理解 CNN 的基本功）：

    输入: 224×224×3

    Conv1: 96 个 11×11, stride 4, pad 2
      → (224 + 2×2 - 11)/4 + 1 = 55
      → 55×55×96

    MaxPool: 3×3, stride 2
      → (55 - 3)/2 + 1 = 27
      → 27×27×96

    Conv2: 256 个 5×5, stride 1, pad 2
      → (27 + 4 - 5)/1 + 1 = 27
      → 27×27×256

    MaxPool: 3×3, stride 2
      → (27 - 3)/2 + 1 = 13
      → 13×13×256

    Conv3: 384 个 3×3, pad 1  → 13×13×384
    Conv4: 384 个 3×3, pad 1  → 13×13×384
    Conv5: 256 个 3×3, pad 1  → 13×13×256

    MaxPool: 3×3, stride 2
      → (13 - 3)/2 + 1 = 6
      → 6×6×256

    Flatten: 6×6×256 = 9216

    FC1: 9216 → 4096  (+Dropout 0.5)
    FC2: 4096 → 4096  (+Dropout 0.5)
    FC3: 4096 → 1000  (softmax)

**输出公式**（务必记住）：

    out = ⌊(in + 2×pad - kernel) / stride⌋ + 1

## 参数量分布：一个关键观察

<ParamDistributionDemo />

| 层 | 计算 | 参数量 | 占比 |
| --- | --- | --- | --- |
| Conv1 | 3×96×11×11 + 96 | 34,944 | 0.06% |
| Conv2 | 96×256×5×5 + 256 | 614,656 | 1.0% |
| Conv3 | 256×384×3×3 + 384 | 885,120 | 1.5% |
| Conv4 | 384×384×3×3 + 384 | 1,327,488 | 2.2% |
| Conv5 | 384×256×3×3 + 256 | 884,992 | 1.5% |
| **FC1** | **9216×4096 + 4096** | **37,752,832** | **62.8%** |
| **FC2** | **4096×4096 + 4096** | **16,781,312** | **27.9%** |
| FC3 | 4096×1000 + 1000 | 4,097,000 | 6.8% |
| **合计** | | **约 6000 万** | |

**两个惊人的事实**：

1. **全连接层占了 96% 的参数**，卷积层只有 4%
2. **FC1 一层就有 3775 万参数**——比所有卷积层加起来多 10 倍

**为什么这是问题**：

| 问题 | 说明 |
| --- | --- |
| **参数量大** | 容易过拟合（所以才需要 Dropout） |
| **丢失空间信息** | Flatten 把 6×6×256 压成 9216，位置关系全丢了 |
| **无法适应不同输入尺寸** | 输入必须是 224×224 |
| **计算量大** | 3775 万次乘法 |

**这就是 ResNet 用全局平均池化（GAP）替代 FC 的动机**（下一节详述）。

## 五个关键技巧详解

### ① ReLU：让深层网络能训练

**问题**：Sigmoid 的导数最大只有 0.25。

    10 层连乘：0.25^10 ≈ 9.5e-7
    → 梯度几乎为 0，底层参数几乎不更新

**ReLU**：f(x) = max(0, x)

    导数：x > 0 时为 1，x < 0 时为 0
    10 层连乘：1^10 = 1
    → 梯度不衰减

<ActivationCompareDemo />

**代价：神经元死亡（Dying ReLU）**

如果某个神经元的输入**永远是负数**（比如学习率过大导致权重跑偏），
它的输出恒为 0，导数恒为 0，**永远无法恢复**。

**缓解方法**：

| 方法 | 做法 |
| --- | --- |
| **Leaky ReLU** | x<0 时返回 0.01x，保留微小梯度 |
| **PReLU** | 负区斜率作为可学习参数 |
| **ELU** | 负区用指数函数，平滑过渡 |
| **GELU** | 高斯误差线性单元，现代 Transformer 标配 |

### ② Dropout：防过拟合

**做法**：训练时以概率 p 随机把神经元输出置 0。

    training:  h = h * mask / (1-p)    # mask 是伯努利采样
    inference: h = h                    # 不丢弃

**为什么除以 (1-p)**：保持期望不变（inverted dropout）。

    训练时：E[h · mask/(1-p)] = h · E[mask]/(1-p) = h · (1-p)/(1-p) = h ✓

**为什么有效**（三种解释）：

| 解释 | 说明 |
| --- | --- |
| **集成学习** | 相当于训练 2^n 个子网络，推理时做集成 |
| **防止共适应** | 神经元不能依赖特定"伙伴"，必须独立有用 |
| **数据增强** | 在特征空间加噪声 |

**推理时怎么办**：不丢弃，直接前向（因为训练时已做了缩放）。

### ③ 数据增强：零成本的训练数据

**ImageNet 有 120 万张，但 6000 万参数仍然容易过拟合**。

**AlexNet 的做法**：

| 方法 | 参数 | 说明 |
| --- | --- | --- |
| **随机裁剪** | 从 256×256 裁 224×224 | 位置不变性 |
| **水平翻转** | 50% 概率 | 左右不变性 |
| **颜色抖动** | 调整 RGB 通道强度 | 光照不变性 |
| **PCA 颜色扰动** | 沿主成分方向扰动 | 更自然的颜色变化 |

**效果**：等效把训练集扩大数倍，且**零标注成本**。

**现代数据增强**（比 AlexNet 强得多）：

| 方法 | 思路 |
| --- | --- |
| **Mixup** | 两张图线性混合，标签也混合 |
| **CutMix** | 裁剪一张图的区域贴到另一张 |
| **RandAugment** | 自动搜索增强策略组合 |
| **AutoAugment** | 用强化学习找最优增强 |

### ④ GPU 训练

**为什么 CNN 适合 GPU**：

    卷积 → im2col → 大矩阵乘法
    全连接 → 大矩阵乘法
    矩阵乘法 → 高度并行，GPU 的强项

**AlexNet 的工程细节**：

- 2 块 GTX 580（各 3GB）
- 网络拆成两半，只在特定层通信
- 训练 5~6 天（90 个 epoch）

**注意**：**双 GPU 拆分是显存不够的工程妥协，不是算法创新**。
后来的实现都合并成单卡。

### ⑤ LRN（局部响应归一化）

**做法**：对同一位置相邻通道做归一化。

    b = a / (k + α·Σ(a_j²))^β

**目的**：模拟生物神经元的"侧抑制"（相邻神经元互相抑制）。

**现状：已淘汰**。

| 问题 | 说明 |
| --- | --- |
| 效果有限 | 只提升 1~2 个点 |
| 计算慢 | 需要跨通道求和 |
| **被 BatchNorm 取代** | BN 效果更好、更稳定 |

**保留它的意义**：体现了"从神经科学借灵感"的思路。

## 从 AlexNet 学到什么

| 教训 | 后续影响 |
| --- | --- |
| **端到端学习 > 手工特征** | 特征工程退出主流 |
| **深度很重要**（8 层当时算"很深"） | 走向更深（ResNet 152 层） |
| **ReLU 是标配** | 所有现代网络的默认 |
| **Dropout 防过拟合** | 后被 BN + 增强 + 权重衰减部分替代 |
| **GPU 是必需品** | 算力成为 AI 核心要素 |
| **全连接层参数太多** | ResNet 用 GAP 替代 |

## 本节来源

> **来源类型：学术来源**
> - AlexNet: *ImageNet Classification with Deep Convolutional Neural Networks*，
>   arXiv:[1207.0580](https://arxiv.org/abs/1207.0580)
>   （Krizhevsky, Sutskever, Hinton, NeurIPS 2012）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 08 篇
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
def conv_out(in_, k, pad, stride): return (in_ + 2*pad - k)//stride + 1
def cparams(cin, cout, k): return (k*k*cin + 1) * cout
s1 = conv_out(224, 11, 2, 4); p1 = conv_out(s1, 3, 0, 2)
p2 = conv_out(conv_out(p1, 5, 2, 1), 3, 0, 2)
p3 = conv_out(conv_out(p2, 3, 1, 1), 3, 0, 2)
tot_c = sum(cparams(c, o, k) for c, o, k in [(3,96,11),(96,256,5),(256,384,3),(384,384,3),(384,256,3)])
tot_f = 9216*4096 + 4096 + 4096*4096 + 4096 + 4096*1000 + 1000
print(f"特征图: 224 -> {s1} -> {p1} -> {p2}(conv2+pool) -> ... -> {p3}x256, flatten={p3*p3*256}")
print(f"卷积参数 {tot_c/1e6:.2f}M ({tot_c/(tot_c+tot_f):.1%}) vs 全连接 {tot_f/1e6:.2f}M ({tot_f/(tot_c+tot_f):.1%})")\`\`\`

预期输出（实测）：实测：特征图 224→55→27→13（conv2+pool）→…→6×6×256（flatten=9216），逐层符合 out=⌊(in+2pad-k)/stride⌋+1；卷积层参数合计 3.75M（6.0%），全连接 58.63M（94.0%）——参数几乎全在分类头，这正是后来 ResNet 用 GAP 替代 FC 的动机。

**常见错误**：尺寸公式先减 k 后加 2·pad 或漏取整，逐层推导步步错；inverted dropout 在推理时又缩放一次（训练已除以 1-p，推理不缩放）；把双 GPU 拆分当算法创新——那是显存不够的工程妥协。

### 常见误区

1. **AlexNet 赢在算法**——数据/算力/算法三条件缺一不可，单有算法 2010 年也引爆不了；
2. **ReLU 无缺点**——dying ReLU：输入恒负的神经元梯度恒 0 永久死亡，Leaky/PReLU/GELU 是补救；
3. **LRN 是重要组件**——只涨 1~2 个点，已被 BatchNorm 取代，今天无需复刻。

### 知识关联

- **向前**：卷积操作与反向传播是本节的预备知识；
- **向后**：FC 参数占比过高直接催生 c2 ResNet 的 GAP+Bottleneck；尺寸/参数公式在 c5 系统化；
- **平行**：GPU 工程化延续到 paper-training c2 的流水线并行。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 范式 | 手工特征 → 端到端学特征 |
| 三条件 | ImageNet 120 万张 + GPU 512 核 + ReLU/Dropout |
| 尺寸公式 | out=⌊(in+2pad-k)/stride⌋+1 |
| 参数分布 | 全连接 58.6M(94%) vs 卷积 3.7M(6%) |
| 遗产 | ReLU 标配化、GPU 必需、GAP 动机 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Krizhevsky, Sutskever & Hinton, ImageNet Classification with Deep Convolutional Neural Networks, arXiv:1207.0580）
`,
        tips: [
          {
            kind: 'interview',
            text: '「为什么是 2012 年」：数据（ImageNet 120 万张）、算力（GTX 580 + CUDA）、算法（ReLU + Dropout）三个条件同时成熟，缺一不可。',
          },
          {
            kind: 'leak',
            text: '「AlexNet 参数 96% 在全连接层」：FC1 一层就 3775 万参数，比所有卷积层加起来多 10 倍。这是 ResNet 用 GAP 替代 FC 的直接动机。',
          },
          {
            kind: 'pitfall',
            text: 'AlexNet 的双 GPU 拆分是当时显存只有 3GB 的工程妥协，不是算法创新。读论文要区分「核心思想」和「工程权宜」。',
          },
        ],
        demos: [
          {
            title: 'AlexNet 完整结构复现 + 逐层形状追踪（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn

class AlexNet(nn.Module):
    """简化版 AlexNet（合并双 GPU 为单路）。"""
    def __init__(self, num_classes=1000):
        super().__init__()
        self.features = nn.Sequential(
            nn.Conv2d(3, 96, 11, stride=4, padding=2), nn.ReLU(inplace=True),
            nn.MaxPool2d(3, 2),
            nn.Conv2d(96, 256, 5, padding=2), nn.ReLU(inplace=True),
            nn.MaxPool2d(3, 2),
            nn.Conv2d(256, 384, 3, padding=1), nn.ReLU(inplace=True),
            nn.Conv2d(384, 384, 3, padding=1), nn.ReLU(inplace=True),
            nn.Conv2d(384, 256, 3, padding=1), nn.ReLU(inplace=True),
            nn.MaxPool2d(3, 2),
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.5),
            nn.Linear(256 * 6 * 6, 4096), nn.ReLU(inplace=True),
            nn.Dropout(0.5),
            nn.Linear(4096, 4096), nn.ReLU(inplace=True),
            nn.Linear(4096, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = torch.flatten(x, 1)
        return self.classifier(x)


model = AlexNet()

print("=== 逐层形状追踪 ===")
x = torch.randn(1, 3, 224, 224)
print(f"输入      {tuple(x.shape)}")
for layer in model.features:
    x = layer(x)
    n = layer.__class__.__name__
    if n in ('Conv2d', 'MaxPool2d'):
        print(f"{n:9} {tuple(x.shape)}")

flat = torch.flatten(x, 1)
print(f"Flatten   {tuple(flat.shape)}")
for layer in model.classifier:
    flat = layer(flat)
    if isinstance(layer, nn.Linear):
        print(f"Linear    {tuple(flat.shape)}")

print()
print("=== 参数量分布 ===")
rows = []
for name, module in [("卷积层", model.features), ("全连接", model.classifier)]:
    n = sum(p.numel() for p in module.parameters())
    rows.append((name, n))
total = sum(n for _, n in rows)
for name, n in rows:
    print(f"  {name:6} {n:>11,}  ({n/total*100:5.1f}%)")
print(f"  {'合计':6} {total:>11,}")
print()
print("关键：全连接层占 96% 参数！")
print("FC1 一层 = 9216×4096+4096 = 37,752,832")
print("比所有卷积层(约 375 万)多 10 倍。")`,
          },
          {
            title: '为什么 ReLU 能救深层网络：梯度衰减实验',
            lang: 'python',
            code: `import numpy as np
import matplotlib.pyplot as plt

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def sigmoid_grad(x):
    s = sigmoid(x)
    return s * (1 - s)

def relu_grad(x):
    return (x > 0).astype(float)

print("=== 梯度连乘衰减（模拟深层反向传播）===")
print()
print("层数 | Sigmoid 梯度 | ReLU 梯度")
print("-" * 40)
for depth in [1, 3, 5, 10, 20, 50]:
    sig = 0.25 ** depth
    rel = 1.0 ** depth
    print(f"{depth:4d} | {sig:.3e} | {rel:.3e}")

print()
print("Sigmoid 在 10 层后梯度只剩 1e-6，底层参数几乎不更新。")
print("ReLU 在 x>0 区域梯度恒为 1，深层网络可训练。")
print()

fig, axes = plt.subplots(1, 2, figsize=(12, 4))
x = np.linspace(-6, 6, 300)
axes[0].plot(x, sigmoid(x), label='Sigmoid', linewidth=2)
axes[0].plot(x, np.maximum(0, x), label='ReLU', linewidth=2)
axes[0].set_title('Activation'); axes[0].legend(); axes[0].grid(alpha=0.3)
axes[0].set_xlabel('x'); axes[0].set_ylabel('f(x)')

axes[1].plot(x, sigmoid_grad(x), label='Sigmoid grad', linewidth=2)
axes[1].plot(x, relu_grad(x), label='ReLU grad', linewidth=2)
axes[1].set_title('Gradient'); axes[1].legend(); axes[1].grid(alpha=0.3)
axes[1].set_xlabel('x'); axes[1].set_ylabel("f'(x)")

plt.tight_layout()
plt.savefig('relu_gradient.png', dpi=80, bbox_inches='tight')

print("=== 神经元死亡问题 ===")
dead_inputs = np.array([-5.0, -3.0, -1.0, -0.5])
print(f"输入全为负: {dead_inputs}")
print(f"ReLU 输出:  {np.maximum(0, dead_inputs)}")
print(f"ReLU 导数:  {relu_grad(dead_inputs)}")
print()
print("该神经元永远不会被激活，梯度恒为 0 -> 死亡")
print()
print("缓解方案：")
for name, formula in [
    ("Leaky ReLU", "max(0.01x, x)"),
    ("ELU", "x if x>0 else a(e^x - 1)"),
    ("GELU", "x*Phi(x)  Phi是标准正态CDF"),
]:
    print(f"  {name:12} {formula}")`,
          },
          {
            title: '卷积输出尺寸推导器',
            lang: 'python',
            code: `def conv_out(size, kernel, stride=1, padding=0):
    """卷积/池化输出尺寸公式。"""
    return (size + 2 * padding - kernel) // stride + 1

print("=== AlexNet 逐层尺寸推导 ===")
print()
print(f"{'层':22} {'公式':32} {'输出'}")
print("-" * 70)

layers = [
    ("输入", None, 224),
    ("Conv1 (11,4,2)", (11, 4, 2), None),
    ("MaxPool (3,2,0)", (3, 2, 0), None),
    ("Conv2 (5,1,2)", (5, 1, 2), None),
    ("MaxPool (3,2,0)", (3, 2, 0), None),
    ("Conv3 (3,1,1)", (3, 1, 1), None),
    ("Conv4 (3,1,1)", (3, 1, 1), None),
    ("Conv5 (3,1,1)", (3, 1, 1), None),
    ("MaxPool (3,2,0)", (3, 2, 0), None),
]

cur = 224
for name, params, fixed in layers:
    if params is None:
        print(f"{name:22} {'-':32} {cur}x{cur}")
        continue
    k, s, p = params
    nxt = conv_out(cur, k, s, p)
    formula = f"({cur}+2x{p}-{k})/{s}+1 = {nxt}"
    print(f"{name:22} {formula:32} {nxt}x{nxt}")
    cur = nxt

print()
print(f"Flatten: {cur}x{cur}x256 = {cur*cur*256}")
print()
print("=== 验证与论文一致 ===")
assert conv_out(224, 11, 4, 2) == 55
assert conv_out(55, 3, 2, 0) == 27
assert conv_out(27, 5, 1, 2) == 27
assert conv_out(27, 3, 2, 0) == 13
assert conv_out(13, 3, 2, 0) == 6
print("OK 全部匹配 AlexNet 论文")

print()
print("=== 对比现代网络（ResNet-50 stem）===")
print("现代做法：7x7 stride 2 + MaxPool 3x3 stride 2")
s1 = conv_out(224, 7, 2, 3)
s2 = conv_out(s1, 3, 2, 0)
print(f"  224 -> Conv(7,2,3) -> {s1}")
print(f"  {s1} -> Pool(3,2,0) -> {s2}")
print()
print("对比 AlexNet 的 11x11 stride 4：")
print("  - 7x7+池化 感受野相似但参数更少")
print("  - stride 2 保留更多信息")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-vision-c1-e1',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'single',
        difficulty: 2,
        question: 'AlexNet 相比传统计算机视觉方法的核心突破是？',
        options: [
          { value: 'A', text: '用了更多的训练数据' },
          { value: 'B', text: '端到端学习——让模型自己学特征，突破手工特征的天花板' },
          { value: 'C', text: '用了更大的卷积核' },
          { value: 'D', text: '用了更多的分类器' },
        ],
        answer: 'B',
        explanation:
          '传统方法是"人工设计特征（SIFT/HOG）+ 分类器"，人只能想到边缘、角点、纹理等低级特征。AlexNet 让 CNN 自动学到第 3 层之后的"物体部件"这类人设计不出来的特征。',
        tags: ['核心突破'],
      },
      {
        id: 'paper-vision-c1-e2',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'judge',
        difficulty: 2,
        question: 'ReLU 能缓解梯度消失，是因为它在 x>0 时的导数恒为 1，多层连乘不衰减。',
        answer: true,
        explanation:
          'Sigmoid 导数最大 0.25，10 层连乘后约 1e-6；ReLU 在 x>0 时导数恒为 1，10 层连乘仍是 1。这是深层网络可训练的关键。代价是可能出现神经元死亡。',
        tags: ['ReLU'],
      },
      {
        id: 'paper-vision-c1-e3',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'AlexNet 成功的三个必要条件（缺一不可）是？（多选）',
        options: [
          { value: 'A', text: '数据：ImageNet 120 万张标注图像' },
          { value: 'B', text: '算力：GPU（GTX 580）+ CUDA' },
          { value: 'C', text: '算法：ReLU + Dropout' },
          { value: 'D', text: '残差连接' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是 ResNet（2015）的创新。缺数据→过拟合，缺算力→训不动，缺 ReLU→梯度消失。三者同时成熟才让 AlexNet 成为可能。',
        tags: ['三个条件'],
      },
      {
        id: 'paper-vision-c1-e4',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'fill',
        difficulty: 3,
        question:
          'AlexNet 约 6000 万参数中，约 96% 集中在 ___ 层（其中 FC1 一层就有 3775 万），这成为 ResNet 用全局平均池化替代它的动机。',
        blanks: [['全连接', 'FC', 'fully connected', 'fc']],
        explanation:
          '卷积层约 375 万参数（4%），全连接层约 5625 万（96%）。全连接层参数爆炸、丢失空间信息、且限制输入尺寸，ResNet 用 GAP 替代后参数降到几万。',
        tags: ['参数分布'],
      },
      {
        id: 'paper-vision-c1-e5',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'single',
        difficulty: 3,
        question: 'Dropout 训练时为什么要除以 (1-p)？',
        options: [
          { value: 'A', text: '为了加快训练速度' },
          { value: 'B', text: '为了保持输出期望不变（inverted dropout），使推理时无需缩放' },
          { value: 'C', text: '为了减少参数量' },
          { value: 'D', text: '为了防止梯度爆炸' },
        ],
        answer: 'B',
        explanation:
          '训练时 E[h·mask/(1-p)] = h·E[mask]/(1-p) = h·(1-p)/(1-p) = h，期望不变。这样推理时直接前向即可，无需额外缩放（早期做法是推理时乘 (1-p)，叫 vanilla dropout）。',
        tags: ['Dropout'],
      },
      {
        id: 'paper-vision-c1-e6',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'code',
        difficulty: 2,
        question:
          '用纯 numpy 实现 ReLU 及其导数：\n\n- relu(x): max(0, x)\n- relu_grad(x): x>0 返回 1.0，否则 0.0',
        starterCode: `import numpy as np

def relu(x):
    return ___

def relu_grad(x):
    return ___
`,
        setupCode: '',
        expectedOutput: 'ReLU 及导数',
        tests: `import numpy as np
x = np.array([-2.0, -1.0, 0.0, 1.0, 2.0])
assert np.allclose(relu(x), [0, 0, 0, 1, 2])
assert np.allclose(relu_grad(x), [0, 0, 0, 1, 1])
x2 = np.array([[-1, 2], [3, -4]])
assert np.allclose(relu(x2), [[0, 2], [3, 0]])
assert np.allclose(relu_grad(x2), [[0, 1], [1, 0]])
`,
        answer: `import numpy as np

def relu(x):
    return np.maximum(0, x)

def relu_grad(x):
    return (x > 0).astype(float)
`,
        explanation:
          '**`np.maximum(0, x)`** 是向量化实现，比 Python 循环快几十倍。\n\n**导数 `(x > 0).astype(float)`**：布尔数组转 float 得到 0/1。\n\n**x=0 处不可导**：实践约定为 0（或 1），影响可忽略（连续分布下测度为 0）。\n\n**为什么导数恒 1 关键**：反向传播是梯度连乘，Sigmoid 的 0.25 连乘 10 层变 1e-6，ReLU 的 1 连乘仍是 1。',
        tags: ['编程', 'ReLU'],
      },
      {
        id: 'paper-vision-c1-e7',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现卷积输出尺寸计算：conv_output_size(input_size, kernel, stride=1, padding=0)。\n\n公式：⌊(input + 2×padding - kernel) / stride⌋ + 1',
        starterCode: `def conv_output_size(input_size, kernel, stride=1, padding=0):
    return ___
`,
        setupCode: '',
        expectedOutput: '输出尺寸',
        tests: `# AlexNet 各层
assert conv_output_size(224, 11, 4, 2) == 55
assert conv_output_size(55, 3, 2, 0) == 27
assert conv_output_size(27, 5, 1, 2) == 27
assert conv_output_size(27, 3, 2, 0) == 13
assert conv_output_size(13, 3, 2, 0) == 6
# 保持尺寸
assert conv_output_size(13, 3, 1, 1) == 13
# 无 padding 缩小
assert conv_output_size(32, 3, 1, 0) == 30
`,
        answer: `def conv_output_size(input_size, kernel, stride=1, padding=0):
    return (input_size + 2 * padding - kernel) // stride + 1
`,
        explanation:
          '**`//` 是 Python 整除**，对应公式的 floor。\n\n**这个公式是理解 CNN 的基本功**——能算出每层尺寸，才能理解为什么 224 最终变成 6×6。\n\n**验证 AlexNet 链路**：224 →(11,4,2)→ 55 →(3,2,0)→ 27 →(5,1,2)→ 27 →(3,2,0)→ 13 →(3,1,1)×3→ 13 →(3,2,0)→ 6 ✓\n\n**"same padding" 条件**：当 stride=1 时，padding=(kernel-1)/2 可保持尺寸不变（如 3×3 配 padding=1）。',
        tags: ['编程', '卷积尺寸'],
      },
      {
        id: 'paper-vision-c1-e8',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'code',
        difficulty: 4,
        question:
          '用 PyTorch 构建 AlexNet 前两层并统计参数量。\n\n- conv1: Conv2d(3, 96, 11, stride=4, padding=2) + ReLU + MaxPool2d(3, 2)\n- conv2: Conv2d(96, 256, 5, padding=2) + ReLU + MaxPool2d(3, 2)\n- 输入 (1, 3, 224, 224)\n- 打印输出形状与参数量\n\n（本题走本地 PyTorch 后端执行）',
        starterCode: `import torch
import torch.nn as nn

model = nn.Sequential(
    ___
)

x = torch.randn(1, 3, 224, 224)
out = model(x)
print("输出形状:", tuple(out.shape))
print("参数量:", sum(p.numel() for p in model.parameters()))
`,
        setupCode: '',
        expectedOutput: '(1, 256, 13, 13)，参数 649600',
        tests: `import torch
import torch.nn as nn

model = nn.Sequential(
    nn.Conv2d(3, 96, 11, stride=4, padding=2), nn.ReLU(), nn.MaxPool2d(3, 2),
    nn.Conv2d(96, 256, 5, padding=2), nn.ReLU(), nn.MaxPool2d(3, 2),
)
x = torch.randn(1, 3, 224, 224)
out = model(x)
assert tuple(out.shape) == (1, 256, 13, 13), f"形状错误: {tuple(out.shape)}"
params = sum(p.numel() for p in model.parameters())
assert params == 34944 + 614656, f"参数量应为 649600，实际 {params}"
print("OK 形状与参数量正确")
`,
        answer: `import torch
import torch.nn as nn

model = nn.Sequential(
    nn.Conv2d(3, 96, 11, stride=4, padding=2), nn.ReLU(), nn.MaxPool2d(3, 2),
    nn.Conv2d(96, 256, 5, padding=2), nn.ReLU(), nn.MaxPool2d(3, 2),
)

x = torch.randn(1, 3, 224, 224)
out = model(x)
print("输出形状:", tuple(out.shape))
print("参数量:", sum(p.numel() for p in model.parameters()))
`,
        explanation:
          '**参数计算**：\n- conv1: `3×96×11×11 + 96 = 34,944`\n- conv2: `96×256×5×5 + 256 = 614,656`\n- 合计 **649,600**\n\n**对比 FC1 的 3775 万**——仅前两层卷积才 65 万参数，可见参数全在全连接层。\n\n**11×11 + stride 4 的设计**：AlexNet 用大卷积核一次性大幅降采样（224→55）。现代网络改用 3×3 堆叠 + stride 2，参数更少且非线性更多。',
        tags: ['编程', 'AlexNet 实现'],
      },
      {
        id: 'paper-vision-c1-e9',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'judge',
        difficulty: 4,
        question: 'AlexNet 的双 GPU 并行结构是算法创新，让网络能学到更丰富的特征。',
        answer: false,
        explanation:
          '这是当时单卡显存只有 3GB、放不下整个模型的工程妥协。论文中两个 GPU 的分工并没有理论依据，后来的实现都合并成单卡。读论文要区分「核心思想」与「工程权宜」。',
        tags: ['工程权宜'],
      },
      {
        id: 'paper-vision-c1-e10',
        relatedLessonId: 'paper-vision-c1-l1',
        type: 'open',
        difficulty: 4,
        question:
          'AlexNet 引爆了深度学习。请分析：① 为什么是 2012 年而不是更早；② 五个技巧各自的贡献与代价；③ 哪些设计今天已过时、被什么取代；④ 今天重做会怎么改。',
        referenceAnswer: `**① 为什么是 2012 年**

三个条件同时成熟，缺一不可：

| 条件 | 具体 | 缺了会怎样 |
| --- | --- | --- |
| **数据** | ImageNet（2009）120 万张，1000 类 | 6000 万参数在 9000 张图上严重过拟合 |
| **算力** | GTX 580 ×2 + CUDA（2007） | 训练需数月，无法迭代实验 |
| **算法** | ReLU（解决梯度消失）+ Dropout（防过拟合） | 8 层网络训不动 |

**为什么更早不行**：
- 2009 年之前最大数据集只有几万张（Caltech-101）
- 2007 年 CUDA 才发布，GPU 通用计算生态未成熟
- ReLU 在 2010 年前后才被广泛采用

**关键洞察**：AlexNet 不是"某个天才的灵光一现"，
而是**工程条件成熟后的必然产物**。
即使没有 Krizhevsky，2012~2013 年也会有别人做出来。

---

**② 五个技巧的贡献与代价**

| 技巧 | 贡献 | 代价 | 今天还用吗 |
| --- | --- | --- | --- |
| **ReLU** | 梯度不衰减，训练快 6 倍 | 神经元死亡 | 用（或 GELU/Leaky） |
| **Dropout** | 防过拟合 | 训练变慢（需更多 epoch） | 少用（BN 更强） |
| **数据增强** | 等效扩大数据集 | 需调参 | 用（更强了） |
| **GPU** | 训练快 50 倍 | 成本 | 用（规模大 1000 倍） |
| **LRN** | 模拟侧抑制 | 慢，效果有限 | 淘汰（BN 取代） |

**贡献排序**：
1. ReLU（必需，没它训不动）
2. GPU（必需，没它等不起）
3. 数据增强（重要，没它过拟合）
4. Dropout（重要，但可被替代）
5. LRN（可有可无）

---

**③ 已过时的设计**

| 设计 | 现状 | 被什么取代 | 原因 |
| --- | --- | --- | --- |
| **LRN** | 淘汰 | BatchNorm（2015） | BN 效果更好、更稳定 |
| **11×11 大卷积核** | 淘汰 | 3×3 堆叠 | 3 个 3×3 = 1 个 7×7 感受野，参数更少、非线性更多 |
| **stride 4** | 少用 | stride 2 | 保留更多空间信息 |
| **全连接层** | 淘汰 | 全局平均池化（GAP） | 参数从 5625 万降到几万 |
| **Dropout in FC** | 少用 | BN + 增强 + 权重衰减 | 组合更有效 |
| **双 GPU 拆分** | 淘汰 | 单卡 / 模型并行 | 显存够了 |

**仍然有效的**：ReLU 系列、数据增强、GPU 训练。

---

**④ 今天重做会怎么改**

**结构**：

    Input 224x224x3
      -> Stem: Conv 7x7 stride 2 + BN + ReLU + MaxPool
      -> 4 个 stage（每个含若干 ResBlock）
         stage1: 64ch x3 blocks
         stage2: 128ch x4 blocks（stride 2 下采样）
         stage3: 256ch x6 blocks
         stage4: 512ch x3 blocks
      -> Global Average Pooling -> 512
      -> Linear -> 1000

**具体改动**：

| 改动 | 理由 |
| --- | --- |
| **3×3 堆叠替代 11×11** | 同等感受野下参数少 6 倍 |
| **加残差连接** | 支持 50~200 层 |
| **加 BatchNorm** | 训练稳定，可用大学习率 |
| **GAP 替代 FC** | 参数降 3 个数量级 |
| **GELU 替代 ReLU** | 更平滑，现代标配 |
| **强数据增强** | Mixup / CutMix / RandAugment |
| **AdamW + cosine** | 比 SGD 收敛快 |
| **混合精度（AMP）** | 显存减半，快 2 倍 |

**预期效果**：ImageNet Top-1 从 AlexNet 的 15.3% 错误率降到 **2~3%**（ResNet-152 + 现代训练）。

---

**⑤ 最重要的教训**

> **AlexNet 的价值不在结构，而在证明了端到端学习可行。**

今天没人用 AlexNet 的结构，但所有模型都继承了它的核心思想：
**让模型自己学特征，不要人工设计。**

这个思想后来延伸到：
- **NLP**：Word2Vec → BERT → GPT（自己学语义表示）
- **语音**：自己学声学特征（Deep Speech）
- **蛋白质**：AlphaFold 自己学结构表示
- **多模态**：CLIP 自己学图文对齐

**结构会过时，思想不会。**`,
        rubric: [
          { point: '三个条件同时成熟 + 缺一不可的具体后果', score: 3 },
          { point: '五技巧贡献排序（ReLU/GPU 必需，LRN 可有可无）+ 各自代价', score: 2 },
          { point: '过时设计对应被什么取代（LRN→BN、FC→GAP、大核→3×3）', score: 2 },
          { point: '今日改法：3×3 + 残差 + BN + GAP + GELU + 强增强', score: 2 },
          { point: '指出「结构会过时，思想不会」+ 延伸到 NLP/语音等', score: 1 },
        ],
        keywords: ['三个条件', 'ReLU 必需', 'LRN 淘汰', 'GAP 替代 FC', '端到端学习', '思想不过时'],
        explanation:
          '能指出「三个条件缺一不可」以及「AlexNet 的价值在证明端到端学习可行而非结构本身」，就是理解了技术史的本质。',
        tags: ['综合分析'],
      },
    ],
  },
];
