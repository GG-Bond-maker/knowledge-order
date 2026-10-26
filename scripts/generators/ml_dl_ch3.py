# -*- coding: utf-8 -*-
"""
Chapter 3: 深度学习优化算法全景演进 (Deep Learning Optimizers: From SGD to AdamW)
Course: ml-deep-learning
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_3():
    # ── Lesson 3.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握深度神经网络非凸损失曲面的几何恶疾：病态条件曲率峡谷（Ill-conditioned Ravines）与鞍点（Saddle Points）；
2. 理解标准随机梯度下降（SGD）在狭窄峡谷两壁剧烈锯齿振荡、在谷底平缓地带推进极其缓慢的物理动力学死穴；
3. 掌握经典动量法（Polyak Momentum）通过引入一阶物理惯性平滑高频震荡并加速平原冲刺的机理；
4. 掌握 Nesterov 加速梯度（NAG）的“超前侦察看未来”梯度纠偏；
5. 掌握自适应学习率算法的鼻祖 **AdaGrad** 的参数坐标轴自适应缩放机制，深刻剖析其因**历史梯度平方无限单调累加导致步长过早衰竭停摆**的致命缺陷；
6. 掌握 Hinton 提出的 **RMSprop** 如何通过指数移动平均（EMA）使梯度分母具备历史遗忘能力，成功复活自适应步长。

### 前置知识
- 一元与多元函数泰勒二阶展开（Hessian 矩阵条件数）；
- 阻尼振动与指数移动平均（EMA）。

### 问题背景与 ML 用途
如果将反向传播比作神经网络的“神经传导系统”，那么**优化器（Optimizer）就是驱动网络在万亿维参数迷宫中探索求生的“动力引擎”**：
- 损失函数曲面绝非理想平滑的凸碗，而是充满了陡峭悬崖、狭窄裂缝与平坦鞍点；
- 一个糟糕的优化器会让参数卡在鞍点动弹不得，或者在峡谷两壁反复横跳炸飞；
- 从最原始的 SGD，到加入惯性的 Momentum，再到引入自适应学习率的 AdaGrad 和 RMSprop，构成了深度学习算法工程师征服高维病态曲面的波澜壮阔演进史。

### 直觉理解
- **滑雪下山与重力滚雪球（Momentum 动量直觉）**：
  - 如果一个滑雪者没有任何惯性（标准 SGD），他只要滑进一个狭长的 U 型半管冰槽，就会在槽壁左右两侧来回激烈反弹碰撞，根本无法顺着管底向前滑；
  - **动量法（Momentum）**：赋予滑雪者一个沉重的“铁球惯性”！在左右槽壁剧烈反弹的梯度方向完全相反，正负抵消；而在顺着冰槽向前的微弱梯度方向始终同向累加！滑雪者在向前方向如同雪球越滚越快，以惊人的速度呼啸冲出峡谷！
- **步长衰竭的疲劳矿工 vs 活力巡逻兵（AdaGrad vs RMSprop）**：
  - **AdaGrad**：一个背着沉重记事本的矿工。每走一步，就把踩过的石头重量平方累加在分母上。几千步之后，分母膨胀成了天文数字，步长趋近于零，矿工活活累瘫，再也走不动了（过早停工）；
  - **RMSprop**：给矿工换上“滑动遗忘透视镜”。只关心最近 100 步的平均地势坡度，历史久远的地形自动淡化衰减，无论走多远都能永葆青春、稳步向前！

### 核心概念与符号对照表
| 优化器 | 参数更新核心公式 | 核心演进突破 | 历史局限性 |
| --- | --- | --- | --- |
| **SGD** | $\\theta_{t+1} = \\theta_t - \\eta g_t$ | 最简单直接的梯度下降 | 峡谷震荡剧烈，鞍点逃逸极其困难 |
| **Momentum** | $v_t = \\beta v_{t-1} + \\eta g_t, \\; \\theta_{t+1} = \\theta_t - v_t$ | 引入一阶动量惯性，平滑高频震荡加速收敛 | 转向反应迟缓，容易冲过最优点 |
| **Nesterov (NAG)** | 在预判点 $\\theta_t - \\beta v_{t-1}$ 处计算未来梯度 | 超前纠偏刹车，减少震荡过冲 | 依然使用全局统一固定学习率 |
| **AdaGrad** | $\\theta_{t+1} = \\theta_t - \\frac{\\eta}{\\sqrt{G_t + \\epsilon}} g_t, \\; G_t = \\sum_{\\tau=1}^t g_\\tau^2$ | 为每个参数独立自适应动态调整步长 | **历史平方单调累加，后期学习率必然衰竭归零** |
| **RMSprop** | $v_t = \\beta v_{t-1} + (1-\\beta) g_t^2, \\; \\theta_{t+1} = \\theta_t - \\frac{\\eta}{\\sqrt{v_t + \\epsilon}} g_t$ | 改用指数移动平均追踪二阶动量，步长永不衰竭 | 缺少一阶动量惯性加持 |

### 数学原理与逐步推导
#### RMSprop 指数移动平均对学习率自适应缩放的数学证明
设参数某个分量的梯度为 $g_t$。
RMSprop 维护梯度平方的指数加权移动平均（EMA）：
$$v_t = \beta v_{t-1} + (1 - \beta) g_t^2, \quad \beta \in [0.9, 0.999]$$
展开为历史梯度的衰减加权和：
$$v_t = (1 - \beta) \sum_{\tau=1}^t \beta^{t - \tau} g_\tau^2$$
参数更新步长分母为 $\sqrt{v_t + \epsilon}$：
$$\Delta \theta_t = -\frac{\eta}{\sqrt{v_t + \epsilon}} g_t$$
考察两种极端曲率场景：
1. **陡峭高震荡维度（梯度绝对值 $|g_t|$ 很大，如峡谷垂直槽壁）**：
   $g_t^2$ 很大 $\implies v_t$ 很大 $\implies$ 分母 $\sqrt{v_t}$ 极大，导致有效学习率 $\frac{\eta}{\sqrt{v_t}}$ 被**断崖式自动压缩**！剧烈震荡被强行抚平！
2. **平缓低梯度维度（梯度绝对值 $|g_t|$ 极小，如峡谷顺流低谷）**：
   $g_t^2$ 很小 $\implies v_t$ 很小 $\implies$ 分母 $\sqrt{v_t}$ 极小，导致有效学习率 $\frac{\eta}{\sqrt{v_t}}$ 被**成倍自动放大**！迫使平缓区域快速滑行！
**结论**：自适应学习率在数学上实现了对海森矩阵（Hessian）对角元素的坐标轴对齐预处理（Preconditioning），彻底驯服了病态条件曲率！

### 真实代码示例与分析
下面展示从零实现 SGD、Momentum、AdaGrad 与 RMSprop，在经典的病态二维椭圆峡谷损失函数 $f(x, y) = 0.1 x^2 + 2.0 y^2$ 上对比优化轨迹："""

    l1_code = """import numpy as np

# 定义一个具有严重病态曲率的椭圆峡谷函数 (y 轴比 x 轴陡峭 20 倍)
# f(x, y) = 0.1 * x^2 + 2.0 * y^2
def loss_func(x, y):
    return 0.1 * (x ** 2) + 2.0 * (y ** 2)

def grad_func(x, y):
    return np.array([0.2 * x, 4.0 * y])

# 初始出发点: 悬崖边端点 (x=5.0, y=2.0)
start_pos = np.array([5.0, 2.0])
steps = 25

# 1. 标准 SGD (易在 y 方向剧烈震荡)
pos_sgd = start_pos.copy()
lr = 0.4
for _ in range(steps):
    pos_sgd -= lr * grad_func(pos_sgd[0], pos_sgd[1])

# 2. 动量法 Momentum (一阶惯性抵消 y 轴反弹)
pos_mom = start_pos.copy()
v_mom = np.zeros(2)
beta = 0.8
for _ in range(steps):
    g = grad_func(pos_mom[0], pos_mom[1])
    v_mom = beta * v_mom + g
    pos_mom -= 0.1 * v_mom

# 3. RMSprop (自适应分母压缩 y 轴过大梯度)
pos_rms = start_pos.copy()
v_rms = np.zeros(2)
beta_rms = 0.9
lr_rms = 0.5
for _ in range(steps):
    g = grad_func(pos_rms[0], pos_rms[1])
    v_rms = beta_rms * v_rms + (1.0 - beta_rms) * (g ** 2)
    pos_rms -= (lr_rms / (np.sqrt(v_rms) + 1e-8)) * g

print("=== 25 步优化轨迹终点坐标与最终损失对比 ===")
print(f"初始起点坐标: {start_pos} | 初始损失: {loss_func(*start_pos):.4f}")
print(f"标准 SGD 终点 : {np.round(pos_sgd, 4)} | 最终损失: {loss_func(*pos_sgd):.4f} (y 方向震荡受困)")
print(f"Momentum 终点 : {np.round(pos_mom, 4)} | 最终损失: {loss_func(*pos_mom):.4f} (平滑向前推进)")
print(f"RMSprop  终点 : {np.round(pos_rms, 4)} | 最终损失: {loss_func(*pos_rms):.4f} (自适应极速逼近全局原点!)")
"""

    l1_tips = [
        tip("AdaGrad 仅适用于稀疏数据（如自然语言词袋、稀疏推荐特征），因为只有极少更新的特征步长才不会衰竭。面对密集深度视觉与语言模型，隐藏层万不可用 AdaGrad，必须改用 RMSprop 或 Adam。", "performance"),
    ]

    # ── Lesson 3.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握深度学习王牌优化器 **Adam（Adaptive Moment Estimation, Kingma & Ba 2015）** 的底层算法架构；
2. 严密推导 Adam 初始冷启动阶段的**偏差修正（Bias Correction）**公式，理解为什么没有修正会导致训练前几步参数被极大压制；
3. 掌握 Loshchilov & Hutter (ICLR 2019) 的划时代发现：揭示传统 Adam 实现中 L2 正则化与真实权重衰减（Weight Decay）的严重数学错位；
4. 严格推导 **AdamW 解耦权重衰减（Decoupled Weight Decay）** 算法的数学表达，掌握其为何能修复正则化惩罚与自适应梯度的耦合缺陷；
5. 深刻理解为什么现代所有大语言模型（GPT-4、LLaMA、DeepSeek、Mistral 等）无一例外地将 AdamW 指定为绝对唯一的标准训练优化器；
6. 编写代码从零实现 Adam 与 AdamW 的单步参数更新，直观验证解耦权重衰减在梯度震荡下的参数约束行为。

### 前置知识
- 一阶动量（期望均值）与二阶动量（未中心化方差）；
- 经典 L2 范数正则化惩罚项求导。

### 问题背景与 ML 用途
自 2015 年问世以来，Adam 凭借其“免调学习率、收敛快如闪电”的开箱即用体验，迅速统治了整个深度学习界。
但在计算机视觉和预训练语言模型的大规模生产实践中，工程师们长期发现一个极其诡异的反常现象：
- 在小模型和简单任务上，Adam 收敛极快；但在超大规模深层网络（如 ImageNet 图像分类、LLM 预训练）中，**带着繁复手调学习率退火策略的标准 SGD + Momentum，其最终测试集泛化性能往往压倒了 Adam！**
2019 年，Loshchilov 和 Hutter 在 ICLR 发表最佳论文之一，终于揭开了这个惊天谜团：**不是 Adam 本身泛化不行，而是业界过去三十年来把 L2 正则化直接写进损失函数的习惯，在自适应梯度优化器中犯了严重的数学概念偷换！**
AdamW 的横空出世彻底拨乱反正，将自适应优化器的泛化能力推上了前所未有的巅峰。

### 直觉理解
- **混杂水质与纯净减重（L2 正则 vs AdamW 解耦衰减）**：
  - **传统 Adam 中的 L2 正则**：我们在损失函数里加上了 $\frac{\lambda}{2} \|\theta\|^2$。求导后，正则项的惩罚导数 $\lambda \theta$ 直接与真实的训练数据梯度 $g_t$ 搅合在了一起，算出一个综合梯度 $\tilde{g}_t = g_t + \lambda \theta$。
  - **灾难发生**：这个搅合后的综合梯度被扔进了二阶动量分母 $\sqrt{v_t}$ 里面！如果一个参数本身数值极大（本应受到最严厉的权重衰减），由于分母也被成倍撑大，真实的衰减惩罚反而被**按比例除小了**！导致大权重根本无法被有效压缩，正则化名存实亡！
  - **AdamW 的手术刀解耦**：彻底把权重衰减从梯度计算中剥离出来！正常自适应梯度该怎么算还怎么算，在每次更新的最后，像手术刀一样直接对权重本身做比例扣除：$\theta \leftarrow \theta - \eta \lambda \theta$！每一份惩罚精准到账，彻底找回了强悍的泛化能力！

### 核心概念与符号对照表
| 优化器 | 一阶动量 $\hat{m}_t$ | 二阶动量 $\hat{v}_t$ | 偏差修正机制 | 权重衰减机制 |
| --- | --- | --- | --- | --- |
| **Adam** | $\frac{m_t}{1 - \beta_1^t}$ | $\frac{v_t}{1 - \beta_2^t}$ | 分母除以 $1 - \beta^t$，消除初始全零冷启动偏差 | **耦合 L2 正则**：$\lambda \theta$ 混入梯度分母，衰减失真 |
| **AdamW** | $\frac{m_t}{1 - \beta_1^t}$ | $\frac{v_t}{1 - \beta_2^t}$ | 分母除以 $1 - \beta^t$，保持无偏估计 | **彻底解耦独立衰减**：$-\eta \lambda \theta$，泛化能力暴涨 |

### 数学原理与逐步推导
#### 1. Adam 初始偏差修正（Bias Correction）的严格数学期望推导
在初始时刻，动量变量通常初始化为零：$m_0 = \mathbf{0}, v_0 = \mathbf{0}$。
考察一阶动量在时刻 $t$ 的展开式（令 $\beta = \beta_1$）：
$$m_t = (1 - \beta) \sum_{\tau=1}^t \beta^{t - \tau} g_\tau$$
对两边取数学期望。假设真实的梯度期望在早期近似平稳 $\mathbb{E}[g_\tau] \approx \mathbb{E}[g_t]$：
$$\mathbb{E}[m_t] = \mathbb{E}\left[ (1 - \beta) \sum_{\tau=1}^t \beta^{t - \tau} g_\tau \right] = \mathbb{E}[g_t] \cdot (1 - \beta) \sum_{\tau=1}^t \beta^{t - \tau}$$
利用有限等比数列求和公式 $\sum_{k=0}^{t-1} \beta^k = \frac{1 - \beta^t}{1 - \beta}$：
$$\mathbb{E}[m_t] = \mathbb{E}[g_t] \cdot (1 - \beta) \cdot \frac{1 - \beta^t}{1 - \beta} = \mathbb{E}[g_t] \cdot (1 - \beta^t)$$
**惊人发现**：未修正的动量期望 $\mathbb{E}[m_t]$ 并不是真实梯度的无偏估计，而是**带有因子 $(1 - \beta^t)$ 的严重缩水偏置**！
在第一步（$t=1, \beta_1=0.9$）时：$1 - 0.9^1 = 0.1$，初始动量被缩减了 10 倍！
对于二阶动量，$\beta_2 = 0.999$，第一步缩水 $1 - 0.999^1 = 0.001$，被暴缩了 1000 倍！
因此必须除以修正因子 $(1 - \beta^t)$：
$$\hat{m}_t = \frac{m_t}{1 - \beta_1^t}, \quad \hat{v}_t = \frac{v_t}{1 - \beta_2^t}$$
使得 $\mathbb{E}[\hat{m}_t] = \mathbb{E}[g_t]$，保证了从第 1 步起全程无偏！

#### 2. L2 正则化在 Adam 中的失效与 AdamW 的解耦推导
标准 L2 正则化目标函数为 $\mathcal{L}(\theta) + \frac{\lambda}{2} \|\theta\|^2$。
梯度为 $\nabla = g_t + \lambda \theta_{t-1}$。
在 Adam 中，若将此梯度直接代入参数更新：
$$\theta_t = \theta_{t-1} - \frac{\eta}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t$$
其中 $\hat{v}_t$ 包含 $(g_t + \lambda \theta_{t-1})^2$ 的累积！
此时实际施加在权重 $\theta_{t-1}$ 上的衰减率正比于：
$$\text{有效衰减速率} \propto \frac{\eta \lambda}{\sqrt{\hat{v}_t} + \epsilon}$$
- 若某特征梯度频发且尺度极大（如高频词 Token Embedding），其 $\hat{v}_t$ 极大，其权重衰减惩罚反而被分母严重压制，权重肆意膨胀！
**AdamW（Decoupled Weight Decay）解耦修复方案**：
让自适应梯度仅仅对原始损失函数梯度 $g_t = \nabla \mathcal{L}(\theta)$ 计算，在最后更新时显式减去独立的衰减项：
$$\theta_t = \theta_{t-1} - \eta \lambda \theta_{t-1} - \frac{\eta}{\sqrt{\hat{v}_t} + \epsilon} \hat{m}_t$$
此时每一个参数受到的权重衰减惩罚与自适应分母 $\sqrt{\hat{v}_t}$ 完全无关，彻底还原了经典 Weight Decay 的纯正收敛约束。

### 真实代码示例与分析
下面展示从零实现带有偏差修正的 Adam 与 AdamW 核心单步更新算法："""

    l2_code = """import numpy as np

def step_adam_vs_adamw(param_val, grad_val, m, v, t, lr=0.01, wd=0.1, is_adamw=True):
    \"\"\"从零手写执行单步 Adam / AdamW 优化更新\"\"\"
    beta1, beta2, eps = 0.9, 0.999, 1e-8
    
    if not is_adamw:
        # 传统 Adam: L2 正则化直接加进梯度
        grad_effective = grad_val + wd * param_val
    else:
        # AdamW: 梯度保持纯净
        grad_effective = grad_val
        
    # 1. 更新一阶和二阶动量
    m_new = beta1 * m + (1.0 - beta1) * grad_effective
    v_new = beta2 * v + (1.0 - beta2) * (grad_effective ** 2)
    
    # 2. 偏差修正 (Bias Correction)
    m_hat = m_new / (1.0 - (beta1 ** t))
    v_hat = v_new / (1.0 - (beta2 ** t))
    
    # 3. 参数更新
    adaptive_step = (lr / (np.sqrt(v_hat) + eps)) * m_hat
    
    if not is_adamw:
        param_new = param_val - adaptive_step
    else:
        # AdamW 显式解耦衰减: 直接衰减原始权重
        param_new = param_val - lr * wd * param_val - adaptive_step
        
    return param_new, m_new, v_new

# 模拟一个大权重参数、受到微小梯度扰动的极端场景
# param = 10.0 (权重很大, 亟需正则化压缩)
# grad = 0.01 (数据梯度极小)
p_adam, m_a, v_a = 10.0, 0.0, 0.0
p_adamw, m_w, v_w = 10.0, 0.0, 0.0

for step in range(1, 20):
    p_adam, m_a, v_a = step_adam_vs_adamw(p_adam, 0.01, m_a, v_a, step, is_adamw=False)
    p_adamw, m_w, v_w = step_adam_vs_adamw(p_adamw, 0.01, m_w, v_w, step, is_adamw=True)

print("=== 20 步后大权重参数收缩对比 ===")
print(f"原始权重初值: 10.0")
print(f"传统 Adam (L2 耦合) 最终权重: {p_adam:.4f} (衰减受二阶动量干扰，收缩迟缓)")
print(f"现代 AdamW (解耦衰减) 最终权重: {p_adamw:.4f} (独立精准衰减，泛化约束强劲!)")
"""

    l2_tips = [
        tip("当代所有基于 Transformer 架构的大语言模型（如 LLaMA、GPT-4、BERT）在微调和预训练时，必须使用 AdamW 并显式指定 weight_decay（通常设为 0.01 到 0.1）。如果误用普通 Adam，模型的权重模长会无节制膨胀，导致严重的测试集过拟合与注意力熵崩溃！", "interview"),
    ]

    lessons = [
        lesson("ml-dl-l3-1", "病态曲率、动量加速与自适应学习率家族", l1_content, 2, l1_tips, [demo(code=l1_code, title="病态椭圆峡谷函数下 SGD / Momentum / RMSprop 轨迹对比")]),
        lesson("ml-dl-l3-2", "王者之争：Adam 算法与 AdamW 权重衰减解耦", l2_content, 3, l2_tips, [demo(code=l2_code, title="Adam 偏差修正与 AdamW 解耦权重衰减对比验证")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-dl-c3-ex1",
            question="Loshchilov & Hutter 在 ICLR 2019 发表的重磅论文中指出的传统 Adam 优化器在配合 L2 正则化时的核心数学缺陷是什么？AdamW 是如何从根本上解决它的？",
            options=[
                {"value": "A", "text": "传统 Adam 将 L2 正则梯度与真实数据梯度直接相加，导致正则惩罚项被二阶动量分母 $\\sqrt{v_t}$ 错误除小而失真；AdamW 将权重衰减与自适应梯度更新彻底解耦，直接对权重参数做独立衰减"},
                {"value": "B", "text": "传统 Adam 无法计算负数的梯度"},
                {"value": "C", "text": "传统 Adam 没有一阶动量"},
                {"value": "D", "text": "传统 Adam 只能用于凸优化问题"},
            ],
            answer="A",
            explanation="在传统 Adam 实现中，L2 正则化以梯度相加形式混入优化过程，使得正则化强度受到自适应尺度项的除法缩放，导致大权重的衰减惩罚严重缩水。AdamW 将权重衰减彻底从梯度计算中剥离出来独立更新，还原了纯正的泛化约束。",
            difficulty=2,
            related_lesson_id="ml-dl-l3-2",
            tags=["AdamW", "解耦权重衰减", "L2正则化", "大模型优化器"],
        ),
        judge(
            ex_id="ml-dl-c3-ex2",
            question="在 Adam 优化器中，动量变量初始化为零向量（$m_0 = \\mathbf{0}, v_0 = \\mathbf{0}$）。如果在训练初期不进行偏差修正（$\\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}$），动量统计量会产生严重的偏向零的低估，导致训练前几步的有效步长发生严重失真。",
            answer=True,
            explanation="正确。由于指数移动平均从零开始初始化，在 t 较小时，未修正的期望 E[m_t] = E[g] * (1 - beta^t)。若 beta=0.9，第一步期望值缩减了 10 倍，必须除以 (1 - beta^t) 进行偏差修正恢复无偏估计。",
            difficulty=2,
            related_lesson_id="ml-dl-l3-2",
            tags=["Adam", "偏差修正", "无偏估计"],
        ),
        multiple_choice(
            ex_id="ml-dl-c3-ex3",
            question="关于深度学习常用优化器的技术演进动机，下列说法正确的有：",
            options=[
                {"value": "A", "text": "Polyak Momentum 引入一阶物理惯性，旨在抵消高频振荡方向的往复反弹，并在持续同向的平缓维度上累积加速"},
                {"value": "B", "text": "AdaGrad 首次实现了坐标轴维度的自适应学习率调节，但由于历史梯度平方单调累加不衰减，后期必然导致学习率过早衰竭停工"},
                {"value": "C", "text": "RMSprop 巧妙采用指数加权移动平均（EMA）代替简单累加，使自适应分母具备了平滑遗忘历史的能力"},
                {"value": "D", "text": "所有深度学习模型在任何任务中，标准 SGD 永远严格优于 AdamW"},
            ],
            answer=["A", "B", "C"],
            explanation="选项 A、B、C 准确概括了 Momentum、AdaGrad 和 RMSprop 的关键演进脉络。选项 D 违背客观事实，现代 Transformer 大模型普遍依赖 AdamW，SGD 无法在极复杂的自注意力多头架构中顺畅收敛。",
            difficulty=2,
            related_lesson_id="ml-dl-l3-1",
            tags=["优化器演进", "Momentum", "AdaGrad", "RMSprop"],
        ),
        fill(
            ex_id="ml-dl-c3-ex4",
            question="在 Adam 优化器的一阶动量偏差修正公式 $\\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}$ 中，若超参数 $\\beta_1 = 0.9$，在模型训练的第一步（$t=1$），用于将动量还原为无偏估计的分母系数精确为 ___（请填写小数）。",
            blanks=[["0.1"]],
            explanation="当 t=1 时，分母为 1 - (0.9)^1 = 1 - 0.9 = 0.1。这意味着初始的原始动量 m_1 会被除以 0.1（即放大 10 倍）从而消除零初始化的偏置。",
            difficulty=1,
            related_lesson_id="ml-dl-l3-2",
            tags=["Adam", "偏差修正", "数值计算"],
        ),
        open_ex(
            ex_id="ml-dl-c3-ex5",
            question="请详细推导说明：为什么在传统的 Adam 优化器中，直接向损失函数添加 L2 正则项 $\\frac{\\lambda}{2} \\|\\theta\\|^2$ 并不能等价于真实的权重衰减（Weight Decay）？为什么这种隐式耦合会破坏优化器在大模型训练中的泛化性能？",
            reference_answer="1. 传统 Adam 中 L2 正则化的数学推导：\n设带 L2 正则化的损失函数为 J(\\theta) = L(\\theta) + \\frac{\\lambda}{2} \\|\\theta\\|^2。其关于参数的梯度为：\n\\nabla J = g_t + \\lambda \\theta_{t-1}\n在传统 Adam 中，这个混合梯度 \\nabla J 被直接用于更新一阶动量 m_t 和二阶动量 v_t：\nv_t = \\beta_2 v_{t-1} + (1 - \\beta_2) (g_t + \\lambda \\theta_{t-1})^2\n此时，在参数更新公式中：\n\\theta_t = \\theta_{t-1} - \\frac{\\eta}{\\sqrt{\\hat{v}_t} + \\epsilon} \\hat{m}_t\n展开其中由 L2 正则项贡献的有效更新步长，其在权重 \\theta_{t-1} 上产生的实际收缩因子为：\n\\text{实际衰减率} \\propto \\frac{\\eta \\lambda}{\\sqrt{\\hat{v}_t} + \\epsilon}\n2. 为什么破坏泛化性能：\n- 惩罚力度与二阶动量逆向耦合：在真实的 Weight Decay（权重衰减）中，我们希望所有大权重以固定的恒定比例 \\eta \\lambda 受到压缩。但在传统 Adam 中，衰减项被除以了 \\sqrt{\\hat{v}_t}！\n- 关键参数无法约束：对于那些历史梯度很大、出现频次极高的关键参数（如频繁出现词的 Token 嵌入），其二阶动量 \\hat{v}_t 极其巨大。这导致分母急剧膨胀，该参数受到的实际权重惩罚被严重除小趋于 0！使得本该重点受到正则化压缩的大权重被放任自由膨胀，导致模型容量失控，破坏了模型的测试集泛化能力。\n3. AdamW 的解耦机制：\nAdamW 将二阶动量 v_t 严格限定仅追踪纯净的原始数据梯度 g_t，并在最终参数更新步骤中显式减去独立的衰减项 -\\eta \\lambda \\theta_{t-1}，彻底消除了分母干扰，保证了所有权重受到公平、严格的范数约束，从而恢复了强大的泛化性能。",
            explanation="推导 L2 正则梯度混入二阶动量分母导致衰减率被缩减的数学机制，深刻阐明大模型权重失控与泛化受损的原因。",
            rubric=[
                {"points": 5, "description": "严密写出梯度混入形式，推导出实际衰减项中存在 1 / sqrt(v_t) 的分母耦合因子"},
                {"points": 5, "description": "阐述当特征梯度极大时分母膨胀导致正则化惩罚被削弱失效，进而破坏泛化性能的物理机理"},
            ],
            difficulty=3,
            related_lesson_id="ml-dl-l3-2",
            tags=["AdamW", "Weight Decay", "L2正则化失效", "大模型基石"],
        ),
        # ── Code Exercise 3 ──
        {
            "id": "ml-dl-c3-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现单步 AdamW 解耦权重衰减参数更新器：\n编写函数 `adamw_step(param, grad, m, v, t, lr=0.001, beta1=0.9, beta2=0.999, weight_decay=0.01, eps=1e-8)`：\n1. `param`：当前参数浮点标量 $\\theta_{t-1}$；\n2. `grad`：当前原始数据梯度浮点标量 $g_t$；\n3. `m`：上一时刻一阶动量标量 $m_{t-1}$；\n4. `v`：上一时刻二阶动量标量 $v_{t-1}$；\n5. `t`：当前迭代步数整数（从 1 开始）；\n6. `lr`：学习率；`beta1`、`beta2`：动量衰减系数；`weight_decay`：解耦权重衰减率；`eps`：防除零极小值。\n\n步骤：\n- 更新动量：$m_t = \\beta_1 m_{t-1} + (1 - \\beta_1) g_t$，$v_t = \\beta_2 v_{t-1} + (1 - \\beta_2) g_t^2$；\n- 偏差修正：$\\hat{m}_t = \\frac{m_t}{1 - \\beta_1^t}$，$\\hat{v}_t = \\frac{v_t}{1 - \\beta_2^t}$；\n- 计算自适应步长：$\\Delta = \\frac{\\text{lr}}{\\sqrt{\\hat{v}_t} + \\text{eps}} \\hat{m}_t$；\n- 执行 AdamW 解耦更新：$\\theta_t = \\theta_{t-1} - \\text{lr} \\cdot \\text{weight_decay} \\cdot \\theta_{t-1} - \\Delta$。\n\n函数返回包含 `(round(theta_t, 6), round(m_t, 6), round(v_t, 6))` 的元组。\n\n最后一行请以 `p0 = 1.0`, `g0 = 0.5`, `m0 = 0.0`, `v0 = 0.0`, `t0 = 1` 调用该函数测试。",
            "starterCode": "from typing import Tuple\nimport numpy as np\n\ndef adamw_step(\n    param: float, grad: float, m: float, v: float, t: int,\n    lr: float = 0.001, beta1: float = 0.9, beta2: float = 0.999,\n    weight_decay: float = 0.01, eps: float = 1e-8\n) -> Tuple[float, float, float]:\n    \"\"\"从零执行单步 AdamW 解耦权重衰减与偏差修正参数更新\"\"\"\n    # 请在此实现\n    ___\n\np0 = 1.0\ng0 = 0.5\nm0 = 0.0\nv0 = 0.0\nt0 = 1\nadamw_step(p0, g0, m0, v0, t0)\n",
            "setupCode": "",
            "expectedOutput": "(0.99899, 0.05, 0.00025)",
            "answer": "from typing import Tuple\nimport numpy as np\n\ndef adamw_step(\n    param: float, grad: float, m: float, v: float, t: int,\n    lr: float = 0.001, beta1: float = 0.9, beta2: float = 0.999,\n    weight_decay: float = 0.01, eps: float = 1e-8\n) -> Tuple[float, float, float]:\n    # 1. 动量更新 (仅基于纯数据梯度 grad)\n    m_new = beta1 * m + (1.0 - beta1) * grad\n    v_new = beta2 * v + (1.0 - beta2) * (grad ** 2)\n    \n    # 2. 偏差修正\n    m_hat = m_new / (1.0 - (beta1 ** t))\n    v_hat = v_new / (1.0 - (beta2 ** t))\n    \n    # 3. 自适应步长\n    step_adapt = (lr / (np.sqrt(v_hat) + eps)) * m_hat\n    \n    # 4. AdamW 解耦更新\n    param_new = param - lr * weight_decay * param - step_adapt\n    \n    return round(float(param_new), 6), round(float(m_new), 6), round(float(v_new), 6)\n\np0 = 1.0\ng0 = 0.5\nm0 = 0.0\nv0 = 0.0\nt0 = 1\nadamw_step(p0, g0, m0, v0, t0)\n",
            "tests": "p_res, m_res, v_res = adamw_step(10.0, 0.0, 0.0, 0.0, 1, lr=0.1, weight_decay=0.05)\n# g=0 -> m_hat=0, step_adapt=0. p_new = 10.0 - 0.1 * 0.05 * 10.0 - 0 = 10.0 - 0.05 = 9.95\nassert p_res == 9.95, f\"测试不匹配: {p_res}\"\n",
            "explanation": "更新一阶和二阶动量，经幂次除法偏差修正，计算自适应更新步长并叠加显式权重衰减乘积项。",
            "tags": ["AdamW", "解耦权重衰减", "算法实战", "优化器"],
            "related_lesson_id": "ml-dl-l3-2",
        },
        single_choice(
            ex_id="ml-dl-c3-ex7",
            question="在循环神经网络（RNN）和时间序列模型中，Hinton 提出的 **RMSprop** 优化器相较于早期 AdaGrad 的最核心改进是什么？",
            options=[
                {"value": "A", "text": "改用指数移动平均（EMA）计算历史平方梯度，使分母具备了平滑遗忘远古梯度的能力，彻底打破了 AdaGrad 学习率单调萎缩至 0 的死锁"},
                {"value": "B", "text": "完全抛弃了梯度求导，改用遗传算法搜索参数"},
                {"value": "C", "text": "将学习率固定为恒等常数 1.0"},
                {"value": "D", "text": "强制让所有参数的梯度保持相同正负号"},
            ],
            answer="A",
            explanation="AdaGrad 将所有历史平方梯度直接相加，分母单调递增导致步长过早衰竭。RMSprop 引入阻尼遗忘因子 beta（指数加权移动平均），只跟踪近期梯度的局部尺度，使得学习率既能自适应调节又永葆生机。",
            difficulty=2,
            related_lesson_id="ml-dl-l3-1",
            tags=["RMSprop", "AdaGrad", "自适应步长", "EMA"],
        ),
    ]

    return chapter(
        chapter_id="ml-dl-c3",
        course_id="ml-deep-learning",
        order=3,
        title="深度学习优化算法全景演进",
        goal="掌握病态曲率与动量加速，精通 Adam 偏差修正推导与 AdamW 解耦权重衰减的革命性突破。",
        lessons=lessons,
        exercises=exercises,
    )
