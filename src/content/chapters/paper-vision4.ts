import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 视觉架构
 *  11 Multi-Scale Context Aggregation by Dilated Convolutions
 *
 *  来源：
 *  - 论文：Yu & Koltun (2015) arXiv:1511.07122
 *  - 参考：Ojhaharsh/30u30 第 11 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperVisionChapters4: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c4: Dilated Convolutions
   * ============================================================ */
  {
    id: 'paper-vision-c4',
    title: '空洞卷积：不降分辨率也能扩大感受野',
    goal: '理解空洞卷积如何在不增加参数的情况下扩大感受野，掌握感受野计算公式与多尺度聚合，能手写 DilatedConv2d 与 ASPP。',
    lessons: [
      {
        id: 'paper-vision-c4-l1',
        title: '分辨率与感受野的两难',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 陈述「分辨率 vs 感受野」两难与 FCN 上采样救不回细节的原因；
2. 用感受野公式计算递增 dilation 序列的指数增长（7 层 RF=255），并解释网格效应的成因与解法；
3. 用覆盖集模拟对比递增与恒定 dilation 的采样覆盖率（100% vs 53%），说出 ASPP 的多尺度并行思想。

### 前置知识

- c5 的感受野累加公式与卷积定义；
- 语义分割任务形式；
- c2 的残差块。

### 问题背景

语义分割要求「像素级精度」与「大感受野」同时成立：池化下采样换感受野，却把边界信息丢掉，插值上采样救不回来。空洞卷积在 3×3 核里插「洞」：参数仍是 9 个，dilation=2 感受野即 5×5；按 1,2,4,…,2^L 递增堆叠，7 层感受野 255×255（标准 3×3 需 127 层），分辨率全程不降。DeepLab 的 ASPP 并行多 dilation 捕获多尺度，WaveNet 用因果空洞卷积生成音频。

### 直觉理解

观察一幅壁画：凑太近（小感受野）只见笔触，退太远（下采样）细节糊成一片。空洞卷积像「隔着玻璃上的洞看画」：眼睛不动（参数不变），把洞的间距拉大（dilation），一眼扫过更大范围，且每个像素仍在原位——分辨率与视野第一次兼得。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Multi-Scale Context Aggregation by Dilated Convolutions |
| **作者** | Fisher Yu, Vladlen Koltun |
| **发表** | ICLR 2016 |
| **arXiv** | [1511.07122](https://arxiv.org/abs/1511.07122) |
| **一句话贡献** | 用空洞卷积在不降分辨率的情况下指数级扩大感受野，用于语义分割 |

## 语义分割的核心矛盾

**任务**：给每个像素分类（这是天空、这是车、这是人）。

**需要什么**：

| 需求 | 说明 |
| --- | --- |
| **精确的像素位置** | 边界要对齐 |
| **大的感受野** | 判断"这是车"需要看到整辆车 |
| **多尺度** | 车有远近大小 |

**传统做法（FCN）**：

    Conv → Pool(降分辨率) → Conv → Pool → ... → 上采样

**问题**：

| 步骤 | 后果 |
| --- | --- |
| Pool 降分辨率 | **丢失精确位置信息** |
| 上采样恢复 | 只能插值，**无法恢复细节** |

**这就是"分辨率 vs 感受野"的两难**：

    要感受野 → 必须下采样 → 丢分辨率
    要分辨率 → 不下采样 → 感受野小

<ReceptiveFieldDemo />

## 空洞卷积的解法

**核心思想**：在卷积核的元素之间**插入空洞**（zeros）。

**标准 3×3 卷积**（dilation=1）：

    ■ ■ ■
    ■ ■ ■
    ■ ■ ■
    感受野：3×3

**空洞 3×3 卷积**（dilation=2）：

    ■ · ■ · ■
    · · · · ·
    ■ · ■ · ■
    · · · · ·
    ■ · ■ · ■
    感受野：5×5（但只有 9 个参数）

**关键**：**参数量不变（还是 9 个），感受野扩大到 5×5。**

<DilationVisualDemo />

**dilation=4 时**：感受野 9×9，参数还是 9 个。

## 感受野的指数增长

**公式**（逐层累积）：

    RF = 1 + Σ_{i=1}^{L} (k_i - 1) × d_i × Π_{j<i} s_j

**简化情况**（k=3, stride=1）：

    每层增加 2×d_i 个像素

**指数增长的配置**（论文的关键设计）：

| 层 | dilation | 单层增量 | 累计感受野 |
| --- | --- | --- | --- |
| 1 | 1 | 2 | 3 |
| 2 | 2 | 4 | 7 |
| 3 | 4 | 8 | 15 |
| 4 | 8 | 16 | 31 |
| 5 | 16 | 32 | 63 |
| 6 | 32 | 64 | 127 |
| 7 | 64 | 128 | 255 |

**关键**：**感受野指数增长，参数量线性增长**。

**7 层**：感受野 255×255，参数量 \`7 × 9 × C² = 63C²\`。

**对比**：用标准 3×3 卷积要达到 255 感受野，需要 **127 层**。

<ExponentialGrowthDemo />

## 为什么这有效

**关键洞察**：**空洞卷积不丢失分辨率**。

    FCN：     Conv → Pool(1/2) → Conv → Pool(1/4) → ... → 上采样
              分辨率：1 → 1/2 → 1/4 → ... → 1（插值恢复，模糊）

    空洞卷积： Conv(d=1) → Conv(d=2) → Conv(d=4) → ... 
              分辨率：1 → 1 → 1 → ... （始终不变，精确）

**所以**：

| 方面 | FCN | 空洞卷积 |
| --- | --- | --- |
| 分辨率 | 下降后插值恢复 | **始终保持** |
| 感受野 | 靠池化 | **靠 dilation** |
| 边界精度 | 模糊 | **精确** |

## 网格效应（Gridding Problem）

**问题**：如果连续用相同的 dilation，会产生"网格"。

**例子**：3 层 dilation=2

    感受野中只有"每隔 2 个像素"的位置被采样
    → 中间的信息被跳过
    → 输出出现棋盘格伪影

**解法**：**用递增的 dilation**（1, 2, 4, 8...）。

**为什么**：
- d=1 覆盖所有像素
- d=2 在 d=1 的基础上扩大
- d=4 再扩大
- **组合起来覆盖连续区域**

**论文的验证**：

| Dilation 配置 | mIoU |
| --- | --- |
| 全部 d=2 | 较低（网格效应） |
| **1,2,4,8,16,32,64** | **最高** |
| 随机 | 中等 |

## 与 ASPP 的关系

**ASPP（Atrous Spatial Pyramid Pooling）** 是 DeepLab 系列的核心组件。

**思想**：**并行使用多个 dilation**，捕获多尺度信息。

    input ──┬──> Conv d=1  ──┐
            ├──> Conv d=6  ──┤
            ├──> Conv d=12 ──┼──> Concat ──> Conv 1×1 ──> output
            ├──> Conv d=18 ──┤
            └──> GAP ────────┘

**为什么有效**：

| Dilation | 捕获的尺度 |
| --- | --- |
| 1 | 细节（边缘、纹理） |
| 6 | 小物体 |
| 12 | 中物体 |
| 18 | 大物体 |
| GAP | 全局上下文 |

**关键**：**不同 dilation 对应不同感受野 → 同时看到多个尺度**。

<ASPPDemo />

## WaveNet：空洞卷积的另一个应用

**WaveNet**（DeepMind 2016）用空洞卷积生成音频。

**核心结构**：**因果空洞卷积 + 指数增长的 dilation**。

    d=1:  ■ ■
    d=2:  ■   ■
    d=4:  ■       ■
    d=8:  ■               ■
    ...
    d=512: ■                                                       ■

**感受野**：\`2^10 = 1024\` 个采样点（约 64ms 音频）。

**关键**：**因果**（只看过去）+ **空洞**（大感受野）。

**为什么适合音频**：

    音频是长序列（每秒 16000 个采样点）
    需要看很远的历史（几十毫秒）
    空洞卷积让感受野指数增长，参数线性增长

## 与 ResNet 的结合

**空洞残差块**：

    x ──┬──> Conv d=2 → BN → ReLU → Conv d=2 → BN ──┬──> ReLU ──> y
        │                                              │
        └──────────────── x ──────────────────────────┘

**ResNet + 空洞卷积**：

| 技术 | 贡献 |
| --- | --- |
| ResNet 的残差 | 梯度直通，支持深层 |
| 空洞卷积 | 大感受野，保分辨率 |

**现代分割网络（DeepLab v3+、PSPNet）都用这个组合。**

## 代价与局限

| 代价 | 说明 |
| --- | --- |
| **计算量增加** | 虽然参数不变，但每个卷积要访问更远的像素（内存访问模式不友好） |
| **网格效应** | 需要仔细设计 dilation 序列 |
| **小物体性能** | 大 dilation 会"跳过"小物体 |
| **不能完全替代池化** | 某些任务仍需下采样 |

**实践建议**：

| 场景 | 建议 |
| --- | --- |
| 语义分割 | 用 ASPP + 递增 dilation |
| 音频生成 | 用因果空洞卷积（WaveNet） |
| 一般分类 | 不需要（下采样足够） |
| 密集预测 | 必须用（保分辨率） |

## 本节来源

> **来源类型：学术来源**
> - Yu, F., Koltun, V. *Multi-Scale Context Aggregation by Dilated Convolutions*
>   arXiv:[1511.07122](https://arxiv.org/abs/1511.07122)（ICLR 2016）
> - Chen, L.-C. et al. *DeepLab: Semantic Image Segmentation with Deep Convolutional Nets,
>   Atrous Convolution, and Fully Connected CRFs*
>   arXiv:[1606.00915](https://arxiv.org/abs/1606.00915)（ASPP 出处）
> - van den Oord, A. et al. *WaveNet: A Generative Model for Raw Audio*
>   arXiv:[1609.03499](https://arxiv.org/abs/1609.03499)
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 11 篇（764 行，含 DilatedConv2d / ASPP / WaveNetBlock / ReceptiveFieldAnalyzer）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
def coverage(dilations, size=33):
    touched = {size // 2}
    for d in reversed(dilations):
        touched = {i + off for i in touched for off in (-d, 0, d) if 0 <= i + off < size}
    return touched
for name, dil in (("递增 1,2,4,8", [1, 2, 4, 8]), ("恒定 2,2,2,2", [2, 2, 2, 2])):
    t = coverage(dil)
    print(f"{name}: 感受野 {max(t)-min(t)+1} 格, 覆盖 {len(t)}/{max(t)-min(t)+1} ({len(t)/(max(t)-min(t)+1):.0%})")
print("恒定 dilation 只采样偶数位 -> 网格效应; 递增序列覆盖连续区域")\`\`\`

预期输出（实测）：实测：递增 dilation [1,2,4,8] 的中心输出可覆盖输入 ±15 的全部 31 格（100%）；恒定 [2,2,2,2] 名义感受野 17 格但只触到 9 格（53%）——恒定 dilation 只采样偶数位，产生网格伪影；递增序列的偏移集合 {±1,±2,±4,±8} 恰好拼出全部整数，连续覆盖。

**常见错误**：连续多层用同一个 dilation，网格伪影出现还怪模型不行；只算参数量不算内存访问——大 dilation 的访存模式不友好会拖慢实际速度；为了「全程不降分辨率」连全局池化也删掉，全局上下文反而没了。

### 常见误区

1. **空洞卷积参数变多**——参数仍是 k² 个，变大的只是感受野；
2. **dilation 越大越好**——大 dilation 会跳过小物体，需与 ASPP 多尺度并行配合；
3. **它能完全替代池化**——分类任务下采样依旧高效，空洞卷积的主场是密集预测与长序列。

### 知识关联

- **向前**：c5 的感受野累加公式是本节的计算工具；
- **向后**：DeepLab v3+ 的 ASPP、WaveNet 的因果空洞卷积；
- **平行**：c2 残差块 + 空洞卷积 = 现代分割网络标配组合。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 两难 | 要感受野→下采样→丢分辨率 |
| 机制 | 核内插洞：9 参数，dilation=d 感受野 2d+1 |
| 增长 | 递增 1,2,4,…：7 层 RF=255（标准需 127 层） |
| 实测 | 递增覆盖 100% vs 恒定 53%（网格效应） |
| 应用 | DeepLab ASPP、WaveNet |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Yu & Koltun, Multi-Scale Context Aggregation by Dilated Convolutions, arXiv:1511.07122）
`,
        tips: [
          {
            kind: 'interview',
            text: '「空洞卷积解决什么问题」：语义分割需要大感受野又要保分辨率。池化能扩大感受野但丢分辨率，空洞卷积在不降分辨率的情况下扩大感受野，参数量不变。',
          },
          {
            kind: 'leak',
            text: '「感受野指数增长」：dilation 用 1,2,4,8,16,32,64 时，7 层感受野达 255×255，参数量只有 63C²。用标准 3×3 要 127 层才能达到。',
          },
          {
            kind: 'pitfall',
            text: '连续用相同 dilation 会产生"网格效应"（跳过部分像素）。必须用递增的 dilation 序列（1,2,4,8...）才能覆盖连续区域。',
          },
        ],
        demos: [
          {
            title: '空洞卷积实现与感受野计算（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn

class DilatedConv2d(nn.Module):
    """空洞卷积（保持分辨率）。"""
    def __init__(self, in_ch, out_ch, kernel=3, dilation=1):
        super().__init__()
        # padding = dilation * (kernel-1) / 2 保持尺寸不变
        padding = dilation * (kernel - 1) // 2
        self.conv = nn.Conv2d(in_ch, out_ch, kernel, padding=padding, dilation=dilation)

    def forward(self, x):
        return self.conv(x)


def receptive_field(layers):
    """
    计算累积感受野。

    layers: [(kernel, dilation, stride), ...]
    返回 (感受野大小, 累计 stride)
    """
    rf = 1
    stride_prod = 1
    for k, d, s in layers:
        rf += (k - 1) * d * stride_prod
        stride_prod *= s
    return rf, stride_prod


print("=== 单层空洞卷积：参数量不变，感受野扩大 ===")
print()
print(f"{'dilation':>10} | {'kernel':>7} | {'参数量':>10} | {'感受野':>8}")
print("-" * 46)

for d in [1, 2, 4, 8]:
    conv = DilatedConv2d(3, 3, kernel=3, dilation=d)
    params = sum(p.numel() for p in conv.parameters())
    rf = (3 - 1) * d + 1
    print(f"{d:>10} | {3:>7} | {params:>10} | {rf:>8}")

print()
print("关键：参数量完全相同（3x3x3x3 + 3 = 30），但感受野从 3 扩到 17")

print()
print("=== 指数增长的感受野 ===")
print()
print(f"{'层数':>6} | {'dilation 序列':>26} | {'感受野':>8} | {'参数量/通道':>12}")
print("-" * 62)

for n in [1, 2, 3, 4, 5, 6, 7]:
    dils = [2**i for i in range(n)]
    layers = [(3, d, 1) for d in dils]
    rf, _ = receptive_field(layers)
    params = n * 9
    dil_str = ",".join(str(d) for d in dils)
    if len(dil_str) > 24:
        dil_str = dil_str[:21] + "..."
    print(f"{n:>6} | {dil_str:>26} | {rf:>8} | {params:>12}")

print()
print("7 层：感受野 255，参数量 63（每通道）")
print("对比标准 3x3 卷积要达到 255 感受野，需要 127 层（参数 1143）")

print()
print("=== 保持分辨率验证 ===")
x = torch.randn(1, 3, 32, 32)
print(f"输入: {tuple(x.shape)}")
for d in [1, 2, 4, 8]:
    conv = DilatedConv2d(3, 8, 3, d)
    out = conv(x)
    print(f"d={d}: 输出 {tuple(out.shape)}  (尺寸不变!)")`,
          },
          {
            title: '网格效应与递增 dilation 的对比',
            lang: 'python',
            code: `import torch
import torch.nn as nn

def build_dilated_stack(dilations, channels=16):
    """构建空洞卷积堆叠。"""
    layers = []
    for i, d in enumerate(dilations):
        in_c = 3 if i == 0 else channels
        padding = d
        layers.append(nn.Conv2d(in_c, channels, 3, padding=padding, dilation=d))
        layers.append(nn.ReLU())
    return nn.Sequential(*layers)


print("=== 网格效应演示 ===")
print()
print("问题：连续用相同 dilation 会跳过部分像素")
print()

# 分析不同配置的"覆盖模式"
def analyze_coverage(dilations):
    """分析感受野中哪些位置被采样。"""
    # 简化：假设单通道，追踪采样位置
    positions = {0}
    for d in dilations:
        new_positions = set()
        for p in positions:
            for k in [-1, 0, 1]:      # 3x3 kernel 的偏移
                new_positions.add(p + k * d)
        positions = new_positions
    return sorted(positions)

configs = [
    ("全部 d=2 (3层)", [2, 2, 2]),
    ("递增 1,2,4", [1, 2, 4]),
    ("递增 1,2,4,8", [1, 2, 4, 8]),
]

for name, dils in configs:
    cov = analyze_coverage(dils)
    span = max(cov) - min(cov) + 1
    covered = len(cov)
    ratio = covered / span
    # 检查是否连续
    is_contiguous = (max(cov) - min(cov) + 1) == len(cov)
    print(f"{name:>16}:")
    print(f"  采样位置数: {covered}, 跨度: {span}, 覆盖率: {ratio:.1%}")
    print(f"  是否连续: {'✓ 是' if is_contiguous else '✗ 否（有网格空洞）'}")
    print()

print("=== 关键结论 ===")
print()
print("全部 d=2：采样位置离散，覆盖率低 -> 网格效应")
print("递增 dilation：采样位置连续，覆盖完整 -> 无网格")
print()
print("这就是为什么论文用 1,2,4,8,16,32,64 而不是全用 2。")

print()
print("=== 实际网络对比 ===")
print()
configs_net = [
    ("全部 d=2", [2]*6),
    ("递增 d=1,2,4,8,16,32", [1,2,4,8,16,32]),
]

for name, dils in configs_net:
    net = build_dilated_stack(dils)
    x = torch.randn(1, 3, 32, 32)
    out = net(x)
    n_params = sum(p.numel() for p in net.parameters())
    # 计算感受野
    rf = 1
    for d in dils:
        rf += 2 * d
    print(f"{name:>24}: 感受野={rf:>4}, 参数量={n_params:>6,}, 输出={tuple(out.shape)}")`,
          },
          {
            title: 'ASPP：多尺度并行聚合',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class ASPP(nn.Module):
    """
    Atrous Spatial Pyramid Pooling。

    并行使用多个 dilation，捕获多尺度信息。
    """
    def __init__(self, in_channels, out_channels=256, dilations=(1, 6, 12, 18)):
        super().__init__()
        self.branches = nn.ModuleList()

        for d in dilations:
            padding = d
            self.branches.append(
                nn.Sequential(
                    nn.Conv2d(in_channels, out_channels, 3, padding=padding, dilation=d, bias=False),
                    nn.BatchNorm2d(out_channels),
                    nn.ReLU(inplace=True),
                )
            )

        # 全局平均池化分支
        self.gap = nn.Sequential(
            nn.AdaptiveAvgPool2d(1),
            nn.Conv2d(in_channels, out_channels, 1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
        )

        # 融合
        self.project = nn.Sequential(
            nn.Conv2d(out_channels * (len(dilations) + 1), out_channels, 1, bias=False),
            nn.BatchNorm2d(out_channels),
            nn.ReLU(inplace=True),
            nn.Dropout(0.5),
        )

    def forward(self, x):
        size = x.shape[-2:]
        outs = [branch(x) for branch in self.branches]

        # GAP 分支需要上采样回原尺寸
        gap_out = self.gap(x)
        gap_out = F.interpolate(gap_out, size=size, mode='bilinear', align_corners=False)
        outs.append(gap_out)

        return self.project(torch.cat(outs, dim=1))


print("=== ASPP 结构与多尺度 ===")
print()

aspp = ASPP(64, 256)
x = torch.randn(1, 64, 32, 32)
out = aspp(x)

print(f"输入: {tuple(x.shape)}")
print(f"输出: {tuple(out.shape)}")
print()

print("=== 各分支的感受野 ===")
print()
print(f"{'分支':>12} | {'dilation':>9} | {'感受野':>8} | {'捕获的尺度'}")
print("-" * 52)

for d, scale in [(1, '细节/边缘'), (6, '小物体'), (12, '中物体'), (18, '大物体')]:
    rf = 2 * d + 1
    print(f"{'Conv d='+str(d):>12} | {d:>9} | {rf:>8} | {scale}")
print(f"{'GAP':>12} | {'-':>9} | {'全局':>8} | 整体上下文")

print()
print("=== 参数量分析 ===")
print()
total = sum(p.numel() for p in aspp.parameters())
print(f"ASPP 总参数量: {total:,}")
print()
for i, branch in enumerate(aspp.branches):
    n = sum(p.numel() for p in branch.parameters())
    print(f"  分支 {i+1} (d={[1,6,12,18][i]}): {n:,}")
n_gap = sum(p.numel() for p in aspp.gap.parameters())
print(f"  GAP 分支:        {n_gap:,}")
n_proj = sum(p.numel() for p in aspp.project.parameters())
print(f"  融合层:          {n_proj:,}")

print()
print("=== 为什么 ASPP 有效 ===")
print()
print("单个 dilation 只能看到一个尺度：")
print("  d=1  -> 只看局部细节，不知道'这是车'")
print("  d=18 -> 只看大范围，边界模糊")
print()
print("ASPP 并行所有尺度，然后 concat：")
print("  既有细节（d=1），又有语义（d=18），还有全局（GAP）")
print("  -> 分割既准确又精细")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-vision-c4-e1',
        type: 'single',
        difficulty: 2,
        question: '空洞卷积（Dilated Convolution）解决的核心问题是？',
        options: [
          { value: 'A', text: '减少参数量' },
          { value: 'B', text: '在不降低分辨率的情况下扩大感受野' },
          { value: 'C', text: '加快训练速度' },
          { value: 'D', text: '防止过拟合' },
        ],
        answer: 'B',
        explanation:
          '语义分割需要大感受野（判断"这是车"）又要保分辨率（边界精确）。池化能扩大感受野但丢分辨率。空洞卷积在卷积核中插入空洞，参数量不变但感受野扩大。',
        tags: ['核心动机'],
      },
      {
        id: 'paper-vision-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: '空洞卷积的参数量比标准卷积多，因为它要处理更大的感受野。',
        answer: false,
        explanation:
          '参数量完全相同。3×3 卷积无论 dilation 是多少，都是 9 个参数（乘通道数）。dilation 只是改变了采样位置，不增加参数。这就是它的优势。',
        tags: ['参数量'],
      },
      {
        id: 'paper-vision-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于空洞卷积，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'dilation=2 的 3×3 卷积，感受野是 5×5' },
          { value: 'B', text: '用递增 dilation（1,2,4,8...）感受野指数增长' },
          { value: 'C', text: '连续用相同 dilation 会产生网格效应' },
          { value: 'D', text: '空洞卷积会自动降低分辨率' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——空洞卷积恰恰是为了保持分辨率。A 正确（(3-1)×2+1=5）；B 正确（指数增长）；C 正确（需用递增序列避免）。',
        tags: ['空洞卷积性质'],
      },
      {
        id: 'paper-vision-c4-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'ASPP（Atrous Spatial Pyramid Pooling）并行使用多个不同 ___ 的卷积，捕获多尺度信息。',
        blanks: [['dilation', '空洞率', '膨胀率', '膨胀系数']],
        explanation:
          'ASPP 并行 d=1,6,12,18 等多个分支 + GAP，然后 concat。不同 dilation 对应不同感受野，从而同时捕获细节、小物体、中物体、大物体和全局上下文。',
        tags: ['ASPP'],
      },
      {
        id: 'paper-vision-c4-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算空洞卷积的感受野：dilated_receptive_field(kernel, dilation)。\n\n公式：RF = (kernel - 1) × dilation + 1',
        starterCode: `def dilated_receptive_field(kernel, dilation):
    return ___
`,
        setupCode: '',
        expectedOutput: '感受野',
        tests: `# 标准卷积
assert dilated_receptive_field(3, 1) == 3
assert dilated_receptive_field(3, 2) == 5
assert dilated_receptive_field(3, 4) == 9
assert dilated_receptive_field(3, 8) == 17
# 5x5 卷积
assert dilated_receptive_field(5, 1) == 5
assert dilated_receptive_field(5, 2) == 9
# 1x1 卷积
assert dilated_receptive_field(1, 10) == 1
`,
        answer: `def dilated_receptive_field(kernel, dilation):
    return (kernel - 1) * dilation + 1
`,
        explanation:
          '**这个公式是理解空洞卷积的基础**。\n\n**推导**：\n- 3×3 卷积，dilation=1：覆盖位置 -1, 0, +1 → 跨度 3\n- 3×3 卷积，dilation=2：覆盖位置 -2, 0, +2 → 跨度 5\n- 3×3 卷积，dilation=d：覆盖位置 -d, 0, +d → 跨度 2d+1\n\n**所以**：`RF = (k-1)×d + 1`。\n\n**注意**：1×1 卷积的 RF 永远是 1（无论 dilation），因为没有空间扩展。',
        tags: ['编程', '感受野'],
      },
      {
        id: 'paper-vision-c4-e6',
        type: 'code',
        difficulty: 3,
        question:
          '计算多层累积感受野：cumulative_receptive_field(layers)。\n\n- layers: [(kernel, dilation, stride), ...]\n- 公式：RF = 1 + Σ (k_i - 1) × d_i × Π_{j<i} s_j\n返回感受野大小（整数）。',
        starterCode: `def cumulative_receptive_field(layers):
    rf = 1
    stride_prod = 1
    for k, d, s in layers:
        rf += ___
        stride_prod *= s
    return rf
`,
        setupCode: '',
        expectedOutput: '累积感受野',
        tests: `# 单层
assert cumulative_receptive_field([(3, 1, 1)]) == 3
assert cumulative_receptive_field([(3, 2, 1)]) == 5

# 递增 dilation（论文配置）
layers = [(3, d, 1) for d in [1, 2, 4, 8]]
rf = cumulative_receptive_field(layers)
assert rf == 31, f"应为 31，实际 {rf}"

# 7 层
layers7 = [(3, 2**i, 1) for i in range(7)]
assert cumulative_receptive_field(layers7) == 255

# 带 stride
assert cumulative_receptive_field([(3, 1, 2)]) == 3
assert cumulative_receptive_field([(3, 1, 2), (3, 1, 1)]) == 7
`,
        answer: `def cumulative_receptive_field(layers):
    rf = 1
    stride_prod = 1
    for k, d, s in layers:
        rf += (k - 1) * d * stride_prod
        stride_prod *= s
    return rf
`,
        explanation:
          '**关键：stride 会放大后续层的贡献**。\n\n**为什么**：stride=2 意味着特征图缩小一半，后面一层的 1 个像素对应原图的 2 个像素。\n\n**例子**：\n\n    [(3,1,2), (3,1,1)]\n    第1层：rf += 2×1×1 = 3\n    第2层：rf += 2×1×2 = 7  ← stride_prod 已是 2\n\n**论文的配置**（k=3, d=2^i, s=1）：\n\n    7 层累计 = 1 + 2×(1+2+4+8+16+32+64) = 1 + 254 = 255\n\n**这就是指数增长的来源**。',
        tags: ['编程', '累积感受野'],
      },
      {
        id: 'paper-vision-c4-e7',
        type: 'code',
        difficulty: 3,
        question:
          '用 PyTorch 实现保持分辨率的空洞卷积层：\n\n- DilatedConv2d(in_ch, out_ch, kernel=3, dilation=1)\n- padding = dilation × (kernel-1) // 2\n- 前向：输出尺寸与输入相同',
        starterCode: `import torch
import torch.nn as nn

class DilatedConv2d(nn.Module):
    def __init__(self, in_ch, out_ch, kernel=3, dilation=1):
        super().__init__()
        padding = ___
        self.conv = nn.Conv2d(in_ch, out_ch, kernel, padding=padding, dilation=dilation)

    def forward(self, x):
        return ___
`,
        setupCode: '',
        expectedOutput: '空洞卷积层',
        tests: `import torch
import torch.nn as nn

# 保持尺寸
for d in [1, 2, 4, 8]:
    conv = DilatedConv2d(3, 16, 3, d)
    x = torch.randn(1, 3, 32, 32)
    out = conv(x)
    assert out.shape == (1, 16, 32, 32), f"d={d} 尺寸错误: {out.shape}"

# 参数量不变
p1 = sum(p.numel() for p in DilatedConv2d(3, 16, 3, 1).parameters())
p2 = sum(p.numel() for p in DilatedConv2d(3, 16, 3, 8).parameters())
assert p1 == p2, f"参数量应相同: {p1} vs {p2}"

# 5x5 kernel
conv5 = DilatedConv2d(3, 8, 5, 2)
x = torch.randn(1, 3, 16, 16)
assert conv5(x).shape == (1, 8, 16, 16)
`,
        answer: `import torch
import torch.nn as nn

class DilatedConv2d(nn.Module):
    def __init__(self, in_ch, out_ch, kernel=3, dilation=1):
        super().__init__()
        padding = dilation * (kernel - 1) // 2
        self.conv = nn.Conv2d(in_ch, out_ch, kernel, padding=padding, dilation=dilation)

    def forward(self, x):
        return self.conv(x)
`,
        explanation:
          '**`padding = dilation × (kernel-1) // 2`** 是保持尺寸的关键。\n\n**推导**：\n\n    输出尺寸 = (H + 2P - (k-1)×d - 1) / s + 1\n    要保持 = H，且 s=1：\n    2P = (k-1)×d\n    P = (k-1)×d / 2\n\n**例**：\n- k=3, d=1 → P=1\n- k=3, d=2 → P=2\n- k=3, d=4 → P=4\n- k=5, d=2 → P=4\n\n**注意 `//` 整除**：当 (k-1)×d 是奇数时会向下取整，可能差 1 像素。所以实际中常用偶数 kernel 或注意对齐。',
        tags: ['编程', 'DilatedConv2d'],
      },
      {
        id: 'paper-vision-c4-e8',
        type: 'code',
        difficulty: 4,
        question:
          '实现简化版 ASPP：SimpleASPP(in_ch, out_ch, dilations=(1,6,12,18))。\n\n每个 dilation 一个分支（Conv-BN-ReLU），最后 concat 后 1×1 卷积融合。\n返回输出形状正确（与输入空间尺寸相同）。',
        starterCode: `import torch
import torch.nn as nn

class SimpleASPP(nn.Module):
    def __init__(self, in_ch, out_ch=64, dilations=(1, 6, 12, 18)):
        super().__init__()
        self.branches = nn.ModuleList()
        for d in dilations:
            padding = d
            self.branches.append(
                nn.Sequential(
                    ___
                )
            )
        self.project = nn.Conv2d(out_ch * len(dilations), out_ch, 1)

    def forward(self, x):
        outs = [b(x) for b in self.branches]
        return self.project(torch.cat(outs, dim=1))
`,
        setupCode: '',
        expectedOutput: 'ASPP',
        tests: `import torch
import torch.nn as nn

aspp = SimpleASPP(32, 64)
x = torch.randn(1, 32, 24, 24)
out = aspp(x)

assert out.shape == (1, 64, 24, 24), f"形状错误: {out.shape}"
assert len(aspp.branches) == 4, "应有 4 个分支"

# 每个分支保持尺寸
for i, b in enumerate(aspp.branches):
    o = b(x)
    assert o.shape[-2:] == (24, 24), f"分支{i}尺寸错误: {o.shape}"

# 参数量
n = sum(p.numel() for p in aspp.parameters())
assert n > 0
`,
        answer: `import torch
import torch.nn as nn

class SimpleASPP(nn.Module):
    def __init__(self, in_ch, out_ch=64, dilations=(1, 6, 12, 18)):
        super().__init__()
        self.branches = nn.ModuleList()
        for d in dilations:
            padding = d
            self.branches.append(
                nn.Sequential(
                    nn.Conv2d(in_ch, out_ch, 3, padding=padding, dilation=d, bias=False),
                    nn.BatchNorm2d(out_ch),
                    nn.ReLU(inplace=True),
                )
            )
        self.project = nn.Conv2d(out_ch * len(dilations), out_ch, 1)

    def forward(self, x):
        outs = [b(x) for b in self.branches]
        return self.project(torch.cat(outs, dim=1))
`,
        explanation:
          '**`padding = d`**（对 k=3）：因为 `(3-1)×d/2 = d`，正好保持尺寸。\n\n**为什么 concat 而不是相加**：\n- concat 保留所有分支的信息，让后续卷积自己学习如何融合\n- 相加会强制假设各尺度等权\n\n**完整 ASPP 还有 GAP 分支**：\n\n    gap = AdaptiveAvgPool2d(1) → Conv1×1 → 上采样回原尺寸\n\n**GAP 提供全局上下文**——对"这是天空吗"这种需要看全图的问题很关键。\n\n**`bias=False`**：后面有 BN，bias 冗余。',
        tags: ['编程', 'ASPP'],
      },
      {
        id: 'paper-vision-c4-e9',
        type: 'judge',
        difficulty: 4,
        question: '空洞卷积可以完全替代池化层，因为它的感受野可以无限扩大。',
        answer: false,
        explanation:
          '不能完全替代。虽然感受野可以很大，但：① 计算量增加（访问更远像素）；② 网格效应；③ 小物体性能下降；④ 某些任务（如分类）下采样仍然有效（减少计算）。空洞卷积主要用于需要保分辨率的密集预测任务。',
        tags: ['局限性'],
      },
      {
        id: 'paper-vision-c4-e10',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 语义分割中"分辨率 vs 感受野"的矛盾；② 空洞卷积如何解决（含感受野公式）；③ 为什么需要递增 dilation 而非固定值；④ ASPP 如何实现多尺度聚合。',
        referenceAnswer: `**① 分辨率 vs 感受野的矛盾**

**语义分割的要求**：

| 要求 | 原因 |
| --- | --- |
| **大感受野** | 判断"这是车"需要看到整辆车 |
| **高分辨率** | 边界要精确到像素 |
| **多尺度** | 车有远有近，大小不同 |

**传统 FCN 的做法**：

    Conv → Pool(1/2) → Conv → Pool(1/4) → ... → 上采样

**矛盾**：

    要感受野 → 必须下采样（池化）
    要分辨率 → 不能下采样
    → 两者不可兼得

**池化的代价**：

- 分辨率从 H×W 降到 H/4 × W/4
- 上采样只能插值，**无法恢复丢失的细节**
- 边界模糊

---

**② 空洞卷积如何解决**

**核心**：在卷积核元素间插入空洞。

**3×3 卷积，dilation=2**：

    采样位置：
      ■ · ■ · ■
      · · · · ·
      ■ · ■ · ■
      · · · · ·
      ■ · ■ · ■

    覆盖 5×5 区域，但只有 9 个参数

**感受野公式**：

    RF = (k - 1) × d + 1

- k=3, d=1 → RF=3
- k=3, d=2 → RF=5
- k=3, d=4 → RF=9
- k=3, d=8 → RF=17

**参数量**：始终是 \`k² × C_in × C_out\`，**与 dilation 无关**。

**关键优势**：

| 方面 | FCN | 空洞卷积 |
| --- | --- | --- |
| 分辨率 | 下降后插值 | **保持** |
| 感受野 | 靠池化 | **靠 dilation** |
| 参数量 | 池化无参数 | **不变** |
| 边界精度 | 模糊 | **精确** |

---

**③ 为什么需要递增 dilation**

**问题：网格效应（Gridding）**

**连续用 d=2 三层**：

    第1层：采样位置 -2, 0, +2
    第2层：从这些位置再 ±2 → -4, -2, 0, +2, +4
    第3层：继续扩大

**但实际上**：只采样了偶数位置！

    奇数位置的信息被完全跳过
    → 输出出现"棋盘格"伪影

**用递增 dilation**：

| 层 | dilation | 采样范围 |
| --- | --- | --- |
| 1 | 1 | -1, 0, +1（连续） |
| 2 | 2 | 在此基础上 ±2 |
| 3 | 4 | ±4 |
| 4 | 8 | ±8 |

**组合效果**：

    d=1 覆盖了所有位置的"基础"
    d=2 在此基础上扩展，填补空隙
    d=4 再扩展
    → 最终覆盖**连续的**大范围

**论文验证**：

| 配置 | mIoU |
| --- | --- |
| 全部 d=2 | 较低 |
| **1,2,4,8,16,32,64** | **最高** |

**7 层感受野**：

    RF = 1 + 2×(1+2+4+8+16+32+64) = 255

**参数量**：\`7 × 9 = 63\`（每通道），而标准卷积要 127 层才能达到 255。

---

**④ ASPP 如何实现多尺度聚合**

**ASPP = Atrous Spatial Pyramid Pooling**

**结构**：

    input ──┬──> Conv d=1  ──┐
            ├──> Conv d=6  ──┤
            ├──> Conv d=12 ──┼──> Concat ──> Conv 1×1 ──> output
            ├──> Conv d=18 ──┤
            └──> GAP ────────┘

**各分支的作用**：

| 分支 | 感受野 | 捕获什么 |
| --- | --- | --- |
| d=1 | 3×3 | 细节、边缘、纹理 |
| d=6 | 13×13 | 小物体（行人、交通标志） |
| d=12 | 25×25 | 中物体（车、家具） |
| d=18 | 37×37 | 大物体（建筑、天空） |
| **GAP** | 全局 | 整体场景上下文 |

**为什么 concat 而非相加**：

- **concat**：保留所有尺度的原始信息，让后续 1×1 卷积学习如何加权融合
- **相加**：强制假设各尺度等权，且可能相互干扰

**为什么需要 GAP**：

有些判断需要全局信息：

    "这个区域是天空吗？"
    → 如果图像上部有大量蓝色，可能是天空
    → 局部感受野看不到这个信息

**GAP 提供"整张图的平均特征"**，上采样后与各分支 concat。

---

**⑤ 现代应用**

| 模型 | 用的技术 |
| --- | --- |
| **DeepLab v2/v3/v3+** | ASPP + 空洞 ResNet |
| **PSPNet** | 金字塔池化（思想类似） |
| **WaveNet** | 因果空洞卷积（音频） |
| **Tacotron 2** | 空洞卷积（语音合成） |
| **实时分割** | 空洞卷积保分辨率提速度 |

**WaveNet 的巧妙设计**：

    因果：只看过去（不能看未来）
    空洞：d=1,2,4,...,512

    感受野 = 2^10 = 1024 个采样点（约 64ms 音频）
    参数量线性增长

**这解决了音频生成的矛盾**：
音频是超长序列（每秒 16000 点），需要看很远的历史，
但 RNN 太慢，普通 CNN 感受野不够。空洞卷积正好。

---

**⑥ 一个诚实的说明**

**空洞卷积不是万能的**：

| 局限 | 说明 |
| --- | --- |
| **计算量增加** | 参数不变，但访问更远像素，内存带宽压力大 |
| **小物体** | 大 dilation 会"跳过"小物体 |
| **不能替代所有池化** | 分类任务下采样仍有价值（减少计算） |
| **需要仔细调参** | dilation 序列、层数都要实验 |

**所以实践中**：

- **密集预测（分割/深度估计）** → 用空洞卷积
- **分类** → 用标准下采样
- **音频/时序** → 用因果空洞卷积

**技术选择取决于任务需求，不是"越新越好"。**`,
        rubric: [
          { point: '矛盾：大感受野需下采样，下采样丢分辨率', score: 3 },
          { point: '空洞卷积：参数量不变，RF=(k-1)×d+1，保持分辨率', score: 2 },
          { point: '网格效应：固定 dilation 跳过像素，需递增序列', score: 2 },
          { point: 'ASPP：多 dilation 并行 + GAP，concat 保留各尺度', score: 2 },
          { point: '诚实说明：局限与适用场景，不是越新越好', score: 1 },
        ],
        keywords: ['分辨率 vs 感受野', '(k-1)×d+1', '网格效应', '递增 dilation', 'ASPP', '因果空洞'],
        explanation:
          '能说清「网格效应的成因」以及「为什么必须用递增 dilation」，就是真正理解了空洞卷积的设计细节。',
        tags: ['综合分析'],
      },
    ],
  },
];
