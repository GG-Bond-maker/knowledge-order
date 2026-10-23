import type { Chapter } from '../../types';

/* ============================================================
 *  《大模型训练原理》第 2~5 章
 *  参考：Deep Learning (Goodfellow) Ch.6/8、CS231n、Adam 论文、
 *       Attention Is All You Need（warmup 策略）、Chinchilla
 * ============================================================ */

export const llmA2Extra: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2：反向传播
   * ============================================================ */
  {
    id: 'llm-a2-c2',
    title: '反向传播：梯度是怎么算出来的',
    goal: '理解计算图与链式法则，能手推简单网络的梯度，并明白「梯度消失 / 梯度爆炸」的成因与对策。',
    lessons: [
      {
        id: 'llm-a2-c2-l1',
        title: '计算图与链式法则',
        content: `
## 学习目标

学完本节，你应该能够：
1. 把复合函数的计算画成计算图，并在图上手动执行前向/反向；
2. 用链式法则推导两个及以上变量复合的梯度，理解"反向模式"为何对深度网络高效；
3. 说出自动微分（autograd）与符号微分、数值微分的区别。

## 前置知识

- 基本求导法则（乘法法则、复合函数求导 $\\frac{dy}{dx} = \\frac{dy}{du}\\frac{du}{dx}$）；
- 上一节的交叉熵梯度 $\\partial\\mathcal{L}/\\partial z = p - \\mathrm{onehot}$（反向传播的起点站）。

## 问题背景：亿级参数的梯度从哪来

训练 = 对每个参数求"损失对我多敏感"（偏导），再往反方向挪一点。一个 GPT-2 就有 1.24 亿个参数——**不可能手推 1.24 亿个导数公式**。反向传播（backpropagation）的洞见：把计算组织成图，**一次反向扫描同时得出全部参数的梯度**，代价只是前向的两倍左右。它是整个深度学习能成立的地基（Rumelhart, Hinton & Williams, 1986 让它 mainstream）。

## 直觉理解：账单逐级分摊

工厂（损失）要追溯成本（梯度）到每个车间（中间量）、每台设备（参数）：
- **前向**：原料加工成产品，每个车间记下自己的用量账（局部导数）；
- **反向**：财务从总账（dL/dL=1）出发，把"责任"逐级按用量比例分摊回每个设备——**每台设备收到的那份账，就是它的梯度**。

关键效率点：每个车间只被"结算"一次，不管它下游通向多少设备——这就是反向模式对"多参数、单输出"的损失函数天然高效的原因。

## 核心概念：计算图与链式法则

把 $f(x, y) = (x \\cdot y) + \\max(x \\cdot y, 0)$... 取经典例子 $f = (x+y) \\cdot (x \\cdot y)$... 用更贴近本课程的例子（带激活的线性层单步）：

$$z = w \\cdot x + b, \\quad a = \\mathrm{ReLU}(z), \\quad \\mathcal{L} = -a$$

计算图：$x, w, b \\to z \\to a \\to \\mathcal{L}$。链式法则沿边回传：

$$\\frac{\\partial\\mathcal{L}}{\\partial w} = \\frac{\\partial\\mathcal{L}}{\\partial a}\\cdot\\frac{\\partial a}{\\partial z}\\cdot\\frac{\\partial z}{\\partial w}$$

**多路径相加**：若一个变量经多条路径影响损失（如残差连接的 $x$），梯度 = 各路径分摊之和——这就是 ResNet 梯度直通车 $\\partial y/\\partial x = 1 + \\partial F/\\partial x$ 的来历（llm-a1 c2-l4）。

## 原理详解：手算一遍上面的三层图

设 $x = 2,\\ w = 3,\\ b = 1$：前向 $z = 7 \\to a = 7 \\to \\mathcal{L} = -7$。
反向逐边：
1. $\\partial\\mathcal{L}/\\partial a = -1$（总账）
2. $\\partial a/\\partial z = \\mathbb{1}[z>0] = 1$（ReLU 局部导数）→ $\\partial\\mathcal{L}/\\partial z = -1$
3. $\\partial z/\\partial w = x = 2$，$\\partial z/\\partial x = w = 3$，$\\partial z/\\partial b = 1$

汇总：$\\partial\\mathcal{L}/\\partial w = -1 \\times 1 \\times 2 = -2$；$\\partial\\mathcal{L}/\\partial x = -3$；$\\partial\\mathcal{L}/\\partial b = -1$。
**梯度为负 = 增大该参数能降低损失**——SGD 一行 $w \\leftarrow w - \\eta \\cdot \\partial\\mathcal{L}/\\partial w = 3 - \\eta(-2)$ 就完成一次学习。

## 代码实践

\`\`\`python
import torch

x = torch.tensor(2.0, requires_grad=True)
w = torch.tensor(3.0, requires_grad=True)
b = torch.tensor(1.0, requires_grad=True)
z = w * x + b
a = torch.relu(z)
loss = -a
loss.backward()                      # 一次反向，全部梯度到账
print(w.grad, x.grad, b.grad)        # tensor(-2.) tensor(-3.) tensor(-1.)
\`\`\`

预期输出与手算完全一致（-2, -3, -1）。autograd 做的就是"前向记图 + 反向沿图分摊"。**常见错误**：忘记 \`requires_grad=True\`（参数不记账）；对非标量调用 backward（须先 sum 成标量）；反向后重复使用旧图（默认图即释放，需 \`retain_graph=True\`）。

## 常见误区

1. **反向传播是一种"求导公式"**——它是**链式法则的执行顺序**（反向模式自动微分）；数学上毫无新东西，价值全在计算组织。
2. **数值微分可以替代**——中心差分 $(f(x+h)-f(x-h))/2h$ 对 1.24 亿参数要 2.5 亿次前向，且截断/舍入误差双重夹击；反向模式一次搞定且精确。
3. **梯度是"属性"不是"事件"**——梯度只在当前这批数据、当前参数下有意义；下次前向后一切重算。
4. **忽视计算图的生命周期**——PyTorch 动态图每次前向重建，反向即焚；这正是"训练循环 = 前向、反向、更新"三拍子的原因。

## 知识关联

- **向前**：上一节交叉熵的 $p - \\mathrm{onehot}$ 是反向传播从损失出发的第一段路；
- **向后**：下一节梯度消失/爆炸 = 链式法则连乘的病态；c3 梯度下降用本节产物决定"怎么走"；
- **课程间**：llm-a1 的残差直通车、本课 c7 混合精度的 loss scaling 都是对本节机制的运用。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 本质 | 链式法则的反向模式执行：一次反向，全参数梯度 |
| 复杂度 | 前向的常数倍（约 2 倍），与参数量无关地高效 |
| 多路径 | 梯度沿各路径分摊再求和（残差的 1+∂F/∂x） |
| 工程 | 前向记图、反向分摊、图即焚；数值微分不可替代 |

## 参考资料

> **来源类型：学术来源**
> - Rumelhart, D. E., Hinton, G. E., & Williams, R. J. (1986). "Learning Representations by Back-propagating Errors." *Nature*, 323, 533–536——反向传播的奠基论文。
> - Baydin, A. G., et al. (2018). "Automatic Differentiation in Machine Learning: a Survey." *JMLR*, 18(153)——自动微分模式与数值/符号微分的系统对比。
>
> **来源类型：权威教材**
> - Goodfellow, Bengio, & Courville, *Deep Learning*（MIT Press, 2016），§6.5——反向传播教科书推导（官网免费全文）。
> - Stanford CS231n 课程讲义 "Backpropagation, Intuitions"（cs231n.github.io）——本节手算风格的标准参考。
>
> **来源类型：原创**
> - 账单分摊比喻与三层图手算为本课程改编。
`,
        tips: [
          {
            kind: 'interview',
            text: '被问「反向传播为什么高效」，答：一次前向 + 一次反向即可得到所有参数梯度（反向模式自动微分），成本约 3 倍前向。',
          },
          {
            kind: 'pitfall',
            text: '反向传播必须缓存前向的中间激活值，这是训练显存远大于推理的根本原因。梯度检查点（Gradient Checkpointing）就是拿计算换显存。',
          },
          {
            kind: 'note',
            text: '反向模式自动微分只对「标量输出」友好。如果损失是多维张量，框架最终也是把它归约成标量再反传。',
          },
        ],
        demos: [
          {
            title: '手写一个极简自动微分',
            lang: 'python',
            code: `class Var:
    def __init__(self, v, name=''):
        self.v = v
        self.name = name
        self.grad = 0.0

    def __add__(self, o):
        o = o if isinstance(o, Var) else Var(o)
        out = Var(self.v + o.v)
        def back(g):
            self.grad += g
            o.grad += g
        out.back = back
        return out

    def __mul__(self, o):
        o = o if isinstance(o, Var) else Var(o)
        out = Var(self.v * o.v)
        def back(g):
            self.grad += g * o.v
            o.grad += g * self.v
        out.back = back
        return out

x, y, w = Var(2.0, 'x'), Var(3.0, 'y'), Var(4.0, 'w')
a = x + y
z = a * w
print(f"z = (x+y)*w = ({x.v}+{y.v})*{w.v} = {z.v}")

# 反向
z.back(1.0)
a.back(z.grad)
print(f"dz/dx = {x.grad}  (应为 w = 4)")
print(f"dz/dy = {y.grad}  (应为 w = 4)")
print(f"dz/dw = {w.grad}  (应为 x+y = 5)")`,
          },
        ],
      },
      {
        id: 'llm-a2-c2-l2',
        title: '梯度消失与梯度爆炸',
        content: `
## 学习目标

学完本节，你应该能够：
1. 用链式法则连乘推导梯度消失（连乘小数）与爆炸（连乘大数）；
2. 说明 Sigmoid 为何是消失重灾区、ReLU/残差/合理初始化各自的解法；
3. 用 numpy 复现梯度随层数指数衰减的实验并读懂输出。

## 前置知识

- 上一节的链式法则与"多路径分摊"；
- 指数函数的直觉（0.5 连乘 20 次 ≈ 百万分之一）。

## 问题背景：深度网络的"神经衰弱"

反向传播 = 梯度逐层连乘局部导数。若每层的局部导数平均是 0.5，过 20 层梯度缩到 $0.5^{20} \\approx 10^{-6}$——**底层参数几乎收不到学习信号**（它明明是最需要学基础特征的那批）。反之平均 1.5 则爆到 $1.5^{20} \\approx 3000$ 倍，一步跨出悬崖（loss 变 NaN）。这是 2010 年前深度学习"训不动"的头号病因，三副药（ReLU、初始化、残差）各自对症。

## 直觉理解：传话游戏与复印机

- **消失**：传话游戏，每人音量减半，传到 20 人时只剩气音——底层"听不清"损失在说什么；
- **爆炸**：老式复印机每次复印放大 50%，20 代后一张纸糊满整面墙——一步更新直接出局。

根源相同：**连乘对"平均偏离 1"极其敏感**，层数是放大器。

## 核心概念：三个病灶与三副药

**病灶一：激活函数饱和。** Sigmoid 导数 $\\sigma'(x) = \\sigma(x)(1-\\sigma(x))$，最大值仅 **0.25**（在 x=0 处），且远离 0 处趋 0——20 层 Sigmoid 网络的最坏连乘 $0.25^{20} = 10^{-12}$。
**药**：ReLU（$f'(z) = \\mathbb{1}[z>0]$，正区间导数恒 1，不衰减）。

**病灶二：初始化不当。** 权重全零/过大 → 前向激活与反向梯度的方差逐层失控。Glorot & Bengio（2010）推导出保持方差稳定的条件，Xavier 初始化 $\\mathrm{Var}(W) = 2/(\\text{fan}_{in} + \\text{fan}_{out})$（tanh 系）；He 初始化（ReLU 系）$\\mathrm{Var}(W) = 2/\\text{fan}_{in}$。
**药**：按激活函数选初始化——它是"出厂调音"，让每层局部导数的期望恰好在 1 附近。

**病灶三：路径太长且无保底。** 纯串联结构梯度只有"逐层传话"一条路。
**药**：残差连接 $y = x + F(x)$，给梯度一条 $\\partial y/\\partial x = 1 + \\partial F/\\partial x$ 的**高速公路**——连乘被加法打断，直通项保证信号不灭（Transformer 每个子层都这么包，llm-a1 c2-l4）。

## 原理详解：Xavier 条件的推导骨架

设第 $l$ 层 $z^l = W^l a^{l-1}$，$a^l = \\tanh(z^l)$，各分量独立零均值。要保持前向 $\\mathrm{Var}(a^l) = \\mathrm{Var}(a^{l-1})$ 与反向梯度同稳，需 $\\mathrm{Var}(W^l) = 2/(\\mathrm{fan}_{in}+\\mathrm{fan}_{out})$——两个约束（前向/反向）取几何平均的产物。直觉版：权重方差太大 → 激活方差逐层放大（前向爆炸=反向消失）；太小则镜像。**初始化就是让"连乘的期望恰为 1"**。完整推导见 Glorot & Bengio (2010) §4-5 或 CS231n 讲义。

## 完整案例：数值实验（本页可运行）

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)
d, L = 512, 20

for name, scale in [("sigmoid病态(小方差)", 0.4), ("合理初始化(≈1)", 1.0), ("病态(大方差)", 1.6)]:
    grad = np.ones(d)
    for _ in range(L):
        W = rng.normal(0, scale / np.sqrt(d), size=(d, d))
        grad = W.T @ grad            # 反向传播近似：梯度每层乘 W^T
        if name.startswith("sigmoid"):
            grad *= 0.25             # 叠加 sigmoid 饱和导数上界
    print(f"{name:18s} -> {L} 层后梯度范数 {np.linalg.norm(grad):.3e}")
\`\`\`

预期输出（seed=0 实测）：病态小方差 → 梯度范数约 2e-19（彻底消失）；合理初始化 → 量级 1~25（稳定）；病态大方差 → 约 3e+5（爆炸）。**同一结构、只改初始化尺度，梯度范数差约 24 个数量级**——初始化的重要性一目了然。**常见错误**：scale 没除以 $\\sqrt d$（方差随维度失控）；把爆炸当"学得快"（NaN 前奏）。

## 常见误区

1. **"梯度消失=梯度等于 0"**——是指数级缩小，浮点下溢前就已让底层学习停滞；
2. **ReLU 一劳永逸**——死 ReLU（恒负区间）是新的消失形态；大学习率下仍需梯度裁剪；
3. **初始化只是"技巧"**——它是方差不稳这一数学问题的解析解，与激活函数必须配套（tanh↔Xavier，ReLU↔He）；
4. **残差只是"性能技巧"**——它同时是梯度问题的一半答案：加法打破连乘。

## 知识关联

- **向前**：上一节链式法则的连乘是本节全部病因；llm-a1 的残差/LN 是结构性解药；
- **向后**：c3 梯度裁剪（爆炸的工程保险丝）、c4 Adam 对梯度尺度的自适应缓解；
- **课程间**：本课 c6/c7 的分布式与混合精度训练中，梯度再遇"通信截断/下溢"新病灶，解法（AllReduce 聚合、loss scaling）是同一思想的延续。

## 本节总结

| 病灶 | 症状 | 药 |
| --- | --- | --- |
| 激活饱和 | sigmoid 导数 ≤0.25 连乘 | ReLU/GELU（导数恒 1） |
| 初始化不当 | 方差逐层失控 | Xavier（tanh）/ He（ReLU） |
| 纯串联长路径 | 连乘无保底 | 残差 1+∂F/∂x 直通车 |

一句话：**连乘是放大器，层数是增益；初始化调零点，残差给旁路，激活选不衰的。**

## 参考资料

> **来源类型：学术来源**
> - Glorot, X., & Bengio, Y. (2010). "Understanding the Difficulty of Training Deep Feedforward Neural Networks." *AISTATS 2010*, PMLR 9:249–256（已核验）——Xavier 初始化与方差分析。
> - He, K., et al. (2015). "Delving Deep into Rectifiers..." *ICCV 2015*. arXiv:1502.01852——He 初始化。
> - Pascanu, R., Mikolov, T., & Bengio, Y. (2013). "On the Difficulty of Training Recurrent Neural Networks." *ICML 2013*——梯度爆炸/消失的分析与裁剪。
>
> **来源类型：参考资料**
> - Stanford CS231n 讲义 "Neural Networks 2: Initialization"（cs231n.github.io）。
>
> **来源类型：原创**
> - 传话/复印比喻与 numpy 数值实验为本课程改编。
`,
        tips: [
          {
            kind: 'interview',
            text: '「如何解决梯度消失」四板斧：换 ReLU/GELU、加残差连接、加归一化、合理初始化。大模型还要加梯度裁剪防爆炸。',
          },
          {
            kind: 'leak',
            text: '大模型训练必配梯度裁剪（max_norm=1.0）。没有它，一次异常 batch 就可能把模型训崩。',
          },
          {
            kind: 'performance',
            text: '监控每层梯度范数是排查训练问题最高效的手段。梯度范数突然飙升通常预示 loss spike 即将发生。',
          },
        ],
        demos: [
          {
            title: '梯度消失的直观演示',
            lang: 'python',
            code: `import numpy as np

def sigmoid(x):
    return 1 / (1 + np.exp(-x))

def sigmoid_grad(x):
    s = sigmoid(x)
    return s * (1 - s)

x = 0.0
print("sigmoid 在 x=0 处的导数:", sigmoid_grad(x), "(最大值的 0.25)")
print()
print("连乘 10 层后的梯度倍数:", 0.25 ** 10)
print("连乘 20 层后的梯度倍数:", 0.25 ** 20)
print()
print("换成 ReLU（正区间导数=1）：")
print("连乘 10 层:", 1.0 ** 10)
print("连乘 100 层:", 1.0 ** 100)
print()
print("结论：sigmoid 深网络必然梯度消失，ReLU 不会（但可能神经元死亡）")`,
          },
          {
            title: '梯度裁剪',
            lang: 'python',
            code: `import numpy as np

def clip_grad_norm(grads, max_norm=1.0):
    total = np.sqrt(sum((g ** 2).sum() for g in grads))
    if total > max_norm:
        scale = max_norm / (total + 1e-6)
        return [g * scale for g in grads], total, total * scale
    return grads, total, total

# 模拟一次梯度爆炸
grads = [np.random.randn(100, 100) * 50 for _ in range(3)]
raw_norm = np.sqrt(sum((g**2).sum() for g in grads))
print(f"裁剪前梯度范数: {raw_norm:.2f}")

clipped, before, after = clip_grad_norm(grads, max_norm=1.0)
print(f"裁剪后梯度范数: {after:.4f}")
print(f"缩放比例: {after/before:.6f}")
print()
print("梯度裁剪把所有参数的梯度按同一比例缩放，")
print("保持方向不变，只限制步长——这是大模型训练的标配。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a2-c2-e1',
        type: 'single',
        difficulty: 2,
        question: '反向传播的核心数学原理是？',
        options: [
          { value: 'A', text: '泰勒展开' },
          { value: 'B', text: '链式法则（复合函数求导）' },
          { value: 'C', text: '傅里叶变换' },
          { value: 'D', text: '矩阵求逆' },
        ],
        answer: 'B',
        explanation: '反向传播就是把链式法则系统地应用到计算图上：沿路径把局部梯度连乘，从输出逐层反传到输入。',
        tags: ['反向传播'],
      },
      {
        id: 'llm-a2-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: '反向传播一次就能得到所有参数的梯度。',
        answer: true,
        explanation: '这正是反向模式自动微分（Reverse-mode AD）的优势：一次前向 + 一次反向即可得到全部梯度，成本约 3 倍前向。',
        tags: ['反向传播'],
      },
      {
        id: 'llm-a2-c2-e3',
        type: 'single',
        difficulty: 2,
        question: 'sigmoid 函数的导数最大值是多少？',
        options: [
          { value: 'A', text: '1.0' },
          { value: 'B', text: '0.5' },
          { value: 'C', text: '0.25' },
          { value: 'D', text: '0.1' },
        ],
        answer: 'C',
        explanation: 'σ\'(x) = σ(x)(1-σ(x))，在 x=0 时 σ=0.5，导数为 0.5×0.5 = 0.25。多层连乘会迅速衰减到接近 0。',
        tags: ['梯度消失'],
      },
      {
        id: 'llm-a2-c2-e4',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些手段可以缓解梯度消失？（多选）',
        options: [
          { value: 'A', text: '把 sigmoid 换成 ReLU' },
          { value: 'B', text: '加入残差连接' },
          { value: 'C', text: '加入 LayerNorm' },
          { value: 'D', text: '把学习率调得很小' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 只是减小更新步长，不能解决梯度本身过小的问题（反而可能让训练更慢）。A/B/C 分别从激活函数、结构、归一化三个角度解决。',
        tags: ['梯度消失'],
      },
      {
        id: 'llm-a2-c2-e5',
        type: 'fill',
        difficulty: 3,
        question: '残差连接 y = x + F(x) 的梯度为 ∂y/∂x = 1 + ∂F/∂x，其中常数 1 保证了梯度可以___回传到浅层。（填两字）',
        blanks: [['直接', '无损', '短路']],
        explanation: '恒等路径使梯度至少为 1，不会因连乘而衰减到 0，这是训练上百层 Transformer 的关键。',
        tags: ['残差连接'],
      },
      {
        id: 'llm-a2-c2-e6',
        type: 'code',
        difficulty: 3,
        question: '实现梯度裁剪函数 `clip_by_global_norm(grads, max_norm)`：\n\n- `grads` 是一个 numpy 数组列表\n- 计算全局范数 `sqrt(sum(g²))`\n- 若超过 `max_norm`，所有梯度按同一比例缩放使范数等于 max_norm\n\n返回 `(clipped_grads, original_norm)`。',
        starterCode: `import numpy as np

def clip_by_global_norm(grads, max_norm=1.0):
    # 1. 求全局范数
    # 2. 超限则整体缩放
    ___

gs = [np.ones((2, 2)) * 10, np.ones((2, 2)) * 10]
clip_by_global_norm(gs, 1.0)
`,
        setupCode: '',
        expectedOutput: '(缩放后的梯度列表, 28.28)',
        tests: `import numpy as np
gs = [np.ones((2, 2)) * 10, np.ones((2, 2)) * 10]
clipped, norm = clip_by_global_norm(gs, 1.0)
assert abs(norm - 28.284271247461902) < 1e-6, f"原始范数应为 sqrt(800)≈28.28，实际 {norm}"
new_norm = np.sqrt(sum((g ** 2).sum() for g in clipped))
assert abs(new_norm - 1.0) < 1e-5, f"裁剪后范数应为 1，实际 {new_norm}"
assert len(clipped) == 2, "应保持梯度数量不变"
assert len(clipped) == 2, "应保持梯度数量不变"
small = [np.ones((2, 2)) * 0.1]
out, _ = clip_by_global_norm(small, 10.0)
assert np.allclose(out[0], small[0]), "未超限时梯度不应改变"
`,
        answer: `import numpy as np

def clip_by_global_norm(grads, max_norm=1.0):
    total = np.sqrt(sum(float((g ** 2).sum()) for g in grads))
    if total > max_norm:
        scale = max_norm / (total + 1e-6)
        return [g * scale for g in grads], total
    return grads, total

gs = [np.ones((2, 2)) * 10, np.ones((2, 2)) * 10]
clip_by_global_norm(gs, 1.0)`,
        explanation:
          '```python\ntotal = np.sqrt(sum(float((g ** 2).sum()) for g in grads))\nif total > max_norm:\n    scale = max_norm / (total + 1e-6)\n    return [g * scale for g in grads], total\nreturn grads, total\n```\n\n**全局范数裁剪**（而不是逐元素裁剪）能保持梯度方向不变，只缩小步长。加 `1e-6` 防止除零。这是大模型训练的标配操作。',
        tags: ['编程', '梯度裁剪'],
      },
      {
        id: 'llm-a2-c2-e7',
        type: 'code',
        difficulty: 3,
        question: '实现单层神经网络的反向传播：给定输入 `x`、权重 `W`、目标 `y_true`，前向 `y = x @ W`，损失 `L = mean((y - y_true)²)`。\n\n返回 `(loss, dW)`，其中 `dW = 2/n * xᵀ @ (y - y_true)`。',
        starterCode: `import numpy as np

def linear_backward(x, W, y_true):
    # 前向
    y = x @ W
    # 损失
    loss = ___
    # 梯度
    dW = ___
    return loss, dW


x = np.array([[1.0, 2.0]])
W = np.array([[0.5], [1.5]])
linear_backward(x, W, np.array([[5.0]]))
`,
        setupCode: '',
        expectedOutput: 'loss 与 dW',
        tests: `import numpy as np
x = np.array([[1.0, 2.0]])
W = np.array([[0.5], [1.5]])
yt = np.array([[5.0]])
loss, dW = linear_backward(x, W, yt)
# y = 1*0.5 + 2*1.5 = 3.5, 误差 = -1.5, loss = 2.25
assert abs(loss - 2.25) < 1e-9, f"loss 应为 2.25，实际 {loss}"
assert dW.shape == (2, 1), f"dW 形状应为 (2,1)，实际 {dW.shape}"
# dW = 2/1 * x^T * (y - y_true) = 2 * [[1],[2]] * (-1.5)
assert abs(dW[0, 0] - (-3.0)) < 1e-9, f"dW[0] 应为 -3，实际 {dW[0,0]}"
assert abs(dW[1, 0] - (-6.0)) < 1e-9, f"dW[1] 应为 -6，实际 {dW[1,0]}"
`,
        answer: `import numpy as np

def linear_backward(x, W, y_true):
    y = x @ W
    n = y.shape[0]
    diff = y - y_true
    loss = float((diff ** 2).mean())
    dW = (2.0 / n) * (x.T @ diff)
    return loss, dW


x = np.array([[1.0, 2.0]])
W = np.array([[0.5], [1.5]])
linear_backward(x, W, np.array([[5.0]]))`,
        explanation:
          '```python\ny = x @ W\nn = y.shape[0]\ndiff = y - y_true\nloss = float((diff ** 2).mean())\ndW = (2.0 / n) * (x.T @ diff)\nreturn loss, dW\n```\n\n**推导**：L = (1/n)Σ(yᵢ - tᵢ)²，对 W 求导得 ∂L/∂W = (2/n)·xᵀ·(y - t)。\n\n验证：y = 1×0.5 + 2×1.5 = 3.5，误差 -1.5，loss = 2.25；dW = 2 × [[1],[2]] × (-1.5) = [[-3],[-6]]。',
        tags: ['编程', '反向传播'],
      },
      {
        id: 'llm-a2-c2-e8',
        type: 'judge',
        difficulty: 3,
        question: '训练时显存占用远大于推理，主要原因是反向传播需要缓存前向的中间激活值。',
        answer: true,
        explanation: '反向传播计算梯度时必须用到前向的中间结果，因此全部要保存。梯度检查点（Gradient Checkpointing）通过丢弃部分激活、反向时重算来省显存，代价是更多计算。',
        tags: ['显存'],
      },
      {
        id: 'llm-a2-c2-e9',
        type: 'open',
        difficulty: 3,
        question: '请解释为什么深层 Sigmoid 网络会出现梯度消失，并给出至少 3 种解决方案及其原理。',
        referenceAnswer: `**梯度消失的成因**

反向传播是梯度连乘：

    ∂L/∂W₁ = ∂L/∂hₙ · (∂hₙ/∂hₙ₋₁) · … · (∂h₂/∂h₁) · (∂h₁/∂W₁)

Sigmoid 的导数为 σ(x)(1-σ(x))，最大值只有 0.25（在 x=0 处）。
若每层局部梯度平均为 0.25，连乘 10 层后约 0.25¹⁰ ≈ 9.5×10⁻⁷，
再乘上游梯度基本归零，导致**靠近输入的层几乎无法更新**。

**解决方案**

1. **换激活函数**：ReLU 在正区间导数恒为 1，
   ∂relu/∂x ∈ {0,1}，不会因连乘而衰减。GELU/SiLU 同理（在大模型中被广泛使用）。

2. **残差连接**：y = x + F(x)，则 ∂y/∂x = 1 + ∂F/∂x。
   恒等路径提供了梯度直通的"高速公路"，梯度至少按 1 传回，不衰减。
   这是 ResNet 与所有 Transformer 的标配。

3. **归一化**：LayerNorm/BatchNorm 把激活值约束在均值 0、方差 1 附近，
   使每层局部梯度的量级可控，避免连续衰减或放大。

4. **合理初始化**：Xavier（tanh）/ He（ReLU）初始化保持各层输出方差一致，
   从源头避免梯度量级失控。

5. **门控结构**：LSTM/GRU 的遗忘门可以选择性地保留梯度路径，
   缓解 RNN 沿时间步的梯度消失。

**补充**：若同时存在梯度爆炸，还需要**梯度裁剪**（大模型按 max_norm=1.0 全局裁剪）。`,
        rubric: [
          { point: '指出反向传播是梯度连乘，sigmoid 导数最大 0.25', score: 2 },
          { point: '给出换激活函数（ReLU/GELU）并说明原理', score: 1 },
          { point: '给出残差连接并说明恒等路径保证梯度 ≥1', score: 2 },
          { point: '给出归一化或初始化方案', score: 1 },
        ],
        keywords: ['连乘', '0.25', 'ReLU', '残差', '恒等路径', 'LayerNorm', '初始化'],
        explanation: '这道题是大模型面试高频题。能说清"连乘导致指数衰减"并用残差连接的恒等路径解释，就是满分答案。',
        tags: ['梯度消失', '面试'],
      },
      {
        id: 'llm-a2-c2-e10',
        type: 'single',
        difficulty: 3,
        question: '反向模式自动微分（Reverse-mode AD）适合神经网络的原因是？',
        options: [
          { value: 'A', text: '神经网络层数少' },
          { value: 'B', text: '神经网络输入（参数）极多而输出（损失）只有一个标量' },
          { value: 'C', text: '反向模式计算速度恒定' },
          { value: 'D', text: '反向模式不需要前向计算' },
        ],
        answer: 'B',
        explanation: '反向模式适合"输入多、输出少"的场景。神经网络有数亿参数（输入）但只有 1 个损失（输出），一次反传即可得到全部梯度。',
        tags: ['自动微分'],
      },
      {
        id: 'llm-a2-c2-e11',
        type: 'code',
        difficulty: 4,
        question: '用数值微分验证解析梯度：实现 `numeric_grad(f, x, eps=1e-5)`，对向量 `x` 的每个分量做中心差分 `(f(x+εeᵢ) - f(x-εeᵢ)) / (2ε)`，返回梯度向量。\n\n用它验证 `f(x) = sum(x²)` 在 `x=[1,2,3]` 处的梯度应为 `[2,4,6]`。',
        starterCode: `import numpy as np

def numeric_grad(f, x, eps=1e-5):
    x = np.asarray(x, dtype=float)
    grad = np.zeros_like(x)
    ___
    return grad


numeric_grad(lambda v: float((v ** 2).sum()), np.array([1.0, 2.0, 3.0]))
`,
        setupCode: '',
        expectedOutput: '[2. 4. 6.]',
        tests: `import numpy as np
g = numeric_grad(lambda v: float((v ** 2).sum()), np.array([1.0, 2.0, 3.0]))
assert np.allclose(g, [2.0, 4.0, 6.0], atol=1e-5), f"梯度应为 [2,4,6]，实际 {g}"
g2 = numeric_grad(lambda v: float(v.sum()), np.array([1.0, 2.0]))
assert np.allclose(g2, [1.0, 1.0], atol=1e-5), f"sum 的梯度应全为 1，实际 {g2}"
`,
        answer: `import numpy as np

def numeric_grad(f, x, eps=1e-5):
    x = np.asarray(x, dtype=float)
    grad = np.zeros_like(x)
    for i in range(len(x)):
        origin = x[i]
        x[i] = origin + eps
        fp = f(x)
        x[i] = origin - eps
        fm = f(x)
        x[i] = origin
        grad[i] = (fp - fm) / (2 * eps)
    return grad


numeric_grad(lambda v: float((v ** 2).sum()), np.array([1.0, 2.0, 3.0]))`,
        explanation:
          '```python\nfor i in range(len(x)):\n    origin = x[i]\n    x[i] = origin + eps\n    fp = f(x)\n    x[i] = origin - eps\n    fm = f(x)\n    x[i] = origin\n    grad[i] = (fp - fm) / (2 * eps)\nreturn grad\n```\n\n**中心差分**比前向差分精度更高（误差 O(ε²) vs O(ε)）。这是梯度检查（gradient check）的标准做法，用来验证手写反向传播是否有 bug。',
        tags: ['编程', '数值微分'],
      },
    ],
  },

  /* ============================================================
   *  c3：梯度下降
   * ============================================================ */
  {
    id: 'llm-a2-c3',
    title: '梯度下降：往哪个方向走、走多远',
    goal: '理解批量/随机/小批量梯度下降的区别，掌握学习率的影响与常见调参策略。',
    lessons: [
      {
        id: 'llm-a2-c3-l1',
        title: '三种梯度下降与学习率',
        content: `
## 学习目标

学完本节，你应该能够：
1. 区分批量/随机/小批量梯度下降的更新公式、开销与噪声特性；
2. 解释学习率过大（震荡发散）与过小（龟速驻留）的损失曲面图景；
3. 用 numpy 实现小批量 SGD 并跑通一个二次函数最小化，观察学习率的三种命运。

## 前置知识

- 反向传播产出梯度 $\\nabla_\\theta \\mathcal{L}$（上一章）；
- 导数=斜率的方向直觉。

## 问题背景：有了梯度，怎么下山

反向传播只回答"往哪边陡"；**优化器决定步子怎么迈**。最朴素的原则——沿负梯度走：

$$\\theta_{t+1} = \\theta_t - \\eta \\nabla_\\theta \\mathcal{L}(\\theta_t)$$

学习率 $\\eta$ 是深度学习里**影响力最大的单一超参数**：过大发散，过小训不动，中期要衰减，初期还要热身（下一章）。先把这三个基本变体和"步长病"吃透，Adam 才不是黑盒。

## 直觉理解：蒙眼下山

你在山中蒙眼找谷底，只能用脚感受坡度（梯度）：
- **批量 GD（BGD）**：每次把整座山巡视一遍再决定一步——方向准，但一步的代价太大；
- **随机 GD（SGD）**：随机站一小块地感受坡度就迈步——快但抖，像醉汉下山，长期看方向仍对；
- **小批量 GD（mini-batch）**：看一小片（32–2048 个样本）——**方向较准 + 迈步频繁 + 恰好适配 GPU 并行**，深度学习的工业默认。

**学习率** = 步长。步子太大跨过谷底在对坡反复弹跳（发散）；太小在半坡平台挪动（训练停滞）；合适时先大步后小步最理想——这正是"调度"的动机。

## 核心概念：三种变体对照

| 变体 | 每步用多少样本 | 梯度噪声 | 每步成本 | 硬件适配 |
| --- | --- | --- | --- | --- |
| BGD | 全数据集 N | 无（确定性） | 高 | 差（N 常常装不下） |
| SGD | 1 | 大 | 极低 | 差（并行度 1） |
| Mini-batch | b（32–2048） | 中 | 中 | **好（矩阵运算吃满 GPU）** |

噪声不是纯缺点：它帮助逃离尖锐极小值（sharp minima），倾向泛化更好的平坦解——这是 SGD 长期打败 BGD 泛化性能的经典解释之一（非凸优化研究的热点）。

## 原理详解：学习率的三种命运（一维二次谷）

把损失近似为 $\\mathcal{L}(\\theta) = \\frac{k}{2}\\theta^2$（k 为曲率），梯度下降是 $\\theta_{t+1} = (1-\\eta k)\\theta_t$——**等比数列**！收敛条件 $|1 - \\eta k| < 1$，即 $0 < \\eta < 2/k$：
- $\\eta < 1/k$：单调收敛（欠火，慢）；
- $\\eta = 1/k$：一步到位（理想，但曲率处处不同、不可能全局命中）；
- $1/k < \\eta < 2/k$：震荡收敛（过冲但回落）；
- $\\eta > 2/k$：**震荡发散**（每步更远，loss 上天）。

真实损失曲面在不同区域曲率差几个数量级——单一固定 $\\eta$ 必然在某些区域太大、另一些区域太小，这就是自适应优化器（Adam，下一节）与调度（下一章）的原始驱动力。

## 完整案例：$f(x) = (x-4)^2$ 上的三种命运

\`\`\`python
import numpy as np

def descend(eta, x0=0.0, steps=25):
    x = x0
    traj = [x]
    for _ in range(steps):
        g = 2 * (x - 4)             # f'(x)
        x = x - eta * g
        traj.append(x)
    return traj

for eta in (0.05, 0.95, 1.05):
    t = descend(eta)
    print(f"eta={eta:5}: 前3步 {[round(v,3) for v in t[:3]]}, 25步后 x={t[-1]:.4f}")
\`\`\`

预期输出（实测，最优 x=4，k=2、发散阈值 $\\eta = 1$）：eta=0.05 → 25 步后 x=3.71（缓慢单调逼近）；eta=0.95 → 25 步后 4.29、100 步后 4.0000（震荡收敛）；eta=1.05 → 25 步后 47.3、100 步后 -5.5e+04（每步误差放大 1.1 倍，指数发散）。**常见错误**：认为震荡=错误（欠冲震荡在收敛域内完全正常）；发散后继续跑（应设梯度范数监控与提前终止）。

## 常见误区

1. **"SGD 就指随机梯度下降算法族"**——文献里 SGD 常泛指含小批量；说清 batch=1 还是 mini-batch；
2. **batch 越大越好**——大到一定后边际收益消失（硬件极限），且泛化常变差（噪声的正则作用被拿走）；
3. **把发散当归环境/实现 bug**——九成发散是学习率超了收敛域，先砍 10 倍再排查；
4. **以为梯度指向最近的极小值**——只指向局部最陡下降方向，可能停在鞍点/局部极小（大模型维度下局部极小反而少见，鞍点与平坦高原才是主敌）。

## 知识关联

- **向前**：上一章反向传播供给梯度，本节决定消费方式；
- **向后**：下一节 Adam 给每个参数配"自适应步长"；下一章调度曲线管理 $\\eta$ 随时间的演化；
- **课程间**：分布式训练的大 batch 线性缩放规则（$\\eta \\propto \\text{batch}$ 近似）、混合精度的 loss scaling 全部围绕 $\\eta$ 与梯度尺度展开。

## 本节总结

| 结论 | 内容 |
| --- | --- |
| 更新式 | $\\theta \\leftarrow \\theta - \\eta\\nabla\\mathcal{L}$，一切变体之母 |
| 三变体 | BGD 准而贵；SGD 快而抖；mini-batch 折中且适配 GPU |
| 收敛域 | 二次近似下 $0<\\eta<2/k$：内震荡收敛、外发散 |
| 噪声观 | 适度噪声助泛化，非纯害 |

## 参考资料

> **来源类型：权威教材**
> - Goodfellow, Bengio, & Courville, *Deep Learning*（MIT Press, 2016），§8.1–8.3——一阶方法与收敛性质的教科书处理（官网免费）。
> - Bottou, L., Curtis, F. E., & Nocedal, J. (2018). "Optimization Methods for Large-Scale Machine Learning." *SIAM Review*, 60(2), 223–311——SGD/mini-batch 的现代系统综述。
>
> **来源类型：参考资料**
> - Stanford CS231n 讲义 "Neural Networks 3: Gradient Checks & Sanity Checking"（学习率命运曲线的标准图示）。
>
> **来源类型：原创**
> - 蒙眼下山三层比喻、等比数列推导与三命运实验为本课程改编。
`,
        tips: [
          {
            kind: 'interview',
            text: '「为什么用 mini-batch」答三点：梯度噪声小于单样本、GPU 并行效率高、适度噪声利于逃离鞍点。',
          },
          {
            kind: 'leak',
            text: '显存不够时用梯度累积模拟大 batch：把 loss 除以 accum_steps 再 backward，攒够步数才 step。',
          },
          {
            kind: 'pitfall',
            text: 'loss 突然变 nan 时，第一反应应该是「学习率是不是太大了」和「有没有加梯度裁剪」，而不是去改模型结构。',
          },
        ],
        demos: [
          {
            title: '学习率对收敛的影响',
            lang: 'python',
            code: `import numpy as np

def gradient_descent(lr, steps=30):
    w = 5.0                       # 初始点
    history = [w]
    for _ in range(steps):
        grad = 2 * w              # f(w) = w² 的导数
        w = w - lr * grad
        history.append(w)
        if abs(w) > 1e6:
            break
    return history

for lr in (0.01, 0.1, 0.9, 1.05):
    h = gradient_descent(lr)
    status = "发散" if abs(h[-1]) > 1e3 else f"收敛到 {h[-1]:.6f}"
    print(f"lr={lr:<5} 第30步后 w = {h[-1]:>14.6e}   {status}")

print()
print("f(w)=w² 在 w=0 取得最小值。")
print("lr<1 会收敛，lr=1 直接跳到 0，lr>1 会震荡/发散。")`,
          },
          {
            title: '梯度累积',
            lang: 'python',
            code: `import numpy as np

# 模拟：想用 batch=16，但显存只够 batch=4
def compute_grad(batch):
    """模拟某个 batch 的梯度。"""
    return np.mean(batch)

data = np.arange(16.0)

# 方案 A：显存足够
full_grad = compute_grad(data)

# 方案 B：梯度累积（4 个 micro-batch）
accum_steps = 4
acc = 0.0
for i in range(accum_steps):
    micro = data[i * 4:(i + 1) * 4]
    grad = compute_grad(micro) / accum_steps   # 关键：除以累积步数
    acc += grad

print(f"完整 batch 梯度: {full_grad:.4f}")
print(f"梯度累积结果:   {acc:.4f}")
print(f"是否一致: {abs(full_grad - acc) < 1e-9}")
print()
print("除以 accum_steps 是为了让梯度保持平均语义，")
print("否则累积后的梯度会大 accum_steps 倍，等效于放大了学习率。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a2-c3-e1',
        type: 'single',
        difficulty: 1,
        question: '梯度下降的更新公式是？',
        options: [
          { value: 'A', text: 'w ← w + η·∂L/∂w' },
          { value: 'B', text: 'w ← w - η·∂L/∂w' },
          { value: 'C', text: 'w ← η·∂L/∂w' },
          { value: 'D', text: 'w ← w · η' },
        ],
        answer: 'B',
        explanation: '沿梯度的**反方向**移动，因为梯度指向损失增大最快的方向。η 是学习率（步长）。',
        tags: ['梯度下降'],
      },
      {
        id: 'llm-a2-c3-e2',
        type: 'multiple',
        difficulty: 2,
        question: '为什么实践中使用 mini-batch 而不是单样本 SGD 或全量 BGD？（多选）',
        options: [
          { value: 'A', text: '梯度噪声比单样本小' },
          { value: 'B', text: 'GPU 并行效率高，吞吐大' },
          { value: 'C', text: '适度噪声有助于跳出鞍点' },
          { value: 'D', text: 'mini-batch 不需要计算梯度' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误。mini-batch 依然要算梯度，只是用 batch 内平均。A/B/C 是它成为实践标准的三个原因。',
        tags: ['mini-batch'],
      },
      {
        id: 'llm-a2-c3-e3',
        type: 'judge',
        difficulty: 2,
        question: '训练时 loss 突然变成 nan，首先应该怀疑学习率过大或梯度爆炸。',
        answer: true,
        explanation: '这是最常见的原因。其次是数值溢出（如 fp16 未做 loss scaling）。排查顺序：降低学习率 → 加梯度裁剪 → 检查数据。',
        tags: ['调参'],
      },
      {
        id: 'llm-a2-c3-e4',
        type: 'fill',
        difficulty: 3,
        question: '显存不足以支撑大 batch 时，可以通过多次 forward/backward 再统一 step 来模拟大 batch，这个技术叫梯度___。',
        blanks: [['累积', '累加', 'accumulation', 'accumulate']],
        explanation: '梯度累积：每次 backward 后梯度会累加在参数上，攒够 accum_steps 次才执行 optimizer.step()。注意 loss 要除以 accum_steps 保持平均语义。',
        tags: ['梯度累积'],
      },
      {
        id: 'llm-a2-c3-e5',
        type: 'code',
        difficulty: 2,
        question: '实现一维梯度下降：最小化 `f(w) = (w - 3)²`，从 `w=0` 开始，学习率 0.1，迭代 100 次。返回最终的 w（保留 6 位小数）。',
        starterCode: `def gradient_descent():
    w = 0.0
    lr = 0.1
    for _ in range(100):
        grad = ___          # f(w)=(w-3)² 的导数
        w = ___
    return round(w, 6)


gradient_descent()
`,
        setupCode: '',
        expectedOutput: '应为 3.0（或极接近）',
        tests: `result = gradient_descent()
assert abs(result - 3.0) < 1e-2, f"应收敛到 3.0 附近，实际 {result}"
assert isinstance(result, float), "应返回浮点数"
`,
        answer: `def gradient_descent():
    w = 0.0
    lr = 0.1
    for _ in range(100):
        grad = 2 * (w - 3)
        w = w - lr * grad
    return round(w, 6)


gradient_descent()`,
        explanation:
          '```python\ngrad = 2 * (w - 3)\nw = w - lr * grad\n```\n\nf(w)=(w-3)² 的导数 f\'(w)=2(w-3)。经过 100 次迭代，误差按 (1-2×0.1)^100 = 0.8^100 ≈ 2×10⁻¹⁰ 衰减，几乎精确到达 3。',
        tags: ['编程', '梯度下降'],
      },
      {
        id: 'llm-a2-c3-e6',
        type: 'code',
        difficulty: 3,
        question: '实现梯度累积：给定 `micro_grads`（每个 micro-batch 的梯度列表）与 `accum_steps`，返回累积后的梯度列表。\n\n规则：每个 micro-batch 的梯度先除以 accum_steps，再逐元素相加。',
        starterCode: `def accumulate_grads(micro_grads, accum_steps):
    # micro_grads: List[List[float]]
    ___


accumulate_grads([[1.0, 2.0], [3.0, 4.0]], 2)
`,
        setupCode: '',
        expectedOutput: '[2.0, 3.0]',
        tests: `out = accumulate_grads([[1.0, 2.0], [3.0, 4.0]], 2)
assert out == [2.0, 3.0], f"应为 [2.0, 3.0]，实际 {out}"
out2 = accumulate_grads([[2.0]], 4)
assert out2 == [0.5], f"应为 [0.5]，实际 {out2}"
out3 = accumulate_grads([[1.0, 1.0], [1.0, 1.0], [1.0, 1.0], [1.0, 1.0]], 4)
assert out3 == [1.0, 1.0], f"应为 [1.0,1.0]，实际 {out3}"
`,
        answer: `def accumulate_grads(micro_grads, accum_steps):
    if not micro_grads:
        return []
    acc = [0.0] * len(micro_grads[0])
    for g in micro_grads:
        for i, v in enumerate(g):
            acc[i] += v / accum_steps
    return acc


accumulate_grads([[1.0, 2.0], [3.0, 4.0]], 2)`,
        explanation:
          '```python\nacc = [0.0] * len(micro_grads[0])\nfor g in micro_grads:\n    for i, v in enumerate(g):\n        acc[i] += v / accum_steps\nreturn acc\n```\n\n每个 micro-batch 的梯度**先除以 accum_steps** 再累加，这样总梯度等于所有 micro-batch 梯度的平均值，等效于一个大 batch。若忘记除以，梯度会大 accum_steps 倍，等于变相放大学习率。',
        tags: ['编程', '梯度累积'],
      },
      {
        id: 'llm-a2-c3-e7',
        type: 'judge',
        difficulty: 3,
        question: '在高维空间中，训练"卡住不动"多数是因为陷入了局部极小值。',
        answer: false,
        explanation: '高维空间中真正的局部极小很少，绝大多数是**鞍点**（某些方向还可下降）。这也是动量和噪声有助于训练的原因。',
        tags: ['优化'],
      },
      {
        id: 'llm-a2-c3-e8',
        type: 'open',
        difficulty: 3,
        question: '训练时你观察到以下三条损失曲线，请分别诊断可能的原因并给出解决建议：\n\n① loss 剧烈震荡，来回跳动\n② loss 几乎不动，10 个 epoch 后仍是初始值附近\n③ 训练 loss 持续下降，但验证 loss 从第 3 个 epoch 开始上升',
        referenceAnswer: `**① loss 剧烈震荡**

- 原因：学习率太大；batch size 太小（梯度噪声大）；数据未打乱或标签错误。
- 排查：把学习率降 3~10 倍；增大 batch；检查数据 pipeline。
- 建议：配合 warmup（前 1000 步线性升温）+ 梯度裁剪。

**② loss 几乎不动**

- 原因：
  - 学习率太小（每步更新量微乎其微）；
  - 梯度消失（激活函数、初始化问题）；
  - 数据或标签有问题（如全部标签相同、输入全为零）；
  - 参数被冻结（requires_grad=False 忘开）。
- 排查：打印各层梯度范数（若全为 0 → 梯度消失）；用一条样本过拟合测试（若 loss 也降不下来 → 数据或结构有问题）。
- 建议：调大学习率、改用 ReLU/GELU、检查初始化、加残差与归一化。

**③ 训练降、验证升（过拟合）**

- 原因：模型容量相对数据过大；训练数据太少或太单一；训练太久。
- 排查：对比训练/验证指标差距；检查数据是否泄漏（验证集混入训练集）。
- 建议：
  - 增加数据或做数据增强；
  - 加 dropout / weight decay；
  - 早停（early stopping）——在第 3 个 epoch 附近保存最佳 checkpoint；
  - 减小模型或降低训练轮数。

**通用方法**：先做"单 batch 过拟合测试"——用一个小 batch 训练几百步，
如果 loss 能降到接近 0，说明模型与训练流程没问题，问题在数据或超参。`,
        rubric: [
          { point: '① 指出学习率过大/梯度噪声，建议降低学习率与加 warmup', score: 2 },
          { point: '② 指出学习率过小/梯度消失/参数冻结，建议查梯度范数', score: 2 },
          { point: '③ 正确识别过拟合，并给出早停/正则/加数据方案', score: 2 },
          { point: '提到"单 batch 过拟合测试"这类系统排查手段', score: 1 },
        ],
        keywords: ['学习率', 'warmup', '梯度消失', '过拟合', '早停', '梯度范数'],
        explanation: '这道题考察真实训练排障能力，是工程岗面试的经典问题。',
        tags: ['调参', '排障'],
      },
    ],
  },

  /* ============================================================
   *  c4：Adam 优化器
   * ============================================================ */
  {
    id: 'llm-a2-c4',
    title: 'Adam 优化器：动量与自适应步长',
    goal: '理解 SGD 的局限、动量与 RMSProp 的思想，推导 Adam 的更新公式，并知道 AdamW 的区别。',
    lessons: [
      {
        id: 'llm-a2-c4-l1',
        title: '从 SGD 到 Adam',
        content: `
## 学习目标

学完本节，你应该能够：
1. 写出 Adam 的两个动量公式与更新式，解释一阶矩（方向）与二阶矩（步长）各自的作用；
2. 说明偏差修正为什么必要、$\\epsilon$ 防的是什么；
3. 用 numpy 手写 Adam 并在病态曲面（各维曲率差 1000 倍）上对比 SGD 与 Adam 的收敛差异。

## 前置知识

- 上一节 SGD 与"学习率三种命运"（Adam 的出发点：不同参数需要不同步长）；
- 指数滑动平均的概念（今天受昨天影响，且权重指数递减）。

## 问题背景：一把尺子量不了所有的维

SGD 对所有参数用同一个 $\\eta$。但损失曲面常是**狭长峡谷**：沿谷方向曲率小（该大步走），横跨方向曲率大（只能小步挪）。上一节看到收敛域要求 $\\eta < 2/k$——被最大曲率卡死，其余方向被迫龟速。Adam（Kingma & Ba, 2015）的方案：**给每个参数单独测"梯度最近多猛"（二阶矩），自动缩放步长**——猛的压一压，蔫的抬一抬。它让训练对学习率的鲁棒性大增，成为 LLM 训练的默认起点（现代变体 AdamW 见贴士）。

## 直觉理解：老司机与路况记忆

SGD 像只看眼前坡度的行人；Adam 像带**两种仪表**的老司机：
- **速度表（一阶矩 m）**：梯度的指数滑动平均——"最近这段路整体朝哪边下坡"，抹平单次颠簸，保留方向（动量：即便眼前小上坡，惯性也带你继续）；
- **路况表（二阶矩 v）**：梯度平方的滑动平均——"这段路通常有多抖"，抖的维度自动收油门（步长除以 $\\sqrt v$），稳的维度自动给油。

两者相除 $\\hat m/\\sqrt{\\hat v}$，相当于**信噪比导向**：方向确凿就敢走，噪声大就谨慎。

## 核心概念：算法四行

$$\\begin{aligned}
m_t &= \\beta_1 m_{t-1} + (1-\\beta_1) g_t & \\text{（一阶矩/动量）}\\\\
v_t &= \\beta_2 v_{t-1} + (1-\\beta_2) g_t^2 & \\text{（二阶矩/梯度平方的滑动平均）}\\\\
\\hat m_t &= \\frac{m_t}{1-\\beta_1^t},\\quad \\hat v_t = \\frac{v_t}{1-\\beta_2^t} & \\text{（偏差修正）}\\\\
\\theta_{t+1} &= \\theta_t - \\eta \\frac{\\hat m_t}{\\sqrt{\\hat v_t} + \\epsilon} &
\\end{aligned}$$

默认 $\\beta_1 = 0.9,\\ \\beta_2 = 0.999,\\ \\epsilon = 10^{-8}$。直觉读法：有效回看窗口约 $1/(1-\\beta)$——动量看近 10 步，二阶矩看近 1000 步。

**偏差修正的必要性**：初始 $m_0 = v_0 = 0$，前几步的滑动平均被零初值**系统性拉低**（t=1 时 $m_1 = 0.1 g_1$，只有真值的 1/10）；除以 $1-\\beta^t$（前期远小于 1）把初期的低估拉回来，否则**训练开局会异常保守**。

## 原理详解：为什么除以 √v 等于自适应步长

考虑某参数的梯度长期标准差为 $\\sigma$（噪声大）：$v_t \\approx \\sigma^2$，更新幅度 $\\approx \\eta \\hat m/\\sigma$——噪声越大分母越大，步子自动变小；梯度稳定同向的参数 $\\hat m$ 大而 $\\sigma$ 小，步子放大。等效于把上一节的"全局 $\\eta < 2/k_{max}$ 约束"替换为**每个参数自己的局部缩放**，峡谷两侧自动减速、谷底方向自动提速。$\\epsilon$ 防的是 $v_t \\to 0$ 时除零（也顺带界定更新量上界约 $\\eta/(1)$... 实际上界为 $\\eta \\cdot \\hat m / \\epsilon$ 不会触发——工程上它保证数值稳定而非限幅）。

## 完整案例：病态峡谷上的 SGD vs Adam

\`\`\`python
import numpy as np
rng = np.random.default_rng(0)

def loss_grad(x):
    # 狭长峡谷：x1 方向曲率是 x2 的 1000 倍
    return 1000.0 * x[0] ** 2 + 1.0 * x[1] ** 2, np.array([2000.0 * x[0], 2.0 * x[1]])

def sgd(x0, eta, steps=300):
    x = x0.copy()
    for _ in range(steps):
        _, g = loss_grad(x)
        x -= eta * g
    return x

def adam(x0, eta, steps=300, b1=0.9, b2=0.999, eps=1e-8):
    x = x0.copy(); m = np.zeros(2); v = np.zeros(2)
    for t in range(1, steps + 1):
        _, g = loss_grad(x)
        m = b1 * m + (1 - b1) * g
        v = b2 * v + (1 - b2) * g ** 2
        mh, vh = m / (1 - b1 ** t), v / (1 - b2 ** t)
        x -= eta * mh / (np.sqrt(vh) + eps)
    return x

print("SGD  (eta=0.0009):", np.round(sgd(np.array([10.0, 10.0]), 0.0009), 3))
print("Adam (eta=0.05)  :", np.round(adam(np.array([10.0, 10.0]), 0.05), 3))
\`\`\`

预期输出（实测）：SGD 的 $\\eta$ 被陡维（k=2000，阈值 $2/2000=0.001$）压到 0.0009 苟活，300 步后陡维归零但平维仍卡在 5.83；Adam 用 50 多倍的学习率，两个维度同时收敛到约 0.90——狭谷两维齐头并进——**自适应步长把"一把尺子"换成了"每参数一把"**。**常见错误**：忘记偏差修正（开局极慢）；$\\epsilon$ 放到根号外（PyTorch/TensorFlow 实现差异点）；以为 Adam 免调学习率（鲁棒≠免调，量级仍要选）。

## 常见误区

1. **"Adam 一定优于 SGD"**——视觉等 CV 任务上精调 SGD+动量常泛化更好；Adam 的主场是梯度尺度悬殊的 Transformer/NLP；
2. **Adam = AdamW**——Adam 把权重衰减混进梯度（与自适应缩放相干后失效）；AdamW 解耦衰减，LLM 标配是 **AdamW**（贴士展开）；
3. **$\\beta$ 可以随手调**——$\\beta_2$ 从 0.999 降到 0.95 是对抗梯度尖峰的专门技巧（短窗二阶矩反应更快），不是随意旋钮；
4. **动量只是加速**——它同时平滑噪声方向、抑制峡谷横向震荡，是"方向记忆"而非油门。

## 知识关联

- **向前**：上一节单一 $\\eta$ 的困境是本节全部动机；链式法则供给的 $g_t$ 是两种矩的原料；
- **向后**：下一章学习率调度管理的是本节公式里的 $\\eta$；c6 分布式训练要为 Adam 的 m/v 状态付出**每参数 8 字节**的显存账（ZeRO 切的就是它）；
- **课程间**：llm-a1 手写模型在训练循环里用的就是 AdamW；后训练课的微调同样如此。

## 本节总结

| 组件 | 公式 | 作用 |
| --- | --- | --- |
| 一阶矩 | $m_t = \\beta_1 m_{t-1} + (1-\\beta_1)g_t$ | 方向记忆（动量） |
| 二阶矩 | $v_t = \\beta_2 v_{t-1} + (1-\\beta_2)g_t^2$ | 噪声尺度 → 自适应步长 |
| 偏差修正 | $\\hat m = m/(1-\\beta_1^t)$ | 抵消零初值的低估 |
| 更新 | $\\theta \\leftarrow \\theta - \\eta\\hat m/(\\sqrt{\\hat v}+\\epsilon)$ | 信噪比导向，每参数一把尺 |

## 参考资料

> **来源类型：学术来源**
> - Kingma, D. P., & Ba, J. (2015). "Adam: A Method for Stochastic Optimization." *ICLR 2015*. arXiv:1412.6980（已核验）——Adam 原始论文（偏差修正与收敛分析的出处）。
> - Loshchilov, I., & Hutter, F. (2019). "Decoupled Weight Decay Regularization." *ICLR 2019*. arXiv:1711.05101——AdamW。
>
> **来源类型：权威教材**
> - Goodfellow, Bengio, & Courville, *Deep Learning*（MIT Press, 2016），§8.3–8.5——动量与自适应方法前置知识。
>
> **来源类型：原创**
> - 老司机双仪表比喻与病态峡谷对比实验为本课程改编。
`,
        tips: [
          {
            kind: 'interview',
            text: 'Adam = Momentum（一阶矩）+ RMSProp（二阶矩）+ 偏差修正。这是最常被问的优化器问题。',
          },
          {
            kind: 'leak',
            text: '大模型一律用 AdamW 而不是 Adam。AdamW 的权重衰减与自适应学习率解耦，正则效果更好。',
          },
          {
            kind: 'performance',
            text: 'Adam 为每个参数存 m、v 两个状态，显存是参数的 2 倍（fp32 训练时更多）。8bit Adam 可以把这部分压到 1/4。',
          },
        ],
        demos: [
          {
            title: 'Adam 完整实现与轨迹对比',
            lang: 'python',
            code: `import numpy as np

def adam(grad_fn, x0, lr=0.1, steps=50, beta1=0.9, beta2=0.999, eps=1e-8):
    x = np.array(x0, dtype=float)
    m = np.zeros_like(x)
    v = np.zeros_like(x)
    path = [x.copy()]
    for t in range(1, steps + 1):
        g = grad_fn(x)
        m = beta1 * m + (1 - beta1) * g
        v = beta2 * v + (1 - beta2) * g ** 2
        m_hat = m / (1 - beta1 ** t)      # 偏差修正
        v_hat = v / (1 - beta2 ** t)
        x = x - lr * m_hat / (np.sqrt(v_hat) + eps)
        path.append(x.copy())
    return np.array(path)

def sgd(grad_fn, x0, lr=0.1, steps=50):
    x = np.array(x0, dtype=float)
    path = [x.copy()]
    for _ in range(steps):
        x = x - lr * grad_fn(x)
        path.append(x.copy())
    return np.array(path)

# 峡谷形函数：x 方向陡、y 方向平
grad = lambda p: np.array([20 * p[0], 0.1 * p[1]])

p_adam = adam(grad, [1.0, 1.0])
p_sgd = sgd(grad, [1.0, 1.0])

print("目标：走到 (0, 0)")
print(f"SGD  最终位置: {p_sgd[-1]}")
print(f"Adam 最终位置: {p_adam[-1]}")
print()
print("SGD 在陡方向来回震荡，Adam 依靠二阶矩自适应，路径平稳得多。")`,
          },
          {
            title: '偏差修正的作用',
            lang: 'python',
            code: `import numpy as np

beta1 = 0.9
g = 1.0
m = 0.0

print("第几步 | 未修正 m | 修正后 m_hat")
print("-" * 40)
for t in range(1, 6):
    m = beta1 * m + (1 - beta1) * g
    m_hat = m / (1 - beta1 ** t)
    print(f"  {t}    |  {m:.4f}  |  {m_hat:.4f}")

print()
print("不修正时，第 1 步 m = 0.1（远小于真实梯度 1.0），")
print("修正后 m_hat = 1.0（正确）。这就是 1/(1-β^t) 的意义。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a2-c4-e1',
        type: 'single',
        difficulty: 2,
        question: 'Adam 优化器由哪两种思想组合而成？',
        options: [
          { value: 'A', text: '动量 + RMSProp（自适应学习率）' },
          { value: 'B', text: '牛顿法 + 共轭梯度' },
          { value: 'C', text: '遗传算法 + 模拟退火' },
          { value: 'D', text: 'L1 正则 + L2 正则' },
        ],
        answer: 'A',
        explanation: 'Adam = Adaptive Moment Estimation，一阶矩（动量）负责平滑方向，二阶矩（RMSProp）负责自适应缩放步长。',
        tags: ['Adam'],
      },
      {
        id: 'llm-a2-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Adam 中的偏差修正（除以 1-β^t）是因为 m 和 v 初始化为 0，前几步估计会偏小。',
        answer: true,
        explanation: '这是偏差修正的准确动机。第 1 步 m = (1-β₁)g = 0.1g，远小于真实梯度，除以 1-β₁¹=0.1 就恢复成 g。',
        tags: ['Adam'],
      },
      {
        id: 'llm-a2-c4-e3',
        type: 'single',
        difficulty: 3,
        question: 'AdamW 相比 Adam 的主要改进是？',
        options: [
          { value: 'A', text: '收敛速度更快' },
          { value: 'B', text: '把权重衰减与自适应学习率解耦，正则效果更好' },
          { value: 'C', text: '不需要存储二阶矩' },
          { value: 'D', text: '不需要学习率' },
        ],
        answer: 'B',
        explanation: 'Adam 把 L2 正则混入梯度，会被自适应缩放削弱。AdamW 让权重衰减直接作用于参数，强度稳定。几乎成为大模型训练标准。',
        tags: ['AdamW'],
      },
      {
        id: 'llm-a2-c4-e4',
        type: 'multiple',
        difficulty: 3,
        question: '为什么大模型训练偏好 Adam 而不是 SGD？（多选）',
        options: [
          { value: 'A', text: '不同参数的梯度尺度差异大，自适应学习率能应对' },
          { value: 'B', text: '收敛更快，调参更省力' },
          { value: 'C', text: '对稀疏梯度（如 embedding）友好' },
          { value: 'D', text: 'Adam 显存占用比 SGD 更小' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 相反：Adam 需要为每个参数存一阶矩和二阶矩，显存是 SGD 的 2 倍以上。',
        tags: ['Adam'],
      },
      {
        id: 'llm-a2-c4-e5',
        type: 'fill',
        difficulty: 3,
        question: 'Adam 需要为每个参数额外保存一阶矩 m 和二阶矩 v，因此优化器状态占用的显存约为参数量的 ___ 倍。',
        blanks: [['2', '两', '二']],
        explanation: 'm 和 v 各与参数同形状，所以是 2 倍。若用 fp32 训练还需存 fp32 主权重和梯度，总显存远大于模型本身。',
        tags: ['显存'],
      },
      {
        id: 'llm-a2-c4-e6',
        type: 'code',
        difficulty: 3,
        question: '实现 Adam 的单步更新：给定 `w`、`g`、`m`、`v`、`t`（从 1 开始）、`lr=0.001`、`beta1=0.9`、`beta2=0.999`、`eps=1e-8`。\n\n返回更新后的 `(w, m, v)`（浮点数或数组）。',
        starterCode: `def adam_step(w, g, m, v, t, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
    # 1. 更新一阶矩与二阶矩
    # 2. 偏差修正
    # 3. 参数更新
    ___

adam_step(1.0, 0.5, 0.0, 0.0, 1)
`,
        setupCode: '',
        expectedOutput: 'w 约为 0.999（第一步几乎不移动）',
        tests: `w, m, v = adam_step(1.0, 0.5, 0.0, 0.0, t=1)
assert abs(m - 0.05) < 1e-9, f"m 应为 0.05，实际 {m}"
assert abs(v - 0.00025) < 1e-9, f"v 应为 0.00025，实际 {v}"
assert abs(w - 0.999) < 1e-6, f"w 应约为 0.999，实际 {w}"
assert abs(w - 1.0) > 0, "参数应发生变化"
`,
        answer: `def adam_step(w, g, m, v, t, lr=0.001, beta1=0.9, beta2=0.999, eps=1e-8):
    m = beta1 * m + (1 - beta1) * g
    v = beta2 * v + (1 - beta2) * g * g
    m_hat = m / (1 - beta1 ** t)
    v_hat = v / (1 - beta2 ** t)
    w = w - lr * m_hat / (v_hat ** 0.5 + eps)
    return w, m, v


adam_step(1.0, 0.5, 0.0, 0.0, 1)`,
        explanation:
          '```python\nm = beta1 * m + (1 - beta1) * g\nv = beta2 * v + (1 - beta2) * g * g\nm_hat = m / (1 - beta1 ** t)\nv_hat = v / (1 - beta2 ** t)\nw = w - lr * m_hat / (v_hat ** 0.5 + eps)\nreturn w, m, v\n```\n\n第一步：m = 0.1×0.5 = 0.05，v = 0.001×0.25 = 0.00025。\n偏差修正：m̂ = 0.05/0.1 = 0.5，v̂ = 0.00025/0.001 = 0.25。\n更新：w = 1 - 0.001×0.5/(0.5+1e-8) = 1 - 0.001 = 0.999。',
        tags: ['编程', 'Adam'],
      },
      {
        id: 'llm-a2-c4-e7',
        type: 'code',
        difficulty: 4,
        question: '用 Adam 最小化二次函数 `f(x) = sum((x - 2)²)`（3 维），从全零开始，学习率 0.1，迭代 100 步。\n\n返回最终的 `x`（保留 4 位小数）。',
        starterCode: `import numpy as np

def optimize():
    x = np.zeros(3)
    m = np.zeros(3)
    v = np.zeros(3)
    lr, b1, b2, eps = 0.1, 0.9, 0.999, 1e-8
    for t in range(1, 101):
        g = ___              # 梯度
        m = ___
        v = ___
        x = ___
    return np.round(x, 4)


optimize()
`,
        setupCode: '',
        expectedOutput: '[2. 2. 2.]',
        tests: `import numpy as np
out = optimize()
assert np.allclose(out, [2.0, 2.0, 2.0], atol=1e-2), f"应收敛到 [2,2,2]，实际 {out}"
assert out.shape == (3,), "应返回 3 维向量"
`,
        answer: `import numpy as np

def optimize():
    x = np.zeros(3)
    m = np.zeros(3)
    v = np.zeros(3)
    lr, b1, b2, eps = 0.1, 0.9, 0.999, 1e-8
    for t in range(1, 101):
        g = 2 * (x - 2)
        m = b1 * m + (1 - b1) * g
        v = b2 * v + (1 - b2) * g * g
        m_hat = m / (1 - b1 ** t)
        v_hat = v / (1 - b2 ** t)
        x = x - lr * m_hat / (np.sqrt(v_hat) + eps)
    return np.round(x, 4)


optimize()`,
        explanation:
          '```python\ng = 2 * (x - 2)\nm = b1 * m + (1 - b1) * g\nv = b2 * v + (1 - b2) * g * g\nm_hat = m / (1 - b1 ** t)\nv_hat = v / (1 - b2 ** t)\nx = x - lr * m_hat / (np.sqrt(v_hat) + eps)\n```\n\nf(x)=Σ(x-2)² 的梯度是 2(x-2)。Adam 的自适应步长让它能稳定收敛到最优点 [2,2,2]。',
        tags: ['编程', 'Adam'],
      },
      {
        id: 'llm-a2-c4-e8',
        type: 'judge',
        difficulty: 3,
        question: 'Adam 的学习率默认值（如 1e-3）对任何任务都适用，不需要调整。',
        answer: false,
        explanation: 'Adam 的自适应性让它对学习率不那么敏感，但学习率仍是最关键的超参。预训练常用 1e-4~3e-4，LoRA 用 1e-4~2e-4，全参微调用 1e-5~5e-5。',
        tags: ['学习率'],
      },
      {
        id: 'llm-a2-c4-e9',
        type: 'open',
        difficulty: 4,
        question: '请推导并解释 Adam 的完整更新公式，并说明每一项的作用。然后比较 Adam 与 SGD 在显存和收敛性上的差异。',
        referenceAnswer: `**Adam 完整公式**

对每个参数 w（t 为步数，g = ∂L/∂w）：

第 1 步：更新一阶矩（动量的指数移动平均）

    m ← β₁·m + (1-β₁)·g

第 2 步：更新二阶矩（梯度平方的指数移动平均）

    v ← β₂·v + (1-β₂)·g²

第 3 步：偏差修正

    m̂ = m / (1 - β₁ᵗ)
    v̂ = v / (1 - β₂ᵗ)

第 4 步：参数更新

    w ← w - η · m̂ / (√v̂ + ε)

**各项作用**

- β₁（0.9）：控制一阶矩的记忆长度，起到动量的作用——方向一致的维度加速，震荡的维度互相抵消。
- β₂（0.999）：控制二阶矩的记忆长度，使每个参数的学习率自适应——梯度大的参数步长变小。
- 偏差修正：m、v 初始化为 0，前几步估计偏小（第 1 步 m=(1-β₁)g）。除以 1-βᵗ 将其矫正到无偏。
- ε（1e-8）：防止除零，同时限制最大步长。
- η：全局学习率，仍需按任务调整。

**与 SGD 的对比**

| 维度 | SGD | Adam |
| --- | --- | --- |
| 额外显存 | O(参数量)（无额外状态） | O(2×参数量)，需存 m 和 v |
| 收敛速度 | 慢，需精细调参 | 快，对超参鲁棒 |
| 梯度尺度差异 | 敏感（需逐层调 lr） | 不敏感（自适应） |
| 稀疏梯度 | 差 | 好 |
| 泛化能力 | 某些任务上略优 | 通常足够 |
| 最终效果 | 精心调参可超过 Adam | 开箱即用更省事 |

**结论**：大模型训练选 AdamW，因为参数规模巨大、梯度尺度差异大、训练成本高（没时间精细调参）。代价是优化器状态占 2 倍参数显存。`,
        rubric: [
          { point: '写出 m、v、偏差修正、参数更新四步公式', score: 3 },
          { point: '解释 β₁/β₂/ε/偏差修正各自作用', score: 2 },
          { point: '指出 Adam 额外显存为 2 倍参数', score: 1 },
          { point: '说明收敛性差异并给出结论（大模型选 AdamW）', score: 1 },
        ],
        keywords: ['一阶矩', '二阶矩', '偏差修正', '自适应', '2 倍显存', 'AdamW'],
        explanation: '这是优化器中最核心的推导题。能完整写出四步公式并解释偏差修正，就掌握了 Adam。',
        tags: ['Adam', '面试'],
      },
    ],
  },

  /* ============================================================
   *  c5：学习率调度
   * ============================================================ */
  {
    id: 'llm-a2-c5',
    title: '学习率调度：warmup 与衰减',
    goal: '理解为什么需要 warmup，掌握余弦衰减、线性衰减与逆平方根衰减，并能画出调度曲线。',
    lessons: [
      {
        id: 'llm-a2-c5-l1',
        title: '为什么不能一直用固定学习率',
        content: `
## 训练不同阶段需要不同的学习率

- **初期**：参数随机初始化，梯度方向不可靠且量级大。直接用大学习率容易发散。
- **中期**：需要较大步长快速下降。
- **后期**：已接近最优，需要小步长精细调整，否则会在最优点附近震荡。

所以实践中都在**动态调整学习率**。

## Warmup：先小后大

前 N 步让学习率从 0（或很小的值）**线性增加到峰值**：

    if step < warmup_steps:
        lr = peak_lr * step / warmup_steps
    else:
        lr = 衰减策略(step)

**为什么需要 warmup**：

1. **Adam 的二阶矩方差估计在初期极不稳定**——v 基于极少的样本，
   √v 可能非常小，导致实际步长 \`lr/√v\` 巨大，容易一步跳飞。
2. **大 batch 训练时梯度方向在初期变化剧烈**，小步长有助于稳定。
3. **残差分支的激活值初期可能很大**，小学习率避免发散。

Transformer 原论文（Attention Is All You Need）就使用了 warmup：
\`lr = d_model^(-0.5) · min(step^(-0.5), step · warmup_steps^(-1.5))\`

**常见 warmup 长度**：总步数的 1%~5%（如 1000~2000 步）。

## 三种主流衰减策略

**1. 余弦衰减（Cosine Decay）—— 最常用**

    progress = (step - warmup) / (total - warmup)
    lr = min_lr + 0.5 * (peak_lr - min_lr) * (1 + cos(π * progress))

特点：前期缓降、中期快速下降、后期趋于平缓。
LLaMA、GPT-3 等都使用余弦衰减（通常带 min_lr，如峰值的 10%）。

**2. 线性衰减（Linear Decay）**

    lr = peak_lr * (1 - progress)

简单直接，T5、部分 BERT 变体使用。

**3. 逆平方根衰减（Inverse Square Root）**

    lr = peak_lr / sqrt(progress)

衰减快，适合长训练。原版 Transformer 用这个变体。

## 学习率调度曲线对比

| 策略 | 前期 | 中期 | 后期 | 适用 |
| --- | --- | --- | --- | --- |
| 常数 | 平 | 平 | 平 | 短训练、微调 |
| 阶梯衰减 | 平 | 突降 | 突降 | 传统 CNN（ResNet） |
| 余弦 | 缓降 | 快降 | 趋平 | **大模型预训练首选** |
| 线性 | 缓降 | 匀速 | 趋平 | 简单场景 |
| 逆平方根 | 快降 | 慢降 | 极慢 | 长训练 |

<LrCurve name="cosine" />

<LrCurve name="invsqrt" />

## 实现要点

    def get_lr(step, base_lr, warmup, total, min_lr_ratio=0.1):
        if step < warmup:
            return base_lr * (step + 1) / warmup
        progress = (step - warmup) / max(1, total - warmup)
        progress = min(1.0, progress)
        min_lr = base_lr * min_lr_ratio
        return min_lr + 0.5 * (base_lr - min_lr) * (1 + math.cos(math.pi * progress))

**注意 \`step + 1\`**：如果从 0 开始乘，第 0 步 lr = 0 会让这一步完全无效。

## 微调时的调度差异

微调（尤其是 LoRA）通常：
- **warmup 更短或不需要**（预训练权重已经很稳定）；
- **用常数学习率 + 后期小幅衰减**即可；
- 学习率整体比预训练大 1~2 个数量级（LoRA 常用 1e-4~2e-4）。

> 记住一句：**预训练靠调度，微调靠学习率本身。**

<LrCurve />
`,
        tips: [
          {
            kind: 'interview',
            text: '「为什么需要 warmup」的关键答法：Adam 的二阶矩在初期估计不准，√v 很小会导致实际步长爆炸；小步长起步能稳住。',
          },
          {
            kind: 'leak',
            text: '大模型预训练用「线性 warmup + 余弦衰减到峰值 10%」是最稳妥的默认配置。',
          },
          {
            kind: 'pitfall',
            text: '余弦衰减记得设 min_lr，否则训练末期学习率趋近 0，后面几乎学不动。',
          },
        ],
        demos: [
          {
            title: '画出三种学习率调度曲线',
            lang: 'python',
            code: `import math

def cosine_lr(step, peak, warmup, total, min_ratio=0.1):
    if step < warmup:
        return peak * (step + 1) / warmup
    p = min(1.0, (step - warmup) / max(1, total - warmup))
    min_lr = peak * min_ratio
    return min_lr + 0.5 * (peak - min_lr) * (1 + math.cos(math.pi * p))

def linear_lr(step, peak, warmup, total):
    if step < warmup:
        return peak * (step + 1) / warmup
    p = min(1.0, (step - warmup) / max(1, total - warmup))
    return peak * (1 - p)

def inv_sqrt_lr(step, peak, warmup, total):
    if step < warmup:
        return peak * (step + 1) / warmup
    return peak * math.sqrt(warmup / (step + 1))

TOTAL, WARM = 200, 20
print(f"{'step':>5} | {'cosine':>8} | {'linear':>8} | {'inv_sqrt':>8}")
print("-" * 42)
for s in [0, 10, 20, 50, 100, 150, 199]:
    print(f"{s:>5} | {cosine_lr(s,1,WARM,TOTAL):>8.4f} | {linear_lr(s,1,WARM,TOTAL):>8.4f} | {inv_sqrt_lr(s,1,WARM,TOTAL):>8.4f}")

# 用字符画简易曲线
print("\\n学习率曲线（高度 = lr）：")
for name, fn in [("cosine", cosine_lr), ("linear", linear_lr), ("inv_sqrt", inv_sqrt_lr)]:
    line = "".join("█" if fn(s,1,WARM,TOTAL) > 0.5 else ("▓" if fn(s,1,WARM,TOTAL) > 0.2 else "░") for s in range(TOTAL))
    print(f"{name:>9} {line}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a2-c5-e1',
        type: 'single',
        difficulty: 2,
        question: '大模型训练需要 warmup 的主要原因是？',
        options: [
          { value: 'A', text: '节省显存' },
          { value: 'B', text: 'Adam 的二阶矩在训练初期估计不准，√v 很小导致实际步长过大' },
          { value: 'C', text: '加快数据加载' },
          { value: 'D', text: '减少参数量' },
        ],
        answer: 'B',
        explanation: '初期 v 基于极少数样本估计，√v 可能极小，使 lr/√v 巨大，容易一步跳飞。warmup 用小步长起步来稳住。',
        tags: ['warmup'],
      },
      {
        id: 'llm-a2-c5-e2',
        type: 'judge',
        difficulty: 2,
        question: '余弦衰减通常会设置一个 min_lr，避免训练末期学习率趋近 0。',
        answer: true,
        explanation: '若无下限，末期 lr→0 会让模型几乎不再更新。常见做法是衰减到峰值的 10%（LLaMA 就是如此）。',
        tags: ['余弦衰减'],
      },
      {
        id: 'llm-a2-c5-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于学习率调度，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'warmup 长度通常占总步数的 1%~5%' },
          { value: 'B', text: '大模型预训练常用「线性 warmup + 余弦衰减」' },
          { value: 'C', text: 'LoRA 微调通常warmup 更短或不需要' },
          { value: 'D', text: '学习率调度对最终效果几乎没有影响' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：学习率调度对收敛速度和最终效果影响显著，是大模型训练的关键配置之一。',
        tags: ['调度'],
      },
      {
        id: 'llm-a2-c5-e4',
        type: 'fill',
        difficulty: 3,
        question: '余弦衰减的学习率公式为 lr = min_lr + 0.5(peak - min_lr)(1 + cos(π·___))，括号内是训练进度（0~1）。',
        blanks: [['progress', 'p', '进度']],
        explanation: 'progress 从 0 到 1，cos(0)=1 时 lr=peak，cos(π)=-1 时 lr=min_lr，形成平滑的余弦下降曲线。',
        tags: ['余弦衰减'],
      },
      {
        id: 'llm-a2-c5-e5',
        type: 'code',
        difficulty: 3,
        question: '实现余弦学习率调度 `cosine_lr(step, peak_lr, warmup_steps, total_steps, min_ratio=0.1)`：\n\n- `step < warmup_steps`：线性升温 `peak_lr * (step+1) / warmup_steps`\n- 否则：`min_lr + 0.5*(peak-min_lr)*(1 + cos(π·progress))`，其中 `min_lr = peak_lr*min_ratio`，`progress = (step-warmup)/(total-warmup)`\n\n返回学习率（保留 6 位小数）。',
        starterCode: `import math

def cosine_lr(step, peak_lr, warmup_steps, total_steps, min_ratio=0.1):
    if step < warmup_steps:
        return round(peak_lr * (step + 1) / warmup_steps, 6)
    progress = ___
    min_lr = peak_lr * min_ratio
    return round(___, 6)


cosine_lr(0, 1.0, 10, 100)
`,
        setupCode: '',
        expectedOutput: '0.1（第一步为峰值的 1/10）',
        tests: `# warmup 阶段线性升温
assert abs(cosine_lr(0, 1.0, 10, 100) - 0.1) < 1e-6, "第 0 步应为峰值的 1/10"
assert abs(cosine_lr(9, 1.0, 10, 100) - 1.0) < 1e-6, "warmup 结束应达到峰值"
# 衰减阶段
assert abs(cosine_lr(100, 1.0, 10, 100) - 0.1) < 1e-6, "训练结束应降到 min_lr=0.1"
mid = cosine_lr(55, 1.0, 10, 100)
assert 0.1 < mid < 1.0, f"中间值应在 (0.1, 1.0)，实际 {mid}"
assert cosine_lr(55, 1.0, 10, 100) > cosine_lr(80, 1.0, 10, 100), "应单调递减"
`,
        answer: `import math

def cosine_lr(step, peak_lr, warmup_steps, total_steps, min_ratio=0.1):
    if step < warmup_steps:
        return round(peak_lr * (step + 1) / warmup_steps, 6)
    progress = min(1.0, (step - warmup_steps) / max(1, total_steps - warmup_steps))
    min_lr = peak_lr * min_ratio
    return round(min_lr + 0.5 * (peak_lr - min_lr) * (1 + math.cos(math.pi * progress)), 6)


cosine_lr(0, 1.0, 10, 100)`,
        explanation:
          '```python\nprogress = min(1.0, (step - warmup_steps) / max(1, total_steps - warmup_steps))\nmin_lr = peak_lr * min_ratio\nreturn round(min_lr + 0.5 * (peak_lr - min_lr) * (1 + math.cos(math.pi * progress)), 6)\n```\n\n**两个保护**：\`min(1.0, ...)\` 防止超出总步数时 progress>1；\`max(1, ...)\` 防止 warmup == total 时除零。\n\n注意 warmup 用 \`(step+1)/warmup\`，确保第 0 步不是 0（否则这一步白跑）。',
        tags: ['编程', '余弦衰减'],
      },
      {
        id: 'llm-a2-c5-e6',
        type: 'code',
        difficulty: 3,
        question: '生成完整的学习率序列：实现 `lr_schedule(total_steps, peak_lr, warmup_steps)`，返回长度为 `total_steps` 的列表，使用余弦衰减。\n\n然后返回该序列的**最大值**（应为 peak_lr）。',
        starterCode: `import math

def build_schedule(total_steps=50, peak_lr=3e-4, warmup_steps=5):
    lrs = []
    ___
    return lrs


build_schedule()
`,
        setupCode: '',
        expectedOutput: '50 个学习率，最大值为 peak_lr',
        tests: `seq = build_schedule(50, 3e-4, 5)
assert len(seq) == 50, f"长度应为 50，实际 {len(seq)}"
assert abs(max(seq) - 3e-4) < 1e-9, f"最大值应为 peak_lr=3e-4，实际 {max(seq)}"
assert seq[0] < seq[4], "warmup 阶段应递增"
assert seq[10] > seq[45], "衰减阶段应递减"
assert all(v > 0 for v in seq), "学习率应始终为正"
`,
        answer: `import math

def build_schedule(total_steps=50, peak_lr=3e-4, warmup_steps=5):
    lrs = []
    min_lr = peak_lr * 0.1
    for step in range(total_steps):
        if step < warmup_steps:
            lrs.append(peak_lr * (step + 1) / warmup_steps)
        else:
            progress = min(1.0, (step - warmup_steps) / max(1, total_steps - warmup_steps))
            lrs.append(min_lr + 0.5 * (peak_lr - min_lr) * (1 + math.cos(math.pi * progress)))
    return lrs


build_schedule()`,
        explanation:
          '```python\nmin_lr = peak_lr * 0.1\nfor step in range(total_steps):\n    if step < warmup_steps:\n        lrs.append(peak_lr * (step + 1) / warmup_steps)\n    else:\n        progress = min(1.0, (step - warmup_steps) / max(1, total_steps - warmup_steps))\n        lrs.append(min_lr + 0.5 * (peak_lr - min_lr) * (1 + math.cos(math.pi * progress)))\nreturn lrs\n```\n\n这是生产代码里最常见的写法，直接用于构造 PyTorch 的 LambdaLR。',
        tags: ['编程', '调度'],
      },
      {
        id: 'llm-a2-c5-e7',
        type: 'judge',
        difficulty: 3,
        question: 'LoRA 微调通常需要和预训练一样长的 warmup。',
        answer: false,
        explanation: 'LoRA 冻结了原模型，只训练少量适配器参数，训练本身很稳定，warmup 可以很短或省略。且 LoRA 学习率通常比预训练大 1~2 个数量级。',
        tags: ['LoRA'],
      },
      {
        id: 'llm-a2-c5-e8',
        type: 'open',
        difficulty: 4,
        question: '请解释 warmup 的必要性（从 Adam 优化器的角度），并说明余弦衰减相比常数学习率的优势，以及在什么情况下反而不该用余弦衰减。',
        referenceAnswer: `**一、warmup 的必要性（从 Adam 角度）**

Adam 的更新量是：

    Δw = η · m̂ / (√v̂ + ε)

- v 是梯度平方的指数移动平均，初始化为 0。
- 训练最初几步，**v 只基于极少数样本估计，严重偏小**。
- 于是 √v̂ 可能极小（甚至几个数量级小于真实梯度尺度），
  使得 Δw ≈ η · m̂ / 小量，**实际步长被放大几十倍**。
- 同时参数是随机初始化的，梯度方向本身也不可靠。

若此时用峰值学习率，极易一步跳出合理区域，表现为 loss spike 甚至 nan。
warmup 让学习率从极小值线性升至峰值，给 Adam 的二阶矩估计留出"热身"时间。

**二、余弦衰减相比常数学习率的优势**

1. **后期精细收敛**：训练末期步长很小，可在最优点附近稳定收敛，
   避免在最优解周围持续震荡导致最终 loss 偏高。
2. **平滑无突变**：相比阶梯衰减，余弦曲线连续可导，优化轨迹更平稳。
3. **前期保留较大步长**：余弦是"缓降—快降—趋平"，
   中期下降快，符合"先探索后精修"的直觉。
4. **可复现性好**：只需 warmup、total 两个参数，跨规模迁移方便。

**三、什么时候不该用余弦衰减**

1. **不知道训练总步数**（如持续训练、在线学习）——此时用常数学习率或逆平方根更合适。
2. **微调任务**：预训练权重已稳定，长时间余弦衰减会让学习率过早变小，
   可能欠拟合；短微调用常数或线性衰减更好。
3. **需要中途恢复训练（resume）**：余弦依赖 total_steps，
   若延长训练需要重新计算曲线。
4. **小数据集快速实验**：曲线带来的收益不明显，反而增加调参复杂度。

**结论**：预训练用「warmup + 余弦」是稳妥默认；微调与未知长度的训练用常数或线性更实际。`,
        rubric: [
          { point: '从 Adam 二阶矩初期估计不准、√v 过小导致步长爆炸解释 warmup', score: 3 },
          { point: '说明余弦衰减后期小步长利于精细收敛', score: 1 },
          { point: '指出余弦曲线平滑、无突变', score: 1 },
          { point: '举出微调/未知总步数等不适用场景', score: 2 },
        ],
        keywords: ['二阶矩', '√v', '步长爆炸', '精细收敛', '微调', '总步数'],
        explanation: '这道题把优化器原理和调度策略串起来，是理解"训练为什么这么设计"的关键。',
        tags: ['warmup', '调度', '面试'],
      },
    ],
  },
];
