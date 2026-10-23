import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 训练与规模
 *  23 Variational Lossy Autoencoder (VLAE)
 *  30 Deep RL from Human Preferences (RLHF)
 *
 *  来源：
 *  - 论文：Chen et al. (2017) arXiv:1611.02731
 *  - 论文：Christiano et al. (2017) arXiv:1706.03741
 *  - 参考：Ojhaharsh/30u30 第 23/30 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 PyTorch，走本地后端执行。
 * ============================================================ */

export const paperTrainingChapters5: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c5: VLAE
   * ============================================================ */
  {
    id: 'paper-training-c5',
    title: 'VLAE：让 VAE 学会"丢信息"',
    goal: '理解 VAE 的后验坍塌问题，掌握信息瓶颈视角下"该丢什么信息"，能手写 VLAE 的架构与损失。',
    lessons: [
      {
        id: 'paper-training-c5-l1',
        title: 'VAE 的困境：模糊的生成',
        difficulty: 5,
        content: `
## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Variational Lossy Autoencoder |
| **作者** | Xi Chen, Diederik P. Kingma, Tim Salimans, Yan Duan, Prafulla Dhariwal, John Schulman, Ilya Sutskever, Pieter Abbeel |
| **发表** | ICLR 2017 |
| **arXiv** | [1611.02731](https://arxiv.org/abs/1611.02731) |
| **一句话贡献** | 用"局部感受野 + 信息瓶颈"让 VAE 学会丢弃无用信息，生成更清晰 |

## VAE 的两个问题

**VAE 的目标**（ELBO）：

    log p(x) ≥ E_q[log p(x|z)] - KL(q(z|x) || p(z))

**两个经典问题**：

### 问题 1：生成的图像模糊

**原因**：VAE 用像素级重建损失（MSE/交叉熵），倾向于"平均"多个可能的输出。

**例子**：手写数字 1 和 7 的中间态——
平均后变成模糊的一团。

### 问题 2：后验坍塌（Posterior Collapse）

**现象**：训练后 \`q(z|x) ≈ p(z)\`（后验等于先验），
**隐变量 z 完全不携带信息**。

**为什么**：
- 如果 decoder 足够强（如 PixelCNN），它能"自己"建模 x
- KL 项倾向于让 q 接近先验（简单）
- 结果：z 被忽略，退化成自回归模型

<PosteriorCollapseDemo />

**判别方法**：

    计算 KL(q(z|x) || p(z))
    如果接近 0 -> 后验坍塌

## VLAE 的核心洞察

**关键问题**：**隐变量应该编码什么信息？**

**信息瓶颈视角**：

    z 应该编码"全局的、高层的"信息
    局部细节由 decoder 自己生成

**例子**：MNIST 数字

| 信息类型 | 应该由谁编码 |
| --- | --- |
| **数字是什么**（0-9） | **z**（全局） |
| **笔画的精确位置** | decoder（局部） |
| **像素噪声** | 丢弃 |

**VLAE 的做法**：

    ① 限制 q(z|x) 的感受野 -> z 只能看到局部，被迫编码全局信息
    ② 用强 decoder（PixelCNN）-> 生成细节
    ③ 显式控制信息量 -> 避免后验坍塌

## 架构设计

### ① 限制感受野

**关键**：**q(z|x) 只用局部信息**。

    # 用小的卷积核 + 小的感受野
    encoder: Conv3×3 → Conv3×3 → ...
    # 每个 z 维度只看到 x 的一个局部区域

**为什么**：
- 如果 z 能看到全图，它可以编码任意信息
- 限制感受野后，z 只能编码"局部统计量"
- 但为了重建，z 必须编码"全局"信息（因为局部细节由 decoder 补）

**这是一个巧妙的设计**：
用"限制"来"引导"——迫使 z 学有用的东西。

<VLAEArchDemo />

### ② 强 Decoder

**用 PixelCNN 作为 decoder**：

    逐像素生成：
    p(x) = Π p(x_i | x_<i, z)

**PixelCNN 的优势**：
- 能建模复杂的局部依赖
- 给定 z（全局信息），能生成清晰的细节

**这样分工**：

    z：全局信息（数字是几）
    PixelCNN：局部细节（笔画的精确形状）

### ③ 显式控制信息量

**做法**：用 **β-VAE** 风格的 KL 权重。

    L = E_q[log p(x|z)] - β·KL(q(z|x) || p(z))

**β 的作用**：

| β | 效果 |
| --- | --- |
| 小 | 信息多，但可能坍塌 |
| **适中** | **平衡** |
| 大 | 信息少（强瓶颈），可能欠拟合 |

**VLAE 的发现**：**β 可以设为 1**（标准 VAE），
因为架构设计（限制感受野）已经解决了问题。

## 与相关工作的关系

| 工作 | 核心思想 |
| --- | --- |
| **VAE** | 变分下界 |
| **β-VAE** | 加权 KL 促进解耦 |
| **PixelCNN** | 自回归生成 |
| **VLAE** | **两者结合 + 信息瓶颈** |
| **VQ-VAE** | 离散隐变量 |

**VLAE 的位置**：
它是"VAE + 自回归"的早期成功结合。

## 实验结果

**MNIST**：

| 模型 | NLL（bits/dim） |
| --- | --- |
| VAE | ~85 |
| **VLAE** | **~80** |
| PixelCNN | ~80 |
| **VLAE + 调参** | **~78** |

**关键**：VLAE 比纯 VAE 好，接近纯 PixelCNN。

**但更重要的是**：**VLAE 的隐变量是有意义的**。

**隐变量可视化**：

    改变 z 的一个维度
    -> 生成的数字变化（如从 3 变成 8）
    -> 说明 z 编码了"数字类别"

**对比纯 VAE**：改变 z 可能什么都不变（后验坍塌）。

## 信息瓶颈的数学

**为什么限制感受野能让 z 学全局信息**：

**假设**：z 的感受野是局部区域 R。

**则**：z 只能编码 R 内的信息。

**但重建损失要求**：z 必须提供足够信息重建 x。

**矛盾**：
- 局部信息不够重建全图
- 所以 z 必须编码"能推断全局的信息"

**例子**：
- 局部区域看到"一竖"
- 可能是 1、4、7
- 为了重建正确，z 必须编码"到底是哪个"

**所以**：**限制感受野迫使 z 编码全局语义**。

## 局限

| 局限 | 说明 |
| --- | --- |
| **PixelCNN 慢** | 逐像素生成，无法并行 |
| **仅小图像** | MNIST/32×32，难扩展到高分辨率 |
| **理论不完整** | 感受野大小的选择缺乏指导 |
| **被后续超越** | VQ-VAE、扩散模型 |

**后续发展**：

| 模型 | 改进 |
| --- | --- |
| **VQ-VAE** | 离散隐变量 + 更强 decoder |
| **VQ-VAE-2** | 多尺度离散 |
| **扩散模型** | 完全不同的范式 |
| **Latent Diffusion** | 在隐空间扩散 |

## 与现代生成模型的关系

**VLAE 的思想被继承**：

| 思想 | 现代体现 |
| --- | --- |
| **信息瓶颈** | 扩散模型的隐空间 |
| **全局 vs 局部** | Latent Diffusion 的两阶段 |
| **强 decoder** | 扩散模型的 U-Net |
| **避免坍塌** | VQ-VAE 的离散化 |

**Latent Diffusion（Stable Diffusion）**：

    ① 训练自编码器（压缩到隐空间）
    ② 在隐空间训练扩散模型
    ③ 解码回像素

**这与 VLAE 的"分工"思想一致**：
- 自编码器负责"压缩"（保留重要信息）
- 生成模型负责"生成"（在隐空间建模）

## 本节来源

> **来源类型：学术来源**
> - Chen, X. et al. *Variational Lossy Autoencoder*
>   arXiv:[1611.02731](https://arxiv.org/abs/1611.02731)（ICLR 2017）
> - Kingma, D. P., Welling, M. *Auto-Encoding Variational Bayes*
>   arXiv:[1312.6114](https://arxiv.org/abs/1312.6114)（VAE）
> - Higgins, I. et al. *beta-VAE: Learning Basic Visual Concepts with a Constrained
>   Variational Framework*（ICLR 2017）
> - van den Oord, A. et al. *Conditional Image Generation with PixelCNN Decoders*
>   arXiv:[1606.05328](https://arxiv.org/abs/1606.05328)
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 23 篇（314 行，含 MaskedConv2d / GatedPixelCNNLayer / MADE / IAFBlock）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题
`,
        tips: [
          {
            kind: 'interview',
            text: '「后验坍塌」：训练后 q(z|x)≈p(z)，隐变量 z 不携带信息。判别方法：KL(q(z|x)||p(z)) 接近 0。原因：decoder 太强（能自己建模 x）+ KL 项倾向简单。',
          },
          {
            kind: 'leak',
            text: '「VLAE 如何解决」：① 限制 q(z|x) 感受野（迫使 z 编码全局信息）② 用 PixelCNN 强 decoder（生成细节）③ 显式控制 KL 权重。',
          },
          {
            kind: 'pitfall',
            text: '限制感受野不是"削弱" encoder，而是"引导"——局部信息不够重建全图，所以 z 必须编码全局语义。这是信息瓶颈的巧妙应用。',
          },
        ],
        demos: [
          {
            title: '后验坍塌检测（PyTorch）',
            lang: 'python',
            code: `import torch
import torch.nn as nn
import torch.nn.functional as F

class VAE(nn.Module):
    def __init__(self, input_dim=784, hidden=256, latent=16):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, hidden), nn.ReLU(),
        )
        self.mu = nn.Linear(hidden, latent)
        self.logvar = nn.Linear(hidden, latent)
        self.decoder = nn.Sequential(
            nn.Linear(latent, hidden), nn.ReLU(),
            nn.Linear(hidden, input_dim), nn.Sigmoid(),
        )

    def forward(self, x):
        h = self.encoder(x)
        mu = self.mu(h)
        logvar = self.logvar(h)
        return mu, logvar

    def sample(self, mu, logvar):
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def decode(self, z):
        return self.decoder(z)


def vae_loss(model, x, beta=1.0):
    mu, logvar = model(x)
    z = model.sample(mu, logvar)
    recon = model.decode(z)

    # 重建损失
    recon_loss = F.binary_cross_entropy(recon, x, reduction='sum')

    # KL 散度
    kl = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp())

    return recon_loss + beta * kl, recon_loss, kl


print("=== 训练 VAE 并检测后验坍塌 ===")
print()
torch.manual_seed(42)

# 假数据：简单的"图像"
N = 512
data = torch.rand(N, 784) > 0.7
data = data.float()

model = VAE(latent=16)
optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

for epoch in range(1, 201):
    mu, logvar = model(data)
    z = model.sample(mu, logvar)
    recon = model.decode(z)

    recon_loss = F.binary_cross_entropy(recon, data, reduction='sum') / N
    kl = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp()) / N

    loss = recon_loss + kl
    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    if epoch % 50 == 0:
        print(f"epoch {epoch:>3}: recon={recon_loss.item():.4f}, KL={kl.item():.4f}")

print()
print("=== 后验坍塌检测 ===")
print()
with torch.no_grad():
    mu, logvar = model(data)
    # 每个维度的 KL
    kl_per_dim = -0.5 * (1 + logvar - mu.pow(2) - logvar.exp()).mean(dim=0)

print("每个隐变量维度的 KL:")
for i in range(16):
    bar = "█" * int(kl_per_dim[i].item() * 20)
    status = "坍塌" if kl_per_dim[i] < 0.01 else "活跃"
    print(f"  z{i:>2}: {kl_per_dim[i].item():>7.4f} {bar} {status}")

active = (kl_per_dim > 0.01).sum().item()
print()
print(f"活跃维度: {active}/16")
print()
if active < 4:
    print("⚠️ 后验坍塌！大部分隐变量没被使用")
    print("原因：decoder 太强，或者 KL 权重太大")
else:
    print("✓ 隐变量使用正常")

print()
print("=== 后验坍塌的原因 ===")
print()
print("1. Decoder 太强（如 PixelCNN）")
print("   -> 能自己建模 x，不需要 z")
print("2. KL 项权重太大")
print("   -> 迫使 q(z|x) 接近先验 N(0,1)")
print("3. 优化困难")
print("   -> 训练早期 q 还没学到东西，KL 就把 z 压平了")
print()
print("VLAE 的解法：")
print("  · 限制 encoder 感受野（迫使 z 编码全局）")
print("  · 用 PixelCNN decoder（生成细节）")
print("  · 精心调 KL 权重")`,
          },
          {
            title: '信息瓶颈：感受野的作用',
            lang: "python",
            code: `import numpy as np

print("=== 感受野与信息瓶颈 ===")
print()
print("问题：隐变量 z 应该编码什么信息？")
print()

# 模拟：8x8 的图像，隐变量看到不同大小的感受野
IMG_SIZE = 8

def receptive_field_mask(rf_size, position=(4, 4)):
    """生成感受野掩码。"""
    mask = np.zeros((IMG_SIZE, IMG_SIZE))
    half = rf_size // 2
    r, c = position
    r0, r1 = max(0, r - half), min(IMG_SIZE, r + half + 1)
    c0, c1 = max(0, c - half), min(IMG_SIZE, c + half + 1)
    mask[r0:r1, c0:c1] = 1
    return mask


print("感受野大小 vs 能编码的信息：")
print()
print(f"{'感受野':>8} | {'覆盖像素':>8} | {'能编码什么'}")
print("-" * 50)

for rf in [1, 3, 5, 7, 8]:
    mask = receptive_field_mask(rf)
    covered = int(mask.sum())
    if rf <= 1:
        info = "单个像素（噪声）"
    elif rf <= 3:
        info = "局部边缘"
    elif rf <= 5:
        info = "局部形状"
    elif rf <= 7:
        info = "半个数字"
    else:
        info = "全局信息（数字类别）"
    print(f"{rf:>8} | {covered:>8} | {info}")

print()
print("=== VLAE 的关键洞察 ===")
print()
print("如果感受野大（能看到全图）：")
print("  z 可以编码任意信息 -> 容易坍塌（编码局部细节）")
print()
print("如果感受野小（只能看局部）：")
print("  局部信息不够重建全图")
print("  -> z 必须编码'全局语义'（能推断整体）")
print()
print("例子：")
print("  局部看到'一竖' -> 可能是 1、4、7、9")
print("  为了重建正确，z 必须编码'到底是哪个'")
print("  -> z 自动学到数字类别！")

print()
print("=== 可视化：不同感受野的掩码 ===")
print()
for rf in [1, 3, 5]:
    mask = receptive_field_mask(rf)
    print(f"感受野 {rf}×{rf}:")
    for row in mask:
        print("  " + "".join("■" if v else "·" for v in row))
    print()

print("=== 信息瓶颈的数学 ===")
print()
print("互信息 I(x; z) 衡量 z 包含多少 x 的信息。")
print()
print("理想情况：")
print("  I(x; z) = '重建所需的最小信息量'")
print("  太多 -> z 编码了细节（浪费）")
print("  太少 -> 重建不了")
print()
print("VLAE 通过架构（感受野）隐式控制 I(x;z)：")
print("  感受野小 -> z 能获取的信息上限低")
print("  -> 迫使 z 只编码最有价值的信息（全局语义）")
print()
print("这比显式的 KL 权重（beta-VAE）更优雅：")
print("  beta-VAE: 用权重惩罚 KL")
print("  VLAE:     用架构限制信息流")
print()
print("类比：")
print("  beta-VAE: 用罚款限制超速")
print("  VLAE:     把路修窄（自然开不快）")`,
          },
          {
            title: 'PixelCNN 作为 Decoder',
            lang: "python",
            code: `import torch
import torch.nn as nn

class MaskedConv2d(nn.Conv2d):
    """
    掩码卷积：PixelCNN 的核心。

    type A: 不包含中心像素（用于第一层）
    type B: 包含中心像素（用于后续层）
    """
    def __init__(self, mask_type, *args, **kwargs):
        super().__init__(*args, **kwargs)
        assert mask_type in ('A', 'B')
        self.register_buffer('mask', self.weight.data.clone())
        _, _, kH, kW = self.weight.size()
        self.mask.fill_(1)
        self.mask[:, :, kH // 2, kW // 2 + (mask_type == 'B'):] = 0
        self.mask[:, :, kH // 2 + 1:] = 0

    def forward(self, x):
        self.weight.data *= self.mask
        return super().forward(x)


class PixelCNN(nn.Module):
    """简化的 PixelCNN（用于条件生成）。"""
    def __init__(self, in_ch=1, hidden=32, n_layers=4, n_classes=256):
        super().__init__()
        layers = [MaskedConv2d('A', in_ch, hidden, 7, padding=3)]
        for _ in range(n_layers - 1):
            layers.append(MaskedConv2d('B', hidden, hidden, 3, padding=1))
            layers.append(nn.ReLU())
        layers.append(nn.Conv2d(hidden, n_classes, 1))
        self.net = nn.Sequential(*layers)

    def forward(self, x):
        return self.net(x)


print("=== PixelCNN 的因果性 ===")
print()
print("核心：每个像素只能看到'之前'的像素")
print()

# 演示掩码
conv_a = MaskedConv2d('A', 1, 1, 3, padding=1)
conv_b = MaskedConv2d('B', 1, 1, 3, padding=1)

print("Type A 掩码（不含中心）:")
print(conv_a.mask[0, 0].numpy().astype(int))
print()
print("Type B 掩码（含中心）:")
print(conv_b.mask[0, 0].numpy().astype(int))
print()
print("1 = 可见，0 = 屏蔽")
print()
print("这保证了：生成像素 (i,j) 时，只能看到它之前（上方 + 同行左侧）的像素")

print()
print("=== 为什么 PixelCNN 适合做 VAE 的 decoder ===")
print()
print("VAE 分工：")
print("  · z 提供全局信息（如'数字是 3'）")
print("  · decoder 生成细节（如'3 的具体笔画'）")
print()
print("PixelCNN 擅长：")
print("  · 逐像素建模复杂依赖")
print("  · 给定全局条件（z），生成清晰细节")
print()
print("所以：")
print("  p(x|z) = PixelCNN(x, condition=z)")
print("  能生成比 MLP decoder 清晰得多的图像")

print()
print("=== 前向形状 ===")
torch.manual_seed(0)
pcnn = PixelCNN(in_ch=1, hidden=16, n_layers=2, n_classes=4)
x = torch.randn(2, 1, 8, 8)
out = pcnn(x)
print(f"输入: {tuple(x.shape)}")
print(f"输出: {tuple(out.shape)}  (每像素 4 类概率)")

print()
print("=== VLAE 的完整架构 ===")
print()
print("1. Encoder（小感受野）-> q(z|x)")
print("2. 采样 z ~ q(z|x)")
print("3. Decoder（PixelCNN）-> p(x|z)")
print("4. 损失 = -log p(x|z) + KL(q(z|x)||p(z))")
print()
print("关键：")
print("  · 小感受野迫使 z 学全局")
print("  · PixelCNN 补细节")
print("  · 两者分工，生成清晰")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-training-c5-e1',
        type: 'single',
        difficulty: 2,
        question: 'VAE 的"后验坍塌"（posterior collapse）是指？',
        options: [
          { value: 'A', text: 'decoder 训练失败' },
          { value: 'B', text: '训练后 q(z|x) ≈ p(z)，隐变量不携带任何信息' },
          { value: 'C', text: '生成图像模糊' },
          { value: 'D', text: '损失函数不收敛' },
        ],
        answer: 'B',
        explanation:
          '后验坍塌时 KL(q(z|x)||p(z)) ≈ 0，z 完全被忽略，模型退化成自回归模型。原因通常是 decoder 太强（能自己建模 x）或 KL 权重太大。',
        tags: ['后验坍塌'],
      },
      {
        id: 'paper-training-c5-e2',
        type: 'judge',
        difficulty: 2,
        question: 'VLAE 通过限制 encoder 的感受野，迫使隐变量 z 编码全局信息。',
        answer: true,
        explanation:
          '感受野小 -> z 只能看到局部。但重建全图需要全局信息，所以 z 必须编码"能推断全局"的语义（如数字类别）。这是信息瓶颈的巧妙应用。',
        tags: ['感受野'],
      },
      {
        id: 'paper-training-c5-e3',
        type: 'multiple',
        difficulty: 3,
        question: 'VLAE 解决后验坍塌的手段包括？（多选）',
        options: [
          { value: 'A', text: '限制 q(z|x) 的感受野' },
          { value: 'B', text: '用 PixelCNN 等强 decoder 生成细节' },
          { value: 'C', text: '显式控制 KL 权重' },
          { value: 'D', text: '去掉隐变量' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——去掉隐变量就变成纯自回归模型，不是 VAE 了。A/B/C 是 VLAE 的三个手段，其中限制感受野是核心创新。',
        tags: ['解决方法'],
      },
      {
        id: 'paper-training-c5-e4',
        type: 'fill',
        difficulty: 3,
        question:
          'VLAE 用 ___ 作为 decoder，它能逐像素建模复杂依赖，生成清晰细节。',
        blanks: [['PixelCNN', 'pixelcnn', '自回归模型']],
        explanation:
          'PixelCNN 用掩码卷积保证因果性（每个像素只能看之前的像素）。给定 z（全局信息），它能生成清晰的局部细节。',
        tags: ['PixelCNN'],
      },
      {
        id: 'paper-training-c5-e5',
        type: 'code',
        difficulty: 2,
        question:
          '计算 VAE 的 KL 散度：kl_divergence(mu, logvar)。\n\nKL(N(mu,σ²) || N(0,1)) = -0.5·Σ(1 + logvar - mu² - exp(logvar))',
        starterCode: `import numpy as np

def kl_divergence(mu, logvar):
    mu = np.asarray(mu, dtype=float)
    logvar = np.asarray(logvar, dtype=float)
    return ___
`,
        setupCode: '',
        expectedOutput: 'KL 散度',
        tests: `import numpy as np

# 标准正态对自身：KL=0
assert abs(kl_divergence(np.zeros(4), np.zeros(4))) < 1e-9

# mu 偏离 0
kl1 = kl_divergence(np.ones(4), np.zeros(4))
assert abs(kl1 - 2.0) < 1e-9, f"应为 2，实际 {kl1}"

# logvar > 0（方差大）
kl2 = kl_divergence(np.zeros(4), np.ones(4))
assert kl2 > 0

# logvar < 0（方差小）
kl3 = kl_divergence(np.zeros(4), -np.ones(4))
assert kl3 > 0

# 单维度
assert abs(kl_divergence([0.0], [0.0])) < 1e-9
assert abs(kl_divergence([1.0], [0.0]) - 0.5) < 1e-9
`,
        answer: `import numpy as np

def kl_divergence(mu, logvar):
    mu = np.asarray(mu, dtype=float)
    logvar = np.asarray(logvar, dtype=float)
    return -0.5 * np.sum(1 + logvar - mu**2 - np.exp(logvar))
`,
        explanation:
          '**公式推导**：\n\n    KL(N(μ,σ²) || N(0,1))\n    = ∫ q(z) log(q(z)/p(z)) dz\n    = 0.5(μ² + σ² - 1 - 2log σ)\n    = -0.5(1 + log σ² - μ² - σ²)\n    = -0.5(1 + logvar - μ² - exp(logvar))\n\n**三项的含义**：\n\n| 项 | 含义 |\n| --- | --- |\n| `μ²` | 均值偏离 0 的代价 |\n| `exp(logvar)` = σ² | 方差偏离 1 的代价 |\n| `-logvar` | σ 太小（太确定）的代价 |\n\n**为什么用 logvar 而非 σ**：\n保证 σ > 0（exp 恒正），数值更稳定。\n\n**后验坍塌的判据**：\n如果这个 KL 接近 0，说明 q(z|x) ≈ N(0,1)，z 不携带信息。',
        tags: ['编程', 'KL 散度'],
      },
      {
        id: 'paper-training-c5-e6',
        type: 'code',
        difficulty: 3,
        question:
          '实现重参数化采样：reparameterize(mu, logvar, seed=None)。\n\nz = μ + σ·ε，其中 σ=exp(logvar/2)，ε~N(0,1)',
        starterCode: `import numpy as np

def reparameterize(mu, logvar, seed=None):
    rng = np.random.default_rng(seed)
    mu = np.asarray(mu, dtype=float)
    logvar = np.asarray(logvar, dtype=float)
    std = ___
    eps = ___
    return ___
`,
        setupCode: '',
        expectedOutput: '采样结果',
        tests: `import numpy as np

mu = np.zeros(1000)
logvar = np.zeros(1000)   # sigma=1

z = reparameterize(mu, logvar, seed=0)
assert z.shape == (1000,)
assert abs(z.mean()) < 0.15, f"均值应约 0，实际 {z.mean()}"
assert abs(z.std() - 1.0) < 0.15, f"标准差应约 1，实际 {z.std()}"

# 方差小时采样更集中
z2 = reparameterize(np.zeros(1000), np.full(1000, -4.0), seed=0)  # sigma=0.135
assert z2.std() < 0.3

# 均值偏移
z3 = reparameterize(np.full(1000, 5.0), np.zeros(1000), seed=0)
assert abs(z3.mean() - 5.0) < 0.2

# 确定性
z4 = reparameterize(mu[:5], logvar[:5], seed=42)
z5 = reparameterize(mu[:5], logvar[:5], seed=42)
assert np.allclose(z4, z5)
`,
        answer: `import numpy as np

def reparameterize(mu, logvar, seed=None):
    rng = np.random.default_rng(seed)
    mu = np.asarray(mu, dtype=float)
    logvar = np.asarray(logvar, dtype=float)
    std = np.exp(0.5 * logvar)
    eps = rng.normal(0, 1, mu.shape)
    return mu + std * eps
`,
        explanation:
          '**重参数化技巧**：\n\n    z = μ + σ·ε,  ε ~ N(0,1)\n\n**为什么重要**：\n\n直接采样 `z ~ N(μ,σ²)` 不可导（采样是随机操作）。\n重参数化把随机性转移到 ε，\n这样 z 对 μ 和 σ 可导。\n\n**`np.exp(0.5 * logvar)`**：\n\n    σ = exp(logvar/2) = sqrt(exp(logvar)) = sqrt(σ²)\n\n**梯度**：\n\n    ∂z/∂μ = 1\n    ∂z/∂logvar = 0.5·σ·ε\n\n两者都存在 -> 可以反向传播。\n\n**这就是 VAE 能端到端训练的关键。**',
        tags: ['编程', '重参数化'],
      },
      {
        id: 'paper-training-c5-e7',
        type: 'code',
        difficulty: 3,
        question:
          '检测后验坍塌：detect_posterior_collapse(mu, logvar, threshold=0.01)。\n\n- mu, logvar: (N, latent_dim)\n- 计算每个维度的平均 KL\n- 返回 (active_dims, kl_per_dim)\n  - active_dims: KL > threshold 的维度数',
        starterCode: `import numpy as np

def detect_posterior_collapse(mu, logvar, threshold=0.01):
    mu = np.asarray(mu, dtype=float)
    logvar = np.asarray(logvar, dtype=float)
    kl_per_dim = ___
    active = ___
    return active, kl_per_dim
`,
        setupCode: '',
        expectedOutput: '(活跃维度数, 每维KL)',
        tests: `import numpy as np

# 全部活跃（mu 明显偏离 0）
mu = np.random.randn(100, 8) * 2
logvar = np.zeros((100, 8))
active, kl = detect_posterior_collapse(mu, logvar)
assert active == 8, f"应全部活跃，实际 {active}"
assert kl.shape == (8,)

# 全部坍塌（mu=0, logvar=0 -> KL=0）
mu2 = np.zeros((100, 8))
logvar2 = np.zeros((100, 8))
active2, kl2 = detect_posterior_collapse(mu2, logvar2)
assert active2 == 0, f"应全部坍塌，实际 {active2}"
assert np.allclose(kl2, 0)

# 部分活跃
mu3 = np.zeros((100, 8))
mu3[:, :3] = 2.0   # 前3维活跃
logvar3 = np.zeros((100, 8))
active3, kl3 = detect_posterior_collapse(mu3, logvar3)
assert active3 == 3, f"应3个活跃，实际 {active3}"
`,
        answer: `import numpy as np

def detect_posterior_collapse(mu, logvar, threshold=0.01):
    mu = np.asarray(mu, dtype=float)
    logvar = np.asarray(logvar, dtype=float)
    kl_per_dim = -0.5 * np.mean(1 + logvar - mu**2 - np.exp(logvar), axis=0)
    active = int(np.sum(kl_per_dim > threshold))
    return active, kl_per_dim
`,
        explanation:
          '**`axis=0`**：对样本维度求平均，得到每个隐变量维度的 KL。\n\n**为什么要按维度看**：\n后验坍塌通常是"部分坍塌"——\n有些维度活跃，有些被浪费。\n\n**典型情况**（latent_dim=16）：\n\n    活跃: 3-5 个\n    坍塌: 11-13 个\n\n**改进方法**：\n\n| 方法 | 原理 |\n| --- | --- |\n| **KL annealing** | 逐步增大 KL 权重 |\n| **free bits** | 每个维度至少保留一定 KL |\n| **限制感受野** | VLAE 的做法 |\n| **离散化** | VQ-VAE |\n\n**VLAE 的洞察**：\n与其事后修补，不如从架构上"迫使"z 有用。',
        tags: ['编程', '坍塌检测'],
      },
      {
        id: 'paper-training-c5-e8',
        type: 'code',
        difficulty: 4,
        question:
          '用 PyTorch 实现 VLAE 风格的分工：\n\n- LocalEncoder: 小感受野（3×3 卷积，2 层），输出 mu/logvar\n- PixelCNNDecoder: 简化的逐像素生成（用全连接近似）\n\n返回 (mu, logvar, recon)',
        starterCode: `import torch
import torch.nn as nn
import torch.nn.functional as F

class VLAE(nn.Module):
    def __init__(self, img_size=8, latent=8, hidden=64):
        super().__init__()
        self.img_size = img_size
        self.latent = latent

        # 小感受野 encoder（3x3 卷积，只有 2 层 -> 感受野 5x5）
        self.encoder = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1), nn.ReLU(),
            nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
        )
        self.mu = nn.Linear(32, latent)
        self.logvar = nn.Linear(32, latent)

        # Decoder（给定 z 生成全图）
        self.decoder = nn.Sequential(
            nn.Linear(latent, hidden), nn.ReLU(),
            nn.Linear(hidden, img_size * img_size), nn.Sigmoid(),
        )

    def forward(self, x):
        # x: (B, 1, H, W)
        h = self.encoder(x)
        mu = ___
        logvar = ___
        z = ___
        recon = ___
        return mu, logvar, recon
`,
        setupCode: '',
        expectedOutput: 'VLAE 前向',
        tests: `import torch
import torch.nn as nn

torch.manual_seed(0)
model = VLAE(img_size=8, latent=8, hidden=32)
x = torch.randn(4, 1, 8, 8).sigmoid()

mu, logvar, recon = model(x)
assert mu.shape == (4, 8), f"mu 形状错误: {mu.shape}"
assert logvar.shape == (4, 8)
assert recon.shape == (4, 64), f"recon 形状错误: {recon.shape}"
assert (recon >= 0).all() and (recon <= 1).all(), "重建应在 [0,1]"

# 梯度
mu.sum().backward()
assert model.mu.weight.grad is not None

# 感受野检查：encoder 只有 2 层 3x3，感受野 5x5 < 8x8
print("感受野: 2 层 3x3 -> 5x5 < 8x8（限制成功）")
`,
        answer: `import torch
import torch.nn as nn
import torch.nn.functional as F

class VLAE(nn.Module):
    def __init__(self, img_size=8, latent=8, hidden=64):
        super().__init__()
        self.img_size = img_size
        self.latent = latent

        self.encoder = nn.Sequential(
            nn.Conv2d(1, 16, 3, padding=1), nn.ReLU(),
            nn.Conv2d(16, 32, 3, padding=1), nn.ReLU(),
            nn.AdaptiveAvgPool2d(1),
            nn.Flatten(),
        )
        self.mu = nn.Linear(32, latent)
        self.logvar = nn.Linear(32, latent)

        self.decoder = nn.Sequential(
            nn.Linear(latent, hidden), nn.ReLU(),
            nn.Linear(hidden, img_size * img_size), nn.Sigmoid(),
        )

    def forward(self, x):
        h = self.encoder(x)
        mu = self.mu(h)
        logvar = self.logvar(h)
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        z = mu + std * eps
        recon = self.decoder(z)
        return mu, logvar, recon
`,
        explanation:
          '**三个关键点**：\n\n**① 感受野限制**：\n\n    2 层 3×3 卷积 -> 感受野 = 1 + 2×2 = 5\n    小于 8×8 的输入 -> 限制成功\n\n**② 重参数化**：\n\n    z = mu + exp(0.5*logvar) * eps\n\n**③ Decoder 生成全图**：\n\n    输入 z（全局信息）-> 输出整张图\n\n**真实 VLAE 用 PixelCNN**：\n这里用全连接近似（因为 PixelCNN 需要掩码卷积，代码较长）。\n\n**分工的效果**：\n- encoder 感受野小 -> z 只能编码"局部统计量"\n- 但重建需要全局 -> z 必须编码"全局语义"\n- decoder 补细节\n\n**注意**：`AdaptiveAvgPool2d(1)` 会聚合全局信息，\n严格说削弱了"限制感受野"的效果。真实实现用**局部池化**或**小步长**。',
        tags: ['编程', 'VLAE'],
      },
      {
        id: 'paper-training-c5-e9',
        type: 'judge',
        difficulty: 4,
        question: 'VLAE 通过削弱 encoder 的能力来解决后验坍塌。',
        answer: false,
        explanation:
          '不是"削弱"而是"引导"。限制感受野让 z 只能看到局部，但重建全图需要全局信息——所以 z 被迫编码"能推断全局的语义"。这是信息瓶颈的巧妙应用，不是简单削弱。',
        tags: ['设计意图'],
      },
      {
        id: 'paper-training-c5-e10',
        type: 'open',
        difficulty: 5,
        question:
          '请解释：① 后验坍塌的成因与检测；② VLAE 如何用感受野引导 z 学全局信息；③ PixelCNN decoder 的作用；④ VLAE 与 Latent Diffusion 的关系。',
        referenceAnswer: `**① 后验坍塌的成因与检测**

**现象**：

训练后 \`q(z|x) ≈ p(z) = N(0,1)\`，
z 完全不携带 x 的信息。

**表现**：
- KL(q(z|x)||p(z)) ≈ 0
- 改变 z，生成结果不变
- 模型退化成自回归模型（只用 p(x)）

**成因**：

| 原因 | 说明 |
| --- | --- |
| **decoder 太强** | 如 PixelCNN 能自己建模 x，不需要 z |
| **KL 权重太大** | 迫使 q 接近先验 |
| **优化困难** | 训练早期 KL 就把 z 压平了 |
| **隐变量太多** | 部分维度被浪费 |

**检测**：

    kl_per_dim = -0.5·mean(1 + logvar - mu² - exp(logvar))
    
    如果大部分维度 KL < 0.01 -> 坍塌

**典型情况**（latent_dim=16）：

    活跃: 3-5 维
    坍塌: 11-13 维

**这是"部分坍塌"**——不是全坍塌，而是大部分维度被浪费。

---

**② VLAE 如何用感受野引导 z**

**核心洞察**：

> **不限制 z 能看到什么，它就会编码"容易编码"的东西（局部细节）；
> 限制感受野，它就不得不编码"必须编码"的东西（全局语义）。**

**推导**：

**假设**：z 的感受野是 5×5（图像 28×28）。

**则**：z 只能看到 5×5 的区域。

**但重建损失要求**：z 提供足够信息重建整张 28×28 图。

**矛盾**：
5×5 的局部信息不足以重建 28×28 全图。

**所以**：z 必须编码"能推断全局的信息"。

**例子**（MNIST）：

    局部 5×5 看到"一竖"
    可能是 1、4、7、9
    为了重建正确，z 必须编码"到底是哪个数字"
    -> z 自动学到数字类别！

**这就是信息瓶颈的巧妙应用**：

| 做法 | 效果 |
| --- | --- |
| **不限制** | z 编码局部细节（易学但无用） |
| **限制感受野** | z 编码全局语义（难学但有用） |

**类比**：
- 给一个人看整张图，他可能只描述"有个黑点"
- 给他看一个小窗口，他必须推断"这是什么数字"

---

**③ PixelCNN decoder 的作用**

**问题**：
限制 z 后，z 只有全局信息（如"数字是 3"）。
那**局部细节**（3 的具体笔画）谁来生成？

**答案**：**强 decoder**。

**PixelCNN**：

    p(x|z) = Π_i p(x_i | x_<i, z)

**优势**：

| 方面 | MLP decoder | PixelCNN |
| --- | --- | --- |
| 局部建模 | 弱 | **强** |
| 生成质量 | 模糊 | **清晰** |
| 速度 | 快 | **慢**（逐像素） |

**分工**：

    z（全局）："这是数字 3"
    PixelCNN（局部）："3 的笔画长这样"

**这就是 VLAE 的核心设计**：

    弱 encoder（小感受野）+ 强 decoder（PixelCNN）
    -> z 被迫编码全局，decoder 补细节

---

**④ VLAE 与 Latent Diffusion 的关系**

**Latent Diffusion（Stable Diffusion）**：

    ① 训练自编码器：x -> z（压缩）
    ② 在 z 空间训练扩散模型
    ③ 解码：z -> x

**与 VLAE 的共同思想**：

| 思想 | VLAE | Latent Diffusion |
| --- | --- | --- |
| **两阶段** | encoder + decoder | VAE + 扩散 |
| **隐空间** | z（全局信息） | z（压缩表示） |
| **分工** | z 管全局，decoder 管细节 | z 管语义，decoder 管像素 |

**关键差异**：

| 方面 | VLAE | Latent Diffusion |
| --- | --- | --- |
| **生成模型** | PixelCNN（自回归） | 扩散 |
| **隐空间** | 连续（VAE） | 连续（VAE） |
| **压缩率** | 低 | **高**（8×8 下采样） |
| **分辨率** | 小（28×28） | **大**（1024×1024） |

**继承的核心思想**：

> **生成模型不需要直接在像素上工作——
> 在压缩的隐空间工作更高效。**

**Latent Diffusion 的改进**：
- 用更强的自编码器（KL 正则 + 感知损失）
- 用扩散替代 PixelCNN（并行、质量更高）

**历史脉络**：

    2014 VAE           -> 变分下界
    2016 PixelCNN      -> 自回归生成
    2017 VLAE          -> 两者结合 + 信息瓶颈
    2017 VQ-VAE        -> 离散隐变量
    2021 Latent Diff.  -> 隐空间扩散
    2022 Stable Diff.  -> 大规模应用

**VLAE 是"隐空间生成"的先驱之一。**

---

**⑤ 一个诚实的评价**

**VLAE 的贡献**：

| 方面 | 说明 |
| --- | --- |
| **洞察** | 用感受野引导信息流向 |
| **效果** | MNIST NLL 从 85 降到 78 |
| **理论** | 信息瓶颈的实践 |
| **启发** | 隐空间生成的两阶段思路 |

**局限**：

| 局限 | 说明 |
| --- | --- |
| **PixelCNN 慢** | 无法并行生成 |
| **仅小图像** | 难以扩展 |
| **感受野难调** | 缺乏理论指导 |
| **被超越** | VQ-VAE、扩散模型 |

**但它的思想仍然有效**：

> **"该编码什么"比"如何编码"更重要。**

这个洞察在：
- 对比学习（什么该被表征）
- 扩散模型的隐空间
- 大模型的表示学习

中都有体现。

**VLAE 不是"最好的模型"，但它提出了一个好问题。**`,
        rubric: [
          { point: '后验坍塌：q(z|x)≈p(z)，KL≈0，decoder 太强/KL 太大', score: 3 },
          { point: '限制感受野 -> 局部不够重建 -> z 被迫编码全局语义', score: 3 },
          { point: 'PixelCNN decoder 补局部细节，形成"弱encoder+强decoder"分工', score: 2 },
          { point: 'Latent Diffusion 继承"隐空间生成"思想，改进是扩散替代 PixelCNN', score: 1 },
          { point: '诚实评价：思想有效但模型被超越', score: 1 },
        ],
        keywords: ['q(z|x)≈p(z)', '局部不够重建', '弱encoder强decoder', '隐空间生成', '该编码什么'],
        explanation:
          '能说清「限制感受野不是削弱而是引导」以及「Latent Diffusion 继承了隐空间生成的思想」，就是理解了 VLAE 的定位。',
        tags: ['综合分析'],
      },
    ],
  },
];
