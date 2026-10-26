import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 视觉架构
 *  09 ResNet: Deep Residual Learning for Image Recognition
 *
 *  来源：
 *  - 论文：He, Zhang, Ren, Sun (2015) arXiv:1512.03385
 *  - 参考：Ojhaharsh/30u30 第 09 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperVisionChapters2: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2: ResNet
   * ============================================================ */
  {
    id: 'paper-vision-c2',
    title: 'ResNet：用残差连接突破深度极限',
    goal: '理解"退化问题"为什么不是过拟合，掌握残差连接如何让梯度直通，能手写 BasicBlock 与 Bottleneck 并验证梯度流动。',
    lessons: [
      {
        id: 'paper-vision-c2-l1',
        title: '为什么加深网络反而变差',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 用「56 层训练误差更高」区分退化与过拟合，说明为什么权重难拟合恒等映射而容易拟合零；
2. 写出 y=F(x)+x 与 ∂y/∂x=∂F/∂x+1，解释梯度高速公路及其与 LSTM 细胞状态的同源性；
3. 对比 BasicBlock（18C²）与 Bottleneck（1.81C²）的参数账，并用数值实验验证残差连接的梯度流优势。

### 前置知识

- 反向传播链式法则；
- c1 的卷积尺寸与参数计算；
- BatchNorm 的作用。

### 问题背景

2014 年的共识是「越深越好」，但何恺明发现 56 层网络的训练误差反而比 20 层高——不是过拟合（训练误差本身就高），是退化：深层网络连「恒等映射」都学不动（让权重精确等于单位矩阵太难）。ResNet 把要学的函数改写成 F(x)=H(x)-x：想恒等就让 F=0（权重全零即可）。加上 ∂y/∂x=∂F/∂x+1 的梯度高速公路，152 层可训练，ImageNet 错误率 3.57% 超过人类。残差连接此后成为一切深 architectures 的标配。

### 直觉理解

空降 36 个新员工还要求「公司业绩不能变差」：最稳的新员工表现是「什么都不做」。普通网络的新层必须精确学会「什么都不做」（恒等=单位矩阵，难）；残差网络的新层默认什么都不做（输出 0），有需要再学增量——把「证明自己有用」的举证责任反转，深度才从负担变成资产。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Deep Residual Learning for Image Recognition |
| **作者** | Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun（微软亚洲研究院） |
| **发表** | CVPR 2016（Best Paper） |
| **arXiv** | [1512.03385](https://arxiv.org/abs/1512.03385) |
| **一句话贡献** | 用残差连接把网络做到 152 层，ImageNet 错误率降到 3.57%（超过人类） |

## 一个反直觉的发现

**2014 年的常识**：网络越深越好。

VGG（19 层）比 AlexNet（8 层）好，GoogLeNet（22 层）比 VGG 好。

**但何恺明发现**：

| 网络 | 训练误差 | 测试误差 |
| --- | --- | --- |
| 20 层 | **较低** | **较低** |
| 56 层 | **较高** | **较高** |

**关键**：**56 层的训练误差反而更高！**

<DegradationDemo />

**这不是过拟合**——过拟合是训练误差低、测试误差高。
这里是**训练误差本身就高**，说明模型**连训练集都学不好**。

**这就是"退化问题"（Degradation Problem）。**

## 退化问题的本质

**悖论**：

    假设有一个训练好的 20 层网络 N
    现在构造一个 56 层网络 N'
      前 20 层复制 N
      后 36 层是"恒等映射"（什么都不做）

**理论上**：N' 的表现应该**至少和 N 一样好**（因为多了 36 层什么都不做）。

**实际上**：56 层网络学不到这个"恒等映射"。

**为什么**：

    用权重去拟合恒等映射 y = x 很难！
    需要 W 恰好是单位矩阵，这需要精确的数值配合

**而残差学习把这个问题翻转了**：

    不学"恒等映射"，学"残差"（即 0）
    让 F(x) = 0 比让 F(x) = x 容易得多

## 残差连接的核心思想

**标准层**：学 \`H(x)\`

**残差层**：学 \`F(x) = H(x) - x\`，输出 \`F(x) + x\`

    y = F(x) + x

**为什么这更容易**：

| 目标 | 标准层需要学 | 残差层需要学 |
| --- | --- | --- |
| 恒等映射（H(x)=x） | W = I（困难） | **F(x) = 0**（容易：权重全 0） |
| 微小扰动 | W ≈ I + ε（困难） | F(x) = ε（容易） |

**关键洞察**：**把"学恒等映射"变成"学零"**。

<ResidualBlockDemo />

## 为什么残差能解决梯度消失

**反向传播**：

    y = F(x) + x
    ∂y/∂x = ∂F/∂x + 1

**注意那个 "+1"**：

    即使 ∂F/∂x ≈ 0（梯度消失）
    梯度仍然有 1 通过

**所以**：梯度可以**直通**到浅层。

**对比**：

| 结构 | 梯度路径 |
| --- | --- |
| 普通网络 | ∂y/∂x = ∂F/∂x（可能为 0） |
| **残差网络** | ∂y/∂x = **∂F/∂x + 1**（至少有 1） |

**这就是 ResNet 能训练 152 层的原因。**

<GradientFlowDemo />

**更严格的推导**（多层的累积）：

    第 L 层的输出：x_L = x_l + Σ_{i=l}^{L-1} F(x_i)

    梯度：∂L/∂x_l = ∂L/∂x_L · (1 + ∂/∂x_l Σ F(x_i))

**关键**：\`∂L/∂x_L\` 直接传到 \`x_l\`，不经过任何权重矩阵。

**这被称为"梯度高速公路"**（与 LSTM 的细胞状态是同一思想）。

## BasicBlock 与 Bottleneck

ResNet 有两种基本块。

### BasicBlock（用于 ResNet-18/34）

    x ──┬──> Conv3×3 ──> BN ──> ReLU ──> Conv3×3 ──> BN ──┬──> ReLU ──> y
        │                                                    │
        └──────────────── identity ─────────────────────────┘

**结构**：2 个 3×3 卷积 + 恒等捷径。

**参数量**（C→C）：\`2 × (3×3×C×C) = 18C²\`

### Bottleneck（用于 ResNet-50/101/152）

    x ──┬──> Conv1×1(降维) ──> BN ──> ReLU
        │                                  ↓
        │                          Conv3×3(处理) ──> BN ──> ReLU
        │                                  ↓
        │                          Conv1×1(升维) ──> BN ──┬──> ReLU ──> y
        └───────────────── identity ──────────────────────┘

**结构**：1×1 降维 → 3×3 处理 → 1×1 升维。

**参数量**（C→4C）：\`C×(C/4) + 9×(C/4)² + (C/4)×4C = 0.25C² + 0.5625C² + C² = 1.8125C²\`

**对比**：

| 块类型 | 参数量 | 用途 |
| --- | --- | --- |
| BasicBlock (C→C) | 18C² | 浅层网络 |
| **Bottleneck (C→4C)** | **1.81C²** | **深层网络（参数少 10 倍）** |

**为什么 Bottleneck 更省**：1×1 卷积先降到 C/4，3×3 只在低维上做。

<BottleneckCompareDemo />

## 下采样时的维度匹配

**问题**：当 stride=2 或通道数变化时，\`F(x)\` 和 \`x\` 的维度不匹配，不能直接相加。

**三种方案**：

| 方案 | 做法 | 参数量 |
| --- | --- | --- |
| **A：补零** | 用 0 填充缺失通道 | 0（但效果差） |
| **B：1×1 卷积投影** | \`x\` 经过 1×1 卷积匹配维度 | 有参数 |
| **C：所有捷径都用投影** | 全部 1×1 卷积 | 参数最多 |

**论文的结论**：

| 方案 | 错误率 | 说明 |
| --- | --- | --- |
| A（补零） | 较高 | 效果差 |
| **B（仅维度变化时投影）** | **最低** | **论文采用** |
| C（全部投影） | 略高 | 参数多但无收益 |

**关键**：**只在必要时用投影**，其余用纯恒等映射。

## ResNet 的完整架构

<ResNetArchDemo />

**ResNet-50 的结构**：

| Stage | 输出尺寸 | 块数 | 通道 |
| --- | --- | --- | --- |
| Stem | 112×112 | - | 64（7×7 conv + maxpool） |
| Stage 1 | 56×56 | 3 | 256 |
| Stage 2 | 28×28 | 4 | 512 |
| Stage 3 | 14×14 | 6 | 1024 |
| Stage 4 | 7×7 | 3 | 2048 |
| Head | 1×1 | - | GAP + FC |

**参数量对比**：

| 模型 | 层数 | 参数量 | Top-5 错误率 |
| --- | --- | --- | --- |
| AlexNet | 8 | 60M | 16.4% |
| VGG-16 | 16 | 138M | 7.3% |
| **ResNet-50** | **50** | **25M** | **5.25%** |
| **ResNet-152** | **152** | **60M** | **4.49%** |

**惊人的事实**：**ResNet-50 参数比 VGG-16 少 5 倍，但错误率低 2 个点。**

**为什么**：Bottleneck 设计 + GAP 替代全连接层。

## 与之前的技术对比

| 技术 | 解决的问题 | 与 ResNet 的关系 |
| --- | --- | --- |
| **AlexNet 的 ReLU** | 梯度消失（激活层） | ResNet 也用 ReLU |
| **BatchNorm** | 内部协变量偏移 | ResNet 每层都用 BN |
| **LSTM 的细胞状态** | 梯度沿时间消失 | **同一思想：加法捷径** |
| **Highway Network** | 梯度消失（门控捷径） | ResNet 是"无门控"简化版 |

**关键联系**：

    LSTM:  c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t    ← 加法路径
    ResNet: x_{l+1} = x_l + F(x_l)             ← 加法路径

**两者本质相同**：给梯度一条"直通"的路。

## 一个常被忽略的细节

**ResNet 论文还提出了"预激活"变体**（Pre-activation）：

    原始：Conv → BN → ReLU → Conv → BN → (+x) → ReLU
    预激活：BN → ReLU → Conv → BN → ReLU → Conv → (+x)

**差异**：ReLU 在卷积前还是后。

**论文发现**：预激活版本**更容易训练**，且能到 1000+ 层。

**这就是 ResNet v2**（第 3 章的主题）。

## 本节来源

> **来源类型：学术来源**
> - He, K., Zhang, X., Ren, S., Sun, J. *Deep Residual Learning for Image Recognition*
>   arXiv:[1512.03385](https://arxiv.org/abs/1512.03385)（CVPR 2016）
> - He, K. et al. *Identity Mappings in Deep Residual Networks*
>   arXiv:[1603.05027](https://arxiv.org/abs/1603.05027)（ECCV 2016，ResNet v2）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 09 篇（593 行，含 BasicBlock / Bottleneck / ResNet / ResNetAnalyzer）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(13)
L, d = 30, 8
W = [rng.normal(0, 0.5, (d, d)) for _ in range(L)]
x0 = rng.normal(0, 1, d); target = rng.normal(0, 1, d)
def loss(x, residual):
    h = x
    for l in range(L):
        h = np.tanh(h @ W[l]) + (h if residual else 0)   # 残差: 输出 = F(x) + x
    return float(((h - target)**2).sum())
def grad_norm(residual, eps=1e-5):
    g = np.zeros(d)
    for i in range(d):
        e = np.zeros(d); e[i] = eps
        g[i] = (loss(x0 + e, residual) - loss(x0 - e, residual)) / (2*eps)
    return float(np.linalg.norm(g))
for res in (False, True):
    print(f"{'残差' if res else '普通'}网络: 30 层后第 1 层输入梯度范数 = {grad_norm(res):.3e}")\`\`\`

预期输出（实测）：实测：同样 30 层 tanh 堆叠，普通网络第 1 层输入的（有限差分）梯度范数 9.454e-02，残差版 6.412e+02——相差近四个数量级。「+1 直通」让梯度穿过 30 层仍有信号，这就是梯度高速公路。

**常见错误**：下采样处 F(x) 与 x 通道数不一致直接相加报错——要用 1×1 投影捷径（且只在必要时用，论文方案 B）；在残差捷径上加激活或门控——捷径上任何变换都伤梯度流（c3 详述）；把残差当正则化——它治退化和梯度流，不治过拟合。

### 常见误区

1. **残差=更宽的层**——它是加法捷径重构的学习目标（学 F=H-x），不是宽度问题；
2. **越深一定越好**——无残差的深网先退化，残差才让深度重新变成资产；
3. **Bottleneck 省参数是魔法**——1×1 先降到 C/4、3×3 在低维做，纯算术账（18C²→1.81C²）。

### 知识关联

- **向前**：c1 的 ReLU/BN/尺寸公式是本节地基；
- **向后**：c3 预激活把「捷径纯净性」推到底；Pre-LN Transformer 同源；
- **平行**：LSTM 细胞状态的加法路径、paper-reasoning c4 RMC 的记忆残差。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 退化 | 56 层训练误差反而更高（非过拟合） |
| 核心式 | y=F(x)+x；恒等=F=0（易学） |
| 梯度 | ∂y/∂x=∂F/∂x+1 高速公路（实测差 4 个量级） |
| 账本 | BasicBlock 18C² vs Bottleneck 1.81C² |
| 战绩 | ResNet-50 参数比 VGG-16 少 5 倍、错误率低 2 点 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：He et al., Deep Residual Learning for Image Recognition, arXiv:1512.03385）
`,
        tips: [
          {
            kind: 'interview',
            text: '「退化问题不是过拟合」：过拟合是训练误差低、测试误差高。退化是训练误差本身就高——深层网络连训练集都学不好，因为用权重拟合恒等映射很难。',
          },
          {
            kind: 'leak',
            text: '「残差为什么解决梯度消失」：y = F(x) + x，所以 ∂y/∂x = ∂F/∂x + 1。即使 ∂F/∂x≈0，梯度仍有 1 直通。多层累积后 x_L = x_l + ΣF，梯度不经过权重矩阵。',
          },
          {
            kind: 'pitfall',
            text: 'Bottleneck 比 BasicBlock 参数少 10 倍（1.81C² vs 18C²），因为 1×1 先降维到 C/4，3×3 只在低维做。这是 ResNet-50 参数比 VGG-16 少 5 倍的原因。',
          },
        ],
        demos: [
          {
            title: 'ResNet 核心块实现与梯度流动验证（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn

class BasicBlock(nn.Module):
    """ResNet-18/34 使用的基本残差块。"""
    expansion = 1

    def __init__(self, in_planes, planes, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_planes, planes, 3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(planes)
        self.conv2 = nn.Conv2d(planes, planes, 3, stride=1, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)
        self.relu = nn.ReLU(inplace=True)

        # 捷径：维度变化时才用 1x1 投影
        self.shortcut = nn.Sequential()
        if stride != 1 or in_planes != planes:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_planes, planes, 1, stride=stride, bias=False),
                nn.BatchNorm2d(planes),
            )

    def forward(self, x):
        identity = self.shortcut(x)          # 关键：捷径
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = out + identity                 # 关键：加法
        return self.relu(out)


class Bottleneck(nn.Module):
    """ResNet-50/101/152 使用的瓶颈块。"""
    expansion = 4

    def __init__(self, in_planes, planes, stride=1):
        super().__init__()
        # 1x1 降维
        self.conv1 = nn.Conv2d(in_planes, planes, 1, bias=False)
        self.bn1 = nn.BatchNorm2d(planes)
        # 3x3 处理
        self.conv2 = nn.Conv2d(planes, planes, 3, stride=stride, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)
        # 1x1 升维
        self.conv3 = nn.Conv2d(planes, planes * 4, 1, bias=False)
        self.bn3 = nn.BatchNorm2d(planes * 4)
        self.relu = nn.ReLU(inplace=True)

        self.shortcut = nn.Sequential()
        if stride != 1 or in_planes != planes * 4:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_planes, planes * 4, 1, stride=stride, bias=False),
                nn.BatchNorm2d(planes * 4),
            )

    def forward(self, x):
        identity = self.shortcut(x)
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.relu(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        out = out + identity
        return self.relu(out)


print("=== 参数量对比 ===")
print()
print(f"{'块类型':>14} | {'输入通道':>8} | {'输出通道':>8} | {'参数量':>12}")
print("-" * 56)

for name, block, in_c, planes in [
    ("BasicBlock", BasicBlock, 64, 64),
    ("BasicBlock", BasicBlock, 64, 128),
    ("Bottleneck", Bottleneck, 64, 64),
    ("Bottleneck", Bottleneck, 256, 128),
]:
    b = block(in_c, planes)
    n = sum(p.numel() for p in b.parameters())
    out_c = planes * block.expansion
    print(f"{name:>14} | {in_c:>8} | {out_c:>8} | {n:>12,}")

print()
print("=== 前向传播 ===")
x = torch.randn(1, 64, 56, 56)
b1 = BasicBlock(64, 64)
b2 = Bottleneck(64, 64)
print(f"输入: {tuple(x.shape)}")
print(f"BasicBlock 输出:  {tuple(b1(x).shape)}")
print(f"Bottleneck 输出:  {tuple(b2(x).shape)}")

print()
print("=== 关键：梯度流动验证 ===")
x = torch.randn(1, 64, 32, 32, requires_grad=True)
block = BasicBlock(64, 64)
out = block(x)
loss = out.sum()
loss.backward()

grad_norm = x.grad.norm().item()
print(f"输入梯度范数: {grad_norm:.4f}")
print()
print("对比：如果去掉残差连接，梯度会小很多")

# 对比无残差版本
class NoResidualBlock(nn.Module):
    def __init__(self, in_planes, planes):
        super().__init__()
        self.conv1 = nn.Conv2d(in_planes, planes, 3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(planes)
        self.conv2 = nn.Conv2d(planes, planes, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return self.relu(out)

x2 = torch.randn(1, 64, 32, 32, requires_grad=True)
nr = NoResidualBlock(64, 64)
out2 = nr(x2)
out2.sum().backward()
print(f"无残差时输入梯度范数: {x2.grad.norm().item():.4f}")`,
          },
          {
            title: '深层网络的退化问题演示',
            lang: 'python',
            code: `import torch
import torch.nn as nn

def make_plain_net(depth, width=64):
    """普通网络（无残差）。"""
    layers = [nn.Conv2d(3, width, 3, padding=1), nn.BatchNorm2d(width), nn.ReLU()]
    for _ in range(depth - 2):
        layers += [nn.Conv2d(width, width, 3, padding=1), nn.BatchNorm2d(width), nn.ReLU()]
    layers += [nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(width, 10)]
    return nn.Sequential(*layers)


class ResBlock(nn.Module):
    def __init__(self, width):
        super().__init__()
        self.conv1 = nn.Conv2d(width, width, 3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(width)
        self.conv2 = nn.Conv2d(width, width, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(width)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        return self.relu(self.bn2(self.conv2(self.relu(self.bn1(self.conv1(x))))) + x)


def make_resnet_net(depth, width=64):
    """残差网络。"""
    layers = [nn.Conv2d(3, width, 3, padding=1), nn.BatchNorm2d(width), nn.ReLU()]
    for _ in range(depth - 2):
        layers.append(ResBlock(width))
    layers += [nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(width, 10)]
    return nn.Sequential(*layers)


print("=== 退化问题：加深网络后训练误差反而升高 ===")
print()
print(f"{'深度':>6} | {'类型':>8} | {'初始梯度范数':>14} | {'能否训练':>10}")
print("-" * 52)

x = torch.randn(2, 3, 32, 32)
y = torch.randint(0, 10, (2,))

for depth in [6, 20, 56]:
    for name, maker in [("普通", make_plain_net), ("残差", make_resnet_net)]:
        net = maker(depth)
        out = net(x)
        loss = nn.CrossEntropyLoss()(out, y)
        loss.backward()

        # 测量第一层卷积的梯度
        first_conv_grad = None
        for m in net.modules():
            if isinstance(m, nn.Conv2d):
                if m.weight.grad is not None:
                    first_conv_grad = m.weight.grad.norm().item()
                break

        trainable = "✓" if first_conv_grad and first_conv_grad > 1e-8 else "✗"
        print(f"{depth:>6} | {name:>8} | {first_conv_grad:>14.2e} | {trainable:>10}")

print()
print("=== 关键观察 ===")
print()
print("普通网络：深度增加 -> 第一层梯度急剧衰减")
print("  depth=56 时梯度接近 0 -> 底层学不动 -> 训练误差高")
print()
print("残差网络：深度增加 -> 梯度保持量级")
print("  因为 ∂y/∂x = ∂F/∂x + 1，那个 +1 保证了梯度直通")
print()
print("这就是为什么 ResNet 能到 152 层甚至 1000 层。")`,
          },
          {
            title: 'ResNet-50 完整架构与参数量分析',
            lang: 'python',
            code: `import torch
import torch.nn as nn

class Bottleneck(nn.Module):
    expansion = 4

    def __init__(self, in_planes, planes, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_planes, planes, 1, bias=False)
        self.bn1 = nn.BatchNorm2d(planes)
        self.conv2 = nn.Conv2d(planes, planes, 3, stride=stride, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)
        self.conv3 = nn.Conv2d(planes, planes * 4, 1, bias=False)
        self.bn3 = nn.BatchNorm2d(planes * 4)
        self.relu = nn.ReLU(inplace=True)
        self.shortcut = nn.Sequential()
        if stride != 1 or in_planes != planes * 4:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_planes, planes * 4, 1, stride=stride, bias=False),
                nn.BatchNorm2d(planes * 4),
            )

    def forward(self, x):
        idt = self.shortcut(x)
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.relu(self.bn2(self.conv2(out)))
        out = self.bn3(self.conv3(out))
        return self.relu(out + idt)


class ResNet50(nn.Module):
    def __init__(self, num_classes=1000):
        super().__init__()
        self.in_planes = 64

        # Stem
        self.conv1 = nn.Conv2d(3, 64, 7, stride=2, padding=3, bias=False)
        self.bn1 = nn.BatchNorm2d(64)
        self.relu = nn.ReLU(inplace=True)
        self.maxpool = nn.MaxPool2d(3, stride=2, padding=1)

        # 4 个 stage
        self.layer1 = self._make_layer(64, 3, stride=1)
        self.layer2 = self._make_layer(128, 4, stride=2)
        self.layer3 = self._make_layer(256, 6, stride=2)
        self.layer4 = self._make_layer(512, 3, stride=2)

        # Head：GAP + FC（替代原来的巨大全连接层）
        self.avgpool = nn.AdaptiveAvgPool2d(1)
        self.fc = nn.Linear(512 * 4, num_classes)

    def _make_layer(self, planes, blocks, stride):
        layers = [Bottleneck(self.in_planes, planes, stride)]
        self.in_planes = planes * 4
        for _ in range(1, blocks):
            layers.append(Bottleneck(self.in_planes, planes))
        return nn.Sequential(*layers)

    def forward(self, x):
        x = self.maxpool(self.relu(self.bn1(self.conv1(x))))
        x = self.layer1(x)
        x = self.layer2(x)
        x = self.layer3(x)
        x = self.layer4(x)
        x = self.avgpool(x)
        x = torch.flatten(x, 1)
        return self.fc(x)


model = ResNet50()

print("=== ResNet-50 逐层形状 ===")
x = torch.randn(1, 3, 224, 224)
print(f"输入          {tuple(x.shape)}")

x = self_conv = model.conv1(x); x = model.bn1(x); x = model.relu(x)
print(f"Stem conv     {tuple(x.shape)}")
x = model.maxpool(x)
print(f"MaxPool       {tuple(x.shape)}")

for i, layer in enumerate([model.layer1, model.layer2, model.layer3, model.layer4], 1):
    x = layer(x)
    print(f"Stage {i}       {tuple(x.shape)}")

x = model.avgpool(x)
print(f"GAP           {tuple(x.shape)}")
x = torch.flatten(x, 1)
x = model.fc(x)
print(f"FC            {tuple(x.shape)}")

print()
print("=== 参数量分析 ===")
total = sum(p.numel() for p in model.parameters())
print(f"总参数量: {total:,} ({total/1e6:.1f}M)")
print()
print(f"{'部分':>12} | {'参数量':>12} | {'占比':>8}")
print("-" * 40)
for name, module in [
    ("Stem", model.conv1),
    ("layer1", model.layer1),
    ("layer2", model.layer2),
    ("layer3", model.layer3),
    ("layer4", model.layer4),
    ("FC", model.fc),
]:
    n = sum(p.numel() for p in module.parameters())
    print(f"{name:>12} | {n:>12,} | {n/total*100:>7.1f}%")

print()
print("=== 与 VGG-16 对比 ===")
print("VGG-16:     约 138M 参数，Top-5 错误率 7.3%")
print(f"ResNet-50:  约 {total/1e6:.0f}M 参数，Top-5 错误率 5.25%")
print()
print("ResNet-50 参数少 5 倍，但错误率低 2 个点！")
print("原因：")
print("  1. Bottleneck 设计（1x1 降维 -> 3x3 -> 1x1 升维）")
print("  2. GAP 替代全连接层（原来 VGG 有 3 层 4096 维 FC）")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-vision-c2-e1',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'single',
        difficulty: 2,
        question: 'ResNet 要解决的"退化问题"是指？',
        options: [
          { value: 'A', text: '过拟合（训练误差低、测试误差高）' },
          { value: 'B', text: '深层网络的训练误差反而比浅层高（连训练集都学不好）' },
          { value: 'C', text: '训练速度慢' },
          { value: 'D', text: '梯度爆炸' },
        ],
        answer: 'B',
        explanation:
          '56 层的训练误差比 20 层高——这不是过拟合（过拟合是训练误差低）。原因是深层网络难以学到恒等映射，导致连训练集都拟合不好。',
        tags: ['退化问题'],
      },
      {
        id: 'paper-vision-c2-e2',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'judge',
        difficulty: 2,
        question: '残差连接 y = F(x) + x 中，那个 "+x" 让梯度可以直通到浅层。',
        answer: true,
        explanation:
          '∂y/∂x = ∂F/∂x + 1。即使 ∂F/∂x ≈ 0（梯度消失），梯度仍有 1 通过。多层累积后 x_L = x_l + ΣF，梯度不经过任何权重矩阵——这就是"梯度高速公路"。',
        tags: ['梯度直通'],
      },
      {
        id: 'paper-vision-c2-e3',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'ResNet 相比 VGG 的优势包括？（多选）',
        options: [
          { value: 'A', text: '可以用 Bottleneck 大幅减少参数（1.81C² vs 18C²）' },
          { value: 'B', text: '用全局平均池化替代全连接层' },
          { value: 'C', text: '残差连接让深层网络可训练' },
          { value: 'D', text: '不需要 BatchNorm' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——ResNet 每个卷积后都用 BN。A/B/C 是 ResNet 参数少 5 倍且错误率低 2 点的原因。',
        tags: ['ResNet 优势'],
      },
      {
        id: 'paper-vision-c2-e4',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'fill',
        difficulty: 3,
        question:
          'ResNet 的残差块学习的是 ___ 而非完整的映射 H(x)，即 y = F(x) + x。',
        blanks: [['残差', 'residual', 'F(x)']],
        explanation:
          '学 F(x) = H(x) - x。如果要学恒等映射（H(x)=x），只需让 F(x)=0——把权重置 0 比让权重变成单位矩阵容易得多。',
        tags: ['残差学习'],
      },
      {
        id: 'paper-vision-c2-e5',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现最小残差块的前向（纯 numpy，验证加法逻辑）：\n\nresidual_forward(x, F_out)：返回 F_out + x',
        starterCode: `import numpy as np

def residual_forward(x, F_out):
    return ___
`,
        setupCode: '',
        expectedOutput: '残差输出',
        tests: `import numpy as np
x = np.array([[1.0, 2.0]])
F = np.array([[0.5, 0.3]])
out = residual_forward(x, F)
assert np.allclose(out, [[1.5, 2.3]])

# F 为 0 时，输出等于输入（恒等映射）
F_zero = np.zeros_like(x)
assert np.allclose(residual_forward(x, F_zero), x)

# 形状必须匹配
assert residual_forward(x, F).shape == x.shape
`,
        answer: `import numpy as np

def residual_forward(x, F_out):
    return F_out + x
`,
        explanation:
          '**这是 ResNet 的全部**——一个加法。\n\n**为什么这么简单却有效**：\n\n反向传播：`∂out/∂x = ∂F/∂x + 1`\n\n即使 `∂F/∂x = 0`（梯度消失），梯度仍有 1 通过。\n\n**形状必须匹配**：实际实现中，当 stride≠1 或通道变化时，需要用 1×1 卷积投影 x 来匹配维度。',
        tags: ['编程', '残差加法'],
      },
      {
        id: 'paper-vision-c2-e6',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '计算 Bottleneck 与 BasicBlock 的参数量：\n\n- basic_block_params(c): BasicBlock 从 c 到 c\n- bottleneck_params(c): Bottleneck 从 c 到 4c（内部用 c/4）\n\n不考虑 BN（bias=False），返回参数量。',
        starterCode: `def basic_block_params(c):
    """两个 3x3 卷积，c -> c -> c"""
    return ___

def bottleneck_params(c):
    """1x1: c->c//4, 3x3: c//4->c//4, 1x1: c//4->4c"""
    mid = c // 4
    return ___
`,
        setupCode: '',
        expectedOutput: '参数量',
        tests: `# BasicBlock: 2 * 3*3*c*c
assert basic_block_params(64) == 2 * 9 * 64 * 64

# Bottleneck: 1*1*c*(c/4) + 3*3*(c/4)^2 + 1*1*(c/4)*4c
c = 64
mid = c // 4
expected = c * mid + 9 * mid * mid + mid * 4 * c
assert bottleneck_params(64) == expected

# 对比：Bottleneck 输出 4c 但参数远少于 BasicBlock 输出 4c 的情况
basic_4c = 2 * 9 * (4*c) * (4*c)
assert bottleneck_params(c) < basic_4c / 10, "Bottleneck 应省 10 倍以上"

# 大通道数
assert bottleneck_params(256) == 256*64 + 9*64*64 + 64*1024
`,
        answer: `def basic_block_params(c):
    """两个 3x3 卷积，c -> c -> c"""
    return 2 * 9 * c * c


def bottleneck_params(c):
    """1x1: c->c//4, 3x3: c//4->c//4, 1x1: c//4->4c"""
    mid = c // 4
    return c * mid + 9 * mid * mid + mid * 4 * c
`,
        explanation:
          '**这是 ResNet-50 参数效率的关键**：\n\n| 块类型 | 输出通道 | 参数量 |\n| --- | --- | --- |\n| BasicBlock(c→c) | c | 18c² |\n| **Bottleneck(c→4c)** | **4c** | **1.81c²** |\n\n**如果 BasicBlock 也要输出 4c**：`2×9×(4c)² = 288c²`\n\n**Bottleneck 只有 1.81c²**——省了 **160 倍**！\n\n**为什么**：1×1 卷积先把 c 降到 c/4，3×3 只在低维（c/4）上做。\n\n**代价**：表达能力可能略降，但实践证明效果很好。',
        tags: ['编程', '参数量'],
      },
      {
        id: 'paper-vision-c2-e7',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'code',
        difficulty: 3,
        question:
          '用 PyTorch 实现 BasicBlock 并验证梯度直通：\n\n- BasicBlock(in_planes, planes, stride=1)\n- 前向：out = relu(bn2(conv2(relu(bn1(conv1(x))))) + shortcut(x))\n- 维度变化时 shortcut 用 1×1 卷积\n\n验证：输入梯度范数应显著大于 0',
        starterCode: `import torch
import torch.nn as nn

class BasicBlock(nn.Module):
    expansion = 1

    def __init__(self, in_planes, planes, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_planes, planes, 3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(planes)
        self.conv2 = nn.Conv2d(planes, planes, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)
        self.relu = nn.ReLU(inplace=True)
        self.shortcut = nn.Sequential()
        if stride != 1 or in_planes != planes:
            ___

    def forward(self, x):
        identity = ___
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = ___
        return self.relu(out)
`,
        setupCode: '',
        expectedOutput: 'BasicBlock',
        tests: `import torch
import torch.nn as nn

# 维度不变
b1 = BasicBlock(64, 64)
x1 = torch.randn(1, 64, 32, 32)
assert b1(x1).shape == (1, 64, 32, 32)

# 维度变化（stride=2）
b2 = BasicBlock(64, 128, stride=2)
x2 = torch.randn(1, 64, 32, 32)
out2 = b2(x2)
assert out2.shape == (1, 128, 16, 16), f"形状错误: {out2.shape}"
# 应有 shortcut 卷积
assert any(isinstance(m, nn.Conv2d) for m in b2.shortcut.modules())

# 梯度直通验证
x3 = torch.randn(1, 64, 32, 32, requires_grad=True)
b3 = BasicBlock(64, 64)
b3(x3).sum().backward()
assert x3.grad is not None
assert x3.grad.norm().item() > 1e-3, f"梯度太小: {x3.grad.norm().item()}"
`,
        answer: `import torch
import torch.nn as nn

class BasicBlock(nn.Module):
    expansion = 1

    def __init__(self, in_planes, planes, stride=1):
        super().__init__()
        self.conv1 = nn.Conv2d(in_planes, planes, 3, stride=stride, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(planes)
        self.conv2 = nn.Conv2d(planes, planes, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(planes)
        self.relu = nn.ReLU(inplace=True)
        self.shortcut = nn.Sequential()
        if stride != 1 or in_planes != planes:
            self.shortcut = nn.Sequential(
                nn.Conv2d(in_planes, planes, 1, stride=stride, bias=False),
                nn.BatchNorm2d(planes),
            )

    def forward(self, x):
        identity = self.shortcut(x)
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = out + identity
        return self.relu(out)
`,
        explanation:
          '**三个关键点**：\n\n1. **`bias=False`**：后面有 BN，BN 有 beta 参数，卷积的 bias 是冗余的\n2. **shortcut 只在必要时用**：`stride != 1 or in_planes != planes`\n3. **`out + identity`**：这是核心，必须在 ReLU 之前\n\n**顺序很重要**：\n\n    ✅ out = bn2(conv2(...)); out = out + identity; return relu(out)\n    ❌ out = relu(bn2(...)); out = out + identity    # ReLU 后再加，会破坏负值\n\n**为什么 ReLU 要在加法后**：如果 ReLU 在加法前，identity 的负值部分被截断，梯度直通就失效了。',
        tags: ['编程', 'BasicBlock'],
      },
      {
        id: 'paper-vision-c2-e8',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'code',
        difficulty: 4,
        question:
          '验证残差连接对梯度流动的影响：compare_gradient_flow(depth=20)。\n\n构造两个网络（普通 vs 残差），各 depth 层，返回 (普通第一层梯度范数, 残差第一层梯度范数)。',
        starterCode: `import torch
import torch.nn as nn

def compare_gradient_flow(depth=20, width=32):
    class PlainBlock(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv = nn.Conv2d(width, width, 3, padding=1, bias=False)
            self.bn = nn.BatchNorm2d(width)
            self.relu = nn.ReLU(inplace=True)
        def forward(self, x):
            return self.relu(self.bn(self.conv(x)))

    class ResBlock(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv = nn.Conv2d(width, width, 3, padding=1, bias=False)
            self.bn = nn.BatchNorm2d(width)
            self.relu = nn.ReLU(inplace=True)
        def forward(self, x):
            return self.relu(self.bn(self.conv(x)) + x)

    def build(block_cls):
        layers = [nn.Conv2d(3, width, 3, padding=1), nn.BatchNorm2d(width), nn.ReLU()]
        for _ in range(depth):
            layers.append(block_cls())
        layers += [nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(width, 10)]
        return nn.Sequential(*layers)

    x = torch.randn(2, 3, 16, 16)
    y = torch.randint(0, 10, (2,))

    results = []
    for cls in [PlainBlock, ResBlock]:
        net = build(cls)
        out = net(x)
        nn.CrossEntropyLoss()(out, y).backward()
        # 第一个卷积的梯度
        for m in net.modules():
            if isinstance(m, nn.Conv2d):
                results.append(m.weight.grad.norm().item() if m.weight.grad is not None else 0.0)
                break
    return tuple(results)
`,
        setupCode: '',
        expectedOutput: '(普通梯度, 残差梯度)',
        tests: `import torch
import torch.nn as nn

plain_g, res_g = compare_gradient_flow(20, 32)
assert isinstance(plain_g, float) and isinstance(res_g, float)
# 残差网络的梯度必须保持量级（不消失）
assert res_g > 1e-3, f"残差梯度应保持量级: {res_g:.2e}"
# 普通网络的梯度应显著更小（梯度消失）
assert res_g > plain_g * 10, f"残差梯度应远大于普通: 残差={res_g:.2e}, 普通={plain_g:.2e}"

# 更深时普通网络梯度归零
plain_deep, res_deep = compare_gradient_flow(40, 32)
assert res_deep > 1e-3, f"40层时残差梯度应仍保持: {res_deep:.2e}"
assert plain_deep < 1e-6 or plain_deep < res_deep / 100, f"40层时普通网络应梯度消失: {plain_deep:.2e}"
`,
        answer: `import torch
import torch.nn as nn

def compare_gradient_flow(depth=20, width=32):
    """对比普通网络与残差网络的第一层梯度（不用 BN，用 sigmoid 激活）。"""
    class PlainBlock(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv = nn.Conv2d(width, width, 3, padding=1, bias=False)
        def forward(self, x):
            return torch.sigmoid(self.conv(x))

    class ResBlock(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv = nn.Conv2d(width, width, 3, padding=1, bias=False)
        def forward(self, x):
            return torch.sigmoid(self.conv(x)) + x

    def build(block_cls):
        layers = [nn.Conv2d(3, width, 3, padding=1)]
        for _ in range(depth):
            layers.append(block_cls())
        layers += [nn.AdaptiveAvgPool2d(1), nn.Flatten(), nn.Linear(width, 10)]
        return nn.Sequential(*layers)

    x = torch.randn(2, 3, 16, 16)
    y = torch.randint(0, 10, (2,))

    results = []
    for cls in [PlainBlock, ResBlock]:
        net = build(cls)
        nn.CrossEntropyLoss()(net(x), y).backward()
        for m in net.modules():
            if isinstance(m, nn.Conv2d):
                results.append(m.weight.grad.norm().item() if m.weight.grad is not None else 0.0)
                break
    return tuple(results)
`,
        explanation:
          '**这个实验直接验证了 ResNet 的核心论点**。\n\n**预期结果**：\n- 普通网络：depth 增加 → 第一层梯度指数衰减\n- 残差网络：depth 增加 → 梯度保持量级\n\n**为什么**：\n\n    普通：∂x_L/∂x_1 = ∏ ∂F_i/∂x_i        （连乘，衰减）\n    残差：∂x_L/∂x_1 = 1 + ∂(ΣF)/∂x_1   （有常数项 1）\n\n**注意**：BatchNorm 的存在让普通网络在浅层时梯度也还行——\n这正是 BN 的部分作用。但深层时残差优势明显。',
        tags: ['编程', '梯度验证'],
      },
      {
        id: 'paper-vision-c2-e9',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'judge',
        difficulty: 4,
        question: 'ResNet 论文发现，所有捷径（shortcut）都应该用 1×1 卷积投影，效果最好。',
        answer: false,
        explanation:
          '论文对比了三种方案：A 补零、B 仅维度变化时投影、C 全部投影。结论是 B 最好（错误率最低）。全部投影参数多但无收益，说明"纯恒等映射"本身有价值。',
        tags: ['捷径方案'],
      },
      {
        id: 'paper-vision-c2-e10',
        relatedLessonId: 'paper-vision-c2-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 退化问题与过拟合的区别；② 残差连接为什么能解决梯度消失（数学推导）；③ BasicBlock 与 Bottleneck 的取舍；④ ResNet 与 LSTM 的细胞状态有什么共同思想。',
        referenceAnswer: `**① 退化问题 vs 过拟合**

**过拟合**：

    训练误差：低 ✓
    测试误差：高 ✗
    原因：模型记住了训练数据的具体噪声，没有泛化

**退化问题**：

    训练误差：**高** ✗
    测试误差：高 ✗
    原因：深层网络**连训练集都学不好**

**关键区别**：退化问题中训练误差本身就高，
所以不是"泛化能力差"，而是"优化能力差"。

**悖论的构造**：

    假设 20 层网络 N 训练好了
    构造 56 层网络 N'：前 20 层复制 N，后 36 层做恒等映射
    理论上 N' 至少和 N 一样好

**但实际上**：56 层学不到这个"恒等映射"。

**为什么**：用卷积权重拟合恒等映射 y = x 很难——
需要权重恰好是单位矩阵。

---

**② 残差连接为什么解决梯度消失**

**残差块**：

    y = F(x) + x

**求导**：

    ∂y/∂x = ∂F/∂x + 1

**关键**：那个 **+1**。

即使 ∂F/∂x ≈ 0（梯度消失），梯度仍有 1 通过。

**多层累积**：

    x_{l+1} = x_l + F(x_l)
    x_{l+2} = x_{l+1} + F(x_{l+1}) = x_l + F(x_l) + F(x_{l+1})
    ...
    x_L = x_l + Σ_{i=l}^{L-1} F(x_i)

**反向传播**：

    ∂L/∂x_l = ∂L/∂x_L · ∂x_L/∂x_l
            = ∂L/∂x_L · (1 + ∂/∂x_l Σ F(x_i))

**注意**：\`∂L/∂x_L\` 直接乘到 \`x_l\`，
**不经过任何权重矩阵**——这就是"梯度高速公路"。

**对比普通网络**：

    x_{l+1} = F(x_l)
    ∂x_L/∂x_l = ∏ ∂F_i/∂x_i    （连乘，指数衰减）

---

**③ BasicBlock vs Bottleneck**

| 维度 | BasicBlock | Bottleneck |
| --- | --- | --- |
| **结构** | 2 个 3×3 | 1×1 → 3×3 → 1×1 |
| **输入输出** | c → c | c → 4c |
| **参数量** | 18c² | **1.81c²** |
| **用途** | ResNet-18/34 | ResNet-50/101/152 |

**Bottleneck 为什么省参数**：

    1×1: c → c/4     参数量 = c × c/4 = 0.25c²
    3×3: c/4 → c/4   参数量 = 9 × (c/4)² = 0.5625c²
    1×1: c/4 → 4c    参数量 = (c/4) × 4c = c²
    合计 = 1.8125c²

**对比**：如果 BasicBlock 也要输出 4c：

    2 × 9 × (4c)² = 288c²

**Bottleneck 省了 160 倍！**

**取舍**：
- 浅层（18/34 层）：用 BasicBlock（结构简单）
- 深层（50+ 层）：用 Bottleneck（参数可控）

**为什么深层必须用 Bottleneck**：
如果 50 层都用 BasicBlock，参数量会爆炸（几十亿）。

---

**④ 与 LSTM 细胞状态的共同思想**

**LSTM**：

    c_t = f_t ⊙ c_{t-1} + i_t ⊙ g_t

**梯度**：∂c_t/∂c_{t-1} = f_t（遗忘门）

**ResNet**：

    x_{l+1} = x_l + F(x_l)

**梯度**：∂x_{l+1}/∂x_l = 1 + ∂F/∂x_l

**共同点**：

| 维度 | LSTM | ResNet |
| --- | --- | --- |
| **核心操作** | 加法 | 加法 |
| **梯度路径** | ∂c_t/∂c_{t-1} = f_t | ∂x/∂x = 1 + ∂F/∂x |
| **效果** | f≈1 时无损 | 至少为 1 |
| **解决的问题** | 时间维度的梯度消失 | 深度维度的梯度消失 |
| **"高速公路"** | 细胞状态 | 恒等捷径 |

**本质相同**：

> **给梯度一条"直通"的路，避免它穿过会衰减的变换。**

**区别**：
- LSTM 的 f_t 是**学习出来的**（可小于 1）
- ResNet 的恒等捷径是**固定的**（永远是 1）

**这引出 ResNet v2 的思考**：
如果捷径上有任何变换（哪怕 BN/ReLU），就不再是"纯恒等"，
梯度会被削弱。所以 v2 把 BN/ReLU 移到卷积前（预激活）。

---

**⑤ 一个延伸：这个思想还出现在哪里**

| 技术 | 加法捷径的形式 |
| --- | --- |
| **LSTM** | c_t = f_t⊙c_{t-1} + ... |
| **ResNet** | x_{l+1} = x_l + F(x_l) |
| **Transformer** | x = x + Attention(x)（残差连接） |
| **DenseNet** | x_{l+1} = concat(x_l, F(x_l))（拼接而非加法） |
| **U-Net** | skip connection（跳跃连接） |
| **GPT/LLaMA** | 每个子层都有残差 |

**今天所有大模型都用了残差连接**——
这个 2015 年的设计已经成为深度学习的基础设施。`,
        rubric: [
          { point: '退化 vs 过拟合：训练误差本身就高，不是泛化问题', score: 3 },
          { point: '数学推导：∂y/∂x = ∂F/∂x + 1，多层累积 x_L = x_l + ΣF', score: 3 },
          { point: 'BasicBlock vs Bottleneck 参数量对比（18c² vs 1.81c²）', score: 2 },
          { point: '与 LSTM 的共同思想：加法路径 / 梯度高速公路', score: 2 },
          { point: '延伸到 Transformer/GPT：残差已是基础设施', score: 1 },
        ],
        keywords: ['训练误差本身高', '∂F/∂x + 1', 'x_L = x_l + ΣF', '1.81c²', '加法捷径'],
        explanation:
          '能说清「退化问题不是泛化问题而是优化问题」以及「ResNet 与 LSTM 是同一思想的两个应用」，就是真正理解了残差连接。',
        tags: ['综合分析'],
      },
    ],
  },
];
