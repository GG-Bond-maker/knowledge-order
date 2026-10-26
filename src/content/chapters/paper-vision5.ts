import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 视觉架构
 *  28 CS231n: Convolutional Neural Networks for Visual Recognition
 *
 *  来源：
 *  - 课程：Stanford CS231n Course Notes（Karpathy, Li, Johnson）
 *  - 参考：Ojhaharsh/30u30 第 28 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：本章代码需要 numpy（卷积实现），走浏览器内执行。
 * ============================================================ */

export const paperVisionChapters5: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c5: CS231n
   * ============================================================ */
  {
    id: 'paper-vision-c5',
    title: 'CS231n：卷积网络的"第一性原理"',
    goal: '从零理解卷积的数学本质、im2col 加速、池化与感受野，能手写卷积前向/反向并计算输出尺寸。',
    lessons: [
      {
        id: 'paper-vision-c5-l1',
        title: '卷积：从滑窗到矩阵乘',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 手推输出尺寸与参数量公式，解释「参数量与输入尺寸无关」的参数共享含义；
2. 手写朴素卷积并用 im2col 验证一致性，说明卷积→GEMM 的加速来源与内存代价；
3. 计算多层堆叠的感受野（stride 放大后续层贡献），并说出卷积反向=转置卷积。

### 前置知识

- 矩阵乘法与张量切片；
- 反向传播链式法则；
- c1 的 AlexNet 逐层推导。

### 问题背景

论文告诉你「用 3×3 卷积」，CS231n 告诉你卷积到底是什么、输出多大、参数几个、怎么算快、梯度怎么传。第一性原理式的拆解让你不依赖框架魔法：手推输出尺寸公式、理解参数共享（参数量与输入尺寸无关）、看清 im2col 把卷积变成 GEMM 的工程本质（快 10-100 倍的来源）、以及「卷积的反向也是卷积」。这是读一切视觉论文前的工具课。

### 直觉理解

卷积是个「盖章工人」：拿着同一枚印章（参数共享）在图的每个位置盖一下（滑窗）。im2col 是「备料台」：把每个待盖位置裁成小片摆成一摞（矩阵的列），盖章变成一次大盖章（矩阵乘法）——批量交给 BLAS 流水线，速度天差地别。

### 核心概念与原理详解

## 课程信息

| 项目 | 内容 |
| --- | --- |
| **课程** | Stanford CS231n: Convolutional Neural Networks for Visual Recognition |
| **讲师** | Andrej Karpathy, Fei-Fei Li, Justin Johnson |
| **出处** | https://cs231n.github.io/ |
| **一句话贡献** | 把 CNN 的每个细节讲透——从卷积的数学定义到反向传播的每个梯度 |

## 为什么读 CS231n

**论文告诉你"是什么"，CS231n 告诉你"怎么做"。**

**例子**：卷积

**论文说**：

    用 3×3 卷积提取特征

**CS231n 会说**：

    ① 卷积的数学定义（互相关）
    ② 输出尺寸怎么算
    ③ 参数量怎么算
    ④ 如何用 im2col 加速
    ⑤ 反向传播的梯度是什么

**这就是"第一性原理"式的讲解。**

## 卷积的数学定义

**离散互相关**（深度学习中的"卷积"实际是互相关）：

    out[i,j] = Σ_{m,n} x[i+m, j+n] · w[m,n] + b

**注意**：数学上的卷积要翻转卷积核，但深度学习不翻转——**因为核是学出来的**，翻不翻转等价。

**例子**（3×3 核，1 通道）：

    输入 x:
      1 2 3
      4 5 6
      7 8 9
    
    核 w:
      1 0 0
      0 1 0
      0 0 1
    
    输出（无 padding，stride=1）:
      out[0,0] = 1·1 + 2·0 + 3·0 + 4·0 + 5·1 + 6·0 + 7·0 + 8·0 + 9·1
               = 1 + 5 + 9 = 15

<ConvDemo />

## 输出尺寸公式

**核心公式**：

    H_out = floor((H_in + 2·pad - kernel) / stride) + 1
    W_out = floor((W_in + 2·pad - kernel) / stride) + 1

**例子**：

| 输入 | kernel | pad | stride | 输出 |
| --- | --- | --- | --- | --- |
| 32 | 3 | 1 | 1 | 32（same）|
| 32 | 3 | 0 | 1 | 30（valid）|
| 32 | 3 | 1 | 2 | 16（下采样）|
| 224 | 7 | 3 | 2 | 112（ResNet stem）|

**"same" padding 的规则**：

    pad = (kernel - 1) / 2

**要求**：kernel 是奇数（这样才有中心）。

<OutputSizeDemo />

## 参数量计算

**公式**：

    params = (kernel_h × kernel_w × C_in + 1) × C_out

**+1 是 bias**。

**例子**：

| 层 | 配置 | 参数量 |
| --- | --- | --- |
| Conv 3×3, 3→64 | (3·3·3+1)·64 | 1,792 |
| Conv 3×3, 64→128 | (3·3·64+1)·128 | 73,856 |
| Conv 1×1, 256→64 | (1·1·256+1)·64 | 16,448 |

**关键洞察**：**参数量与输入尺寸无关**！

    输入 32×32 或 224×224
    只要通道数相同，参数量相同

**这就是 CNN 的"参数共享"**——同一个核在整张图上滑动。

<ParamCountDemo />

## im2col：卷积加速的关键

**问题**：朴素卷积用 4 重循环（输出 H、W、C_out，加上 kernel 的 H、W、C_in），极慢。

**解法**：**把卷积变成矩阵乘法**。

**im2col 的做法**：

    ① 把每个卷积窗口"展开"成一列
    ② 所有列拼成矩阵
    ③ 与展平的卷积核做矩阵乘

**图示**：

    输入 (C, H, W)
      ↓ im2col
    矩阵 (C·k·k, H_out·W_out)
      ↓ @ 卷积核 (C_out, C·k·k)
    输出 (C_out, H_out·W_out)
      ↓ reshape
    输出 (C_out, H_out, W_out)

**优势**：

| 方法 | 复杂度 | 实际速度 |
| --- | --- | --- |
| 朴素循环 | O(H_out·W_out·C_out·k²·C_in) | 慢 |
| **im2col + GEMM** | 同样复杂度，但**用 BLAS** | **快 10~100 倍** |

**关键**：矩阵乘法有高度优化的库（cuBLAS、MKL）。

<Im2colDemo />

**代价**：**内存**。im2col 会复制 k² 倍的数据。

**实际框架的做法**：
- 小 kernel：用 im2col（内存可接受）
- 大 kernel：用 FFT 或 Winograd

## 池化

**作用**：下采样，减少计算量，增加感受野。

**Max Pooling**（2×2，stride 2）：

    1 3 | 2 4
    5 6 | 7 8
    ----+----
    9 1 | 2 3
    4 5 | 6 7
    
    -> 6 8
       9 7

**公式**：每个 2×2 块取最大值。

**Average Pooling**：取平均。

**对比**：

| 类型 | 特点 |
| --- | --- |
| **Max** | 保留最强特征（常用）|
| **Avg** | 保留整体强度（GlobalAvgPool 常用）|

**现代趋势**：
- 小模型：MaxPool 常用
- 大模型（ResNet+）：**用 stride=2 卷积替代池化**
- 分类头：GlobalAvgPool（把 H×W 压成 1×1）

## 感受野

**定义**：输出中一个像素"看到"的输入区域大小。

**公式**（逐层累积）：

    RF_{l} = RF_{l-1} + (k_l - 1) × Π_{i<l} s_i

**例子**（3 层 3×3，stride 1）：

| 层 | 单层增量 | 累计 RF |
| --- | --- | --- |
| 1 | 2 | 3 |
| 2 | 2 | 5 |
| 3 | 2 | 7 |

**如果加 stride**：

| 层 | k | s | 累计 RF |
| --- | --- | --- | --- |
| 1 | 3 | 2 | 3 |
| 2 | 3 | 2 | 7 |
| 3 | 3 | 2 | 15 |

**关键**：**stride 会放大后续层的贡献**。

<ReceptiveFieldDemo2 />

## 反向传播的梯度

**卷积的反向**（对输入）：

    dx = conv_transpose(dout, w)

**对权重**：

    dw = conv(x, dout)   # 注意维度

**关键**：**卷积的反向也是卷积**（转置卷积）。

**这就是为什么 GPU 上卷积高效**——
前向和反向都是同一种操作。

## 一个常被忽略的细节

**1×1 卷积不是"没用"**：

| 用途 | 说明 |
| --- | --- |
| **通道降维** | 256→64，减少计算 |
| **通道升维** | 64→256 |
| **跨通道信息融合** | 类似全连接，但保持空间结构 |
| **非线性** | 1×1 conv + ReLU = 逐像素 MLP |

**ResNet 的 Bottleneck 就靠 1×1 卷积省参数**（第 2 章讲过）。

## 本节来源

> **来源类型：学术来源（课程）**
> - Stanford CS231n Course Notes, *Convolutional Neural Networks (CNNs / ConvNets)*
>   https://cs231n.github.io/convolutional-networks/
>   **说明**：课程笔记，非同行评审，但已成为 CNN 教学的标准材料
>
> **来源类型：学术来源（相关论文）**
> - LeCun, Y. et al. *Gradient-Based Learning Applied to Document Recognition*（1998，LeNet）
> - Krizhevsky, A. et al. *ImageNet Classification with Deep Convolutional Neural Networks*
>   （2012，AlexNet）
> - Chellapilla, K. et al. *High Performance Convolutional Neural Networks for Document
>   Processing*（2006，im2col）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 28 篇（458 行，含 conv_forward_naive / im2col / SimpleCNN）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
def conv_naive(x, w, stride=1, pad=0):
    C, H, W_ = x.shape; Co, Ci, k, _ = w.shape
    Ho = (H + 2*pad - k)//stride + 1
    xp = np.pad(x, ((0,0),(pad,pad),(pad,pad)))
    out = np.zeros((Co, Ho, Ho))
    for o in range(Co):
        for i in range(Ho):
            for j in range(Ho):
                out[o,i,j] = (xp[:, i*stride:i*stride+k, j*stride:j*stride+k] * w[o]).sum()
    return out
def conv_im2col(x, w, stride=1, pad=0):
    C, H, W_ = x.shape; Co, Ci, k, _ = w.shape
    Ho = (H + 2*pad - k)//stride + 1
    xp = np.pad(x, ((0,0),(pad,pad),(pad,pad)))
    cols = np.zeros((Ci*k*k, Ho*Ho))
    for i in range(Ho):
        for j in range(Ho):
            cols[:, i*Ho+j] = xp[:, i*stride:i*stride+k, j*stride:j*stride+k].ravel()
    return (w.reshape(Co, -1) @ cols).reshape(Co, Ho, Ho)
x = np.arange(72.).reshape(2, 6, 6); w = np.random.default_rng(15).normal(0, 1, (3, 2, 3, 3))
print("尺寸公式: (6+0-3)//1+1 =", (6+0-3)//1+1)
print("朴素与 im2col 一致:", bool(np.allclose(conv_naive(x, w), conv_im2col(x, w))))\`\`\`

预期输出（实测）：实测：6×6 输入、3×3 核、无 padding 的输出尺寸 (6-3)/1+1=4；朴素三重循环与 im2col+GEMM 的结果逐元素一致（allclose=True）——卷积的计算本质是矩阵乘法，框架的加速来自 BLAS/cuBLAS。

**常见错误**：pad 计算漏掉两侧（应为 2·pad）；im2col 展开时行列顺序弄混，reshape 后整体错位；以为 1×1 卷积无用——它是 Bottleneck 降维与跨通道融合的关键。

### 常见误区

1. **深度学习的卷积=数学卷积**——实为互相关（核不翻转），因核可学习二者等价；
2. **im2col 无代价**——它复制 k² 倍内存，大 kernel 时框架改用 FFT/Winograd；
3. **池化必须 Max**——分类头如今用 GlobalAvgPool，下采样常用 stride=2 卷积替代。

### 知识关联

- **向前**：c1 的逐层推导已用到本节的尺寸与参数公式；
- **向后**：Bottleneck 的 1×1 降维（c2）、空洞卷积的 RF 扩展（c4）都建立在它之上；
- **平行**：im2col→GEMM 与 GPU 训练（c1 条件二）同属工程根基。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 卷积 | out[i,j]=Σx·w+b（互相关，核不翻转） |
| 尺寸 | ⌊(in+2pad-k)/stride⌋+1 |
| 参数 | (k²·C_in+1)·C_out，与输入尺寸无关 |
| 加速 | im2col→GEMM，实测与朴素一致 |
| 反向 | dx=转置卷积，dw=卷积 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 CS231n 课程笔记 Convolutional Neural Networks 与 LeNet/AlexNet 论文原文）
`,
        tips: [
          {
            kind: 'interview',
            text: '「输出尺寸公式」：H_out = floor((H + 2·pad - k)/stride) + 1。same padding 时 pad=(k-1)/2，要求 k 为奇数。',
          },
          {
            kind: 'leak',
            text: '「参数量与输入尺寸无关」：params = (k²·C_in + 1)·C_out。这是参数共享的结果——同一个核滑遍全图。',
          },
          {
            kind: 'pitfall',
            text: 'im2col 把卷积变成矩阵乘（GEMM），用 BLAS 加速 10~100 倍。代价是内存（复制 k² 倍数据）。实际框架小 kernel 用 im2col，大 kernel 用 FFT/Winograd。',
          },
        ],
        demos: [
          {
            title: '卷积前向实现（numpy）',
            lang: 'python',
            code: `import numpy as np

def conv_forward_naive(x, w, b, stride=1, pad=0):
    """
    朴素卷积前向。

    x: (C_in, H, W)
    w: (C_out, C_in, KH, KW)
    b: (C_out,)
    返回: (C_out, H_out, W_out)
    """
    C_in, H, W = x.shape
    C_out, _, KH, KW = w.shape

    # padding
    if pad > 0:
        x_pad = np.pad(x, ((0,0), (pad,pad), (pad,pad)), mode='constant')
    else:
        x_pad = x

    H_out = (H + 2*pad - KH) // stride + 1
    W_out = (W + 2*pad - KW) // stride + 1

    out = np.zeros((C_out, H_out, W_out))

    for co in range(C_out):
        for i in range(H_out):
            for j in range(W_out):
                h0 = i * stride
                w0 = j * stride
                window = x_pad[:, h0:h0+KH, w0:w0+KW]
                out[co, i, j] = np.sum(window * w[co]) + b[co]

    return out


print("=== 卷积前向 ===")
np.random.seed(42)

# 简单例子：3x3 边缘检测核
x = np.arange(1, 26).reshape(1, 5, 5).astype(float)
print("输入 (5x5):")
print(x[0].astype(int))
print()

w = np.array([[[[1, 0, -1],
                [1, 0, -1],
                [1, 0, -1]]]])   # (1, 1, 3, 3) 垂直边缘检测
b = np.array([0.0])

out = conv_forward_naive(x, w, b, stride=1, pad=0)
print("输出 (3x3，垂直边缘):")
print(out[0].astype(int))

print()
print("=== 输出尺寸验证 ===")
print()
print(f"{'H':>4} | {'k':>3} | {'pad':>4} | {'stride':>7} | {'H_out':>6} | {'公式':>6}")
print("-" * 46)

for H, k, pad, stride in [
    (32, 3, 1, 1), (32, 3, 0, 1), (32, 3, 1, 2),
    (224, 7, 3, 2), (28, 5, 2, 1), (16, 3, 0, 3),
]:
    H_out = (H + 2*pad - k) // stride + 1
    formula = (H + 2*pad - k) // stride + 1
    print(f"{H:>4} | {k:>3} | {pad:>4} | {stride:>7} | {H_out:>6} | {formula:>6}")

print()
print("=== 参数量计算 ===")
print()
print(f"{'配置':>24} | {'参数量':>12}")
print("-" * 42)

configs = [
    ("3x3, 3->64", 3, 3, 3, 64),
    ("3x3, 64->128", 3, 3, 64, 128),
    ("3x3, 128->256", 3, 3, 128, 256),
    ("1x1, 256->64", 1, 1, 256, 64),
    ("7x7, 3->64", 7, 7, 3, 64),
]
for name, kh, kw, cin, cout in configs:
    n = (kh * kw * cin + 1) * cout
    print(f"{name:>24} | {n:>12,}")

print()
print("关键：参数量与输入尺寸无关！")
print("输入 32x32 或 224x224，参数量相同")

print()
print("=== 多通道卷积 ===")
x_multi = np.random.randn(3, 8, 8)    # 3 通道
w_multi = np.random.randn(16, 3, 3, 3)  # 16 个输出通道
b_multi = np.zeros(16)

out_multi = conv_forward_naive(x_multi, w_multi, b_multi, stride=1, pad=1)
print(f"输入: {x_multi.shape}")
print(f"卷积核: {w_multi.shape}")
print(f"输出: {out_multi.shape}")
print()
print("每个输出通道 = 所有输入通道的加权和")
print("-> 这就是'跨通道信息融合'")`,
          },
          {
            title: 'im2col 加速',
            lang: 'python',
            code: `import numpy as np

def im2col(x, KH, KW, stride=1, pad=0):
    """
    把卷积窗口展开成列矩阵。

    x: (C, H, W)
    返回: (C*KH*KW, H_out*W_out)
    """
    C, H, W = x.shape

    if pad > 0:
        x = np.pad(x, ((0,0), (pad,pad), (pad,pad)), mode='constant')

    H_out = (H + 2*pad - KH) // stride + 1
    W_out = (W + 2*pad - KW) // stride + 1

    cols = np.zeros((C * KH * KW, H_out * W_out))
    idx = 0
    for i in range(H_out):
        for j in range(W_out):
            h0 = i * stride
            w0 = j * stride
            patch = x[:, h0:h0+KH, w0:w0+KW]   # (C, KH, KW)
            cols[:, idx] = patch.flatten()
            idx += 1
    return cols, H_out, W_out


def conv_forward_im2col(x, w, b, stride=1, pad=0):
    """用 im2col + 矩阵乘实现卷积。"""
    C_in, H, W = x.shape
    C_out, _, KH, KW = w.shape

    cols, H_out, W_out = im2col(x, KH, KW, stride, pad)
    # cols: (C_in*KH*KW, H_out*W_out)
    # w:    (C_out, C_in*KH*KW)
    w_flat = w.reshape(C_out, -1)

    # 矩阵乘！
    out = w_flat @ cols              # (C_out, H_out*W_out)
    out = out + b[:, None]
    return out.reshape(C_out, H_out, W_out)


print("=== im2col 卷积 ===")
np.random.seed(42)

x = np.random.randn(3, 16, 16)
w = np.random.randn(32, 3, 3, 3)
b = np.random.randn(32)

# 两种方法
out_im2col = conv_forward_im2col(x, w, b, stride=1, pad=1)

# 朴素方法（验证）
def conv_naive(x, w, b, stride, pad):
    C_in, H, W = x.shape
    C_out, _, KH, KW = w.shape
    xp = np.pad(x, ((0,0),(pad,pad),(pad,pad)))
    Ho = (H + 2*pad - KH)//stride + 1
    Wo = (W + 2*pad - KW)//stride + 1
    out = np.zeros((C_out, Ho, Wo))
    for co in range(C_out):
        for i in range(Ho):
            for j in range(Wo):
                out[co,i,j] = np.sum(xp[:, i*stride:i*stride+KH, j*stride:j*stride+KW] * w[co]) + b[co]
    return out

out_naive = conv_naive(x, w, b, 1, 1)

print(f"输入: {x.shape}")
print(f"输出 (im2col): {out_im2col.shape}")
print(f"输出 (朴素):   {out_naive.shape}")
print(f"结果差异: {np.abs(out_im2col - out_naive).max():.2e}")
print()
print("-> 两种方法结果完全一致")

print()
print("=== 速度对比 ===")
import time

x_big = np.random.randn(8, 32, 32)
w_big = np.random.randn(64, 8, 3, 3)
b_big = np.zeros(64)

t0 = time.time()
for _ in range(3):
    conv_forward_im2col(x_big, w_big, b_big, 1, 1)
t_im2col = (time.time() - t0) / 3

t0 = time.time()
conv_naive(x_big, w_big, b_big, 1, 1)
t_naive = time.time() - t0

print(f"im2col:  {t_im2col*1000:>8.2f} ms")
print(f"朴素:    {t_naive*1000:>8.2f} ms")
print(f"加速比:  {t_naive/t_im2col:>8.1f}x")

print()
print("=== im2col 的内存代价 ===")
print()
C, H, W = 3, 32, 32
KH = KW = 3
Ho = Wo = 32
cols_size = C * KH * KW * Ho * Wo
orig_size = C * H * W
print(f"原图大小:     {orig_size:>8,} 元素")
print(f"im2col 大小:  {cols_size:>8,} 元素")
print(f"膨胀倍数:     {cols_size/orig_size:>8.1f}x")
print()
print("这就是 im2col 的代价：内存膨胀 k^2 倍")
print("实际框架：小 kernel 用 im2col，大 kernel 用 FFT/Winograd")`,
          },
          {
            title: '感受野与池化',
            lang: "python",
            code: `import numpy as np

def compute_receptive_field(layers):
    """
    计算累积感受野。

    layers: [(kernel, stride), ...]
    """
    rf = 1
    stride_prod = 1
    for k, s in layers:
        rf += (k - 1) * stride_prod
        stride_prod *= s
    return rf


print("=== 感受野计算 ===")
print()

configs = [
    ("3 层 3x3, stride 1", [(3,1), (3,1), (3,1)]),
    ("3 层 3x3, stride 2", [(3,2), (3,2), (3,2)]),
    ("VGG-16 前 5 层", [(3,1), (3,1), (2,2), (3,1), (3,1)]),
    ("ResNet 50 前几层", [(7,2), (3,2), (3,1), (3,1)]),
]

print(f"{'配置':>24} | {'感受野':>8}")
print("-" * 36)
for name, layers in configs:
    rf = compute_receptive_field(layers)
    print(f"{name:>24} | {rf:>8}")

print()
print("=== 池化 ===")
print()

def max_pool(x, size=2, stride=2):
    C, H, W = x.shape
    Ho = (H - size) // stride + 1
    Wo = (W - size) // stride + 1
    out = np.zeros((C, Ho, Wo))
    for c in range(C):
        for i in range(Ho):
            for j in range(Wo):
                out[c,i,j] = x[c, i*stride:i*stride+size, j*stride:j*stride+size].max()
    return out


def avg_pool(x, size=2, stride=2):
    C, H, W = x.shape
    Ho = (H - size) // stride + 1
    Wo = (W - size) // stride + 1
    out = np.zeros((C, Ho, Wo))
    for c in range(C):
        for i in range(Ho):
            for j in range(Wo):
                out[c,i,j] = x[c, i*stride:i*stride+size, j*stride:j*stride+size].mean()
    return out


x = np.arange(1, 17).reshape(1, 4, 4).astype(float)
print("输入 (4x4):")
print(x[0].astype(int))
print()

mp = max_pool(x)
print("MaxPool 2x2:")
print(mp[0].astype(int))
print()

ap = avg_pool(x)
print("AvgPool 2x2:")
print(ap[0].astype(int))

print()
print("=== MaxPool vs AvgPool ===")
print()
print("MaxPool:")
print("  · 保留最强特征")
print("  · 常用在中间层")
print()
print("AvgPool:")
print("  · 保留整体强度")
print("  · GlobalAvgPool 用在分类头（HxW -> 1x1）")

print()
print("=== 感受野的直观意义 ===")
print()
print("感受野 = 输出一个像素'看到'的输入区域")
print()
print("例：3 层 3x3 卷积")
print("  第 1 层：每个输出像素看 3x3")
print("  第 2 层：看 5x5")
print("  第 3 层：看 7x7")
print()
print("深层感受野大 -> 能看到全局")
print("浅层感受野小 -> 只能看局部")
print()
print("这就是为什么 CNN 能'从边缘到物体'逐层抽象")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-vision-c5-e1',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'single',
        difficulty: 2,
        question: '卷积输出尺寸的公式是？',
        options: [
          { value: 'A', text: 'H_out = H - k' },
          { value: 'B', text: 'H_out = floor((H + 2·pad - k)/stride) + 1' },
          { value: 'C', text: 'H_out = H / stride' },
          { value: 'D', text: 'H_out = H + 2·pad' },
        ],
        answer: 'B',
        explanation:
          'H_out = floor((H + 2·pad - kernel)/stride) + 1。same padding 时 pad=(k-1)/2（k 需为奇数）。',
        tags: ['输出尺寸'],
      },
      {
        id: 'paper-vision-c5-e2',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'judge',
        difficulty: 2,
        question: '卷积层的参数量与输入图像的尺寸无关。',
        answer: true,
        explanation:
          'params = (k²·C_in + 1)·C_out，只依赖 kernel 大小和通道数。这是参数共享的结果——同一个核在整张图上滑动。',
        tags: ['参数量'],
      },
      {
        id: 'paper-vision-c5-e3',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'im2col 加速卷积的优点和代价包括？（多选）',
        options: [
          { value: 'A', text: '把卷积变成矩阵乘（GEMM），可用 BLAS 加速' },
          { value: 'B', text: '实际速度可提升 10~100 倍' },
          { value: 'C', text: '内存膨胀 k² 倍（复制窗口数据）' },
          { value: 'D', text: '减少了参数量' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——im2col 不改变参数量，只改变计算方式。A/B 是优点，C 是代价。实际框架小 kernel 用 im2col，大 kernel 用 FFT/Winograd。',
        tags: ['im2col'],
      },
      {
        id: 'paper-vision-c5-e4',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'fill',
        difficulty: 3,
        question:
          '1×1 卷积的主要用途是跨通道信息融合和 ___ 降维。',
        blanks: [['通道', 'channel', '特征']],
        explanation:
          '1×1 卷积保持空间尺寸不变，但可以改变通道数（256→64 降维，64→256 升维）。ResNet 的 Bottleneck 靠它省参数。',
        tags: ['1×1 卷积'],
      },
      {
        id: 'paper-vision-c5-e5',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'code',
        difficulty: 2,
        question:
          '计算卷积输出尺寸：conv_output_size(H, kernel, pad=0, stride=1)。\n\n返回 H_out = floor((H + 2·pad - kernel)/stride) + 1',
        starterCode: `def conv_output_size(H, kernel, pad=0, stride=1):
    return ___
`,
        setupCode: '',
        expectedOutput: '输出尺寸',
        tests: `# same padding
assert conv_output_size(32, 3, 1, 1) == 32
# valid
assert conv_output_size(32, 3, 0, 1) == 30
# 下采样
assert conv_output_size(32, 3, 1, 2) == 16
# ResNet stem
assert conv_output_size(224, 7, 3, 2) == 112
# 无 pad 大步长
assert conv_output_size(16, 3, 0, 3) == 5
# 1x1 卷积
assert conv_output_size(56, 1, 0, 1) == 56
`,
        answer: `def conv_output_size(H, kernel, pad=0, stride=1):
    return (H + 2 * pad - kernel) // stride + 1
`,
        explanation:
          '**推导**：\n\n    有效输入尺寸 = H + 2·pad（padding 扩展）\n    可滑动的次数 = (有效尺寸 - kernel) / stride + 1\n\n**为什么是 floor（`//`）**：\n不能滑动到超出边界。\n\n**例**：H=32, k=3, p=1, s=1\n\n    有效 = 32 + 2 = 34\n    (34 - 3) / 1 + 1 = 32  ✓ same\n\n**例**：H=32, k=3, p=1, s=2\n\n    (34 - 3) // 2 + 1 = 15 + 1 = 16  ✓ 下采样\n\n**same padding 规则**：pad = (k-1)/2，要求 k 为奇数。',
        tags: ['编程', '输出尺寸'],
      },
      {
        id: 'paper-vision-c5-e6',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'code',
        difficulty: 3,
        question:
          '计算卷积层参数量：conv_params(kernel, C_in, C_out)。\n\n返回 (kernel² × C_in + 1) × C_out',
        starterCode: `def conv_params(kernel, C_in, C_out):
    return ___
`,
        setupCode: '',
        expectedOutput: '参数量',
        tests: `# 3x3, 3->64
assert conv_params(3, 3, 64) == (3*3*3 + 1) * 64

# 3x3, 64->128
assert conv_params(3, 64, 128) == (3*3*64 + 1) * 128

# 1x1, 256->64
assert conv_params(1, 256, 64) == (1*1*256 + 1) * 64

# 7x7, 3->64
assert conv_params(7, 3, 64) == (7*7*3 + 1) * 64

# 3x3, 512->512
assert conv_params(3, 512, 512) == (3*3*512 + 1) * 512
`,
        answer: `def conv_params(kernel, C_in, C_out):
    return (kernel * kernel * C_in + 1) * C_out
`,
        explanation:
          '**公式**：`(k² · C_in + 1) · C_out`\n\n**逐项含义**：\n\n    k² · C_in  : 每个输出通道的卷积核权重\n    + 1        : bias\n    × C_out    : 输出通道数\n\n**关键**：**与输入尺寸 H、W 无关**！\n\n这是参数共享的结果——\n同一个核在整张图上滑动，所以不用为每个位置存一份。\n\n**对比全连接**：\n\n    输入 32×32×3 = 3072\n    输出 64\n    FC 参数量 = 3072 × 64 = 196,608\n    \n    Conv 3×3 参数量 = 1,792\n    \n    -> 相差 100 倍！\n\n**这就是 CNN 高效的原因。**',
        tags: ['编程', '参数量'],
      },
      {
        id: 'paper-vision-c5-e7',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现朴素卷积前向：conv_forward(x, w, b, stride=1, pad=0)。\n\n- x: (C_in, H, W)\n- w: (C_out, C_in, KH, KW)\n- b: (C_out,)\n- 返回 (C_out, H_out, W_out)',
        starterCode: `import numpy as np

def conv_forward(x, w, b, stride=1, pad=0):
    C_in, H, W = x.shape
    C_out, _, KH, KW = w.shape

    if pad > 0:
        x = np.pad(x, ((0,0),(pad,pad),(pad,pad)), mode='constant')

    H_out = ___
    W_out = ___

    out = np.zeros((C_out, H_out, W_out))
    for co in range(C_out):
        for i in range(H_out):
            for j in range(W_out):
                window = ___
                out[co, i, j] = ___
    return out
`,
        setupCode: '',
        expectedOutput: '卷积输出',
        tests: `import numpy as np

# 简单例子：单位核
x = np.arange(1, 26).reshape(1, 5, 5).astype(float)
w = np.zeros((1, 1, 3, 3)); w[0,0] = 1.0   # 全1核
b = np.array([0.0])

out = conv_forward(x, w, b, 1, 0)
assert out.shape == (1, 3, 3)
# 全1核 -> 每个 3x3 窗口求和
assert abs(out[0,0,0] - x[0,0:3,0:3].sum()) < 1e-9
assert abs(out[0,2,2] - x[0,2:5,2:5].sum()) < 1e-9

# 带 padding
out2 = conv_forward(x, w, b, 1, 1)
assert out2.shape == (1, 5, 5)

# 多通道
x3 = np.random.randn(3, 8, 8)
w3 = np.random.randn(16, 3, 3, 3)
b3 = np.zeros(16)
out3 = conv_forward(x3, w3, b3, 1, 1)
assert out3.shape == (16, 8, 8)
`,
        answer: `import numpy as np

def conv_forward(x, w, b, stride=1, pad=0):
    C_in, H, W = x.shape
    C_out, _, KH, KW = w.shape

    if pad > 0:
        x = np.pad(x, ((0,0),(pad,pad),(pad,pad)), mode='constant')

    H_out = (H + 2*pad - KH) // stride + 1
    W_out = (W + 2*pad - KW) // stride + 1

    out = np.zeros((C_out, H_out, W_out))
    for co in range(C_out):
        for i in range(H_out):
            for j in range(W_out):
                window = x[:, i*stride:i*stride+KH, j*stride:j*stride+KW]
                out[co, i, j] = np.sum(window * w[co]) + b[co]
    return out
`,
        explanation:
          '**关键操作**：\n\n**① `np.pad`**：\n\n    x: (C, H, W)\n    pad ((0,0),(p,p),(p,p)): 只在 H、W 维加 pad\n\n**② 窗口提取**：\n\n    x[:, i*stride : i*stride+KH, j*stride : j*stride+KW]\n    -> (C_in, KH, KW)\n\n**③ 乘加**：\n\n    np.sum(window * w[co])   # 逐元素乘再求和\n    + b[co]\n\n**`w[co]` 的形状是 (C_in, KH, KW)**，\n与 window 完全对应。\n\n**性能**：这是 4 重循环（co, i, j + 内部 sum），\n实际用 im2col + GEMM 快得多。',
        tags: ['编程', '卷积前向'],
      },
      {
        id: 'paper-vision-c5-e8',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'code',
        difficulty: 4,
        question:
          '实现 im2col 卷积：conv_forward_im2col(x, w, b, stride=1, pad=0)。\n\n步骤：\n1. im2col: (C,H,W) -> (C·KH·KW, H_out·W_out)\n2. w 展平: (C_out, C·KH·KW)\n3. 矩阵乘: w_flat @ cols\n4. reshape 回 (C_out, H_out, W_out)',
        starterCode: `import numpy as np

def conv_forward_im2col(x, w, b, stride=1, pad=0):
    C_in, H, W = x.shape
    C_out, _, KH, KW = w.shape

    if pad > 0:
        x = np.pad(x, ((0,0),(pad,pad),(pad,pad)), mode='constant')

    H_out = ___
    W_out = ___

    # im2col
    cols = np.zeros((C_in * KH * KW, H_out * W_out))
    idx = 0
    for i in range(H_out):
        for j in range(W_out):
            patch = ___
            cols[:, idx] = ___
            idx += 1

    # 矩阵乘
    w_flat = ___
    out = ___
    return out.reshape(C_out, H_out, W_out)
`,
        setupCode: '',
        expectedOutput: 'im2col 卷积',
        tests: `import numpy as np

np.random.seed(42)
x = np.random.randn(3, 10, 10)
w = np.random.randn(8, 3, 3, 3)
b = np.random.randn(8)

out = conv_forward_im2col(x, w, b, 1, 1)
assert out.shape == (8, 10, 10)

# 与朴素实现对比
def naive(x, w, b, stride, pad):
    C, H, W = x.shape
    Co, _, KH, KW = w.shape
    xp = np.pad(x, ((0,0),(pad,pad),(pad,pad)))
    Ho = (H + 2*pad - KH)//stride + 1
    Wo = (W + 2*pad - KW)//stride + 1
    o = np.zeros((Co, Ho, Wo))
    for co in range(Co):
        for i in range(Ho):
            for j in range(Wo):
                o[co,i,j] = np.sum(xp[:, i*stride:i*stride+KH, j*stride:j*stride+KW] * w[co]) + b[co]
    return o

ref = naive(x, w, b, 1, 1)
assert np.allclose(out, ref, atol=1e-9), "应与朴素实现一致"

# stride 2
out2 = conv_forward_im2col(x, w, b, 2, 1)
assert out2.shape == (8, 5, 5)
`,
        answer: `import numpy as np

def conv_forward_im2col(x, w, b, stride=1, pad=0):
    C_in, H, W = x.shape
    C_out, _, KH, KW = w.shape

    if pad > 0:
        x = np.pad(x, ((0,0),(pad,pad),(pad,pad)), mode='constant')

    H_out = (H + 2*pad - KH) // stride + 1
    W_out = (W + 2*pad - KW) // stride + 1

    cols = np.zeros((C_in * KH * KW, H_out * W_out))
    idx = 0
    for i in range(H_out):
        for j in range(W_out):
            patch = x[:, i*stride:i*stride+KH, j*stride:j*stride+KW]
            cols[:, idx] = patch.flatten()
            idx += 1

    w_flat = w.reshape(C_out, -1)
    out = w_flat @ cols + b[:, None]
    return out.reshape(C_out, H_out, W_out)
`,
        explanation:
          '**核心：把卷积变成矩阵乘**\n\n**形状变化**：\n\n    x:      (C_in, H, W)\n    cols:   (C_in·KH·KW, H_out·W_out)   <- im2col\n    w_flat: (C_out, C_in·KH·KW)\n    out:    (C_out, H_out·W_out)        <- GEMM\n    reshape: (C_out, H_out, W_out)\n\n**为什么快**：\n\n    朴素：4 重 Python 循环\n    im2col：一次矩阵乘（调用 BLAS/cuBLAS）\n    \n    BLAS 有高度优化的实现（分块、向量化、多线程）\n\n**`patch.flatten()` 的顺序**：\n(C, KH, KW) -> 展平成 C·KH·KW，\n必须与 `w.reshape(C_out, -1)` 的顺序一致。\n\n**代价**：cols 的内存是原图的 k² 倍。',
        tags: ['编程', 'im2col'],
      },
      {
        id: 'paper-vision-c5-e9',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'judge',
        difficulty: 4,
        question: '深度学习中说的"卷积"实际上是数学上的互相关（不翻转卷积核）。',
        answer: true,
        explanation:
          '数学卷积需要翻转核，但深度学习不翻转——因为核是学出来的，翻不翻转等价（学到的核会自动适应）。这也是为什么实现里常写 conv 但实际是 cross-correlation。',
        tags: ['卷积定义'],
      },
      {
        id: 'paper-vision-c5-e10',
        relatedLessonId: 'paper-vision-c5-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 卷积的输出尺寸与参数量公式；② im2col 的原理与代价；③ 感受野的计算与意义；④ 为什么 1×1 卷积有用。',
        referenceAnswer: `**① 输出尺寸与参数量**

**输出尺寸**：

    H_out = floor((H + 2·pad - kernel) / stride) + 1

**推导**：

    有效输入 = H + 2·pad
    可滑动次数 = (有效输入 - kernel) / stride + 1

**常用配置**：

| 配置 | pad | stride | 效果 |
| --- | --- | --- | --- |
| k=3, p=1, s=1 | 1 | 1 | **same**（尺寸不变）|
| k=3, p=0, s=1 | 0 | 1 | valid（尺寸-2）|
| k=3, p=1, s=2 | 1 | 2 | 下采样 2 倍 |

**same padding 规则**：\`pad = (k-1)/2\`，要求 k 为奇数。

**参数量**：

    params = (k² · C_in + 1) · C_out

**关键：与输入尺寸 H、W 无关！**

**对比全连接**：

    输入 32×32×3, 输出 64：
      FC: 3072×64 = 196,608
      Conv 3×3: 1,792
      -> 相差 100 倍

**这就是参数共享的力量。**

---

**② im2col 的原理与代价**

**原理**：

    ① 每个卷积窗口展开成一列
    ② 所有列拼成矩阵 cols
    ③ 与展平的核做矩阵乘

**形状**：

    x:      (C_in, H, W)
    cols:   (C_in·KH·KW, H_out·W_out)
    w_flat: (C_out, C_in·KH·KW)
    out:    w_flat @ cols -> (C_out, H_out·W_out)

**为什么快**：

| 方法 | 实现 |
| --- | --- |
| 朴素 | 4 重 Python 循环 |
| **im2col** | **一次 GEMM（BLAS/cuBLAS）** |

BLAS 有分块、向量化、多线程优化，
比 Python 循环快 10~100 倍。

**代价**：

    内存膨胀 k² 倍
    
    例：3×3 卷积，im2col 的 cols 是原图的 9 倍

**实际框架的策略**：

| kernel | 方法 |
| --- | --- |
| 小（3×3, 5×5） | im2col |
| 大（7×7+） | FFT / Winograd |

---

**③ 感受野的计算与意义**

**公式**：

    RF_l = RF_{l-1} + (k_l - 1) × Π_{i<l} s_i

**例子**（3 层 3×3，stride 1）：

| 层 | 增量 | 累计 |
| --- | --- | --- |
| 1 | 2 | 3 |
| 2 | 2 | 5 |
| 3 | 2 | 7 |

**加 stride 的影响**（3 层 3×3，stride 2）：

| 层 | 增量 | 累计 |
| --- | --- | --- |
| 1 | 2×1 | 3 |
| 2 | 2×2 | 7 |
| 3 | 2×4 | 15 |

**关键**：**stride 会放大后续层的贡献**（指数增长）。

**意义**：

| 感受野 | 能看到什么 |
| --- | --- |
| 3×3 | 边缘 |
| 7×7 | 纹理 |
| 15×15 | 局部形状 |
| 50+ | 物体部件 |
| 全图 | 整体场景 |

**这就是 CNN 的"层次抽象"**：
浅层看局部细节，深层看全局语义。

**与第 11 篇（空洞卷积）的联系**：
空洞卷积就是"不增加参数扩大感受野"的方法。

---

**④ 为什么 1×1 卷积有用**

**直觉**：1×1 卷积看起来"什么都没做"（只看一个像素）。

**实际上它有四个作用**：

**a) 通道降维**

    256 通道 -> 64 通道
    
    params = (1²·256 + 1)·64 = 16,448
    对比 3×3： (9·256+1)·64 = 147,520

**省 9 倍参数！**

**b) 通道升维**

    64 -> 256（用于 Bottleneck 的升维）

**c) 跨通道信息融合**

    每个输出通道 = 所有输入通道的加权和
    
    类似全连接，但保持空间结构

**d) 增加非线性**

    1×1 conv + ReLU = 逐像素的两层 MLP

**ResNet Bottleneck 的核心**：

    Conv 1×1 (降维) -> Conv 3×3 -> Conv 1×1 (升维)
    
    参数量：1.81c²
    对比 BasicBlock（2 个 3×3）：18c²
    -> 省 10 倍

**Inception 模块也大量用 1×1**：
在 3×3、5×5 卷积前先降维，减少计算。

---

**⑤ 一个更深的理解**

**CS231n 的价值：把"魔法"变成"工程"**

**论文说**：

    "用卷积提取特征"

**CS231n 说**：

    ① 卷积的数学定义（互相关）
    ② 输出尺寸怎么算（公式）
    ③ 参数量怎么算（参数共享）
    ④ 如何加速（im2col）
    ⑤ 反向传播是什么（转置卷积）
    ⑥ 感受野怎么算（累积公式）

**这个层次的细节决定了**：

| 能力 | 需要知道什么 |
| --- | --- |
| 读懂论文 | 知道"卷积"是什么 |
| **实现模型** | **知道尺寸、参数、加速** |
| **调试 bug** | **知道形状怎么变** |
| 优化性能 | 知道 im2col、Winograd |

**实践中 80% 的 bug 是形状不匹配**——
而 CS231n 讲的正是形状计算。

**这就是为什么它是必读材料。**

---

**⑥ 与现代架构的关系**

**CNN 的基础知识仍然适用**：

| 现代架构 | 用到的 CNN 知识 |
| --- | --- |
| **ResNet** | 3×3 卷积、1×1 降维、stride 下采样 |
| **EfficientNet** | 深度可分离卷积、复合缩放 |
| **Vision Transformer** | patch embedding（本质是大 stride 卷积）|
| **ConvNeXt** | 大 kernel（7×7）深度卷积 |
| **扩散模型 U-Net** | 卷积 + 下采样/上采样 |

**Vision Transformer 的 patch embedding**：

    Conv 16×16, stride 16, C_in=3, C_out=768
    
    等价于：把图像切成 16×16 的 patch，每个 patch 线性投影到 768 维
    -> 这就是 "patch embedding"

**所以 CNN 的基础知识在 Transformer 时代仍然重要。**

---

**⑦ 一个诚实的建议**

**如果你要真正掌握 CNN**：

1. **手写一遍卷积前向**（不看答案）
2. **手写 im2col**（理解加速原理）
3. **计算每层的输出尺寸**（调试必备）
4. **计算参数量**（评估模型大小）
5. **理解感受野**（理解为什么深层有效）

**只有手写过，才算真正理解。**`,
        rubric: [
          { point: '输出尺寸公式 + same padding 规则 + 参数量与输入尺寸无关', score: 3 },
          { point: 'im2col 变成 GEMM 加速 10-100 倍，代价内存膨胀 k²', score: 2 },
          { point: '感受野累积公式，stride 放大后续层贡献', score: 2 },
          { point: '1×1 卷积四个作用：降维/升维/跨通道融合/非线性', score: 2 },
          { point: 'CS231n 价值：把魔法变工程，形状计算是调试关键', score: 1 },
        ],
        keywords: ['(H+2p-k)/s+1', 'GEMM加速', 'stride放大感受野', '1x1降维', '形状匹配'],
        explanation:
          '能说清「参数量与输入尺寸无关是参数共享的结果」以及「1×1 卷积省 9 倍参数」，就是理解了 CNN 的核心设计。',
        tags: ['综合分析'],
      },
    ],
  },
];
