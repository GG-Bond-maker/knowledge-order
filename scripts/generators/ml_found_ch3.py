# -*- coding: utf-8 -*-
"""
Chapter 3: 泛化理论、过拟合与偏差—方差权衡
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_3():
    # ── Lesson 3.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握真实数据生成机制中的确定性信号与不可消除误差（Bayes Error）的数学假设；
2. 从头到尾严格推导出均方误差的「偏差—方差—噪声」三分法恒等式；
3. 深刻理解偏差（Bias）、方差（Variance）与不可约误差（Noise）各自的物理本质与几何对应；
4. 运行蒙特卡洛抽样代码实验，亲眼观察在 100 个平行训练集上低阶模型（高偏差低方差）与高阶模型（低偏差高方差）的拟合轨迹波动。

### 前置知识
- 随机变量的期望 $E[X]$、方差 $\\text{Var}(X) = E[X^2] - (E[X])^2$；
- 独立随机变量的协方差性质。

### 问题背景
在机器学习面试和工业实践中，大家经常听到“这个模型方差太大了”、“偏差太高了”。
这绝非空洞的修辞，而是现代统计学习理论中最核心、最漂亮的数学结论之一。
当我们训练一个模型 $\\hat{f}(x; D)$ 时，这个模型依赖于我们随机抽取的具体训练集 $D$。如果重新从真实世界采样另一个训练集 $D'$，模型学出来的权重就会发生改变。
**偏差—方差分解（Bias-Variance Decomposition）**回答了：在所有可能的训练集随机采样下，模型在某个未见测试样本点 $x$ 上的期望预测误差，究竟是由什么构成的？

### 直觉理解
想象射箭打靶：
- **高偏差，低方差（欠拟合）**：弓箭手的瞄准器装歪了，但他肌肉控制极其稳定。射出 100 支箭，箭矢极其紧密地聚集成一个小圈（方差极小），但整体位置严重偏离红心中心（系统性偏差大）；
- **低偏差，高方差（过拟合）**：弓箭手瞄准器完全校准，但他喝醉了酒手剧烈发抖。射出 100 支箭，所有箭矢的几何重心正好落在红心正中央（偏差为 0），但单只箭矢散落到靶子的边缘甚至脱靶（方差巨大，极不稳健）；
- **低偏差，低方差（理想模型）**：神射手百发百中，所有箭矢密集扎在红心正中。

### 核心概念与符号对照表
| 分解项 | 符号 | 数学定义 | 现实物理本质 |
| --- | --- | --- | --- |
| **真实数据** | $y$ | $y = f^*(x) + \\epsilon, \\; \\epsilon \\sim (0, \\sigma^2)$ | 自然客观世界真值，带有不可测的客观噪声 |
| **集成平均预测** | $\\bar{f}(x)$ | $\\mathbb{E}_D [\\hat{f}(x; D)]$ | 在所有可能训练集上训练出的无穷多个模型的平均预测 |
| **偏差平方** | $\\text{Bias}^2(\\hat{f}(x))$ | $(f^*(x) - \\bar{f}(x))^2$ | 算法模型拟合能力的系统性不足（假说空间太小） |
| **模型方差** | $\\text{Var}_D(\\hat{f}(x))$ | $\\mathbb{E}_D [(\\hat{f}(x; D) - \\bar{f}(x))^2]$ | 训练集微小数据扰动给预测结果带来的剧烈抖动程度 |
| **不可消除误差** | $\\sigma^2$ | $\\mathbb{E}_\\epsilon [\\epsilon^2]$ | 贝叶斯最优误差，任何算法都无法突破的理论精度天花板 |

### 数学原理与逐步推导
设真实输出 $y = f^*(x) + \\epsilon$，其中噪声满足 $\\mathbb{E}[\\epsilon] = 0, \\text{Var}(\\epsilon) = \\sigma^2$ 且 $\\epsilon$ 与训练集 $D$ 独立。
记 $\\hat{f} = \\hat{f}(x; D)$，$\\bar{f} = \\mathbb{E}_D[\\hat{f}]$。
对测试点 $x$ 处的均方误差期望进行展开：
$$\\mathbb{E}_{D, \\epsilon} [(y - \\hat{f})^2] = \\mathbb{E}_{D, \\epsilon} [(f^*(x) + \\epsilon - \\hat{f})^2]$$
在括号内引入并减去 $\\bar{f}$：
$$f^*(x) + \\epsilon - \\hat{f} = (f^*(x) - \\bar{f}) + (\\bar{f} - \\hat{f}) + \\epsilon$$
将其平方展开，得到三项的平方及交叉项：
$$[(f^* - \\bar{f}) + (\\bar{f} - \\hat{f}) + \\epsilon]^2 = (f^* - \\bar{f})^2 + (\\bar{f} - \\hat{f})^2 + \\epsilon^2 + 2(f^* - \\bar{f})(\\bar{f} - \\hat{f}) + 2(f^* - \\bar{f})\\epsilon + 2(\\bar{f} - \\hat{f})\\epsilon$$

现在对其关于 $D$ 和 $\\epsilon$ 求期望：
1. **交叉项处理**：
   - $\\mathbb{E}_D [2(f^* - \\bar{f})(\\bar{f} - \\hat{f})] = 2(f^* - \\bar{f}) (\\bar{f} - \\mathbb{E}_D[\\hat{f}]) = 2(f^* - \\bar{f})(\\bar{f} - \\bar{f}) = 0$；
   - $\\mathbb{E}_\\epsilon [2(f^* - \\bar{f})\\epsilon] = 2(f^* - \\bar{f}) \\mathbb{E}[\\epsilon] = 0$；
   - $\\mathbb{E}_{D, \\epsilon} [2(\\bar{f} - \\hat{f})\\epsilon] = 2 \\mathbb{E}_D[\\bar{f} - \\hat{f}] \\cdot \\mathbb{E}_\\epsilon[\\epsilon] = 0$。
   所有交叉项期望严格为 0！

2. **平方项求期望**：
   - 第一项：$\\mathbb{E}_D [(f^* - \\bar{f})^2] = (f^*(x) - \\bar{f}(x))^2 = \\text{Bias}^2(\\hat{f}(x))$；
   - 第二项：$\\mathbb{E}_D [(\\hat{f} - \\bar{f})^2] = \\text{Var}_D(\\hat{f}(x))$；
   - 第三项：$\\mathbb{E}_\\epsilon [\\epsilon^2] = \\sigma^2$。

**推导终局恒等式**：
$$\\text{泛化误差 } \\mathbb{E}[(y - \\hat{f})^2] = \\underbrace{(f^*(x) - \\mathbb{E}[\\hat{f}(x)])^2}_{\\text{偏差}^2 (\\text{Bias}^2)} + \\underbrace{\\mathbb{E}[(\\hat{f}(x) - \\mathbb{E}[\\hat{f}(x)])^2]}_{\\text{方差 } (\\text{Variance})} + \\underbrace{\\sigma^2}_{\\text{不可约噪声}}$$

### 逐步实现与代码解析
下面的 Python 脚本使用蒙特卡洛仿真，从相同分布生成 80 个不同的训练集，分别训练 1 阶线性模型（高偏差低方差）与 10 阶多项式模型（低偏差高方差），精准计算其数值：

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline

# 1. 设定真实客观法则: f*(x) = sin(pi * x)
n_datasets = 80
n_samples = 20
rng = np.random.default_rng(42)

x_eval = 0.6  # 选定测试点评估
y_true_eval = np.sin(np.pi * x_eval)
noise_sigma = 0.2

preds_deg1 = []
preds_deg10 = []

for _ in range(n_datasets):
    X_train = rng.uniform(-1, 1, size=(n_samples, 1))
    noise = rng.normal(0, noise_sigma, size=(n_samples, 1))
    y_train = np.sin(np.pi * X_train) + noise
    
    # 模型 1: 1阶线性模型
    m1 = LinearRegression().fit(X_train, y_train)
    preds_deg1.append(float(m1.predict([[x_eval]])[0]))
    
    # 模型 2: 10阶多项式复杂模型
    m10 = make_pipeline(PolynomialFeatures(10), LinearRegression()).fit(X_train, y_train)
    preds_deg10.append(float(m10.predict([[x_eval]])[0]))

preds_deg1 = np.array(preds_deg1)
preds_deg10 = np.array(preds_deg10)

# 计算 Bias^2 与 Variance
bias2_m1 = (np.mean(preds_deg1) - y_true_eval) ** 2
var_m1 = np.var(preds_deg1)

bias2_m10 = (np.mean(preds_deg10) - y_true_eval) ** 2
var_m10 = np.var(preds_deg10)

print(f"测试点 x={x_eval} 处的客观真值 f*(x) = {y_true_eval:.4f}\\n")
print(f"【1阶线性回归（欠拟合）】 Bias^2: {bias2_m1:.4f} | Variance: {var_m1:.4f} | 总误差(含噪声): {bias2_m1 + var_m1 + noise_sigma**2:.4f}")
print(f"【10阶多项式（过拟合）】 Bias^2: {bias2_m10:.4f} | Variance: {var_m10:.4f} | 总误差(含噪声): {bias2_m10 + var_m10 + noise_sigma**2:.4f}")
```

### 常见易错点与典型反例
1. **以为方差是指“数据的方差”**：
   - 极其严重的混淆！偏差—方差分解中的 Variance 指的是**模型估计量 $\\hat{f}$ 随着训练集抽样而产生的波动方差**，绝不是指自变量 $X$ 的样本方差！
2. **以为增加样本量可以消除偏差**：
   - 如果模型假说空间本身是平面的（线性模型），但真实规律是弯曲的球面，就算采集 10 亿条数据，偏差（Bias）也不会缩小，它由模型表达能力上限封死。

### 知识联系与进阶桥梁
- **上承**：2.3 节结构风险最小化；
- **下接**：3.2 节过拟合与欠拟合的系统诊断与解药矩阵；
- **集成学习预告**：Bagging（如随机森林）的核心原理正是通过平均多个模型来显著**削减方差（Variance）**，而 Boosting（如 GBDT）的核心原理是通过序列拟合残差来**削减偏差（Bias）**。

### 本节总结与自查清单
- [ ] 能否闭卷推导出均方误差的偏差-方差分解三大项？
- [ ] 为什么交叉项在求期望后全盘抵消为 0？
- [ ] 增加模型复杂度时，Bias 和 Variance 的变化趋势是什么（一个上升一个下降的对抗权衡）？

### 权威来源与延伸阅读
- Trevor Hastie, Robert Tibshirani, Jerome Friedman (2009). *The Elements of Statistical Learning*, Section 7.3: The Bias-Variance Decomposition, Springer.
- Christopher M. Bishop (2006). *Pattern Recognition and Machine Learning*, Section 3.2: The Bias-Variance Decomposition, Springer."""

    # ── Lesson 3.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 精准辨析欠拟合（Underfitting, 高偏差）与过拟合（Overfitting, 高方差）在训练集与验证集上的量化表现；
2. 掌握针对高偏差（欠拟合）与高方差（过拟合）的工业级标准排查与解药清单；
3. 理解模型容量（Capacity）、特征维度与数据规模在控制过拟合中的三角博弈；
4. 运行多项式复杂度扫描代码，观测训练集 Loss 与验证集 Loss 经典的“U 型”泛化演变曲线。

### 前置知识
- 3.1 节偏差—方差权衡数学分解；
- 训练集（Train Set）与验证集（Validation Set）基本划分。

### 问题背景
算法工程师日常 80% 的工作，是在同两头猛兽搏斗：**欠拟合**与**过拟合**。
- 如果模型欠拟合，连现有训练数据中最基本的规律都抓不住，模型毫无预测能力；
- 如果模型过拟合，模型把训练数据中的微小噪声、录入笔误甚至巧合特征当成了普遍规律死记硬背，一旦上线遇到新数据立刻崩塌。
在实际调优中，盲目调参往往像“蒙眼掷骰子”：如果一个模型已经严重过拟合，工程师却还在疯狂增加模型层数和特征维度，只会南辕北辙，让系统崩溃得更加彻底。

### 直觉理解
- **欠拟合（高偏差）**：近视眼不戴眼镜看黑板。不管是苹果还是篮球，在他眼里都是一团模糊的圆影（模型容量严重不足，什么都区分不了）；
- **过拟合（高方差）**：作弊的小学生把昨晚模拟卷答案全背下来了。“第 13 题选 C 因为题目第三行印着一只小污渍”。到了正式考试，没有那个污渍，他立刻交白卷；
- **恰到好处（良好泛化）**：学生真正理解了物理守恒定律，哪怕考卷把小球换成滑块，他依然能从容推导。

### 核心概念与符号对照表
| 状态特征 | 训练集误差 $E_{\\text{train}}$ | 验证集误差 $E_{\\text{val}}$ | 泛化差距 (Generalization Gap) | 核心归因 |
| --- | --- | --- | --- | --- |
| **欠拟合 (高偏差)** | 高 | 高 (与训练集接近) | 很小 ($E_{\\text{val}} \\approx E_{\\text{train}}$) | 假说空间太小，模型容量不足，特征表达力贫弱 |
| **良好拟合** | 低 | 低 (略高于训练集) | 合理可接受范围 | 偏差与方差达到最优平衡点 |
| **过拟合 (高方差)** | 极低 (接近 0) | 极高 (远超训练集) | 巨大 ($E_{\\text{val}} \\gg E_{\\text{train}}$) | 模型容量过大，强行拟合噪声，样本量相对不足 |

### 数学原理与逐步推导
#### 经典“U 型”泛化误差曲线
当模型复杂度（如多项式阶数 $M$、树的深度、神经网络参数量）从 1 逐渐增加到 $\\infty$ 时：
1. **训练误差**：单调不增。因为更大的假说空间严格包含了更小的假说空间（$\\mathcal{H}_1 \\subset \\mathcal{H}_2 \\subset \\dots$），在更大空间中搜索得到的经验最小值必然不劣于子空间：
   $$E_{\\text{train}}(M_1) \\ge E_{\\text{train}}(M_2) \\quad (\\text{当 } M_1 < M_2)$$
2. **验证误差**：呈现典型的 **U 型曲面**：
   - 阶段一（高偏差区）：随着复杂度增加，偏差急剧下降，方差轻微上升，验证误差总体迅速下降；
   - 阶段二（最优平衡点 $M^*$）：偏差降低的收益正好与方差上升的代价相互抵消，总泛化误差达到最低极小值；
   - 阶段三（高方差区）：偏差已降无可降，但方差呈指数级发散抬升，验证误差急剧飙升！

#### 工业解药清单全景对照矩阵
| 诊断问题 | 首选解药（优先级最高） | 辅助解药 | 绝对错误的做法（严禁使用） |
| --- | --- | --- | --- |
| **高偏差 (欠拟合)** | 1. 增加特征组合（多项式/交叉特征）；<br>2. 选用更强大的非线性模型（如从线性切到 GBDT/神经网络）；<br>3. 减小正则化系数 $\\lambda$ | 减少特征剪枝约束，增加树深度/层数 | 盲目采集更多同分布样本（无法降低偏差！） |
| **高方差 (过拟合)** | 1. 采集并标注更多训练数据；<br>2. 引入正则化（L1/L2、Dropout）；<br>3. 特征降维与特征选择（剔除冗余噪声特征）；<br>4. 降低模型复杂度（限制树深度、早停法 Early Stopping） | 数据增强（Data Augmentation）、集成学习（Bagging） | 增加更多复杂交互特征、调大模型容量 |

### 逐步实现与代码解析
下面的 Python 脚本扫描 1 到 12 阶多项式回归模型，计算并打印出训练误差与验证误差，清晰展示“U 型”转折点：

```python
import numpy as np
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline

# 1. 构造带有适度噪声的非线性数据
rng = np.random.default_rng(100)
x = np.sort(rng.uniform(-3, 3, size=40))
y = np.cos(x) + rng.normal(0, 0.25, size=40)

# 2. 划分训练集与验证集 (各 20 个样本)
X_train, y_train = x[:20].reshape(-1, 1), y[:20]
X_val, y_val = x[20:].reshape(-1, 1), y[20:]

degrees = [1, 2, 4, 8, 12]

print("=== 多项式阶数扫描与 U 型泛化误差对比 ===")
print("阶数 M | 训练集 MSE | 验证集 MSE | 诊断结论")
print("-" * 52)

for deg in degrees:
    model = make_pipeline(PolynomialFeatures(deg), LinearRegression())
    model.fit(X_train, y_train)
    
    mse_train = np.mean((model.predict(X_train) - y_train) ** 2)
    mse_val = np.mean((model.predict(X_val) - y_val) ** 2)
    
    if deg <= 1:
        diag = "严重欠拟合 (高偏差)"
    elif deg in [2, 4]:
        diag = "泛化良好 (最优平衡)"
    else:
        diag = "严重过拟合 (方差爆炸)"
        
    print(f" {deg:2d}   |   {mse_train:6.4f}   |   {mse_val:6.4f}   | {diag}")
```

### 常见易错点与典型反例
1. **欠拟合时狂堆训练数据**：
   - 团队在欠拟合（比如逻辑回归拟合非线性异或数据）时，花了数月采集了 1000 万条新数据，发现准确率依然只有 50%。因为模型的假说空间被死死限制在超平面上，增加数据完全无法打破物理表达上限。
2. **在验证集上调参调到过拟合**：
   - 频繁在同一个固定验证集上手工调整超参数，本质上是将验证集信息泄漏到了工程师的大脑中，导致模型对验证集“隐式过拟合”。必须保留独立的最终测试集（Test Set）仅在上线前做一次盲测。

### 知识联系与进阶桥梁
- **上承**：3.1 节偏差-方差数学分解；
- **下接**：3.3 节学习曲线诊断法。

### 本节总结与自查清单
- [ ] 为什么训练集误差随复杂度单调下降，而验证集误差会反弹上升？
- [ ] 当模型处于高偏差（欠拟合）时，继续加标注数据有效吗？为什么？
- [ ] 面对严重过拟合，按优先级说出前 3 种工程化解决手段。

### 权威来源与延伸阅读
- Andrew Ng (2018). *Machine Learning Yearning*, Chapters 10-14: Bias and Variance Diagnostics.
- Gareth James et al. (2023). *An Introduction to Statistical Learning*, Section 2.2.2: The Bias-Variance Trade-Off, Springer."""

    # ── Lesson 3.3 ──
    l3_content = """### 学习目标
学完本节，你应该能够：
1. 理解学习曲线（Learning Curves，以样本量 $N$ 为横轴、误差为纵轴）的动态诊断精髓；
2. 精准绘制并识别高偏差模型与高方差模型在不同样本量下的特征渐近线；
3. 根据学习曲线的收敛间隙（Gap），科学做出“是否值得申请预算标注更多数据”的高价值工程决策；
4. 运行 Scikit-Learn `learning_curve` 仿真代码，动态生成真实数据集上的学习曲线。

### 前置知识
- 3.2 节欠拟合与过拟合量化表现；
- K 折交叉验证（K-Fold CV）均值与标准差计算。

### 问题背景
企业在推进 AI 项目时，最昂贵、耗时最长的事情往往是：**数据采集与人工清洗标注**。
业务方经常向算法团队发问：“我们再花 50 万标注 10 万条新数据，模型准确率能不能再提 5 个点？”
如果盲目回答“肯定能”，往往会在投入重金后发现模型性能原地踏步，造成巨大损失。
**学习曲线（Learning Curves）**正是回答这个商业与工程生死问题的“X 光透视仪”。它能在你只有小规模数据时，通过观察曲线的渐近走势，精准预测继续堆积数据究竟是在创造奇迹，还是在徒劳烧钱。

### 直觉理解
- **高偏差学习曲线（天花板太低）**：你骑一辆自行车。车速从 5km/h 练到 25km/h（样本量从 100 增到 1000）后，无论你再骑 10 万公里（样本量再翻 100 倍），自行车速度也不可能突破 35km/h——因为机械结构上限死死封住了速度上限。训练误差与验证误差迅速在很高的水平线上紧紧粘合在一起。
- **高方差学习曲线（潜力巨大，嗷嗷待哺）**：你驾驶一架超音速战斗机。刚开始开，因为仪表盘太复杂（参数量巨大），你频频坠机（验证误差极高）。但随着航行里程从 100 小时积累到 10000 小时（海量数据注入），战斗机的恐怖潜能彻底被驯服，验证误差持续强劲下挫，逼近极佳水准。

### 核心概念与符号对照表
| 曲线指标 | 横轴与纵轴定义 | 高偏差模型特征 | 高方差模型特征 |
| --- | --- | --- | --- |
| **横轴** | 训练样本量 $N$ (由小到大) | $N = 50 \\rightarrow 5000$ | $N = 50 \\rightarrow 5000$ |
| **纵轴** | 误差值 Error (或得分 Score) | MSE 误差 / 错误率 | MSE 误差 / 错误率 |
| **训练曲线** | 随 $N$ 增大逐渐轻微上升 | 上升很快，迅速在高误差平台处变平 | 始终保持在极低水平（容易背住小样本） |
| **验证曲线** | 随 $N$ 增大逐渐下降 | 下降很慢，迅速在很高的误差处变平 | 持续显著下降，但与训练曲线保持显著宽间隙 |
| **渐近间隙** | Gap: $E_{\\text{val}} - E_{\\text{train}}$ | **几乎为 0**（两条线死死贴合） | **很大**（存在显著 Generalization Gap） |
| **数据扩充决策** | 继续堆数据是否有用？ | **彻底无用**（绝不追加标注！） | **极其有效**（应全力扩充训练数据！） |

### 数学原理与逐步推导
#### 为什么样本量 $N$ 上升时，训练误差通常会略微上升？
设经验风险最小化目标为：
$$\\min_{f \\in \\mathcal{H}} \\frac{1}{N} \\sum_{i=1}^N L(f(\\mathbf{x}_i), y_i)$$
- 当 $N$ 极小（如 $N=3$）时，要在低维空间穿过这 3 个点极其轻松，模型可以轻易把误差做成 0；
- 随着 $N$ 增加到 1000，数据点充满全空间并伴随不可消除的随机噪声，任何有限假说空间 $\\mathcal{H}$ 都无法同时满足所有约束，因此平均经验训练误差会不可避免地**单调上升**；
- 当 $N \\rightarrow \\infty$ 时，训练误差上升并渐近收敛于假说空间的最优期望拟合误差；验证误差则单调下降并收敛于相同极限值。

### 逐步实现与代码解析
下面的完整代码使用 Scikit-Learn 的 `learning_curve` 模块，对比支持向量机（高方差配置 vs 欠拟合配置）在不同训练集尺寸下的学习曲线数值轨迹：

```python
import numpy as np
from sklearn.svm import SVR
from sklearn.model_selection import learning_curve

# 1. 合成非线性数据集 (正弦波 + 噪声)
rng = np.random.default_rng(42)
X = rng.uniform(-3, 3, size=(200, 1))
y = np.sin(X).ravel() + rng.normal(0, 0.2, size=200)

train_sizes = np.linspace(0.1, 1.0, 5)

# 2. 模拟高方差模型学习曲线 (过拟合倾向: 超高 gamma)
train_sz, train_sc, val_sc = learning_curve(
    SVR(C=10.0, gamma=5.0), X, y,
    train_sizes=train_sizes, cv=5, scoring='neg_mean_squared_error', random_state=42
)

# 转换为正数 MSE
train_mse = -np.mean(train_sc, axis=1)
val_mse = -np.mean(val_sc, axis=1)

print("=== 高方差复杂模型学习曲线轨迹 ===")
print("样本比例 | 样本数 N | 训练集 MSE | 验证集 MSE | 泛化鸿沟 (Gap)")
print("-" * 58)
for sz, n_s, t_m, v_m in zip(train_sizes, train_sz, train_mse, val_mse):
    gap = v_m - t_m
    print(f" {sz*100:4.0f}%   |   {n_s:3d}    |   {t_m:6.4f}   |   {v_m:6.4f}   |   {gap:6.4f}")

print("\\n[诊断洞察] 观察随着 N 从 16 增加到 160，验证集 MSE 持续显著下降 (Gap 快速收窄)！")
print("说明对于该高方差模型，继续追加标注更多数据能够带来巨大的泛化提升！")
```

### 常见易错点与典型反例
1. **死盯单个指标，不看曲线趋势**：
   - 仅看一个孤立的验证集准确率 82%，无法判断模型到底遭遇了什么瓶颈。如果画出学习曲线发现两条线早已贴合，说明已到模型表达极限，必须升级算法架构而非死磕调参。
2. **在学习曲线中发生数据泄漏**：
   - 在计算每个子样本量的学习曲线时，预处理（如特征归一化）必须在每个切折的训练子集内部独立拟合，严禁在全数据集上一次性拟合特征再做切分。

### 知识联系与进阶桥梁
- **上承**：3.1 节偏差-方差理论与 3.2 节诊断清单；
- **下接**：第 4 章正则化方法（当学习曲线显示高方差且暂时无法获取新数据时，正则化是首选武器）。

### 本节总结与自查清单
- [ ] 高偏差学习曲线与高方差学习曲线最直观的视觉差异是什么（间隙 Gap 大小）？
- [ ] 面对一条训练误差与验证误差紧密贴合但数值偏高的学习曲线，你的第一推荐行动是什么？
- [ ] 为什么样本量增多时，训练集的 MSE 往往不是下降而是略微上升？

### 权威来源与延伸阅读
- Andrew Ng (2018). *Machine Learning Yearning*, Chapters 15-20: Learning Curves.
- Scikit-Learn Documentation (2024). *Validation curves: plotting scores to evaluate models*."""

    lessons = [
        lesson(
            lesson_id="ml-found-l3-1",
            title="泛化误差的严格数学分解：偏差—方差权衡（Bias-Variance Tradeoff）",
            content=l1_content,
            difficulty=3,
            tips=[
                tip("高频必考公式：泛化均方误差 = Bias^2 + Variance + 噪声。请务必记住交叉项求期望为 0 的条件（随机噪声与训练抽样独立）。", "interview"),
                tip("不可约噪声的含义：即使你构建了全宇宙最完美的超级大模型，泛化误差的绝对下限也只能达到客观测量噪声方差 sigma^2，绝不可能降为 0。", "note"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 简单代码演示 Bias 与 Variance 对抗
# 真实真值 f*(x) = 2.0
y_true = 2.0

# 抽样模拟 5 次不同训练集得到 5 个模型预测
# 模型 A (高偏差，低方差): 每次预测极其稳定在 1.0 附近
m_a = np.array([1.01, 0.99, 1.00, 1.02, 0.98])
# 模型 B (低偏差，高方差): 均值正对 2.0，但波动剧烈
m_b = np.array([3.5, 0.5, 2.8, 1.2, 2.0])

print(f"模型 A: Bias^2 = {(np.mean(m_a) - y_true)**2:.4f}, Variance = {np.var(m_a):.4f}")
print(f"模型 B: Bias^2 = {(np.mean(m_b) - y_true)**2:.4f}, Variance = {np.var(m_b):.4f}")
""",
                    lang="python",
                    title="偏差与方差对比极简数值算例",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l3-2",
            title="过拟合与欠拟合的诊断机制与解药清单",
            content=l2_content,
            difficulty=2,
            tips=[
                tip("排查误区警示：当发现模型欠拟合时，千万不要浪费算力和资金去采集标注更多数据！增加数据只能解决方差过大，完全无法降低偏差，此时首要任务是特征工程与升级模型容量。", "pitfall"),
                tip("生产最佳实践：在模型调优初期，故意训练一个能够把小批次训练集 Loss 打到 0 的过拟合大模型，以此验证代码实现无 Bug 且模型容量足够，然后再逐步加正则化控方差。", "leak"),
            ],
            demos=[
                demo(
                    code="""import numpy as np
from sklearn.linear_model import Ridge

# 验证增大正则化系数 lambda 如何抑制过拟合
rng = np.random.default_rng(0)
X = rng.normal(0, 1, size=(20, 10))
y = X[:, 0] * 3.0 + rng.normal(0, 0.5, size=20)

for alpha in [0.01, 1.0, 100.0]:
    clf = Ridge(alpha=alpha).fit(X, y)
    norm_w = np.linalg.norm(clf.coef_)
    print(f"正则化强度 alpha={alpha:6.2f} | 权重 L2 范数 ||w||: {norm_w:.4f}")
""",
                    lang="python",
                    title="正则化系数调节模型复杂度实验",
                )
            ],
        ),
        lesson(
            lesson_id="ml-found-l3-3",
            title="学习曲线（Learning Curves）深度分析法",
            content=l3_content,
            difficulty=3,
            tips=[
                tip("高管汇报杀手锏：当管理层催问是否还要采数据时，呈上一张学习曲线图。如果两条线已贴合，用数据说话证明边际效益递减，果断申请将资源投入到特征建设或大模型重构上。", "interview"),
                tip("性能监控法则：在数据流持续涌入的线上系统，定期跑学习曲线监控新数据引入是否带来了持续的泛化增益，可预防数据沉余与维护成本失控。", "performance"),
            ],
            demos=[
                demo(
                    code="""import numpy as np

# 极简模拟学习曲线渐近形态
N_sizes = [50, 100, 200, 500, 1000]

# 模拟高偏差系统: 很快收敛在 0.35 处
train_err_bias = 0.35 - 0.20 / np.sqrt(N_sizes)
val_err_bias = 0.35 + 0.20 / np.sqrt(N_sizes)

print("=== 高偏差模型学习曲线：间隙迅速归零 ===")
for n, te, ve in zip(N_sizes, train_err_bias, val_err_bias):
    print(f"样本数 N={n:4d} | 训练误差={te:.3f} | 验证误差={ve:.3f} | 差距={ve-te:.3f}")
""",
                    lang="python",
                    title="学习曲线渐近极限数值模拟",
                )
            ],
        ),
    ]

    # ── Exercises for Chapter 3 ──
    exercises = [
        single_choice(
            ex_id="ml-found-c3-ex1",
            question="在均方误差的偏差—方差分解中，关于不可消除误差（$\\sigma^2$, Irreducible Error / Noise）的本质，以下哪项叙述是正确的？",
            options=[
                {"value": "A", "text": "通过引入足够深层的超级神经网络与海量数据，$\\sigma^2$ 理论上可以被完全降为 0"},
                {"value": "B", "text": "它是客观数据生成过程本身的随机性或未被观测的潜变量所决定的，任何模型均无法突破这一精度下限"},
                {"value": "C", "text": "通过增加 L2 正则化惩罚项可以有效抑制 $\\sigma^2$ 的大小"},
                {"value": "D", "text": "它仅存在于小样本场景，当样本量 $N \\rightarrow \\infty$ 时必定消亡"},
            ],
            answer="B",
            explanation="不可消除误差 $\\sigma^2$（贝叶斯最优误差）由系统固有的不可测量噪声（如量化误差、不可观测环境扰动）决定，与具体算法和参数无关，代表任何学习算法在该数据分布下的理论误差下界。",
            difficulty=2,
            related_lesson_id="ml-found-l3-1",
            tags=["偏差方差分解", "不可消除误差", "理论基础"],
        ),
        judge(
            ex_id="ml-found-c3-ex2",
            question="当模型处于严重的欠拟合（高偏差）状态时，只要投入足够的资金继续采集并标注 100 倍数量的同分布训练数据，就必然能够大幅降低模型的泛化误差。",
            answer=False,
            explanation="错误。高偏差（欠拟合）的根源在于模型的假说空间容量不足（例如用直线拟合圆弧），其表达能力受制于先验架构上限。继续增加同分布样本只能让高偏差更加精准，完全无法打破模型的结构表达天花板。",
            difficulty=2,
            related_lesson_id="ml-found-l3-2",
            tags=["欠拟合", "数据量", "工程决策"],
        ),
        multiple_choice(
            ex_id="ml-found-c3-ex3",
            question="某自动驾驶感知模型在验证集上的错误率远高于训练集（训练集错误率 1%，验证集错误率 22%）。这表明模型正遭遇严重的高方差（过拟合）问题。以下哪些举措能够有效缓解该问题？",
            options=[
                {"value": "A", "text": "采集更多的标注场景图像，或者使用旋转、缩放、色彩抖动等数据增强（Data Augmentation）手段扩充样本多样性"},
                {"value": "B", "text": "引入权重衰减（L2 正则化）或 Dropout 机制约束参数空间自由度"},
                {"value": "C", "text": "进一步增加模型深度与宽度，引入更多的超参数以增强记忆能力"},
                {"value": "D", "text": "采用早停法（Early Stopping）在验证集误差开始反弹拐点处及时终止训练"},
            ],
            answer=["A", "B", "D"],
            explanation="选项 A、B、D 均是针对高方差（过拟合）的标准解药：扩充数据、正则化约束、早停截断。选项 C 增加模型复杂度只会火上浇油，让过拟合与方差爆炸更加严重。",
            difficulty=2,
            related_lesson_id="ml-found-l3-2",
            tags=["过拟合", "正则化", "早停法"],
        ),
        fill(
            ex_id="ml-found-c3-ex4",
            question="在绘制学习曲线（Learning Curves）时，以训练样本量 $N$ 为横轴。如果观察到训练误差曲线与验证误差曲线随着 $N$ 的增大迅速贴合在一起，且二者均收敛在一个很高的误差平台上，则表明模型存在严重的 ____（高偏差 / 高方差）；此时继续采集更多训练数据的边际增益几乎为 ____。",
            blanks=[
                ["高偏差", "欠拟合"],
                ["0", "零", "0%", "无"]
            ],
            explanation="两条曲线紧密贴合且均处于高误差平台，是典型的高偏差（欠拟合）指征。此时模型容量达到饱和上限，继续追加数据的边际收益几乎为零。",
            difficulty=2,
            related_lesson_id="ml-found-l3-3",
            tags=["学习曲线", "高偏差", "诊断填空"],
        ),
        open_ex(
            ex_id="ml-found-c3-ex5",
            question="【推导与综合分析题】\n1. 请写出均方误差（MSE）期望预测误差关于偏差平方（$\\text{Bias}^2$）、模型方差（$\\text{Variance}$）与不可消除噪声（$\\sigma^2$）的分解公式，并说明为什么交叉项期望为 0；\n2. 结合该公式，阐明为什么集成学习中的随机森林（Random Forest / Bagging）能够有效提升泛化能力，而梯度提升树（GBDT / Boosting）的优化侧重点有何不同？",
            reference_answer="""1. 偏差-方差分解公式及交叉项为 0 的原因：
- 公式：
  $$\\mathbb{E}[(y - \\hat{f})^2] = (f^*(x) - \\mathbb{E}[\\hat{f}(x)])^2 + \\mathbb{E}[(\\hat{f}(x) - \\mathbb{E}[\\hat{f}(x)])^2] + \\sigma^2 = \\text{Bias}^2 + \\text{Variance} + \\sigma^2$$
- 交叉项归零原因：在展开式中包含 $(f^* - \\bar{f})(\\bar{f} - \\hat{f})$ 与包含噪声 $\\epsilon$ 的交叉项。由于噪声 $\\epsilon$ 服从均值为 0 且与训练集抽样完全独立，$\\mathbb{E}[\\epsilon] = 0$ 使得两项含 $\\epsilon$ 的交叉项期望为 0；同时 $\\mathbb{E}_D[\\bar{f} - \\hat{f}] = \\bar{f} - \\mathbb{E}_D[\\hat{f}] = \\bar{f} - \\bar{f} = 0$，使得第一项交叉项也严格为 0。

2. 集成学习两大算法族的不同侧重：
- **随机森林（Bagging / 降低方差）**：
  基学习器选用完全生长、不剪枝的深层决策树（具有极低的偏差，但极高的方差）。通过 Bootstrap 自助重采样与特征子集随机采样，训练出 $B$ 棵彼此弱相关的独立决策树进行算术平均。由概率论知，若 $B$ 个独立同方差变量平均，均值方差变为原来的 $1/B$。因此随机森林在保持极低偏差的同时，成倍压低了模型方差（Variance）。
- **梯度提升树（Boosting / 降低偏差）**：
  基学习器通常选用浅层决策树（弱学习器，具有高偏差、低方差）。通过串行迭代，每一棵新树专门拟合前序集成模型的残差伪梯度（降低系统性未捕获信号）。因此 Boosting 主要致力于不断压低整体模型的偏差（Bias），再通过学习率缩减（Shrinkage）来稳固方差。""",
            explanation="本题将统计学习理论的数学分解直击机器学习最核心的两大集成范式（Bagging vs Boosting）的第一性原理。",
            rubric=[
                {"point": "准确给出 Bias-Variance-Noise 三分法数学分解公式", "score": 25},
                {"point": "严谨证明交叉项期望由于噪声零均值与独立性而全部归零", "score": 25},
                {"point": "阐明随机森林通过深树低偏差 + 多树平均大幅削减方差的机理", "score": 25},
                {"point": "阐明 GBDT 通过浅树弱学习器逐步拟合残差大幅降低偏差的机理", "score": 25},
            ],
            difficulty=4,
            related_lesson_id="ml-found-l3-1",
            tags=["偏差方差推导", "随机森林", "GBDT", "集成学习原理"],
        ),
        # ── Code Exercise 3 ──
        {
            "id": "ml-found-c3-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】蒙特卡洛计算预测估计量的偏差平方与方差：\n编写函数 `calc_bias_variance(y_true_scalar, preds_array)`：\n接收一个标量真值 `y_true_scalar`（浮点数）和一个一维 NumPy 浮点数组 `preds_array`（表示在 $M$ 个不同训练集上对该样本的预测值输出集合）。\n返回一个字典，包含两个浮点数（保留四位小数）：\n1. `bias_squared`: 偏差平方 $(f^* - \\bar{f})^2$；\n2. `variance`: 模型预测方差 $\\mathbb{E}[(\\hat{f} - \\bar{f})^2]$。\n\n最后一行请返回调用 `calc_bias_variance(2.0, np.array([1.5, 2.5, 2.0, 1.0, 3.0]))` 的字典结果。",
            "starterCode": "import numpy as np\n\ndef calc_bias_variance(y_true_scalar: float, preds_array: np.ndarray) -> dict:\n    \"\"\"计算在单个测试样本点处的偏差平方与预测方差\"\"\"\n    # 请在此实现\n    ___\n\ncalc_bias_variance(2.0, np.array([1.5, 2.5, 2.0, 1.0, 3.0]))\n",
            "setupCode": "",
            "expectedOutput": "{'bias_squared': 0.0, 'variance': 0.5}",
            "answer": "import numpy as np\n\ndef calc_bias_variance(y_true_scalar: float, preds_array: np.ndarray) -> dict:\n    mean_pred = float(np.mean(preds_array))\n    bias2 = float((mean_pred - y_true_scalar) ** 2)\n    var = float(np.mean((preds_array - mean_pred) ** 2))\n    return {\"bias_squared\": round(bias2, 4), \"variance\": round(var, 4)}\n\ncalc_bias_variance(2.0, np.array([1.5, 2.5, 2.0, 1.0, 3.0]))\n",
            "tests": "res = calc_bias_variance(10.0, np.array([10.0, 10.0, 10.0]))\nassert res['bias_squared'] == 0.0, f\"无偏差测试失败: {res}\"\nassert res['variance'] == 0.0, f\"无方差测试失败: {res}\"\nres2 = calc_bias_variance(5.0, np.array([2.0, 2.0]))\nassert res2['bias_squared'] == 9.0, f\"高偏差测试失败: {res2}\"\nassert res2['variance'] == 0.0, f\"零方差测试失败: {res2}\"\n",
            "explanation": "偏差衡量多次实验平均预测与客观真值的系统性偏离，方差衡量各次预测围绕均值的弥散程度。",
            "tags": ["偏差方差计算", "蒙特卡洛", "NumPy基础"],
            "related_lesson_id": "ml-found-l3-1",
        },
        single_choice(
            ex_id="ml-found-c3-ex7",
            question="在模型调优过程中，当多项式回归的阶数由 1 阶逐步增加到 15 阶时，训练集上的经验均方误差（Train MSE）与独立测试集上的泛化均方误差（Test MSE）通常呈现什么演变趋势？",
            options=[
                {"value": "A", "text": "Train MSE 持续单调下降，而 Test MSE 先下降后剧烈反弹上升（呈 U 型曲面）"},
                {"value": "B", "text": "Train MSE 和 Test MSE 均呈现持续单调下降"},
                {"value": "C", "text": "Train MSE 先下降后上升，Test MSE 持续单调下降"},
                {"value": "D", "text": "Train MSE 保持不变，Test MSE 持续上升"},
            ],
            answer="A",
            explanation="随着模型容量单调扩大，大假说空间严格覆盖小空间，训练集经验误差必然单调不增；但测试集误差在越过偏差与方差的最佳平衡点后，方差急剧爆炸导致泛化误差迅速恶化反弹，呈现经典的 U 型曲线。",
            difficulty=2,
            related_lesson_id="ml-found-l3-2",
            tags=["泛化曲线", "U型曲线", "多项式回归"],
        ),
    ]

    return chapter(
        chapter_id="ml-found-c3",
        course_id="ml-foundations",
        order=3,
        title="泛化理论、过拟合与偏差—方差权衡",
        goal="掌握泛化误差的数学推导本质，深刻领会偏差与方差的对抗权衡，精通学习曲线与过拟合工业诊断方法。",
        lessons=lessons,
        exercises=exercises,
    )
