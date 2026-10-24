import type { Chapter } from '../../types';
import { llmA3Extra } from './llm-a3-extra';

/** 《从 GPT-2 到 LLaMA》章节 */
export const llm_a3Chapters: Omit<Chapter, 'courseId' | 'order'>[] = [
  {
    id: 'llm-a3-c1',
    title: 'RMSNorm：简化归一化',
    goal: '理解 LayerNorm 为什么要"减均值 + 除标准差"，掌握 RMSNorm 去掉了什么、为什么敢去掉，能够手算、能用 numpy 实现，并解释它带来的实际收益。',
    lessons: [
      {
        id: 'llm-a3-c1-l1',
        title: 'LayerNorm 回顾：它在解决什么问题',
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出 LayerNorm 在最后一维的完整公式（mu/sigma/gamma/beta）并说明统计轴为何是特征维；
2. 解释 BatchNorm 在 NLP 上失效的两个原因（batch 依赖、padding 污染）；
3. 区分 Pre-Norm 与 Post-Norm 的梯度路径差异，说明为什么需要 final Norm。

### 前置知识

- llm-a1 的 Transformer Block 结构与残差连接；
- numpy 的 mean(axis, keepdims) 用法。

### 问题背景

训练 LLM 时损失曲线上莫名其妙的尖刺、深层网络不做 warmup 就不收敛，很多都能追到归一化层的设计。GPT-2 的 LayerNorm 在每个位置同时算均值和方差，而 LLaMA 换成了只除均方根的 RMSNorm——删掉的东西比留下的还多，效果反而更好。本章回答三个问题：归一化在解决什么、RMSNorm 删了什么、为什么敢删。

### 直觉理解

LayerNorm 像给每行数据做两次校准：先减去平均身高（居中），再除以身高的波动幅度（缩放）。RMSNorm 发现第二个动作才是主角——它只除以『平均功率的平方根』（信号学上的 RMS 音量），不再减均值。就像调音师只统一音量、不强行把所有轨道的中心频率归零；只要后续电路（线性层）不在乎直流偏移，去掉居中就白赚一半计算。

### 核心概念与原理详解

## 为什么深度网络需要归一化

一个 Transformer Block 里堆叠着注意力、FFN、残差相加。随着层数加深，每层输出的数值分布会发生漂移（internal covariate shift 的通俗说法）：某些维度越来越大、某些越来越小，激活值要么饱和、要么接近 0。归一化层的作用就是**在每个位置的隐藏向量内部做一次"标准化"，把数值尺度拉回到可控范围**，让后续的线性层与激活函数工作在它们的有效区间。

对形状 [B, n, d] 的输入，LayerNorm 在**最后一维（特征维 d）**上做统计：

- 均值 mu = (1/d) 乘以 sum_j x_j
- 方差 sigma^2 = (1/d) 乘以 sum_j (x_j - mu)^2
- 标准化 x_hat_j = (x_j - mu) / sqrt(sigma^2 + eps)
- 仿射变换 y_j = gamma_j 乘以 x_hat_j + beta_j

gamma 与 beta 都是长度为 d 的可学习向量。**关键点：每个 token 位置独立归一化，token 之间互不影响**，所以 batch 内每条序列、每个位置都单独算一次 mu 和 sigma^2。

## 形状与统计轴

以 GPT-2 small 为例：隐藏维 d = 768，序列长度 n = 1024，batch B = 8。输入 X 形状 [8, 1024, 768]，LayerNorm 输出形状完全相同，只是每一行 [768] 被换成了均值为 0、方差为 1 的版本（经过 gamma/beta 后再被拉伸）。这就是为什么说 LayerNorm **不改变形状，只改变数值分布**。

## BatchNorm 为什么不适用

BatchNorm 在 **batch 维**上统计，对 NLP 有两个致命问题：

1. **依赖 batch 组成**：推理时要用训练期滑动平均的统计量，长短序列混在一起时统计量不准；
2. **序列填充**：padding 位置的向量是占位的（通常是 0），如果把它们算进统计量，均值和方差会被严重拉偏。

LayerNorm 对每个 token 独立统计，天然免疫这两个问题，因此成为 Transformer 的标配。

## eps 的作用与位置

eps 写在 sqrt **内部**还是外部，是一个"不影响表达力、但影响数值行为"的细节：

- sqrt(sigma^2 + eps)：分母恒为正，最常用；
- sqrt(sigma^2) + eps：输入全为常数时 sigma^2 = 0，会得到 0/eps，结果虽然还是 0，但反向传播时梯度会变成 inf 或 nan。

因此一律推荐第一种写法。LLaMA 的 RMSNorm 用的 eps 是 1e-5（Hugging Face 配置里叫 rms_norm_eps），而不少手写实现用 1e-6，**两者结果在小数值上会有可见差异**，做数值对齐时要核对配置文件。

## Pre-Norm 与 Post-Norm

原始 Transformer 是 Post-Norm：x = Norm(x + Sublayer(x))。GPT-2 之后的模型普遍改成 Pre-Norm：x = x + Sublayer(Norm(x))。

<Diagram type="arch" name="transformer-block" />

Pre-Norm 的价值在于残差路径是**纯恒等映射**，梯度可以从最后一层直接流回第一层，深层网络不需要精心设计的 warmup 就能训练。代价是最后一层之后还要补一个最终的 Norm（LLaMA 里叫 norm，GPT-2 里叫 ln_f），否则输出尺度不受控。

## 一个容易忽略的事实

LayerNorm 的两个 affine 参数加起来是 2d 个，相对 d 乘以 4d 的注意力权重（d=4096 时是 1677 万）微不足道。**所以 LLaMA 去掉 beta 省下的参数量几乎可以忽略；它真正省的是一部分计算与访存**，以及一个更重要的收益：让"减均值"这一步不再必要（见下一节）。

<LayerNormDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
np.set_printoptions(precision=4, suppress=True)

def layer_norm(x, gamma=1.0, beta=0.0, eps=1e-6):
    mu = x.mean(-1, keepdims=True)
    var = ((x - mu) ** 2).mean(-1, keepdims=True)
    return gamma * (x - mu) / np.sqrt(var + eps) + beta

def rms_norm(x, gamma=1.0, eps=1e-6):
    rms = np.sqrt((x ** 2).mean(-1, keepdims=True) + eps)
    return gamma * x / rms

# ---- 1. 手算对照：x=[1,2,3,4] ----
x = np.array([1., 2., 3., 4.])
print("LayerNorm:", layer_norm(x))
print("RMSNorm :", rms_norm(x))
print("RMSNorm 输出均值 %.4f（不为0），输出均方 %.4f（≈1）" % (rms_norm(x).mean(), (rms_norm(x)**2).mean()))

# ---- 2. 不变性对比 ----
print("正缩放不变(RMSNorm):", np.allclose(rms_norm(10*x), rms_norm(x)))
print("整体平移 LayerNorm 不变:", np.allclose(layer_norm(x+10), layer_norm(x)))
print("整体平移 RMSNorm 变了:", not np.allclose(rms_norm(x+10), rms_norm(x)))

# ---- 3. 张量形状与 keepdims ----
X = np.random.default_rng(0).normal(size=(2, 3, 4096))
y = rms_norm(X)
print("形状不变:", X.shape == y.shape, "| 每行均方≈1:", bool(np.allclose((y**2).mean(-1), 1, atol=1e-4)))
try:
    X / np.sqrt((X**2).mean(-1))
except ValueError as e:
    print("keepdims=False 广播失败:", e)

# ---- 4. 低精度平方溢出：必须 fp32 归约 ----
v16 = np.float16(300.0)
print("fp16 下 300^2 =", v16 * v16, "-> LLaMA 在 RMSNorm 内部转 fp32 再归约")

# ---- 5. 参数量对比 ----
print("GPT-2 LN 参数:", 12*2*2*768)
print("LLaMA-2 7B RMSNorm 参数:", (32*2+1)*4096, "（若用 LN:", 32*2*2*4096, "）")\`\`\`

预期输出（实测）：手算对照：LayerNorm 输出 [-1.3416,-0.4472,0.4472,1.3416]，RMSNorm 输出 [0.3651,0.7303,1.0954,1.4606]（均值 0.9129 不为 0、均方 1.0000）；RMSNorm 正缩放不变=True、平移敏感=True，LayerNorm 平移不变=True；形状不变=True、每行均方≈1=True，keepdims=False 广播报错；fp16 下 300^2=inf（必须 fp32 归约）；GPT-2 LN 参数 36864 vs LLaMA RMSNorm 266240（LN 则 524288）。

**常见错误**：eps 写在 sqrt 外面，全常数输入时梯度变 nan；RMSNorm 的 weight 用随机初始化而不是全 1，开局就打乱残差流；把 LayerNorm 的预训练权重直接加载进 RMSNorm——beta 无处安放且数值分布偏移。

### 常见误区

1. **『RMSNorm 是 LayerNorm 的数学等价改写』**——不是：输出均值不为 0、对整体平移敏感，只是实证差距可忽略；\\n2. **『省参数是 RMSNorm 的主要收益』**——几十万参数相对 67 亿是噪声，真正省的是约一半元素级运算与访存；\\n3. **『归一化统计该在 batch 维做』**——那是 BatchNorm 的思路，NLP 的变长与 padding 会污染统计量，必须按最后一维逐 token 独立。

### 知识关联

- **向前**：c2 的 SwiGLU 同样遵循 LLaMA『全家无偏置』的思路；
- **向后**：c3 RoPE 的尺度守恒与 RMSNorm 的正缩放不变性配合干净；
- **平行**：llm-a1 讲训练稳定性时的 LayerNorm 是本章的对照原型。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| LayerNorm | 减均值 + 除标准差 + gamma/beta，2d 参数 |
| RMSNorm | 只除均方根 + gamma，d 参数；对正缩放不变、对平移敏感 |
| 主要收益 | 元素级运算约 6d→3d（省一半），参数收益可忽略 |
| 工程细节 | fp32 归约、weight 全 1 初始化、eps=1e-5（LLaMA）|
| Pre-Norm | 残差路径纯恒等，末尾仍需一个 final Norm |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'eps 要写在 `sqrt` 里面：写成 `sqrt(var) + eps`，当输入是常数向量时会得到 0/eps，反向传播出现 nan。',
          },
          {
            kind: 'interview',
            text: '被问"为什么 Transformer 用 LayerNorm 不用 BatchNorm"，答题线索有两条：序列 padding 会污染 batch 统计量；推理时 batch 由用户请求决定，统计量不稳定。',
          },
          {
            kind: 'note',
            text: 'LayerNorm 不改变张量形状，只改变每个位置的特征分布。做形状核对时它完全"隐形"，但对训练稳定性的影响却是决定性的。',
          },
        ],
        demos: [
          {
            title: 'LayerNorm 手写实现与逐轴验证',
            lang: 'python',
            code: `import numpy as np

def layer_norm(x, gamma=None, beta=None, eps=1e-5):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    beta = np.zeros(d) if beta is None else beta
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return gamma * (x - mu) / np.sqrt(var + eps) + beta

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [10.0, 12.0, 14.0, 16.0],
              [0.5, -0.5, 0.5, -0.5]])
Y = layer_norm(X)
print("形状:", Y.shape)
print("每行均值:", np.round(Y.mean(axis=-1), 8))
print("每行方差:", np.round(Y.var(axis=-1), 5))
print("第 0 行:", np.round(Y[0], 5))

# 注意第二行与第一行只差一个整体平移和缩放，归一化后几乎一样
print("第 0 行与第 1 行差异:", np.round(np.abs(Y[0] - Y[1]), 5))

# 常数输入：sigma^2 = 0，必须靠 eps 兜底
c = layer_norm(np.ones((1, 4)) * 7.0)
print("常数向量输出:", c)`,
          },
          {
            title: 'Pre-Norm 与 Post-Norm 的梯度尺度对比',
            lang: 'python',
            code: `import numpy as np

def f(x):
    return 0.9 * x + 0.1 * x ** 2

def norm(x):
    return (x - x.mean()) / (x.std() + 1e-5)

# 单向链式累乘：观察两种结构下梯度从最后一层回传到第一层还剩多少
L = 24
x0 = np.random.default_rng(0).normal(size=16)

# Pre-Norm: x = x + f(Norm(x))，沿恒等路径的梯度系数是 1
g_pre = 1.0
# Post-Norm: x = Norm(x + f(x))，梯度经过一次归一化，幅度被压到约 1/sqrt(d)
g_post = 1.0
for _ in range(L):
    g_pre *= 1.0
    g_post *= 1.0 / np.sqrt(16)

print(f"Pre-Norm   传回首层的梯度量级: {g_pre:.3e}")
print(f"Post-Norm  传回首层的梯度量级: {g_post:.3e}")
print("结论：Pre-Norm 的残差是纯恒等路径，深层网络不需要激进 warmup 也能训。")`,
          },
        ],
      },
      {
        id: 'llm-a3-c1-l2',
        title: 'RMSNorm 公式：只除以均方根',
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出 RMSNorm 公式 y = gamma·x/sqrt(mean(x²)+eps)，并手算 x=[1,2,3,4] 的输出；
2. 对比 LayerNorm/RMSNorm 在减均值、分母、参数量、平移敏感性上的差异；
3. 说明『常数偏移可被下一层偏置吸收』为何让 beta 变得冗余。

### 前置知识

- 「LayerNorm 回顾」（l1）的公式与统计轴；
- 均方根（RMS）的定义。

### 问题背景

训练 LLM 时损失曲线上莫名其妙的尖刺、深层网络不做 warmup 就不收敛，很多都能追到归一化层的设计。GPT-2 的 LayerNorm 在每个位置同时算均值和方差，而 LLaMA 换成了只除均方根的 RMSNorm——删掉的东西比留下的还多，效果反而更好。本章回答三个问题：归一化在解决什么、RMSNorm 删了什么、为什么敢删。

### 直觉理解

LayerNorm 像给每行数据做两次校准：先减去平均身高（居中），再除以身高的波动幅度（缩放）。RMSNorm 发现第二个动作才是主角——它只除以『平均功率的平方根』（信号学上的 RMS 音量），不再减均值。就像调音师只统一音量、不强行把所有轨道的中心频率归零；只要后续电路（线性层）不在乎直流偏移，去掉居中就白赚一半计算。

### 核心概念与原理详解

## 从 LayerNorm 删到 RMSNorm

Zhang 与 Sennrich 在 2019 年的论文《Root Mean Square Layer Normalization》中提出一个问题：LayerNorm 里"减均值"这一步到底有没有用？

他们把 LayerNorm 拆成两个部分来观察：

1. **重中心化（re-centering）**：减去均值 mu；
2. **重缩放（re-scaling）**：除以标准差 sigma。

作者的实证分析给出的结论是：**对前馈网络与注意力层而言，主要起作用的其实是重缩放**；重中心化带来的收益很小，甚至在某些设置下会带来负作用。既然减均值几乎不贡献效果，那就把它删掉。

删掉 mu 之后，方差 sigma^2 = (1/d)·sum (x_j - mu)^2 就退化成了二阶矩：

sigma^2 变成 (1/d)·sum x_j^2，记作 ms（mean square），其平方根 RMS = sqrt((1/d)·sum x_j^2)

因此 RMSNorm 的公式是：

y_j = gamma_j 乘以 x_j / sqrt((1/d) 乘以 sum_k x_k^2 + eps)

与 LayerNorm 的两个差别：

| 项目 | LayerNorm | RMSNorm |
| --- | --- | --- |
| 减均值 | 是 | 否 |
| 分母 | 标准差 sqrt(sigma^2 + eps) | 均方根 sqrt(ms + eps) |
| 可学习参数 | gamma 与 beta，共 2d 个 | 只有 gamma，共 d 个 |
| 对整体平移 | 不变 | 敏感（x + c 会改变结果） |
| 对正缩放 | 不变 | 不变 |

## 手算示例

取 x = [1, 2, 3, 4]，d = 4，gamma 全为 1，eps 取 1e-6。

- 平方和：1 + 4 + 9 + 16 = 30
- ms = 30 / 4 = 7.5
- RMS = sqrt(7.5 + 1e-6) = sqrt(7.500001) 约等于 2.73861
- 输出：1/2.73861 = 0.3651，2/2.73861 = 0.7303，3/2.73861 = 1.0954，4/2.73861 = 1.4606

对照 LayerNorm：mu = 2.5，sigma^2 = ((1.5)^2 + (0.5)^2 + (0.5)^2 + (1.5)^2)/4 = 5/4 = 1.25，sigma 约等于 1.11803，输出是 [-1.3416, -0.4472, 0.4472, 1.3416]。

**同一组输入，两种方法输出完全不同**。注意 RMSNorm 的输出**均值不为 0**（这里是 0.9129），它只保证"平方的均值约为 1"，也就是向量长度为 sqrt(d)。

<Slider name="rmsnorm" />

把滑块拖到 [1, 2, 3, 4] 看上面的手算，再把四个值同时乘以 10，你会发现 RMSNorm 的输出完全不变——这就是它对"正缩放不变"的性质；而如果把四个值同时加 10（变成 [11, 12, 13, 14]），RMSNorm 结果会大变，LayerNorm 几乎不变。

## 为什么去掉 beta 是安全的

beta 的语义是"给每个维度加一个可学习的偏移量"。但 RMSNorm 后面的线性层本来就带偏置（在 LLaMA 里，大部分 Linear 是 bias=False，所以等效的偏移由后续层的权重来表达）；更重要的是，**一个常数偏移完全等价于把这个偏移移到下一层的偏置里**：

gamma * x / rms(x) + beta 与 gamma * x / rms(x)

在后续 Linear W 的作用下，前者等于 H 加 beta 乘以 W，后者只要在 W 的偏置里吸收 beta 乘以 W 即可。LLaMA 的 Linear 没有 bias，但初期的 SwiGLU 也能在训练中学到等效的偏移，因此 beta 变得冗余。

## LLaMA 的实现细节

LLaMA 的 PyTorch 实现里，RMSNorm 通常这样写：

\`\`\`python
class RMSNorm(nn.Module):
    def __init__(self, d, eps=1e-5):
        super().__init__()
        self.eps = eps
        self.weight = nn.Parameter(torch.ones(d))

    def forward(self, x):
        # x: [..., d]，float32 计算、转回原 dtype
        input_dtype = x.dtype
        x = x.float()
        var = x.pow(2).mean(-1, keepdim=True)
        x = x * torch.rsqrt(var + self.eps)
        return self.weight * x.to(input_dtype)
\`\`\`

两个细节：先转 float32 是为了防止 bf16 下平方求和溢出；weight 初始化为全 1，保证网络初始状态与"直接跳过归一化"接近。

<LayerNormDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
np.set_printoptions(precision=4, suppress=True)

def layer_norm(x, gamma=1.0, beta=0.0, eps=1e-6):
    mu = x.mean(-1, keepdims=True)
    var = ((x - mu) ** 2).mean(-1, keepdims=True)
    return gamma * (x - mu) / np.sqrt(var + eps) + beta

def rms_norm(x, gamma=1.0, eps=1e-6):
    rms = np.sqrt((x ** 2).mean(-1, keepdims=True) + eps)
    return gamma * x / rms

# ---- 1. 手算对照：x=[1,2,3,4] ----
x = np.array([1., 2., 3., 4.])
print("LayerNorm:", layer_norm(x))
print("RMSNorm :", rms_norm(x))
print("RMSNorm 输出均值 %.4f（不为0），输出均方 %.4f（≈1）" % (rms_norm(x).mean(), (rms_norm(x)**2).mean()))

# ---- 2. 不变性对比 ----
print("正缩放不变(RMSNorm):", np.allclose(rms_norm(10*x), rms_norm(x)))
print("整体平移 LayerNorm 不变:", np.allclose(layer_norm(x+10), layer_norm(x)))
print("整体平移 RMSNorm 变了:", not np.allclose(rms_norm(x+10), rms_norm(x)))

# ---- 3. 张量形状与 keepdims ----
X = np.random.default_rng(0).normal(size=(2, 3, 4096))
y = rms_norm(X)
print("形状不变:", X.shape == y.shape, "| 每行均方≈1:", bool(np.allclose((y**2).mean(-1), 1, atol=1e-4)))
try:
    X / np.sqrt((X**2).mean(-1))
except ValueError as e:
    print("keepdims=False 广播失败:", e)

# ---- 4. 低精度平方溢出：必须 fp32 归约 ----
v16 = np.float16(300.0)
print("fp16 下 300^2 =", v16 * v16, "-> LLaMA 在 RMSNorm 内部转 fp32 再归约")

# ---- 5. 参数量对比 ----
print("GPT-2 LN 参数:", 12*2*2*768)
print("LLaMA-2 7B RMSNorm 参数:", (32*2+1)*4096, "（若用 LN:", 32*2*2*4096, "）")\`\`\`

预期输出（实测）：手算对照：LayerNorm 输出 [-1.3416,-0.4472,0.4472,1.3416]，RMSNorm 输出 [0.3651,0.7303,1.0954,1.4606]（均值 0.9129 不为 0、均方 1.0000）；RMSNorm 正缩放不变=True、平移敏感=True，LayerNorm 平移不变=True；形状不变=True、每行均方≈1=True，keepdims=False 广播报错；fp16 下 300^2=inf（必须 fp32 归约）；GPT-2 LN 参数 36864 vs LLaMA RMSNorm 266240（LN 则 524288）。

**常见错误**：eps 写在 sqrt 外面，全常数输入时梯度变 nan；RMSNorm 的 weight 用随机初始化而不是全 1，开局就打乱残差流；把 LayerNorm 的预训练权重直接加载进 RMSNorm——beta 无处安放且数值分布偏移。

### 常见误区

1. **『RMSNorm 是 LayerNorm 的数学等价改写』**——不是：输出均值不为 0、对整体平移敏感，只是实证差距可忽略；\\n2. **『省参数是 RMSNorm 的主要收益』**——几十万参数相对 67 亿是噪声，真正省的是约一半元素级运算与访存；\\n3. **『归一化统计该在 batch 维做』**——那是 BatchNorm 的思路，NLP 的变长与 padding 会污染统计量，必须按最后一维逐 token 独立。

### 知识关联

- **向前**：c2 的 SwiGLU 同样遵循 LLaMA『全家无偏置』的思路；
- **向后**：c3 RoPE 的尺度守恒与 RMSNorm 的正缩放不变性配合干净；
- **平行**：llm-a1 讲训练稳定性时的 LayerNorm 是本章的对照原型。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| LayerNorm | 减均值 + 除标准差 + gamma/beta，2d 参数 |
| RMSNorm | 只除均方根 + gamma，d 参数；对正缩放不变、对平移敏感 |
| 主要收益 | 元素级运算约 6d→3d（省一半），参数收益可忽略 |
| 工程细节 | fp32 归约、weight 全 1 初始化、eps=1e-5（LLaMA）|
| Pre-Norm | 残差路径纯恒等，末尾仍需一个 final Norm |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'pitfall',
            text: 'RMSNorm 不保证输出均值为 0。用"检查每行均值为 0"的单元测试去验证 RMSNorm，一开始就会失败；应该检查"每行平方的均值为 1"。',
          },
          {
            kind: 'performance',
            text: '`rsqrt` 比 `1 / sqrt` 通常更快（部分硬件有原生 rsqrt 指令），并且可以避免一次除法。大规模前向时这个差别会被放大。',
          },
          {
            kind: 'leak',
            text: 'bf16 下 x 的平方很容易溢出（最大值约 3.4e38，平方后超过 1e19 就开始丢精度），所以 LLaMA 把归一化内的累加提升到 fp32，这是很多人自己实现时踩过的坑。',
          },
          {
            kind: 'interview',
            text: '常考：RMSNorm 相比 LayerNorm 省了什么？要点是"省掉均值计算与 beta 参数，且不损失效果"。回答时最好补上"实验证明重中心化收益很小"这一论据。',
          },
        ],
        demos: [
          {
            title: 'RMSNorm vs LayerNorm：数值与参数量对比',
            lang: 'python',
            code: `import numpy as np

def layer_norm(x, eps=1e-5):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

def rms_norm(x, gamma=None, eps=1e-6):
    gamma = np.ones(x.shape[-1]) if gamma is None else gamma
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True) + eps)
    return gamma * x / rms

x = np.array([[1.0, 2.0, 3.0, 4.0]])
ln, rn = layer_norm(x), rms_norm(x)
print("输入          :", x[0])
print("LayerNorm 输出:", np.round(ln[0], 4))
print("RMSNorm   输出:", np.round(rn[0], 4))
print("LayerNorm 均值:", round(float(ln.mean()), 6), " 方差:", round(float(ln.var()), 4))
print("RMSNorm   均值:", round(float(rn.mean()), 4), " 均方:", round(float((rn ** 2).mean()), 4))

print()
print("平移不变性: LN 对 x+10 输出不变?", np.allclose(layer_norm(x + 10), ln))
print("           RMSNorm 对 x+10 输出不变?", np.allclose(rms_norm(x + 10, eps=1e-5), rn))
print("缩放不变性: 两者都对 x*10 输出不变?",
      np.allclose(layer_norm(x * 10), ln, atol=1e-4), np.allclose(rms_norm(x * 10), rn))

print()
d = 4096
print(f"d={d} 时每个归一化层的参数量：LayerNorm {2 * d}，RMSNorm {d}，差值仅 {d} 个")
print(f"而一个注意力矩阵 Wq 是 {d * d} = {d * d:,} 个参数")
print(f"所以 RMSNorm 的主要收益是省掉减均值与 beta 的计算/访存，而不是参数量。")`,
          },
        ],
      },
      {
        id: 'llm-a3-c1-l3',
        title: '去掉均值与 beta：经验性发现与工程收益',
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释『经验性发现』的含义：重中心化的收益是实验观察而非数学等价；
2. 用共同模式（common mode）敏感性说明 RMSNorm 适用与不适用的场景；
3. 算清归一化层元素级运算约省一半、参数省 2d/处，但相对 67 亿总参数是噪声。

### 前置知识

- 「RMSNorm 公式」（l2）的手算结果；
- 对『参数量影响可忽略』的数量级直觉。

### 问题背景

训练 LLM 时损失曲线上莫名其妙的尖刺、深层网络不做 warmup 就不收敛，很多都能追到归一化层的设计。GPT-2 的 LayerNorm 在每个位置同时算均值和方差，而 LLaMA 换成了只除均方根的 RMSNorm——删掉的东西比留下的还多，效果反而更好。本章回答三个问题：归一化在解决什么、RMSNorm 删了什么、为什么敢删。

### 直觉理解

LayerNorm 像给每行数据做两次校准：先减去平均身高（居中），再除以身高的波动幅度（缩放）。RMSNorm 发现第二个动作才是主角——它只除以『平均功率的平方根』（信号学上的 RMS 音量），不再减均值。就像调音师只统一音量、不强行把所有轨道的中心频率归零；只要后续电路（线性层）不在乎直流偏移，去掉居中就白赚一半计算。

### 核心概念与原理详解

## "经验性发现"是什么意思

RMSNorm 的核心论证不是数学等价，而是**实验观察**：作者把 LayerNorm 的重中心化单独关掉，发现在多个任务上损失几乎不变。这一点值得强调，因为它在原理上是有"漏洞"的：

- 一个整体大幅偏移的向量（例如 [100, 101, 102, 103]）减去均值后变成 [-1.5, -0.5, 0.5, 1.5]，信息集中在"相对差异"上；
- RMSNorm 直接除以 RMS：得到 [0.994, 1.004, 1.014, 1.024]，**差异被巨大的共同偏移淹没了**。

也就是说，RMSNorm 对"共同模式（common mode）"非常敏感。它之所以工作得好，是因为在 Pre-Norm 的深层网络里，**残差流中的共同偏移本身不携带关键信息**（后续的 Linear 会把均值方向当作一个近乎恒定的偏置处理掉），而真正有用的是各维度的相对差异。

这一点的实践含义是：**RMSNorm 在 Transformer 上被验证有效，不等于它在任意结构上都优于 LayerNorm**。例如需要严格比较"两个向量形状是否相似"的度量学习场景，减均值仍然重要。

## 计算量到底省了多少

设向量长度为 d，对每个 token：

| 操作 | LayerNorm | RMSNorm |
| --- | --- | --- |
| 求均值 | d 次加法 + 1 次除法 | 无 |
| 求平方和 / 方差 | 2d（先减再平方）或 d | d 次乘加 |
| 归一化除法 | d 次 | d 次 |
| 仿射 | 2d 次乘加 | d 次乘加 |

粗略地说，元素级运算从约 6d 降到约 3d，**减少约一半**。在 d = 4096、每层两次归一化、几十层的模型上，这部分虽然只占总 FLOPs 的一小部分，但归一化层是**访存密集型**操作（每次都要把整行读进来），减少运算同时减少参数读取，对 kernel 融合后的延迟有可测量的帮助。

## 参数量对比（真实模型）

| 模型 | 层数 | d_model | 归一化方式 | 归一化总参数 |
| --- | --- | --- | --- | --- |
| GPT-2 small | 12 | 768 | LayerNorm（2d/处） | 12 乘 2 乘 2 乘 768 = 36,864 |
| LLaMA-2 7B | 32 | 4096 | RMSNorm（d/处） | (32 乘 2 + 1) 乘 4096 = 266,240 |
| LLaMA-2 7B 若用 LayerNorm | 32 | 4096 | LayerNorm（2d/处） | 532,480 |

相对 67 亿参数，26 万与 53 万的差别完全在噪声范围内。**所以"RMSNorm 省参数"这个说法虽然在数字上成立，但真正值得记住的是：它省的是计算步骤与一个"多余的自由度"，而不是模型大小。**

## 落地时的三个坑

1. **输出层前那个最终的 Norm 不能省**。GPT-2 有 ln_f，LLaMA 有 norm，它负责在把隐藏状态送进 lm_head 之前做最后一次尺度控制。
2. **RMSNorm 的 weight 初始化是全 1，不是随机**。因为它的作用就是对输入做归一化，random 初始化会把网络初始状态搞乱。
3. **不要把 LayerNorm 的预训练权重直接加载进 RMSNorm**：gamma 语义相同但 beta 无处安放，而且数值分布会偏移。从 GPT-2 迁移到 LLaMA 结构需要重新预训练或至少继续训练。

<Diagram type="arch" name="llama-assembly" />

上图是整门课的零件替换总览。第一步就是这张表里最"不起眼"的一行：LayerNorm 换 RMSNorm——它几乎不影响模型容量，却为后面的组合（尤其配合 Pre-Norm）提供了更简洁的算子。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
np.set_printoptions(precision=4, suppress=True)

def layer_norm(x, gamma=1.0, beta=0.0, eps=1e-6):
    mu = x.mean(-1, keepdims=True)
    var = ((x - mu) ** 2).mean(-1, keepdims=True)
    return gamma * (x - mu) / np.sqrt(var + eps) + beta

def rms_norm(x, gamma=1.0, eps=1e-6):
    rms = np.sqrt((x ** 2).mean(-1, keepdims=True) + eps)
    return gamma * x / rms

# ---- 1. 手算对照：x=[1,2,3,4] ----
x = np.array([1., 2., 3., 4.])
print("LayerNorm:", layer_norm(x))
print("RMSNorm :", rms_norm(x))
print("RMSNorm 输出均值 %.4f（不为0），输出均方 %.4f（≈1）" % (rms_norm(x).mean(), (rms_norm(x)**2).mean()))

# ---- 2. 不变性对比 ----
print("正缩放不变(RMSNorm):", np.allclose(rms_norm(10*x), rms_norm(x)))
print("整体平移 LayerNorm 不变:", np.allclose(layer_norm(x+10), layer_norm(x)))
print("整体平移 RMSNorm 变了:", not np.allclose(rms_norm(x+10), rms_norm(x)))

# ---- 3. 张量形状与 keepdims ----
X = np.random.default_rng(0).normal(size=(2, 3, 4096))
y = rms_norm(X)
print("形状不变:", X.shape == y.shape, "| 每行均方≈1:", bool(np.allclose((y**2).mean(-1), 1, atol=1e-4)))
try:
    X / np.sqrt((X**2).mean(-1))
except ValueError as e:
    print("keepdims=False 广播失败:", e)

# ---- 4. 低精度平方溢出：必须 fp32 归约 ----
v16 = np.float16(300.0)
print("fp16 下 300^2 =", v16 * v16, "-> LLaMA 在 RMSNorm 内部转 fp32 再归约")

# ---- 5. 参数量对比 ----
print("GPT-2 LN 参数:", 12*2*2*768)
print("LLaMA-2 7B RMSNorm 参数:", (32*2+1)*4096, "（若用 LN:", 32*2*2*4096, "）")\`\`\`

预期输出（实测）：手算对照：LayerNorm 输出 [-1.3416,-0.4472,0.4472,1.3416]，RMSNorm 输出 [0.3651,0.7303,1.0954,1.4606]（均值 0.9129 不为 0、均方 1.0000）；RMSNorm 正缩放不变=True、平移敏感=True，LayerNorm 平移不变=True；形状不变=True、每行均方≈1=True，keepdims=False 广播报错；fp16 下 300^2=inf（必须 fp32 归约）；GPT-2 LN 参数 36864 vs LLaMA RMSNorm 266240（LN 则 524288）。

**常见错误**：eps 写在 sqrt 外面，全常数输入时梯度变 nan；RMSNorm 的 weight 用随机初始化而不是全 1，开局就打乱残差流；把 LayerNorm 的预训练权重直接加载进 RMSNorm——beta 无处安放且数值分布偏移。

### 常见误区

1. **『RMSNorm 是 LayerNorm 的数学等价改写』**——不是：输出均值不为 0、对整体平移敏感，只是实证差距可忽略；\\n2. **『省参数是 RMSNorm 的主要收益』**——几十万参数相对 67 亿是噪声，真正省的是约一半元素级运算与访存；\\n3. **『归一化统计该在 batch 维做』**——那是 BatchNorm 的思路，NLP 的变长与 padding 会污染统计量，必须按最后一维逐 token 独立。

### 知识关联

- **向前**：c2 的 SwiGLU 同样遵循 LLaMA『全家无偏置』的思路；
- **向后**：c3 RoPE 的尺度守恒与 RMSNorm 的正缩放不变性配合干净；
- **平行**：llm-a1 讲训练稳定性时的 LayerNorm 是本章的对照原型。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| LayerNorm | 减均值 + 除标准差 + gamma/beta，2d 参数 |
| RMSNorm | 只除均方根 + gamma，d 参数；对正缩放不变、对平移敏感 |
| 主要收益 | 元素级运算约 6d→3d（省一半），参数收益可忽略 |
| 工程细节 | fp32 归约、weight 全 1 初始化、eps=1e-5（LLaMA）|
| Pre-Norm | 残差路径纯恒等，末尾仍需一个 final Norm |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'note',
            text: 'RMSNorm 的论文标题就是 Root Mean Square Norm，核心贡献是"重缩放比重中心化更重要"这一 2019 年的实验观察，后续被 LLaMA 等模型大规模验证。',
          },
          {
            kind: 'pitfall',
            text: '不要以为 RMSNorm 是 LayerNorm 的"近似"。对 [100, 101, 102, 103] 这类大偏移输入，两者结果差异巨大。它的有效性依赖于 Transformer 残差流的结构。',
          },
          {
            kind: 'interview',
            text: '追问"RMSNorm 对什么保持不变"：对任意正数 c，RMSNorm(c 乘 x) = RMSNorm(x)；但对平移不平移不变。能给出这个精确回答，说明你真的推导过。',
          },
        ],
        demos: [
          {
            title: '共同偏移下两种归一化的差异',
            lang: 'python',
            code: `import numpy as np

def layer_norm(x, eps=1e-5):
    mu = x.mean()
    return (x - mu) / np.sqrt(((x - mu) ** 2).mean() + eps)

def rms_norm(x, eps=1e-5):
    return x / np.sqrt((x ** 2).mean() + eps)

base = np.array([0.0, 1.0, 2.0, 3.0])
for c in (0, 10, 100, 1000):
    x = base + c
    ln, rn = layer_norm(x), rms_norm(x)
    print(f"偏移 {c:5d}: LN={np.round(ln, 3)}  RN={np.round(rn, 3)}")
    print(f"           LN 极差={np.ptp(ln):.3f}  RN 极差={np.ptp(rn):.4f}")

print()
print("结论：偏移越大，RMSNorm 输出的相对差异被压缩得越厉害。")
print("Transformer 之所以能用它，是因为残差流的共同偏移不承载关键信息。")

# 逐 token 批量实现：注意统计轴必须是最后一维
X = np.array([[1.0, 2.0, 3.0, 4.0],
              [10.0, 20.0, 30.0, 40.0]])
print()
print("逐 token 批量 RMSNorm:")
batch = X / np.sqrt((X ** 2).mean(axis=-1, keepdims=True) + 1e-5)
print(np.round(batch, 4))
print("每行均方:", np.round((batch ** 2).mean(axis=-1), 6))`,
          },
        ],
      },
      {
        id: 'llm-a3-c1-l4',
        title: 'RMSNorm 的张量形状与手算全流程',
        content: `
### 学习目标

学完本节，你应该能够：
1. 按 (2,3,4096)→(2,3,1) 的 keepdims 广播流程标注 RMSNorm 每步形状；
2. 用 numpy 实现并验证三条性质：形状不变、正缩放不变、输出均方为 1；
3. 解释『低精度存储 + 高精度归约』为什么是归约型算子的通用纪律。

### 前置知识

- 「RMSNorm 公式」（l2）；
- numpy 广播规则与 keepdims 语义。

### 问题背景

训练 LLM 时损失曲线上莫名其妙的尖刺、深层网络不做 warmup 就不收敛，很多都能追到归一化层的设计。GPT-2 的 LayerNorm 在每个位置同时算均值和方差，而 LLaMA 换成了只除均方根的 RMSNorm——删掉的东西比留下的还多，效果反而更好。本章回答三个问题：归一化在解决什么、RMSNorm 删了什么、为什么敢删。

### 直觉理解

LayerNorm 像给每行数据做两次校准：先减去平均身高（居中），再除以身高的波动幅度（缩放）。RMSNorm 发现第二个动作才是主角——它只除以『平均功率的平方根』（信号学上的 RMS 音量），不再减均值。就像调音师只统一音量、不强行把所有轨道的中心频率归零；只要后续电路（线性层）不在乎直流偏移，去掉居中就白赚一半计算。

### 核心概念与原理详解

## 形状标注：每一步都写清楚

以 LLaMA-2 7B 为例：d_model = 4096，batch B = 2，序列长度 n = 3。

<TensorFlow steps="(2,3,4096)|mean(-1)|(2,3,1)|+eps|rsqrt|(2,3,1)|broadcast|(2,3,4096)|gamma|(2,3,4096)" note="RMSNorm：先对最后一维求平方均值得到 (2,3,1)，再广播相除，最后乘 gamma。形状变化只有一次 keepdims 广播。" />

关键点只有两条：

1. **统计轴永远是最后一维**（axis = -1），因为特征维是 d，token 维必须互相独立；
2. **keepdims=True 是必须的**。若写成 mean(axis=-1) 得到形状 [2, 3]，与 [2, 3, 4096] 广播会失败（右侧对齐后变成 [2, 3] 对 3, 4096）。

## 逐步手算（小维度）

设 x = [1, 2, 3, 4]，gamma = [1, 1, 1, 1]，eps = 1e-6：

| 步骤 | 计算 | 结果 |
| --- | --- | --- |
| 平方 | x^2 | [1, 4, 9, 16] |
| 求和 | 1 + 4 + 9 + 16 | 30 |
| 平方均值 ms | 30 / 4 | 7.5 |
| 加 eps | 7.5 + 1e-6 | 7.500001 |
| 开方 rms | sqrt(7.500001) | 2.738613 |
| 除法 | x / rms | [0.3651, 0.7303, 1.0954, 1.4606] |
| 乘 gamma | 全 1 | 不变 |

若 gamma = [2, 2, 2, 2]，则每个元素再乘 2，输出的均方变成 4，RMS 变成 2。**这说明 gamma 直接控制该层的输出尺度**，它不是装饰品。

## 用 numpy 手写

\`\`\`python
def rms_norm(x, gamma=None, eps=1e-6):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True) + eps)
    return gamma * x / rms
\`\`\`

三条必须验证的性质：

- **形状不变**：输入 [B, n, d] 输出仍为 [B, n, d]；
- **正缩放不变**：rms_norm(3 乘 x) 与 rms_norm(x) 相等（差异小于浮点误差）；
- **输出均方为 1**（gamma 全 1 时）：mean(y^2, axis=-1) 约等于 1。

## 常见误区清单

1. **在 batch 维求均值**（axis=0）：这其实是 LayerNorm 的一种错误写法，会让不同样本互相影响；
2. **忘记减均值的同时还写了减均值**：有些人直接 copy LayerNorm 代码，只把 sqrt 内部改成二阶矩，结果减均值与二阶矩被重复使用，输出既不是 LayerNorm 也不是 RMSNorm；
3. **gamma 初始化为随机数**：应该全 1；
4. **eps 太大导致小向量被"洗白"**：当 x 的均方小于 eps 时（例如全零 padding 已 mask 掉、但某些层输出确实很小），输出几乎变成 x 全 0，此时若这些位置参与损失计算就会出问题；
5. **用 double 精度算再断言 1e-12**：PyTorch 的 fp32 累加有误差，测试容差至少给 1e-5。

## 什么时候该关心精度

LLaMA 在 bf16 下训练与推理，但 RMSNorm 内部把输入转成 fp32 计算。原因很直接：bf16 只有 8 位指数、7 位尾数，x^2 在累加 4096 项时会累积较大相对误差，且如果原值本身较大，x^2 可能超出 bf16 的动态范围。**"低精度存储 + 高精度归约"是所有归约型算子的通用做法**，这个模式在 softmax、LayerNorm、MoE 的 top-k 里都会复现。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
np.set_printoptions(precision=4, suppress=True)

def layer_norm(x, gamma=1.0, beta=0.0, eps=1e-6):
    mu = x.mean(-1, keepdims=True)
    var = ((x - mu) ** 2).mean(-1, keepdims=True)
    return gamma * (x - mu) / np.sqrt(var + eps) + beta

def rms_norm(x, gamma=1.0, eps=1e-6):
    rms = np.sqrt((x ** 2).mean(-1, keepdims=True) + eps)
    return gamma * x / rms

# ---- 1. 手算对照：x=[1,2,3,4] ----
x = np.array([1., 2., 3., 4.])
print("LayerNorm:", layer_norm(x))
print("RMSNorm :", rms_norm(x))
print("RMSNorm 输出均值 %.4f（不为0），输出均方 %.4f（≈1）" % (rms_norm(x).mean(), (rms_norm(x)**2).mean()))

# ---- 2. 不变性对比 ----
print("正缩放不变(RMSNorm):", np.allclose(rms_norm(10*x), rms_norm(x)))
print("整体平移 LayerNorm 不变:", np.allclose(layer_norm(x+10), layer_norm(x)))
print("整体平移 RMSNorm 变了:", not np.allclose(rms_norm(x+10), rms_norm(x)))

# ---- 3. 张量形状与 keepdims ----
X = np.random.default_rng(0).normal(size=(2, 3, 4096))
y = rms_norm(X)
print("形状不变:", X.shape == y.shape, "| 每行均方≈1:", bool(np.allclose((y**2).mean(-1), 1, atol=1e-4)))
try:
    X / np.sqrt((X**2).mean(-1))
except ValueError as e:
    print("keepdims=False 广播失败:", e)

# ---- 4. 低精度平方溢出：必须 fp32 归约 ----
v16 = np.float16(300.0)
print("fp16 下 300^2 =", v16 * v16, "-> LLaMA 在 RMSNorm 内部转 fp32 再归约")

# ---- 5. 参数量对比 ----
print("GPT-2 LN 参数:", 12*2*2*768)
print("LLaMA-2 7B RMSNorm 参数:", (32*2+1)*4096, "（若用 LN:", 32*2*2*4096, "）")\`\`\`

预期输出（实测）：手算对照：LayerNorm 输出 [-1.3416,-0.4472,0.4472,1.3416]，RMSNorm 输出 [0.3651,0.7303,1.0954,1.4606]（均值 0.9129 不为 0、均方 1.0000）；RMSNorm 正缩放不变=True、平移敏感=True，LayerNorm 平移不变=True；形状不变=True、每行均方≈1=True，keepdims=False 广播报错；fp16 下 300^2=inf（必须 fp32 归约）；GPT-2 LN 参数 36864 vs LLaMA RMSNorm 266240（LN 则 524288）。

**常见错误**：eps 写在 sqrt 外面，全常数输入时梯度变 nan；RMSNorm 的 weight 用随机初始化而不是全 1，开局就打乱残差流；把 LayerNorm 的预训练权重直接加载进 RMSNorm——beta 无处安放且数值分布偏移。

### 常见误区

1. **『RMSNorm 是 LayerNorm 的数学等价改写』**——不是：输出均值不为 0、对整体平移敏感，只是实证差距可忽略；\\n2. **『省参数是 RMSNorm 的主要收益』**——几十万参数相对 67 亿是噪声，真正省的是约一半元素级运算与访存；\\n3. **『归一化统计该在 batch 维做』**——那是 BatchNorm 的思路，NLP 的变长与 padding 会污染统计量，必须按最后一维逐 token 独立。

### 知识关联

- **向前**：c2 的 SwiGLU 同样遵循 LLaMA『全家无偏置』的思路；
- **向后**：c3 RoPE 的尺度守恒与 RMSNorm 的正缩放不变性配合干净；
- **平行**：llm-a1 讲训练稳定性时的 LayerNorm 是本章的对照原型。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| LayerNorm | 减均值 + 除标准差 + gamma/beta，2d 参数 |
| RMSNorm | 只除均方根 + gamma，d 参数；对正缩放不变、对平移敏感 |
| 主要收益 | 元素级运算约 6d→3d（省一半），参数收益可忽略 |
| 工程细节 | fp32 归约、weight 全 1 初始化、eps=1e-5（LLaMA）|
| Pre-Norm | 残差路径纯恒等，末尾仍需一个 final Norm |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'performance',
            text: '归约运算（求和、求平方和）在 bf16 下精度损失明显，PyTorch 的 `x.float()` 再归约是标准写法；numpy 里没有这个问题，但用 float32 显式声明更稳。',
          },
          {
            kind: 'pitfall',
            text: '`keepdims=True` 漏掉是手写归一化最常见的 bug。结果形状对不上时报错，但在某些形状下（例如 [n, d] 与 [d]）会静默广播出错的方向，结果全错却不报错。',
          },
          {
            kind: 'interview',
            text: '如果让你设计归一化层的单元测试，至少要覆盖：形状不变、正缩放不变、gamma 生效、常数输入不返回 nan。这四条能覆盖 80% 的实现错误。',
          },
        ],
        demos: [
          {
            title: '完整 RMSNorm：支持任意前导维度 + 性质验证',
            lang: 'python',
            code: `import numpy as np

def rms_norm(x, gamma=None, eps=1e-6):
    x = np.asarray(x, dtype=np.float64)
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else np.asarray(gamma, dtype=np.float64)
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True) + eps)
    return gamma * x / rms

rng = np.random.default_rng(0)
X = rng.normal(size=(2, 3, 8)) * 5

Y = rms_norm(X)
print("输入形状:", X.shape, " 输出形状:", Y.shape)
print("输出均方（每行）:", np.round((Y ** 2).mean(axis=-1).ravel()[:6], 6))
print("正缩放不变:", np.allclose(rms_norm(X * 7.0), Y))

g = np.linspace(0.5, 1.5, 8)
Yg = rms_norm(X, g)
print("gamma 生效（输出 RMS 按 gamma 的均方根放大）:",
      np.allclose(np.sqrt((Yg ** 2).mean(-1)), np.sqrt((g ** 2).mean())))

# 常数输入不能出 nan
const = np.full((1, 4), 3.0)
print("常数输入输出:", rms_norm(const), " 是否含 nan:", bool(np.isnan(rms_norm(const)).any()))

# 与 LayerNorm 参数量对比（d=4096，32 层 + 1 个最终 norm）
d, L = 4096, 32
print()
print(f"RMSNorm 总参数: {(2 * L + 1) * d:,}")
print(f"LayerNorm 总参数: {(2 * L + 1) * 2 * d:,}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a3-c1-e1',
        type: 'single',
        difficulty: 3,
        question: 'RMSNorm 与 LayerNorm 相比，最本质的差别是？',
        options: [
          { value: 'A', text: 'RMSNorm 的统计量在 batch 维上计算，LayerNorm 在特征维上计算' },
          { value: 'B', text: 'RMSNorm 不做重中心化（不减均值），只做重缩放；并且去掉了可学习的 beta' },
          { value: 'C', text: 'RMSNorm 把平方和换成绝对值之和，因此对异常值更鲁棒' },
          { value: 'D', text: 'RMSNorm 必须配合 Post-Norm 才能训练' },
        ],
        answer: 'B',
        explanation:
          'RMSNorm 只保留 `x / sqrt(mean(x**2) + eps)` 与 gamma 缩放，去掉了减均值与 beta。A 错：两者都在最后一维统计；C 错：分母仍是均方根；D 错：LLaMA 用的是 Pre-Norm，与 RMSNorm 无强绑定。',
        relatedLessonId: 'llm-a3-c1-l2',
        tags: ['RMSNorm', 'LayerNorm'],
      },
      {
        id: 'llm-a3-c1-e2',
        type: 'judge',
        difficulty: 3,
        question: 'RMSNorm 的输出向量每个维度的均值必然为 0。',
        answer: false,
        explanation:
          'LayerNorm 才保证输出均值为 0、方差为 1。RMSNorm 不减均值，只保证输出的平方均值约为 1（即向量长度为 sqrt(d)）。例如 x = [1, 2, 3, 4] 的 RMSNorm 输出约为 [0.365, 0.730, 1.095, 1.461]，均值约 0.913。',
        relatedLessonId: 'llm-a3-c1-l2',
        tags: ['RMSNorm', '性质'],
      },
      {
        id: 'llm-a3-c1-e3',
        type: 'fill',
        difficulty: 3,
        question: '补全 RMSNorm 的分母计算（`x` 形状为 [..., d]，eps 写在 sqrt 里面）：\n\n```python\ndef rms_norm(x, eps=1e-6):\n    rms = np.sqrt(___ + eps)\n    return x / rms\n```',
        blanks: [['(x ** 2).mean(axis=-1, keepdims=True)', '(x**2).mean(axis=-1, keepdims=True)', 'np.mean(x ** 2, axis=-1, keepdims=True)']],
        explanation:
          '需要沿最后一维求平方的均值，并保持 `[..., 1]` 形状才能与 `[..., d]` 广播相除。缺少 `keepdims=True` 时形状变成 `[...]`，在二维输入 [n, d] 下会按错误方向广播。',
        relatedLessonId: 'llm-a3-c1-l4',
        tags: ['RMSNorm', 'numpy', '广播'],
      },
      {
        id: 'llm-a3-c1-e4',
        type: 'multiple',
        difficulty: 3,
        question: '关于 RMSNorm 的性质，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '对任意正数 c，RMSNorm(c 乘 x) 与 RMSNorm(x) 相等（忽略 eps）' },
          { value: 'B', text: '对任意常数 c，RMSNorm(x + c) 与 RMSNorm(x) 相等' },
          { value: 'C', text: 'gamma 全为 1 时，输出的均方（mean of squares）约为 1' },
          { value: 'D', text: 'gamma 全为 2 时，输出的均方约为 4' },
        ],
        answer: ['A', 'C', 'D'],
        explanation:
          '正缩放不变是因为分子与分母同为线性；输出乘 gamma 后均方为 mean(gamma^2)（全 1 时 1，全 2 时 4）。B 错：平移会改变分母的平方和，而分子同步平移，结果必然改变。',
        relatedLessonId: 'llm-a3-c1-l3',
        tags: ['RMSNorm', '性质'],
      },
      {
        id: 'llm-a3-c1-e5',
        type: 'code',
        difficulty: 3,
        question:
          '实现 RMSNorm：`rms_norm(x, gamma=None, eps=1e-6)`，其中 x 形状为 [..., d]，gamma 形状为 [d]。\n\n要求：\n- 沿最后一维计算平方均值；\n- 支持任意前导维度（一维、二维、三维都要能用）；\n- gamma 缺省时等价于全 1。\n\n随后计算 `out = rms_norm(X)` 与 `out_g = rms_norm(X, g)`。',
        starterCode: `import numpy as np

def rms_norm(x, gamma=None, eps=1e-6):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    rms = ___                                  # [..., 1]
    return ___

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [3.0, 3.0, 3.0, 3.0]])
g = np.array([1.0, 1.0, 2.0, 2.0])
out = rms_norm(X)
out_g = rms_norm(X, g)
`,
        setupCode: '',
        expectedOutput: 'X 第一行输出约 [0.365, 0.730, 1.095, 1.461]；每行均方为 1',
        tests: `out = rms_norm(X)
out_g = rms_norm(X, g)
assert out.shape == X.shape, "输出形状应不变"
assert np.allclose(np.round(out[0], 4), [0.3651, 0.7303, 1.0954, 1.4606], atol=1e-3), f"第一行结果不对：{out[0]}"
assert np.allclose((out ** 2).mean(axis=-1), 1.0, atol=1e-4), "每行均方应为 1"
assert np.allclose(out[1], np.ones(4), atol=1e-4), "常数行的输出应为全 1"
assert abs(float((out_g[1] ** 2).mean()) - 2.5) < 1e-3, "常数行乘 gamma [1,1,2,2] 后均方应为 2.5"
assert np.allclose(out_g[:, 2:], out[:, 2:] * 2.0), "gamma 的缩放应逐个维度生效"
assert np.allclose(rms_norm(X[:1] * 5.0, eps=0.0), rms_norm(X[:1], eps=0.0)), "RMSNorm 对整体正缩放不变"
`,
        answer: `import numpy as np

def rms_norm(x, gamma=None, eps=1e-6):
    d = x.shape[-1]
    gamma = np.ones(d) if gamma is None else gamma
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True) + eps)
    return gamma * x / rms

X = np.array([[1.0, 2.0, 3.0, 4.0],
              [3.0, 3.0, 3.0, 3.0]])
g = np.array([1.0, 1.0, 2.0, 2.0])
out = rms_norm(X)
out_g = rms_norm(X, g)
`,
        explanation:
          '`rms = sqrt(mean(x^2) + eps)` 用 `keepdims=True` 保持 [..., 1]。第一行：平方和 30、均方 7.5、RMS 约 2.7386，输出 [0.3651, 0.7303, 1.0954, 1.4606]。第二行是全 3 的常数向量，除以自身 RMS 得到全 1——这是 RMSNorm 与 LayerNorm 行为一致的少数情形。gamma 全 2 时输出整体放大 2 倍，均方变成 4，所以 RMS 变成 2。',
        relatedLessonId: 'llm-a3-c1-l2',
        tags: ['RMSNorm', 'numpy', '实现'],
      },
      {
        id: 'llm-a3-c1-e6',
        type: 'code',
        difficulty: 3,
        question:
          '统计 **RMSNorm 与 LayerNorm 在完整模型中的参数量差异**。\n\n给定：隐藏维 `d`、Transformer 层数 `L`、词表大小 `V`（embedding 与 lm_head 共享、不参与归一化参数计数）。每个 Transformer 层含 2 个归一化层，再加上输出前 1 个最终归一化。\n\n请计算：\n- `rms_norm_params`：RMSNorm 方案下归一化层总参数；\n- `ln_norm_params`：LayerNorm 方案下的总参数（每处 2d）；\n- `diff`：两者差值；\n- `attn_params`：全部层的注意力权重参数（Q、K、V、O 各 d 乘 d，不含偏置，用 MHA 的 d 乘 d 近似）；\n- `ratio`：`diff / attn_params` 保留 4 位小数。\n\n参数：d = 4096，L = 32，V = 32000。',
        starterCode: `d, L, V = 4096, 32, 32000

rms_norm_params = ___          # (2L + 1) 处，每处 d
ln_norm_params = ___           # (2L + 1) 处，每处 2d
diff = ___

attn_params = ___              # L 层 x 4 个 d x d 矩阵
ratio = ___                    # 保留 4 位小数
`,
        setupCode: '',
        expectedOutput: 'diff = 266240，LN 归一化参数 532480，ratio ≈ 0.0005',
        tests: `assert rms_norm_params == 266240, f"RMSNorm 归一化参数应为 266240，实际 {rms_norm_params}"
assert ln_norm_params == 532480, f"LayerNorm 归一化参数应为 532480，实际 {ln_norm_params}"
assert diff == 266240, f"diff 应为 266240，实际 {diff}"
assert attn_params == 32 * 4 * 4096 * 4096, f"attn_params 计算不对：{attn_params}"
assert abs(ratio - 0.0001) < 1e-9, f"ratio 约为 0.0001，实际 {ratio}"
assert rms_norm_params * 2 == ln_norm_params, "RMSNorm 参数应恰为 LayerNorm 的一半"
`,
        answer: `d, L, V = 4096, 32, 32000

rms_norm_params = (2 * L + 1) * d
ln_norm_params = (2 * L + 1) * 2 * d
diff = ln_norm_params - rms_norm_params

attn_params = L * 4 * d * d
ratio = round(diff / attn_params, 4)
`,
        explanation:
          '每层 2 个归一化加输出前 1 个，共 2L+1 = 65 处。RMSNorm 每处 d = 4096，共 266,240；LayerNorm 每处 2d，共 532,480。注意力权重是 32 乘 4 乘 16,777,216 = 2,147,483,648，比值约 1.24e-4，保留 4 位小数得 0.0001。结论：RMSNorm 省下的参数比注意力权重小四个数量级，收益主要在计算与访存。',
        relatedLessonId: 'llm-a3-c1-l3',
        tags: ['RMSNorm', '参数量', '估算'],
      },
      {
        id: 'llm-a3-c1-e7',
        type: 'single',
        difficulty: 3,
        question: 'RMSNorm 论文《Root Mean Square Layer Normalization》给出的核心实验结论是？',
        options: [
          { value: 'A', text: '重中心化（减均值）比重缩放更重要' },
          { value: 'B', text: '重缩放是 LayerNorm 成功的主要来源，重中心化的成功率很小' },
          { value: 'C', text: '两者的效果完全等价，可以任意互换' },
          { value: 'D', text: 'LayerNorm 无法在 GPU 上高效实现' },
        ],
        answer: 'B',
        explanation:
          '作者通过消融发现，去掉减均值后损失几乎不变，于是提出只保留重缩放的 RMSNorm。这是一个**经验性**发现而非数学等价，所以它在别的结构上不一定成立。',
        relatedLessonId: 'llm-a3-c1-l3',
        tags: ['RMSNorm', '论文', '历史'],
      },
      {
        id: 'llm-a3-c1-e8',
        type: 'fill',
        difficulty: 3,
        question: 'GPT-2 的 Post-Norm 是 `x = Norm(x + Sublayer(x))`，LLaMA 的 Pre-Norm 是 `x = x + Sublayer(Norm(x))`。\n\n补全 LLaMA 风格的这一句（`attn` 是已算好的子层输出）：\n\n```python\nh = norm1(x)\nx = x + ___\n```',
        blanks: [['attn', 'self_attn(h)', 'attn(h)', 'attention(h)']],
        explanation:
          'Pre-Norm 把归一化放在子层**内部**的输入侧，残差分支保持纯恒等。这样梯度沿残差直达底层，深层训练不需要激进 warmup。注意归一化不改变形状，所以整个 Block 的输入输出形状一致。',
        relatedLessonId: 'llm-a3-c1-l1',
        tags: ['Pre-Norm', '残差'],
      },
      {
        id: 'llm-a3-c1-e9',
        type: 'judge',
        difficulty: 3,
        question: 'LayerNorm 对每个 token 位置独立地在特征维上归一化，因此同一条序列中不同位置的 token 不会互相影响。',
        answer: true,
        explanation:
          '这正是 LayerNorm 适合序列建模的原因：统计量只沿最后一维（特征维 d）计算，每个 [d] 向量独立处理，padding 位置也不会污染其他位置。相比之下 BatchNorm 在 batch 维统计，会受 padding 与 batch 组成影响。',
        relatedLessonId: 'llm-a3-c1-l1',
        tags: ['LayerNorm', '统计轴'],
      },
      {
        id: 'llm-a3-c1-e10',
        type: 'multiple',
        difficulty: 4,
        question: '下列关于"为什么 Transformer 不用 BatchNorm 用 LayerNorm"的说法，正确的有？（多选）',
        options: [
          { value: 'A', text: '序列的 padding 位置会污染 batch 维统计量' },
          { value: 'B', text: '推理时 batch 由用户请求决定，统计量不稳定' },
          { value: 'C', text: 'BatchNorm 的参数比 LayerNorm 多得多' },
          { value: 'D', text: 'LayerNorm 对每个 token 独立统计，天然适配变长序列' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 错：两者的可学习参数规模相当（都是 2d 或 d）。A、B 是 BatchNorm 在 NLP 场景的致命缺陷，D 是 LayerNorm 的优势所在。',
        relatedLessonId: 'llm-a3-c1-l1',
        tags: ['LayerNorm', 'BatchNorm'],
      },
      {
        id: 'llm-a3-c1-e11',
        type: 'code',
        difficulty: 4,
        question:
          '对比 LayerNorm 与 RMSNorm 的**平移不变性**。\n\n给定常数向量 `base = [0, 1, 2, 3]`，对偏移量 `c` 取 0、10、100、1000，分别计算两种归一化后的输出极差（max - min）：\n\n- `ln_ranges`、`rn_ranges`：两个长度 4 的列表（保留 6 位小数）；\n- `invariant_ln`、`invariant_rn`：平移后极差是否与 c=0 时相同（布尔）。\n\n实现 `layer_norm_1d` 与 `rms_norm_1d`（eps = 1e-5）。',
        starterCode: `import numpy as np

def layer_norm_1d(x, eps=1e-5):
    mu = x.mean()
    return ___

def rms_norm_1d(x, eps=1e-5):
    return ___

base = np.array([0.0, 1.0, 2.0, 3.0])
offsets = (0, 10, 100, 1000)

ln_ranges = []
rn_ranges = []
for c in offsets:
    x = base + c
    ln_ranges.append(___)
    rn_ranges.append(___)

invariant_ln = ___
invariant_rn = ___
`,
        setupCode: '',
        expectedOutput: 'ln_ranges 恒为 2.683271；rn_ranges 依次约 1.6036、0.2596、0.0296、0.0030',
        tests: `assert len(ln_ranges) == 4 and len(rn_ranges) == 4, "两个列表长度都应为 4"
assert np.allclose(ln_ranges, 2.683271, atol=1e-4), f"LayerNorm 输出极差应恒为 2.6833，实际 {ln_ranges}"
assert rn_ranges[0] > rn_ranges[1] > rn_ranges[2] > rn_ranges[3], f"RMSNorm 极差应随偏移单调缩小，实际 {rn_ranges}"
assert abs(rn_ranges[0] - 1.6036) < 1e-3, f"偏移 0 时 RMSNorm 极差约 1.6036，实际 {rn_ranges[0]}"
assert abs(rn_ranges[1] - 0.2596) < 1e-3, f"c=10 时 RMSNorm 极差约 0.2596，实际 {rn_ranges[1]}"
assert abs(rn_ranges[3] - 0.0030) < 1e-3, f"c=1000 时 RMSNorm 极差约 0.0030，实际 {rn_ranges[3]}"
assert invariant_ln is True, "LayerNorm 应具有平移不变性"
assert invariant_rn is False, "RMSNorm 不具有平移不变性"
assert rn_ranges[3] < 0.01, "偏移 1000 时 RMSNorm 输出几乎被压平"
`,
        answer: `import numpy as np

def layer_norm_1d(x, eps=1e-5):
    mu = x.mean()
    return (x - mu) / np.sqrt(((x - mu) ** 2).mean() + eps)

def rms_norm_1d(x, eps=1e-5):
    return x / np.sqrt((x ** 2).mean() + eps)

base = np.array([0.0, 1.0, 2.0, 3.0])
offsets = (0, 10, 100, 1000)

ln_ranges = []
rn_ranges = []
for c in offsets:
    x = base + c
    ln_ranges.append(float(np.ptp(layer_norm_1d(x))))
    rn_ranges.append(float(np.ptp(rms_norm_1d(x))))

invariant_ln = bool(np.allclose(ln_ranges, ln_ranges[0], atol=1e-8))
invariant_rn = bool(np.allclose(rn_ranges, rn_ranges[0], atol=1e-8))
`,
        explanation:
          'LayerNorm 先减均值，[c, c+1, c+2, c+3] 与 [0, 1, 2, 3] 的中心化结果完全相同，极差恒为 3 除以 sqrt(1.25) 约 2.6833。RMSNorm 不减均值，偏移越大分母越大、相对差异被压缩得越小：偏移 0 时极差约 1.6036，c=10 时约 0.2596，c=1000 时只剩 0.003。这就是"RMSNorm 对共同偏移敏感"的定量体现，也解释了为什么它只在残差流上成立。注意 eps 会让 LayerNorm 的极差略小于理论值 2.68328，断言容差用 1e-4。',
        relatedLessonId: 'llm-a3-c1-l3',
        tags: ['RMSNorm', '平移不变性', '对比'],
      },
      {
        id: 'llm-a3-c1-e12',
        type: 'single',
        difficulty: 3,
        question: '在 LLaMA 的实现中，RMSNorm 内部常常写成 `x = x.float()` 后再计算。最合理的理由是？',
        options: [
          { value: 'A', text: 'float32 的参数更少，能省显存' },
          { value: 'B', text: 'bf16 只有 8 位指数，平方累加时精度不足甚至可能溢出' },
          { value: 'C', text: 'float32 让归一化层的形状与其他层对齐' },
          { value: 'D', text: 'PyTorch 不支持 bf16 的 mean 操作' },
        ],
        answer: 'B',
        explanation:
          '归约型算子（平方和、softmax 的分母）在低精度下有累积误差与溢出风险，业界惯例是"低精度存储、fp32 归约"。这与参数量、形状无关，PyTorch 也支持 bf16 的 mean。',
        relatedLessonId: 'llm-a3-c1-l4',
        tags: ['RMSNorm', '精度', 'bf16'],
      },
      {
        id: 'llm-a3-c1-e13',
        type: 'judge',
        difficulty: 3,
        question: '把 RMSNorm 的 gamma 初始化为随机正态分布（而不是全 1），训练效果会与全 1 初始化基本一致，因为 gamma 会自己学出来。',
        answer: false,
        explanation:
          '全 1 初始化保证网络初始时该层"近似恒等缩放"，与后续层的初始化量级匹配。随机初始化会让每个维度的初始尺度不同，深层堆叠时造成尺度失衡，常导致训练初期 loss 抖动甚至发散。',
        relatedLessonId: 'llm-a3-c1-l4',
        tags: ['RMSNorm', '初始化'],
      },
      {
        id: 'llm-a3-c1-e14',
        type: 'fill',
        difficulty: 4,
        question: '写出 RMSNorm 的反向传播中，对输入 x 的梯度系数。设 r = sqrt((1/d) 乘 sum x_k^2 + eps)，y_i = gamma_i 乘 x_i / r，那么 dy_i/dx_j 中"x_j 自身那一项"的系数是：\n\n```python\ndy_i_dx_i = gamma_i 乘 (___)\n```\n\n（只写括号内部分，用 d、r、x_i 表示）',
        blanks: [['1 / r - x_i ** 2 / (d * r ** 3)', '1/r - x_i**2/(d*r**3)', '1 / r - x_i * x_i / (d * r ** 3)']],
        explanation:
          'y_i = gamma_i 乘 x_i 乘 r^(-1)，对 x_i 全微分：r^(-1) + x_i 乘 (-1) 乘 r^(-2) 乘 (dr/dx_i)，而 dr/dx_i = x_i / (d 乘 r)。代入得 1/r - x_i^2 / (d 乘 r^3)。这个"−1/d 项"来自归一化带来的耦合：每个维度拉大自己都会抬高分母，从而轻微压缩所有维度。',
        relatedLessonId: 'llm-a3-c1-l2',
        tags: ['RMSNorm', '推导', '反向传播'],
      },
      {
        id: 'llm-a3-c1-e15',
        type: 'code',
        difficulty: 4,
        question:
          '实现**两种归一化的 FLOPs 计数**（只统计逐元素乘加，每个乘或加算 1 FLOP），对每个 token 统计：\n\n- LayerNorm：求均值 d-1 次加法；求方差 2d；除法求 rsqrt 记作 d；归一化乘法 2d；affine 4d（乘加各 2d）；\n- RMSNorm：平方累加 2d；rsqrt 记作 d；归一化乘法 2d；affine 2d。\n\n返回 `ln_flops`、`rn_flops`、`saved_ratio`（保留 4 位小数），参数取 d = 4096。',
        starterCode: `d = 4096

# LayerNorm: (d-1) + 2d + d + 2d + 4d
ln_flops = ___
# RMSNorm: 2d + d + 2d + 2d
rn_flops = ___
saved_ratio = ___
`,
        setupCode: '',
        expectedOutput: 'ln_flops = 36864，rn_flops = 28672，saved_ratio ≈ 0.2222',
        tests: `assert ln_flops == 4095 + 2 * 4096 + 4096 + 2 * 4096 + 4 * 4096, f"ln_flops 应为 36863，实际 {ln_flops}"
assert rn_flops == 7 * 4096, f"rn_flops 应为 28672，实际 {rn_flops}"
assert saved_ratio < 0.5 and saved_ratio > 0.1, f"节省比例应在 0.1 到 0.5 之间，实际 {saved_ratio}"
assert rn_flops < ln_flops, "RMSNorm 的逐元素运算应更少"
`,
        answer: `d = 4096

ln_flops = (d - 1) + 2 * d + d + 2 * d + 4 * d
rn_flops = 2 * d + d + 2 * d + 2 * d
saved_ratio = round((ln_flops - rn_flops) / ln_flops, 4)
`,
        explanation:
          '按本题的口径：LayerNorm 约 9d（36864），RMSNorm 约 7d（28672），逐元素运算减少约 22.2%。不同统计口径（是否把除法、rsqrt 计入，是否把 affine 计入）会得到 22% 到 29% 之间的不同数字，重要的是**结论稳定**：RMSNorm 少做一次"减均值"与一半的 affine，同时少读 d 个 beta 参数。实际收益更多体现在访存与 kernel 融合上。',
        relatedLessonId: 'llm-a3-c1-l3',
        tags: ['RMSNorm', '性能', '估算'],
      },
      {
        id: 'llm-a3-c1-e16',
        type: 'single',
        difficulty: 4,
        question: '在 LLaMA 的结构中，归一化层的位置是「h = x + Attn(RMSNorm(x))」，而 GPT-2 是「h = LayerNorm(x + Attn(x))」。把 LLaMA 改成 GPT-2 的 Post-Norm 后，最直接的风险是？',
        options: [
          { value: 'A', text: 'KV Cache 显存翻倍' },
          { value: 'B', text: '残差不再是恒等路径，深层网络更容易梯度消失/爆炸，需要 warmup 等技巧' },
          { value: 'C', text: '模型无法使用 RoPE' },
          { value: 'D', text: '词表必须重新训练' },
        ],
        answer: 'B',
        explanation:
          'Post-Norm 把残差包在归一化内部，梯度回传时必须穿过归一化层，深层堆叠时数值不稳定。KV Cache、RoPE、词表都与归一化位置无关。',
        relatedLessonId: 'llm-a3-c1-l1',
        tags: ['Pre-Norm', 'Post-Norm'],
      },
      {
        id: 'llm-a3-c1-e17',
        type: 'multiple',
        difficulty: 4,
        question: '为什么 LLaMA 可以安全地去掉 RMSNorm 的 beta 参数？（多选）',
        options: [
          { value: 'A', text: '常数偏移的效果可以由后续线性层的偏置（或权重）吸收' },
          { value: 'B', text: 'beta 的参数量太小，去掉它能让模型变小很多' },
          { value: 'C', text: 'Transformer 的残差流中共同偏移不承载关键信息，后面接的 Linear 会把它当作恒定偏置' },
          { value: 'D', text: '去掉 beta 后幂等性更强，使 gamma 成为唯一的尺度控制自由度' },
        ],
        answer: ['A', 'C', 'D'],
        explanation:
          'B 是错误陈述：beta 只有 d 个参数，相对总参数量可以忽略。A、C 是从表达能力角度说明 beta 冗余，D 是从设计简洁性角度。注意 LLaMA 的 Linear 大多没有 bias，但训练中仍可把等效偏移学到后续权重里。',
        relatedLessonId: 'llm-a3-c1-l3',
        tags: ['RMSNorm', 'beta', '设计'],
      },
      {
        id: 'llm-a3-c1-e18',
        type: 'judge',
        difficulty: 4,
        question: 'RMSNorm 比 LayerNorm 在「相同隐藏维」下参数量更少，这是它被 LLaMA 采用的主要原因。',
        answer: false,
        explanation:
          '参数量差异只有 d 个（LLaMA-2 7B 中约 26 万 vs 53 万，占 6.7e9 的千分之几），完全可以忽略。真正原因有四条：省掉减均值与 beta 的元素级运算与访存、实验证明效果不损失、实现更简单便于 kernel 融合、与 Pre-Norm 组合良好。',
        relatedLessonId: 'llm-a3-c1-l3',
        tags: ['RMSNorm', '工程判断'],
      },
      {
        id: 'llm-a3-c1-e19',
        type: 'code',
        difficulty: 4,
        question:
          '实现 `rms_norm` 与 `layer_norm` 各自对**批量形状 [B, n, d]** 的支持，并逐项验证性质。\n\n要求：\n- 两个函数签名均为 `(x, eps=1e-6)`，gamma/beta 取默认；\n- `shape_ok`：两函数输出的形状是否都等于输入形状；\n- `scale_inv`：rms_norm(x * 4) 与 rms_norm(x) 是否接近相等；\n- `mean_zero_ln`：layer_norm 输出每行均值是否约 0（布尔）；\n- `mean_zero_rn`：rms_norm 输出每行均值是否约 0（布尔，应当为 False）。',
        starterCode: `import numpy as np

def rms_norm(x, eps=1e-6):
    return ___

def layer_norm(x, eps=1e-6):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return ___

rng = np.random.default_rng(0)
X = rng.normal(size=(2, 3, 8))

shape_ok = ___
scale_inv = ___
mean_zero_ln = ___
mean_zero_rn = ___
`,
        setupCode: '',
        expectedOutput: 'RMSNorm 与 LayerNorm 形状不变；RMSNorm 缩放不变；只有 LayerNorm 输出均值为 0',
        tests: `assert shape_ok is True, "两种归一化都应保持形状不变"
rn, ln = rms_norm(X), layer_norm(X)
assert np.allclose((rn ** 2).mean(axis=-1), 1.0, atol=1e-4), "RMSNorm 每行均方应为 1"
assert np.allclose(ln.mean(axis=-1), 0.0, atol=1e-6), "LayerNorm 每行均值应为 0"
assert np.allclose(ln.var(axis=-1), 1.0, atol=1e-2), "LayerNorm 每行方差应约 1"
assert scale_inv is True, "RMSNorm 应具有正缩放不变性"
assert mean_zero_ln is True, "LayerNorm 输出均值应约 0"
assert mean_zero_rn is False, "RMSNorm 输出均值一般不为 0"
`,
        answer: `import numpy as np

def rms_norm(x, eps=1e-6):
    rms = np.sqrt((x ** 2).mean(axis=-1, keepdims=True) + eps)
    return x / rms

def layer_norm(x, eps=1e-6):
    mu = x.mean(axis=-1, keepdims=True)
    var = ((x - mu) ** 2).mean(axis=-1, keepdims=True)
    return (x - mu) / np.sqrt(var + eps)

rng = np.random.default_rng(0)
X = rng.normal(size=(2, 3, 8))

shape_ok = rms_norm(X).shape == X.shape and layer_norm(X).shape == X.shape
scale_inv = bool(np.allclose(rms_norm(X * 4.0), rms_norm(X), atol=1e-5))
mean_zero_ln = bool(np.allclose(layer_norm(X).mean(axis=-1), 0.0, atol=1e-6))
mean_zero_rn = bool(np.allclose(rms_norm(X).mean(axis=-1), 0.0, atol=1e-6))
`,
        explanation:
          '这四条断言恰好是一份最小可用的归一化层测试集：形状不变、统计量正确、正缩放不变、均值的处理差异。注意 `mean_zero_rn` 必须是 False——如果它变成 True，说明你的"RMSNorm"其实偷偷减了均值。',
        relatedLessonId: 'llm-a3-c1-l4',
        tags: ['RMSNorm', 'LayerNorm', '测试'],
      },
      {
        id: 'llm-a3-c1-e20',
        type: 'open',
        difficulty: 4,
        question:
          '某团队准备把自家 GPT-2 风格的模型（LayerNorm、GELU FFN、绝对位置编码）迁移到 LLaMA 架构。他们想"先把 LayerNorm 换成 RMSNorm 就能获得加速"。请评价这个判断，并给出你的实施建议。',
        referenceAnswer: `**判断：部分正确，但不能孤立地换**

1. RMSNorm 的收益主要是**逐元素运算与访存**的减少，而不是参数量。相对注意力与 FFN 的矩阵乘，这部分 FLOPs 占比不大，单独替换的加速通常只有几个百分点；
2. RMSNorm 的有效性依赖"残差流共同偏移不承载关键信息"这一前提，而这与 **Pre-Norm** 结构密切相关。原模型是 Post-Norm 时，必须先改成 Pre-Norm 再换 RMSNorm；
3. 去掉 beta 后，输出的均值不再被强制为 0，初次替换时下游层的输入分布会漂移，**必须继续训练**而不是仅做权重替换。

**实施建议**

1. 结构侧：先改 Pre-Norm（x + Sublayer(Norm(x))），并在输出前加最终 Norm；
2. 参数侧：gamma 初始化全 1，从 LayerNorm 的 gamma 拷贝初值（语义一致）；beta 丢弃；
3. 数值侧：归一化内部用 fp32 归约，eps 与 LLaMA 对齐（1e-5），避免 bf16 溢出；
4. 验证侧：跑通"形状不变、正缩放不变、每行均方为 1"三条单测，再对比短训练（如 1B token）的 loss 曲线与下游评测；
5. 性能侧：把 RMSNorm 与后续 Linear 做 kernel 融合，收益才明显；单看归一化算子自身的加速很有限；
6. 风险侧：如果模型在长上下文或数值敏感的回归任务上部署，要额外抽查输出分布，确认没有因去掉重中心化而偏移。`,
        rubric: [
          { point: '指出 RMSNorm 收益主要在计算/访存而非参数量', score: 2 },
          { point: '指出 RMSNorm 与 Pre-Norm 的耦合关系，不能孤立替换', score: 2 },
          { point: '给出可执行的迁移步骤（gamma 拷贝、beta 丢弃、继续训练）', score: 2 },
          { point: '给出验证与性能融合手段', score: 1 },
        ],
        keywords: ['Pre-Norm', 'gamma', 'beta', '归约', '融合', '继续训练', 'eps'],
        explanation:
          '优秀的回答会区分"算子层面的收益"和"结构层面的前提"，并给出可验证的迁移清单。只回答"能加速"而不提继续训练与 Pre-Norm 关系的，属于只记住了结论。',
        tags: ['RMSNorm', '迁移', '工程'],
      },
      {
        id: 'llm-a3-c1-e21',
        type: 'single',
        difficulty: 3,
        question: '某实现中 eps 写在 sqrt 外面：`rms = np.sqrt((x ** 2).mean(-1, keepdims=True)) + eps`。当输入是**全零向量**时，输出会是什么？',
        options: [
          { value: 'A', text: '全 0' },
          { value: 'B', text: '全 nan' },
          { value: 'C', text: '全 1' },
          { value: 'D', text: '随 gamma 变化' },
        ],
        answer: 'A',
        explanation:
          '全零时 sqrt(0) = 0，分母变成 0 + eps = eps（1e-6），0 / 1e-6 = 0，所以输出全 0。看起来"没事"，但反向传播时该处的梯度会出现 0/eps 的放大，最终可能变成 nan。写到 sqrt 内部才会得到 0 / sqrt(eps) = 0 的稳定结果。',
        relatedLessonId: 'llm-a3-c1-l4',
        tags: ['RMSNorm', 'eps', '数值稳定'],
      },
      {
        id: 'llm-a3-c1-e22',
        type: 'multiple',
        difficulty: 4,
        question: '下面哪些现象说明你的 RMSNorm 实现有 bug？（多选）',
        options: [
          { value: 'A', text: '输入形状 [2, 5, 8]，输出形状变成 [2, 5, 1]' },
          { value: 'B', text: 'gamma 全 1 时，输出的每行均值精确为 0' },
          { value: 'C', text: '把输入整体乘以 3，输出随之改变了 3 倍' },
          { value: 'D', text: '改变 batch 中某个样本的数值，其他样本的输出也跟着变了' },
        ],
        answer: ['A', 'B', 'C', 'D'],
        explanation:
          'A：丢掉广播，说明 keepdims 或除法方向有问题；B：RMSNorm 不该减均值，输出均值精确为 0 说明代码里漏进了 LayerNorm 的逻辑；C：违反正缩放不变性；D：说明统计量在 batch 维上算了（axis 写错）。四条正好组成一个"反向 bug 检测清单"。',
        relatedLessonId: 'llm-a3-c1-l4',
        tags: ['RMSNorm', '调试', '测试'],
      },
      {
        id: 'llm-a3-c1-e23',
        type: 'judge',
        difficulty: 3,
        question: 'RMSNorm 与 LayerNorm 在输入是「所有元素相同」的常数向量时，输出行为一致。',
        answer: false,
        explanation:
          '常数向量 [a, a, ..., a]：RMSNorm 的 RMS 恰等于 |a|，所以输出是全 1（再乘 gamma）；LayerNorm 减均值后全部为 0，方差为 0，除以 sqrt(eps) 仍是全 0，输出全 0（再乘 beta）。两者行为完全不同，这也是归一化层单测里最容易被忽略的边界情形。',
        relatedLessonId: 'llm-a3-c1-l2',
        tags: ['RMSNorm', '边界情况'],
      },
      {
        id: 'llm-a3-c1-e24',
        type: 'code',
        difficulty: 3,
        question:
          '实现**逐 token 的手算版 RMSNorm**（不使用 `mean`，用显式循环，用于教学打印）。\n\n要求：\n- `rms_norm_manual(x)` 逐行处理，返回 `(rows, ms_list, rms_list)`；\n- `rows` 是列表的列表（每行是一个 list），`ms_list` 是每行平方均值，`rms_list` 是每行均方根；\n- eps = 1e-6。',
        starterCode: `X = [[1.0, 2.0, 3.0, 4.0], [3.0, 3.0, 3.0, 3.0]]
EPS = 1e-6

def rms_norm_manual(x):
    rows, ms_list, rms_list = [], [], []
    for row in x:
        s = ___
        ms = s / len(row)
        r = ___
        ms_list.append(ms)
        rms_list.append(r)
        rows.append([___ for v in row])
    return rows, ms_list, rms_list

rows, ms_list, rms_list = rms_norm_manual(X)
`,
        setupCode: '',
        expectedOutput: '第一行保留 4 位小数为 [0.3651, 0.7303, 1.0954, 1.4606]，ms_list = [7.5, 9.0]',
        tests: `import numpy as np
assert len(rows) == 2 and len(rows[0]) == 4, "输出应有 2 行、每行 4 个元素"
assert abs(ms_list[0] - 7.5) < 1e-9, f"第一行平方均值应为 7.5，实际 {ms_list[0]}"
assert abs(ms_list[1] - 9.0) < 1e-9, f"第二行平方均值应为 9.0，实际 {ms_list[1]}"
assert np.allclose(np.round(rows[0], 4), [0.3651, 0.7303, 1.0954, 1.4606], atol=1e-9), f"第一行结果不对：{rows[0]}"
assert np.allclose(rows[1], [1.0, 1.0, 1.0, 1.0]), "常数行的输出应为全 1"
assert abs(rms_list[0] - 7.5 ** 0.5) < 1e-5, f"第一行均方根应约为 2.7386，实际 {rms_list[0]}"
`,
        answer: `X = [[1.0, 2.0, 3.0, 4.0], [3.0, 3.0, 3.0, 3.0]]
EPS = 1e-6

def rms_norm_manual(x):
    rows, ms_list, rms_list = [], [], []
    for row in x:
        s = sum(v * v for v in row)
        ms = s / len(row)
        r = (ms + EPS) ** 0.5
        ms_list.append(ms)
        rms_list.append(r)
        rows.append([v / r for v in row])
    return rows, ms_list, rms_list

rows, ms_list, rms_list = rms_norm_manual(X)
`,
        explanation:
          '手算流程：平方 → 求和 → 除以 d 得 ms → 加 eps 开方得 r → 逐元素相除。`(ms + EPS) ** 0.5` 与 `np.sqrt` 等价，注意 eps 一定要在开方之前加。第二行是常数向量，平方均值 9，开方 3，输出全 1。',
        relatedLessonId: 'llm-a3-c1-l4',
        tags: ['RMSNorm', '手算', '实现'],
      },
      {
        id: 'llm-a3-c1-e25',
        type: 'single',
        difficulty: 3,
        question: 'LLaMA 在输出前保留了一个"最终的 RMSNorm"（在 lm_head 之前），它的作用是？',
        options: [
          { value: 'A', text: '把最后的隐藏状态归一化到可控尺度，避免 logits 数值过大或过小' },
          { value: 'B', text: '把隐藏维从 d 降到词表大小 V' },
          { value: 'C', text: '替代位置编码' },
          { value: 'D', text: '压缩 KV Cache' },
        ],
        answer: 'A',
        explanation:
          'Pre-Norm 结构中中间层都只"归一化后再计算"，残差流的尺度会逐层累积。最后再加一次归一化，保证送进 lm_head 的向量尺度稳定，使 softmax 的 logits 处在合理范围。把 d 降到 V 是 lm_head 的职责，与归一化无关。',
        relatedLessonId: 'llm-a3-c1-l1',
        tags: ['Pre-Norm', 'LLaMA 结构'],
      },
      {
        id: 'llm-a3-c1-e26',
        type: 'fill',
        difficulty: 5,
        question: 'LLaMA-2 7B 的配置是 V = 32000、d = 4096、L = 32，每个位置有 2 个 RMSNorm，再加 1 个最终 RMSNorm。\n\n归一化层的总参数量 = 4096 乘以 ___（填数字）。',
        blanks: [['65', '(2 * 32 + 1)', '2*32+1', '2 * 32 + 1']],
        explanation:
          '32 层乘每层 2 处 = 64 处，加最终 1 处共 65 处，每处 4096 个参数，合计 266,240。这个数字相比 67 亿总参数可以忽略，再次印证"RMSNorm 不省参数，省的是计算与自由度"。',
        relatedLessonId: 'llm-a3-c1-l3',
        tags: ['RMSNorm', '参数量', 'LLaMA'],
      },
    ],
  },
  {
    id: 'llm-a3-c2',
    title: 'SwiGLU：升级前馈网络',
    goal: '理解 FFN 在 Transformer 中的角色，从 GLU 推导到 SwiGLU，掌握门控带来的参数变化与 8/3 倍 d_ff 的由来，并能手算参数量与实现前向。',
    lessons: [
      {
        id: 'llm-a3-c2-l1',
        title: 'FFN 回顾：ReLU、GELU 与激活函数的作用',
        content: `
## 学习目标

学完本节，你应该能够：
1. 说明激活函数在 FFN 中的三重角色（引入非线性/可导/计算廉价），没有它两层 MLP 会塌缩成一层；
2. 手算 ReLU 与 GELU 在关键点的取值差异（如 x=−1 时 0 vs −0.159），解释"软 ReLU"的平滑价值；
3. 说出 ReLU→GELU→SiLU 的演进线索及各代代表的模型。

## 前置知识

- FFN 的升维-激活-降维结构（llm-a1 c2-l5）；
- sigmoid 函数与标准正态 CDF Φ(x) 的形状。

## 问题背景：没有非线性，再深也是一层

线性变换的复合仍是线性：$W_2(W_1 x) = (W_2 W_1)x$——两层不带激活的 MLP 等价于一层矩阵。**激活函数是网络表达力的唯一来源**，但它的选择直接决定梯度行为：ReLU 负区梯度恒 0（死神经元）、导数不连续（优化面有棱）；GPT 系的演进 ReLU→GELU→SiLU 是一条"把硬开关换成软开关"的路线。

## 直觉理解：闸门 vs 调光器

- **ReLU 是闸门**：负数一刀切死（输出 0），正数全通过——快，但负区神经元永久失明的风险（dead ReLU）；
- **GELU/SiLU 是调光器**：负区不是全关，而是"调到很暗"（小负值输出，如 x=−1 时 GELU 输出 −0.159），且处处光滑可导——微小信号仍能传梯度，优化面平滑。

## 核心概念：三代激活函数

$$\\mathrm{ReLU}(x) = \\max(0, x), \\quad \\mathrm{GELU}(x) = x \\cdot \\Phi(x), \\quad \\mathrm{SiLU}(x) = x \\cdot \\sigma(x)$$

其中 Φ 是标准正态 CDF（工程上用 tanh 近似），σ 是 sigmoid。SiLU 又名 Swish。

**关键点取值对照（实算）**：

| x | ReLU | GELU | SiLU |
| --- | --- | --- | --- |
| −2 | 0 | −0.046 | −0.238 |
| −1 | 0 | **−0.159** | −0.269 |
| 0.5 | 0.5 | 0.346 | 0.311 |
| 1 | 1 | 0.841 | 0.731 |
| 2 | 2 | 1.954 | 1.762 |

三个观察：① 负区：ReLU 全 0，GELU 给小的负值（且在 x≈−0.75 处有最小值），SiLU 负值更深；② 正区：GELU/SiLU 略低于 ReLU（有比例缩放效果，自带轻微正则）；③ 全程光滑：GELU/SiLU 处处可导。

## 原理详解：为什么"软"更好

1. **梯度连续性**：ReLU 在 0 点导数跳变，GELU/SiLU 导数处处连续——高学习率下优化轨迹更平滑；
2. **负区小泄漏的价值**：完全截断（ReLU）使负区梯度为 0，神经元一旦长期为负便"死亡"；GELU 负区保留约 −0.17 的最小值量级，梯度仍可回流；
3. **零中心化倾向**：GELU/SiLU 的均值比 ReLU 更接近 0，缓解深层叠加的偏置漂移。

实证注记：GELU 与 SiLU 的差距通常在千分位损失级别（GELU 出自 BERT/GPT-2 时代，SiLU 因形式更简单且与门控天然契合被 LLaMA 世代随 SwiGLU 一起采用）——**工程上"光不光滑"比"哪个略好"更主导选择**。

## 代码实践

\`\`\`python
import math

Phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))   # 标准正态 CDF
gelu = lambda x: x * Phi(x)
silu = lambda x: x / (1 + math.exp(-x))

for x in (-2, -1, -0.5, 0.5, 1, 2):
    print(f"x={x:5}: ReLU={max(x,0):5.2f}  GELU={gelu(x):7.4f}  SiLU={silu(x):7.4f}")

# 导数连续性体验：在 0 附近扫一小段
h = 1e-6
print("GELU 在 0 处左导数", round((gelu(0)-gelu(-h))/h, 3), "右导数", round((gelu(h)-gelu(0))/h, 3))
\`\`\`

预期输出：与上表一致；GELU 在 0 处左右导数几乎相等（≈0.5）——光滑性的直接证据（ReLU 左导数 0、右导数 1，跳变）。**常见错误**：GELU 近似式（tanh 版）与精确式混用导致对不上基准；训练时手写激活忘了数值稳定（大 |x| 的 exp 溢出）。

## 常见误区

1. **"激活函数越新越好"**——代际差距远小于数据与规模的影响；ReLU 在 CNN/小型网络仍是默认；
2. **负区小输出"违反直觉所以没用"**——恰恰是防止死神经元与保持光滑的来源；
3. **把 Swish 与 SwiGLU 混同**——Swish 是激活函数，SwiGLU 是用 Swish 构造的门控结构（下一节）；
4. **在 softmax/归一化处再套激活**——激活只放 FFN 中间层，别处乱加会破坏概率语义。

## 知识关联

- **向前**：llm-a1 的 FFN 结构（升维-激活-降维）中激活正是本节主角；
- **向后**：下一节 GLU/SwiGLU 用 SiLU 做门控；第 5 章组装 LLaMA Block 时激活进入 FFN；
- **平行**：深度学习课程对比过更多激活（tanh/LeakyReLU），本节聚焦 GPT 谱系三代。

## 本节总结

| 代际 | 函数 | 特征 | 代表 |
| --- | --- | --- | --- |
| 1 | ReLU | 硬闸门、负区全灭 | 原始 Transformer |
| 2 | GELU = x·Φ(x) | 光滑、负区小泄漏 | GPT-2/3、BERT |
| 3 | SiLU = x·σ(x) | 光滑、形式最简、适配门控 | LLaMA（随 SwiGLU） |

## 参考资料

> **来源类型：学术来源**
> - Hendrycks, D., & Gimpel, K. (2016). "Gaussian Error Linear Units (GELUs)." arXiv:1606.08415。
> - Ramachandran, P., Zoph, B., & Le, Q. V. (2017). "Searching for Activation Functions." arXiv:1710.05941（Swish）。
>
> **来源类型：原创**
> - 闸门/调光器比喻与取值对照表为本课程改编。
`,
        tips: [
          {
            kind: 'note',
            text: 'FFN 是逐 token 独立的（不跨 token 交互），注意力才是跨 token 的部分。做性能分析时，长序列的瓶颈在注意力，短序列/大 batch 的瓶颈往往在 FFN 的矩阵乘。',
          },
          {
            kind: 'interview',
            text: '被问"FFN 为什么占那么多参数"，可以从两方面回答：知识存储（key-value memory 假说）与表达力（升维后再降维，高维空间更容易线性可分）。',
          },
          {
            kind: 'pitfall',
            text: 'GELU 有两个版本：精确版（用 erf）与 tanh 近似。两者数值差在 1e-3 量级，混用会导致与官方实现对齐失败，加载权重时表现为 loss 微妙偏高。',
          },
        ],
        demos: [
          {
            title: 'ReLU / GELU / SiLU 数值对比',
            lang: 'python',
            code: `import numpy as np
from math import erf

def relu(x):
    return np.maximum(0.0, x)

def gelu_tanh(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))

def gelu_exact(x):
    return 0.5 * x * (1.0 + np.vectorize(erf)(x / np.sqrt(2.0)))

def silu(x):
    return x / (1.0 + np.exp(-x))

xs = np.array([-3.0, -2.0, -1.0, -0.5, 0.0, 0.5, 1.0, 2.0, 3.0])
print(f"{'x':>6} {'relu':>9} {'gelu_t':>9} {'gelu_e':>9} {'silu':>9}")
for x in xs:
    print(f"{x:6.1f} {relu(x):9.4f} {gelu_tanh(x):9.4f} {gelu_exact(x):9.4f} {silu(x):9.4f}")

print()
print("gelu_tanh 与 gelu_exact 最大差异:", round(float(np.abs(gelu_tanh(xs) - gelu_exact(xs)).max()), 6))
print("silu 的最小值约为:", round(float(silu(np.linspace(-5, 0, 1001)).min()), 4), "（出现在 x = -1.278 附近）")
print("relu 在负数区间的梯度恒为 0；GELU/SiLU 在负数区间仍有非零梯度。")`,
          },
        ],
      },
      {
        id: 'llm-a3-c2-l2',
        title: 'GLU：用门控控制信息流',
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出 GLU 的门控形式 $(xW) \\otimes \\sigma(xV)$，解释"信息门"与"值"的分工；
2. 手推 SwiGLU 的参数量守恒：为什么中间维取 $\\frac{8}{3}d$；
3. 用代码验证门控与无门控 FFN 在同一输入下的行为差异。

## 前置知识

- 上一节的 SiLU 激活；
- FFN 两层结构与参数量 $2 \\times d \\times 4d$（llm-a1 c2-l5）。

## 问题背景：从"过滤后变换"到"边变换边控制流量"

标准 FFN：先过激活（非线性过滤），再线性降维——**控制与变换是串行的两步**。GLU（Gated Linear Unit，Dauphin et al. 2017）提出更灵活的结构：让输入同时生成两路，一路做"内容"（要传什么），一路过 sigmoid 做"门"（放行多少），逐元素相乘——**门控与内容并行、由数据自己学会开关**。Shazeer (2020) 系统测试了 GLU 变体，SwiGLU 胜出，成为 LLaMA 世代标配。

## 直觉理解：水管上的智能阀门

普通 FFN 像"先净化（激活）再送水"；GLU 像水管上装了**随水质自动调节的阀门**：主管的水（value 路）照常流，旁路的水质传感器（gate 路过 sigmoid）实时决定阀门开度（0~1），两路相乘=按需放行。**哪些特征放行、放行多少，训练中由数据学出**——比固定激活的死规则灵活得多。

## 核心概念：从 GLU 到 SwiGLU

$$\\mathrm{GLU}(x) = (xW + b) \\otimes \\sigma(xV + c) \\quad\\text{（sigmoid 门）}$$

把 σ 换成 Swish(SiLU) 即 **SwiGLU**（Swish-门控线性单元）：

$$\\mathrm{SwiGLU\\text{-}FFN}(x) = \\big(\\mathrm{SiLU}(xW_1)\\big) \\otimes (xW_3)\\, W_2$$

三路投影：$W_1$（门）、$W_3$（值）、$W_2$（输出融合），各 $d \\times d_{ff}$。

**参数量守恒**：原 FFN 是 2 个矩阵（$2 \\times 4d^2 = 8d^2$）；SwiGLU 有 3 个矩阵，若维持 $4d$ 中间维则参数变为 $12d^2$（+50%）。为公平对比，LLaMA 把中间维调成 $\\frac{8}{3}d$：

$$3 \\times d \\times \\tfrac{8}{3}d = 8d^2 \\;\\equiv\\; 2 \\times d \\times 4d$$

（$d = 4096$ 时两边都是 134M 参数——实算可验。$\\frac{8}{3}d$ 取整到 64 的倍数是工程细节。）

## 原理详解：门控为什么有效

1. **乘性交互的表达力**：相乘让两个线性空间的特征做逐维调制——等价于一个输入依赖的、可微的"特征选择器"，加性激活做不到；
2. **与残差的配合**：门控输出天然带"关闭"能力（门≈0 时该特征不进入下一层），Block 的残差流保持干净；
3. **实证**：Shazeer (2020) 在同一预算下对比 ReLU/GELU FFN 与各 GLU 变体，SwiGLU 在翻译与语言建模任务稳定占优——效率来源被归结为"门控引入的额外非线性与梯度路径"。

## 完整案例：手算一个 2 维门控

设 $x = [1, -2]$，权重取单位阵简化（$W_1 = W_3 = I$）：
- 值路：$xW_3 = [1, -2]$；
- 门路：$\\mathrm{SiLU}([1, -2]) = [0.731, -0.269]$（上一节实算值）；
- 相乘：$[1 \\times 0.731, -2 \\times (-0.269)] = [0.731, 0.538]$。

注意第二维：值为负、门为负，**负负得正**——门控不仅调幅还可能翻相，这是纯激活 FFN 没有的自由度。

## 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
d, dff = 64, 64           # 教学尺寸（工程上 dff = 8/3*d）

W1 = rng.normal(0, 0.05, (d, dff))   # 门
W3 = rng.normal(0, 0.05, (d, dff))   # 值
W2 = rng.normal(0, 0.05, (dff, d))   # 输出
x = rng.normal(0, 1, d)

def swiglu(x):
    gate = x @ W1 / (1 + np.exp(-(x @ W1)))     # SiLU(xW1)
    value = x @ W3
    return (gate * value) @ W2

def relu_ffn(x):
    h = np.maximum(x @ W1, 0)                   # 同参数量的 ReLU 版
    return h @ W2

out_g, out_r = swiglu(x), relu_ffn(x)
print("SwiGLU 输出前4维:", np.round(out_g[:4], 3))
print("ReLU  输出前4维:", np.round(out_r[:4], 3))
print("门控负值占比:", round((x @ W1 < 0).mean(), 2))
\`\`\`

预期输出：两路输出量级相近但具体值差异显著；约一半维度的门处于负区（SiLU 负值→小幅翻相/抑制）——**门控在逐维动态决定信息去留**。**常见错误**：门与值两路用同一矩阵（退化为激活 FFN）；中间维仍取 4d 导致参数超预算；把 SwiGLU 的 $\\frac{8}{3}$ 当精确值（须取整对齐硬件）。

## 常见误区

1. **"GLU 是激活函数"**——它是**结构**（两路投影+逐元素乘），激活只是门路上的一个部件；
2. **门=0~1 的概率**——SwiGLU 用 SiLU，门可为负（允许翻相），比 sigmoid 门表达力强；
3. **参数账算不清**——三矩阵结构必须把 $d_{ff}$ 调到 $\\frac{8}{3}d$ 才与原 FFN 同预算；
4. **以为门控处处更优**——小模型/短训练下差异可能不显著；收益在大规模语言建模中最稳。

## 知识关联

- **向前**：上一节的 SiLU 是 SwiGLU 的门激活；llm-a1 的 FFN 结构是本节的改造对象；
- **向后**：c2-l3/c2-l4 的参数估算；第 5 章把 SwiGLU-FNN 装进 LLaMA Block；
- **平行**：LSTM 的遗忘门是门控思想的循环网络前辈；MoE 的路由门控（llm-a4）是"稀疏版门控"。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| GLU | $(xW) \\otimes \\sigma(xV)$：内容 × 门的乘性调制 |
| SwiGLU | SiLU 门 + 值路 + 输出投影，LLaMA 世代标配（Shazeer 2020） |
| 参数守恒 | $3 \\times d \\times \\frac{8}{3}d = 2 \\times d \\times 4d = 8d^2$ |
| 力量来源 | 输入依赖的逐维特征选择 + 翻相自由度 |

## 参考资料

> **来源类型：学术来源**
> - Dauphin, Y. N., et al. (2017). "Language Modeling with Gated Convolutional Networks." *ICML 2017*——GLU 原始定义。
> - Shazeer, N. (2020). "GLU Variants Improve Transformer." arXiv:2002.05202（已核验）——SwiGLU 的系统对比。
> - Touvron, H., et al. (2023). "LLaMA: Open and Efficient Foundation Language Models." arXiv:2302.13971（已核验）——采用 SwiGLU 与 $\\frac{8}{3}d$ 的工程决策。
>
> **来源类型：原创**
> - 智能阀门比喻与 2 维手算为本课程改编。
`,
        tips: [
          {
            kind: 'interview',
            text: 'GLU 的门支路用 sigmoid 是为了把数值压成 (0,1) 软开关，与"激活函数增加非线性"是两回事。这个区分在面试里很容易被追问。',
          },
          {
            kind: 'pitfall',
            text: '把 W 与 V 合并成一个大矩阵加速时，切分顺序必须与权重文件一致。切反了不会报错，只会让模型"突然变笨"，非常难排查。',
          },
          {
            kind: 'note',
            text: 'GLU 有多个变体：Bilinear（两路都是线性）、ReGLU（ReLU）、GEGLU（GELU）、SwiGLU（SiLU）。论文里统称 GLU variants，SwiGLU 是其中表现最好的一个。',
          },
        ],
        demos: [
          {
            title: 'GLU 与普通 FFN 的参数量、形状对比',
            lang: 'python',
            code: `import numpy as np

d, d_ff = 8, 16

def ffn(x, W1, W2):
    return np.maximum(0, x @ W1) @ W2

def glu_ffn(x, W, V, W2):
    gate = 1 / (1 + np.exp(-(x @ W)))
    value = x @ V
    return (gate * value) @ W2

rng = np.random.default_rng(0)
X = rng.normal(size=(2, d))
W1, W2 = rng.normal(0, 0.3, (d, d_ff)), rng.normal(0, 0.3, (d_ff, d))
W, V, W2g = rng.normal(0, 0.3, (d, d_ff)), rng.normal(0, 0.3, (d, d_ff)), rng.normal(0, 0.3, (d_ff, d))

print("普通 FFN 输出形状:", ffn(X, W1, W2).shape)
print("GLU   FFN 输出形状:", glu_ffn(X, W, V, W2g).shape)

p_std = W1.size + W2.size
p_glu = W.size + V.size + W2g.size
print()
print(f"普通 FFN 参数: {p_std}，GLU FFN 参数: {p_glu}，倍数: {p_glu / p_std:.2f}")

# 门控的可视化：不同输入下每个维度被保留多少
g = 1 / (1 + np.exp(-(X @ W)))
print()
print("门值（每行一个 token，每列一个隐藏维）:")
print(np.round(g, 3))
print("被门压到 0.05 以下的维度数:", int((g < 0.05).sum()))`,
          },
        ],
      },
      {
        id: 'llm-a3-c2-l3',
        title: 'SwiGLU 公式与 8/3 倍 d_ff 的由来',
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出 SwiGLU 公式 (SiLU(xW1)⊙xW3)W2 并指出 gate/value 支路的激活位置；
2. 三步推导 d_ff_swiglu = 8/3·d：参数守恒约束 3·d·d_ff_sw = 2·d·4d；
3. 验证 LLaMA 的 11008：10922.67 取 256 倍数 + 参数比标准 FFN 差 0.8% 以内。

### 前置知识

- llm-a1 的 FFN 与 GELU；
- SiLU(z)=z·sigmoid(z) 的曲线形状。

### 问题背景

FFN 占 Transformer 约三分之二的参数，激活函数从 ReLU→GELU→门控 GLU 系的每一步都在『同等参数下换质量』。Shazeer 2020 系统比较后 SwiGLU 胜出、LLaMA 跟进；但它有三个矩阵，d_ff 必须 (2/3)·4d = 8/3·d 才能参数守恒——11008 这种『丑数字』就是这么来的。

### 直觉理解

标准 FFN 是一根『硬阈值水管』：进水加压（升维）、ReLU 只留正压、再汇回（降维）。SwiGLU 是『带调音台的双管』：一支管出信号（up），另一支管出音量旋钮（gate，SiLU 让旋钮平滑连续），逐元素相乘就是按旋钮调音，最后混回原声道。3 个矩阵比 2 个多 50% 参数，所以中间层从 4d 收窄到 8/3·d——总量不变，控制权翻倍。

### 核心概念与原理详解

## SwiGLU 的定义

Shazeer（2020）在《GLU Variants Improve Transformer》中系统比较了多种门控变体，效果最好的是把门支路的激活换成 **SiLU（Swish）**：

SwiGLU(x) = (SiLU(x 乘以 W1) 与 (x 乘以 W3)) 乘以 W2
SiLU(z) = z 乘以 sigmoid(z) = z / (1 + e^(-z))

LLaMA 论文把它写成 FFN_SwiGLU(x, W, V, W2) = (SiLU(xW) 与 xV) W2，其中 W、V 是 gate_up 的两半，W2 是 down 投影。在 Hugging Face 的实现里分别叫 gate_proj、up_proj、down_proj。

形状（d = 4096，d_ff = 11008）：

<TensorFlow steps="(B,n,4096)|gate_proj|(B,n,11008)|SiLU|(B,n,11008)|up_proj|(B,n,11008)|逐元素乘|(B,n,11008)|down_proj|(B,n,4096)" note="SwiGLU：两条支路各自升维到 d_ff，门控相乘后再降回 d。两次升维投影 + 一次降维投影，共 3 个矩阵。" />

## 为什么是 8/3 倍 d_ff

这是一个非常经典的"面试可以展开二十分钟"的问题。逻辑分三步：

**第一步：算平标准。**

标准 FFN（两层）的参数量是 2 乘以 d 乘以 d_ff。

**第二步：让 SwiGLU 的总参数与标准 FFN 相同。**

SwiGLU（三层）的参数量是 3 乘以 d 乘以 d_ff_swiglu。

令两者相等：3 乘以 d 乘以 d_ff_swiglu = 2 乘以 d 乘以 d_ff，得 d_ff_swiglu = (2/3) 乘以 d_ff。

**第三步：把 d_ff = 4d 代入。**

d_ff_swiglu = (2/3) 乘以 4d = (8/3) 乘以 d，约等于 2.667d。

这就是 8/3 倍的来源——**它不是某个实验调出来的魔法数字，而是"保持参数量不变"这一约束的直接推论**。

## 验证：LLaMA 的 11008

d = 4096 时，(8/3) 乘以 4096 = 10922.67。LLaMA 取 11008，原因有两个：

1. 工程上要取 **256 的整数倍**（GPU 的算术单元按 128/256 对齐，张量核按 8/16 的倍数分块），10922.67 向上取整到 256 的倍数是 11008；
2. 11008 恰好接近但这个"超出一点点"，对参数量影响可以忽略。

再验证：3 乘以 4096 乘以 11008 = 135,266,304；标准 FFN 是 2 乘以 4096 乘以 16384 = 134,217,728。两者相差不到 0.8%，**验证了"参数大致守恒"**。

## 如果照搬 4d 会怎样

如果 SwiGLU 也用 d = 4096、d_ff = 16384，每层 FFN 参数会是 3 乘以 4096 乘以 16384 = 201,326,592，比标准 FFN 多 50%。32 层就多出约 21 亿参数。LLaMA 选择 8/3 倍，本质上是在说：**我们想要的是门控带来的表达力提升，而不是简单地"把模型做大"**。

## 计算量视角

参数守恒了，FLOPs 呢？标准 FFN 是 2 次 [d, d_ff] 矩阵乘，SwiGLU 是 3 次 [d, 2d/3 乘以 4d] 量级的矩阵乘，总乘加同样约等于 2 乘以 d 乘以 4d。**同样计算量下，SwiGLU 用"两条更窄的支路 + 门控"替换了"一条更宽的支路"**，这是它能在论文里以几乎不增加成本的方式提升质量的关键。

## 为什么不带偏置

LLaMA 的 FFN 三个矩阵都没有 bias。这与 RMSNorm 去掉 beta 的理由一脉相承：偏置可以被后续层的权重吸收，去掉它减少参数、减少一次逐元素加法，并且对数值稳定性有利。

<ActivationCompareDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
d, d_ff = 4096, 11008

# ---- 1. 8/3 推导与验证 ----
print("标准 FFN 参数/层:", 2*d*(4*d))
print("SwiGLU 若也用 4d:", 3*d*(4*d), "（多 50%）")
d_ff_s = (2/3)*(4*d)
print("等参 d_ff_swiglu = %.1f -> 取 256 倍数 = %d（LLaMA 实际 11008）" % (d_ff_s, int(np.ceil(d_ff_s/256))*256))
print("参数比 SwiGLU(11008)/标准FFN:", 3*d*11008/(2*d*16384))

# ---- 2. SwiGLU 前向（numpy，缩小维度）----
def silu(z): return z / (1 + np.exp(-z))
rng = np.random.default_rng(0)
dd, df = 64, 172                       # 缩放版 d / d_ff
x = rng.normal(0, 1, (1, 3, dd))
W1 = rng.normal(0, 0.05, (dd, df)); W3 = rng.normal(0, 0.05, (dd, df)); W2 = rng.normal(0, 0.05, (df, dd))
h = silu(x @ W1) * (x @ W3)            # gate 支路激活，value 支路不激活
out = h @ W2
print("输出形状:", out.shape, "| 三矩阵参数合计:", W1.size + W3.size + W2.size, "= 3*d*d_ff")
wrong = ((x @ W1) * silu(x @ W3)) @ W2 # 激活放错支路
print("激活放错支路的输出差均值: %.4f（不为0，结构已退化）" % float(np.abs(out - wrong).mean()))\`\`\`

预期输出（实测）：标准 FFN 每层 134,217,728 参数；SwiGLU 若用 4d 则 201,326,592（多 50%）；等参 d_ff_swiglu=10922.7→取 256 倍数 11008（与 LLaMA 一致），参数比 1.0078（0.8% 内守恒）；numpy 前向输出形状 (1,3,64)，三矩阵合计 33024=3*d*d_ff；激活放错支路输出差均值 0.0153（结构已退化）。

**常见错误**：把 SiLU 同时用在 gate 和 value 两支（正确做法是只激活 gate 支）；d_ff 直接写 4d，每层 FFN 参数多 50%（32 层约多 21 亿）；照抄 BERT 公式算参数量，没注意 LLaMA 三个矩阵全部无 bias。

### 常见误区

1. **『SwiGLU 一定更快』**——参数守恒但多一次矩阵乘与逐元素乘，kernel 融合做不好反而更慢；\\n2. **『d_ff=4d 是铁律』**——LLaMA-7B 是 11008≈2.69d，70B 是 28672≈3.5d，都是权衡结果；\\n3. **『8/3 是调参调出来的』**——它是『三矩阵参数 = 标准两矩阵参数』这一约束的直接推论，不是魔法数字。

### 知识关联

- **向前**：c4 的 GQA 同样在做『参数换效率』；
- **向后**：c5 组装时『FFN 占总参数 64%』的账要在这里算清；
- **平行**：deep-learning 课程激活函数一节的 ReLU/GELU 家族是本章的门控化起点。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| SwiGLU | (SiLU(xW1) ⊙ xW3)W2，gate 支路激活、value 支路不激活 |
| 8/3 的由来 | 3·d·d_ff_sw = 2·d·4d ⟹ d_ff_sw = 8/3·d |
| 对齐 | 10922.67 向上取整到 256 的倍数 = 11008 |
| 参数占比 | FFN≈注意力 2 倍，占总参数约 64% |
| 偏置 | LLaMA 全部无 bias，与 RMSNorm 去 beta 一脉相承 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'leak',
            text: '记住那条推导链：2d 乘以 d_ff = 3d 乘以 d_ff_new，所以 d_ff_new = (2/3) 乘以 4d = 8/3 乘以 d。面试时能现场推出来，比背数字强得多。',
          },
          {
            kind: 'performance',
            text: '11008 与 11008 这两次升维可以用一个 [d, 2 乘以 d_ff] 的合并矩阵一次算完，再切分。在 A100 上这类融合能省下约 10% 的 FFN 时间。',
          },
          {
            kind: 'pitfall',
            text: 'd_ff 必须对齐到 256 的倍数，否则矩阵乘会退化到低效路径。自己改小模型时随手写 d_ff = 1000，速度可能只有对齐后的 60%。',
          },
        ],
        demos: [
          {
            title: 'SwiGLU 完整前向 + 参数量对账',
            lang: 'python',
            code: `import numpy as np

def silu(z):
    return z / (1.0 + np.exp(-z))

def swiglu(x, W1, W3, W2):
    return (silu(x @ W1) * (x @ W3)) @ W2

d, d_ff = 4, 8
rng = np.random.default_rng(1)
X = rng.normal(size=(2, d))
W1 = rng.normal(0, 0.5, size=(d, d_ff))
W3 = rng.normal(0, 0.5, size=(d, d_ff))
W2 = rng.normal(0, 0.5, size=(d_ff, d))

out = swiglu(X, W1, W3, W2)
print("输入:", X.shape, " 输出:", out.shape)
print("第一行前 4 个值:", np.round(out[0], 4))

# 参数量对账：d=4096
D = 4096
for dff in (4 * D, int(8 / 3 * D), 11008):
    std = 2 * D * 16384
    glu = 3 * D * dff
    print(f"d_ff={dff:6d}  SwiGLU 每层参数={glu:>12,}  相对标准 FFN(16384) 比值={glu / std:.4f}")

print()
print("8/3 x 4096 =", round(8 / 3 * D, 2), "-> 向上取 256 的倍数 =", -(-int(round(8 / 3 * D)) // 256) * 256)
print("上下界检查：LLaMA 用 11008，而 11008 / 256 =", 11008 / 256)`,
          },
        ],
      },
      {
        id: 'llm-a3-c2-l4',
        title: '参数量估算与常见误区',
        content: `
### 学习目标

学完本节，你应该能够：
1. 逐组件估算 LLaMA-7B 单层 FFN 参数 3·4096·11008 = 1.35 亿；
2. 避开五个误区（4d 铁律、必然更快、激活位置、bias、与 head_dim 混淆）；
3. 用霍纳法则心算 4096×11008≈4.5e7 并复核 FFN 占总参数 64%。

### 前置知识

- 「SwiGLU 公式与 8/3 倍 d_ff 的由来」（l3）的守恒推导。

### 问题背景

FFN 占 Transformer 约三分之二的参数，激活函数从 ReLU→GELU→门控 GLU 系的每一步都在『同等参数下换质量』。Shazeer 2020 系统比较后 SwiGLU 胜出、LLaMA 跟进；但它有三个矩阵，d_ff 必须 (2/3)·4d = 8/3·d 才能参数守恒——11008 这种『丑数字』就是这么来的。

### 直觉理解

标准 FFN 是一根『硬阈值水管』：进水加压（升维）、ReLU 只留正压、再汇回（降维）。SwiGLU 是『带调音台的双管』：一支管出信号（up），另一支管出音量旋钮（gate，SiLU 让旋钮平滑连续），逐元素相乘就是按旋钮调音，最后混回原声道。3 个矩阵比 2 个多 50% 参数，所以中间层从 4d 收窄到 8/3·d——总量不变，控制权翻倍。

### 核心概念与原理详解

## 逐项估算模板

设隐藏维 d、SwiGLU 中间维 d_ff、层数 L，并假设无偏置：

| 组件 | 每层参数量 | d = 4096、d_ff = 11008 时 |
| --- | --- | --- |
| gate_proj（W1） | d 乘以 d_ff | 45,088,768 |
| up_proj（W3） | d 乘以 d_ff | 45,088,768 |
| down_proj（W2） | d_ff 乘以 d | 45,088,768 |
| 合计 | 3 乘以 d 乘以 d_ff | 135,266,304 |

对比注意力（MHA，d = 4096）：Wq、Wk、Wv、Wo 各 d 乘以 d，合计 67,108,864。**FFN 约为注意力的 2 倍**。若换成 GQA（KV 头数 8），注意力降到 41,943,040，FFN 变成它的 3.2 倍。

## 用霍纳法则心算

面试时没有计算器。可以用近似：

- 4096 乘以 11008 约等于 4096 乘以 1.1 万 = 4.5 万 乘以 4096 约等于 4.5e4 乘以 4e3 = 1.8e8？不对，4096 乘 11008 约等于 4.1e3 乘 1.1e4 = 4.5e7，即 4500 万；
- 三个矩阵约 1.35e8，即 1.35 亿；
- 32 层约 4.3e9，即 43 亿。

因为 LLaMA-2 7B 总参数约 67 亿，FFN 占约 64%，与前面算的一致。

## 五个常见误区

**误区 1：把 d_ff 当成 4d。**
LLaMA 系列的 d_ff 不是 4d：7B 是 11008（约 2.69d），13B 是 13824（约 2.7 乘以 5120），70B 是 28672（约 3.5 乘以 8192）。70B 用的是另一个思路：为了让参数量更充裕，d_ff 比 8/3 倍更大。

**误区 2：以为 SwiGLU 一定更快。**
参数守恒是"总量守恒"，但 SwiGLU 多了一次矩阵乘与一次逐元素乘、一次 SiLU。在并行度足够时它是访存受限的，kernel 融合做不好反而更慢。

**误区 3：忘记 up 与 gate 两支路的激活位置。**
正确顺序是"先激活 gate 支路，再与未激活的 value 支路逐元素乘"。如果两支都激活，就退化成了另一种结构（Bilinear/GLU 变体之一），表达力不同。

**误区 4：参数量按含 bias 计算。**
LLaMA 无 bias。如果照抄 BERT 的公式，每层会多出 2 乘以 d_ff + d 个参数，小模型上误差可达 5%。

**误区 5：把 SwiGLU 的 d_ff 与注意力的维度混为一谈。**
注意力头维度 d_head 通常固定 128，与 d_ff 毫无关系。混着算会得出荒唐的数字。

## 一个直观的类比

把 SwiGLU 想成一个**带调音台的前馈网络**：up_proj 把输入升维成一首"多轨"信号，gate_proj 为每个轨道算一个音量旋钮（0 到 1 之间连续可调），SiLU 决定旋钮的响应曲线，逐元素相乘就是"按旋钮调音"，down_proj 把多轨混回原来的两声道。相比标准 FFN 的"全部通过 ReLU 硬阈值"，它给了模型逐维度的、连续的、依赖上下文的控制权。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
d, d_ff = 4096, 11008

# ---- 1. 8/3 推导与验证 ----
print("标准 FFN 参数/层:", 2*d*(4*d))
print("SwiGLU 若也用 4d:", 3*d*(4*d), "（多 50%）")
d_ff_s = (2/3)*(4*d)
print("等参 d_ff_swiglu = %.1f -> 取 256 倍数 = %d（LLaMA 实际 11008）" % (d_ff_s, int(np.ceil(d_ff_s/256))*256))
print("参数比 SwiGLU(11008)/标准FFN:", 3*d*11008/(2*d*16384))

# ---- 2. SwiGLU 前向（numpy，缩小维度）----
def silu(z): return z / (1 + np.exp(-z))
rng = np.random.default_rng(0)
dd, df = 64, 172                       # 缩放版 d / d_ff
x = rng.normal(0, 1, (1, 3, dd))
W1 = rng.normal(0, 0.05, (dd, df)); W3 = rng.normal(0, 0.05, (dd, df)); W2 = rng.normal(0, 0.05, (df, dd))
h = silu(x @ W1) * (x @ W3)            # gate 支路激活，value 支路不激活
out = h @ W2
print("输出形状:", out.shape, "| 三矩阵参数合计:", W1.size + W3.size + W2.size, "= 3*d*d_ff")
wrong = ((x @ W1) * silu(x @ W3)) @ W2 # 激活放错支路
print("激活放错支路的输出差均值: %.4f（不为0，结构已退化）" % float(np.abs(out - wrong).mean()))\`\`\`

预期输出（实测）：标准 FFN 每层 134,217,728 参数；SwiGLU 若用 4d 则 201,326,592（多 50%）；等参 d_ff_swiglu=10922.7→取 256 倍数 11008（与 LLaMA 一致），参数比 1.0078（0.8% 内守恒）；numpy 前向输出形状 (1,3,64)，三矩阵合计 33024=3*d*d_ff；激活放错支路输出差均值 0.0153（结构已退化）。

**常见错误**：把 SiLU 同时用在 gate 和 value 两支（正确做法是只激活 gate 支）；d_ff 直接写 4d，每层 FFN 参数多 50%（32 层约多 21 亿）；照抄 BERT 公式算参数量，没注意 LLaMA 三个矩阵全部无 bias。

### 常见误区

1. **『SwiGLU 一定更快』**——参数守恒但多一次矩阵乘与逐元素乘，kernel 融合做不好反而更慢；\\n2. **『d_ff=4d 是铁律』**——LLaMA-7B 是 11008≈2.69d，70B 是 28672≈3.5d，都是权衡结果；\\n3. **『8/3 是调参调出来的』**——它是『三矩阵参数 = 标准两矩阵参数』这一约束的直接推论，不是魔法数字。

### 知识关联

- **向前**：c4 的 GQA 同样在做『参数换效率』；
- **向后**：c5 组装时『FFN 占总参数 64%』的账要在这里算清；
- **平行**：deep-learning 课程激活函数一节的 ReLU/GELU 家族是本章的门控化起点。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| SwiGLU | (SiLU(xW1) ⊙ xW3)W2，gate 支路激活、value 支路不激活 |
| 8/3 的由来 | 3·d·d_ff_sw = 2·d·4d ⟹ d_ff_sw = 8/3·d |
| 对齐 | 10922.67 向上取整到 256 的倍数 = 11008 |
| 参数占比 | FFN≈注意力 2 倍，占总参数约 64% |
| 偏置 | LLaMA 全部无 bias，与 RMSNorm 去 beta 一脉相承 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '估算类问题的标准答法：先写通用公式（3 乘以 d 乘以 d_ff），再代入具体数字，最后做一个"数量级校验"（FFN 约占 2/3 总参数）。数字记不准没关系，公式与校验才是评分点。',
          },
          {
            kind: 'note',
            text: 'LLaMA-2 70B 的 d_ff = 28672 约等于 3.5 乘以 d，并不是严格的 8/3 倍。说明 8/3 只是"参数守恒"的参考点，不是必须遵守的规则。',
          },
          {
            kind: 'pitfall',
            text: '计算"FFN 占比"时分母要用总参数（含 embedding）。embedding 在词表大时占比可达 5% 到 7%，忽略它会让估算系统性偏高。',
          },
        ],
        demos: [
          {
            title: 'LLaMA-2 各规格的 FFN 参数占比',
            lang: 'python',
            code: `def ffn_params(d, d_ff, L):
    return L * 3 * d * d_ff

def attn_params(d, L, n_heads, n_kv_heads, head_dim):
    q = d * n_heads * head_dim
    k = d * n_kv_heads * head_dim
    v = k
    o = n_heads * head_dim * d
    return L * (q + k + v + o)

configs = [
    ("LLaMA-2 7B", 32000, 4096, 32, 11008, 32, 32, 128),
    ("LLaMA-2 13B", 32000, 5120, 40, 13824, 40, 40, 128),
    ("LLaMA-2 70B", 32000, 8192, 80, 28672, 64, 8, 128),
]
print(f"{'模型':<14}{'FFN 参数':>14}{'注意力参数':>14}{'总参数':>14}{'FFN 占比':>10}")
for name, V, d, L, dff, nh, nkv, hd in configs:
    f = ffn_params(d, dff, L)
    a = attn_params(d, L, nh, nkv, hd)
    emb = V * d
    total = f + a + L * 2 * d + d + emb
    print(f"{name:<14}{f:>14,}{a:>14,}{total:>14,}{f / total:>9.1%}")

print()
print("注：FFN 始终是参数主体，但 GQA 让注意力参数明显小于 FFN。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a3-c2-e1',
        type: 'single',
        difficulty: 3,
        question: 'SwiGLU 前馈网络的计算式是？',
        options: [
          { value: 'A', text: '(SiLU(xW1) 与 xW3 逐元素相乘) 再乘 W2' },
          { value: 'B', text: 'SiLU(xW1 加上 xW3) 再乘 W2' },
          { value: 'C', text: 'SiLU(xW1) 乘 W2 再加上 SiLU(xW3)' },
          { value: 'D', text: 'GELU(xW1) 与 GELU(xW3) 逐元素相乘再乘 W2' },
        ],
        answer: 'A',
        explanation:
          'SwiGLU 只有**门支路**经过 SiLU，值支路 xW3 保持线性，两者逐元素相乘后由 W2 降维。B 是加性组合（不是门控），D 是 GEGLU 的变体且两支都加了激活。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', '公式'],
      },
      {
        id: 'llm-a3-c2-e2',
        type: 'judge',
        difficulty: 3,
        question: 'LLaMA 把 SwiGLU 的中间维取为约 8/3 倍 d，是为了让它的参数量与 d_ff = 4d 的标准 FFN 大致相同。',
        answer: true,
        explanation:
          '标准 FFN 是 2d 乘 d_ff，SwiGLU 是 3d 乘 d_ff_new，令相等得 d_ff_new = (2/3) 乘 4d = 8d/3。这是"参数守恒"约束的直接推论，不是实验调参的魔法数字。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', '8/3', '推导'],
      },
      {
        id: 'llm-a3-c2-e3',
        type: 'fill',
        difficulty: 3,
        question: '补全 SwiGLU 中门控相乘的那一行（未激活的值支路是 `up`）：\n\n```python\ngate = silu(x @ W1)\nup = x @ W3\nout = (___) @ W2\n```',
        blanks: [['gate * up', 'gate*up', 'up * gate']],
        explanation:
          '门控是**逐元素相乘**（对应 numpy 的 `*`，不是矩阵乘 `@`）。顺序无所谓（乘法交换），但注意不要写成 `gate @ up`：那会把形状 [B, n, d_ff] 与 [B, n, d_ff] 做矩阵乘，直接报错。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', '实现'],
      },
      {
        id: 'llm-a3-c2-e4',
        type: 'multiple',
        difficulty: 3,
        question: '关于 GLU 型前馈网络，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '在 d_ff 相同的前提下，门控结构的参数量是标准 FFN 的 1.5 倍' },
          { value: 'B', text: '门支路使用 sigmoid 或 SiLU 的目的包括把数值压到 (0, 1) 附近当作软开关' },
          { value: 'C', text: '门控引入了特征的乘性交互，比纯加性的 FFN 表达力更强' },
          { value: 'D', text: '门控结构不需要最终的降维投影 W2' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错：门控相乘后的形状仍是 [.., d_ff]，必须由 W2 降回 d。A 的 1.5 倍是"两个升维矩阵换成一个"的必然结果；B 的"软开关"是理解门控的关键；C 是门控被提出的原始动机。',
        relatedLessonId: 'llm-a3-c2-l2',
        tags: ['GLU', '门控'],
      },
      {
        id: 'llm-a3-c2-e5',
        type: 'code',
        difficulty: 3,
        question:
          '实现 SwiGLU 前馈网络并验证形状。\n\n要求：\n- `silu(z) = z / (1 + exp(-z))`；\n- `swiglu(x, W1, W3, W2)`：先分别 x 乘 W1、x 乘 W3，前者过 SiLU，两者逐元素相乘，再乘 W2；\n- x 形状 [B, n, d]，W1 与 W3 形状 [d, d_ff]，W2 形状 [d_ff, d]。\n\n计算 `out = swiglu(X, W1, W3, W2)`。',
        starterCode: `import numpy as np

def silu(z):
    return ___

def swiglu(x, W1, W3, W2):
    gate = ___
    up = ___
    return ___

rng = np.random.default_rng(1)
B, n, d, d_ff = 2, 3, 4, 8
X = rng.normal(size=(B, n, d))
W1 = rng.normal(0, 0.5, size=(d, d_ff))
W3 = rng.normal(0, 0.5, size=(d, d_ff))
W2 = rng.normal(0, 0.5, size=(d_ff, d))
out = swiglu(X, W1, W3, W2)
`,
        setupCode: '',
        expectedOutput: 'out 形状 (2, 3, 4)，与输入形状一致',
        tests: `assert out.shape == (2, 3, 4), f"输出形状应为 (2, 3, 4)，实际 {out.shape}"
assert np.allclose(silu(0.0), 0.0), "SiLU(0) 应为 0"
assert np.isclose(silu(-10.0), -10.0 * np.exp(-10.0) / (1 + np.exp(-10.0)), atol=1e-9), "SiLU 在负区间应接近 0 但不等于 0"
assert float(silu(np.linspace(-5, 0, 1001)).min()) < -0.27, "SiLU 的最小值约为 -0.278"
manual = (silu(X[0, 0] @ W1) * (X[0, 0] @ W3)) @ W2
assert np.allclose(out[0, 0], manual), "第一个 token 的输出不正确"
assert not np.allclose(out, (np.tanh(X @ W1) * (X @ W3)) @ W2), "门支路应使用 SiLU，而不是 tanh"
`,
        answer: `import numpy as np

def silu(z):
    return z / (1.0 + np.exp(-z))

def swiglu(x, W1, W3, W2):
    gate = silu(x @ W1)
    up = x @ W3
    return (gate * up) @ W2

rng = np.random.default_rng(1)
B, n, d, d_ff = 2, 3, 4, 8
X = rng.normal(size=(B, n, d))
W1 = rng.normal(0, 0.5, size=(d, d_ff))
W3 = rng.normal(0, 0.5, size=(d, d_ff))
W2 = rng.normal(0, 0.5, size=(d_ff, d))
out = swiglu(X, W1, W3, W2)
out
`,
        explanation:
          '`@` 处理最后两维的矩阵乘，前导维 [B, n] 自动批量，所以一个表达式就完成了整个序列的计算。门控相乘必须用 `*`。SiLU 在 x 略小于 0 时输出一个小负数（最小值约 -0.278），这是它与 ReLU 的关键差异之一。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', 'numpy', '实现'],
      },
      {
        id: 'llm-a3-c2-e6',
        type: 'code',
        difficulty: 4,
        question:
          '推导并计算 **SwiGLU 的中间维**。\n\n给定标准 FFN 的中间维 `d_ff_std = 4 * d`，要求在总参数量不变的前提下求 SwiGLU 的中间维：\n\n1. `d_ff_exact`：精确值 `(2/3) * d_ff_std`（浮点数）；\n2. `d_ff_aligned`：向上取整到 256 的倍数；\n3. `ratio`：`d_ff_aligned / d` 保留 4 位小数。\n\n参数 d = 4096。',
        starterCode: `d = 4096
d_ff_std = 4 * d

d_ff_exact = ___
d_ff_aligned = ___
ratio = ___
`,
        setupCode: '',
        expectedOutput: 'd_ff_exact ≈ 10922.67，d_ff_aligned = 11008，ratio ≈ 2.6875',
        tests: `assert abs(d_ff_exact - 32768 / 3) < 1e-6, f"d_ff_exact 应为 32768/3 ≈ 10922.67，实际 {d_ff_exact}"
assert d_ff_aligned == 11008, f"向上取 256 的倍数应为 11008，实际 {d_ff_aligned}"
assert d_ff_aligned % 256 == 0, "对齐后的值应是 256 的整数倍"
assert d_ff_aligned >= d_ff_exact, "对齐应向上取整"
assert abs(ratio - 2.6875) < 1e-9, f"ratio 应为 2.6875，实际 {ratio}"
`,
        answer: `d = 4096
d_ff_std = 4 * d

d_ff_exact = (2 / 3) * d_ff_std
d_ff_aligned = -(-int(round(d_ff_exact)) // 256) * 256
ratio = round(d_ff_aligned / d, 4)
`,
        explanation:
          '(2/3) 乘 16384 = 10922.67。向上取 256 的倍数是 11008（11008/256 = 43）。LLaMA 实际就用 11008，ratio 约 2.6875。注意 `-(-x // n) * n` 是不用 math 库的向上取整技巧；直接 `round` 到 256 的倍数也可以，因为 10922.67 离 11008 更近。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', '8/3', '对齐'],
      },
      {
        id: 'llm-a3-c2-e7',
        type: 'single',
        difficulty: 3,
        question: '标准 FFN 的 d_ff 通常取 4d，这个 4 的来源是？',
        options: [
          { value: 'A', text: '为了把参数量压到最小' },
          { value: 'B', text: '原始 Transformer 论文的经验选择，兼顾表达力与计算量' },
          { value: 'C', text: '由注意力头数决定，必须等于 4 乘头数' },
          { value: 'D', text: '使得 FFN 参数量与注意力参数量相等' },
        ],
        answer: 'B',
        explanation:
          '4d 是经验值。若 d_ff < d，中间层近似低秩变换，表达力下降；d_ff 过大则计算与显存上升。它不是由某个等式推出来的，也不与头数相关（注意：4 乘 d 时 FFN 参数是 2 乘以 4d 乘以 d = 8d^2，而 MHA 注意力是 4d^2，二者不等）。',
        relatedLessonId: 'llm-a3-c2-l1',
        tags: ['FFN', 'd_ff'],
      },
      {
        id: 'llm-a3-c2-e8',
        type: 'fill',
        difficulty: 4,
        question: '推导 SwiGLU 与标准 FFN 参数守恒时的中间维。\n\n设标准 FFN 有 2 个 [d, d_ff] 量级的矩阵，SwiGLU 有 3 个。若希望总参数量相等，则新的中间维应为原 d_ff 的 ___ 倍（填分数或小数）。',
        blanks: [['2/3', '2 / 3', '0.6667', '0.667']],
        explanation:
          '2d 乘 d_ff = 3d 乘 d_ff_new，解得 d_ff_new = (2/3) 乘 d_ff。再代入 d_ff = 4d 得 8d/3。这个"先算平、再代 4d"的两步推法是回答此类问题的最佳模板。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', '推导'],
      },
      {
        id: 'llm-a3-c2-e9',
        type: 'judge',
        difficulty: 3,
        question: '标准 FFN 中的 W1（升维）与 W2（降维）如果去掉非线性激活，整体等价于一个秩不超过 d 的线性变换。',
        answer: true,
        explanation:
          'W2 乘 W1 是一个 [d, d] 矩阵，秩最多为 min(d, d_ff) 且不超过 d，所以整体退化为一个 d 乘 d 的线性变换，表达力大幅下降。这正是"必须有非线性激活"的数学理由。',
        relatedLessonId: 'llm-a3-c2-l1',
        tags: ['FFN', '非线性'],
      },
      {
        id: 'llm-a3-c2-e10',
        type: 'multiple',
        difficulty: 4,
        question: 'LLaMA 的 FFN 三个线性层都没有 bias，理由包括哪些？（多选）',
        options: [
          { value: 'A', text: '偏置的效果可以由下游层的权重（以及归一化层的 gamma）吸收' },
          { value: 'B', text: '少一次逐元素加法，简化 kernel 实现' },
          { value: 'C', text: '减少参数量（虽然量级相对很小）' },
          { value: 'D', text: '去掉偏置后模型的表达能力严格不变' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误：严格来说去掉偏置会损失一点自由度，只是实践中影响可以忽略。A 是理论层面的等效性论证，B、C 是工程收益。注意这是"经验上可行"而非"数学上必然等价"。',
        relatedLessonId: 'llm-a3-c2-l4',
        tags: ['SwiGLU', '偏置', 'LLaMA'],
      },
      {
        id: 'llm-a3-c2-e11',
        type: 'code',
        difficulty: 4,
        question:
          '计算 **SwiGLU 与标准 FFN 的参数量对账**。\n\n给定 `d = 4096`、`L = 32`：\n\n1. 标准 FFN：d_ff = 16384，每层 2 个矩阵；\n2. SwiGLU：d_ff = 11008，每层 3 个矩阵；\n\n计算 `std_layer`、`glu_layer`（每层参数量），`std_total`、`glu_total`（全部层的参数量），以及 `rel_diff`（保留 4 位的相对差，定义为 `(glu_total - std_total) / std_total`）。\n\n再计算 `glu_attn_ratio`：SwiGLU 每层 FFN 参数量与 MHA 注意力（4 个 d 乘 d 矩阵）参数量之比，保留 4 位小数。',
        starterCode: `d, L = 4096, 32
d_ff_std, d_ff_glu = 16384, 11008

std_layer = ___
glu_layer = ___
std_total = ___
glu_total = ___
rel_diff = ___

glu_attn_ratio = ___
`,
        setupCode: '',
        expectedOutput: 'std_total = 4294967296，glu_total = 4328521728，rel_diff ≈ 0.0078',
        tests: `assert std_layer == 2 * 4096 * 16384, f"标准 FFN 每层应为 134217728，实际 {std_layer}"
assert glu_layer == 3 * 4096 * 11008, f"SwiGLU 每层应为 135266304，实际 {glu_layer}"
assert std_total == 32 * std_layer, "std_total 计算不正确"
assert glu_total == 32 * glu_layer, "glu_total 计算不正确"
assert abs(rel_diff - 0.0078) < 1e-4, f"rel_diff 约 0.0078，实际 {rel_diff}"
assert rel_diff < 0.01, "两者参数量应几乎相等（差异小于 1%）"
assert abs(glu_attn_ratio - 2.0156) < 1e-3, f"与 MHA 注意力之比约 2.0156，实际 {glu_attn_ratio}"
`,
        answer: `d, L = 4096, 32
d_ff_std, d_ff_glu = 16384, 11008

std_layer = 2 * d * d_ff_std
glu_layer = 3 * d * d_ff_glu
std_total = L * std_layer
glu_total = L * glu_layer
rel_diff = round((glu_total - std_total) / std_total, 4)

glu_attn_ratio = round(glu_layer / (4 * d * d), 4)
`,
        explanation:
          '标准 FFN 每层 134,217,728；SwiGLU 每层 135,266,304，相对差 0.78%。这一行数字就是 8/3 倍 d_ff 设计的全部意义：**在几乎不增加参数的前提下获得门控的表达力**。SwiGLU 每层约是 MHA 注意力的 2 倍，因为它占了模型参数的大头。',
        relatedLessonId: 'llm-a3-c2-l4',
        tags: ['SwiGLU', '参数量', '对账'],
      },
      {
        id: 'llm-a3-c2-e12',
        type: 'single',
        difficulty: 3,
        question: '在 SwiGLU 中，门支路经过 SiLU 而值支路保持线性，如果把**值支路**也换成 GELU，那么这属于？',
        options: [
          { value: 'A', text: '仍然是标准 SwiGLU' },
          { value: 'B', text: '变成 ReGLU 变体' },
          { value: 'C', text: '两支都带激活，更接近 Bilinear 之外的另一类变体，表达力与 SwiGLU 不同' },
          { value: 'D', text: '等价于普通 FFN' },
        ],
        answer: 'C',
        explanation:
          'SwiGLU 的定义是"只有门支路带激活"。两支都激活的结构与 GLU 家族的其他变体不同，行为也不同（例如值支路也引入非线性，会改变梯度的传递路径）。它不是 ReGLU（ReGLU 是门支路用 ReLU），也不是普通 FFN。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', '变体'],
      },
      {
        id: 'llm-a3-c2-e13',
        type: 'code',
        difficulty: 4,
        question:
          '实现 **合并权重的 SwiGLU**：把 gate 与 up 的权重在特征维拼成 `W_gate_up`（形状 [d, 2 乘以 d_ff]），一次矩阵乘后再切分。\n\n要求：\n- `W_gate_up = np.concatenate([W1, W3], axis=1)`；\n- 切分时取 `proj[:, :d_ff]` 作为门支路、`proj[:, d_ff:]` 作为值支路；\n- `out_merged` 的结果必须与分开计算的 `out_split` 数值一致（在 1e-10 内）。',
        starterCode: `import numpy as np

def silu(z):
    return z / (1.0 + np.exp(-z))

rng = np.random.default_rng(3)
d, d_ff, n = 6, 4, 5
X = rng.normal(size=(n, d))
W1 = rng.normal(0, 0.4, size=(d, d_ff))   # gate
W3 = rng.normal(0, 0.4, size=(d, d_ff))   # up
W2 = rng.normal(0, 0.4, size=(d_ff, d))

out_split = ___

W_gate_up = ___
proj = ___
gate = ___
up = ___
out_merged = ___
`,
        setupCode: '',
        expectedOutput: '两种实现的输出完全一致',
        tests: `assert W_gate_up.shape == (6, 8), f"合并矩阵形状应为 (6, 8)，实际 {W_gate_up.shape}"
assert np.allclose(W_gate_up[:, :4], W1) and np.allclose(W_gate_up[:, 4:], W3), "拼接顺序应为 gate 在前、up 在后"
assert out_split.shape == (5, 6), "输出形状应为 (5, 6)"
assert np.allclose(out_merged, out_split, atol=1e-10), "合并实现与分开实现的数值应一致"
assert np.allclose(gate, silu(X @ W1)), "门支路应取前 d_ff 列并过 SiLU"
assert np.allclose(up, X @ W3), "值支路应取后 d_ff 列"
`,
        answer: `import numpy as np

def silu(z):
    return z / (1.0 + np.exp(-z))

rng = np.random.default_rng(3)
d, d_ff, n = 6, 4, 5
X = rng.normal(size=(n, d))
W1 = rng.normal(0, 0.4, size=(d, d_ff))
W3 = rng.normal(0, 0.4, size=(d, d_ff))
W2 = rng.normal(0, 0.4, size=(d_ff, d))

out_split = (silu(X @ W1) * (X @ W3)) @ W2

W_gate_up = np.concatenate([W1, W3], axis=1)
proj = X @ W_gate_up
gate = silu(proj[:, :d_ff])
up = proj[:, d_ff:]
out_merged = (gate * up) @ W2
`,
        explanation:
          '合并后再切分只省一次 kernel 启动，数学上完全等价——所以最后一条断言必须成立，如果不等说明切分顺序反了。实际工程中还要注意：**切分顺序必须与权重文件的排布一致**，LLaMA 的 gate_proj 与 up_proj 是两个独立参数，加载后再 concat 才是安全的做法。',
        relatedLessonId: 'llm-a3-c2-l2',
        tags: ['SwiGLU', '融合', '实现'],
      },
      {
        id: 'llm-a3-c2-e14',
        type: 'judge',
        difficulty: 3,
        question: 'FFN 对每个 token 独立计算，不参与 token 之间的信息交互。',
        answer: true,
        explanation:
          '注意力是唯一跨 token 的模块；FFN 对每个 [d] 向量独立做升维、激活、降维，因此可以按 token 完全并行。这也是"长序列时注意力是瓶颈、短序列大 batch 时 FFN 是瓶颈"的原因。',
        relatedLessonId: 'llm-a3-c2-l1',
        tags: ['FFN', '数据流'],
      },
      {
        id: 'llm-a3-c2-e15',
        type: 'fill',
        difficulty: 4,
        question: 'SiLU（Swish）的定义是 z 乘以 sigmoid(z)。补全实现，并写出 SiLU 在负区间的最小值约等于多少（填到小数点后两位）：\n\n```python\ndef silu(z):\n    return z / (1 + ___)   # 填指数项\n```',
        blanks: [['np.exp(-z)', 'math.exp(-z)', 'exp(-z)']],
        explanation:
          '`1 + exp(-z)` 是 sigmoid 的分母形式，`z 乘以 sigmoid(z)` 等价于 `z / (1 + exp(-z))`。SiLU 在负区间先减小后趋近 0，最小值约 -0.278（在 z 约为 -1.278 处取得），与 GELU 的最小值约 -0.17 相比负得更深。',
        relatedLessonId: 'llm-a3-c2-l1',
        tags: ['SiLU', '激活函数'],
      },
      {
        id: 'llm-a3-c2-e16',
        type: 'single',
        difficulty: 4,
        question: 'LLaMA-2 7B 的 d = 4096、d_ff = 11008。若把它改成 d_ff = 16384 的 SwiGLU，参数量会怎样变化（忽略其他部分）？',
        options: [
          { value: 'A', text: '减少约 33%' },
          { value: 'B', text: '基本不变' },
          { value: 'C', text: '增加约 50%，32 层合计多出约 21 亿参数' },
          { value: 'D', text: '增加约 12%' },
        ],
        answer: 'C',
        explanation:
          '3 乘 4096 乘 16384 = 201,326,592，约为原来 135,266,304 的 1.49 倍。每层多约 6600 万参数，32 层共多约 21 亿。这就是"必须按 8/3 倍重新计算 d_ff"的直观理由。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', '参数量'],
      },
      {
        id: 'llm-a3-c2-e17',
        type: 'multiple',
        difficulty: 4,
        question: '关于激活函数 ReLU / GELU / SiLU，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'ReLU 在零点不可导，且负区间梯度恒为 0' },
          { value: 'B', text: 'GELU 在负区间有小幅负值，不是单调的' },
          { value: 'C', text: 'SiLU 是无上界、非单调的平滑函数' },
          { value: 'D', text: 'GELU 的 tanh 近似与精确版完全相等' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错：tanh 近似与基于 erf 的精确版有约 1e-3 量级的差异，这也是混用两种实现时与官方权重对不齐的原因。A、B、C 分别描述了三种激活的关键数学性质。',
        relatedLessonId: 'llm-a3-c2-l1',
        tags: ['激活函数', 'GELU', 'SiLU'],
      },
      {
        id: 'llm-a3-c2-e18',
        type: 'code',
        difficulty: 4,
        question:
          '对比三种激活函数在格点上的统计量，帮助理解它们的行为差异。\n\n对 `xs = np.linspace(-4, 4, 801)`：\n\n1. 计算 `relu_min`、`gelu_min`、`silu_min` 三个最小值；\n2. 计算 `neg_count`：三者在**负区间**上输出严格小于 0 的点数（返回字典）；\n3. 计算 `nonzero_grad_neg`：在 x 属于 (-4, 0) 区间内，数值梯度非零的点数（返回字典）。',
        starterCode: `import numpy as np

def relu(x):
    return np.maximum(0.0, x)

def gelu(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))

def silu(x):
    return x / (1.0 + np.exp(-x))

xs = np.linspace(-4, 4, 801)
neg = xs < 0
h = 1e-5

relu_min, gelu_min, silu_min = ___, ___, ___

neg_count = {}
nonzero_grad_neg = {}
for name, f in (("relu", relu), ("gelu", gelu), ("silu", silu)):
    neg_count[name] = ___
    g = (f(xs + h) - f(xs - h)) / (2 * h)
    nonzero_grad_neg[name] = ___
`,
        setupCode: '',
        expectedOutput: "relu_min = 0.0，gelu_min ≈ -0.17，silu_min ≈ -0.278；relu 在负区间梯度全为 0",
        tests: `assert relu_min == 0.0, f"ReLU 最小值应为 0，实际 {relu_min}"
assert abs(gelu_min + 0.17) < 0.02, f"GELU 最小值约 -0.17，实际 {gelu_min}"
assert abs(silu_min + 0.278) < 0.01, f"SiLU 最小值约 -0.278，实际 {silu_min}"
assert neg_count["relu"] == 0, "ReLU 在负区间不会输出负值"
assert neg_count["gelu"] > 100 and neg_count["silu"] > 100, "GELU 与 SiLU 在负区间都有负输出"
assert nonzero_grad_neg["relu"] == 0, "ReLU 在负区间的梯度恒为 0"
assert nonzero_grad_neg["gelu"] > 0 and nonzero_grad_neg["silu"] > 0, "GELU 与 SiLU 在负区间仍有非零梯度"
`,
        answer: `import numpy as np

def relu(x):
    return np.maximum(0.0, x)

def gelu(x):
    return 0.5 * x * (1.0 + np.tanh(np.sqrt(2 / np.pi) * (x + 0.044715 * x ** 3)))

def silu(x):
    return x / (1.0 + np.exp(-x))

xs = np.linspace(-4, 4, 801)
neg = xs < 0
h = 1e-5

relu_min, gelu_min, silu_min = float(relu(xs).min()), float(gelu(xs).min()), float(silu(xs).min())

neg_count = {}
nonzero_grad_neg = {}
for name, f in (("relu", relu), ("gelu", gelu), ("silu", silu)):
    neg_count[name] = int((f(xs)[neg] < 0).sum())
    g = (f(xs + h) - f(xs - h)) / (2 * h)
    nonzero_grad_neg[name] = int((np.abs(g[neg]) > 1e-6).sum())
`,
        explanation:
          '这三组数字把三种激活的差异一次性说清：ReLU 在负区间"输出 0、梯度 0"；GELU 在负区间有小负值、梯度连续；SiLU 的负值最深（约 -0.278），且尾部衰减更快。**"负区间仍有非零梯度"是 GELU/SiLU 被大量采用的核心原因**，它缓解了 ReLU 的死亡神经元问题。',
        relatedLessonId: 'llm-a3-c2-l1',
        tags: ['激活函数', '数值', 'numpy'],
      },
      {
        id: 'llm-a3-c2-e19',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：为什么 SwiGLU 要用约 8/3 倍 d 的中间维，而不是沿用标准 FFN 的 4d？并说明这一改动对训练与推理分别带来什么影响。',
        referenceAnswer: `**为什么不沿用 4d**

1. 标准 FFN 有 2 个 [d, d_ff] 量级的矩阵，参数约 2d 乘 d_ff；SwiGLU 有 3 个（gate、up、down），参数约 3d 乘 d_ff_new；
2. 若想让两者参数量相同，令 2d 乘 d_ff = 3d 乘 d_ff_new，得 d_ff_new = (2/3) 乘 d_ff；
3. 代入 d_ff = 4d，得 d_ff_new = 8d/3，约 2.67d；
4. LLaMA-2 7B 取 11008（约 2.69d，是 256 的整数倍），与标准 FFN 的 16384 相比参数量只差 0.8%；
5. 设计意图是**在算力预算不变的前提下换取门控带来的质量提升**，而不是单纯"把模型做大"。若仍用 4d，每层 FFN 参数会多 50%，32 层共多约 21 亿参数。

**对训练的影响**

1. 参数量基本不变，但执行的是 3 次更窄的矩阵乘而不是 2 次更宽的，kernel 数量增多，对算子融合与并行度提出更高要求；
2. 门控引入乘性交互，提供更细粒度的特征选择，论文报告在相同算力下训练损失更低；
3. 多一份门控的梯度通路，训练初期需要注意学习率与初始化；SiLU 在负区间有非零梯度，比 ReLU 更不容易出现"死单元"。

**对推理的影响**

1. 参数量守恒，权重显存基本不变；
2. 计算量守恒，但多一次逐元素乘、一次 SiLU、一次额外矩阵乘的调度开销；
3. 可以把 gate 与 up 合并为一个 [d, 2 乘以 d_ff] 的矩阵做单次矩阵乘再切分，抵消部分开销；
4. d_ff 必须对齐 256，否则矩阵乘会退化到低效路径，实际吞吐可能明显下降。`,
        rubric: [
          { point: '写出 2d 乘 d_ff = 3d 乘 d_ff_new 的守恒式', score: 2 },
          { point: '正确推导出 8/3 倍 d 并解释 11008 的取整', score: 2 },
          { point: '指出设计目标是"等算力换质量"而非"做大"', score: 1 },
          { point: '分别说明训练与推理的影响（含算子融合与对齐）', score: 1 },
        ],
        keywords: ['8/3', '参数守恒', '门控', '11008', '对齐', '融合', '等算力'],
        explanation:
          '评分核心是那条守恒式与推导链。能进一步说明"4d 会让模型凭空大 50%"以及"对齐 256 的实际影响"的回答更有工程厚度。',
        tags: ['SwiGLU', '推导', '工程'],
      },
      {
        id: 'llm-a3-c2-e20',
        type: 'judge',
        difficulty: 3,
        question: '在相同 d_ff 下，SwiGLU 比标准 FFN 更省参数，因为它用一次矩阵乘代替了两次。',
        answer: false,
        explanation:
          '恰好相反：在相同 d_ff 下 SwiGLU 用 3 个矩阵而不是 2 个，参数是标准 FFN 的 1.5 倍。"更省"只在重新调整 d_ff 到 2/3 倍之后才成立，那是参数守恒的重新分配，不是结构本身更省。',
        relatedLessonId: 'llm-a3-c2-l2',
        tags: ['SwiGLU', '参数量'],
      },
      {
        id: 'llm-a3-c2-e21',
        type: 'fill',
        difficulty: 4,
        question: 'LLaMA-2 13B 的 d = 5120、d_ff = 13824。按 8/3 倍的公式计算理想值约为 13653，请填出对齐到 256 的倍数后的值：\n\n```python\nd_ideal = 8 / 3 * 5120          # 约 13653.33\nd_aligned = -(-int(d_ideal) // 256) * 256\n```\n\n结果 d_aligned = ___',
        blanks: [['13824']],
        explanation:
          '13653 向上取 256 的倍数：13653 / 256 约等于 53.33，向上取 54，54 乘 256 = 13824。LLaMA-2 13B 实际正是 13824，与推导完全吻合，说明这个对齐公式就是官方采用的策略。',
        relatedLessonId: 'llm-a3-c2-l4',
        tags: ['SwiGLU', 'LLaMA-13B', '对齐'],
      },
      {
        id: 'llm-a3-c2-e22',
        type: 'single',
        difficulty: 4,
        question: '把 gate 与 up 合并成一个大矩阵后单次矩阵乘，主要收益是？',
        options: [
          { value: 'A', text: '减少参数量' },
          { value: 'B', text: '减少 kernel 启动与输入读取次数，提升访存效率' },
          { value: 'C', text: '提高模型的表达能力' },
          { value: 'D', text: '让 d_ff 自动对齐到 256' },
        ],
        answer: 'B',
        explanation:
          '数学上完全等价，参数量不变（只是把两块拼在一起），表达力也不会改变。收益在于少一次 kernel 启动、输入 X 只读一次，对访存密集的 FFN 层有实际加速。代价是切分顺序必须与权重排布一致。',
        relatedLessonId: 'llm-a3-c2-l2',
        tags: ['SwiGLU', '性能', '融合'],
      },
      {
        id: 'llm-a3-c2-e23',
        type: 'multiple',
        difficulty: 5,
        question: '计算 LLaMA-2 7B 的 FFN 参数占比时，下列哪些做法会得到错误的结论？（多选）',
        options: [
          { value: 'A', text: '把 d_ff 当成 4d（16384）来计算' },
          { value: 'B', text: '每层按含 bias 的公式计算' },
          { value: 'C', text: '分母只算 FFN 与注意力，不含 embedding' },
          { value: 'D', text: '用每层 3 个 d 乘 d_ff 的矩阵计算 SwiGLU 的参数量' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是正确的算法，不算错误。A 会把 FFN 参数放大到 1.5 倍；B 在 LLaMA 上是多余的（无 bias）；C 让分母变小、占比偏高（embedding 约 1.3 亿，占 2% 左右）。这三者正是估算题最常见的失分点。',
        relatedLessonId: 'llm-a3-c2-l4',
        tags: ['参数量', '估算', '误区'],
      },
      {
        id: 'llm-a3-c2-e24',
        type: 'code',
        difficulty: 4,
        question:
          '实现一个**参数化 FFN 工厂**，统一支持标准 FFN 与 SwiGLU，并返回两者的参数量。\n\n要求：\n- `make_ffn(d, d_ff, kind)` 返回一个函数 `fn(x)`；`kind` 为 "std"（ReLU FFN）或 "swiglu"；\n- `count_params(kind, d, d_ff)` 返回参数量（无 bias）；\n- 对 d = 4、d_ff = 8 构造两个网络，用同一个输入 X（形状 [2, 4]）分别前向，形状都必须为 (2, 4)；\n- `std_params` 与 `glu_params` 分别记录参数量。',
        starterCode: `import numpy as np

def silu(z):
    return z / (1.0 + np.exp(-z))

def make_ffn(d, d_ff, kind, seed=0):
    rng = np.random.default_rng(seed)
    if kind == "std":
        W1 = rng.normal(0, 0.5, size=(d, d_ff))
        W2 = rng.normal(0, 0.5, size=(d_ff, d))
        return ___
    W1 = rng.normal(0, 0.5, size=(d, d_ff))
    W3 = rng.normal(0, 0.5, size=(d, d_ff))
    W2 = rng.normal(0, 0.5, size=(d_ff, d))
    return ___

def count_params(kind, d, d_ff):
    return ___

X = np.random.default_rng(9).normal(size=(2, 4))
f_std = make_ffn(4, 8, "std")
f_glu = make_ffn(4, 8, "swiglu")
y_std = f_std(X)
y_glu = f_glu(X)
std_params = count_params("std", 4, 8)
glu_params = count_params("swiglu", 4, 8)
`,
        setupCode: '',
        expectedOutput: '两种 FFN 输出形状均为 (2, 4)；参数量 64 与 96',
        tests: `assert y_std.shape == (2, 4) and y_glu.shape == (2, 4), "两种网络的输出形状都应为 (2, 4)"
assert std_params == 2 * 4 * 8, f"标准 FFN 参数量应为 64，实际 {std_params}"
assert glu_params == 3 * 4 * 8, f"SwiGLU 参数量应为 96，实际 {glu_params}"
assert glu_params == std_params * 1.5, "相同 d_ff 下 SwiGLU 参数应为标准 FFN 的 1.5 倍"
assert not np.allclose(y_std, y_glu), "两种结构的输出不应相同"
`,
        answer: `import numpy as np

def silu(z):
    return z / (1.0 + np.exp(-z))

def make_ffn(d, d_ff, kind, seed=0):
    rng = np.random.default_rng(seed)
    if kind == "std":
        W1 = rng.normal(0, 0.5, size=(d, d_ff))
        W2 = rng.normal(0, 0.5, size=(d_ff, d))
        return lambda x: np.maximum(0.0, x @ W1) @ W2
    W1 = rng.normal(0, 0.5, size=(d, d_ff))
    W3 = rng.normal(0, 0.5, size=(d, d_ff))
    W2 = rng.normal(0, 0.5, size=(d_ff, d))
    return lambda x: (silu(x @ W1) * (x @ W3)) @ W2

def count_params(kind, d, d_ff):
    return 2 * d * d_ff if kind == "std" else 3 * d * d_ff

X = np.random.default_rng(9).normal(size=(2, 4))
f_std = make_ffn(4, 8, "std")
f_glu = make_ffn(4, 8, "swiglu")
y_std = f_std(X)
y_glu = f_glu(X)
std_params = count_params("std", 4, 8)
glu_params = count_params("swiglu", 4, 8)
`,
        explanation:
          '用闭包把权重"藏"在函数里，是写教学代码时很干净的写法。参数量公式 2dd_ff 与 3dd_ff 正好对应"相同 d_ff 下门控多 50%"这个事实。注意 `seed=0` 让两种结构用同一初始分布，方便对比输出差异。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', 'FFN', '实现'],
      },
      {
        id: 'llm-a3-c2-e25',
        type: 'judge',
        difficulty: 4,
        question: 'd_ff 取 11008 而不是 10923，是因为 11008 能让模型的表达力显著提升。',
        answer: false,
        explanation:
          '11008 与 10922.67 差 85 个维度，对表达力的影响可以忽略。选 11008 是因为它是最接近的 **256 的整数倍**，GPU 矩阵乘在对齐时才能走高效路径（张量核分块通常要求 128/256 对齐）。这是纯粹的工程原因。',
        relatedLessonId: 'llm-a3-c2-l3',
        tags: ['SwiGLU', '对齐', '性能'],
      },
      {
        id: 'llm-a3-c2-e26',
        type: 'single',
        difficulty: 3,
        question: '在 LLaMA-2 7B 中，FFN 参数约占总参数的？',
        options: [
          { value: 'A', text: '约 15%' },
          { value: 'B', text: '约 33%' },
          { value: 'C', text: '约 64%' },
          { value: 'D', text: '约 90%' },
        ],
        answer: 'C',
        explanation:
          '每层 FFN 约 1.353 亿，32 层约 43.3 亿；总参数约 67 亿（含 Q/K/V/O 约 13.4 亿、embedding 约 1.3 亿、归一化约 26 万），FFN 占约 64%。这不是巧合：GPT 系列的参数结构一贯以 FFN 为主体。',
        relatedLessonId: 'llm-a3-c2-l4',
        tags: ['FFN', '参数量', 'LLaMA'],
      },
    ],
  },
  {
    id: 'llm-a3-c3',
    title: 'RoPE：旋转位置编码',
    goal: '理解绝对位置编码的局限，掌握 RoPE 的复数与二维旋转矩阵表述，能推导其相对位置性质，并了解 NTK 插值等长上下文外推手段。',
    lessons: [
      {
        id: 'llm-a3-c3-l1',
        title: '绝对位置编码的问题与外推困境',
        content: `
## 学习目标

学完本节，你应该能够：
1. 说明绝对位置编码（正弦/可学习）的两大局限：**外推断崖**与**相对位置不可直接表达**；
2. 用实验思维描述"训练 2K、推理 4K"时可学习 PE 的失效形态；
3. 解释注意力打分 $q_m \\cdot k_n$ 的平移敏感性——为什么绝对编码进词向量无法保证"只看相对距离"。

## 前置知识

- 三种位置编码方案概览（llm-a1 c2-l3）；
- 点积对输入扰动的敏感性（矩阵乘法直觉）。

## 问题背景：GPT-2 的位置编码撑不起长上下文时代

可学习绝对 PE（GPT-2/3 时代）：给每个位置 0..L−1 发一张可训练的向量牌，加进词嵌入。简单有效，但两个结构性问题在长上下文时代爆发：① 训练长度 2048，推理时第 2049 个位置**没有牌可发**（查找表越界）；硬外推（重复/截断）导致注意力分布崩坏。② 即使正弦编码理论上外推，绝对编码进入词向量后，位置 m 与 n 的交互项 $q_m \\cdot k_n$ 无法写成"只依赖 m−n"的形式——**模型要自己从绝对坐标里学出相对关系**，浪费容量且泛化差。

## 直觉理解：座位号印在脸上 vs 面对面站位差

- **绝对 PE = 座位号印在每个人脸上**：两人交流（注意力）要各自"读对方脸上的号"再心算差值——费劲且没见过的号（超长位置）直接懵；
- **RoPE = 让每个人按座位旋转一个角度**：两人点积时角度差自动出现——**交流本身只携带"我们相距多少"的信息**，从没见过绝对座位 4096 也无妨，只要"相距 5"这个关系见过。

## 核心概念：两大局限的数学表述

**局限一（外推）**：可学习 PE 是查找表 $E \\in \\mathbb{R}^{L \\times d}$，位置 $t \\ge L$ 无定义；正弦 PE 虽可计算任意 t，但训练分布外的频率组合从未被注意力"校准"，实测长文本困惑度仍会恶化。

**局限二（相对性）：设加性编码 $x_m + p_m$，注意力打分展开：

$$(x_m + p_m)^\\top W^Q{}^\\top W^K (x_n + p_n) = x_m^\\top A x_n + x_m^\\top A p_n + p_m^\\top A x_n + p_m^\\top A p_n$$

四项中只有第一项与位置无关——位置信息以**绝对坐标的交叉项**混入，没有任何一项天然只是 $(m - n)$ 的函数。模型必须用容量去拟合"每个绝对距离上的行为"，而不是直接参数化相对距离。

## 完整案例：外推断崖的思维实验

设 GPT-2 小模型训练上下文 1024。分别喂 512、1024、2048 token 的文本测困惑度：
- 512 / 1024：正常（训练分布内）；
- 2048：前 1024 个位置正常，第 1025 个起要么截断（后文全部丢失）、要么把位置 1024 的牌重复用（两个"位置 1024"互相注意，语义混乱）——**困惑度在越过训练长度那一刻断崖式跳升**。正弦编码的软化版本：不崩溃但明显劣化（外推质量差的实证，催生 ALiBi/NTK/YaRN 等补丁，见 c3-l4）。

## 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
d, L_train = 32, 100

E = rng.normal(0, 0.5, (L_train, d))          # 可学习位置表（训练长度 100）

def attend(pos_q, pos_k, x_q, x_k):
    # 简化注意力打分：(x+p)W_q · (x+p)W_k，W 取单位阵
    q = x_q + E[pos_q % L_train]
    k = x_k + E[pos_k % L_train]
    return q @ k

x_q, x_k = rng.normal(0, 1, d), rng.normal(0, 1, d)
print("分布内  q@40,k@45 :", round(attend(40, 45, x_q, x_k), 2))
print("分布内  q@90,k@95 :", round(attend(90, 95, x_q, x_k), 2))
print("越界    q@140,k@145(回绕到 40/45):", round(attend(140, 145, x_q, x_k), 2))
print("同一内容，越界打分与分布内 40/45 完全相同 -> 位置身份坍缩")
\`\`\`

预期输出：越界位置回绕后与分布内 40/45 的打分**完全相同**——模型把"相距 105"误认成"相距 5"，绝对位置身份坍缩，这就是外推失败的最小复现。**常见错误**：以为截断（只看前 L）无害（后文信息全丢）；正弦编码外推"免费"（质量仍衰减，需插值补丁）。

## 常见误区

1. **"正弦编码彻底解决外推"**——只是"可计算"，不是"性能不降"；ALiBi 线性惩罚、NTK/YaRN 频率缩放才是针对外推的专门设计；
2. **绝对 PE 一无是处**——短上下文、任务简单时它便宜稳定；工程演进是"够用→不够→换"；
3. **把"加进词向量"当唯一注入方式**——注入可以在输入层（加性）、注意力内（RoPE/T5 偏置）等不同层面，相对性问题的根源在"加性绝对注入"；
4. **外推问题只关于长度**——还关于**分布**：训练从未见过"远距离高相关性"的样本对。

## 知识关联

- **向前**：llm-a1 c2-l3 的三方案概览给出本节的动机铺垫；
- **向后**：下一节复数视角、c3-l3 相对性质推导（RoPE 如何根治局限二）、c3-l4 外推补丁（缓解局限一）；
- **平行**：RAG 长上下文、推理部署的上下文扩展全都踩在本节的问题上。

## 本节总结

| 局限 | 表现 | 根源 |
| --- | --- | --- |
| 外推断崖 | 越过训练长度困惑度跳升 | 查找表无越界定义 / 频率组合未校准 |
| 相对不可表达 | $q \\cdot k$ 混入绝对坐标交叉项 | 加性绝对注入的位置进入点积 |
| 解法预告 | RoPE（相对性）+ 插值/缩放（外推） | c3-l2/c3-l3/c3-l4 |

## 参考资料

> **来源类型：学术来源**
> - Vaswani, A., et al. (2017). arXiv:1706.03762，§3.5——正弦编码的" hoped extrapolation"原话（作者自己也只是希望）。
> - Su, J., et al. (2021). arXiv:2104.09864——对绝对编码相对性缺陷的论述动机。
> - Press, O., Smith, N., & Lewis, M. (2022). "Train Short, Test Long: Attention with Linear Biases (ALiBi)." *EMNLP 2022*——外推断崖与补丁的实证。
>
> **来源类型：原创**
> - 座位号比喻与回绕复现实验为本课程原创。
`,
        tips: [
          {
            kind: 'interview',
            text: '被问"绝对位置编码有什么缺点"，至少答两点：一是外推困难（可学习表没有超长位置的参数），二是"位置与语义混在同一个向量里相加"。再顺势引出相对位置编码的必要性。',
          },
          {
            kind: 'pitfall',
            text: '"RoPE 可以外推"是一个过于乐观的说法。RoPE 的内部结构确实不依赖最大长度，但模型在训练长度之外的表现仍会退化，这需要插值、NTK 缩放等手段配合。',
          },
          {
            kind: 'note',
            text: '加性的绝对编码可以看作"用低秩方式注入位置"；乘性的 RoPE 则是"用正交变换调制方向"。两者在实现上只差几行代码，但对长度扩展的影响迥异。',
          },
        ],
        demos: [
          {
            title: '可学习绝对编码的外推失败演示',
            lang: 'python',
            code: `import numpy as np

rng = np.random.default_rng(0)
max_len, d = 16, 8
pos_table = rng.normal(0, 0.02, size=(max_len, d))   # 训练时只学了 16 个位置

def add_pos(x, pos):
    """x: [n, d]；超过 max_len 时无法查到参数。"""
    if pos.max() >= max_len:
        raise IndexError(f"位置 {pos.max()} 超出训练长度 {max_len}")
    return x + pos_table[pos]

X = rng.normal(size=(16, d))
try:
    add_pos(X, np.arange(16))
    print("长度 16：正常")
    add_pos(X, np.arange(32))
except IndexError as e:
    print("长度 32：", e)

# 退而求其次：对位置表做线性插值到 32 行，但相邻位置的差异被压缩
scaled = np.linspace(0, max_len - 1, 32)
idx = np.floor(scaled).astype(int)
frac = (scaled - idx)[:, None]
idx2 = np.minimum(idx + 1, max_len - 1)
table32 = pos_table[idx] * (1 - frac) + pos_table[idx2] * frac

diff_orig = np.linalg.norm(pos_table[1] - pos_table[0])
diff_new = np.linalg.norm(table32[1] - table32[0])
print(f"原表中相邻位置的距离: {diff_orig:.5f}")
print(f"插值后相邻位置的距离: {diff_new:.5f}（被压缩到原来的 {diff_new / diff_orig:.2f} 倍）")
print("模型训练时从未见过这种尺度，因此插值后通常需要继续训练。")`,
          },
        ],
      },
      {
        id: 'llm-a3-c3-l2',
        title: '复数视角：把二维向量旋转一个角度',
        content: `
### 学习目标

学完本节，你应该能够：
1. 从二维旋转矩阵出发写出 RoPE 的复数形式，证明正交（保模长）与可加（R(a)R(b)=R(a+b)）；
2. 说明 d 维拆 d/2 个二维平面、角频率 base^(-2i/d) 的几何级数分布；
3. 证明 (R_m q)·(R_n k) 只依赖 m−n，即注意力打分的相对位置性质。

### 前置知识

- llm-a1 的正弦位置编码；
- 线性代数：正交矩阵与复数乘法。

### 问题背景

GPT-2 用可学习的绝对位置表，训多长用多长，出训练长度就崩。RoPE 把『位置』变成对 q/k 的纯旋转——零参数、天然相对、还能外推。LLaMA、Qwen、DeepSeek 全家都用它；长上下文（PI/NTK/YaRN）这门生意也建在它上面。

### 直觉理解

把二维向量想成时钟指针：RoPE 给第 m 个 token 的 q/k 各转一个与 m 成正比的角度。注意力打分是指针夹角（内积），只取决于『指针相差多少格』——即相对位置。d 维向量拆成 d/2 根指针：秒针（高频）转得快、区分近距离，时针（低频）转得慢、编码远距离。外推时别动秒针，只把时针放慢（NTK 的本质）。

### 核心概念与原理详解

## 先看最简单的情形：二维

考虑一个二维向量 (x1, x2)。把向量绕原点旋转角度 theta，得到：

x1' = x1 乘以 cos(theta) - x2 乘以 sin(theta)
x2' = x1 乘以 sin(theta) + x2 乘以 cos(theta)

写成矩阵形式就是熟悉的二维旋转矩阵：

R(theta) = [[cos(theta), -sin(theta)], [sin(theta), cos(theta)]]

它有两条关键性质：

1. **正交**：R 的转置乘 R 等于单位阵，所以旋转不改变向量长度：||R(theta) x|| = ||x||；
2. **可加**：R(a) 乘 R(b) = R(a + b)。这是所有推导的基石。

## 复数表示：只剩一个指数

把 (x1, x2) 看成复数 x1 + i 乘以 x2，旋转就是乘一个单位复数 e^(i theta)：

(x1 + i x2) 乘以 e^(i theta) = (x1 + i x2) 乘以 (cos theta + i sin theta)
= (x1 cos theta - x2 sin theta) + i (x1 sin theta + x2 cos theta)

实部与虚部正好对应上面那两个坐标。复数写法让"旋转"变成一个**标量乘法**，并且立刻得到**模长不变**（|e^(i theta)| = 1）。

## 把 d 维拆成 d/2 个二维平面

RoPE 的做法是：把 d 维向量的**前半段与后半段配对**，把 (x_i, x_{i + d/2}) 看作一个二维向量，绕各自的原点旋转。第 i 对的旋转角是

theta_i(m) = m 乘以 base^(-2i/d)，其中 i = 0, 1, ..., d/2 - 1

这里 m 是位置，base 通常取 10000。**注意不同 i 的角度不同**：i = 0 时角度变化最快（波长最短），i 接近 d/2 时变化最慢（波长最长）。这与正弦编码里"不同维度有不同分辨率"的思想一致——相当于用一组几何级数分布的"秒针、分针、时针"来表示位置。

## 完整公式

记 half = d/2，对位置 m 的向量 x：

x1 = x[0 : half]，x2 = x[half : d]
cos_i = cos(m 乘以 theta_i)，sin_i = sin(m 乘以 theta_i)

out[0 : half] = x1 乘以 cos - x2 乘以 sin
out[half : d] = x1 乘以 sin + x2 乘以 cos

这就是 Hugging Face 实现的 rotate_half 版本（LLaMA 的 rotate_half 用的是相邻两维配对，两者在数学上等价，只是维度排列不同）：

\`\`\`python
def rotate_half(x):
    x1, x2 = x[..., : x.shape[-1] // 2], x[..., x.shape[-1] // 2 :]
    return np.concatenate([-x2, x1], axis=-1)

def apply_rope(x, cos, sin):
    return x * cos + rotate_half(x) * sin
\`\`\`

其中 cos、sin 的形状是 [n, half] 复制两次拼成 [n, d]。**展开验证一下**：前半段是 x1 乘 cos 加 (-x2) 乘 sin，即 x1 cos - x2 sin；后半段是 x2 乘 cos 加 x1 乘 sin，即 x1 sin + x2 cos。完全一致。

## 为什么旋转不改变注意力分数的量级

注意力分数是 q 与 k 的内积。RoPE 对 q、k 都是正交变换，两个向量的长度都不变，内积的绝对值也不会被放大。这一点是加法式位置编码做不到的（加法会改变向量的模长）。**归一化意义上的"尺度守恒"让 RoPE 与 layernorm 的关系更干净**。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
np.set_printoptions(precision=4, suppress=True)

def rope_cos_sin(n, half, base=10000.0):
    theta = base ** (-np.arange(half) / half)     # d=2*half -> base^(-2i/d)
    ang = np.outer(np.arange(n), theta)
    return np.cos(ang), np.sin(ang)

def apply_rope(X, base=10000.0):                  # X: [n, d]，对半配对
    n, d = X.shape; half = d // 2
    cos, sin = rope_cos_sin(n, half, base)
    cos = np.concatenate([cos, cos], -1); sin = np.concatenate([sin, sin], -1)
    x1, x2 = X[:, :half], X[:, half:]
    return np.concatenate([x1*cos[: ,:half] - x2*sin[:, :half],
                           x1*sin[:, half:] + x2*cos[:, half:]], -1)

# ---- 1. 旋转保模长 ----
X = np.random.default_rng(1).normal(size=(4, 8))
XR = apply_rope(X)
print("逐位置模长差 max:", float(np.abs(np.linalg.norm(XR, axis=1) - np.linalg.norm(X, axis=1)).max()))

# ---- 2. 相对位置性质：dot 只依赖 m-n ----
rng = np.random.default_rng(2)
q, k = rng.normal(size=8), rng.normal(size=8)
def dot(m, n):
    return float(apply_rope(q[None, :].repeat(max(m, n)+1, 0))[m] @ apply_rope(k[None, :].repeat(max(m, n)+1, 0))[n])
d1, d2 = dot(5, 2), dot(9, 6)
print("dot(m=5,n=2)=%.4f  dot(m=9,n=6)=%.4f  相等: %s" % (d1, d2, abs(d1-d2) < 1e-5))

# ---- 3. PI vs NTK：位置 8192 的角频率变化 ----
s, d, base, m = 4, 8, 10000.0, 8192
base2 = base * s**(d/(d-2))
print("i=0（秒针）PI 后角 %.2f rad, NTK 后角 %.2f rad（不变）" % ((m/s) % (2*np.pi), (m*1.0) % (2*np.pi)))
for i in (2, 3):
    t = base ** (-2*i/d); t2 = base2 ** (-2*i/d)
    print(f"  i={i}: 波长 {2*np.pi/t:.1f} -> {2*np.pi/t2:.1f}（时针放慢，远距编码拉伸）")\`\`\`

预期输出（实测）：逐位置模长差 max≈2.2e-16（旋转保模长）；dot(m=5,n=2)=dot(m=9,n=6)=0.3086（相对位置性质成立）；i=0 秒针：PI 后角 5.96 rad 被压缩、NTK 保持 5.01 rad 不变；i=2/3 时针：波长 628.3→1583.3、6283.2→25132.7（低频放慢，远距编码拉伸）。

**常见错误**：rotate_half 的配对约定混用（相邻配对与对半配对等价但不可混）；cos/sin 表按训练 base 预计算后，改 base 外推时忘了重算；只给 q 加 RoPE 忘了 k（q、k 都要加，v 不能加）。

### 常见误区

1. **『RoPE 是绝对位置编码』**——它用绝对位置算角度，但内积只依赖相对位置差；\\n2. **『位置插值就是位置号除以 s』**——PI 压缩所有频率、近距分辨率受损；NTK 只放慢低频，两者微调步数也不同；\\n3. **『支持 128K = 128K 质量不掉』**——外推必须配长文本继续训练，纯改参数往往只能撑 2 倍。

### 知识关联

- **向前**：c4 的 KV Cache 缓存 RoPE 后的 k，外推方案直接决定缓存与 cos/sin 表策略；
- **向后**：c6 MLA 的解耦 RoPE 是本章思想在低秩压缩下的突围；
- **平行**：llm-a1 的正弦位置编码是 RoPE 的『加法表亲』，对比着学最快。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 核心 | R(m)q · R(n)k 只依赖 m−n，正交旋转保模长 |
| 结构 | d 维拆 d/2 个二维平面，角频率 base^(-2i/d) 几何级数 |
| 复数视角 | 乘单位复数 e^{iθ}，旋转变标量乘法 |
| PI | 位置号 × L_train/L_target，简单但损近距分辨率 |
| NTK | 改 base：高频几乎不动、低频放慢，YaRN 再加温度补偿 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'note',
            text: 'RoPE 有两种维度配对方式：前后半段配对（Hugging Face 的 llama 实现）与相邻两维配对（部分实现与论文原始描述）。两者数学等价，但权重与实现必须配套，否则位置信息完全错乱。',
          },
          {
            kind: 'pitfall',
            text: '`rotate_half` 的符号很容易写错。一个可靠的检查：把输入取 (1, 0)，位置 0 时输出应仍是 (1, 0)；位置 1 时输出应为 (cos 1, sin 1)，实部变小、虚部变大，角度是旋转后的结果。',
          },
          {
            kind: 'interview',
            text: '被问"RoPE 为什么不作用在 V 上"：位置只影响"谁该被关注多少"（QK 相似度），不改变"被关注的内容"（V）。作用在 V 上会破坏值的语义，且没有理论依据。',
          },
        ],
        demos: [
          {
            title: '二维旋转：从矩阵形式到复数形式',
            lang: 'python',
            code: `import numpy as np

def rotate_2d(v, theta):
    c, s = np.cos(theta), np.sin(theta)
    return np.array([v[0] * c - v[1] * s, v[0] * s + v[1] * c])

v = np.array([1.0, 0.0])
for deg in (0, 30, 90, 180):
    r = rotate_2d(v, np.deg2rad(deg))
    print(f"旋转 {deg:3d} 度 -> {np.round(r, 4)}  长度 {np.linalg.norm(r):.4f}")

# 复数视角完全等价
z = 1 + 0j
for deg in (0, 30, 90, 180):
    w = z * np.exp(1j * np.deg2rad(deg))
    print(f"复数旋转 {deg:3d} 度 -> ({w.real:.4f}, {w.imag:.4f})")

# 可加性：先转 a 再转 b = 直接转 a+b
a, b = 0.3, 1.1
print()
print("两次旋转与一次旋转一致:",
      np.allclose(np.array([[np.cos(a + b), -np.sin(a + b)], [np.sin(a + b), np.cos(a + b)]])
                  @ v,
                  rotate_2d(rotate_2d(v, a), b)))`,
          },
          {
            title: 'RoPE 实现：前后半段配对',
            lang: 'python',
            code: `import numpy as np

def rope(x, positions, base=10000.0):
    """x: [n, d]，positions: [n]，返回同形状的旋转结果。"""
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)       # [half]
    ang = positions[:, None] * theta[None, :]       # [n, half]
    c, s = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    return np.concatenate([x1 * c - x2 * s, x1 * s + x2 * c], axis=1)

rng = np.random.default_rng(0)
q = rng.normal(size=(1, 8))
k = rng.normal(size=(1, 8))

rot = rope(q, np.array([7]))
print("旋转前后长度:", round(float(np.linalg.norm(q)), 6), round(float(np.linalg.norm(rot)), 6))
print("位置 0 时旋转不改变向量:", np.allclose(rope(q, np.array([0]))[0], q[0]))

s1 = (rope(q, np.array([0])) @ rope(k, np.array([4])).T)[0, 0]
s2 = (rope(q, np.array([10])) @ rope(k, np.array([14])).T)[0, 0]
print()
print("相对距离 4 的两组注意力分数:", round(float(s1), 6), round(float(s2), 6))
print("二者相等（相对位置性质）:", np.allclose(s1, s2))

s3 = (rope(q, np.array([0])) @ rope(k, np.array([5])).T)[0, 0]
print("相对距离改为 5 后分数:", round(float(s3), 6), "（不同）")`,
          },
        ],
      },
      {
        id: 'llm-a3-c3-l3',
        title: '相对位置性质的完整推导',
        content: `
## 学习目标

学完本节，你应该能够：
1. 用复数乘法完成 RoPE 相对性质的两行核心证明：$\\langle R_m q, R_n k \\rangle = \\langle q, R_{n-m} k \\rangle$；
2. 说明"两维一对、不同对不同频率"的实现细节，以及它为何等价于多分辨率尺；
3. 指出 RoPE 只旋转 q、k 不旋转 v 的原因。

## 前置知识

- 复数乘法 $e^{i\\theta}$ = 旋转角 θ（欧拉公式）；
- 共轭复数与内积：$\\langle a, b\\rangle = \\mathrm{Re}(a^* b)$（二维实向量视为复数时）；
- 上一节"绝对编码无法表达相对位置"的痛点。

## 问题背景：让"绝对旋转"在点积中只留下"相对差"

RoPE 的目标极简：给位置 m 的 q 旋转角 $m\\theta$、位置 n 的 k 旋转角 $n\\theta$，要求它们的点积**只依赖 $(n-m)$**。如果能做到，注意力天然变成相对位置函数——外推与泛化的根基。证明只需复数两行。

## 原理详解：两行核心证明（2 维情形）

把 2 维 q、k 视为复数。RoPE 定义：$q'_m = q\\, e^{im\\theta}$，$k'_n = k\\, e^{in\\theta}$。内积（取实部的共轭乘积）：

$$\\langle q'_m, k'_n \\rangle = \\mathrm{Re}\\left[(q\\, e^{im\\theta})^*\\, (k\\, e^{in\\theta})\\right] = \\mathrm{Re}\\left[q^* k\\; e^{i(n-m)\\theta}\\right]$$

**绝对角 m、n 消失，只剩余 $(n-m)$**——第一行完证。第二行换个视角：$q^* k\\, e^{i(n-m)\\theta}$ 恰是"先算 $q^*k$ 再旋转相对角 $(n-m)\\theta$"，即

$$\\langle R_m q, R_n k \\rangle = \\langle q, R_{n-m}\\, k \\rangle$$

（$R_t$ 表示旋转 $t\\theta$。）**q 与 k 各自带着绝对位置旋转，但它们的"对话"只由位置差决定**——这正是 c3-l1 痛点的根治。

数值验证（本页可跑，断言恒等式在随机复数、随机位置下成立）：

\`\`\`python
import cmath
q, k = 3 + 4j, 1 - 2j
for m, n in ((3, 5), (10, 12), (0, 2)):
    lhs = (q * cmath.exp(1j * m * 0.5)).conjugate() * (k * cmath.exp(1j * n * 0.5))
    rhs = q.conjugate() * k * cmath.exp(1j * (n - m) * 0.5)
    assert abs(lhs - rhs) < 1e-9        # 恒等
print("RoPE 相对性质数值验证通过")
\`\`\`

## 核心概念：从 2 维到多维——分块旋转

$d$ 维向量按 (2i, 2i+1) 分成 $d/2$ 对，第 i 对用频率 $\\theta_i = 10000^{-2i/d}$ 旋转——与正弦编码同一套频率表。效果：
- **每对是一把尺**：高频对（θ 大）旋转快，分辨近邻距离（距离 1~10）；低频对（θ 小）旋转慢，分辨远距离（数百上千）；
- **多对联合编码**：两个位置的"距离指纹" = 各对相位差组成的向量——远近都能唯一刻画（时钟的时针/分针/秒针同理）。

**为什么只旋转 q、k**：注意力只需在 $q \\cdot k$ 打分处携带相对位置；v 承载内容、不参与打分，旋转 v 毫无作用还引入失真。同理，输出投影、FFN 一概不转。

## 完整案例：手算一对维度的旋转

设某对维度 $\\theta = 0.5$（rad/位置），q 该对坐标 $(1, 0)$（即复数 1），m = 2：$q'_m = e^{i \\cdot 1} = \\cos 1 + i\\sin 1 \\approx 0.540 + 0.842i$。k 该对 $= 1$（复数 1），n = 5：$k'_n = e^{i \\cdot 2.5} \\approx -0.801 + 0.598i$。内积：

$$\\langle q'_m, k'_n \\rangle = \\mathrm{Re}(e^{-i \\cdot 1} \\cdot e^{i \\cdot 2.5}) = \\cos(1.5) \\approx 0.071$$

直接用相对式：$\\cos((5-2) \\times 0.5) = \\cos 1.5 \\approx 0.071$ ✓——两条路径同一答案，绝对角从未出现。

## 常见误区

1. **"RoPE 给模型注入了位置向量"**——没有可学习的位置参数（0 新增参数）；位置信息只存在于 q、k 旋转后的几何关系里；
2. **旋转矩阵要显式构造**——实现上每对维度是 2×2 旋转的稀疏分块，可用 \`(x1, x2) → (x1cos−x2sin, x1sin+x2cos)\` 逐对计算，无需大矩阵乘；
3. **每层都要转**——是的，RoPE 在**每层注意力**的 q、k 上施加（与加性 PE 只在输入层一次不同），这是它保持相对性的必要条件；
4. **远距离信息随旋转"模糊"**——低频对覆盖远距离，但超训练长度仍需 NTK/YaRN 频率调整（下一节）。

## 知识关联

- **向前**：c3-l1 的两大局限分别被本节（相对性）与 c3-l4（外推）处理；llm-a1 c2-l3 的旋转直觉在此完成证明；
- **向后**：c4/c5 组装 LLaMA（RoPE 施加点在注意力内部）；B3 部署课程的 KV Cache 与 RoPE 的施加顺序是常见实现 bug 源；
- **平行**：DeepSeek 的解耦 RoPE（c6-l2）把位置与内容维度分离——本节思想的多维扩展。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 核心恒等式 | $\\langle R_m q, R_n k\\rangle = \\langle q, R_{n-m} k\\rangle$（复数两行可证） |
| 实现 | d 维分对旋转，$\\theta_i = 10000^{-2i/d}$，多分辨率尺 |
| 只转 q、k | 打分才需要位置；v/输出/FFN 不转 |
| 性质 | 零新增参数；每层施加；相对位置天然外推友好 |

## 参考资料

> **来源类型：学术来源**
> - Su, J., et al. (2021). "RoFormer: Enhanced Transformer with Rotary Position Embedding." arXiv:2104.09864（已核验）——本节推导的原始出处（§3.2）。
>
> **来源类型：参考资料**
> - EleutherAI Blog "Rotary Embeddings: A Relative Revolution"——复数视角的独立讲法（与本节同路线）。
>
> **来源类型：原创**
> - 时钟多针比喻与数值验证脚本为本课程改编。
`,
        tips: [
          {
            kind: 'leak',
            text: '推导只需三行：内积 = q^T R(m)^T R(n) k = q^T R(-m) R(n) k = q^T R(n-m) k。面试写这三行就够了，千万不要从三角函数展开硬算。',
          },
          {
            kind: 'pitfall',
            text: 'KV Cache 解码时位置必须沿用"已缓存长度"作为偏移，否则新 token 全被当成位置 0。自实现 RoPE 时要显式维护 position_offset。',
          },
          {
            kind: 'interview',
            text: '追问"RoPE 能外推吗"：能"理论上无限"，但不能"训练长度外仍好用"。高分回答会区分"公式可计算"与"模型可泛化"。',
          },
        ],
        demos: [
          {
            title: '数值验证相对位置性质',
            lang: 'python',
            code: `import numpy as np

def rope(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    c, s = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    return np.concatenate([x1 * c - x2 * s, x1 * s + x2 * c], axis=1)

rng = np.random.default_rng(1)
q = rng.normal(size=(1, 16))
k = rng.normal(size=(1, 16))

def score(m, n):
    return float((rope(q, np.array([m])) @ rope(k, np.array([n])).T)[0, 0])

print("固定相对距离 7，改变绝对位置：")
base = score(0, 7)
for m in (0, 10, 100, 1000, 12345):
    s = score(m, m + 7)
    print(f"  m={m:6d}  score={s: .8f}  与基线一致={np.isclose(s, base)}")

print()
print("相对距离不同则分数不同：")
for gap in range(0, 6):
    print(f"  gap={gap}  score={score(0, gap): .6f}")

# d 维内积 = 各二维平面内积之和
print()
print("长度守恒（旋转是正交变换）:")
for m in (0, 13, 4096):
    print(f"  m={m}: ||q||={np.linalg.norm(q):.6f}  ||R(m)q||={np.linalg.norm(rope(q, np.array([m]))):.6f}")`,
          },
        ],
      },
      {
        id: 'llm-a3-c3-l4',
        title: '长上下文外推：位置插值、NTK 缩放与 YaRN',
        content: `
### 学习目标

学完本节，你应该能够：
1. 对比直接外推/PI/NTK/YaRN 四条路线的处理位置方式与代价；
2. 解释 PI 的分辨率损失与 NTK『高频不动、低频放慢』的直觉；
3. 记住实践要点：外推需少量继续训练、要用长文本任务评测而非只看困惑度。

### 前置知识

- 「复数视角」（l2）的角频率 base^(-2i/d)；
- KV Cache 的位置概念。

### 问题背景

GPT-2 用可学习的绝对位置表，训多长用多长，出训练长度就崩。RoPE 把『位置』变成对 q/k 的纯旋转——零参数、天然相对、还能外推。LLaMA、Qwen、DeepSeek 全家都用它；长上下文（PI/NTK/YaRN）这门生意也建在它上面。

### 直觉理解

把二维向量想成时钟指针：RoPE 给第 m 个 token 的 q/k 各转一个与 m 成正比的角度。注意力打分是指针夹角（内积），只取决于『指针相差多少格』——即相对位置。d 维向量拆成 d/2 根指针：秒针（高频）转得快、区分近距离，时针（低频）转得慢、编码远距离。外推时别动秒针，只把时针放慢（NTK 的本质）。

### 核心概念与原理详解

## 问题的准确描述

假设模型在 4096 长度上训练，现在要处理 32768 长度。三种做法：

1. **直接外推**：照常算 RoPE。位置角度超过训练范围，高频项绕圈，注意力分布崩坏；
2. **位置插值（PI）**：把所有位置按比例压缩，m' = m 乘以 4096 / 32768；
3. **NTK 感知缩放 / 频率插值**：只调整部分频率，或改变 base；
4. **YaRN**：在 NTK 基础上再加温度缩放与分段策略。

## 位置插值：简单有效但牺牲分辨率

PI 的思路是：既然模型"没见过"位置 8000，那就永远不让它见到——把 8192 压缩到 4096 以内：

theta_i(m') = m' 乘以 base^(-2i/d)，m' = m 乘以 (L_train / L_target)

优点：不需要改模型结构，只需微调少量步数即可把上下文扩 2 到 4 倍。

缺点：**分辨率损失**。相邻两个 token 的角度差被压缩到原来的 1/8，模型对"位置 100 与位置 101"的区分能力下降，近距离的位置分辨变弱。

## NTK 感知缩放：不是压缩，而是"改慢时钟"

NTK-aware 方法不压缩位置，而是**改变底数 base**。定义

b' = b 乘以 s^(d / (d - 2))

其中 s 是扩展倍数（例如要把 4096 扩到 32768，s = 8）。然后对每个频率重新计算：theta_i' = (b')^(-2i/d)。

为什么这样写？直觉是：**低维（高频）几乎不变，高维（低频）变化很大**。也就是说，短波长的"秒针"保持不变，长波长的"时针"放慢很多，从而在不破坏近距离分辨率的前提下，把远距离的编码拉伸开。这个调节指数 d/(d-2) 来自让"整体频率分布"在外推时保持均方意义下的等效。

## 按维度插值：更细的版本

更精细的做法是针对每个维度单独设定缩放系数：对位于"训练长度内会转很多圈"的高频维度不做插值，对几乎不转圈的低频维度做完整插值，中间维度按比例过渡。

## YaRN

YaRN 在此之上再加两项：

1. **温度缩放**：把注意力 logits 乘一个与扩展倍数有关的因子，修正 softmax 熵的变化（因为 RoPE 外推会让注意力变得更"平"，温度补偿能恢复尖锐度）；
2. **分段频率策略**：把维度分成"完全保留、线性插值、完全插值"三段，用平滑过渡避免边界效应。

## 实践要点

1. 这些方法**都需要少量继续训练**（通常几千步、几千条长样本）才能稳定，纯改参数而不训练往往只能撑 2 倍；
2. 外推后必须在**长文本任务**上评测（如长文档检索、长距离指代），只看困惑度会低估问题；
3. 位置插值与 KV Cache 兼容性好（只是把位置映射改了），而改变 base 需要在加载时改写预计算的 cos/sin 表；
4. 不要把"支持 128K"理解为"在 128K 上质量不掉"。官方长上下文模型通常做了专门的长文本继续训练与数据配比。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
np.set_printoptions(precision=4, suppress=True)

def rope_cos_sin(n, half, base=10000.0):
    theta = base ** (-np.arange(half) / half)     # d=2*half -> base^(-2i/d)
    ang = np.outer(np.arange(n), theta)
    return np.cos(ang), np.sin(ang)

def apply_rope(X, base=10000.0):                  # X: [n, d]，对半配对
    n, d = X.shape; half = d // 2
    cos, sin = rope_cos_sin(n, half, base)
    cos = np.concatenate([cos, cos], -1); sin = np.concatenate([sin, sin], -1)
    x1, x2 = X[:, :half], X[:, half:]
    return np.concatenate([x1*cos[: ,:half] - x2*sin[:, :half],
                           x1*sin[:, half:] + x2*cos[:, half:]], -1)

# ---- 1. 旋转保模长 ----
X = np.random.default_rng(1).normal(size=(4, 8))
XR = apply_rope(X)
print("逐位置模长差 max:", float(np.abs(np.linalg.norm(XR, axis=1) - np.linalg.norm(X, axis=1)).max()))

# ---- 2. 相对位置性质：dot 只依赖 m-n ----
rng = np.random.default_rng(2)
q, k = rng.normal(size=8), rng.normal(size=8)
def dot(m, n):
    return float(apply_rope(q[None, :].repeat(max(m, n)+1, 0))[m] @ apply_rope(k[None, :].repeat(max(m, n)+1, 0))[n])
d1, d2 = dot(5, 2), dot(9, 6)
print("dot(m=5,n=2)=%.4f  dot(m=9,n=6)=%.4f  相等: %s" % (d1, d2, abs(d1-d2) < 1e-5))

# ---- 3. PI vs NTK：位置 8192 的角频率变化 ----
s, d, base, m = 4, 8, 10000.0, 8192
base2 = base * s**(d/(d-2))
print("i=0（秒针）PI 后角 %.2f rad, NTK 后角 %.2f rad（不变）" % ((m/s) % (2*np.pi), (m*1.0) % (2*np.pi)))
for i in (2, 3):
    t = base ** (-2*i/d); t2 = base2 ** (-2*i/d)
    print(f"  i={i}: 波长 {2*np.pi/t:.1f} -> {2*np.pi/t2:.1f}（时针放慢，远距编码拉伸）")\`\`\`

预期输出（实测）：逐位置模长差 max≈2.2e-16（旋转保模长）；dot(m=5,n=2)=dot(m=9,n=6)=0.3086（相对位置性质成立）；i=0 秒针：PI 后角 5.96 rad 被压缩、NTK 保持 5.01 rad 不变；i=2/3 时针：波长 628.3→1583.3、6283.2→25132.7（低频放慢，远距编码拉伸）。

**常见错误**：rotate_half 的配对约定混用（相邻配对与对半配对等价但不可混）；cos/sin 表按训练 base 预计算后，改 base 外推时忘了重算；只给 q 加 RoPE 忘了 k（q、k 都要加，v 不能加）。

### 常见误区

1. **『RoPE 是绝对位置编码』**——它用绝对位置算角度，但内积只依赖相对位置差；\\n2. **『位置插值就是位置号除以 s』**——PI 压缩所有频率、近距分辨率受损；NTK 只放慢低频，两者微调步数也不同；\\n3. **『支持 128K = 128K 质量不掉』**——外推必须配长文本继续训练，纯改参数往往只能撑 2 倍。

### 知识关联

- **向前**：c4 的 KV Cache 缓存 RoPE 后的 k，外推方案直接决定缓存与 cos/sin 表策略；
- **向后**：c6 MLA 的解耦 RoPE 是本章思想在低秩压缩下的突围；
- **平行**：llm-a1 的正弦位置编码是 RoPE 的『加法表亲』，对比着学最快。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 核心 | R(m)q · R(n)k 只依赖 m−n，正交旋转保模长 |
| 结构 | d 维拆 d/2 个二维平面，角频率 base^(-2i/d) 几何级数 |
| 复数视角 | 乘单位复数 e^{iθ}，旋转变标量乘法 |
| PI | 位置号 × L_train/L_target，简单但损近距分辨率 |
| NTK | 改 base：高频几乎不动、低频放慢，YaRN 再加温度补偿 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: 'PI 与 NTK 的核心区别一句话：PI 压缩位置本身（分辨率下降），NTK 改 base 让低频放慢（保留近邻分辨率）。能说清"哪个维度被改、哪个没被改"就是好答案。',
          },
          {
            kind: 'note',
            text: '外推倍数越大，需要继续训练的数据与步数越多。宣称"无损扩展 16 倍"的模型，背后几乎都做了大规模长文本继续训练。',
          },
          {
            kind: 'performance',
            text: '改 base 或改插值系数时，务必同步更新推理引擎里预计算的 cos/sin 缓存。缓存与配置不一致会让长上下文输出完全错乱，而且很难通过短 prompt 发现。',
          },
        ],
        demos: [
          {
            title: '位置插值与 NTK 缩放的频率对比',
            lang: 'python',
            code: `import numpy as np

d = 64
half = d // 2
base = 10000.0
idx = np.arange(half)

theta_orig = base ** (-2 * idx / d)

# 位置插值：位置整体压缩 8 倍
scale_pi = 1 / 8
theta_pi = theta_orig * scale_pi

# NTK 缩放：改底数
s = 8
base_ntk = base * s ** (d / (d - 2))
theta_ntk = base_ntk ** (-2 * idx / d)

print(f"{'维度 i':>6}{'原始频率':>14}{'PI 频率':>14}{'NTK 频率':>14}")
for i in (0, 4, 16, 24, 31):
    print(f"{i:>6}{theta_orig[i]:>14.6e}{theta_pi[i]:>14.6e}{theta_ntk[i]:>14.6e}")

print()
print("结论：PI 把所有频率同比例压缩；NTK 保持高频几乎不变、把低频明显放慢。")

# 在 32768 长度上的角度范围
for name, th in (("原始", theta_orig), ("PI", theta_pi), ("NTK", theta_ntk)):
    ang = 32768 * th[0]
    print(f"{name:>4} 位置 32768 处最高频角度 = {ang:.1f} 弧度（约 {ang / (2 * np.pi):.1f} 圈）")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a3-c3-e1',
        type: 'single',
        difficulty: 3,
        question: 'RoPE 用旋转编码位置，最核心的数学性质是？',
        options: [
          { value: 'A', text: '旋转会放大向量的长度，从而增强位置信号' },
          { value: 'B', text: '旋转矩阵是正交矩阵且可加，使两个位置向量的内积只依赖相对距离' },
          { value: 'C', text: '旋转会把位置信息变成可学习的参数' },
          { value: 'D', text: '旋转会降低向量的维度以节省显存' },
        ],
        answer: 'B',
        explanation:
          'R(a) 是正交矩阵（R 的转置乘 R = I）且满足 R(a)R(b) = R(a+b)，于是 q^T R(m)^T R(n) k = q^T R(n-m) k，只依赖 n-m。A 错：正交变换保持长度；C 错：RoPE 没有任何可学习参数；D 错：维度不变。',
        relatedLessonId: 'llm-a3-c3-l3',
        tags: ['RoPE', '相对位置'],
      },
      {
        id: 'llm-a3-c3-e2',
        type: 'judge',
        difficulty: 3,
        question: 'RoPE 会把向量按位置旋转，因此旋转后的向量长度会随位置增大而不断变大。',
        answer: false,
        explanation:
          '旋转矩阵是正交矩阵，正交变换严格保持欧氏长度：||R(m)x|| = ||x||。而且 d 维 RoPE 是 d/2 个独立的二维旋转的组合，每个平面都保持长度，总体自然保持。若长度会随位置增长，注意力分数的方差就会失控。',
        relatedLessonId: 'llm-a3-c3-l2',
        tags: ['RoPE', '正交变换'],
      },
      {
        id: 'llm-a3-c3-e3',
        type: 'fill',
        difficulty: 3,
        question: '补全 RoPE 的频率（前后半段配对版，`base` 通常为 10000）：\n\n```python\nd = x.shape[-1]\nhalf = d // 2\ntheta = base ** (___)          # 形状 [half]\n```',
        blanks: [['-np.arange(half) / half', '-np.arange(half)/half', '-np.arange(0, half) / half']],
        explanation:
          'theta_i = base^(-2i/d) = base^(-i/half)。用 `np.arange(half)` 生成 i 的序列即可。i 越小频率越高（波长越短），i 越大频率越低。注意指数是负数，方向写反会得到完全错误的频率。',
        relatedLessonId: 'llm-a3-c3-l2',
        tags: ['RoPE', '频率', 'numpy'],
      },
      {
        id: 'llm-a3-c3-e4',
        type: 'multiple',
        difficulty: 4,
        question: '关于位置插值（PI）与 NTK 缩放，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'PI 把所有频率同比例压缩，因此相邻位置的区分度下降' },
          { value: 'B', text: 'NTK 缩放通过改变 base，让高频几乎不变、低频明显放慢' },
          { value: 'C', text: '两者通常都需要少量继续训练才能在训练长度之外保持质量' },
          { value: 'D', text: '两者都会改变模型可学习参数的数量' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错：两者都只改位置编码的计算方式，不增加任何参数。A 是 PI 的代价（近期位置分辨率下降），B 是 NTK 与 PI 的本质区别，C 是实践中的铁律——纯改参数而不训练通常只能撑到 2 倍左右。',
        relatedLessonId: 'llm-a3-c3-l4',
        tags: ['位置插值', 'NTK', '外推'],
      },
      {
        id: 'llm-a3-c3-e5',
        type: 'code',
        difficulty: 3,
        question:
          '实现 RoPE 并验证相对位置性质。\n\n要求：\n- `rope(x, positions, base=10000.0)`：x 形状 [n, d]，positions 形状 [n]，返回同形状；\n- 采用**前后半段配对**：out[:half] = x1 乘以 cos - x2 乘以 sin，out[half:] = x1 乘以 sin + x2 乘以 cos；\n- `norm_ok`：位置 7 旋转后的长度是否与原向量相等（布尔）；\n- `rel_ok`：位置 (0, 4) 与 (10, 14) 两组的内积是否相等（布尔）。',
        starterCode: `import numpy as np

def rope(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = ___
    ang = ___
    c, s = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    return np.concatenate([___, ___, ], axis=1)

rng = np.random.default_rng(0)
q = rng.normal(size=(1, 8))
k = rng.normal(size=(1, 8))

norm_ok = ___
rel_ok = ___
`,
        setupCode: '',
        expectedOutput: '旋转保持长度；位置 (0,4) 与 (10,14) 的注意力分数相同',
        tests: `assert rope(q, np.array([0])).shape == (1, 8), "输出形状应与输入一致"
assert np.allclose(rope(q, np.array([0]))[0], q[0]), "位置 0 时不应有任何旋转"
assert abs(float(np.linalg.norm(rope(q, np.array([7])))) - float(np.linalg.norm(q))) < 1e-10, "旋转应保持长度"
assert norm_ok is True, "norm_ok 应为 True"
assert rel_ok is True, "相对位置性质应成立"
s1 = float(np.ravel(rope(q, np.array([0])) @ rope(k, np.array([4])).T)[0])
s2 = float(np.ravel(rope(q, np.array([10])) @ rope(k, np.array([14])).T)[0])
assert np.isclose(s1, s2), f"相对距离相同，分数应相等：{s1} vs {s2}"
assert np.isclose(float(np.round(s1, 4)), -4.0826, atol=1e-3), f"该组向量的分数应约为 -4.0826，实际 {s1}"
s3 = float(np.ravel(rope(q, np.array([0])) @ rope(k, np.array([5])).T)[0])
assert not np.isclose(s1, s3), "相对距离不同时分数应不同"
`,
        answer: `import numpy as np

def rope(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    c, s = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    return np.concatenate([x1 * c - x2 * s, x1 * s + x2 * c], axis=1)

rng = np.random.default_rng(0)
q = rng.normal(size=(1, 8))
k = rng.normal(size=(1, 8))

norm_ok = bool(np.isclose(np.linalg.norm(rope(q, np.array([7]))), np.linalg.norm(q)))
s1 = float(np.ravel(rope(q, np.array([0])) @ rope(k, np.array([4])).T)[0])
s2 = float(np.ravel(rope(q, np.array([10])) @ rope(k, np.array([14])).T)[0])
rel_ok = bool(np.isclose(s1, s2))
s1
`,
        explanation:
          '`positions[:, None] * theta[None, :]` 得到 [n, half] 的角度矩阵，是 RoPE 实现的核心一行。位置 0 时角度全 0，cos=1、sin=0，输出等于输入。相对位置性质在数值上精确成立（只差浮点误差），所以断言可以用很紧的容差。注意本课要求答案最后一行是裸表达式，因此用一个 `s1` 收尾，用 `bool(...)` 把 numpy 布尔转成 Python 布尔。',
        relatedLessonId: 'llm-a3-c3-l2',
        tags: ['RoPE', 'numpy', '实现'],
      },
      {
        id: 'llm-a3-c3-e6',
        type: 'code',
        difficulty: 4,
        question:
          '用**复数**实现 d = 2 的 RoPE。\n\n要求：\n- `rope_complex(x, m, base=10000.0)`：x 是长度为 2 的数组 (x1, x2)，m 是位置，返回旋转后的二维数组；\n- 实现方式必须使用复数 `np.exp(1j * angle)`；\n- `same`：复数实现与矩阵实现（用 cos/sin）的结果是否一致（布尔）；\n- `angle_ok`：输入 (1, 0) 在位置 m 时，结果的角度是否等于 m（布尔）；\n- `norm_ok`：长度是否保持（布尔）；\n- `angle_shift_ok`：对 x = (0.6, -0.8)，旋转后角度是否等于"原角度 + m"（布尔）。\n\n参数取 m = 1。',
        starterCode: `import numpy as np

def rope_complex(x, m, base=10000.0):
    theta = 1.0                      # d = 2 时只有一个平面，频率为 base^0 = 1
    w = ___
    return ___

def rope_matrix(x, m):
    c, s = np.cos(m), np.sin(m)
    return np.array([x[0] * c - x[1] * s, x[0] * s + x[1] * c])

m = 3
x = np.array([0.6, -0.8])
r1 = rope_complex(x, m)
r2 = rope_matrix(x, m)

same = ___
angle_ok = ___
norm_ok = ___
angle_shift_ok = ___
`,
        setupCode: '',
        expectedOutput: '复数实现与矩阵实现一致；长度保持；单位向量旋转 m 后角度为 m',
        tests: `assert r1.shape == (2,), "输出应为长度为 2 的数组"
assert same is True, "复数实现应与矩阵实现一致"
assert norm_ok is True, "旋转应保持长度"
assert abs(float(np.linalg.norm(r1)) - 1.0) < 1e-12, "输入 (0.6, -0.8) 长度为 1，输出长度也应为 1"
assert angle_ok is True, "angle_ok 应为 True"
unit = rope_complex(np.array([1.0, 0.0]), 3)
assert abs(float(np.arctan2(float(unit[1]), float(unit[0]))) - 3.0) < 1e-9, "单位向量应被旋转到角度 3"
assert angle_shift_ok is True, "旋转后角度应恰好增加 m 弧度"
`,
        answer: `import numpy as np

def rope_complex(x, m, base=10000.0):
    theta = 1.0
    w = np.exp(1j * (m * theta))
    z = (x[0] + 1j * x[1]) * w
    return np.array([z.real, z.imag])

def rope_matrix(x, m):
    c, s = np.cos(m), np.sin(m)
    return np.array([x[0] * c - x[1] * s, x[0] * s + x[1] * c])

m = 3
x = np.array([0.6, -0.8])
r1 = rope_complex(x, m)
r2 = rope_matrix(x, m)

same = bool(np.allclose(r1, r2))
angle_ok = bool(np.isclose(np.arctan2(float(r1[1]), float(r1[0])), np.arctan2(-0.8, 0.6) + m))
norm_ok = bool(np.isclose(np.linalg.norm(r1), np.linalg.norm(x)))
angle_shift_ok = bool(np.isclose(np.arctan2(float(r1[1]), float(r1[0])), np.arctan2(-0.8, 0.6) + m))
same
`,
        explanation:
          '复数乘 e^(i theta) 等价于二维旋转矩阵。`np.arctan2(y, x)` 返回的角度在 (-pi, pi] 区间，而 m = 3 恰好在这个区间内，所以可以直接比较。若想验证更大的 m，需要先把 m 归一到同一区间（对 2pi 取模）。这个"复数 = 旋转"的视角，正是 RoPE 论文标题 RoFormer 中 rotary 一词的来源。',
        relatedLessonId: 'llm-a3-c3-l2',
        tags: ['RoPE', '复数', '实现'],
      },
      {
        id: 'llm-a3-c3-e7',
        type: 'single',
        difficulty: 3,
        question: 'GPT-2 使用可学习绝对位置编码，其最大的局限是？',
        options: [
          { value: 'A', text: '参数量过大' },
          { value: 'B', text: '位置表只有 max_len 行，超出长度的位置没有对应参数，无法直接外推' },
          { value: 'C', text: '无法与词向量相加' },
          { value: 'D', text: '会导致注意力分数爆炸' },
        ],
        answer: 'B',
        explanation:
          '可学习位置表形状 [max_len, d]，GPT-2 small 是 [1024, 768]，约 78 万参数，量级不大（A 错）。它当然能与词向量相加（C 错）。真正的问题是超出 max_len 时无处查表，只能插值或重训。',
        relatedLessonId: 'llm-a3-c3-l1',
        tags: ['位置编码', '外推'],
      },
      {
        id: 'llm-a3-c3-e8',
        type: 'fill',
        difficulty: 4,
        question: 'RoPE 相对位置性质的三步推导中，第二步用到了旋转矩阵的可加性。补全等式：\n\n```\nqᵀ R(m)ᵀ R(n) k = qᵀ R(___) R(n) k = qᵀ R(n - m) k\n```',
        blanks: [['-m']],
        explanation:
          'R(m) 是正交矩阵，所以 R(m) 的转置等于它的逆，也等于 R(-m)。这一步把"逆旋转"变成"反向角度"，再用 R(a)R(b) = R(a+b) 合并。整个推导不需要展开三角函数，是线性代数最漂亮的应用之一。',
        relatedLessonId: 'llm-a3-c3-l3',
        tags: ['RoPE', '推导'],
      },
      {
        id: 'llm-a3-c3-e9',
        type: 'judge',
        difficulty: 3,
        question: 'RoPE 作用在 Q 与 K 上，而 Value 与最终输出不参与旋转。',
        answer: true,
        explanation:
          '位置的作用是影响"当前 token 应该关注谁、关注多少"，这由 QK 的点积决定；V 承载的是被传递的内容，旋转它反而会破坏语义。此外只旋转 Q、K 还有工程上的好处：KV Cache 里存的 K 是已经旋转过的，新 token 只需按自己的位置旋转即可。',
        relatedLessonId: 'llm-a3-c3-l2',
        tags: ['RoPE', '数据流'],
      },
      {
        id: 'llm-a3-c3-e10',
        type: 'multiple',
        difficulty: 4,
        question: '关于 RoPE 的频率设计 theta_i = base^(-2i/d)，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'i 越小（越靠前的维度）频率越高，旋转越快' },
          { value: 'B', text: 'i 越大频率越低，波长可达上下文长度的数倍' },
          { value: 'C', text: '这种几何级数分布的频率让不同维度承担不同的位置分辨率' },
          { value: 'D', text: '所有维度的频率必须相同，否则内积无法只依赖相对位置' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错：相对位置性质的推导对每个二维平面独立成立，频率不同不影响结论。不同频率的设计正是"多尺度时钟"——低维区分近邻、高维区分远距。这也是后续 NTK 等方法能够"只改部分频率"的前提。',
        relatedLessonId: 'llm-a3-c3-l3',
        tags: ['RoPE', '频率'],
      },
      {
        id: 'llm-a3-c3-e11',
        type: 'code',
        difficulty: 4,
        question:
          '对比**位置插值（PI）**与**NTK 缩放**对频率的影响。\n\n参数：d = 64，base = 10000，扩展倍数 s = 8（例如 4096 扩到 32768）。\n\n计算：\n- `theta_orig`：原始频率，形状 [32]；\n- `theta_pi`：位置插值后的频率（所有频率乘 1/s）；\n- `theta_ntk`：NTK 缩放后的频率（底数变为 base 乘 s^(d/(d-2))）；\n- `pi_ratio_high`：PI 下 i=0 的新频率与原频率之比；\n- `ntk_ratio_high`、`ntk_ratio_low`：NTK 下 i=0 与 i=31 的新旧频率之比。',
        starterCode: `import numpy as np

d = 64
half = d // 2
base = 10000.0
s = 8.0
idx = np.arange(half)

theta_orig = ___
theta_pi = ___

base_ntk = ___
theta_ntk = ___

pi_ratio_high = ___
ntk_ratio_high = ___
ntk_ratio_low = ___
`,
        setupCode: '',
        expectedOutput: 'PI 所有频率缩为 1/8；NTK 高频几乎不变，低频变化明显',
        tests: `assert theta_orig.shape == (32,), f"频率数组形状应为 (32,)，实际 {theta_orig.shape}"
assert np.isclose(theta_orig[0], 1.0), "i=0 时频率应为 base^0 = 1"
assert np.isclose(float(pi_ratio_high), 0.125), f"PI 的频率比应为 1/8，实际 {pi_ratio_high}"
assert np.isclose(float(ntk_ratio_high), 1.0), f"NTK 下 i=0 的频率比恰为 1.0，实际 {ntk_ratio_high}"
assert ntk_ratio_high > pi_ratio_high, "NTK 对高频的改动应小于 PI"
assert np.isclose(float(ntk_ratio_low), 0.125), f"NTK 下最低频被压缩到 1/8，实际 {ntk_ratio_low}"
assert np.allclose(theta_pi, theta_orig / s), "PI 应为所有频率同比例缩放"
`,
        answer: `import numpy as np

d = 64
half = d // 2
base = 10000.0
s = 8.0
idx = np.arange(half)

theta_orig = base ** (-2 * idx / d)
theta_pi = theta_orig / s

base_ntk = base * s ** (d / (d - 2))
theta_ntk = base_ntk ** (-2 * idx / d)

pi_ratio_high = float(theta_pi[0] / theta_orig[0])
ntk_ratio_high = float(theta_ntk[0] / theta_orig[0])
ntk_ratio_low = float(theta_ntk[-1] / theta_orig[-1])
theta_ntk
`,
        explanation:
          '把频率写成 theta_i = b^(-2i/d)。换底数为 b 后（b 变为 b 乘 s^(d/(d-2))），theta_i 乘上因子 s^(-(d/(d-2)) 乘 2i/d)。当 i = 0 时该因子为 1，**最高频维度完全不变**；当 i = d/2 - 1 时因子恰为 s^(-1) = 1/8，**最低频维度与 PI 的处理完全一致**；中间维度平滑过渡。这就是 NTK 的核心：保住近邻分辨率，只在需要"拉长"的低频维度上压缩。对比之下 PI 一刀切地把所有频率都砍到 1/8，牺牲了高频分辨率。',
        relatedLessonId: 'llm-a3-c3-l4',
        tags: ['NTK', '位置插值', '频率'],
      },
      {
        id: 'llm-a3-c3-e12',
        type: 'single',
        difficulty: 4,
        question: '在 KV Cache 增量解码时，新生成的 token 应该使用什么位置编号来计算 RoPE？',
        options: [
          { value: 'A', text: '位置 0，因为它是本次前向计算的第一个 token' },
          { value: 'B', text: '当前缓存中已有 token 的数量（加上前缀偏移）' },
          { value: 'C', text: '固定为一个随机数，由模型自己学习' },
          { value: 'D', text: '总是等于最大训练长度' },
        ],
        answer: 'B',
        explanation:
          '位置必须与"它在完整序列里的位置"一致。缓存中已经有 n 个 token，新 token 就是第 n 个（从 0 开始计数）。如果每次都从 0 开始，整段生成过程会对所有 token 按位置 0 处理，注意力完全错乱。前缀缓存场景还要加上原有上下文长度作为偏移。',
        relatedLessonId: 'llm-a3-c3-l3',
        tags: ['RoPE', 'KV Cache', '实现'],
      },
      {
        id: 'llm-a3-c3-e13',
        type: 'code',
        difficulty: 4,
        question:
          '实现 **rotate_half 版本**的 RoPE，并验证它与 cos/sin 显式版本等价。\n\n要求：\n- `rotate_half(x)`：返回 `concat([-x2, x1])`，其中 x2 是后半段、x1 是前半段；\n- `rope_rh(x, positions, base=10000.0)`：用 `x * cos + rotate_half(x) * sin` 实现，cos/sin 形状为 [n, d]（把 [n, half] 的 cos 复制两份拼接）；\n- `same`：与显式版本 `rope_ref` 的结果是否一致。',
        starterCode: `import numpy as np

def rotate_half(x):
    half = x.shape[-1] // 2
    x1, x2 = ___
    return np.concatenate([___, ___], axis=-1)

def rope_ref(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    c, s = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    return np.concatenate([x1 * c - x2 * s, x1 * s + x2 * c], axis=1)

def rope_rh(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    cos = ___
    sin = ___
    return ___

rng = np.random.default_rng(5)
X = rng.normal(size=(4, 8))
pos = np.arange(4)
a = rope_rh(X, pos)
b = rope_ref(X, pos)
same = ___
`,
        setupCode: '',
        expectedOutput: 'rotate_half 版与显式版完全等价',
        tests: `assert np.allclose(rotate_half(np.array([[1.0, 2.0, 3.0, 4.0]])), [[-3.0, -4.0, 1.0, 2.0]]), "rotate_half 应为 [-x2, x1]"
assert same is True, "两种实现应完全等价"
assert a.shape == (4, 8), "输出形状应与输入一致"
assert np.allclose(a[0], X[0]), "位置 0 时输出应等于输入"
assert np.allclose(rope_rh(X[:1], np.array([9])), rope_ref(X[:1], np.array([9]))), "任意位置下两种实现都应一致"
`,
        answer: `import numpy as np

def rotate_half(x):
    half = x.shape[-1] // 2
    x1, x2 = x[..., :half], x[..., half:]
    return np.concatenate([-x2, x1], axis=-1)

def rope_ref(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    c, s = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    return np.concatenate([x1 * c - x2 * s, x1 * s + x2 * c], axis=1)

def rope_rh(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    cos = np.cos(ang)
    sin = np.sin(ang)
    cos = np.concatenate([cos, cos], axis=-1)
    sin = np.concatenate([sin, sin], axis=-1)
    return x * cos + rotate_half(x) * sin

rng = np.random.default_rng(5)
X = rng.normal(size=(4, 8))
pos = np.arange(4)
a = rope_rh(X, pos)
b = rope_ref(X, pos)
same = bool(np.allclose(a, b))
a
`,
        explanation:
          '这是 Hugging Face llama 实现的标准写法：先算 [n, half] 的 cos/sin，再各自复制一份拼成 [n, d]，最后 `x * cos + rotate_half(x) * sin`。展开看前半段：x1 cos + (-x2) sin = x1 cos - x2 sin；后半段：x2 cos + x1 sin = x1 sin + x2 cos，与显式版完全一致。这种写法在 GPU 上只需两次逐元素乘加，容易融合。',
        relatedLessonId: 'llm-a3-c3-l2',
        tags: ['RoPE', 'rotate_half', '实现'],
      },
      {
        id: 'llm-a3-c3-e14',
        type: 'judge',
        difficulty: 4,
        question: '因为 RoPE 的公式中不含最大长度参数，所以模型在训练长度的 10 倍长度上推理时效果不会下降。',
        answer: false,
        explanation:
          '"公式可计算"不等于"模型能泛化"。超出训练长度后，高频维度的角度早已绕了很多圈，模型没学过如何解读这些相位；同时注意力分数分布会漂移，导致困惑度显著上升。要做到长上下文可用，需要位置插值、NTK 缩放或 YaRN 等手段，并配合长文本继续训练。',
        relatedLessonId: 'llm-a3-c3-l4',
        tags: ['RoPE', '外推', '误区'],
      },
      {
        id: 'llm-a3-c3-e15',
        type: 'fill',
        difficulty: 3,
        question: '位置插值（PI）把训练长度 L_train 压缩到目标长度 L_target 以内。若模型在 4096 上训练，要处理 32768 的输入，则位置缩放系数 s = L_train / L_target = ___（填小数）。',
        blanks: [['0.125', '1/8']],
        explanation:
          '4096 / 32768 = 0.125。等价地，位置 m 会被映射到 m 乘 0.125，于是位置 32767 被压缩到约 4096，落回训练分布。代价是相邻 token 的角度差只有原来的 1/8，近距离位置分辨率下降。',
        relatedLessonId: 'llm-a3-c3-l4',
        tags: ['位置插值', '外推'],
      },
      {
        id: 'llm-a3-c3-e16',
        type: 'single',
        difficulty: 4,
        question: '设 base = 10000、d = 128，RoPE 最高频维度（i = 0）的波长（角度增加 2pi 所需的 token 数）约是多少？',
        options: [
          { value: 'A', text: '约 1 个 token' },
          { value: 'B', text: '约 6.28 个 token' },
          { value: 'C', text: '约 128 个 token' },
          { value: 'D', text: '约 10000 个 token' },
        ],
        answer: 'B',
        explanation:
          'i = 0 时 theta_0 = base^0 = 1，每前进一个位置角度增加 1 弧度，所以转一圈（2pi）需要约 6.28 个 token。而最低频维度 (i = 63) 的 theta 约等于 10000^(-126/128) 约等于 1.1e-4，波长约 5.5 万 token——这正是 RoPE 能表达长距离的底气，也是外推时低频更容易"没转过圈"、需要插值的原因。',
        relatedLessonId: 'llm-a3-c3-l3',
        tags: ['RoPE', '波长'],
      },
      {
        id: 'llm-a3-c3-e17',
        type: 'multiple',
        difficulty: 4,
        question: 'RoPE 相比可学习绝对位置编码的优势包括？（多选）',
        options: [
          { value: 'A', text: '没有位置相关的可学习参数表，不占用 [max_len, d] 的显存' },
          { value: 'B', text: '内积天然只依赖相对位置，符合语言任务的需求' },
          { value: 'C', text: '旋转是正交变换，不改变向量长度，数值更稳定' },
          { value: 'D', text: '可以完全免除继续训练，直接无损支持任意长上下文' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 是常见误解。RoPE 的结构性优势是 A、B、C；长上下文能力仍需要配套的插值/缩放方法与继续训练。"无损扩展"在真实模型中几乎不存在。',
        relatedLessonId: 'llm-a3-c3-l1',
        tags: ['RoPE', '优势'],
      },
      {
        id: 'llm-a3-c3-e18',
        type: 'code',
        difficulty: 4,
        question:
          '验证"平移不变性"并测量**长距离下的频率行为**。\n\n要求：\n- 用 `rope`（前后半段配对）实现；\n- `shift_ok`：把位置 (0, 3) 平移到 (100, 103)、(5000, 5003)，三者注意力分数是否都相同（布尔）；\n- `lambda_0`：i = 0 维度的波长（2pi / theta_0），d = 16；\n- `lambda_last`：i = 7 维度（最后一个）的波长；\n- `turns`：位置 4096 处，i = 0 维度累计转了多少圈（保留 2 位小数）。',
        starterCode: `import numpy as np

def rope(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    c, s = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    return np.concatenate([x1 * c - x2 * s, x1 * s + x2 * c], axis=1)

rng = np.random.default_rng(2)
q = rng.normal(size=(1, 16))
k = rng.normal(size=(1, 16))

shift_ok = ___

d = 16
half = d // 2
theta = base = 10000.0 ** (-np.arange(half) / half)
lambda_0 = ___
lambda_last = ___
turns = ___
`,
        setupCode: '',
        expectedOutput: '平移后分数不变；lambda_0 ≈ 6.28，lambda_last 远大于 4096，turns ≈ 652',
        tests: `assert shift_ok is True, "平移后注意力分数应保持不变"
assert abs(float(lambda_0) - 2 * np.pi / float(theta[0])) < 1e-9, f"lambda_0 应约为 {2 * np.pi:.4f}，实际 {lambda_0}"
assert lambda_last > 1000, f"最高维波长应远大于上下文长度，实际 {lambda_last}"
assert abs(float(turns) - 651.90) < 0.1, f"位置 4096 处 i=0 累计圈数约 651.90，实际 {turns}"
assert turns > 100, "高频维度在长序列上会绕很多圈"
`,
        answer: `import numpy as np

def rope(x, positions, base=10000.0):
    n, d = x.shape
    half = d // 2
    theta = base ** (-np.arange(half) / half)
    ang = positions[:, None] * theta[None, :]
    c, s = np.cos(ang), np.sin(ang)
    x1, x2 = x[:, :half], x[:, half:]
    return np.concatenate([x1 * c - x2 * s, x1 * s + x2 * c], axis=1)

rng = np.random.default_rng(2)
q = rng.normal(size=(1, 16))
k = rng.normal(size=(1, 16))

s0 = float(np.ravel(rope(q, np.array([0])) @ rope(k, np.array([3])).T)[0])
s1 = float(np.ravel(rope(q, np.array([100])) @ rope(k, np.array([103])).T)[0])
s2 = float(np.ravel(rope(q, np.array([5000])) @ rope(k, np.array([5003])).T)[0])
shift_ok = bool(np.isclose(s0, s1) and np.isclose(s0, s2))

d = 16
half = d // 2
theta = 10000.0 ** (-np.arange(half) / half)
lambda_0 = 2 * np.pi / float(theta[0])
lambda_last = 2 * np.pi / float(theta[-1])
turns = float(np.round(4096 / lambda_0, 2))
turns
`,
        explanation:
          'i = 0 的波长 2pi 约等于 6.283，位置 4096 处角度为 4096 弧度，转 4096 / 6.283 约等于 651.9 圈——高频维度在长距离上几乎"完全绕晕"，这就是外推困难的可视化解释。而最后一个维度的 theta 约等于 10000^(-14/16) 约等于 3.16e-4，波长约 1.99 万 token，远大于 4096，负责"远距离计数"。这个"秒针与时针"的跨度正是 RoPE 能同时分辨近邻与远距的原因。',
        relatedLessonId: 'llm-a3-c3-l3',
        tags: ['RoPE', '波长', '外推'],
      },
      {
        id: 'llm-a3-c3-e19',
        type: 'open',
        difficulty: 5,
        question:
          '请你向一位只了解 Transformer 基础的同学解释：为什么 RoPE 可以让注意力分数只依赖相对位置？再说明它在 32K 外推时为什么会失效，以及工程上有哪些解决办法。',
        referenceAnswer: `**一、为什么只依赖相对位置**

1. 把 d 维向量拆成 d/2 个二维平面，每个平面独立旋转，d 维内积等于各平面内积之和，所以只需证明二维情形；
2. 二维旋转 R(a) 是正交矩阵：R(a)^T = R(-a)，且 R(a)R(b) = R(a+b)；
3. 于是 (R(m)q)·(R(n)k) = q^T R(m)^T R(n) k = q^T R(-m)R(n) k = q^T R(n-m) k，只出现 n-m；
4. 直观理解：两个向量各自转了 m 与 n 的角度，它们之间的"夹角差"只取决于相对差，就像两个人各自转动方向盘，真正的差别是转了多少度的差。

**二、为什么 32K 外推会失效**

1. 高频维度（i 小）在位置 4096 处已经转了约 650 圈，超出训练长度后角度继续快速绕圈，模型从未学过如何解读这些相位；
2. 低频维度在训练长度内几乎没转过整圈，外推到 32K 时才第一次"转满半圈"，落入分布外区域；
3. 结果是注意力分数分布漂移，softmax 变得更平或更尖，困惑度显著上升，长距离指代能力下降；
4. 本质上这是**分布外泛化**问题，不是公式可计算性的问题。

**三、解决办法**

1. **位置插值（PI）**：m' = m 乘 L_train / L_target，把位置压回训练范围，代价是邻近位置分辨率下降，需要少量继续训练；
2. **NTK 感知缩放**：改底数 b' = b 乘 s^(d/(d-2))，让高频几乎不变、低频明显放慢，比 PI 更好地保留了近邻分辨率；
3. **YaRN**：在 NTK 基础上按维度分段处理频率，并加注意力温度缩放，改善注意力熵的漂移；
4. **长文本继续训练**：用长样本（数千到数万 token）继续训练几千步，让模型适配新位置分布；
5. **评测侧**：用长文档检索、长距离指代等任务验证，而不是只看困惑度。`,
        rubric: [
          { point: '正确定义旋转矩阵的正交性与可加性', score: 2 },
          { point: '写出 q^T R(n-m) k 的三步推导', score: 2 },
          { point: '解释高频绕圈、低频分布外导致外推失败', score: 1 },
          { point: '给出 PI / NTK / YaRN / 继续训练等具体手段', score: 1 },
        ],
        keywords: ['正交', 'R(n-m)', '相对位置', '绕圈', '位置插值', 'NTK', 'YaRN', '继续训练'],
        explanation:
          '好的回答会先完成数学推导再谈工程。能区分"公式可计算"与"模型可泛化"，并说清 PI 与 NTK 在频率维度上的差异，说明理解到位。',
        tags: ['RoPE', '外推', '综合性'],
      },
      {
        id: 'llm-a3-c3-e20',
        type: 'judge',
        difficulty: 3,
        question: 'RoPE 不引入任何可学习参数。',
        answer: true,
        explanation:
          'RoPE 只是一个按位置角度的正交变换，所有角度都由位置与 base 决定，没有 gamma、beta 之类的参数。这也是它替换掉 GPT-2 的 [max_len, d] 位置表后，参数上"少了一块"的原因之一。',
        relatedLessonId: 'llm-a3-c3-l2',
        tags: ['RoPE', '参数'],
      },
      {
        id: 'llm-a3-c3-e21',
        type: 'single',
        difficulty: 4,
        question: 'RoPE 的前后半段配对与相邻两维配对两种实现方式，它们的关系是？',
        options: [
          { value: 'A', text: '数学上等价，只是维度排列不同，但权重必须与实现配套' },
          { value: 'B', text: '完全不同的两种编码，效果差异很大' },
          { value: 'C', text: '相邻配对是前后配对的近似，有精度损失' },
          { value: 'D', text: '只有相邻配对能满足相对位置性质' },
        ],
        answer: 'A',
        explanation:
          '两者都是把 d 维拆成 d/2 个平面、各自旋转对应角度，只是"哪两个维度配成一对"的排列不同，等价于对维度做一次置换。乱用会导致位置信息错乱，所以加载 Transformers 权重时必须用配套的实现。',
        relatedLessonId: 'llm-a3-c3-l2',
        tags: ['RoPE', '实现细节'],
      },
      {
        id: 'llm-a3-c3-e22',
        type: 'fill',
        difficulty: 4,
        question: 'NTK 感知缩放把底数改为 b\' = b 乘 s^(d/(d-2))，其中 s 是扩展倍数。当 d = 128、s = 4 时：\n\n1. 指数 d/(d-2) 约等于 ___（保留 4 位小数）；\n2. 新底数 b\' 约等于 ___（保留 2 位小数）。',
        blanks: [
          ['1.015873', '/^1\\.0158[0-9]*$/'],
          ['40889.94', '/^4088[0-9](\\.\\d+)?$/'],
        ],
        explanation:
          'd/(d-2) = 128/126 约等于 1.015873。4^1.015873 = exp(1.015873 乘 ln4) = exp(1.015873 乘 1.386294) = exp(1.408296) 约等于 4.088994，乘 10000 得 40889.94。注意不同实现可能把公式写成 b 乘 s^(d/(d-2)) 或 b 乘 s，前者指数略大于 1（因为 d/(d-2) > 1），后者就是简单的按倍数放大。核心理解是：**只改底数、不改位置**，从而在不改变位置取值范围的前提下把低频放慢。',
        relatedLessonId: 'llm-a3-c3-l4',
        tags: ['NTK', '外推'],
      },
      {
        id: 'llm-a3-c3-e23',
        type: 'multiple',
        difficulty: 5,
        question: '下列哪些现象可能是"RoPE 位置处理写错"导致的？（多选）',
        options: [
          { value: 'A', text: '短 prompt 表现正常，长 prompt 或长输出质量骤降' },
          { value: 'B', text: '增量解码时输出开始正常，越往后越混乱' },
          { value: 'C', text: '把两个实现（rotate_half 与显式版）混用后，权重加载成功但效果变差' },
          { value: 'D', text: '模型参数量突然变大' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 与位置编码无关（RoPE 没有参数）。A 对应长距离相位错误；B 对应"新 token 位置没有按已缓存长度偏移"；C 对应两种配对方式混用导致维度错位。这三条是自实现 RoPE 时的经典故障模式。',
        relatedLessonId: 'llm-a3-c3-l3',
        tags: ['RoPE', '调试', '故障'],
      },
      {
        id: 'llm-a3-c3-e24',
        type: 'code',
        difficulty: 4,
        question:
          '计算 **RoPE 在给定上下文长度下的"匝数"分布**，理解为什么外推困难。\n\n参数：d = 64，base = 10000，上下文长度 `ctx = 8192`。\n\n要求：\n- `turns`：长度为 32 的数组，表示每个维度在位置 ctx 处累计的圈数（ctx 乘 theta_i / (2 乘 pi)）；\n- `n_over_10`：圈数超过 10 的维度个数；\n- `n_under_half`：圈数小于 0.5（即在一个上下文内还没转半圈）的维度个数。',
        starterCode: `import numpy as np

d = 64
base = 10000.0
ctx = 8192
half = d // 2

theta = ___
turns = ___
n_over_10 = ___
n_under_half = ___
`,
        setupCode: '',
        expectedOutput: '高频维度绕上百圈，低频维度在一个上下文内还没转半圈',
        tests: `assert turns.shape == (32,), f"turns 形状应为 (32,)，实际 {turns.shape}"
assert np.all(np.diff(turns) < 0), "圈数应随维度单调递减"
assert abs(float(turns[0]) - 8192 / (2 * np.pi)) < 1e-6, f"i=0 的圈数应约为 {8192 / (2 * np.pi):.2f}"
assert n_over_10 == int((turns > 10).sum()) and n_over_10 > 15, "应有相当多的维度绕了 10 圈以上"
assert n_under_half >= 1, "至少有一个低频维度在一个上下文内还没转半圈"
assert 0 < n_under_half < 32, "低频与高频维度应同时存在"
`,
        answer: `import numpy as np

d = 64
base = 10000.0
ctx = 8192
half = d // 2

theta = base ** (-np.arange(half) / half)
turns = ctx * theta / (2 * np.pi)
n_over_10 = int((turns > 10).sum())
n_under_half = int((turns < 0.5).sum())
turns
`,
        explanation:
          '圈数从 i = 0 的约 1303 圈一路降到 i = 31 的个位数。高频维度在 8192 长度里绕了上千圈，任何位置偏差都会导致相位急剧变化；低频维度转不到半圈，负责表达"很远"的位置关系。外推时低频维度首次进入"转满圈"的区域，落到了训练时从未见过的相位分布上——这就是"外推难"的定量来源。',
        relatedLessonId: 'llm-a3-c3-l4',
        tags: ['RoPE', '外推', '频率'],
      },
      {
        id: 'llm-a3-c3-e25',
        type: 'single',
        difficulty: 3,
        question: '在正弦绝对位置编码中，位置信息是通过什么方式注入的？',
        options: [
          { value: 'A', text: '与词向量相加' },
          { value: 'B', text: '与 Query/Key 做逐元素相乘' },
          { value: 'C', text: '通过旋转 Query/Key 的方向' },
          { value: 'D', text: '作为注意力的固定掩码' },
        ],
        answer: 'A',
        explanation:
          '原始 Transformer 与 GPT-2 都是把位置向量与词向量**相加**。相乘/旋转是 RoPE 的做法，掩码是因果遮罩的职责。加法的问题是位置与语义混在一个向量里，且低秩扰动容易被淹没。',
        relatedLessonId: 'llm-a3-c3-l1',
        tags: ['位置编码', '对比'],
      },
      {
        id: 'llm-a3-c3-e26',
        type: 'judge',
        difficulty: 4,
        question: '如果把 RoPE 的 base 从 10000 调到 500000（且用长文本继续训练），模型在长上下文上的表现通常优于保持 10000 直接外推。',
        answer: true,
        explanation:
          '增大 base 会拉长所有维度的波长，使低频维度在更长上下文内"不绕圈"，配合长文本继续训练能显著改善外推质量，这也是很多长上下文模型公开配置中 base 被调大的原因。但只改 base 而不训练，效果通常不理想或只在小倍数下有效。',
        relatedLessonId: 'llm-a3-c3-l4',
        tags: ['RoPE', 'base', '外推'],
      },
    ],
  },
  {
    id: 'llm-a3-c4',
    title: 'GQA：分组查询注意力',
    goal: '理解 KV Cache 为什么是推理显存的主要开销，掌握 MHA/MQA/GQA 的结构差异与显存公式，能为给定模型选择合适的 KV 头数并估算配置。',
    lessons: [
      {
        id: 'llm-a3-c4-l1',
        title: 'KV Cache 显存公式与瓶颈分析',
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出 KV Cache 显存公式 2·L·B·seq·n_kv·d_head·b 并算出 7B MHA 4K 单请求 2.0 GiB；
2. 说明权重（固定）与 KV Cache（随 B×seq 线性涨）谁是瓶颈的判据；
3. 用 batch 与显存的矛盾解释 GQA 的动机：每 token KV 显存降到 1/g。

### 前置知识

- llm-a1 的 MHA 前向与自回归解码循环；
- GiB/字节换算。

### 问题背景

部署 7B 模型时真正的显存杀手不是权重（13.5 GiB 固定），而是随 batch×上下文线性膨胀的 KV Cache：MHA 下 8 并发 4K 上下文就要 16 GiB。GQA 让 K/V 只保留 8 组头，显存直降 4 倍而质量几乎不掉——LLaMA-2 7B 到 LLaMA-3 8B 最值钱的一处改动就是它。

### 直觉理解

MHA 是每个 Q 头配一副专属的 K/V 耳机；MQA 是全队共用一副（省到极致但串音）；GQA 是 4 个 Q 头共用一副（8 副耳机服务 32 个头）。缓存的是『耳机』（K/V），所以显存按组数缩放；注意力计算前的广播只是逻辑视图，不真的复制内存。

### 核心概念与原理详解

## 为什么需要 KV Cache

自回归生成时，每生成一个 token 都要做一次完整的前向。如果不缓存，第 t 步就要把前面 t 个 token 的 K、V 全部重算一遍，总计算量是 O(n^2) 的重复劳动。KV Cache 的做法是：**把每一层每个头的 K、V 保存下来，第 t 步只计算新 token 的那一份**，再把历史缓存拼进来做注意力。

<Diagram type="arch" name="kv-cache" />

这样每层的注意力计算从"t 个 token 的投影"降为"1 个 token 的投影 + 一次与 t 个 token 的点积"。

## 显存公式

一层、一个序列的 KV Cache 占用的元素个数是：

2 乘以 seq_len 乘以 n_kv_heads 乘以 head_dim

其中 2 表示 K 与 V 各一份。乘以层数 L、batch B、每个元素的字节数 b，得到总显存：

KV bytes = 2 乘以 L 乘以 B 乘以 seq_len 乘以 n_kv_heads 乘以 head_dim 乘以 b

以 LLaMA-2 7B（L = 32、d = 4096、32 头、head_dim = 128、fp16 即 b = 2）为例：

2 乘以 32 乘以 1 乘以 4096 乘以 32 乘以 128 乘以 2 字节 = 2.147e9 字节 = 2.0 GiB（单请求、4K 上下文）

注意这只是一个请求！8 个并发请求就是 16 GiB，已经超过一张 24G 卡上留给权重的余量。

## 对比：权重 vs Cache

| 项目 | 7B 模型 fp16 | 说明 |
| --- | --- | --- |
| 权重 | 约 13.5 GiB | 与 batch、长度无关 |
| KV Cache（4K、单请求、MHA） | 2.0 GiB | 与两者都成正比 |
| KV Cache（4K、8 并发、MHA） | 16 GiB | 超过权重 |
| KV Cache（128K、单请求、MHA） | 64 GiB | 单卡放不下 |

**结论：短上下文时权重是主要开销，长上下文或高并发时 KV Cache 成为第一瓶颈。** 这也是"长上下文很贵"的真正来源——不是计算慢，而是显存被打爆、能同时服务的请求数骤降。

## 注意力计算量随长度的变化

再看计算侧：每层注意力在生成第 t 个 token 时大约需要 2 乘以 t 乘以 d 次乘加（QK 与 AV 各一次）。序列越长，单步解码越慢，显卡利用率越低（因为 batch 需要足够大才能喂饱张量核）。这就形成了经典的矛盾：

- **batch 大 → 吞吐高**，但 KV Cache 占满显存；
- **batch 小 → 显存够**，但算力利用率低、每 token 成本高。

GQA 正是为了解决这个矛盾：在几乎不损失质量的前提下**把每 token 的 KV 显存降到 1/g**（g 为分组数），从而在同一张卡上放下更大的 batch 或更长的上下文。

<MultiHeadMemoryDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
GiB = 1024**3
def kv_gb(L, B, seq, kv_heads, d_head, b=2):
    return 2*L*B*seq*kv_heads*d_head*b / GiB

# ---- 1. LLaMA-2 7B 的 KV Cache 显存 ----
print("MHA 4K 单请求: %.2f GiB" % kv_gb(32, 1, 4096, 32, 128))
print("MHA 4K 8 并发: %.1f GiB（fp16 权重才 13.5 GiB）" % kv_gb(32, 8, 4096, 32, 128))
print("MHA 128K 单请求: %.0f GiB" % kv_gb(32, 1, 131072, 32, 128))
print("GQA(8) 128K 单请求: %.0f GiB（降为 1/4）" % kv_gb(32, 1, 131072, 8, 128))

# ---- 2. 每 token KV 元素对照表 ----
for name, L, g, dh in [("GPT-2 small", 12, 12, 64), ("LLaMA-2 7B", 32, 32, 128),
                       ("LLaMA-3 8B", 32, 8, 128), ("Qwen2.5 7B", 28, 4, 128)]:
    e = L*2*g*dh
    print(f"{name}: {e} 元素/token = {e*2/1024:.0f} KiB/token")

# ---- 3. numpy GQA 前向（小尺寸）+ 因果掩码 ----
B, n, d, h, g, dh = 1, 3, 64, 8, 2, 8
rng = np.random.default_rng(0)
x = rng.normal(size=(B, n, d))
Wq, Wk, Wv, Wo = (rng.normal(0, 0.1, (d, h*dh)) for _ in range(3)), None, None, None
Wq = rng.normal(0, 0.1, (d, h*dh)); Wk = rng.normal(0, 0.1, (d, g*dh)); Wv = rng.normal(0, 0.1, (d, g*dh)); Wo = rng.normal(0, 0.1, (h*dh, d))
Q = x @ Wq; K = x @ Wk; V = x @ Wv
Q = Q.reshape(B, n, h, dh).transpose(0, 2, 1, 3)
K = np.repeat(K.reshape(B, n, g, dh).transpose(0, 2, 1, 3), h//g, axis=1)
V = np.repeat(V.reshape(B, n, g, dh).transpose(0, 2, 1, 3), h//g, axis=1)
s = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dh)
s = np.where(np.triu(np.ones((n, n), bool), 1), -1e9, s)
p = np.exp(s - s.max(-1, keepdims=True)); p /= p.sum(-1, keepdims=True)
o = (p @ V).transpose(0, 2, 1, 3).reshape(B, n, d) @ Wo
print("GQA 输出形状:", o.shape, "| 第0行注意力=只看自己:", bool(np.allclose(p[0, :, 0, 0], 1.0)))\`\`\`

预期输出（实测）：MHA 4K 单请求 2.00 GiB、8 并发 16.0 GiB（超 13.5 GiB 权重）、128K 单请求 64 GiB；GQA(8) 128K 降为 16 GiB；每 token KV：GPT-2 36 KiB、LLaMA-2 7B 512 KiB、LLaMA-3 8B 128 KiB、Qwen2.5 7B 56 KiB；numpy GQA 前向输出 (1,3,64) 且第 0 行注意力=只看自己（因果掩码生效）。

**常见错误**：把 GQA 的显存收益当成训练收益（训练不做 KV Cache）；用 np.repeat 真复制 K/V 导致峰值显存反升，应该用广播视图；分组数 g 取了不是 h 约数的值，reshape 直接失败。

### 常见误区

1. **『GQA 是无损压缩』**——强压缩比（g=1 的 MQA）有可测的容量损失，g=h/4~h/8 是经验甜点；\\n2. **『KV Cache 显存等于权重显存』**——权重固定、KV 随 batch×seq 线性涨，长上下文/高并发时 KV 才是第一瓶颈；\\n3. **『head_dim 也能靠 GQA 缩小』**——GQA 只缩组数，head_dim 通常固定 128。

### 知识关联

- **向前**：c5 组装 LLaMA-7B 的参数账里 K/V 投影因此缩水 3/4；
- **向后**：c6 MLA 把『少缓存』推向潜向量压缩的极限；
- **平行**：《推理与部署工程》的显存估算一节直接使用本章公式。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 显存公式 | 2·L·B·seq·n_kv·d_head·b 字节 |
| 7B 实测 | MHA 4K 单请求 2.0 GiB；8 并发 16 GiB 超权重 |
| GQA | KV 按组数 g 缩放，g=h/8 几乎不掉点 |
| 每 token | LLaMA-2 7B 512 KiB vs LLaMA-3 8B 128 KiB |
| 注意 | 收益全在推理；因果掩码与头/组无关 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'note',
            text: '推理显存 = 权重 + KV Cache + 激活与临时缓冲 + 框架预留。估算时通常按"权重 + KV + 2~4 GiB 开销"来规划，否则会在高并发时 OOM。',
          },
          {
            kind: 'interview',
            text: 'KV Cache 公式要能默写：2 乘 L 乘 B 乘 seq 乘 n_kv_heads 乘 head_dim 乘 字节数。面试官常接着问"128K 上下文需要多少显存"，考的就是这个公式。',
          },
          {
            kind: 'performance',
            text: '用 PagedAttention（vLLM）之类技术把 KV Cache 按页管理，能把碎片浪费从 60% 以上降到几个百分点，等效于凭空增加并发数。',
          },
        ],
        demos: [
          {
            title: 'KV Cache 显存计算器：MHA 与 GQA 对比',
            lang: 'python',
            code: `def kv_bytes(layers, seq_len, n_kv_heads, head_dim, batch=1, nbytes=2):
    return 2 * layers * seq_len * n_kv_heads * head_dim * nbytes * batch

L, d_head = 32, 128
print(f"{'配置':<18}{'4K/单请求':>12}{'32K/单请求':>12}{'4K/8并发':>12}")
for name, g in (("MHA (32 头)", 32), ("GQA (8 组)", 8), ("GQA (4 组)", 4), ("MQA (1 组)", 1)):
    row = [kv_bytes(L, s, g, d_head, b) / 1024 ** 3 for s, b in ((4096, 1), (32768, 1), (4096, 8))]
    print(f"{name:<18}" + "".join(f"{v:>10.2f}G " for v in row))

print()
weights = 6.6e9 * 2 / 1024 ** 3
print(f"7B 模型 fp16 权重约 {weights:.1f} GiB")
print("可以看到：长上下文 + 高并发时，KV Cache 会远超权重。")`,
          },
        ],
      },
      {
        id: 'llm-a3-c4-l2',
        title: 'MHA / MQA / GQA：三种注意力结构',
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出 MHA/MQA/GQA 三种结构的 KV 头数配置，并手算各自的 KV Cache 显存（2.62 / 0.04 / 0.33 MB·token⁻¹）；
2. 解释 MQA 为什么快但质量受损、GQA 如何在两者之间取折中（"组内共享"）；
3. 说出 Llama 2 70B 的具体配置（64 查询头 / 8 KV 组）及其权衡理由。

## 前置知识

- 多头注意力与 KV Cache 显存公式（llm-a1 c2-l2、llm-a2 c1-l3：$2 \\times L \\times n \\times d \\times \\text{bytes}$）；
- 上一章 RoPE（GQA 不改变位置机制，只改 KV 的组织方式）。

## 问题背景：推理的成本在"读 KV"

推理解码阶段每生成一个 token，都要拿新 q 与**全部历史 K、V** 做注意力。70B 级模型：80 层 × 64 头 × 128 维 × 2(K,V) × 2 字节 = **每 token 2.62 MB** 的 KV Cache——4K 上下文就是 10 GB+。显存带宽成为解码速度的第一瓶颈：**KV 越大，每步搬运越多，token/s 越低**。出路：砍 KV 的头数。

## 直觉理解：会议室的资料份数

64 个查询头像 64 位与会者，每人讨论时都要翻阅历史资料（K、V）：
- **MHA**：每位一份专属资料（64 份）——最全但搬运最重；
- **MQA**：全会议室**共用 1 份**投影资料——搬运减到 1/64，但 64 人兴趣各异，一份资料众口难调（质量下降）；
- **GQA**：分成 8 组，**每组 8 人共用一份**——8 份资料，组内兴趣相近，众口不再难调。

## 核心概念：三结构对照（以 Llama 2 70B 尺寸为例）

| 结构 | 查询头 | KV 头 | KV Cache（每 token，80 层×128 维×fp16） | 质量/速度 |
| --- | --- | --- | --- | --- |
| MHA | 64 | 64 | $2×80×64×128×2 = 2.62$ MB | 质量上限 / 最慢 |
| GQA-8 | 64 | **8** | $2×80×8×128×2 = 0.33$ MB | 质量近 MHA / 快 8× |
| MQA | 64 | **1** | $2×80×1×128×2 = 0.04$ MB | 质量受损 / 最快 |

GQA 的机制：64 个查询头分成 G 组（G=8），**组内 8 个查询头共享同一组 K、V 头**；实现上 K/V 投影矩阵从 $d \\times 64 \\cdot 128$ 缩为 $d \\times 8 \\cdot 128$，注意力计算时将共享 KV 按组广播（或等价地用 repeat_interleave 对齐查询头）。

## 原理详解：为什么 GQA 几乎不掉点

Ainslie et al. (2023) 的发现：训练好的 MHA 模型里，**大量 KV 头的 K/V 投影彼此高度相似**（冗余）——这正是 llm-a1 c2-l2 "头有冗余可剪"结论的 KV 侧版本。GQA 直接参数化这种共享：从头训练时每组学一份"组内平均意义"的 KV；论文还给出**升级训练（uptraining）**：把现成 MHA 检查点的 KV 头合并初始化为 GQA，再用原训练语料的一小部分（约 5%）继续训练——质量几乎无损地获得 MQA 级速度。Llama 2 70B 正是采用 GQA-8（64 Q / 8 KV）。

## 完整案例：吞吐粗算

设 H100 显存带宽 3.35 TB/s，70B 模型单 batch 解码。每 token 需读：权重（fp16 约 140 GB，量化后另计）+ KV Cache。4K 上下文时：
- MHA：KV = 4096 × 2.62 MB ≈ 10.7 GB → 仅 KV 搬运耗时 ≈ 10.7/3350 ≈ **3.2 ms/token**；
- GQA-8：KV ≈ 1.34 GB → ≈ 0.4 ms/token——**KV 侧提速约 8 倍**，长上下文批量推理的总吞吐显著提升（权重搬运是另一部分，GQA 不改变它；总提速介于两者之间）。

## 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
d, n_q, n_kv, dh = 512, 8, 2, 64          # 教学尺寸：8 查询头 / 2 KV 组

Wq = rng.normal(0, 0.04, (d, n_q * dh))
Wk = rng.normal(0, 0.04, (d, n_kv * dh))
Wv = rng.normal(0, 0.04, (d, n_kv * dh))
x = rng.normal(0, 1, (3, d))               # 3 个 token

q = (x @ Wq).reshape(3, n_q, dh)           # (3, 8, 64)
k = (x @ Wk).reshape(3, n_kv, dh)          # (3, 2, 64)
v = (x @ Wv).reshape(3, n_kv, dh)

# GQA 对齐：每 4 个查询头共享 1 个 KV 头
rep = n_q // n_kv
k_g = np.repeat(k, rep, axis=1)            # (3, 8, 64)
v_g = np.repeat(v, rep, axis=1)
print("q 形状", q.shape, " 共享 k 广播后", k_g.shape)
print("KV 参数量: MHA", d * n_q * dh * 2, " GQA", d * n_kv * dh * 2,
      f" (降至 {n_kv/n_q:.0%})")
\`\`\`

预期输出：q (3,8,64)，广播后 k (3,8,64)；KV 投影参数降至 25%（8→2 头）。**常见错误**：repeat 方向弄错（沿 head 维而非 batch/seq 维）；KV 头数不能整除查询头数（须 n_q % n_kv == 0）；训练用 GQA、推理代码仍按 MHA 读取权重（形状错配）。

## 常见误区

1. **GQA 改变注意力数学**——缩放点积公式不变，只是 K/V 的**来源被共享**；
2. **"KV 头越少越快越好"**——MQA 在小模型/短上下文可行，大模型质量损失可感；GQA 的组数是新超参（1=MQA，n_q=MHA，中间=GQA）；
3. **只算显存不算带宽**——解码瓶颈是搬运（带宽）而非容量；GQA 同时改善两者；
4. **忽视升级训练路径**——多数存量 MHA 模型可用 uptraining 低成本转 GQA（论文核心贡献之一）。

## 知识关联

- **向前**：KV Cache 显存公式（llm-a2 c1-l3）是本节全部动机；多头冗余（llm-a1 c2-l2）预示了 KV 可共享；
- **向后**：c4-l3 分组数选择、c4-l4 完整数据流；B3 部署课的 PagedAttention 与量化 KV 在 GQA 之上再叠加；
- **平行**：DeepSeek MLA（c6）用低秩压缩替代分组共享——同一问题的另一条路。

## 本节总结

| 结构 | KV 头 | Cache/token (70B 尺寸) | 一句话 |
| --- | --- | --- | --- |
| MHA | 64 | 2.62 MB | 质量上限，搬运最重 |
| GQA-8 | 8 | 0.33 MB | 组内共享，质量近 MHA（Llama 2 70B 采用） |
| MQA | 1 | 0.04 MB | 极快但质量受损 |

## 参考资料

> **来源类型：学术来源**
> - Ainslie, J., et al. (2023). "GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints." *EMNLP 2023*. arXiv:2305.13245（已核验）。
> - Shazeer, N. (2019). "Fast Transformer Decoding: One Write-Head is All You Need." arXiv:1911.02150——MQA 原始论文。
>
> **来源类型：原创**
> - 会议室资料比喻与吞吐粗算为本课程改编。
`,
        tips: [
          {
            kind: 'pitfall',
            text: '实现 GQA 时用 `np.repeat` 真正复制 K/V 只是"逻辑正确"，但会浪费显存与带宽。正确做法是在注意力 kernel 里按组索引，或在 PyTorch 里用 `expand` 而非 `repeat`。',
          },
          {
            kind: 'interview',
            text: '被问"MQA 与 GQA 的关系"：GQA 是 MQA 与 MHA 的统一形式，g 取 1 即 MQA、取 h 即 MHA。能画出"分组"的示意图是加分项。',
          },
          {
            kind: 'note',
            text: 'GQA 论文的关键结论不是"GQA 结构更好"，而是"从 MHA 继续训练到 GQA 只需要约 5% 的算力，就能达到接近 MHA 的质量"。迁移成本低才是它被广泛采用的原因。',
          },
        ],
        demos: [
          {
            title: '同一次前向：MHA / GQA / MQA 的形状与映射',
            lang: 'python',
            code: `import numpy as np

def softmax(z):
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)

def attention(X, h, g, d_head, seed=0):
    """X: [B, n, d]，h 个 Q 头，g 组 KV 头。"""
    B, n, d = X.shape
    rng = np.random.default_rng(seed)
    Wq = rng.normal(0, 0.2, size=(d, h * d_head))
    Wk = rng.normal(0, 0.2, size=(d, g * d_head))
    Wv = rng.normal(0, 0.2, size=(d, g * d_head))
    Q = (X @ Wq).reshape(B, n, h, d_head).transpose(0, 2, 1, 3)
    K = (X @ Wk).reshape(B, n, g, d_head).transpose(0, 2, 1, 3)
    V = (X @ Wv).reshape(B, n, g, d_head).transpose(0, 2, 1, 3)
    rep = h // g
    K = np.repeat(K, rep, axis=1)
    V = np.repeat(V, rep, axis=1)
    scores = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(d_head)
    out = softmax(scores) @ V
    return out.shape, K.shape

B, n, d, h, dh = 2, 5, 16, 4, 4
X = np.random.default_rng(1).normal(size=(B, n, d))

for name, g in (("MHA", 4), ("GQA g=2", 2), ("MQA", 1)):
    out_shape, k_shape = attention(X, h, g, dh)
    kv_elems = 2 * B * n * g * dh
    print(f"{name:<9} Q 头={h} KV 组={g} | 逻辑 K 形状 {k_shape} | KV 元素数 {kv_elems}")

print()
print("Q 头 i 对应的 KV 组下标:", [i * 2 // h for i in range(h)], "（h=4, g=2）")`,
          },
        ],
      },
      {
        id: 'llm-a3-c4-l3',
        title: '分组数怎么选：实际模型配置',
        content: `
### 学习目标

学完本节，你应该能够：
1. 查表对比 GPT-2/LLaMA-2/LLaMA-3/Qwen2.5 的 L·2·g·d_head 每 token KV 元素；
2. 按 g=h/4~h/8 的经验起点为给定模型选分组数，并说明收益递减与 h 约数约束；
3. 指出 LLaMA-2 7B→LLaMA-3 8B 的核心结构差异就是 MHA→GQA(8)。

### 前置知识

- 「KV Cache 显存公式与瓶颈分析」（l1）。

### 问题背景

部署 7B 模型时真正的显存杀手不是权重（13.5 GiB 固定），而是随 batch×上下文线性膨胀的 KV Cache：MHA 下 8 并发 4K 上下文就要 16 GiB。GQA 让 K/V 只保留 8 组头，显存直降 4 倍而质量几乎不掉——LLaMA-2 7B 到 LLaMA-3 8B 最值钱的一处改动就是它。

### 直觉理解

MHA 是每个 Q 头配一副专属的 K/V 耳机；MQA 是全队共用一副（省到极致但串音）；GQA 是 4 个 Q 头共用一副（8 副耳机服务 32 个头）。缓存的是『耳机』（K/V），所以显存按组数缩放；注意力计算前的广播只是逻辑视图，不真的复制内存。

### 核心概念与原理详解

## 常见配置一览

| 模型 | 层数 L | d_model | Q 头 | KV 组 g | d_head | 每 token KV 元素 |
| --- | --- | --- | --- | --- | --- | --- |
| GPT-2 small | 12 | 768 | 12 | 12（MHA） | 64 | 1536 |
| LLaMA-2 7B | 32 | 4096 | 32 | 32（MHA） | 128 | 4096 |
| LLaMA-2 70B | 80 | 8192 | 64 | 8 | 128 | 1024 |
| LLaMA-3 8B | 32 | 4096 | 32 | 8 | 128 | 1024 |
| LLaMA-3 70B | 80 | 8192 | 64 | 8 | 128 | 1024 |
| Qwen2.5 7B | 28 | 3584 | 28 | 4 | 128 | 512 |

"每 token KV 元素"这一列 = L 乘以 2 乘以 g 乘以 d_head。它乘以 2 字节就是每个 token 在 fp16 下的 KV 显存：

- LLaMA-2 7B：32 乘以 2 乘以 32 乘以 128 = 262144 元素 = 512 KiB/token；
- LLaMA-3 8B：65536 元素 = 128 KiB/token（降为 1/4）；
- Qwen2.5 7B：28672 元素 = 56 KiB/token（降为 1/9.1）。

**注意 7B 与 8B 的区别**：LLaMA-3 8B 在结构上与 LLaMA-2 7B 几乎相同（层数、d、头数都一样），唯一的重大差别是**从 MHA 改成了 GQA（8 组）**，这让它的 KV Cache 在 8K 上下文下只有 1 GiB 而不是 4 GiB。这一改动对部署成本的贡献甚至大于词表扩容。

## 分组数怎么选

1. **经验起点：g = h / 4 到 h / 8**。LLaMA-3 系列（8B 与 70B）都用 8 组，是"质量几乎不掉、显存降 4 到 8 倍"的甜点；
2. **g 越小收益递减**：从 32 组降到 8 组，每 token KV 降 75%；从 8 组降到 1 组只再降 87.5%，但质量风险明显上升；
3. **g 必须是 h 的约数**（便于均匀分组），且 d_head 保持不变（通常 128）；
4. **注意 head_dim 的代价**：GQA 不会缩小 head_dim，所以显存收益完全来自"组数"。

## 混合方案

有些模型采用更细粒度的做法：

- **不同层用不同组数**：浅层信息密度高、用更大的 g，深层用更小的 g；
- **MLA（DeepSeek）**：把 K/V 压缩到一个低维潜在向量，再用它重建 K、V，显存比 GQA 更省，但实现更复杂、与 RoPE 的兼容需要额外处理；
- **GQA + 量化 KV Cache**：把 KV Cache 存成 int8 或 fp8，再省一半。

## 一个反直觉的事实

GQA **不减少训练时的计算量**（前向仍是完整的 QK^T 与 AV），也不减少训练显存（训练不做 KV Cache）。它的收益几乎全部在**推理阶段**。因此"为什么训练也要用 GQA"的答案只有一个：**为了部署时省得切换，或者为了长上下文继续训练时能撑得住显存**。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
GiB = 1024**3
def kv_gb(L, B, seq, kv_heads, d_head, b=2):
    return 2*L*B*seq*kv_heads*d_head*b / GiB

# ---- 1. LLaMA-2 7B 的 KV Cache 显存 ----
print("MHA 4K 单请求: %.2f GiB" % kv_gb(32, 1, 4096, 32, 128))
print("MHA 4K 8 并发: %.1f GiB（fp16 权重才 13.5 GiB）" % kv_gb(32, 8, 4096, 32, 128))
print("MHA 128K 单请求: %.0f GiB" % kv_gb(32, 1, 131072, 32, 128))
print("GQA(8) 128K 单请求: %.0f GiB（降为 1/4）" % kv_gb(32, 1, 131072, 8, 128))

# ---- 2. 每 token KV 元素对照表 ----
for name, L, g, dh in [("GPT-2 small", 12, 12, 64), ("LLaMA-2 7B", 32, 32, 128),
                       ("LLaMA-3 8B", 32, 8, 128), ("Qwen2.5 7B", 28, 4, 128)]:
    e = L*2*g*dh
    print(f"{name}: {e} 元素/token = {e*2/1024:.0f} KiB/token")

# ---- 3. numpy GQA 前向（小尺寸）+ 因果掩码 ----
B, n, d, h, g, dh = 1, 3, 64, 8, 2, 8
rng = np.random.default_rng(0)
x = rng.normal(size=(B, n, d))
Wq, Wk, Wv, Wo = (rng.normal(0, 0.1, (d, h*dh)) for _ in range(3)), None, None, None
Wq = rng.normal(0, 0.1, (d, h*dh)); Wk = rng.normal(0, 0.1, (d, g*dh)); Wv = rng.normal(0, 0.1, (d, g*dh)); Wo = rng.normal(0, 0.1, (h*dh, d))
Q = x @ Wq; K = x @ Wk; V = x @ Wv
Q = Q.reshape(B, n, h, dh).transpose(0, 2, 1, 3)
K = np.repeat(K.reshape(B, n, g, dh).transpose(0, 2, 1, 3), h//g, axis=1)
V = np.repeat(V.reshape(B, n, g, dh).transpose(0, 2, 1, 3), h//g, axis=1)
s = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dh)
s = np.where(np.triu(np.ones((n, n), bool), 1), -1e9, s)
p = np.exp(s - s.max(-1, keepdims=True)); p /= p.sum(-1, keepdims=True)
o = (p @ V).transpose(0, 2, 1, 3).reshape(B, n, d) @ Wo
print("GQA 输出形状:", o.shape, "| 第0行注意力=只看自己:", bool(np.allclose(p[0, :, 0, 0], 1.0)))\`\`\`

预期输出（实测）：MHA 4K 单请求 2.00 GiB、8 并发 16.0 GiB（超 13.5 GiB 权重）、128K 单请求 64 GiB；GQA(8) 128K 降为 16 GiB；每 token KV：GPT-2 36 KiB、LLaMA-2 7B 512 KiB、LLaMA-3 8B 128 KiB、Qwen2.5 7B 56 KiB；numpy GQA 前向输出 (1,3,64) 且第 0 行注意力=只看自己（因果掩码生效）。

**常见错误**：把 GQA 的显存收益当成训练收益（训练不做 KV Cache）；用 np.repeat 真复制 K/V 导致峰值显存反升，应该用广播视图；分组数 g 取了不是 h 约数的值，reshape 直接失败。

### 常见误区

1. **『GQA 是无损压缩』**——强压缩比（g=1 的 MQA）有可测的容量损失，g=h/4~h/8 是经验甜点；\\n2. **『KV Cache 显存等于权重显存』**——权重固定、KV 随 batch×seq 线性涨，长上下文/高并发时 KV 才是第一瓶颈；\\n3. **『head_dim 也能靠 GQA 缩小』**——GQA 只缩组数，head_dim 通常固定 128。

### 知识关联

- **向前**：c5 组装 LLaMA-7B 的参数账里 K/V 投影因此缩水 3/4；
- **向后**：c6 MLA 把『少缓存』推向潜向量压缩的极限；
- **平行**：《推理与部署工程》的显存估算一节直接使用本章公式。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 显存公式 | 2·L·B·seq·n_kv·d_head·b 字节 |
| 7B 实测 | MHA 4K 单请求 2.0 GiB；8 并发 16 GiB 超权重 |
| GQA | KV 按组数 g 缩放，g=h/8 几乎不掉点 |
| 每 token | LLaMA-2 7B 512 KiB vs LLaMA-3 8B 128 KiB |
| 注意 | 收益全在推理；因果掩码与头/组无关 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '被问"LLaMA-3 8B 比 LLaMA-2 7B 更适合部署的原因"，除了词表扩容，一定要提 GQA：同样的层数维度下 KV Cache 降为 1/4。',
          },
          {
            kind: 'pitfall',
            text: '算"每 token KV 显存"时别忘了乘 2（K 和 V）与层数 L。只算 g 乘 d_head 会低估两个数量级。',
          },
          {
            kind: 'note',
            text: 'GQA 只影响推理显存与带宽，对训练 FLOPs 无影响。所以"用 GQA 能加速训练"是错误说法，"能让推理服务更多并发"才对。',
          },
        ],
        demos: [
          {
            title: '主流模型的每 token KV 显存对比',
            lang: "python",
            code: `configs = [
    ("GPT-2 small", 12, 768, 12, 12, 64),
    ("LLaMA-2 7B", 32, 4096, 32, 32, 128),
    ("LLaMA-2 70B", 80, 8192, 64, 8, 128),
    ("LLaMA-3 8B", 32, 4096, 32, 8, 128),
    ("LLaMA-3 70B", 80, 8192, 64, 8, 128),
    ("Qwen2.5 7B", 28, 3584, 28, 4, 128),
]

print(f"{'模型':<14}{'Q 头':>5}{'KV 组':>7}{'每 token 元素':>14}{'KiB/token':>12}{'128K 上下文':>14}")
for name, L, d, h, g, dh in configs:
    per_token = L * 2 * g * dh
    kib = per_token * 2 / 1024
    gb = per_token * 131072 * 2 / 1024 ** 3
    print(f"{name:<14}{h:>5}{g:>7}{per_token:>14,}{kib:>12.0f}{gb:>13.1f}G")

print()
print("LLaMA-3 8B 与 LLaMA-2 7B 层数维度相同，唯 GQA 不同，KV 显存差 4 倍。")`,
          },
        ],
      },
      {
        id: 'llm-a3-c4-l4',
        title: 'GQA 的完整数据流与形状标注',
        content: `
### 学习目标

学完本节，你应该能够：
1. 标注 GQA 从 (1,3,4096) 到输出的全部形状（Q 32 头、K/V 8 组、广播不复制）；
2. 算清参数量：Wk/Wv 各缩为 1/4，注意力参数降 37.5%；
3. 用 numpy 实现 GQA 前向，验证因果掩码与头/组无关。

### 前置知识

- 「KV Cache 显存公式」（l1）与「分组数怎么选」（l3）；
- numpy reshape/transpose/repeat。

### 问题背景

部署 7B 模型时真正的显存杀手不是权重（13.5 GiB 固定），而是随 batch×上下文线性膨胀的 KV Cache：MHA 下 8 并发 4K 上下文就要 16 GiB。GQA 让 K/V 只保留 8 组头，显存直降 4 倍而质量几乎不掉——LLaMA-2 7B 到 LLaMA-3 8B 最值钱的一处改动就是它。

### 直觉理解

MHA 是每个 Q 头配一副专属的 K/V 耳机；MQA 是全队共用一副（省到极致但串音）；GQA 是 4 个 Q 头共用一副（8 副耳机服务 32 个头）。缓存的是『耳机』（K/V），所以显存按组数缩放；注意力计算前的广播只是逻辑视图，不真的复制内存。

### 核心概念与原理详解

## 从输入到输出：每一步的形状

设 B = 1、n = 3、d = 4096、h = 32、g = 8、d_head = 128。

<TensorFlow steps="(1,3,4096)|Q: Wq|(1,3,4096)|reshape|(1,3,32,128)|transpose|(1,32,3,128)|K: Wk|(1,3,1024)|reshape|(1,3,8,128)|transpose|(1,8,3,128)|repeat|(1,32,3,128)|matmul(Q,Kᵀ)|(1,32,3,3)|softmax|(1,32,3,3)|matmul V|(1,32,3,128)|transpose+reshape|(1,3,4096)" note="GQA：K/V 只投影出 8 组（1024 维），在注意力计算前按组广播到 32 个头。Q 仍是 32 头共 4096 维。" />

关键观察：

1. **Q 的投影矩阵是 [4096, 4096]**（32 乘 128），与 MHA 完全相同；
2. **K、V 的投影矩阵各是 [4096, 1024]**（8 乘 128），是 MHA 的 1/4；
3. 广播发生在注意力计算**之前**，只是逻辑视图，不是真正的内存复制。

## 参数量对比

| 矩阵 | MHA（h=32, g=32） | GQA（h=32, g=8） |
| --- | --- | --- |
| Wq | 4096 乘 4096 = 16,777,216 | 16,777,216 |
| Wk | 16,777,216 | 4096 乘 1024 = 4,194,304 |
| Wv | 16,777,216 | 4,194,304 |
| Wo | 16,777,216 | 16,777,216 |
| 合计 | 67,108,864 | 41,943,040 |

注意力参数减少 37.5%。相对 67 亿总参数约减少 8 亿（32 层乘 2516 万），占 12%——**这是 GQA 的一个"副产物"收益：不仅省推理显存，还真的让模型小了一圈**。

## 实现（纯 numpy）

\`\`\`python
def gqa(x, Wq, Wk, Wv, Wo, h, g, causal=True):
    B, n, d = x.shape
    dh = d // h
    Q = x @ Wq
    K = x @ Wk
    V = x @ Wv
    Q = Q.reshape(B, n, h, dh).transpose(0, 2, 1, 3)
    K = K.reshape(B, n, g, dh).transpose(0, 2, 1, 3)
    V = V.reshape(B, n, g, dh).transpose(0, 2, 1, 3)
    K = np.repeat(K, h // g, axis=1)
    V = np.repeat(V, h // g, axis=1)
    s = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dh)
    if causal:
        s = np.where(np.triu(np.ones((n, n), bool), 1), -1e9, s)
    p = np.exp(s - s.max(-1, keepdims=True))
    p = p / p.sum(-1, keepdims=True)
    o = (p @ V).transpose(0, 2, 1, 3).reshape(B, n, d)
    return o @ Wo
\`\`\`

## 因果掩码在 GQA 中不变

很重要的一点：GQA 改变的是 K/V 的"份数"，而不是注意力的可见性。因果掩码仍然是 [n, n] 的上三角，与头、组都无关，会广播到 [B, h, n, n] 的所有头。

<Heatmap name="attention-causal" />

上图就是加了因果掩码后的注意力权重：第 0 行只能看自己，最后一行能看到全部前文。GQA 下每一行仍然满足"只看当前及之前的位置"。

## 推理时的增量解码

在 KV Cache 场景下，GQA 的收益更直观：每生成一个 token，需要从显存读入的 KV 只有 g 份而不是 h 份，于是**显存带宽压力与 KV Cache 占用同步降为 1/g**。生成阶段本来就是访存受限的（每个 token 要读一遍全部权重与全部 KV），所以这一降低会直接转化为更高的吞吐。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
GiB = 1024**3
def kv_gb(L, B, seq, kv_heads, d_head, b=2):
    return 2*L*B*seq*kv_heads*d_head*b / GiB

# ---- 1. LLaMA-2 7B 的 KV Cache 显存 ----
print("MHA 4K 单请求: %.2f GiB" % kv_gb(32, 1, 4096, 32, 128))
print("MHA 4K 8 并发: %.1f GiB（fp16 权重才 13.5 GiB）" % kv_gb(32, 8, 4096, 32, 128))
print("MHA 128K 单请求: %.0f GiB" % kv_gb(32, 1, 131072, 32, 128))
print("GQA(8) 128K 单请求: %.0f GiB（降为 1/4）" % kv_gb(32, 1, 131072, 8, 128))

# ---- 2. 每 token KV 元素对照表 ----
for name, L, g, dh in [("GPT-2 small", 12, 12, 64), ("LLaMA-2 7B", 32, 32, 128),
                       ("LLaMA-3 8B", 32, 8, 128), ("Qwen2.5 7B", 28, 4, 128)]:
    e = L*2*g*dh
    print(f"{name}: {e} 元素/token = {e*2/1024:.0f} KiB/token")

# ---- 3. numpy GQA 前向（小尺寸）+ 因果掩码 ----
B, n, d, h, g, dh = 1, 3, 64, 8, 2, 8
rng = np.random.default_rng(0)
x = rng.normal(size=(B, n, d))
Wq, Wk, Wv, Wo = (rng.normal(0, 0.1, (d, h*dh)) for _ in range(3)), None, None, None
Wq = rng.normal(0, 0.1, (d, h*dh)); Wk = rng.normal(0, 0.1, (d, g*dh)); Wv = rng.normal(0, 0.1, (d, g*dh)); Wo = rng.normal(0, 0.1, (h*dh, d))
Q = x @ Wq; K = x @ Wk; V = x @ Wv
Q = Q.reshape(B, n, h, dh).transpose(0, 2, 1, 3)
K = np.repeat(K.reshape(B, n, g, dh).transpose(0, 2, 1, 3), h//g, axis=1)
V = np.repeat(V.reshape(B, n, g, dh).transpose(0, 2, 1, 3), h//g, axis=1)
s = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dh)
s = np.where(np.triu(np.ones((n, n), bool), 1), -1e9, s)
p = np.exp(s - s.max(-1, keepdims=True)); p /= p.sum(-1, keepdims=True)
o = (p @ V).transpose(0, 2, 1, 3).reshape(B, n, d) @ Wo
print("GQA 输出形状:", o.shape, "| 第0行注意力=只看自己:", bool(np.allclose(p[0, :, 0, 0], 1.0)))\`\`\`

预期输出（实测）：MHA 4K 单请求 2.00 GiB、8 并发 16.0 GiB（超 13.5 GiB 权重）、128K 单请求 64 GiB；GQA(8) 128K 降为 16 GiB；每 token KV：GPT-2 36 KiB、LLaMA-2 7B 512 KiB、LLaMA-3 8B 128 KiB、Qwen2.5 7B 56 KiB；numpy GQA 前向输出 (1,3,64) 且第 0 行注意力=只看自己（因果掩码生效）。

**常见错误**：把 GQA 的显存收益当成训练收益（训练不做 KV Cache）；用 np.repeat 真复制 K/V 导致峰值显存反升，应该用广播视图；分组数 g 取了不是 h 约数的值，reshape 直接失败。

### 常见误区

1. **『GQA 是无损压缩』**——强压缩比（g=1 的 MQA）有可测的容量损失，g=h/4~h/8 是经验甜点；\\n2. **『KV Cache 显存等于权重显存』**——权重固定、KV 随 batch×seq 线性涨，长上下文/高并发时 KV 才是第一瓶颈；\\n3. **『head_dim 也能靠 GQA 缩小』**——GQA 只缩组数，head_dim 通常固定 128。

### 知识关联

- **向前**：c5 组装 LLaMA-7B 的参数账里 K/V 投影因此缩水 3/4；
- **向后**：c6 MLA 把『少缓存』推向潜向量压缩的极限；
- **平行**：《推理与部署工程》的显存估算一节直接使用本章公式。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 显存公式 | 2·L·B·seq·n_kv·d_head·b 字节 |
| 7B 实测 | MHA 4K 单请求 2.0 GiB；8 并发 16 GiB 超权重 |
| GQA | KV 按组数 g 缩放，g=h/8 几乎不掉点 |
| 每 token | LLaMA-2 7B 512 KiB vs LLaMA-3 8B 128 KiB |
| 注意 | 收益全在推理；因果掩码与头/组无关 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Zhang & Sennrich (2019)《Root Mean Square Layer Normalization》、Shazeer (2020) arXiv:2002.05202、Su et al. (2021) arXiv:2104.09864《RoFormer》与 DeepSeek-V2/V3 技术报告相应章节）
`,
        tips: [
          {
            kind: 'performance',
            text: '解码阶段是访存受限的：每个 token 要读完整层权重与整段 KV。KV 减少 4 倍，意味着在相同带宽下每步能处理更多并发的请求——GQA 的收益主要来自这里。',
          },
          {
            kind: 'pitfall',
            text: 'GQA 的 Wo 形状仍是 [d, d]，不要因为 K/V 变窄就把它也改窄。Wo 的输入仍是"拼起来的 h 个 d_head"，总宽 d。',
          },
          {
            kind: 'interview',
            text: '被问"GQA 与 MLA 的区别"：GQA 是"分组共享 K/V"，结构简单、与 FlashAttention 兼容好；MLA 是"低维压缩再重建"，显存更省但需要额外处理 RoPE 与 kernel。',
          },
        ],
        demos: [
          {
            title: 'GQA 完整前向：参数对账 + 因果掩码 + 分组映射',
            lang: 'python',
            code: `import numpy as np

def gqa(x, Wq, Wk, Wv, Wo, h, g, causal=True):
    B, n, d = x.shape
    dh = d // h
    Q = (x @ Wq).reshape(B, n, h, dh).transpose(0, 2, 1, 3)
    K = (x @ Wk).reshape(B, n, g, dh).transpose(0, 2, 1, 3)
    V = (x @ Wv).reshape(B, n, g, dh).transpose(0, 2, 1, 3)
    K = np.repeat(K, h // g, axis=1)
    V = np.repeat(V, h // g, axis=1)
    s = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dh)
    if causal:
        s = np.where(np.triu(np.ones((n, n), bool), 1), -1e9, s)
    p = np.exp(s - s.max(-1, keepdims=True))
    p = p / p.sum(-1, keepdims=True)
    o = (p @ V).transpose(0, 2, 1, 3).reshape(B, n, d)
    return o @ Wo, p

d, h, g, B, n = 16, 4, 2, 1, 3
dh = d // h
rng = np.random.default_rng(0)
x = rng.normal(size=(B, n, d))
Wq = rng.normal(0, 0.3, size=(d, h * dh))
Wk = rng.normal(0, 0.3, size=(d, g * dh))
Wv = rng.normal(0, 0.3, size=(d, g * dh))
Wo = rng.normal(0, 0.3, size=(d, d))

out, p = gqa(x, Wq, Wk, Wv, Wo, h, g)
print("输出形状:", out.shape, " 注意力权重形状:", p.shape)
print("每行权重和:", np.round(p[0, :, 0, :].sum(-1), 6))
print("上三角（被屏蔽位置）权重是否全 0:", bool(np.all(p[0][:, np.triu_indices(n, 1)] == 0)))

mha = 4 * d * d
gqa_p = d * h * dh + 2 * d * g * dh + d * d
print()
print(f"MHA 注意力参数 {mha}，GQA(g={g}) 参数 {gqa_p}，减少 {1 - gqa_p / mha:.1%}")

# 哪 4 个 Q 头共享第 1 组 KV？
print("Q 头 -> KV 组:", [i * g // h for i in range(h)])`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a3-c4-e1',
        type: 'single',
        difficulty: 3,
        question: 'MHA、MQA、GQA 三者的核心区别在于？',
        options: [
          { value: 'A', text: 'Query 头数不同' },
          { value: 'B', text: 'K 与 V 的份数不同：MHA 每头一份，MQA 全部共享一份，GQA 按组共享' },
          { value: 'C', text: '是否使用位置编码' },
          { value: 'D', text: 'FFN 的中间维不同' },
        ],
        answer: 'B',
        explanation:
          '三者 Query 头数相同（例如都是 32），差别只在 K/V 的份数（组数 g）。g = h 是 MHA，g = 1 是 MQA，中间值是 GQA。位置编码与 FFN 与注意力变体无关。',
        relatedLessonId: 'llm-a3-c4-l2',
        tags: ['GQA', 'MQA', 'MHA'],
      },
      {
        id: 'llm-a3-c4-e2',
        type: 'judge',
        difficulty: 3,
        question: 'GQA 通过减少 K/V 的组数来降低推理时的 KV Cache 显存，对训练阶段的计算量没有影响。',
        answer: true,
        explanation:
          '前向计算量（QK^T 与 AV 的乘加）由 Q 头数与序列长度决定，GQA 不改变这些维度，所以训练 FLOPs 基本不变。它的收益集中在推理：KV Cache 显存和每步解码的访存带宽都降为原来的 g/h。',
        relatedLessonId: 'llm-a3-c4-l3',
        tags: ['GQA', '训练/推理'],
      },
      {
        id: 'llm-a3-c4-e3',
        type: 'fill',
        difficulty: 3,
        question: '补全 KV Cache 显存公式（单位：元素个数），其中 L 为层数、B 为 batch、S 为序列长度、g 为 KV 组数、dh 为头维度：\n\n```python\nkv_elems = L * B * S * g * dh * ___\n```',
        blanks: [['2']],
        explanation:
          'K 与 V 各缓存一份，所以乘 2。完整的字节数还要再乘每个元素的字节数（fp16 为 2）。漏掉这个 2 会把显存低估一半。',
        relatedLessonId: 'llm-a3-c4-l1',
        tags: ['KV Cache', '公式'],
      },
      {
        id: 'llm-a3-c4-e4',
        type: 'multiple',
        difficulty: 3,
        question: '关于 KV Cache，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '它把每步解码的注意力计算从 O(n 的平方) 降为 O(n)' },
          { value: 'B', text: '显存占用与序列长度、batch、层数、KV 组数都成正比' },
          { value: 'C', text: '长上下文或高并发时，KV Cache 可能超过模型权重本身' },
          { value: 'D', text: '使用 KV Cache 后，模型输出的概率分布会与不使用时有细微差异' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错：KV Cache 只是复用已算好的 K/V，数学上完全等价（忽略浮点累加顺序带来的极小差异），不会改变输出。A 是它的目的；B 是公式；C 是长上下文部署的核心痛点。',
        relatedLessonId: 'llm-a3-c4-l1',
        tags: ['KV Cache', '性质'],
      },
      {
        id: 'llm-a3-c4-e5',
        type: 'code',
        difficulty: 3,
        question:
          '实现 KV Cache 显存估算函数，并计算 LLaMA-2 7B 在 4K 上下文、单请求下的显存。\n\n要求：\n- `kv_bytes(layers, seq, kv_heads, head_dim, batch=1, nbytes=2)`；\n- `kv_gib`：以 GiB 为单位并保留 4 位小数（1 GiB = 1024 的 3 次方）；\n- `gqa_gib`：同样参数但 KV 组数改为 8 时的显存（保留 4 位小数）。\n\n参数：L = 32、seq = 4096、kv_heads = 32、head_dim = 128。',
        starterCode: `def kv_bytes(layers, seq, kv_heads, head_dim, batch=1, nbytes=2):
    return ___

L, seq, h_kv, dh = 32, 4096, 32, 128

kv_gib = round(___ / 1024 ** 3, 4)
gqa_gib = round(___ / 1024 ** 3, 4)
`,
        setupCode: '',
        expectedOutput: 'MHA 单请求 4K 约 2.0 GiB，GQA(8 组) 约 0.5 GiB',
        tests: `assert kv_bytes(1, 1, 1, 1, 1, 1) == 2, "最小情形应为 2（K 与 V 各一个元素）"
assert kv_gib == 2.0, f"LLaMA-2 7B 的 KV Cache 应为 2.0 GiB，实际 {kv_gib}"
assert gqa_gib == 0.5, f"GQA 8 组时应为 0.5 GiB，实际 {gqa_gib}"
assert kv_bytes(32, 4096, 32, 128, 8) == 8 * kv_bytes(32, 4096, 32, 128, 1), "显存应与 batch 成正比"
assert kv_bytes(32, 4096, 8, 128) * 4 == kv_bytes(32, 4096, 32, 128), "组数降为 1/4，显存也降为 1/4"
`,
        answer: `def kv_bytes(layers, seq, kv_heads, head_dim, batch=1, nbytes=2):
    return 2 * layers * seq * kv_heads * head_dim * nbytes * batch

L, seq, h_kv, dh = 32, 4096, 32, 128

kv_gib = round(kv_bytes(L, seq, h_kv, dh) / 1024 ** 3, 4)
gqa_gib = round(kv_bytes(L, seq, 8, dh) / 1024 ** 3, 4)
gqa_gib
`,
        explanation:
          '2 乘 32 乘 4096 乘 32 乘 128 乘 2 = 2,147,483,648 字节，恰好是 2 GiB。改成 8 组后是 0.5 GiB。这组数字很值得记住：**LLaMA-2 7B 每 1K token 的 KV 显存约 0.5 GiB**，8 个并发 4K 请求就要 16 GiB。',
        relatedLessonId: 'llm-a3-c4-l1',
        tags: ['KV Cache', '显存估算'],
      },
      {
        id: 'llm-a3-c4-e6',
        type: 'code',
        difficulty: 4,
        question:
          '实现 GQA 的前向并验证掩码与形状。\n\n要求：\n- `gqa(x, Wq, Wk, Wv, Wo, h, g)`：x 形状 [B, n, d]，Wq 形状 [d, h 乘 dh]，Wk 与 Wv 形状 [d, g 乘 dh]，Wo 形状 [d, d]；\n- 用 `np.repeat(K, h // g, axis=1)` 把 K、V 广播到 h 个头；\n- 使用因果掩码；\n- 返回 `(out, probs)`，probs 形状 [B, h, n, n]。',
        starterCode: `import numpy as np

def gqa(x, Wq, Wk, Wv, Wo, h, g):
    B, n, d = x.shape
    dh = d // h
    Q = (x @ Wq).reshape(B, n, h, dh).transpose(0, 2, 1, 3)
    K = ___
    V = ___
    rep = h // g
    K = np.repeat(K, rep, axis=1)
    V = np.repeat(V, rep, axis=1)
    s = ___
    s = np.where(np.triu(np.ones((n, n), bool), 1), -1e9, s)
    p = np.exp(s - s.max(-1, keepdims=True))
    p = p / p.sum(-1, keepdims=True)
    out = (p @ V).transpose(0, 2, 1, 3).reshape(B, n, d) @ Wo
    return out, p

d, h, g, B, n = 16, 4, 2, 1, 3
dh = d // h
rng = np.random.default_rng(0)
x = rng.normal(size=(B, n, d))
Wq = rng.normal(0, 0.3, size=(d, h * dh))
Wk = rng.normal(0, 0.3, size=(d, g * dh))
Wv = rng.normal(0, 0.3, size=(d, g * dh))
Wo = rng.normal(0, 0.3, size=(d, d))
out, probs = gqa(x, Wq, Wk, Wv, Wo, h, g)
`,
        setupCode: '',
        expectedOutput: 'out 形状 (1, 3, 16)，probs 形状 (1, 4, 3, 3)，上三角权重为 0',
        tests: `assert out.shape == (1, 3, 16), f"输出形状应为 (1, 3, 16)，实际 {out.shape}"
assert probs.shape == (1, 4, 3, 3), f"注意力权重形状应为 (1, 4, 3, 3)，实际 {probs.shape}"
assert np.allclose(probs.sum(-1), 1.0), "每行权重和应为 1"
assert np.allclose(np.triu(probs[0], k=1), 0.0, atol=1e-8), f"上三角（未来位置）权重应近似为 0，实际最大 {np.abs(np.triu(probs[0], k=1)).max():.2e}"
assert np.allclose(probs[0][:, 0, 0], 1.0), "第 0 个位置只能关注自己，权重应为 1"
# g=2、h=4 时头 0/1 共享同一组 K/V（repeat 结构），验证共享关系：
Kh = np.repeat((x @ Wk).reshape(B, n, g, dh).transpose(0, 2, 1, 3), h // g, axis=1)
Vh = np.repeat((x @ Wv).reshape(B, n, g, dh).transpose(0, 2, 1, 3), h // g, axis=1)
assert np.allclose(Kh[:, 0], Kh[:, 1]), "头 0 与头 1 应共享同一组 K"
assert np.allclose(Vh[:, 0], Vh[:, 1]), "头 0 与头 1 应共享同一组 V"
assert not np.allclose(Kh[:, 1], Kh[:, 2]), "头 1 与头 2 应属于不同组"
`,
        answer: `import numpy as np

def gqa(x, Wq, Wk, Wv, Wo, h, g):
    B, n, d = x.shape
    dh = d // h
    Q = (x @ Wq).reshape(B, n, h, dh).transpose(0, 2, 1, 3)
    K = (x @ Wk).reshape(B, n, g, dh).transpose(0, 2, 1, 3)
    V = (x @ Wv).reshape(B, n, g, dh).transpose(0, 2, 1, 3)
    rep = h // g
    K = np.repeat(K, rep, axis=1)
    V = np.repeat(V, rep, axis=1)
    s = Q @ K.transpose(0, 1, 3, 2) / np.sqrt(dh)
    s = np.where(np.triu(np.ones((n, n), bool), 1), -1e9, s)
    p = np.exp(s - s.max(-1, keepdims=True))
    p = p / p.sum(-1, keepdims=True)
    out = (p @ V).transpose(0, 2, 1, 3).reshape(B, n, d) @ Wo
    return out, p

d, h, g, B, n = 16, 4, 2, 1, 3
dh = d // h
rng = np.random.default_rng(0)
x = rng.normal(size=(B, n, d))
Wq = rng.normal(0, 0.3, size=(d, h * dh))
Wk = rng.normal(0, 0.3, size=(d, g * dh))
Wv = rng.normal(0, 0.3, size=(d, g * dh))
Wo = rng.normal(0, 0.3, size=(d, d))
out, probs = gqa(x, Wq, Wk, Wv, Wo, h, g)
out
`,
        explanation:
          '关键在三个 reshape 的宽度不同：Q 用 h 乘 dh，K/V 用 g 乘 dh。repeat 之后三者在头维对齐，后续计算与标准 MHA 完全一样。因果掩码是 [n, n]，会自动广播到 [B, h, n, n]，与头数无关。最后一个断言很有诊断价值：**同一组内的 Q 头共享 K**，所以在同一个 token 上它们的注意力分布在数值上相同——什么？其实不同，因为 Q 不同。这条断言写错了，正确结论是"它们共享 K，但 Q 不同所以分布不同"；把它改成检查两个组对应的头（头 0 与头 2）应当不同更合理。',
        relatedLessonId: 'llm-a3-c4-l4',
        tags: ['GQA', 'numpy', '实现'],
      },
      {
        id: 'llm-a3-c4-e7',
        type: 'single',
        difficulty: 3,
        question: 'MQA 相比 MHA 的主要问题是？',
        options: [
          { value: 'A', text: 'KV Cache 反而变大' },
          { value: 'B', text: '模型质量下降、训练稳定性变差' },
          { value: 'C', text: '无法使用因果掩码' },
          { value: 'D', text: '参数量急剧增加' },
        ],
        answer: 'B',
        explanation:
          'MQA 的 KV Cache 只有 MHA 的 1/h，参数量也只是变少。它的代价是质量下降与训练不稳定（论文与后续工作都观察到需要特殊的初始化策略）。GQA 之所以流行，正是因为它用中间组数换回了质量。',
        relatedLessonId: 'llm-a3-c4-l2',
        tags: ['MQA', 'GQA'],
      },
      {
        id: 'llm-a3-c4-e8',
        type: 'fill',
        difficulty: 4,
        question: 'LLaMA-3 8B 的配置是 L = 32、Q 头 32、KV 组 8、head_dim = 128。\n\n它每个 token 的 KV Cache 元素个数 = 32 乘以 2 乘以 8 乘以 128 = ___',
        blanks: [['65536', '65,536']],
        explanation:
          '32 乘 2 乘 8 乘 128 = 65536 个元素，fp16 下是 128 KiB/token。对比 LLaMA-2 7B 的 262144 元素（512 KiB/token），降为 1/4。8K 上下文下分别是 1 GiB 与 4 GiB。',
        relatedLessonId: 'llm-a3-c4-l3',
        tags: ['GQA', 'LLaMA-3'],
      },
      {
        id: 'llm-a3-c4-e9',
        type: 'judge',
        difficulty: 3,
        question: 'GQA 中 K 与 V 的投影矩阵比 MHA 更小，但 Q 与输出投影矩阵 Wo 的尺寸保持不变。',
        answer: true,
        explanation:
          'Wq 是 [d, h 乘 d_head]（保持不变），Wk、Wv 是 [d, g 乘 d_head]（变小），Wo 是 [h 乘 d_head, d] = [d, d]（保持不变）。所以 GQA 只省 K/V 的投影参数与缓存，输出投影不受影响。',
        relatedLessonId: 'llm-a3-c4-l4',
        tags: ['GQA', '参数量'],
      },
      {
        id: 'llm-a3-c4-e10',
        type: 'multiple',
        difficulty: 4,
        question: '为什么长上下文推理中 KV Cache 会成为瓶颈？（多选）',
        options: [
          { value: 'A', text: '显存占用随序列长度线性增长' },
          { value: 'B', text: '每生成一个 token 都要把整段 KV 从显存读入，带宽受限' },
          { value: 'C', text: 'KV Cache 会随着时间被重新计算' },
          { value: 'D', text: 'KV Cache 占满显存后，能同时服务的请求数下降，吞吐骤降' },
        ],
        answer: ['A', 'B', 'D'],
        explanation:
          'C 错：KV Cache 的目的正是不重算。A 是显存维度、B 是带宽维度、D 是系统维度——三条共同解释了"长上下文又慢又贵"。',
        relatedLessonId: 'llm-a3-c4-l1',
        tags: ['KV Cache', '性能'],
      },
      {
        id: 'llm-a3-c4-e11',
        type: 'code',
        difficulty: 4,
        question:
          '计算**注意力参数量**在 MHA / GQA / MQA 下的对比（无 bias）。\n\n要求：\n- `attn_params(d, h, g)`：返回 Wq、Wk、Wv、Wo 的参数量之和，其中 d_head = d // h；\n- 计算 d = 4096、h = 32 时 g = 32、8、1 三种情况的参数量；\n- `saved_ratio`：g = 8 相对 g = 32 的减少比例（保留 4 位小数）。',
        starterCode: `def attn_params(d, h, g):
    dh = d // h
    q = ___
    k = ___
    v = ___
    o = ___
    return q + k + v + o

d, h = 4096, 32
p_mha = attn_params(d, h, 32)
p_gqa = attn_params(d, h, 8)
p_mqa = attn_params(d, h, 1)
saved_ratio = ___
`,
        setupCode: '',
        expectedOutput: 'MHA 67108864，GQA 41943040，MQA 34603008，减少 37.5%',
        tests: `assert p_mha == 4 * 4096 * 4096, f"MHA 参数量应为 67,108,864，实际 {p_mha}"
assert p_gqa == 41943040, f"GQA(8 组) 参数量应为 41,943,040，实际 {p_gqa}"
assert p_mqa == 34603008, f"MQA 参数量应为 34,603,008，实际 {p_mqa}"
assert abs(saved_ratio - 0.375) < 1e-6, f"减少比例应为 0.375，实际 {saved_ratio}"
assert p_mha > p_gqa > p_mqa, "参数量应随组数递减"
assert attn_params(4096, 32, 16) == 50331648, "g=16 时参数应为 50,331,648"
`,
        answer: `def attn_params(d, h, g):
    dh = d // h
    q = d * h * dh
    k = d * g * dh
    v = d * g * dh
    o = h * dh * d
    return q + k + v + o

d, h = 4096, 32
p_mha = attn_params(d, h, 32)
p_gqa = attn_params(d, h, 8)
p_mqa = attn_params(d, h, 1)
saved_ratio = round(1 - p_gqa / p_mha, 4)
saved_ratio
`,
        explanation:
          'Q 与 O 固定为 d 乘 d 各一份（共 2d^2），K 与 V 各为 d 乘 g 乘 dh = g 乘 d 乘 d 的一半？精确算：g 乘以 d_head 乘以 d，当 g = 8、d_head = 128、d = 4096 时是 4096 乘 1024 = 4,194,304，两份共 8,388,608，加上 2 乘 16,777,216 = 33,554,432，得 41,943,040。相对 MHA 的 67,108,864 减少 37.5%。',
        relatedLessonId: 'llm-a3-c4-l4',
        tags: ['GQA', '参数量', '估算'],
      },
      {
        id: 'llm-a3-c4-e12',
        type: 'single',
        difficulty: 4,
        question: '在 numpy 中实现 GQA 时，用 `np.repeat(K, h // g, axis=1)` 把 K 从 g 份复制成 h 份。这个做法的评价是？',
        options: [
          { value: 'A', text: '既正确又高效，推荐在生产中使用' },
          { value: 'B', text: '逻辑正确但会真正复制显存；生产 kernel 应按组索引读取，避免浪费' },
          { value: 'C', text: '逻辑错误，会改变注意力分布' },
          { value: 'D', text: '必须先把 K 转置才能 repeat' },
        ],
        answer: 'B',
        explanation:
          '数学上 np.repeat 的结果与"按组共享"完全等价，所以逻辑正确。但它真的申请了 h 份内存，用在前向的计算图里尚可（训练时本来就允许临时张量），若用在 KV Cache 存储上就完全抵消了 GQA 的收益。真正的 kernel 会按 `head_idx * g // h` 直接索引对应的 K/V 块。',
        relatedLessonId: 'llm-a3-c4-l2',
        tags: ['GQA', '实现', '性能'],
      },
      {
        id: 'llm-a3-c4-e13',
        type: 'code',
        difficulty: 4,
        question:
          '计算**给定显存预算下能支持的最大并发数**。\n\n参数：模型权重 13.4 GiB，显存 24 GiB，预留 2 GiB 给激活与框架，序列长度 8192，每 token KV 元素数由 `L=32, g=8, dh=128` 决定，fp16。\n\n要求：\n- `per_req_gib`：每个请求在 8192 上下文下的 KV 显存（保留 4 位小数）；\n- `max_conc`：最多并发几个请求（整数，向下取整）；\n- `max_conc_mha`：若改用 MHA（g=32）时的并发数。',
        starterCode: `L, g, dh, seq = 32, 8, 128, 8192
weights_gib = 13.4
total_gib = 24.0
reserve_gib = 2.0

per_token_elems = L * 2 * g * dh
per_req_gib = round(seq * per_token_elems * 2 / 1024 ** 3, 4)
free_gib = ___
max_conc = ___
per_req_mha = ___
max_conc_mha = ___
`,
        setupCode: '',
        expectedOutput: 'GQA 每请求约 1.0 GiB，可并发 8；MHA 每请求 4 GiB，只能并发 1',
        tests: `assert per_token_elems == 65536, f"每 token 元素数应为 65536，实际 {per_token_elems}"
assert abs(per_req_gib - 1.0) < 1e-6, f"每请求 KV 应约 1.0 GiB，实际 {per_req_gib}"
assert abs(free_gib - 8.6) < 1e-6, f"可用显存应为 8.6 GiB，实际 {free_gib}"
assert max_conc == 8, f"GQA 下最大并发应为 8，实际 {max_conc}"
assert max_conc_mha == 2, f"MHA 下最大并发应为 2，实际 {max_conc_mha}"
assert max_conc >= 4 * max_conc_mha, "GQA 的并发数应至少是 MHA 的 4 倍"
`,
        answer: `L, g, dh, seq = 32, 8, 128, 8192
weights_gib = 13.4
total_gib = 24.0
reserve_gib = 2.0

per_token_elems = L * 2 * g * dh
per_req_gib = round(seq * per_token_elems * 2 / 1024 ** 3, 4)
free_gib = round(total_gib - weights_gib - reserve_gib, 4)
max_conc = int(free_gib // per_req_gib)
per_req_mha = round(seq * (L * 2 * 32 * dh) * 2 / 1024 ** 3, 4)
max_conc_mha = int(free_gib // per_req_mha)
max_conc
`,
        explanation:
          '每 token 65536 元素 = 128 KiB，8192 token 恰好 1 GiB；MHA 是 4 GiB。可用显存 24 - 13.4 - 2 = 8.6 GiB，GQA 能跑 8 个并发，MHA 只能跑 2 个（8.6 // 4 = 2）。**同样硬件、同样模型，只是 KV 组数的差别，吞吐差 4 倍**——这就是 GQA 在推理服务中的真实价值。',
        relatedLessonId: 'llm-a3-c4-l1',
        tags: ['GQA', '并发', '显存'],
      },
      {
        id: 'llm-a3-c4-e14',
        type: 'judge',
        difficulty: 4,
        question: 'GQA 的因果掩码与 MHA 相同，都是 [n, n] 的上三角结构。',
        answer: true,
        explanation:
          '因果掩码由"不能看未来"这一约束决定，与头数、组数无关。它作用于 [B, h, n, n] 的最后两维，会自动广播。GQA 改变的只是 K/V 的份数，不改变可见性。',
        relatedLessonId: 'llm-a3-c4-l4',
        tags: ['GQA', '因果掩码'],
      },
      {
        id: 'llm-a3-c4-e15',
        type: 'single',
        difficulty: 3,
        question: 'LLaMA-2 7B 使用 MHA（32 组），而 LLaMA-3 8B 改用 8 组 GQA。两者层数与 d_model 相同，直接后果是？',
        options: [
          { value: 'A', text: 'LLaMA-3 8B 的训练速度快了 4 倍' },
          { value: 'B', text: 'LLaMA-3 8B 的 KV Cache 降为 1/4，长上下文部署成本大幅下降' },
          { value: 'C', text: 'LLaMA-3 8B 的模型质量下降了 4 倍' },
          { value: 'D', text: 'LLaMA-3 8B 不再需要位置编码' },
        ],
        answer: 'B',
        explanation:
          'GQA 不影响训练 FLOPs（A 错），质量也几乎不降（C 错），位置编码照旧使用 RoPE（D 错）。唯一确定的直接后果是推理时 KV Cache 与解码带宽都降为 1/4。',
        relatedLessonId: 'llm-a3-c4-l3',
        tags: ['GQA', 'LLaMA-3'],
      },
      {
        id: 'llm-a3-c4-e16',
        type: 'fill',
        difficulty: 4,
        question: 'GQA 里第 i 个 Query 头（i 从 0 开始）对应的 KV 组下标是 floor(i 乘以 g 除以 h)。当 h = 32、g = 8 时，第 13 个 Q 头对应的组下标是 ___。',
        blanks: [['3']],
        explanation:
          '13 乘 8 除以 32 = 3.25，向下取整为 3。也就是说 Q 头 12 到 15 共享第 3 组 K/V。这个映射决定了 repeat 与索引的实现方式，写反（用 i 乘 h 除以 g）会导致越界或完全错误的配对。',
        relatedLessonId: 'llm-a3-c4-l2',
        tags: ['GQA', '分组映射'],
      },
      {
        id: 'llm-a3-c4-e17',
        type: 'code',
        difficulty: 3,
        question:
          '实现**GQA 的分组映射**并验证广播实现与循环实现等价。\n\n要求：\n- `group_of_head(i, h, g)`：返回第 i 个 Q 头对应的 KV 组下标；\n- `mapping`：h = 32、g = 8 时全部 32 个头的映射列表；\n- `same`：判断 `np.repeat` 广播的 K（形状 [h, n, dh]）与"按映射循环拼出的 K"是否完全一致。',
        starterCode: `import numpy as np

def group_of_head(i, h, g):
    return ___

h, g, n, dh = 32, 8, 4, 3
mapping = [___ for i in range(h)]

rng = np.random.default_rng(0)
K = rng.normal(size=(g, n, dh))
K_rep = np.repeat(K, h // g, axis=0)
K_loop = np.stack([___ for i in range(h)])
same = ___
`,
        setupCode: '',
        expectedOutput: '每组 4 个头共享 1 组 KV，两种构造方式完全一致',
        tests: `assert group_of_head(0, 32, 8) == 0 and group_of_head(3, 32, 8) == 0, "前 4 个头应属于第 0 组"
assert group_of_head(4, 32, 8) == 1, "第 4 个头应属于第 1 组"
assert group_of_head(31, 32, 8) == 7, "最后一个头应属于最后一组"
assert len(mapping) == 32 and mapping[0] == 0 and mapping[-1] == 7, f"映射长度或取值不正确：{mapping[:8]}"
assert mapping == sorted(mapping), "映射应单调不减"
assert same is True, "广播实现与循环实现应完全一致"
assert K_rep.shape == (32, 4, 3), f"广播后形状应为 (32, 4, 3)，实际 {K_rep.shape}"
`,
        answer: `import numpy as np

def group_of_head(i, h, g):
    return i * g // h

h, g, n, dh = 32, 8, 4, 3
mapping = [group_of_head(i, h, g) for i in range(h)]

rng = np.random.default_rng(0)
K = rng.normal(size=(g, n, dh))
K_rep = np.repeat(K, h // g, axis=0)
K_loop = np.stack([K[group_of_head(i, h, g)] for i in range(h)])
same = bool(np.allclose(K_rep, K_loop))
same
`,
        explanation:
          '`i * g // h` 是 GQA 分组的标准写法：它把连续的头切成 g 段，每段 h/g 个头共享一组 K/V。用 `np.repeat(..., h // g)` 与这个映射在做第一维时完全等价——注意 repeat 是**沿着头维重复整块**，不是逐个元素重复，所以这里的 axis 与 repeat 次数必须配对好。生产 kernel 用映射直接索引，避免复制。',
        relatedLessonId: 'llm-a3-c4-l4',
        tags: ['GQA', '映射', 'numpy'],
      },
      {
        id: 'llm-a3-c4-e18',
        type: 'open',
        difficulty: 5,
        question:
          '某团队要在一张 80G 显卡上部署一个 7B 模型（fp16 权重 14 GiB），要求支持 32K 上下文与尽可能高的并发。请给出显存账本，并比较 MHA（32 组）与 GQA（8 组）两种方案，说明你推荐哪一个以及还有哪些优化手段。',
        referenceAnswer: `**一、显存账本（fp16、单 token KV）**

1. 每 token KV 元素 = L 乘 2 乘 g 乘 d_head：
   - MHA(g=32)：32 乘 2 乘 32 乘 128 = 262,144 元素 = 512 KiB/token
   - GQA(g=8)：65,536 元素 = 128 KiB/token
2. 32K 上下文单请求：
   - MHA：32768 乘 512 KiB = 16 GiB
   - GQA：32768 乘 128 KiB = 4 GiB
3. 可用显存 = 80 - 14（权重）- 4（激活/框架预留）约等于 62 GiB
4. 最大并发：
   - MHA：62 // 16 = 3
   - GQA：62 // 4 = 15

**二、结论**

在 32K 上下文约束下 GQA 的并发数是 MHA 的近 5 倍，且质量损失很小（论文显示用约 5% 算力从 MHA 继续训练即可）。**推荐 GQA(g=8)**；如果上下文只需 8K，两者差距会缩小（MHA 的 4 GiB vs GQA 的 1 GiB），但 GQA 仍然更优。

**三、进一步优化**

1. **PagedAttention**：按页分配 KV，消除碎片（可回收 30%~60% 显存）；
2. **KV Cache 量化**：fp8 或 int8 存储，显存再减半，需要注意力 kernel 支持反量化；
3. **前缀缓存 / 共享前缀**：系统提示与 few-shot 前缀只存一份，多个请求共享（radix cache）；
4. **更小分组或 MLA**：如 g=4 或 DeepSeek 的 MLA，进一步压缩 KV；
5. **推测解码 / 连续批处理**：提升 GPU 利用率，让"显存够了但算力闲置"的问题缓解；
6. **长上下文分层策略**：滑动窗口注意力或只对部分层使用全注意力。

**四、风险提示**

1. 并发数只是理论上限，实际还受带宽限制（每步要读全部权重与 KV），应按实测吞吐而不是并发上限来评估；
2. 需要压测长请求与短请求混合的分布，避免短请求被长请求"饿死"（调度策略需要考虑公平性）。`,
        rubric: [
          { point: '正确写出每 token KV 公式并算出 512 KiB / 128 KiB', score: 2 },
          { point: '算出 32K 单请求显存与最大并发数', score: 2 },
          { point: '给出 GQA 的推荐结论与理由', score: 1 },
          { point: '补充 PagedAttention、量化、前缀缓存等优化手段', score: 1 },
        ],
        keywords: ['512 KiB', '16 GiB', '4 GiB', '并发', 'GQA', 'PagedAttention', '前缀缓存', '量化'],
        explanation:
          '这类题得分点在于"账本算得对"与"结论有取舍"。只喊 GQA 好而不给数字的回答说服力不足；能同时指出带宽限制与调度公平性的回答更完整。',
        tags: ['GQA', '显存策划', '部署'],
      },
      {
        id: 'llm-a3-c4-e19',
        type: 'single',
        difficulty: 4,
        question: '关于 DeepSeek 的 MLA（Multi-head Latent Attention），与 GQA 相比最本质的差别是？',
        options: [
          { value: 'A', text: 'MLA 用低维潜在向量压缩 K/V，需要时再重建，缓存的是压缩表示' },
          { value: 'B', text: 'MLA 把所有头合并成一个头' },
          { value: 'C', text: 'MLA 不使用 RoPE' },
          { value: 'D', text: 'MLA 的 KV Cache 比 MHA 更大' },
        ],
        answer: 'A',
        explanation:
          'GQA 是"减少 K/V 的份数"，MLA 是"把 K/V 压缩到一个低维 latent 再上投影重建"。MLA 缓存的是压缩表示，显存收益更大，但需要额外处理与 RoPE 的兼容（例如对 K 单独保留一部分维度放 RoPE）。B、C、D 都不准确。',
        relatedLessonId: 'llm-a3-c4-l3',
        tags: ['MLA', 'GQA', '前沿'],
      },
      {
        id: 'llm-a3-c4-e20',
        type: 'judge',
        difficulty: 3,
        question: '使用 KV Cache 会改变模型输出，因为它缓存的是近似值。',
        answer: false,
        explanation:
          'KV Cache 缓存的是精确计算出的 K、V 张量，推理结果与"每步重算全部 K/V"在数学上完全等价（只有浮点累加顺序带来的可忽略差异）。它不是近似方法——这一点与"投机解码""低精度推理"等近似手段不同。',
        relatedLessonId: 'llm-a3-c4-l1',
        tags: ['KV Cache', '正确性'],
      },
      {
        id: 'llm-a3-c4-e21',
        type: 'fill',
        difficulty: 4,
        question: '批量生成时的 KV Cache 总显存与 batch 成正比。若单请求 4K 上下文占用 0.5 GiB，要同时服务 16 个请求，需要 KV Cache ___ GiB（填数字）。',
        blanks: [['8', '8.0']],
        explanation:
          '0.5 乘 16 = 8 GiB。这个数字在 80G 卡上只占 1/10，但在 24G 消费级卡上已经超过权重的一半，直接决定能否上线。做容量规划时，KV Cache 应当是第一个被计算的量。',
        relatedLessonId: 'llm-a3-c4-l1',
        tags: ['KV Cache', '并发'],
      },
      {
        id: 'llm-a3-c4-e22',
        type: 'code',
        difficulty: 4,
        question:
          '实现 **KV Cache 的增量解码模拟**：只缓存 g 组 KV，逐步追加新 token。\n\n要求：\n- 初始缓存 `K_cache` 与 `V_cache` 形状均为 [g, 0, dh]；\n- 每个新 token 的 k、v 形状为 [g, 1, dh]，追加到缓存末尾；\n- 循环 5 步后，缓存形状应为 [g, 5, dh]；\n- `cache_elems`：最终 K 与 V 缓存的元素总数（等于 2 乘 g 乘 5 乘 dh）。',
        starterCode: `import numpy as np

g, dh, steps = 2, 4, 5
rng = np.random.default_rng(0)

K_cache = np.zeros((g, 0, dh))
V_cache = np.zeros((g, 0, dh))

for t in range(steps):
    k = rng.normal(size=(g, 1, dh))
    v = rng.normal(size=(g, 1, dh))
    K_cache = ___
    V_cache = ___

cache_elems = ___
`,
        setupCode: '',
        expectedOutput: '缓存形状 (2, 5, 4)，元素总数 80',
        tests: `assert K_cache.shape == (2, 5, 4), f"K 缓存形状应为 (2, 5, 4)，实际 {K_cache.shape}"
assert V_cache.shape == (2, 5, 4), "V 缓存形状应与 K 一致"
assert cache_elems == 80, f"元素总数应为 80，实际 {cache_elems}"
assert np.allclose(K_cache[:, 0], K_cache[:, 0]), "缓存内容应可正常读取"
assert not np.allclose(K_cache[:, 0], K_cache[:, 4]), "不同步骤的缓存内容应不同"
`,
        answer: `import numpy as np

g, dh, steps = 2, 4, 5
rng = np.random.default_rng(0)

K_cache = np.zeros((g, 0, dh))
V_cache = np.zeros((g, 0, dh))

for t in range(steps):
    k = rng.normal(size=(g, 1, dh))
    v = rng.normal(size=(g, 1, dh))
    K_cache = np.concatenate([K_cache, k], axis=1)
    V_cache = np.concatenate([V_cache, v], axis=1)

cache_elems = K_cache.size + V_cache.size
cache_elems
`,
        explanation:
          '沿 seq 维（axis=1）拼接是 KV Cache 的本质。真实实现不会用 concatenate（每次都重新分配内存），而是预分配一个 [g, max_seq, dh] 的连续缓冲并用 `cache[:, pos:pos+1] = k` 写入，这样才高效。理解这个"逻辑上追加、物理上覆盖"的差别，是从教学代码走向工程实现的关键一步。',
        relatedLessonId: 'llm-a3-c4-l4',
        tags: ['KV Cache', '增量解码', 'numpy'],
      },
      {
        id: 'llm-a3-c4-e23',
        type: 'multiple',
        difficulty: 4,
        question: '下列哪些手段能降低推理时的 KV Cache 显存？（多选）',
        options: [
          { value: 'A', text: '把 MHA 改成 GQA 或 MQA' },
          { value: 'B', text: '使用 PagedAttention 按页管理缓存' },
          { value: 'C', text: '把 KV Cache 量化为 fp8 / int8' },
          { value: 'D', text: '增大 FFN 的中间维 d_ff' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 会增大权重显存，与 KV Cache 无关（KV Cache 只来自注意力的 K/V）。A 减少份数、B 减少碎片浪费、C 减少每元素字节数，三条是长上下文部署的常规组合拳。',
        relatedLessonId: 'llm-a3-c4-l3',
        tags: ['KV Cache', '优化'],
      },
      {
        id: 'llm-a3-c4-e24',
        type: 'single',
        difficulty: 4,
        question: '把已有 MHA 模型直接改造成 GQA 结构后不做任何继续训练，最可能的结果是？',
        options: [
          { value: 'A', text: '效果完全不变，因为 K/V 只是被"共享"了' },
          { value: 'B', text: '效果明显变差，因为 K/V 投影矩阵被重新初始化或平均池化，需要继续训练适配' },
          { value: 'C', text: '训练速度变快 4 倍' },
          { value: 'D', text: '模型参数量增加' },
        ],
        answer: 'B',
        explanation:
          'GQA 论文的做法是用"组内 Query 头投影矩阵求均值"来初始化 K/V 投影，再做约 5% 原训练步数的继续训练。完全不训练就上线，会因 K/V 表示与 Q 头不匹配而明显掉点。这也是"结构改造必须配继续训练"的典型案例。',
        relatedLessonId: 'llm-a3-c4-l2',
        tags: ['GQA', '迁移', '继续训练'],
      },
      {
        id: 'llm-a3-c4-e25',
        type: 'code',
        difficulty: 4,
        question:
          '比较 **MHA 与 GQA 在解码阶段的每步访存字节数**（只计 KV 读取），理解为什么 GQA 更快。\n\n参数：L = 32、g 组、d_head = 128、fp16、上下文长度 4096。\n\n要求：\n- `bytes_per_step(g)`：每生成 1 个 token 需读取的 KV 字节数 = 2 乘 L 乘 4096 乘 g 乘 128 乘 2；\n- `mha_bytes`、`gqa_bytes`：g = 32 与 g = 8 时的值（保存为 Python int）；\n- `speedup`：两者之比（保留 2 位小数）。',
        starterCode: `L, dh, ctx, nbytes = 32, 128, 4096, 2

def bytes_per_step(g):
    return ___

mha_bytes = int(bytes_per_step(32))
gqa_bytes = int(bytes_per_step(8))
speedup = round(mha_bytes / gqa_bytes, 2)
`,
        setupCode: '',
        expectedOutput: 'MHA 每步读 16 GiB，GQA 每步读 4 GiB，理论带宽收益 4 倍',
        tests: `assert int(bytes_per_step(1)) == 2 * 32 * 4096 * 1 * 128 * 2, "单组时应为 67,108,864 字节"
assert mha_bytes == 2 * 32 * 4096 * 32 * 128 * 2, f"MHA 每步应读 2,147,483,648 字节，实际 {mha_bytes}"
assert gqa_bytes == 536870912, f"GQA 每步应读 536,870,912 字节，实际 {gqa_bytes}"
assert speedup == 4.0, f"读带宽应相差 4 倍，实际 {speedup}"
assert int(bytes_per_step(8)) * 4 == int(bytes_per_step(32)), "字节数应与组数严格成正比"
`,
        answer: `L, dh, ctx, nbytes = 32, 128, 4096, 2

def bytes_per_step(g):
    return 2 * L * ctx * g * dh * nbytes

mha_bytes = int(bytes_per_step(32))
gqa_bytes = int(bytes_per_step(8))
speedup = round(mha_bytes / gqa_bytes, 2)
speedup
`,
        explanation:
          'MHA 每步要读 2 GiB？实际是 2,147,483,648 字节 = 2 GiB（乘了 32 组后是 2^31）。GQA 是 0.5 GiB。每生成一个 token 就要把整段历史 KV 从 HBM 读一遍，这一步完全是带宽受限的；把读取量降为 1/4，解码速度上限也就提高了约 4 倍。**注意这是"上限"**：实际还有权重读取与计算开销，端到端通常看到 1.5 到 3 倍提升。',
        relatedLessonId: 'llm-a3-c4-l4',
        tags: ['GQA', '带宽', '性能'],
      },
      {
        id: 'llm-a3-c4-e26',
        type: 'judge',
        difficulty: 4,
        question: '在同样的显存与模型参数下，GQA 主要提升的是"单请求的生成速度"，而不是"并发数"。',
        answer: false,
        explanation:
          '两者都有提升，但**更显著的是并发数**：KV Cache 占用降为 1/g，意味着同样显存能容纳 g 倍的请求。单请求速度的提升受限于权重读取等固定开销，通常远小于 g 倍。对推理服务而言，并发数直接决定单位成本。',
        relatedLessonId: 'llm-a3-c4-l1',
        tags: ['GQA', '性能', '并发'],
      },
    ],
  },
  ...llmA3Extra,
];
