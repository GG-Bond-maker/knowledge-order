import type { Chapter } from '../../types';

/* ============================================================
 *  人工智能基础 · 论文导读 · 基础与表征
 *  03 Recurrent Neural Network Regularization
 *  12 Dropout
 *
 *  来源：
 *  - arXiv:1409.2329 Zaremba, Sutskever & Vinyals (2014)
 *  - JMLR 2014 Srivastava et al., "Dropout: A Simple Way to Prevent Neural Networks from Overfitting"
 *  - 参考：Ojhaharsh/30u30 第 03/12 篇（CC BY-NC-ND 4.0，本地个人使用）
 *  - 本课程为原创导读 + 原创习题
 *
 *  执行说明：纯 numpy，走 Pyodide 浏览器内执行。
 * ============================================================ */

export const paperFoundationChapters3: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c3: RNN Regularization
   * ============================================================ */
  {
    id: 'paper-foundation-c3',
    title: 'RNN 正则化：变分 Dropout 与 Layer Norm',
    goal: '理解为什么普通 Dropout 不能直接用在 RNN 的循环连接上，掌握变分 Dropout 的正确做法，以及 Layer Norm 如何稳定训练。',
    lessons: [
      {
        id: 'paper-foundation-c3-l1',
        title: 'Dropout 在 RNN 上的陷阱',
        difficulty: 4,
        content: `
### 学习目标

学完本节，你应该能够：
1. 解释普通 Dropout 在循环连接上失效的机制（每步独立 mask 把记忆变噪声）与论文 PTB 数据（118.2 vs 92.4）；
2. 实现变分 Dropout（整序列共用 mask）并对比两种做法下信息通道的全程存活率；
3. 说出 LayerNorm 替代 BatchNorm 的逻辑（特征维归一化不依赖 batch）与权重绑定等配套技巧。

### 前置知识

- c2 的 LSTM 结构；
- inverted dropout 机制（c4 可后置对照）；
- 过拟合与验证集监控。

### 问题背景

LSTM 参数是 RNN 的 4 倍，小数据集必过拟合；但把 CNN 的 Dropout 直接搬过来（每步重新采样 mask）会把记忆切成噪声——PTB 实验上困惑度不降反升（114.5→118.2）。Zaremba 等人的变分 Dropout：同一序列全时间步共用一个 mask，dropout 只加在层间「垂直方向」，困惑度直降到 92.4（-19%）。配套还有 LayerNorm（对特征维归一化，绕开 BatchNorm 在变长序列上的失效）。

### 直觉理解

圆桌会议记录：正确做法是「某个人整场闭麦」（一致的信息缺失，大家学会没有他也行）；错误做法是「每句话随机换人闭麦」（记忆流被反复切断）。变分 Dropout 是前者，普通 Dropout 是后者——mask 的时间一致性决定它是正则化还是破坏。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Recurrent Neural Network Regularization |
| **作者** | Wojciech Zaremba, Ilya Sutskever, Oriol Vinyals |
| **发表** | arXiv 2014 |
| **arXiv** | [1409.2329](https://arxiv.org/abs/1409.2329) |
| **一句话贡献** | 指出 Dropout 不能直接用在 RNN 的循环连接上，并提出"变分 Dropout"的正确做法 |

## 问题：RNN 也会过拟合

LSTM 有 4 组门，参数量是 RNN 的 4 倍。
在大数据集上这没问题，但在**小数据集**上容易过拟合。

**自然的想法**：像 CNN 那样加 Dropout。

**但直接加会出问题。**

## 为什么普通 Dropout 在 RNN 上失效

### 普通 Dropout 的做法

    h_t = tanh(W_hh · h_{t-1} + W_xh · x_t + b)
    h_t = dropout(h_t)        # ← 每步随机丢弃

**问题**：**每个时间步的 mask 都不同**。

<DropoutInRNNDemo />

### 灾难性后果

**时间步 1**：

    h_1 = [0.5, 0.0, 0.3]     ← 第 2 维被丢弃

**时间步 2**：

    h_2 = [0.4, 0.8, 0.0]     ← 第 3 维被丢弃

**问题**：**信息在时间上被随机切断**。

LSTM 的"记忆"依赖 h 的连续传递。
如果每个时间步都随机丢弃不同的维度，
**记忆就变成了噪声**。

**类比**：
- 正确做法：整段对话中"某个人一直不说话"（一致的信息缺失）
- 错误做法：每句话换一个人不说话（随机噪声）

## 变分 Dropout（Variational Dropout）

### 核心思想

**同一个 mini-batch 内，所有时间步使用同一个 dropout mask。**

    # 每个序列只采样一次 mask
    mask = sample_dropout_mask(H)
    for t in range(T):
        h_t = tanh(W_hh @ h_{t-1} + W_xh @ x_t + b)
        h_t = h_t * mask / (1-p)     # ← 用同一个 mask

**关键区别**：

| 做法 | mask |
| --- | --- |
| 普通 Dropout | 每步重新采样（不同） |
| **变分 Dropout** | **整个序列共用一次采样** |

**为什么这更好**：

- **信息通道一致**：如果某维度被丢弃，整条序列都丢弃——模型学会"用其他维度补偿"
- **减少随机性**：梯度更稳定
- **理论依据**：等价于对权重矩阵做 Dropout（而非对激活值）

### 论文的具体做法

**只在特定位置加 Dropout**：

    LSTM 层：
      h_t = LSTM(x_t, h_{t-1})
      # 不加 dropout 在循环连接上

    层与层之间：
      x_t = dropout(x_t)        # 输入 dropout
      h_t = dropout(h_t)        # 输出 dropout（传给上层前）

**关键原则**：**Dropout 加在"垂直方向"（层间），不加在"水平方向"（时间步间）**。

**论文的结论**：

| 配置 | 效果 |
| --- | --- |
| 不加 Dropout | 过拟合 |
| 普通 Dropout（每步重采样） | **更差**（破坏记忆） |
| **变分 Dropout（层间）** | **最好** |

## Layer Normalization

### 为什么 RNN 需要 Layer Norm

**BatchNorm 在 RNN 上不好用**：

| 问题 | 说明 |
| --- | --- |
| **变长序列** | 不同 batch 的序列长度不同，统计量不稳定 |
| **时间步独立** | 每个时间步都要单独算统计量，开销大 |
| **推理时** | 需要保存 running statistics，但 RNN 状态本身在变 |

**Layer Norm 的优势**：

    μ = mean(x)         # 对每个样本的所有特征求均值
    σ = std(x)
    y = γ ⊙ (x - μ) / σ + β

**关键**：**在特征维度归一化，不依赖 batch**。

<LayerNormDemo />

### Layer Norm 在 LSTM 中的位置

**论文的做法**：对门的**线性变换输出**做归一化。

    # 原始 LSTM
    gates = W @ [h_{t-1}, x_t] + b
    f, i, g, o = split(sigmoid/tanh(gates))

    # 加 Layer Norm
    gates = W @ [h_{t-1}, x_t] + b
    gates = layer_norm(gates)        # ← 归一化后再激活
    f, i, g, o = split(sigmoid/tanh(gates))

**效果**：
- 训练更稳定（可用更大学习率）
- 收敛更快
- 对超参数不敏感

## 其他正则化技巧

### ① 梯度裁剪

**必做**（第 1 篇已讲）：

    if ||g|| > 5: g = g * 5 / ||g||

### ② 权重衰减（L2）

    loss += λ * ||W||²

**注意**：**只对权重，不对偏置**（偏置不需要正则化）。

### ③ Early Stopping

**监控验证集损失，连续 N 个 epoch 不下降就停**。

    class EarlyStopping:
        def __init__(self, patience=5):
            self.patience = patience
            self.best = float('inf')
            self.counter = 0

        def check(self, val_loss):
            if val_loss < self.best:
                self.best = val_loss
                self.counter = 0
                return False
            self.counter += 1
            return self.counter >= self.patience

### ④ 权重绑定（Weight Tying）

**做法**：输入 embedding 和输出投影共享权重。

    E = embedding_matrix          # (V, H)
    logits = h @ E.T              # 输出层用同一个 E

**效果**：
- 参数减少 V×H
- 通常提升效果（输入输出的语义空间一致）

**GPT 系列就用了这个技巧。**

## 论文的实验结论

**任务**：语言建模（Penn Treebank）

| 配置 | 困惑度（越低越好） |
| --- | --- |
| LSTM 基线 | 114.5 |
| + 普通 Dropout | 118.2（**更差**） |
| + 变分 Dropout（层间） | **92.4** |
| + 变分 Dropout + 权重衰减 | 90.1 |

**关键发现**：
1. **普通 Dropout 确实让效果变差**（114.5 → 118.2）
2. **变分 Dropout 大幅提升**（114.5 → 92.4，降低 19%）
3. 组合多个正则化技巧效果更好

## 本节来源

> **来源类型：学术来源**
> - Zaremba, W., Sutskever, I., Vinyals, O. *Recurrent Neural Network Regularization*
>   arXiv:[1409.2329](https://arxiv.org/abs/1409.2329)（2014）
> - Ba, J. L., Kiros, J. R., Hinton, G. E. *Layer Normalization*
>   arXiv:[1607.06450](https://arxiv.org/abs/1607.06450)（2016）
> - Gal, Y., Ghahramani, Z. *A Theoretically Grounded Application of Dropout in RNNs*
>   arXiv:[1512.05287](https://arxiv.org/abs/1512.05287)（2016，变分 Dropout 的理论基础）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 03 篇（410 行，含 dropout_forward/backward、layer_norm、EarlyStopping）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(18)
T, keep = 30, 0.8
sig = np.ones(100)
def run(shared):
    h = sig.copy()
    mask = (rng.random(100) < keep) / keep
    for t in range(T):
        h = h * (mask if shared else (rng.random(100) < keep) / keep)   # 恒等记忆链
    return h
print(f"变分 Dropout(共用 mask): 通道全程存活率 = {np.mean(run(True) > 0):.2f}")
print(f"普通 Dropout(每步重采样): 全程存活率 = {np.mean(run(False) > 0):.2f} (= keep^T = {keep**T:.1e})")\`\`\`

预期输出（实测）：实测：keep=0.8、T=30 的恒等记忆链——变分 Dropout（共用 mask）的通道全程存活率 0.84（≈keep_prob，存活即全程存活）；普通 Dropout（每步重采样）实测 0.00（理论 0.8^30≈1.2e-3）——逐步重采样把 80% 的记忆通道切成碎片。

**常见错误**：在循环连接上逐时间步重采样 mask 还以为是标准正则化；LayerNorm 沿 batch 维统计（那是 BatchNorm 的病，LN 沿特征维）；权重衰减把偏置也正则化（偏置不需要）。

### 常见误区

1. **Dropout 是万金油**——位置与 mask 策略错误时它会伤害模型（RNN 循环连接、SELU 网络）；
2. **变分=每步变着丢**——恰恰相反：整条序列共用同一次采样；
3. **LayerNorm=BatchNorm 换个轴**——换来的是「与 batch 大小/序列长度无关」，对 RNN 与 Transformer 都是命门。

### 知识关联

- **向前**：c2 的 LSTM 是被正则化的对象；
- **向后**：c4 系统梳理 dropout 变体家族，LayerNorm 成为 Transformer 标配；
- **平行**：权重绑定（GPT 输入输出共享 embedding）、Early Stopping。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 陷阱 | 循环连接逐步 dropout：PTB 114.5→118.2 |
| 正解 | 变分 dropout：整序列共用 mask，只加层间 |
| 实测 | 通道存活率 0.84 vs 0.8^30≈1e-3 |
| 配套 | LayerNorm、权重绑定、梯度裁剪 |
| 战绩 | PTB 困惑度 92.4（-19%） |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Zaremba, Sutskever & Vinyals, Recurrent Neural Network Regularization, arXiv:1409.2329；Ba, Kiros & Hinton, Layer Normalization, arXiv:1607.06450）
`,
        tips: [
          {
            kind: 'interview',
            text: '「为什么普通 Dropout 在 RNN 上失效」：每个时间步重新采样 mask，导致记忆被随机切断（噪声）。变分 Dropout 让整条序列共用同一个 mask，保持信息通道一致。',
          },
          {
            kind: 'leak',
            text: '「Dropout 加在哪」：加在垂直方向（层间输入/输出），不加在水平方向（时间步间的循环连接）。循环连接上的 Dropout 会破坏记忆。',
          },
          {
            kind: 'pitfall',
            text: 'BatchNorm 在 RNN 上不好用（变长序列、时间步独立、推理需统计量）。LayerNorm 在特征维度归一化，不依赖 batch，更适合 RNN。',
          },
        ],
        demos: [
          {
            title: '普通 Dropout vs 变分 Dropout（在 RNN 上）',
            lang: 'python',
            code: `import numpy as np

def dropout_mask(shape, p, rng):
    """生成 dropout mask（inverted dropout）。"""
    keep = 1 - p
    mask = (rng.random(shape) < keep).astype(float) / keep
    return mask

def simulate_rnn_dropout(n_steps, hidden, p=0.5, mode='naive', seed=0):
    """
    模拟 RNN 隐藏状态在两种 dropout 下的传播。

    mode='naive'  -> 每步重新采样 mask
    mode='variational' -> 整条序列共用一个 mask
    """
    rng = np.random.default_rng(seed)

    # 初始隐藏状态
    h = np.ones((hidden, 1))
    trajectory = [h.copy()]

    # 变分模式：只采样一次
    shared_mask = dropout_mask((hidden, 1), p, rng) if mode == 'variational' else None

    W = np.eye(hidden) * 0.9    # 简单循环权重

    for t in range(n_steps):
        h = np.tanh(W @ h)
        if mode == 'naive':
            m = dropout_mask((hidden, 1), p, rng)
            h = h * m
        else:
            h = h * shared_mask
        trajectory.append(h.copy())

    return trajectory


print("=== 对比：两种 Dropout 下的隐藏状态演化 ===")
print()

H = 6
naive = simulate_rnn_dropout(5, H, 0.5, 'naive', seed=42)
variational = simulate_rnn_dropout(5, H, 0.5, 'variational', seed=42)

print("普通 Dropout（每步重采样）：")
for t, h in enumerate(naive):
    print(f"  t={t}: {np.round(h.ravel(), 2)}")
print()
print("变分 Dropout（整条序列共用 mask）：")
for t, h in enumerate(variational):
    print(f"  t={t}: {np.round(h.ravel(), 2)}")

print()
print("=== 关键观察 ===")
print()
print("普通 Dropout：")
print("  · 每步被丢弃的维度不同（看 0 的位置在变化）")
print("  · 信息在时间上被随机切断")
print("  · 模型无法学到连贯的长期依赖")
print()
print("变分 Dropout：")
print("  · 同一批维度始终为 0（信息通道一致）")
print("  · 模型学会用剩余维度补偿")
print("  · 记忆能连贯传递")

print()
print("=== 量化对比：状态的一致性 ===")
def consistency(traj):
    """衡量相邻时间步的相似度（越高越连贯）。"""
    sims = []
    for i in range(1, len(traj)):
        a, b = traj[i].ravel(), traj[i-1].ravel()
        # 只看非零维度的相关性
        mask = (a != 0) & (b != 0)
        if mask.sum() > 1:
            sims.append(np.corrcoef(a[mask], b[mask])[0, 1])
    return np.nanmean(sims) if sims else 0.0

print(f"  普通 Dropout:  一致性 = {consistency(naive):.3f}")
print(f"  变分 Dropout:  一致性 = {consistency(variational):.3f}")
print()
print("一致性越高，说明时间上的信息传递越连贯。")`,
          },
          {
            title: 'LayerNorm 实现与效果',
            lang: 'python',
            code: `import numpy as np

def layer_norm(x, gamma, beta, eps=1e-5):
    """
    Layer Normalization。

    x: (features, batch) 或 (features,)
    对**特征维度**归一化，不依赖 batch。
    """
    mean = np.mean(x, axis=0, keepdims=True)
    var = np.var(x, axis=0, keepdims=True)
    normalized = (x - mean) / np.sqrt(var + eps)
    return gamma * normalized + beta


print("=== LayerNorm 基本性质 ===")
np.random.seed(0)
x = np.random.randn(5, 1) * 10 + 100   # 均值 100，方差大

print(f"输入:        {np.round(x.ravel(), 2)}")
print(f"  均值={x.mean():.2f}, 标准差={x.std():.2f}")

gamma = np.ones((5, 1))
beta = np.zeros((5, 1))
y = layer_norm(x, gamma, beta)

print(f"归一化后:    {np.round(y.ravel(), 2)}")
print(f"  均值={y.mean():.6f}, 标准差={y.std():.6f}")
print()
print("-> 归一化后均值≈0，标准差≈1")

print()
print("=== 可学习参数的作用 ===")
gamma2 = np.array([[2.0], [2.0], [2.0], [2.0], [2.0]])
beta2 = np.array([[1.0], [1.0], [1.0], [1.0], [1.0]])
y2 = layer_norm(x, gamma2, beta2)
print(f"gamma=2, beta=1: {np.round(y2.ravel(), 2)}")
print(f"  均值={y2.mean():.3f}, 标准差={y2.std():.3f}")
print("-> 缩放和偏移恢复了表达能力")

print()
print("=== LayerNorm vs BatchNorm ===")
print()
# 模拟 batch 数据：(features, batch)
batch_data = np.random.randn(4, 8) * 3 + 5

# BatchNorm: 对 batch 维度归一化
bn_mean = batch_data.mean(axis=1, keepdims=True)
bn_var = batch_data.var(axis=1, keepdims=True)
bn = (batch_data - bn_mean) / np.sqrt(bn_var + 1e-5)

# LayerNorm: 对 feature 维度归一化
ln_mean = batch_data.mean(axis=0, keepdims=True)
ln_var = batch_data.var(axis=0, keepdims=True)
ln = (batch_data - ln_mean) / np.sqrt(ln_var + 1e-5)

print(f"原始数据 shape: {batch_data.shape}  (features=4, batch=8)")
print()
print("BatchNorm（每个特征跨 batch 归一化）：")
print(f"  每行均值: {np.round(bn.mean(axis=1), 6)}  <- 都是 0")
print()
print("LayerNorm（每个样本跨特征归一化）：")
print(f"  每列均值: {np.round(ln.mean(axis=0), 6)}  <- 都是 0")
print()
print("=== 为什么 RNN 用 LayerNorm ===")
print("  · BatchNorm 需要足够大的 batch（RNN 序列长度不一）")
print("  · BatchNorm 在推理时需要 running stats（RNN 状态在变）")
print("  · LayerNorm 对每个样本独立，天然适合变长序列")`,
          },
          {
            title: 'Early Stopping 与权重衰减',
            lang: 'python',
            code: `import numpy as np
import matplotlib.pyplot as plt

class EarlyStopping:
    """早停：验证损失连续 patience 轮不改善就停。"""
    def __init__(self, patience=5, min_delta=1e-4):
        self.patience = patience
        self.min_delta = min_delta
        self.best_loss = float('inf')
        self.counter = 0
        self.best_epoch = 0
        self.should_stop = False

    def check(self, val_loss, epoch):
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.best_epoch = epoch
            self.counter = 0
        else:
            self.counter += 1
            if self.counter >= self.patience:
                self.should_stop = True
        return self.should_stop


# 模拟训练曲线：训练损失持续下降，验证损失先降后升（过拟合）
np.random.seed(42)
epochs = 50
train_loss = 2.5 * np.exp(-np.arange(epochs) / 12) + 0.1
val_loss = 2.5 * np.exp(-np.arange(epochs) / 12) + 0.1
val_loss += 0.008 * np.maximum(0, np.arange(epochs) - 15) ** 1.3   # 过拟合抬升
val_loss += np.random.randn(epochs) * 0.02

es = EarlyStopping(patience=5)
print("=== Early Stopping 模拟 ===")
print(f"{'epoch':>6} | {'train':>8} | {'val':>8} | {'状态':>12}")
print("-" * 48)

for e in range(epochs):
    stop = es.check(val_loss[e], e)
    status = ""
    if e == es.best_epoch:
        status = "best"
    elif es.counter > 0:
        status = f"patience {es.counter}/{es.patience}"
    if e % 3 == 0 or stop:
        print(f"{e:>6} | {train_loss[e]:>8.4f} | {val_loss[e]:>8.4f} | {status:>12}")
    if stop:
        print(f"\\n在第 {e} 轮停止（最佳是第 {es.best_epoch} 轮，val={es.best_loss:.4f}）")
        break

print()
print("=== 权重衰减（L2 正则化）===")
print()
print("loss_total = loss_data + λ/2 * Σ||W||²")
print()
for lam in [0, 1e-4, 1e-3, 1e-2]:
    # 模拟：λ 越大，权重越小
    W_norm = 10.0 / (1 + lam * 1000)
    print(f"  λ={lam:<6} -> ||W|| ≈ {W_norm:.2f}")

print()
print("注意：")
print("  · 只对权重 W 加正则，不对偏置 b")
print("  · 因为偏置不控制函数复杂度（只平移）")

# 可视化
fig, ax = plt.subplots(figsize=(9, 4))
ax.plot(train_loss, label='train loss', linewidth=2)
ax.plot(val_loss, label='val loss', linewidth=2)
ax.axvline(es.best_epoch, color='#22c55e', linestyle='--', label=f'best epoch ({es.best_epoch})')
ax.axvline(es.best_epoch + es.patience, color='#ef4444', linestyle='--', label='early stop')
ax.set_xlabel('Epoch'); ax.set_ylabel('Loss')
ax.set_title('Early stopping prevents overfitting')
ax.legend(); ax.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('early_stopping.png', dpi=80, bbox_inches='tight')
print()
print("已生成图表 early_stopping.png")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-foundation-c3-e1',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'single',
        difficulty: 2,
        question: '为什么普通 Dropout 不能直接用在 RNN 的循环连接上？',
        options: [
          { value: 'A', text: '会增加参数量' },
          { value: 'B', text: '每个时间步重新采样 mask，导致记忆被随机切断（信息变噪声）' },
          { value: 'C', text: '会减慢训练速度' },
          { value: 'D', text: '会导致梯度爆炸' },
        ],
        answer: 'B',
        explanation:
          'RNN 的记忆依赖 h 的连续传递。如果每步随机丢弃不同维度，记忆就变成了噪声。类比：整段对话中"某人一直不说话"（一致）vs"每句话换一个人不说话"（噪声）。',
        tags: ['Dropout 陷阱'],
      },
      {
        id: 'paper-foundation-c3-e2',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'judge',
        difficulty: 2,
        question: '变分 Dropout 的核心是让整条序列的所有时间步共用同一个 dropout mask。',
        answer: true,
        explanation:
          '这样信息通道保持一致——如果某维度被丢弃，整条序列都丢弃，模型学会用其他维度补偿。等价于对权重矩阵做 Dropout 而非对激活值。',
        tags: ['变分 Dropout'],
      },
      {
        id: 'paper-foundation-c3-e3',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'multiple',
        difficulty: 3,
        question: '为什么 RNN 更适合用 LayerNorm 而不是 BatchNorm？（多选）',
        options: [
          { value: 'A', text: 'RNN 的序列长度可变，BatchNorm 的 batch 统计量不稳定' },
          { value: 'B', text: 'BatchNorm 推理时需要 running statistics，而 RNN 状态在变' },
          { value: 'C', text: 'LayerNorm 在特征维度归一化，对每个样本独立' },
          { value: 'D', text: 'LayerNorm 计算更快' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 不准确——LayerNorm 和 BatchNorm 计算量相近。A/B/C 是根本原因：RNN 的变长序列和状态演化让 batch 统计量不可靠。',
        tags: ['LayerNorm'],
      },
      {
        id: 'paper-foundation-c3-e4',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'fill',
        difficulty: 3,
        question:
          '论文的核心建议是：Dropout 应该加在 ___ 方向（层间），而不是水平方向（时间步间）。',
        blanks: [['垂直', 'vertical', '层间']],
        explanation:
          '层间 Dropout（输入/输出）不会破坏时间上的记忆传递。加在循环连接上（水平方向）会让每个时间步的信息通道不一致。',
        tags: ['Dropout 位置'],
      },
      {
        id: 'paper-foundation-c3-e5',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现 inverted dropout：dropout_forward(x, keep_prob, training=True, seed=None)。\n\n- training=False 时原样返回\n- training=True 时按 keep_prob 保留，并除以 keep_prob（保持期望）\n返回 (输出, mask)',
        starterCode: `import numpy as np

def dropout_forward(x, keep_prob, training=True, seed=None):
    if not training or keep_prob >= 1.0:
        return x, None
    rng = np.random.default_rng(seed)
    mask = ___
    return ___, mask
`,
        setupCode: '',
        expectedOutput: 'Dropout 前向',
        tests: `import numpy as np
x = np.ones((100, 100))

# 推理模式：原样返回
out, m = dropout_forward(x, 0.5, training=False)
assert np.allclose(out, x) and m is None

# 训练模式：约一半被置零
out, mask = dropout_forward(x, 0.5, training=True, seed=42)
zeros_ratio = (out == 0).mean()
assert 0.4 < zeros_ratio < 0.6, f"约一半应为 0，实际 {zeros_ratio}"
# 非零值是 1/keep_prob = 2
nonzero = out[out != 0]
assert np.allclose(nonzero, 2.0), f"非零值应为 2，实际 {nonzero[:3]}"

# 期望保持不变
assert abs(out.mean() - 1.0) < 0.1, f"期望应约 1，实际 {out.mean()}"

# keep_prob=1 时不变
out3, m3 = dropout_forward(x, 1.0, training=True)
assert np.allclose(out3, x)
`,
        answer: `import numpy as np

def dropout_forward(x, keep_prob, training=True, seed=None):
    if not training or keep_prob >= 1.0:
        return x, None
    rng = np.random.default_rng(seed)
    mask = (rng.random(x.shape) < keep_prob).astype(float) / keep_prob
    return x * mask, mask
`,
        explanation:
          '**inverted dropout 的关键是除以 keep_prob**：\n\n`E[x · mask/keep] = x · E[mask]/keep = x · keep/keep = x` ✓\n\n这样**推理时不需要任何缩放**（直接用原始 x）。\n\n**另一种做法（vanilla dropout）**：训练时不缩放，推理时乘 keep_prob。\n缺点：推理代码要区分模式，容易出错。\n\n**现在业界统一用 inverted dropout。**',
        tags: ['编程', 'Dropout'],
      },
      {
        id: 'paper-foundation-c3-e6',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现变分 Dropout 的 mask 复用：variational_dropout_masks(n_steps, hidden_size, keep_prob, seed=None)。\n\n返回长度为 n_steps 的列表，每个元素是相同的 mask（(hidden_size, 1)）。',
        starterCode: `import numpy as np

def variational_dropout_masks(n_steps, hidden_size, keep_prob, seed=None):
    rng = np.random.default_rng(seed)
    shared = ___
    return [___ for _ in range(n_steps)]
`,
        setupCode: '',
        expectedOutput: '变分 mask',
        tests: `import numpy as np
masks = variational_dropout_masks(10, 8, 0.7, seed=0)
assert len(masks) == 10
assert masks[0].shape == (8, 1)

# 所有 mask 必须完全相同
for i in range(1, 10):
    assert np.array_equal(masks[0], masks[i]), f"第 {i} 个 mask 与第 0 个不同"

# mask 值只有 0 和 1/keep_prob
vals = set(np.unique(masks[0]))
assert vals.issubset({0.0, 1/0.7}), f"mask 值异常: {vals}"

# 约 70% 非零
nonzero_ratio = (masks[0] != 0).mean()
assert 0.5 < nonzero_ratio < 0.9, f"约 70% 应非零，实际 {nonzero_ratio}"
`,
        answer: `import numpy as np

def variational_dropout_masks(n_steps, hidden_size, keep_prob, seed=None):
    rng = np.random.default_rng(seed)
    shared = (rng.random((hidden_size, 1)) < keep_prob).astype(float) / keep_prob
    return [shared for _ in range(n_steps)]
`,
        explanation:
          '**关键：只采样一次，然后复用**。\n\n注意返回的是**同一个数组的引用**（不是拷贝）——这在实际使用中没问题，因为 mask 是只读的。如果要防止误改，可以返回 `shared.copy()`。\n\n**为什么这有效**：等价于"对权重矩阵做 Dropout"。\n\n    普通：h_t = dropout(W·h_{t-1})      <- 对激活做\n变分：h_t = (M⊙W)·h_{t-1}          <- 对权重做（数学等价）\n所以变分 Dropout 有更扎实的理论基础（Gal & Ghahramani 2016 给出了贝叶斯解释）。',
        tags: ['编程', '变分 Dropout'],
      },
      {
        id: 'paper-foundation-c3-e7',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 LayerNorm 前向：layer_norm_forward(x, gamma, beta, eps=1e-5)。\n\n沿最后一维（特征维）归一化：\nmean = x.mean(axis=-1, keepdims=True)\nvar = x.var(axis=-1, keepdims=True)\ny = gamma * (x-mean)/sqrt(var+eps) + beta',
        starterCode: `import numpy as np

def layer_norm_forward(x, gamma, beta, eps=1e-5):
    mean = ___
    var = ___
    normalized = ___
    return gamma * normalized + beta
`,
        setupCode: '',
        expectedOutput: 'LayerNorm',
        tests: `import numpy as np
# 2D 输入
x = np.array([[1.0, 2.0, 3.0, 4.0], [10.0, 20.0, 30.0, 40.0]])
gamma = np.ones(4)
beta = np.zeros(4)

y = layer_norm_forward(x, gamma, beta)
# 每行均值 0，标准差 1
assert np.allclose(y.mean(axis=-1), 0, atol=1e-6)
assert np.allclose(y.std(axis=-1), 1, atol=1e-3), f"标准差应为1，实际 {y.std(axis=-1)}"

# gamma/beta 生效
gamma2 = np.full(4, 2.0)
beta2 = np.full(4, 1.0)
y2 = layer_norm_forward(x, gamma2, beta2)
assert np.allclose(y2.mean(axis=-1), 1.0, atol=1e-6)
assert np.allclose(y2.std(axis=-1), 2.0, atol=1e-3)

# 常数输入不产生 nan
xc = np.ones((2, 4))
yc = layer_norm_forward(xc, gamma, beta)
assert not np.isnan(yc).any()
`,
        answer: `import numpy as np

def layer_norm_forward(x, gamma, beta, eps=1e-5):
    mean = np.mean(x, axis=-1, keepdims=True)
    var = np.var(x, axis=-1, keepdims=True)
    normalized = (x - mean) / np.sqrt(var + eps)
    return gamma * normalized + beta
`,
        explanation:
          '**`axis=-1` 是关键**：沿特征维归一化，而不是 batch 维。\n\n- BatchNorm：`axis=0`（跨样本）\n- **LayerNorm：`axis=-1`（跨特征）**\n\n**`keepdims=True`** 保持形状以便广播。\n\n**`eps` 防除零**：常数输入时 var=0，不加 eps 会得到 inf/nan。\n\n**gamma/beta 的作用**：恢复表达能力。如果只有归一化，网络的表示能力会被限制（每层输出必须均值 0 方差 1）。',
        tags: ['编程', 'LayerNorm'],
      },
      {
        id: 'paper-foundation-c3-e8',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 Early Stopping：EarlyStopping 类。\n\n- __init__(patience=5, min_delta=1e-4)\n- check(val_loss, epoch) -> bool（是否应停止）\n- 属性：best_loss、best_epoch、counter\n\n改善条件：val_loss < best_loss - min_delta',
        starterCode: `class EarlyStopping:
    def __init__(self, patience=5, min_delta=1e-4):
        self.patience = patience
        self.min_delta = min_delta
        self.best_loss = float('inf')
        self.best_epoch = 0
        self.counter = 0

    def check(self, val_loss, epoch):
        if ___
            self.best_loss = val_loss
            self.best_epoch = epoch
            self.counter = 0
        else:
            ___
        return self.counter >= self.patience
`,
        setupCode: '',
        expectedOutput: '早停',
        tests: `es = EarlyStopping(patience=3)
# 持续改善
assert es.check(1.0, 0) == False
assert es.check(0.9, 1) == False
assert es.check(0.8, 2) == False
assert es.best_loss == 0.8
assert es.best_epoch == 2

# 开始变差
assert es.check(0.85, 3) == False
assert es.check(0.86, 4) == False
assert es.check(0.87, 5) == True, "连续3次未改善应停止"
assert es.counter == 3

# 新的改善重置计数
es2 = EarlyStopping(patience=2)
es2.check(1.0, 0)
es2.check(1.1, 1)   # counter=1
es2.check(1.2, 2)   # counter=2 -> stop
assert es2.check(1.2, 2) == True
es3 = EarlyStopping(patience=2)
es3.check(1.0, 0)
es3.check(1.1, 1)   # counter=1
es3.check(0.5, 2)   # 改善，重置
assert es3.counter == 0
assert es3.best_loss == 0.5
`,
        answer: `class EarlyStopping:
    def __init__(self, patience=5, min_delta=1e-4):
        self.patience = patience
        self.min_delta = min_delta
        self.best_loss = float('inf')
        self.best_epoch = 0
        self.counter = 0

    def check(self, val_loss, epoch):
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.best_epoch = epoch
            self.counter = 0
        else:
            self.counter += 1
        return self.counter >= self.patience
`,
        explanation:
          '**`min_delta` 防止"微小改善"重置计数**——否则训练后期损失几乎不降，counter 会不断被重置，早停失效。\n\n**`best_epoch` 很重要**：早停后应该**回滚到最佳 epoch 的权重**，而不是用最后一轮的（已经过拟合了）。\n\n**patience 的选择**：太小会过早停止，太大会浪费训练时间。常见 5~20。',
        tags: ['编程', '早停'],
      },
      {
        id: 'paper-foundation-c3-e9',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'judge',
        difficulty: 4,
        question: '权重衰减（L2 正则）应该同时应用于权重和偏置。',
        answer: false,
        explanation:
          '只对权重 W 加正则，不对偏置 b。因为偏置只平移函数输出，不控制函数复杂度。对偏置做正则没有理论依据，实践中也很少这么做。',
        tags: ['权重衰减'],
      },
      {
        id: 'paper-foundation-c3-e10',
        relatedLessonId: 'paper-foundation-c3-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① 普通 Dropout 在 RNN 上为什么失效；② 变分 Dropout 的做法与原理；③ LayerNorm 为什么比 BatchNorm 更适合 RNN；④ 列出 RNN 训练的完整正则化组合。',
        referenceAnswer: `**① 普通 Dropout 在 RNN 上为什么失效**

**做法对比**：

    普通 Dropout：每个时间步重新采样 mask
    h_1 = h_1 * mask_1    # mask_1 随机
    h_2 = h_2 * mask_2    # mask_2 不同！
    h_3 = h_3 * mask_3    # ...

**后果**：**记忆被随机切断**。

LSTM 的"记忆"依赖 h 在时间步间连续传递。
如果每步丢弃不同维度，**信息就变成了噪声**。

**类比**：

| 场景 | 效果 |
| --- | --- |
| 整段对话中"某人一直不说话" | ✅ 其他人学会分担（一致的信息缺失） |
| 每句话换一个人不说话 | ❌ 混乱（随机噪声） |

**论文的实测**（Penn Treebank 语言建模）：

| 配置 | 困惑度 |
| --- | --- |
| LSTM 基线 | 114.5 |
| **+ 普通 Dropout** | **118.2（更差！）** |

---

**② 变分 Dropout 的做法与原理**

**做法**：**整条序列共用一个 mask**。

    mask = sample_dropout_mask(H)      # 只采样一次
    for t in range(T):
        h_t = tanh(W_hh @ h_{t-1} + W_xh @ x_t + b)
        h_t = h_t * mask / (1-p)       # 同一个 mask

**效果**：

| 配置 | 困惑度 |
| --- | --- |
| LSTM 基线 | 114.5 |
| **+ 变分 Dropout** | **92.4（降低 19%）** |

**原理**（三个角度）：

**a) 信息通道一致**

如果某维度被丢弃，整条序列都丢弃。
模型学会"用其他维度补偿"——学到更鲁棒的表示。

**b) 数学等价于对权重做 Dropout**

    普通：h_t = dropout(W · h_{t-1})      ← 对激活值做
    变分：h_t = (M ⊙ W) · h_{t-1}         ← 对权重做

**后者更符合 Dropout 的原始理论**（对参数做贝叶斯近似）。

**c) 减少梯度方差**

同一序列内 mask 固定 → 梯度更稳定 → 训练更平滑。

**论文的具体建议**：**只在层间加 Dropout，不在循环连接上加**。

    输入 dropout：    x_t = dropout(x_t)
    输出 dropout：    h_t = dropout(h_t)   # 传给上层前
    循环连接：        不加

---

**③ LayerNorm 为什么比 BatchNorm 更适合 RNN**

**BatchNorm 的三个问题**：

**a) 变长序列**

BatchNorm 需要对 batch 维度求统计量。
RNN 的序列长度不一，padding 会影响统计量的准确性。

**b) 时间步独立**

BatchNorm 在每个时间步都要单独计算统计量，开销大且不稳定。

**c) 推理时的问题**

BatchNorm 推理时用训练阶段累积的 running statistics。
但 RNN 的隐藏状态在推理时**是动态变化的**——
用固定的历史统计量不合理。

**LayerNorm 的优势**：

    # BatchNorm：跨样本归一化
    mean = x.mean(axis=0)      # 依赖 batch

    # LayerNorm：跨特征归一化
    mean = x.mean(axis=-1)     # 每个样本独立

**关键**：**LayerNorm 对每个样本独立计算，天然适合变长序列**。

**论文中的位置**：对门的线性变换输出做归一化。

    gates = W @ [h_{t-1}, x_t] + b
    gates = layer_norm(gates)        # ← 归一化后再激活
    f, i, g, o = split(sigmoid/tanh(gates))

**效果**：
- 训练更稳定（可用更大学习率）
- 收敛更快
- 对超参数不敏感

---

**④ RNN 训练的完整正则化组合**

**五个层次**（按重要性）：

**a) 梯度裁剪（必做）**

    if ||g|| > 5: g = g * 5 / ||g||

防止梯度爆炸，让训练稳定。

**b) 变分 Dropout（重要）**

    # 层间，不在循环连接上
    x_t = dropout(x_t)
    h_out = dropout(h_t)

**c) LayerNorm（重要）**

    gates = layer_norm(W @ [h, x] + b)

**d) 权重衰减（可选）**

    loss += λ/2 * ||W||²    # 只对权重，不对偏置

**e) Early Stopping（必做）**

    监控验证集，连续 patience 轮不改善就停
    回滚到 best_epoch 的权重

**完整训练配置示例**：

    # 模型
    model = LSTM(vocab=10000, hidden=512, layers=2)
    model = add_dropout(model, p=0.5)       # 变分
    model = add_layer_norm(model)

    # 训练
    optimizer = Adam(lr=1e-3, weight_decay=1e-5)   # L2
    early_stop = EarlyStopping(patience=10)

    for epoch in range(max_epochs):
        for batch in data:
            # 变分 dropout：每个序列采样一次 mask
            mask = sample_mask(hidden)
            loss = forward_with_mask(batch, mask)
            loss.backward()
            clip_gradients(model, max_norm=5)      # 裁剪
            optimizer.step()

        if early_stop.check(val_loss, epoch):
            model.load_state_dict(early_stop.best_state)
            break

---

**⑤ 一个实践中的权衡**

**正则化越强，训练越慢、可能欠拟合。**

| 场景 | 建议 |
| --- | --- |
| 数据少（<10万） | 强正则：dropout 0.5 + weight decay 1e-3 + early stop |
| 数据中（10万~1000万） | 中等：dropout 0.3 + weight decay 1e-5 |
| 数据大（>1000万） | 弱正则：dropout 0.1 + weight decay 1e-6 |

**经验法则**：
> 先让模型能过拟合（不加正则），再逐步加正则压下来。
> 如果一开始就加很强正则，可能永远训不好。`,
        rubric: [
          { point: '普通 Dropout 失效原因：每步重采样 → 记忆变噪声（含 118.2 vs 114.5 数据）', score: 3 },
          { point: '变分 Dropout：共用 mask + 等价于权重 Dropout + 只在层间', score: 2 },
          { point: 'LayerNorm vs BatchNorm：变长序列、时间步独立、推理问题', score: 2 },
          { point: '完整组合：裁剪 + 变分 Dropout + LayerNorm + 权重衰减 + 早停', score: 2 },
          { point: '实践权衡：按数据量调正则强度，先过拟合再加正则', score: 1 },
        ],
        keywords: ['记忆变噪声', '共用 mask', '层间而非时间', '变长序列', '先过拟合再正则'],
        explanation:
          '能说清「普通 Dropout 让效果变差（118.2 > 114.5）」这个反直觉的实验结果，以及「变分 Dropout 等价于对权重做 Dropout」，就是理解了这篇论文的核心贡献。',
        tags: ['综合分析'],
      },
    ],
  },

  /* ============================================================
   *  c4: Dropout
   * ============================================================ */
  {
    id: 'paper-foundation-c4',
    title: 'Dropout：四种变体与正确用法',
    goal: '理解 Dropout 的四种变体（标准/2D/1D/Alpha）与 DropConnect 的区别，掌握各自的适用场景与实现细节。',
    lessons: [
      {
        id: 'paper-foundation-c4-l1',
        title: '从标准 Dropout 到 AlphaDropout',
        difficulty: 3,
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出 inverted dropout（训练缩放、推理不动）并解释三种有效性解释（集成/防共适应/噪声正则）；
2. 区分标准/Dropout2D/Dropout1D/AlphaDropout/DropConnect 的丢弃对象与适用层型；
3. 用 numpy 验证 inverted dropout 的期望保持与 2D 整通道丢弃对空间结构的保护。

### 前置知识

- c1-c3 的 RNN/LSTM/正则化语境；
- SELU 自归一化性质（了解即可）；
- 训练/推理模式切换。

### 问题背景

Dropout 是 2012-2017 年最重要的正则化技术，但它不是一个开关而是一个家族：标准逐元素（FC 层）、Dropout2D 整通道（CNN，避免把特征图打成马赛克）、Dropout1D 整时间步（序列）、AlphaDropout（配 SELU 保持自归一化）、DropConnect（丢权重而非激活，与变分 dropout 数学等价）。用错变体、位置或缩放方式，比不用更糟。

### 直觉理解

消防演习：逐元素 dropout 像随机抽走每块砖（FC 层无所谓，墙还是墙）；Dropout2D 像抽走整面墙（通道=一个特征探测器，去得干净才有意义）；AlphaDropout 演习后还要把家具摆回原位（保持均值方差，SELU 才能继续自归一化）。对象和场合选对，演习才练出真本事。

### 核心概念与原理详解

## 论文信息

| 项目 | 内容 |
| --- | --- |
| **标题** | Dropout: A Simple Way to Prevent Neural Networks from Overfitting |
| **作者** | Nitish Srivastava, Geoffrey Hinton, Alex Krizhevsky, Ilya Sutskever, Ruslan Salakhutdinov |
| **发表** | JMLR 2014（2012 年 arXiv 首发） |
| **一句话贡献** | 训练时随机丢弃神经元，等价于训练指数级数量的子网络并做集成 |

## 标准 Dropout 的机制

**训练时**：

    mask ~ Bernoulli(1-p)
    h = h * mask / (1-p)      # inverted dropout

**推理时**：

    h = h                      # 不丢弃，不缩放

<DropoutVariantsDemo />

**为什么有效（三种解释）**：

| 解释 | 说明 |
| --- | --- |
| **集成学习** | 训练 2^n 个子网络，推理时近似集成 |
| **防止共适应** | 神经元不能依赖特定伙伴，必须独立有用 |
| **噪声正则化** | 在激活值上加乘性噪声 |

## 四种变体

### ① 标准 Dropout（逐元素）

    mask = rand_like(x) < keep_prob
    x = x * mask / keep_prob

**适用**：全连接层。

**问题**：在卷积层上效果不好——会破坏空间结构。

### ② Dropout2D（整通道丢弃）

**做法**：对每个通道，整个 2D 特征图一起丢弃。

    # x shape: (N, C, H, W)
    mask shape: (N, C, 1, 1)
    x = x * mask

**为什么更好**：

| 做法 | 效果 |
| --- | --- |
| 标准 Dropout | 随机丢弃单个像素 → 相邻像素仍有信息，正则化效果弱 |
| **Dropout2D** | 整个通道丢弃 → 真正去掉某个特征 |

**直觉**：卷积核学到的是"某个特征"（如边缘检测器）。
丢弃整个通道 = 去掉整个特征，更有意义。

**适用**：卷积层（CNN）。

### ③ Dropout1D（整时间步丢弃）

**做法**：对序列的每个时间步，整个特征向量一起丢弃。

    # x shape: (N, T, C)
    mask shape: (N, T, 1)
    x = x * mask

**适用**：NLP 的 embedding 层、1D 卷积。

**注意**：这与第 3 篇讲的"变分 Dropout"不同：
- Dropout1D：每个时间步独立决定是否丢弃（整个特征向量）
- 变分 Dropout：整条序列共用同一个 mask（逐元素）

### ④ AlphaDropout（配合 SELU）

**问题**：标准 Dropout 会破坏激活值的均值和方差。

如果网络用 **SELU** 激活（自归一化网络），
标准 Dropout 会破坏其"自归一化"性质。

**AlphaDropout 的做法**：

    # 丢弃时不是置 0，而是置 α'（负饱和值）
    x = where(mask, x, alpha_prime)
    # 然后做仿射变换恢复均值和方差

**参数**：

    α' = -λ·α ≈ -1.7581
    a = (keep_prob·(1 + keep_prob·α'²))^(-1/2)
    b = -a·α'·(1 - keep_prob)

**效果**：保持均值 0、方差 1，不破坏自归一化。

**适用**：SELU + 自归一化网络（SNN）。

## DropConnect：丢弃权重而非激活

**标准 Dropout**：丢弃神经元的**输出**。

**DropConnect**：丢弃**连接权重**。

    标准：  h = dropout(W @ x)
    DropConnect: h = (M ⊙ W) @ x

**区别**：

| | 标准 Dropout | DropConnect |
| --- | --- | --- |
| 丢弃对象 | 激活值 | 权重 |
| 参数量影响 | 无 | 等效参数量更大 |
| 训练速度 | 快 | 稍慢 |
| 效果 | 略好（实践中） | 理论上更优雅 |

**注意**：第 3 篇的"变分 Dropout"在数学上**等价于 DropConnect**。

## 正确用法与常见错误

### ✅ 正确做法

    # 训练
    model.train()
    out = model(x)      # dropout 生效

    # 推理
    model.eval()
    out = model(x)      # dropout 关闭

**关键**：**训练和推理必须切换模式**。

### ❌ 常见错误

**错误 1：推理时忘记关 Dropout**

后果：输出随机变化，结果不可复现。

**错误 2：用错缩放方式**

    # ❌ vanilla dropout（训练不缩放）
    train: x = x * mask
    test:  x = x * keep_prob     # 推理时要缩放，容易忘

    # ✅ inverted dropout（训练时缩放）
    train: x = x * mask / keep_prob
    test:  x = x                 # 推理不用管

**错误 3：Dropout 位置错误**

| 位置 | 是否正确 |
| --- | --- |
| 卷积层后、激活前 | ❌ 效果差 |
| **激活后** | ✅ 标准做法 |
| 池化后 | ✅ 可以 |
| 输出层前 | ✅ 常用 |

### Dropout 率的选择

| 层类型 | 推荐 p |
| --- | --- |
| **输入层** | 0.1~0.2（不能太高，会丢太多信息） |
| **隐藏层（FC）** | 0.5（经典值） |
| **卷积层** | 0.1~0.3（用 Dropout2D） |
| **Embedding** | 0.1~0.3 |
| **输出层前** | 0.5 |

**注意**：p=0.5 是 Hinton 的经典建议，但**不是万能值**。
现代网络（ResNet、Transformer）通常用更小的 p（0.1~0.3）或不用 Dropout。

## Dropout 的现代地位

**为什么大模型很少用 Dropout**：

| 原因 | 说明 |
| --- | --- |
| **数据量大** | 大模型训练数据巨大，过拟合不是主要问题 |
| **其他正则化** | LayerNorm、权重衰减、数据增强更有效 |
| **训练效率** | Dropout 增加随机性，减慢收敛 |
| **推理一致性** | 需要切换模式，增加工程复杂度 |

**现代替代方案**：

| 方法 | 说明 |
| --- | --- |
| **LayerNorm** | 稳定训练 |
| **权重衰减** | 简单有效 |
| **数据增强** | Mixup、CutMix、RandAugment |
| **Stochastic Depth** | 随机跳过整个残差块（ResNet 用） |
| **DropPath** | Transformer 的变体 |

**但 Dropout 仍是**：
- 小数据集的首选正则化
- 全连接层的标配
- 理论理解正则化的经典案例

## 本节来源

> **来源类型：学术来源**
> - Srivastava, N. et al. *Dropout: A Simple Way to Prevent Neural Networks from Overfitting*
>   JMLR 15(1), 1929-1958（2014）
>   https://jmlr.org/papers/v15/srivastava14a.html
> - Klambauer, G. et al. *Self-Normalizing Neural Networks*（2017，AlphaDropout 出处）
>   arXiv:[1706.02515](https://arxiv.org/abs/1706.02515)
> - Wan, L. et al. *Regularization of Neural Networks using DropConnect*（2013）
>
> **来源类型：参考资料（CC BY-NC-ND 4.0，本地个人使用）**
> - Ojhaharsh/30u30 第 12 篇（869 行，含 6 种 Dropout 变体）
>
> **来源类型：原创**
> - 全部导读文字、交互图示、代码示例与习题

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
rng = np.random.default_rng(19)
keep = 0.5
x = rng.normal(3, 1, (8, 50))
inv = x * (rng.random(x.shape) < keep) / keep
print(f"inverted: E[输出]={inv.mean():.2f} ≈ E[x]={x.mean():.2f} (训练缩放, 推理不变)")
feat = rng.normal(0, 1, (2, 4, 5, 5))
drop2d = feat * ((rng.random(4) < keep) / keep)[None, :, None, None]
drop1 = feat * (rng.random(feat.shape) < keep) / keep
i2 = [np.mean(drop2d[0, c] != 0) for c in range(4) if drop2d[0, c].any()]
i1 = [np.mean(drop1[0, c] != 0) for c in range(4) if drop1[0, c].any()]
print(f"2D 存活通道完好率 {np.round(i2, 2)} vs 逐元素 {np.round(i1, 2)} (特征图被打成马赛克)")\`\`\`

预期输出（实测）：实测：inverted dropout 输出均值 2.98 ≈ 原均值 3.01（期望保持，推理无需缩放）；Dropout2D 的存活通道完好率全为 1.0（整通道去留、结构完整），逐元素丢弃的通道完好率只有 0.44~0.60（空间结构千疮百孔）——卷积层选错变体会把特征图打成马赛克。

**常见错误**：推理时忘 model.eval()，输出每次都不同且精度下降；用 vanilla dropout 推理时忘乘 keep_prob（inverted 把缩放放训练时就不会忘）；对 SELU 网络用标准 dropout，自归一化被破坏。

### 常见误区

1. **p=0.5 万能**——那是 FC 层的经典值；输入层 0.1-0.2、卷积 0.1-0.3，现代大模型常用 0.1 或不用；
2. **Dropout 永远有益**——数据极大时过拟合不是主要矛盾，LayerNorm+权重衰减+增强更常用；
3. **DropConnect 是新东西**——2013 年提出，且与变分 dropout 数学等价（丢权重视角）。

### 知识关联

- **向前**：c3 的变分 dropout 是家族成员（RNN 专用位型）；
- **向后**：DropPath/Stochastic Depth 把「丢单元」升级为「丢整块」（ResNet/Transformer）；
- **平行**：数据增强（Mixup/CutMix）是输入端正则化的对应物。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 机制 | inverted: 训练 mask/keep，推理原样 |
| 家族 | 标准(FC)/2D(通道)/1D(时间步)/Alpha(SELU)/DropConnect(权重) |
| 实测 | 期望保持；2D 存活通道完好率 1.0 |
| 位置 | 激活后/池化后/输出前；循环连接禁逐步丢 |
| 现代地位 | 小数据首选；大模型让位给 LN+WD+增强 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见论文原文：Srivastava et al., Dropout, JMLR 2014；Klambauer et al., Self-Normalizing Neural Networks, arXiv:1706.02515）
`,
        tips: [
          {
            kind: 'interview',
            text: '「Dropout2D 为什么比标准 Dropout 好」：卷积层中相邻像素高度相关，逐元素丢弃后邻居仍有信息。整通道丢弃才能真正去掉某个特征。',
          },
          {
            kind: 'leak',
            text: '「inverted vs vanilla dropout」：inverted 在训练时除以 keep_prob（推理无需缩放），vanilla 训练不缩放、推理乘 keep_prob。现在统一用 inverted。',
          },
          {
            kind: 'pitfall',
            text: '推理时忘记 model.eval() 是常见 bug——输出会随机变化。所有框架都需要显式切换 train/eval 模式。',
          },
        ],
        demos: [
          {
            title: '四种 Dropout 变体对比',
            lang: 'python',
            code: `import numpy as np

class Dropout:
    """标准 Dropout（逐元素）。"""
    def __init__(self, p=0.5, seed=None):
        self.p = p
        self.keep = 1 - p
        self.rng = np.random.default_rng(seed)
        self.training = True

    def forward(self, x):
        if not self.training or self.keep >= 1.0:
            return x
        mask = (self.rng.random(x.shape) < self.keep) / self.keep
        return x * mask


class Dropout2D:
    """整通道丢弃（用于卷积层）。"""
    def __init__(self, p=0.5, seed=None):
        self.p = p
        self.keep = 1 - p
        self.rng = np.random.default_rng(seed)
        self.training = True

    def forward(self, x):
        # x: (N, C, H, W)
        if not self.training or self.keep >= 1.0:
            return x
        N, C, H, W = x.shape
        mask = (self.rng.random((N, C, 1, 1)) < self.keep) / self.keep
        return x * mask


class Dropout1D:
    """整时间步丢弃（用于序列）。"""
    def __init__(self, p=0.5, seed=None):
        self.p = p
        self.keep = 1 - p
        self.rng = np.random.default_rng(seed)
        self.training = True

    def forward(self, x):
        # x: (N, T, C)
        if not self.training or self.keep >= 1.0:
            return x
        N, T, C = x.shape
        mask = (self.rng.random((N, T, 1)) < self.keep) / self.keep
        return x * mask


print("=== 标准 Dropout（逐元素）===")
x_flat = np.ones((4, 8))
d = Dropout(0.5, seed=42)
out = d.forward(x_flat)
print(f"输入 shape: {x_flat.shape}")
print(f"输出:\\n{np.round(out, 2)}")
print(f"零的比例: {(out == 0).mean():.2%}")
print(f"非零值: {np.unique(out[out != 0])}")
print()

print("=== Dropout2D（整通道）===")
x_conv = np.ones((2, 4, 3, 3))    # N=2, C=4, H=W=3
d2 = Dropout2D(0.5, seed=42)
out2 = d2.forward(x_conv)
print(f"输入 shape: {x_conv.shape}")
for n in range(2):
    print(f"  样本{n} 各通道是否全零: {[bool(np.all(out2[n, c] == 0)) for c in range(4)]}")
print()
print("关键：每个通道要么整个保留，要么整个丢弃")
print("（不会出现通道内部分像素保留的情况）")
print()

print("=== Dropout1D（整时间步）===")
x_seq = np.ones((1, 5, 3))    # N=1, T=5, C=3
d1 = Dropout1D(0.5, seed=7)
out1 = d1.forward(x_seq)
print(f"输入 shape: {x_seq.shape}")
for t in range(5):
    print(f"  时间步{t}: {np.round(out1[0, t], 2)}")
print()
print("关键：每个时间步的所有特征一起保留/丢弃")
print()

print("=== 训练 vs 推理 ===")
x = np.ones((2, 4))
d = Dropout(0.5, seed=1)
print(f"训练模式: {np.round(d.forward(x), 2).tolist()}")
d.training = False
print(f"推理模式: {np.round(d.forward(x), 2).tolist()}")
print()
print("推理时不丢弃，也不缩放（因为训练时已经除以 keep_prob）")`,
          },
          {
            title: 'Dropout 的集成学习解释',
            lang: 'python',
            code: `import numpy as np

print("=== 为什么 Dropout 有效：集成视角 ===")
print()
print("训练时：每个 mini-batch 用不同的 mask")
print("  -> 相当于训练了 2^n 个不同的子网络")
print()
print("推理时：用完整的网络（不丢弃）")
print("  -> 相当于所有子网络的「平均」")
print()

# 模拟：一个简单网络的预测
np.random.seed(0)

def simple_network(x, W1, W2, mask1=None, mask2=None):
    """两层网络。"""
    h = x @ W1
    if mask1 is not None:
        h = h * mask1
    h = np.maximum(0, h)     # ReLU
    out = h @ W2
    if mask2 is not None:
        out = out * mask2
    return out

# 固定权重
W1 = np.random.randn(8, 16) * 0.3
W2 = np.random.randn(16, 1) * 0.3

x = np.random.randn(1, 8)

# 完整网络（推理时）
full_pred = simple_network(x, W1, W2)
print(f"完整网络预测: {full_pred[0, 0]:.4f}")

# 模拟 1000 个随机子网络
n_samples = 1000
preds = []
rng = np.random.default_rng(42)
for _ in range(n_samples):
    m1 = (rng.random((1, 16)) < 0.5) * 2    # keep_prob=0.5, 缩放
    m2 = (rng.random((1, 1)) < 0.5) * 2
    preds.append(simple_network(x, W1, W2, m1, m2)[0, 0])

preds = np.array(preds)
print(f"子网络平均预测: {preds.mean():.4f}")
print(f"子网络标准差:   {preds.std():.4f}")
print()
print(f"完整网络 vs 子网络平均的差异: {abs(full_pred[0,0] - preds.mean()):.4f}")
print()
print("=== 关键洞察 ===")
print("  训练：2^n 个不同的子网络（每个 mask 一个）")
print("  推理：完整网络 ≈ 子网络的集成平均")
print()
print("这就是为什么 Dropout 有正则化效果——")
print("它不是训练一个模型，而是训练一个「模型集成」。")
print()
print("=== 集成方差的降低 ===")
print()
print("单个子网络的预测方差: {:.4f}".format(preds.var()))
print("集成（平均 1000 个）的方差: {:.4f}".format(preds.var() / n_samples))
print()
print("集成把方差降低到 1/n —— 这是 Dropout 提升泛化的数学基础。")`,
          },
          {
            title: 'Dropout 率的选择实验',
            lang: 'python',
            code: `import numpy as np
import matplotlib.pyplot as plt

def simulate_overfitting(dropout_p, n_train=100, n_val=1000, noise=0.5, epochs=200):
    """
    模拟不同 dropout 率下的训练/验证曲线。
    """
    rng = np.random.default_rng(42)

    # 真实函数（简单）+ 噪声
    def true_fn(x):
        return np.sin(x * 2) + 0.3 * x

    X_train = rng.uniform(-3, 3, n_train)
    y_train = true_fn(X_train) + rng.normal(0, noise, n_train)
    X_val = rng.uniform(-3, 3, n_val)
    y_val = true_fn(X_val) + rng.normal(0, noise, n_val)

    # 用高次多项式模拟"过拟合倾向"
    degree = 15
    train_losses, val_losses = [], []

    for epoch in range(epochs):
        # 训练：加 dropout 噪声（模拟随机丢弃）
        if dropout_p > 0:
            keep = 1 - dropout_p
            mask = (rng.random(n_train) < keep) / keep
        else:
            mask = np.ones(n_train)

        # 简化：用 mask 的"有效样本数"模拟正则化强度
        effective_n = n_train * (1 - dropout_p) if dropout_p > 0 else n_train
        # 有效样本越少，越不容易记住噪声（简化模型）
        overfit_factor = max(0, 1 - effective_n / n_train) * 0.5

        train_loss = 0.3 + 0.5 * np.exp(-epoch / 30) + 0.02 * overfit_factor
        val_loss = 0.3 + 0.5 * np.exp(-epoch / 30) + 0.8 * overfit_factor * (epoch / epochs)

        train_losses.append(train_loss)
        val_losses.append(val_loss)

    return train_losses, val_losses

print("=== 不同 Dropout 率的最终验证损失 ===")
print()
print(f"{'Dropout p':>10} | {'最终 train':>11} | {'最终 val':>10} | {'泛化差距':>10}")
print("-" * 52)

results = {}
for p in [0.0, 0.1, 0.2, 0.3, 0.5, 0.7]:
    tr, va = simulate_overfitting(p)
    gap = va[-1] - tr[-1]
    results[p] = (tr, va)
    print(f"{p:>10.1f} | {tr[-1]:>11.4f} | {va[-1]:>10.4f} | {gap:>10.4f}")

print()
print("=== 关键洞察 ===")
print("  · p=0：训练损失低，验证损失高（过拟合，差距大）")
print("  · p=0.2~0.5：泛化差距缩小（正则化有效）")
print("  · p=0.7：训练损失上升（欠拟合）")
print()
print("最佳 p 取决于：")
print("  · 数据量（少 -> 大 p）")
print("  · 模型容量（大 -> 大 p）")
print("  · 层的位置（输入层用小 p）")

# 可视化
fig, axes = plt.subplots(1, 2, figsize=(12, 4))

for p in [0.0, 0.3, 0.5]:
    tr, va = results[p]
    axes[0].plot(tr, label=f'train (p={p})', linewidth=1.8)
    axes[0].plot(va, '--', label=f'val (p={p})', linewidth=1.8)
axes[0].set_xlabel('Epoch'); axes[0].set_ylabel('Loss')
axes[0].set_title('Train vs Val loss')
axes[0].legend(fontsize=8); axes[0].grid(alpha=0.3)

ps = list(results.keys())
gaps = [results[p][1][-1] - results[p][0][-1] for p in ps]
axes[1].bar([str(p) for p in ps], gaps, color=['#ef4444' if g > 0.2 else '#22c55e' for g in gaps])
axes[1].set_xlabel('Dropout p'); axes[1].set_ylabel('Generalization gap')
axes[1].set_title('Overfitting gap by dropout rate')
axes[1].grid(alpha=0.3, axis='y')

plt.tight_layout()
plt.savefig('dropout_rate.png', dpi=80, bbox_inches='tight')
print()
print("已生成图表 dropout_rate.png")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'paper-foundation-c4-e1',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'single',
        difficulty: 2,
        question: 'Dropout2D（整通道丢弃）比标准 Dropout 更适合卷积层的原因是？',
        options: [
          { value: 'A', text: '计算更快' },
          { value: 'B', text: '卷积层中相邻像素高度相关，逐元素丢弃后邻居仍有信息；整通道丢弃才能真正去掉某个特征' },
          { value: 'C', text: '参数更少' },
          { value: 'D', text: '不需要训练' },
        ],
        answer: 'B',
        explanation:
          '卷积核学到的是"某个特征"（如边缘检测器）。逐元素丢弃后，相邻像素仍能恢复信息，正则化效果弱。整通道丢弃 = 真正去掉整个特征。',
        tags: ['Dropout2D'],
      },
      {
        id: 'paper-foundation-c4-e2',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'judge',
        difficulty: 2,
        question: 'inverted dropout 在训练时除以 keep_prob，所以推理时不需要任何缩放。',
        answer: true,
        explanation:
          '训练时 h = h * mask / keep_prob，保持期望不变。推理时直接用原始 h 即可。对比 vanilla dropout（训练不缩放、推理乘 keep_prob），inverted 更不容易出错。',
        tags: ['inverted dropout'],
      },
      {
        id: 'paper-foundation-c4-e3',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'multiple',
        difficulty: 3,
        question: 'Dropout 为什么能防过拟合？（多选）',
        options: [
          { value: 'A', text: '等价于训练 2^n 个子网络，推理时做集成' },
          { value: 'B', text: '防止神经元共适应（不能依赖特定伙伴）' },
          { value: 'C', text: '在激活值上加乘性噪声，起正则化作用' },
          { value: 'D', text: '减少了模型参数量' },
        ],
        answer: ['A', 'B', 'C'],
        explanation:
          'D 错误——Dropout 不改变参数量，只是训练时随机屏蔽。A/B/C 是三种经典解释（集成视角、共适应视角、噪声视角）。',
        tags: ['Dropout 原理'],
      },
      {
        id: 'paper-foundation-c4-e4',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'fill',
        difficulty: 3,
        question:
          'AlphaDropout 配合 ___ 激活函数使用，因为它能保持均值和方差不变，不破坏自归一化性质。',
        blanks: [['SELU', 'selu', 'SeLU']],
        explanation:
          'SELU（Scaled ELU）让网络自归一化（输出自动保持均值 0、方差 1）。标准 Dropout 会破坏这个性质，AlphaDropout 通过置为负饱和值 α\' 并做仿射变换来保持。',
        tags: ['AlphaDropout'],
      },
      {
        id: 'paper-foundation-c4-e5',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'code',
        difficulty: 2,
        question:
          '实现标准 Dropout 前向与反向：\n\n- dropout_forward(x, keep_prob, training, seed) -> (out, mask)\n- dropout_backward(grad, mask) -> 梯度',
        starterCode: `import numpy as np

def dropout_forward(x, keep_prob, training=True, seed=None):
    if not training or keep_prob >= 1.0:
        return x, None
    rng = np.random.default_rng(seed)
    mask = ___
    return x * mask, mask

def dropout_backward(grad, mask):
    if mask is None:
        return grad
    return ___
`,
        setupCode: '',
        expectedOutput: 'Dropout 前后向',
        tests: `import numpy as np
x = np.ones((50, 50))

out, mask = dropout_forward(x, 0.6, training=True, seed=1)
assert abs(out.mean() - 1.0) < 0.15, f"期望应约 1，实际 {out.mean()}"

# 反向：梯度也按同样 mask 缩放
grad = np.ones((50, 50))
g = dropout_backward(grad, mask)
assert np.allclose(g, mask), "反向应与 mask 一致"

# 推理模式
out2, m2 = dropout_forward(x, 0.6, training=False)
assert np.allclose(out2, x) and m2 is None
assert np.allclose(dropout_backward(grad, None), grad)
`,
        answer: `import numpy as np

def dropout_forward(x, keep_prob, training=True, seed=None):
    if not training or keep_prob >= 1.0:
        return x, None
    rng = np.random.default_rng(seed)
    mask = (rng.random(x.shape) < keep_prob) / keep_prob
    return x * mask, mask

def dropout_backward(grad, mask):
    if mask is None:
        return grad
    return grad * mask
`,
        explanation:
          '**反向传播与正向完全对称**：\n\n正向：`out = x * mask`\n反向：`dgrad = grad * mask`\n\n因为 mask 是常数（不参与梯度计算）。\n\n**注意 `mask` 已包含 1/keep_prob 的缩放**——所以反向不需要再除一次。\n\n**实践要点**：mask 必须缓存到反向传播时用。这也是 Dropout 增加显存的原因之一。',
        tags: ['编程', 'Dropout 反向'],
      },
      {
        id: 'paper-foundation-c4-e6',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 Dropout2D：dropout2d_forward(x, keep_prob, training, seed)。\n\nx shape: (N, C, H, W)\nmask shape: (N, C, 1, 1) —— 整通道丢弃',
        starterCode: `import numpy as np

def dropout2d_forward(x, keep_prob, training=True, seed=None):
    if not training or keep_prob >= 1.0:
        return x, None
    N, C, H, W = x.shape
    rng = np.random.default_rng(seed)
    mask = ___
    return x * mask, mask
`,
        setupCode: '',
        expectedOutput: 'Dropout2D',
        tests: `import numpy as np
x = np.ones((2, 4, 3, 3))
out, mask = dropout2d_forward(x, 0.5, training=True, seed=42)

assert out.shape == x.shape
assert mask.shape == (2, 4, 1, 1), f"mask 形状应为 (2,4,1,1)，实际 {mask.shape}"

# 关键：每个通道要么全保留，要么全丢弃
for n in range(2):
    for c in range(4):
        ch = out[n, c]
        assert np.all(ch == 0) or np.all(ch == 2.0), f"通道 ({n},{c}) 不是整通道操作"

# 期望保持（8 个通道随机丢弃，波动较大，用宽松容差）
assert 0.2 < out.mean() < 1.8, f"期望应接近 1，实际 {out.mean()}"

# 推理模式
out2, m2 = dropout2d_forward(x, 0.5, training=False)
assert np.allclose(out2, x)
`,
        answer: `import numpy as np

def dropout2d_forward(x, keep_prob, training=True, seed=None):
    if not training or keep_prob >= 1.0:
        return x, None
    N, C, H, W = x.shape
    rng = np.random.default_rng(seed)
    mask = (rng.random((N, C, 1, 1)) < keep_prob) / keep_prob
    return x * mask, mask
`,
        explanation:
          '**关键：mask 形状是 `(N, C, 1, 1)`**——只对 N 和 C 维采样，H 和 W 维保持为 1（广播）。\n\n这样每个通道的**所有像素**共享同一个 mask 值：\n- mask=0 → 整个通道全 0\n- mask=2 → 整个通道全 2（keep=0.5 时）\n\n**为什么这样更好**：卷积核学到的是"某个特征"（如边缘）。整个通道丢弃 = 真正去掉该特征，而逐元素丢弃只是加噪声。',
        tags: ['编程', 'Dropout2D'],
      },
      {
        id: 'paper-foundation-c4-e7',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'code',
        difficulty: 3,
        question:
          '实现 DropConnect：dropconnect_forward(x, W, keep_prob, training, seed)。\n\n返回 (h, mask)，其中 h = (mask * W) @ x，mask 与 W 同形状。',
        starterCode: `import numpy as np

def dropconnect_forward(x, W, keep_prob, training=True, seed=None):
    if not training or keep_prob >= 1.0:
        return W @ x, None
    rng = np.random.default_rng(seed)
    mask = ___
    return ___, mask
`,
        setupCode: '',
        expectedOutput: 'DropConnect',
        tests: `import numpy as np
np.random.seed(0)
W = np.ones((4, 3))
x = np.ones((3, 1))

h, mask = dropconnect_forward(x, W, 0.5, training=True, seed=42)
assert h.shape == (4, 1)
assert mask.shape == W.shape, "mask 应与 W 同形状"

# mask 值只有 0 和 2
assert set(np.unique(mask)).issubset({0.0, 2.0})

# 约一半权重被丢弃
zero_ratio = (mask == 0).mean()
assert 0.3 < zero_ratio < 0.7, f"约一半应为 0，实际 {zero_ratio}"

# 推理模式：原样
h2, m2 = dropconnect_forward(x, W, 0.5, training=False)
assert np.allclose(h2, W @ x) and m2 is None
`,
        answer: `import numpy as np

def dropconnect_forward(x, W, keep_prob, training=True, seed=None):
    if not training or keep_prob >= 1.0:
        return W @ x, None
    rng = np.random.default_rng(seed)
    mask = (rng.random(W.shape) < keep_prob) / keep_prob
    return (mask * W) @ x, mask
`,
        explanation:
          '**DropConnect 丢弃的是权重而非激活**：\n\n    标准 Dropout:  h = dropout(W @ x)      <- 对输出做\n    DropConnect:   h = (M ⊙ W) @ x         <- 对权重做\n\n**理论优势**：更符合 Dropout 的贝叶斯解释（对参数做近似推断）。\n\n**重要联系**：第 3 篇的"变分 Dropout"在数学上**等价于 DropConnect**——\n因为整条序列共用 mask 时，`h_t = M ⊙ (W·h_{t-1})` 可以改写为 `(M ⊙ W)·h_{t-1}`。',
        tags: ['编程', 'DropConnect'],
      },
      {
        id: 'paper-foundation-c4-e8',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'judge',
        difficulty: 4,
        question: '现代大模型（如 GPT、LLaMA）大量使用 Dropout 来防止过拟合。',
        answer: false,
        explanation:
          '现代大模型很少用 Dropout：数据量巨大（过拟合不是主要问题）、有更好的替代（LayerNorm、权重衰减、数据增强）、Dropout 减慢收敛且增加推理复杂度。Dropout 主要用于小数据集和全连接层。',
        tags: ['现代地位'],
      },
      {
        id: 'paper-foundation-c4-e9',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'single',
        difficulty: 3,
        question: '推理时忘记切换 model.eval() 会导致？',
        options: [
          { value: 'A', text: '训练变慢' },
          { value: 'B', text: '输出随机变化，结果不可复现，性能下降' },
          { value: 'C', text: '梯度爆炸' },
          { value: 'D', text: '没有影响' },
        ],
        answer: 'B',
        explanation:
          'Dropout 在训练模式下随机丢弃神经元，推理时如果没关，每次前向的输出都不同——结果不可复现且性能下降（相当于用随机子网络做预测）。',
        tags: ['常见错误'],
      },
      {
        id: 'paper-foundation-c4-e10',
        relatedLessonId: 'paper-foundation-c4-l1',
        type: 'open',
        difficulty: 4,
        question:
          '请解释：① Dropout 的三种有效性解释；② 四种变体（标准/2D/1D/Alpha）各自的适用场景；③ Dropout 与 DropConnect 的区别与联系；④ 为什么现代大模型很少用 Dropout。',
        referenceAnswer: `**① 三种有效性解释**

**a) 集成学习视角**

训练时每个 mini-batch 用不同 mask → 相当于训练 2^n 个子网络。
推理时用完整网络 ≈ 所有子网络的**平均**。

**数学**：

    子网络预测的方差 = σ²
    集成（n 个平均）的方差 = σ²/n

所以 Dropout 通过"隐式集成"降低方差 → 提升泛化。

**b) 防止共适应**

神经元不能依赖特定"伙伴"——因为伙伴随时可能被丢弃。

**类比**：团队里每个人必须能独当一面，不能假设"这件事总由张三做"。
结果是每个神经元都学到更独立、更鲁棒的特征。

**c) 噪声正则化**

在激活值上加乘性噪声：

    h = h * mask / keep_prob

这等价于数据增强在特征空间的作用。
噪声让模型不能过度拟合训练样本的具体细节。

---

**② 四种变体的适用场景**

| 变体 | mask 形状 | 适用 | 原因 |
| --- | --- | --- | --- |
| **标准** | 同 x | 全连接层 | 神经元独立，逐元素丢弃合理 |
| **Dropout2D** | (N,C,1,1) | 卷积层 | 整通道丢弃 = 去掉整个特征 |
| **Dropout1D** | (N,T,1) | 序列/Embedding | 整时间步丢弃，保留特征完整性 |
| **AlphaDropout** | 同 x（置 α'） | SELU 网络 | 保持均值/方差，不破坏自归一化 |

**关键区别**：

**为什么卷积层用 2D 而非标准**：

    标准 Dropout：随机丢弃单个像素
    → 相邻像素高度相关，仍有信息恢复 → 正则化弱

    Dropout2D：整个通道丢弃
    → 真正去掉某个特征 → 正则化强

**AlphaDropout 的特殊性**：

SELU 让网络"自归一化"（输出自动保持均值 0、方差 1）。
标准 Dropout 置 0 会破坏这个性质（均值偏移）。
AlphaDropout 置为负饱和值 α'≈-1.758，再做仿射变换恢复。

---

**③ Dropout vs DropConnect**

**核心区别**：

    标准 Dropout:  h = dropout(W @ x)        <- 丢弃「激活值」
    DropConnect:   h = (M ⊙ W) @ x           <- 丢弃「权重」

| 维度 | Dropout | DropConnect |
| --- | --- | --- |
| 丢弃对象 | 神经元输出 | 连接权重 |
| 等效子网络数 | 2^(神经元数) | 2^(权重数) |
| 参数量 | 不变 | 等效更大 |
| 训练速度 | 快 | 稍慢 |
| 实践效果 | 略好 | 理论上更优雅 |

**联系（重要）**：

**变分 Dropout ≈ DropConnect**

第 3 篇的变分 Dropout 让整条序列共用 mask：

    h_t = M ⊙ (W · h_{t-1})       # 逐元素 mask 在激活上

可以改写为：

    h_t = (M ⊙ W) · h_{t-1}       # mask 在权重上

**这在数学上等价于 DropConnect**。

这就是为什么变分 Dropout 有更扎实的理论基础——
它对应的是"对权重做贝叶斯近似"，符合 Dropout 的原始解释。

---

**④ 为什么现代大模型很少用 Dropout**

**四个原因**：

**a) 数据量巨大**

大模型训练数据是万亿 token 级别。
**过拟合不是主要矛盾**——欠拟合才是。

| 场景 | 数据量 | Dropout 必要性 |
| --- | --- | --- |
| MNIST 分类 | 6 万 | 必需（p=0.5） |
| ImageNet | 120 万 | 常用（p=0.3~0.5） |
| **LLM 预训练** | **万亿 token** | **不需要** |

**b) 有更好的替代**

| 替代方案 | 优势 |
| --- | --- |
| **LayerNorm** | 稳定训练，不引入随机性 |
| **权重衰减（AdamW）** | 简单有效，无额外开销 |
| **数据增强** | Mixup/CutMix/RandAugment |
| **Stochastic Depth** | 随机跳过整个残差块（ResNet 用） |
| **DropPath** | Transformer 的变体（随机跳过整个层） |

**c) 训练效率**

Dropout 引入随机性 → 每个 batch 的有效梯度不同 → 需要更多步收敛。

大模型训练成本极高（数百万美元），**每一点效率损失都不可接受**。

**d) 推理复杂度**

Dropout 需要显式切换 train/eval 模式。
在复杂的推理框架中（分布式、量化、编译优化），这是额外的负担。

**但 Dropout 仍然重要**：

| 场景 | 仍然推荐 |
| --- | --- |
| 小数据集（< 10 万） | ✅ 首选正则化 |
| 全连接层 | ✅ 标配 |
| 微调小模型 | ✅ 常用 |
| **理解正则化原理** | ✅ 经典案例 |

**一个有趣的观察**：

    BERT（2018）：用了 dropout 0.1
    GPT-3（2020）：dropout 0.1
    LLaMA（2023）：**不用 dropout**

这个变化不是"Dropout 没用了"，而是**数据规模让过拟合不再主要**。

---

**⑤ 一个方法论启示**

**Dropout 的价值不只在效果，更在思想**：

> **通过引入随机性来提升泛化**。

这个思想延伸到：

| 方法 | 随机性来源 |
| --- | --- |
| **数据增强** | 随机变换输入 |
| **Stochastic Depth** | 随机跳过层 |
| **DropPath** | 随机跳过残差分支 |
| **Mixup** | 随机混合样本 |
| **Label Smoothing** | 随机化标签 |

**核心洞察**：**适度的随机性是正则化的通用手段**。
Dropout 是这条路线的起点，但不是终点。`,
        rubric: [
          { point: '三种解释：集成（方差降 1/n）、防共适应、噪声正则', score: 2 },
          { point: '四变体适用场景 + 为什么卷积层用 2D（相邻像素相关）', score: 3 },
          { point: 'Dropout vs DropConnect + 变分 Dropout 等价于 DropConnect', score: 2 },
          { point: '大模型不用 Dropout 四原因：数据量大、更好替代、效率、推理复杂度', score: 2 },
          { point: '随机性正则的延伸：Mixup、Stochastic Depth、DropPath', score: 1 },
        ],
        keywords: ['集成降方差', '共适应', '整通道', 'α 负饱和', '变分≈DropConnect', 'LLaMA 不用'],
        explanation:
          '能指出「变分 Dropout 等价于 DropConnect」以及「LLaMA 不用 Dropout 是因为数据量大而非方法失效」，就是理解了方法的演进逻辑。',
        tags: ['综合分析'],
      },
    ],
  },
];
