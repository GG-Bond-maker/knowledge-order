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
## 训练的本质：调整参数让损失变小

前向传播算出损失 L，接下来要回答一个问题：**每个参数该往哪个方向调、调多少？**
答案就是梯度 ∂L/∂w。反向传播（Backpropagation）就是**高效计算所有参数梯度**的算法。

## 计算图：把计算拆成基本运算

任何一个神经网络都能表示成一张有向无环图（DAG），节点是运算，边是数据流。

以 \`z = (x + y) * w\` 为例：

    x ──┐
        ├─→ [ + ] ─→ a ──┐
    y ──┘                ├─→ [ × ] ─→ z
                    w ───┘

## 链式法则：局部梯度逐层相乘

要求 ∂z/∂x，沿路径把**局部梯度**乘起来：

    ∂z/∂a = w          （乘法节点对第一个输入）
    ∂a/∂x = 1          （加法节点对第一个输入）
    ∂z/∂x = (∂z/∂a) · (∂a/∂x) = w · 1 = w

**这就是链式法则**。多层网络就是反复应用它，从输出往输入"反向"传。

## 反向传播的两个阶段

**前向阶段**：算每层的输出，并把中间结果（激活值）**缓存**起来。

**反向阶段**：从损失开始，逐层往回算梯度，用缓存的激活值计算局部梯度。

    # 前向
    a = x @ W1 + b1
    h = relu(a)
    y = h @ W2 + b2
    loss = mse(y, target)

    # 反向（自动微分）
    dloss/dy   = 2*(y - target)/n
    dloss/dW2  = h.T @ (dloss/dy)
    dloss/dh   = (dloss/dy) @ W2.T
    dloss/da   = dloss/dh * (a > 0)     # ReLU 的导数
    dloss/dW1  = x.T @ dloss/da

**关键观察**：每一层的梯度计算只依赖
1. 本层的输入（前向时缓存）
2. 传给本层的上游梯度

所以可以逐层独立计算，这就是反向传播能高效实现的原因。

## 为什么反向传播比数值微分快

数值微分：对每个参数单独做 \`(L(w+ε) - L(w-ε)) / 2ε\`，复杂度 O(参数数 × 前向成本)。
一个 7B 模型有 70 亿参数，根本不可能。

反向传播：**一次前向 + 一次反向，就能得到全部参数的梯度**，
总成本约等于 3 倍前向传播（前向 1 + 反向 2）。

## 自动微分（Autograd）

深度学习框架把每个操作都记录成计算图节点，并在完成后自动反向遍历。
PyTorch 的 \`loss.backward()\` 就是这个过程。

两种模式：
- **前向模式（Forward-mode）**：适合输入少、输出多；
- **反向模式（Reverse-mode）**：适合输入多、输出少——**神经网络正是这种情况**（几亿参数 → 1 个损失）。

<BackpropCircuit />
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
## 问题从哪来

多层网络的反向传播是**连乘**：

    ∂L/∂W₁ = ∂L/∂hₙ · (∂hₙ/∂hₙ₋₁) · … · (∂h₂/∂h₁) · (∂h₁/∂W₁)

如果每层的局部梯度都小于 1，连乘 n 次后**指数级趋近 0**（梯度消失）；
如果都大于 1，则**指数级爆炸**。

## 梯度消失

典型原因：
1. **sigmoid / tanh 的导数最大只有 0.25 / 1.0**，多层连乘迅速趋零；
2. **深层的 RNN 沿时间步反传**，同样连乘。

后果：**靠近输入的层几乎学不动**，模型只学到浅层特征。

sigmoid 导数：σ'(x) = σ(x)(1-σ(x))，最大值 0.25（在 x=0 处）。
10 层连乘：0.25¹⁰ ≈ 9.5×10⁻⁷ —— 几乎为零。

## 梯度爆炸

原因：权重初始化过大、深网络、学习率过高。
后果：
- 损失变成 \`nan\`；
- 参数瞬间飞到天文数字。

## 四类解决方案

**1. 换激活函数**

ReLU：f(x) = max(0, x)，正区间导数恒为 1，不会衰减。
后来又有 GELU、SiLU/Swish，在 Transformer 中更常用。

**2. 残差连接（ResNet / Transformer）**

    y = x + F(x)

反向时 ∂y/∂x = 1 + ∂F/∂x，**恒等路径保证了梯度至少为 1**，
梯度可以直接"短路"回传到任意浅层。这是训练上百层网络的关键。

<Diagram type="arch" name="transformer-block" />

**3. 归一化**

LayerNorm / BatchNorm 把激活值约束在稳定范围内，
使局部梯度的量级可控。

**4. 梯度裁剪（Gradient Clipping）**

直接对梯度做限幅：

    g_norm = ||g||
    if g_norm > max_norm:
        g = g * (max_norm / g_norm)

**这是大模型训练的标配**，常见 max_norm = 1.0。

## 还有一个：更好的初始化

 Xavier / He 初始化让每层的输出方差保持一致：

- Xavier（适合 tanh）：W ~ N(0, 2/(fan_in + fan_out))
- He（适合 ReLU）：W ~ N(0, 2/fan_in)

Transformer 常用 \`std = 0.02\` 的正态初始化，并对残差分支的输出层额外缩放。

## 诊断方法

    # 监控每层梯度范数
    for name, p in model.named_parameters():
        if p.grad is not None:
            print(name, p.grad.norm().item())

- 深层梯度远小于浅层 → 梯度消失；
- 某层梯度突然极大或为 nan → 梯度爆炸/学习率太高。

<VanishingGradientDemo />
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
## 基本更新规则

    w ← w - η · ∂L/∂w

- ∂L/∂w 是**方向**（梯度的反方向是损失下降最快的方向）
- η 是**步长**（学习率）

就这么一个公式，训练的全部艺术都在"怎么算梯度"和"η 取多少"。

## 三种变体

| 方式 | 每次用多少数据 | 特点 |
| --- | --- | --- |
| 批量梯度下降（BGD） | 全部训练集 | 梯度准确、方向稳；但一次更新极慢，无法处理大数据 |
| 随机梯度下降（SGD） | 单条样本 | 更新极快但梯度噪声大，loss 剧烈抖动 |
| **小批量梯度下降（Mini-batch）** | 一个 batch（常见 32~1024） | **两者的折中，实践标准** |

**为什么 mini-batch 最好**：

1. 梯度是 batch 内样本的平均，噪声比单样本小得多；
2. GPU 并行计算一个 batch 与计算单样本时间接近，吞吐大幅提升；
3. 适度的噪声反而有助于跳出局部极小。

**大模型的 batch size**：常见 百万 token 级别的全局 batch（如 4M tokens），
通过**梯度累积**（gradient accumulation）在有限显存下模拟大 batch：

    for i, micro_batch in enumerate(loader):
        loss = model(micro_batch) / accum_steps
        loss.backward()          # 梯度累加
        if (i + 1) % accum_steps == 0:
            optimizer.step()
            optimizer.zero_grad()

## 学习率：最重要的超参数

**太小**：收敛极慢，可能停在平台期。
**太大**：loss 震荡甚至发散（变成 nan）。

典型量级：
- 全参微调：1e-5 ~ 5e-5
- LoRA 微调：1e-4 ~ 2e-4（比全参高约 10 倍）
- 从头预训练：1e-4 ~ 3e-4（配合 warmup）

## 损失曲线怎么读

| 现象 | 诊断 |
| --- | --- |
| loss 平稳下降 | 健康 |
| loss 震荡剧烈 | 学习率偏大 / batch 偏小 |
| loss 几乎不动 | 学习率偏小 / 梯度消失 / 数据有问题 |
| loss 突然变 nan | 学习率过大 / 梯度爆炸 / 数值溢出 |
| 训练 loss 降、验证 loss 升 | 过拟合 |

## 局部极小 vs 鞍点

在**高维空间**中，真正的局部极小其实很少——绝大多数"卡住"的点是**鞍点**（某些方向上升、某些方向下降）。
梯度在这些点几乎为 0，会让人误以为收敛了。

这也是为什么实践中：
- 加动量（Momentum）能冲过鞍点；
- 小 batch 的梯度噪声有助于逃离。

## 学习率与 batch size 的关系

经验规律：**batch size 翻倍，学习率大致也可翻倍**（线性缩放规则），
但超过临界 batch size 后收益递减。

这就是为什么大模型训练会先做"学习率扫描"（LR sweep）：
用小规模实验找出最优学习率，再迁移到大规模训练。

<OptimizerTrajectoryVisualizer />
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
## 朴素 SGD 的两个问题

**问题 1：不同参数的最优步长差异巨大**

如果某个参数梯度一直很大，另一个一直很小，用同一个学习率就会出现"大的震荡、小的不动"。

**问题 2：在"峡谷"地形中来回震荡**

损失曲面在某个方向很陡、另一个方向很平（呈狭长峡谷状）时，
SGD 会沿陡的方向来回弹跳，前进缓慢。

## 方案一：动量（Momentum）

借鉴物理中的惯性，累加历史梯度：

    v ← β·v + (1-β)·g
    w ← w - η·v

β 常取 0.9。效果：

- 方向一致的维度，动量不断累积，**加速前进**；
- 来回震荡的维度，正负抵消，**抑制震荡**。

## 方案二：RMSProp（自适应学习率）

用梯度平方的指数移动平均来**缩放每个参数的学习率**：

    s ← β·s + (1-β)·g²
    w ← w - η·g / (√s + ε)

梯度一直很大的参数，s 大 → 实际步长变小；梯度小的参数，s 小 → 有效步长相对变大。

## Adam = Momentum + RMSProp

Adam（Adaptive Moment Estimation）同时维护**一阶矩**（梯度的均值）和**二阶矩**（梯度平方的均值）：

    m ← β₁·m + (1-β₁)·g          # 一阶矩（动量）
    v ← β₂·v + (1-β₂)·g²         # 二阶矩（自适应）
    m̂ = m / (1 - β₁ᵗ)            # 偏差修正
    v̂ = v / (1 - β₂ᵗ)
    w ← w - η · m̂ / (√v̂ + ε)

**为什么需要偏差修正**：m 和 v 初始化为 0，前几步会严重偏小（比如第一步 m = 0.1g），
除以 \`1-βᵗ\` 可以校正这个偏差。**这是 Adam 的关键细节。**

**默认超参**：β₁=0.9、β₂=0.999、ε=1e-8，η 需要针对任务调。

## AdamW：解耦权重衰减

Adam 原本把 L2 正则混进梯度里：

    g ← g + λ·w        # L2 正则
    ... Adam 更新 ...

但 Adam 会对梯度做自适应缩放，导致**正则项的强度也被缩放**，效果被削弱。

**AdamW** 把权重衰减**直接作用于参数**：

    w ← w - η·(m̂/(√v̂+ε)) - η·λ·w

这样正则强度与自适应学习率解耦，效果更好。
**现在几乎所有大模型都用 AdamW。**

## 为什么大模型用 Adam 而不是 SGD

1. **不同参数的梯度尺度差异极大**（embedding vs LayerNorm），自适应学习率解决了这个问题；
2. **收敛更快**，不需要精细调参；
3. **对稀疏梯度友好**（embedding 中大量 token 不出现时梯度为 0）。

**代价**：Adam 需要为每个参数额外存 m 和 v 两份状态，**优化器状态占用 2 倍参数显存**。
这就是为什么 7B 模型用 Adam 全参训练需要大量显存。

<OptimizerTrajectoryVisualizer />
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
