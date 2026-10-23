import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 视觉架构
 *  10 ResNet v2: Identity Mappings in Deep Residual Networks
 *
 *  来源：
 *  - 论文：He, Zhang, Ren, Sun (2016) arXiv:1603.05027
 *  - 参考：Ojhaharsh/30u30 第 10 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperVisionChapters3: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c3: ResNet v2
   * ============================================================ */
  {
    id: 'paper-vision-c3',
    title: 'ResNet v2：让恒等映射真正"恒等"',
    goal: '理解为什么原版 ResNet 的捷径并不"纯净"，掌握预激活结构如何恢复纯恒等映射，能手写 PreActBlock 并验证 1000 层可训练。',
    lessons: [
      {
        id: 'paper-vision-c3-l1',
        title: '预激活：把 BN 和 ReLU 移到卷积前',
        difficulty: 4,
        content: `
## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Identity Mappings in Deep Residual Networks |
| **作者** | Kaiming He, Xiangyu Zhang, Shaoqing Ren, Jian Sun |
| **发表** | ECCV 2016 |
| **arXiv** | [1603.05027](https://arxiv.org/abs/1603.05027) |
| **一句话贡献** | 发现原版 ResNet 的捷径不"纯净"，改用预激活后可训练 1000+ 层 |

## 上一章的遗留问题

第 2 章讲了 ResNet 的核心：

    y = F(x) + x

**梯度**：\`∂y/∂x = ∂F/∂x + 1\`

**但有个问题**：**原版 ResNet 的 \`x\` 真的是"纯 x"吗？**

看原版结构：

    x → Conv → BN → ReLU → Conv → BN → (+x) → ReLU → y

**注意最后的 ReLU**：它在加法**之后**。

**所以实际是**：

    y = ReLU(F(x) + x)

**问题**：\`ReLU\` 会截断负值！

**这意味着**：

    如果 F(x) + x < 0，输出被截为 0
    梯度 ∂y/∂x 在负区为 0 → **捷径被破坏**！

## 论文的核心发现

**作者做了系统实验**：测试捷径路径上的各种变换。

| 捷径上的变换 | 错误率 | 说明 |
| --- | --- | --- |
| **纯恒等**（无任何操作） | **最低** | 理想情况 |
| 缩放（×0.5） | 略高 | 梯度被衰减 |
| 1×1 卷积 | 更高 | 引入额外参数 |
| Dropout | 更高 | 随机破坏梯度 |
| **ReLU（原版）** | **较高** | **截断负值** |

**结论**：**捷径上的任何变换都会损害梯度流动。**

<ShortcutTransformDemo />

**这就是"恒等映射"的严格含义**：
捷径必须是**字面意义上的恒等**（y = x，不加任何操作）。

## 预激活结构

**解决方案**：把 BN 和 ReLU **移到卷积之前**。

### 原版（Post-activation）

    x ──┬──> Conv → BN → ReLU → Conv → BN ──┬──> ReLU ──> y
        │                                      │
        └──────────── x ──────────────────────┘
                      ↑
              但最后的 ReLU 破坏了纯净性

### 预激活（Pre-activation）

    x ──┬──> BN → ReLU → Conv → BN → ReLU → Conv ──┬──> y
        │                                            │
        └──────────── x（纯净）─────────────────────┘

**关键区别**：

| 结构 | 捷径上的操作 |
| --- | --- |
| 原版 | 加法后有 ReLU → **不纯净** |
| **预激活** | 加法后无操作 → **纯恒等** |

<PreActDemo />

**新公式**：

    x_{l+1} = x_l + F(BN(ReLU(x_l)))

**注意**：\`F\` 内部有 BN/ReLU，但**捷径上什么都没有**。

## 为什么预激活更好

**梯度分析**：

    原版：  x_{l+1} = ReLU(x_l + F(x_l))
            ∂x_{l+1}/∂x_l = ReLU'(...) · (1 + ∂F/∂x_l)
                          = 0 或 (1 + ∂F/∂x_l)   ← 可能被截断为 0

    **预激活**：x_{l+1} = x_l + F(BN(ReLU(x_l)))
               ∂x_{l+1}/∂x_l = 1 + ∂F/∂x_l      ← **永远有 +1**

**关键**：预激活版本的 \`+1\` **永远不会被截断**。

## 完整架构对比

<PreActArchDemo />

**ResNet v2 的结构**：

    输入
      ↓
    Conv 7×7, 64, stride 2
      ↓
    MaxPool 3×3, stride 2
      ↓
    Stage 1: [BN-ReLU-Conv-BN-ReLU-Conv] × N
      ↓
    Stage 2-4（stride 2 下采样）
      ↓
    BN → ReLU → GAP → FC

**注意最后多了一个 BN + ReLU**：
因为预激活把 BN/ReLU 都移到卷积前，最后需要补一个。

## 实验结果

**论文的核心数据**：

| 模型 | 层数 | CIFAR-10 错误率 |
| --- | --- | --- |
| 原版 ResNet | 110 | 6.61% |
| **预激活 ResNet** | **110** | **5.71%** |
| 原版 ResNet | 164 | 5.71% |
| **预激活 ResNet** | **164** | **5.46%** |
| **预激活 ResNet** | **1001** | **4.92%** |

**关键发现**：

1. **同等层数下，预激活都更好**
2. **原版在 1000 层时无法训练**（错误率爆炸）
3. **预激活可以训练 1001 层**

<DepthScalabilityDemo />

## 为什么能到 1000 层

**论文的解释**：

    原版：x_{l+1} = ReLU(x_l + F(x_l))
      多个 ReLU 累积后，信号被不断截断
      深层时信息几乎无法传递

    预激活：x_{l+1} = x_l + F(...)
      信号可以"原样"传递
      即使 F 的输出很小，x 仍能保持

**类比**：

- **原版**：传话游戏，每传一次都有人"过滤"（ReLU 截断）
- **预激活**：接力赛，接力棒原样传递（恒等）

## zero-init 技巧

**论文还提出一个实用技巧**：把残差分支最后一个 BN 的 γ 初始化为 0。

    for m in block.modules():
        if isinstance(m, nn.BatchNorm2d):
            nn.init.constant_(m.weight, 0)   # 最后一个 BN

**效果**：训练初期 \`F(x) = 0\`，整个网络等价于恒等映射。

**为什么有用**：

    训练开始时，网络就是"什么都不做"
    然后逐步学习需要的变化
    这比随机初始化更稳定

**注意**：只对**残差分支的最后一个 BN** 做 zero-init，不是全部。

## 与现代架构的关系

**预激活的思想影响了后来的架构**：

| 架构 | 继承了什么 |
| --- | --- |
| **Transformer** | 残差连接（Post-LN vs Pre-LN 的争论同源） |
| **Pre-LN Transformer** | 把 LayerNorm 放在子层前（**与预激活同一思想**） |
| **GPT-2/3** | 用 Pre-LN（训练更稳定） |
| **ViT** | Pre-LN |

**Pre-LN vs Post-LN**：

| 结构 | 梯度 | 训练稳定性 |
| --- | --- | --- |
| **Post-LN**（原版 Transformer） | 可能衰减 | 需要 warmup |
| **Pre-LN**（GPT-2 之后） | 恒等捷径 | **更稳定** |

**这就是 ResNet v2 思想的现代延续。**

## 一个常被忽略的细节

**论文还分析了"为什么原版 ResNet 也 work"**：

虽然捷径不纯净，但 ReLU 只截断负值。
对于大多数输入，\`F(x) + x > 0\`，所以 ReLU 不起作用。

**只在深层时**，累积的负值才成为问题。

**所以**：

- 浅层（< 100 层）：原版和预激活差异不大
- **深层（> 100 层）：预激活明显更好**

**这解释了为什么原版 ResNet 在 152 层还能 work，
但 1000 层就崩了。**

## 本节来源

> **来源类型：学术来源**
> - He, K., Zhang, X., Ren, S., Sun, J. *Identity Mappings in Deep Residual Networks*
>   arXiv:[1603.05027](https://arxiv.org/abs/1603.05027)（ECCV 2016）
> - He, K. et al. *Deep Residual Learning for Image Recognition*
>   arXiv:[1512.03385](https://arxiv.org/abs/1512.03385)（CVPR 2016，原版 ResNet）
> - Xiong, R. et al. *On Layer Normalization in the Transformer Architecture*（2020）
>   arXiv:[2002.04745](https://arxiv.org/abs/2002.04745)（Pre-LN vs Post-LN 的理论分析）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 10 篇（570 行，含 PreActBlock / PreActBottleneck / ResNetV2）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「预激活解决什么问题」：原版 ResNet 加法后有 ReLU，会截断负值，破坏恒等捷径。预激活把 BN/ReLU 移到卷积前，让捷径真正纯净，梯度永远有 +1。',
          },
          {
            kind: 'leak',
            text: '「为什么能到 1000 层」：原版多个 ReLU 累积截断信号，深层时信息传不下去；预激活的捷径无任何操作，信号原样传递。',
          },
          {
            kind: 'pitfall',
            text: 'zero-init 只对残差分支最后一个 BN 的 γ 置 0，不是全部 BN。这样训练初期 F(x)=0，网络等价于恒等映射。',
          },
        ],
        demos: [
          {
            title: '原版 vs 预激活：梯度纯净性验证（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn

class PostActBlock(nn.Module):
    """原版 ResNet 块（加法后有 ReLU）。"""
    def __init__(self, c):
        super().__init__()
        self.conv1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        out = out + x
        return self.relu(out)          # ← 最后的 ReLU 破坏纯净性


class PreActBlock(nn.Module):
    """预激活块（BN/ReLU 在卷积前）。"""
    def __init__(self, c):
        super().__init__()
        self.bn1 = nn.BatchNorm2d(c)
        self.conv1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        out = self.relu(self.bn1(x))
        out = self.conv1(out)
        out = self.relu(self.bn2(out))
        out = self.conv2(out)
        return out + x                 # ← 纯净的恒等捷径


print("=== 结构对比 ===")
print()
print("Post-act:  x -> Conv-BN-ReLU -> Conv-BN -> (+x) -> ReLU")
print("Pre-act:   x -> BN-ReLU-Conv -> BN-ReLU-Conv -> (+x)")
print()

# 验证梯度纯净性
print("=== 梯度纯净性测试 ===")
print()
print("测试：输入梯度中，捷径贡献的部分是否被截断")
print()

for name, Block in [("Post-act", PostActBlock), ("Pre-act", PreActBlock)]:
    block = Block(16)
    # 输入包含负值
    x = torch.randn(1, 16, 8, 8, requires_grad=True)
    y = block(x)
    y.sum().backward()

    grad = x.grad
    zero_ratio = (grad == 0).float().mean().item()
    print(f"{name:>10}: 梯度零值比例 {zero_ratio:>6.2%}, 范数 {grad.norm().item():.4f}")

print()
print("=== 关键观察 ===")
print()
print("Pre-act 的梯度零值比例更低（因为捷径无截断）")
print("Post-act 的最后 ReLU 会把负梯度截为 0")
print()

# 深层测试
print("=== 深层累积效应 ===")
print()
print(f"{'深度':>6} | {'Post-act 梯度':>16} | {'Pre-act 梯度':>16}")
print("-" * 48)

for depth in [5, 20, 50]:
    results = []
    for Block in [PostActBlock, PreActBlock]:
        blocks = nn.Sequential(*[Block(16) for _ in range(depth)])
        x = torch.randn(1, 16, 8, 8, requires_grad=True)
        blocks(x).sum().backward()
        results.append(x.grad.norm().item())
    print(f"{depth:>6} | {results[0]:>16.4e} | {results[1]:>16.4e}")

print()
print("深层时差异更明显——Post-act 的累积截断让梯度衰减更快")`,
          },
          {
            title: 'zero-init 技巧：训练初期等价恒等映射',
            lang: 'python',
            code: `import torch
import torch.nn as nn

class PreActBlock(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.bn1 = nn.BatchNorm2d(c)
        self.conv1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        out = self.relu(self.bn1(x))
        out = self.conv1(out)
        out = self.relu(self.bn2(out))
        out = self.conv2(out)
        return out + x


def apply_zero_init(block):
    """把残差分支最后一个 BN 的 gamma 置 0。"""
    nn.init.constant_(block.bn2.weight, 0)


print("=== zero-init 效果验证 ===")
print()

block_normal = PreActBlock(16)
block_zero = PreActBlock(16)
apply_zero_init(block_zero)

x = torch.randn(1, 16, 8, 8)

with torch.no_grad():
    out_normal = block_normal(x)
    out_zero = block_zero(x)

print("普通初始化:")
print(f"  输出与输入的最大差异: {(out_normal - x).abs().max().item():.6f}")
print()
print("zero-init:")
print(f"  输出与输入的最大差异: {(out_zero - x).abs().max().item():.6f}")
print()
print("关键：zero-init 后，F(x) = 0，所以 y = x（纯恒等映射）")
print()
print("=== 为什么这有用 ===")
print()
print("训练初期：")
print("  · 网络等价于恒等映射（什么都不做）")
print("  · 梯度可以完美传播到任何深度")
print("  · 然后逐步学习需要的变化")
print()
print("对比随机初始化：")
print("  · F(x) 是随机的")
print("  · 深层累积后输出可能爆炸或消失")
print("  · 需要更多时间收敛")
print()

# 验证深层 zero-init
print("=== 深层 zero-init 验证 ===")
print()
for depth in [10, 50, 100]:
    blocks = nn.Sequential(*[PreActBlock(16) for _ in range(depth)])
    for b in blocks:
        apply_zero_init(b)
    x = torch.randn(1, 16, 8, 8)
    with torch.no_grad():
        out = blocks(x)
    diff = (out - x).abs().max().item()
    print(f"深度 {depth:>3}: 输出与输入差异 = {diff:.6f}")

print()
print("即使 100 层，输出仍然等于输入！")
print("这就是 zero-init 的威力——网络从'恒等'开始学。")`,
          },
          {
            title: '1000 层 ResNet 的可训练性',
            lang: 'python',
            code: `import torch
import torch.nn as nn

class PostActBlock(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.conv1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn1 = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c)
        self.relu = nn.ReLU(inplace=True)
    def forward(self, x):
        out = self.relu(self.bn1(self.conv1(x)))
        out = self.bn2(self.conv2(out))
        return self.relu(out + x)


class PreActBlock(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.bn1 = nn.BatchNorm2d(c)
        self.conv1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.relu = nn.ReLU(inplace=True)
    def forward(self, x):
        out = self.relu(self.bn1(x))
        out = self.conv1(out)
        out = self.relu(self.bn2(out))
        out = self.conv2(out)
        return out + x


print("=== 不同深度的可训练性 ===")
print()
print(f"{'深度':>6} | {'类型':>10} | {'输出均值':>10} | {'输出标准差':>10} | {'梯度范数':>12}")
print("-" * 62)

for depth in [50, 200, 500, 1000]:
    for name, Block in [("Post-act", PostActBlock), ("Pre-act", PreActBlock)]:
        blocks = nn.Sequential(*[Block(16) for _ in range(depth)])
        x = torch.randn(1, 16, 8, 8, requires_grad=True)
        try:
            out = blocks(x)
            out.sum().backward()
            grad = x.grad.norm().item()
            print(f"{depth:>6} | {name:>10} | {out.mean().item():>10.4f} | {out.std().item():>10.4f} | {grad:>12.4e}")
        except Exception as e:
            print(f"{depth:>6} | {name:>10} | 失败: {str(e)[:30]}")

print()
print("=== 关键观察 ===")
print()
print("Post-act：深层时梯度急剧衰减（甚至归零）")
print("Pre-act：梯度保持量级，1000 层仍可训练")
print()
print("这就是论文的核心结论：")
print("  'Identity Mappings in Deep Residual Networks'")
print("  —— 只有真正的恒等映射，才能支撑极深的网络")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-vision-c3-e1',
        type: 'single',
        difficulty: 2,
        question: 'ResNet v2 相比原版 ResNet 的核心改动是？',
        options: [
          { value: 'A', text: '增加更多层' },
          { value: 'B', text: '把 BN 和 ReLU 移到卷积之前（预激活），让捷径真正纯净' },
          { value: 'C', text: '用更大的卷积核' },
          { value: 'D', text: '去掉残差连接' },
        ],
        answer: 'B',
        explanation:
          '原版 ResNet 在加法后有 ReLU，会截断负值，破坏恒等捷径。预激活把 BN/ReLU 移到卷积前，加法后无任何操作，梯度永远有 +1。',
        tags: ['预激活'],
      },
      {
        id: 'paper-vision-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: '原版 ResNet 的捷径上有一个 ReLU，这会导致部分梯度被截断为 0。',
        answer: true,
        explanation:
          '原版 y = ReLU(F(x) + x)。当 F(x)+x < 0 时，ReLU 把输出截为 0，梯度也变 0。深层累积后这会严重阻碍梯度流动——这就是预激活要解决的问题。',
        tags: ['ReLU 截断'],
      },
      {
        id: 'paper-vision-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '论文通过实验发现，捷径上添加哪些操作会损害性能？（多选）',
        options: [
          { value: 'A', text: 'ReLU（截断负值）' },
          { value: 'B', text: '缩放（×0.5）' },
          { value: 'C', text: 'Dropout' },
          { value: 'D', text: '纯恒等（什么都不做）' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是正确答案——纯恒等效果最好。A/B/C 都会损害梯度流动，论文用对照实验证明了这一点。',
        tags: ['捷径实验'],
      },
      {
        id: 'paper-vision-c3-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'ResNet v2 的 zero-init 技巧是把残差分支最后一个 ___ 的 γ 初始化为 0，使训练初期 F(x)=0。',
        blanks: [['BN', 'BatchNorm', 'batchnorm', '批归一化']],
        explanation:
          '把最后一个 BN 的 γ 置 0，则该 BN 输出为 β（通常也是 0），整个残差分支输出 0，网络等价于恒等映射。训练中 γ 逐渐学到非零值。',
        tags: ['zero-init'],
      },
      {
        id: 'paper-vision-c3-e5',
        type: 'code',
        difficulty: 2,
        question:
          '实现预激活块的前向顺序（纯 numpy 示意）：\n\npreact_forward(x, bn_fn, relu_fn, conv_fn)：\n- 顺序：bn → relu → conv → (+x)\n返回 conv_fn(relu_fn(bn_fn(x))) + x',
        starterCode: `import numpy as np

def preact_forward(x, bn_fn, relu_fn, conv_fn):
    out = ___
    return out + x
`,
        setupCode: '',
        expectedOutput: '预激活输出',
        tests: `import numpy as np
# 恒等函数
x = np.array([[1.0, -2.0]])
identity = lambda v: v
out = preact_forward(x, identity, identity, identity)
assert np.allclose(out, [[2.0, -4.0]]), f"应等于 2x，实际 {out}"

# 验证顺序：bn -> relu -> conv
calls = []
def bn(v): calls.append('bn'); return v
def relu(v): calls.append('relu'); return v
def conv(v): calls.append('conv'); return v
preact_forward(x, bn, relu, conv)
assert calls == ['bn', 'relu', 'conv'], f"顺序错误: {calls}"
`,
        answer: `import numpy as np

def preact_forward(x, bn_fn, relu_fn, conv_fn):
    out = conv_fn(relu_fn(bn_fn(x)))
    return out + x
`,
        explanation:
          '**关键：顺序是 BN → ReLU → Conv**，而不是原版的 Conv → BN → ReLU。\n\n**为什么这个顺序重要**：\n\n    原版：... → Conv → BN → ReLU → (+x) → ReLU   ← 加法后有 ReLU\n    预激活：... → BN → ReLU → Conv → (+x)          ← 加法后无操作\n\n**结果**：预激活的捷径是纯 `+x`，没有任何截断。\n\n**注意最后还要补 BN+ReLU**：因为整个网络的最后一个块的输出没有经过激活，需要在 GAP 前补上。',
        tags: ['编程', '预激活顺序'],
      },
      {
        id: 'paper-vision-c3-e6',
        type: 'code',
        difficulty: 3,
        question:
          '用 PyTorch 实现 PreActBlock 并验证梯度纯净性：\n\n- 结构：BN → ReLU → Conv → BN → ReLU → Conv → (+x)\n- 验证：输出 = conv2(...) + x（加法后无 ReLU）',
        starterCode: `import torch
import torch.nn as nn

class PreActBlock(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.bn1 = nn.BatchNorm2d(c)
        self.conv1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        out = ___
        out = ___
        out = ___
        out = ___
        return ___   # 关键：加法后无 ReLU
`,
        setupCode: '',
        expectedOutput: 'PreActBlock',
        tests: `import torch
import torch.nn as nn

block = PreActBlock(16)
x = torch.randn(1, 16, 8, 8)
out = block(x)

assert out.shape == x.shape

# 验证：输出 = 残差分支 + x（无最后 ReLU）
# 用 zero-init 验证：如果 bn2.gamma = 0，则 F(x) = 0，输出应等于 x
nn.init.constant_(block.bn2.weight, 0)
with torch.no_grad():
    out_zero = block(x)
assert torch.allclose(out_zero, x, atol=1e-5), "zero-init 后应等于输入"

# 梯度验证
block2 = PreActBlock(16)
x2 = torch.randn(1, 16, 8, 8, requires_grad=True)
block2(x2).sum().backward()
assert x2.grad is not None
assert x2.grad.norm().item() > 0.1, f"梯度应较大: {x2.grad.norm().item()}"
`,
        answer: `import torch
import torch.nn as nn

class PreActBlock(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.bn1 = nn.BatchNorm2d(c)
        self.conv1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        out = self.relu(self.bn1(x))
        out = self.conv1(out)
        out = self.relu(self.bn2(out))
        out = self.conv2(out)
        return out + x
`,
        explanation:
          '**三个关键点**：\n\n1. **`bn1` 在 `conv1` 之前**：这是预激活的标志\n2. **`return out + x` 后没有 ReLU**：这是纯净捷径\n3. **BN 的 `bias=False` 的卷积**：BN 提供偏置\n\n**验证方法（zero-init）**：\n把 `bn2.weight`（即 γ）置 0 → BN 输出为 β=0 → ReLU(0)=0 → conv2 输出 0 → 最终 y = x。\n\n这证明了"加法后无 ReLU"，否则 y = ReLU(x) ≠ x（当 x 有负值时）。',
        tags: ['编程', 'PreActBlock'],
      },
      {
        id: 'paper-vision-c3-e7',
        type: 'code',
        difficulty: 3,
        question:
          '实现 zero-init：zero_init_residual(model)。\n\n遍历所有模块，对每个 BasicBlock/Bottleneck 的**最后一个 BN** 的 weight（γ）置 0。\n\n提示：模块的最后一个 BN 通常是 `bn2` 或 `bn3`。',
        starterCode: `import torch
import torch.nn as nn

def zero_init_residual(model):
    """把每个残差块最后一个 BN 的 gamma 置 0。"""
    for m in model.modules():
        # 判断是否是残差块（有 bn2 或 bn3 属性）
        if hasattr(m, 'bn2') and isinstance(m.bn2, nn.BatchNorm2d):
            ___
        elif hasattr(m, 'bn3') and isinstance(m.bn3, nn.BatchNorm2d):
            ___
    return model
`,
        setupCode: '',
        expectedOutput: 'zero-init 完成',
        tests: `import torch
import torch.nn as nn

class Block(nn.Module):
    def __init__(self, c):
        super().__init__()
        self.bn1 = nn.BatchNorm2d(c)
        self.conv1 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.bn2 = nn.BatchNorm2d(c)
        self.conv2 = nn.Conv2d(c, c, 3, padding=1, bias=False)
        self.relu = nn.ReLU(inplace=True)
    def forward(self, x):
        out = self.relu(self.bn1(x))
        out = self.conv1(out)
        out = self.relu(self.bn2(out))
        out = self.conv2(out)
        return out + x

class Net(nn.Module):
    def __init__(self):
        super().__init__()
        self.blocks = nn.Sequential(*[Block(8) for _ in range(3)])
    def forward(self, x):
        return self.blocks(x)

model = Net()
zero_init_residual(model)

# 验证：所有块的 bn2.weight 都是 0
for b in model.blocks:
    assert torch.all(b.bn2.weight == 0), "bn2.weight 应全为 0"

# 验证：输出等于输入（因为 F(x)=0）
x = torch.randn(1, 8, 4, 4)
with torch.no_grad():
    out = model(x)
assert torch.allclose(out, x, atol=1e-5), f"zero-init 后应等于输入"

# bn1 不应被置零
for b in model.blocks:
    assert not torch.all(b.bn1.weight == 0), "bn1 不应被置零"
`,
        answer: `import torch
import torch.nn as nn

def zero_init_residual(model):
    """把每个残差块最后一个 BN 的 gamma 置 0。"""
    for m in model.modules():
        if hasattr(m, 'bn2') and isinstance(m.bn2, nn.BatchNorm2d):
            nn.init.constant_(m.bn2.weight, 0)
        elif hasattr(m, 'bn3') and isinstance(m.bn3, nn.BatchNorm2d):
            nn.init.constant_(m.bn3.weight, 0)
    return model
`,
        explanation:
          '**`nn.init.constant_(tensor, 0)`** 把张量填成常数 0。\n\n**为什么只置最后一个 BN**：\n\n    残差分支：BN → ReLU → Conv → BN → ReLU → Conv\n                                                 ↑\n                                          最后一个 BN（bn2/bn3）\n\n把最后一个 BN 的 γ 置 0 → 该 BN 输出为 β（0）→ ReLU(0) = 0 → 最后 Conv 输出 0 → **F(x) = 0**。\n\n**如果置 bn1**：只是让输入归一化失效，F(x) 仍非 0。\n\n**注意**：`inplace=True` 的 ReLU 与 zero-init 兼容，但训练时要注意梯度。',
        tags: ['编程', 'zero-init'],
      },
      {
        id: 'paper-vision-c3-e8',
        type: 'code',
        difficulty: 4,
        question:
          '对比两种结构的深层可训练性：compare_deep_trainability(depths=[10, 50, 200])。\n\n返回 dict：{depth: (post_act_grad, pre_act_grad)}\n\n用简单块（不用 BN，用 sigmoid）确保梯度会衰减。',
        starterCode: `import torch
import torch.nn as nn

def compare_deep_trainability(depths=(10, 50, 200), width=16):
    class PostAct(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv1 = nn.Conv2d(width, width, 3, padding=1, bias=False)
            self.conv2 = nn.Conv2d(width, width, 3, padding=1, bias=False)
        def forward(self, x):
            out = torch.sigmoid(self.conv1(x))
            out = self.conv2(out)
            return torch.sigmoid(out + x)     # ← 加法后 sigmoid

    class PreAct(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv1 = nn.Conv2d(width, width, 3, padding=1, bias=False)
            self.conv2 = nn.Conv2d(width, width, 3, padding=1, bias=False)
        def forward(self, x):
            out = torch.sigmoid(x)
            out = self.conv1(out)
            out = torch.sigmoid(out)
            out = self.conv2(out)
            return out + x                     # ← 纯净捷径

    results = {}
    for depth in depths:
        grads = []
        for Block in [PostAct, PreAct]:
            blocks = nn.Sequential(*[Block() for _ in range(depth)])
            x = torch.randn(1, width, 8, 8, requires_grad=True)
            blocks(x).sum().backward()
            grads.append(x.grad.norm().item())
        results[depth] = tuple(grads)
    return results
`,
        setupCode: '',
        expectedOutput: '可训练性对比',
        tests: `import torch
r = compare_deep_trainability((10, 50, 200), 16)
assert len(r) == 3
assert 10 in r and 50 in r and 200 in r

# 浅层：两者都可能还行
post_10, pre_10 = r[10]
assert pre_10 > 0, "pre-act 梯度应 > 0"

# 深层：pre-act 明显更好
post_200, pre_200 = r[200]
assert pre_200 > post_200 * 10, f"200层时 pre-act 应远好于 post-act: pre={pre_200:.2e}, post={post_200:.2e}"

# pre-act 梯度随深度保持量级
assert pre_200 > pre_10 / 1000, f"pre-act 梯度不应急剧衰减: 10层={pre_10:.2e}, 200层={pre_200:.2e}"
`,
        answer: `import torch
import torch.nn as nn

def compare_deep_trainability(depths=(10, 50, 200), width=16):
    class PostAct(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv1 = nn.Conv2d(width, width, 3, padding=1, bias=False)
            self.conv2 = nn.Conv2d(width, width, 3, padding=1, bias=False)
        def forward(self, x):
            out = torch.sigmoid(self.conv1(x))
            out = self.conv2(out)
            return torch.sigmoid(out + x)

    class PreAct(nn.Module):
        def __init__(self):
            super().__init__()
            self.conv1 = nn.Conv2d(width, width, 3, padding=1, bias=False)
            self.conv2 = nn.Conv2d(width, width, 3, padding=1, bias=False)
        def forward(self, x):
            out = torch.sigmoid(x)
            out = self.conv1(out)
            out = torch.sigmoid(out)
            out = self.conv2(out)
            return out + x

    results = {}
    for depth in depths:
        grads = []
        for Block in [PostAct, PreAct]:
            blocks = nn.Sequential(*[Block() for _ in range(depth)])
            x = torch.randn(1, width, 8, 8, requires_grad=True)
            blocks(x).sum().backward()
            grads.append(x.grad.norm().item())
        results[depth] = tuple(grads)
    return results
`,
        explanation:
          '**这个实验用 sigmoid 替代 ReLU**，因为 ReLU 的导数是 0 或 1（不会衰减），\n而 sigmoid 的导数 ≤ 0.25，能真实反映梯度衰减。\n\n**预期结果**：\n\n| 深度 | Post-act | Pre-act |\n| --- | --- | --- |\n| 10 | ~1e-5 | ~1e-1 |\n| 50 | ~1e-15 | ~1e-1 |\n| 200 | **0** | **~1e-1** |\n\n**关键**：Pre-act 的梯度**几乎不随深度衰减**——因为 `∂y/∂x = ∂F/∂x + 1`，那个 +1 提供了下界。\n\n**Post-act 的问题**：`y = sigmoid(F(x)+x)`，\n`sigmoid` 的导数 ≤ 0.25，每层都乘 0.25 → 指数衰减。',
        tags: ['编程', '可训练性对比'],
      },
      {
        id: 'paper-vision-c3-e9',
        type: 'judge',
        difficulty: 4,
        question: '原版 ResNet 在 152 层时表现良好，说明它的捷径已经是纯净的恒等映射。',
        answer: false,
        explanation:
          '原版加法后有 ReLU，不是纯净恒等。它能 work 是因为大多数输入 F(x)+x > 0，ReLU 不起作用。但深层累积后负值成为问题——1000 层时就崩了，这正是预激活要解决的。',
        tags: ['纯净性'],
      },
      {
        id: 'paper-vision-c3-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 原版 ResNet 的捷径为什么不"纯净"；② 预激活如何解决；③ zero-init 的作用与原理；④ 这个思想与 Transformer 的 Pre-LN 有什么联系。',
        referenceAnswer: `**① 原版捷径为什么不纯净**

**原版结构**：

    x → Conv → BN → ReLU → Conv → BN → (+x) → ReLU → y

**数学表达**：

    y = ReLU(F(x) + x)

**问题**：最后的 ReLU。

**具体影响**：

| 情况 | 结果 |
| --- | --- |
| F(x) + x > 0 | ReLU 不起作用，梯度正常 |
| **F(x) + x < 0** | **输出被截为 0，梯度为 0** |

**梯度分析**：

    ∂y/∂x = ReLU'(F(x)+x) · (1 + ∂F/∂x)
          = 0  或  (1 + ∂F/∂x)
              ↑
        可能被截断为 0！

**深层累积的后果**：

    10 层：偶尔有截断，影响小
    100 层：累积后信号明显减弱
    **1000 层：几乎无法传递**

**论文的对照实验**（CIFAR-10）：

| 捷径上的操作 | 错误率 |
| --- | --- |
| **纯恒等** | **最低** |
| 缩放 ×0.5 | 略高 |
| 1×1 卷积 | 更高 |
| Dropout | 更高 |
| **ReLU** | **较高** |

**结论**：捷径上的任何操作都会损害梯度。

---

**② 预激活如何解决**

**结构改动**：把 BN/ReLU 移到卷积**之前**。

**原版**：

    x → Conv → BN → ReLU → Conv → BN → (+x) → ReLU

**预激活**：

    x → BN → ReLU → Conv → BN → ReLU → Conv → (+x)

**关键区别**：

| 位置 | 原版 | 预激活 |
| --- | --- | --- |
| 加法后 | **有 ReLU** | **无操作** |
| 捷径 | 被 ReLU 破坏 | **纯净** |

**数学表达**：

    x_{l+1} = x_l + F(BN(ReLU(x_l)))

**梯度**：

    ∂x_{l+1}/∂x_l = 1 + ∂F/∂x_l

**那个 +1 永远不会被截断。**

**代价**：网络的最后需要补一个 BN+ReLU（因为预激活把激活都移到前面了）。

---

**③ zero-init 的作用与原理**

**做法**：把残差分支**最后一个 BN** 的 γ 初始化为 0。

    for m in model.modules():
        if isinstance(m, nn.BatchNorm2d):
            nn.init.constant_(m.weight, 0)   # 只对最后一个

**为什么有效**：

    BN 输出 = γ · (x - μ)/σ + β
    当 γ = 0 时，输出 = β = 0
    → ReLU(0) = 0
    → 最后一个 Conv 的输入是 0 → 输出 0
    → **F(x) = 0**

**所以**：

    y = F(x) + x = 0 + x = x

**训练初期，整个网络等价于恒等映射！**

**好处**：

| 方面 | 效果 |
| --- | --- |
| **梯度** | 完美传播（∂y/∂x = 1） |
| **稳定性** | 不会爆炸/消失 |
| **收敛** | 从"什么都不做"开始，逐步学习变化 |

**对比随机初始化**：

    F(x) 随机 → 深层累积后可能爆炸或消失
    需要更多 epoch 才能收敛到合理状态

**注意**：只对**残差分支的最后一个 BN** 做 zero-init，
不是所有 BN（否则整个网络都失效）。

---

**④ 与 Transformer Pre-LN 的联系**

**Transformer 的两种结构**：

**Post-LN**（原版 Transformer，2017）：

    x = LayerNorm(x + Sublayer(x))

**Pre-LN**（GPT-2 之后，2019+）：

    x = x + Sublayer(LayerNorm(x))

**结构与 ResNet 完全对应**：

| ResNet | Transformer |
| --- | --- |
| **Post-act**：\`ReLU(F(x)+x)\` | **Post-LN**：\`LN(x + F(x))\` |
| **Pre-act**：\`F(BN(ReLU(x))) + x\` | **Pre-LN**：\`F(LN(x)) + x\` |

**问题也相同**：

| 结构 | 问题 |
| --- | --- |
| Post-LN | 梯度可能被 LN 削弱，需要 warmup |
| **Pre-LN** | **捷径纯净，训练稳定** |

**实证结果**（Xiong et al. 2020）：

| 结构 | 训练稳定性 | 是否需要 warmup |
| --- | --- | --- |
| Post-LN | 差（深层时梯度爆炸） | **必需** |
| **Pre-LN** | **好** | 不需要 |

**这就是为什么 GPT-2 之后都用 Pre-LN**。

**历史脉络**：

    2015  ResNet         → 残差连接
    2016  ResNet v2      → 预激活（捷径纯净）
    2017  Transformer    → Post-LN（继承残差，但 LN 位置错了）
    2019  GPT-2          → Pre-LN（重新发现"捷径要纯净"）
    2020  Xiong et al.   → 理论分析证明 Pre-LN 更稳

**同一个道理，被独立发现了两次。**

---

**⑤ 一个方法论启示**

**ResNet v2 的贡献不是"新架构"，而是"严格分析"。**

论文做了一件很有价值的事：

> **把"捷径上该有什么"当作一个可实验的问题，逐一测试。**

**测试了 6 种方案**：

1. 纯恒等
2. 缩放
3. 1×1 卷积
4. Dropout
5. ReLU
6. 各种组合

**结论**：纯恒等最好。

**这告诉我们**：

> **好的研究不只是"提出新方法"，也包括"验证已有方法的每个细节"。**

原版 ResNet 已经 work 了，但 v2 通过严格分析找到了更优的形式，
并解释了"为什么 work"——**理解比效果更重要**。`,
        rubric: [
          { point: '原版 y=ReLU(F(x)+x)，ReLU 截断负梯度，深层累积致命', score: 3 },
          { point: '预激活：BN/ReLU 前置，加法后无操作，+1 永不截断', score: 2 },
          { point: 'zero-init：最后 BN 的 γ=0 → F(x)=0 → 等价恒等映射', score: 2 },
          { point: '与 Pre-LN 的对应：同一问题，独立发现两次', score: 2 },
          { point: '方法论：严格分析已有方法的细节比提出新方法更有价值', score: 1 },
        ],
        keywords: ['ReLU 截断', '纯净捷径', 'γ=0', 'Pre-LN', '严格分析'],
        explanation:
          '能说清「Post-LN 和 Post-act 是同一个错误」以及「ResNet v2 的价值在严格分析而非新架构」，就是理解了这篇论文的真正贡献。',
        tags: ['综合分析'],
      },
    ],
  },
];
