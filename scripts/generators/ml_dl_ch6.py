# -*- coding: utf-8 -*-
"""
Chapter 6: PyTorch 工业级开发与模型实战训练 (PyTorch Core & Production Training Pipelines)
Course: ml-deep-learning
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_6():
    # ── Lesson 6.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握 PyTorch 底层张量（Tensor）的核心物理存储架构：连续内存块（Storage）、步长（Strides）与形状（Shape）；
2. 深刻辨析零拷贝视图操作（`view`）与物理内存深拷贝重排（`contiguous()` / `reshape`）；
3. 掌握 PyTorch 多维张量广播机制（Broadcasting Semantics）的维度对齐法则；
4. 深入剖析 PyTorch 革命性的即时动态计算图（Dynamic Computational Graph, Define-by-Run）：`requires_grad`、`grad_fn` 与 `backward()` 拓扑回溯；
5. 掌握推理部署态的显存阻断与无梯度加速机制（`with torch.no_grad():` 与 `tensor.detach()`）；
6. 编写代码演示张量底层 Strides 步长探索、自动微分求导以及显存阻断的严密对比。

### 前置知识
- 计算机连续物理内存布局与指针偏移量；
- 多维数组广播机制（NumPy 通用规则）。

### 问题背景与 ML 用途
在 PyTorch 诞生之前，早期的深度学习框架（如 TensorFlow 1.x、Theano）普遍采用**静态计算图（Define-and-Run）**：
- 必须先用 Python 编写一段抽象代码定义整张计算图，然后再开启一个神秘的 `Session` 将数据注入运行；
- 静态图最大的梦魇是**极难调试（Debug）**：想要查看某个中间变量的数值不能直接 `print()`，想要在循环中使用 Python 原生的 `if/else` 或 `for` 循环步长会直接报错报废；
- 2017 年，Facebook 人工智能研究院（FAIR）推出了 **PyTorch**：
  它开创了**动态计算图（Define-by-Run）**时代——前向计算就是真实的 Python 执行过程，图在执行的瞬间即时动态生长，原生支持最自然的 Python 语法、断点调试和动态控制流，迅速成为全球学术界研究与工业界大模型研发的绝对霸主。

### 直觉理解
- **先画死全套施工图 vs 边走边铺铁路（静态图 vs 动态图）**：
  - **静态图（TensorFlow 1.x）**：像是在盖大楼前，必须把整栋大厦每一根钢筋水泥的图纸画得一清二楚，中途哪怕发现某堵墙多开了一个门（变长文本），整套施工图纸全部作废重画；
  - **动态图（PyTorch）**：像是坐在一列一边开动一边在前方铺轨道的超级智能列车上！代码执行到哪一步，计算图就自动生长记录到哪一步。如果前面有一座桥（if 语句），列车自动向右拐；如果走完了，列车逆向倒车（backward 反向传播），自动原路返回分发梯度！极其自然、随心所欲！

### 核心概念与符号对照表
| 核心特性 | PyTorch API | 底层物理机制 | 核心工程价值 |
| --- | --- | --- | --- |
| **物理步长** | `tensor.stride()` | 从当前维度移动到下一个元素在平铺连续内存中需要跳过的浮点数个数 | 理解张量切片与转置的零拷贝机制 |
| **内存连续化** | `tensor.contiguous()` | 将因为转置（transpose）导致物理步长不规则的张量重新在内存中连续排布 | 满足底层 CUDA/C++ 高性能算子的内存连续硬要求 |
| **梯度追踪** | `requires_grad=True` | 在前向计算时记录所有的操作历史节点与 `grad_fn` | 自动构建动态计算图 |
| **显存阻断** | `with torch.no_grad():` | 彻底关闭 Autograd 引擎的计算图记录与中间激活值缓存 | **推理或验证阶段显存消耗直接减少 50% 以上，速度提升 2~3 倍** |

### 数学原理与逐步推导
#### 张量物理步长（Strides）与内存地址映射
一个维度为 $(d_0, d_1, \dots, d_{k-1})$ 的张量，在内存底层是一段单一平铺的一维连续物理数组 `Storage`。
任意多维坐标 $(i_0, i_1, \dots, i_{k-1})$ 对应的底层一维连续数组偏移量 $\text{Offset}$ 计算公式为：
$$\text{Offset} = \sum_{j=0}^{k-1} i_j \cdot s_j$$
其中 $(s_0, s_1, \dots, s_{k-1})$ 为该张量的**步长（Strides）**。
- 对于一个标准的连续二维矩阵 $(H, W)$，其默认步长为 $(W, 1)$；
- 当调用转置操作 `tensor.t()` 或 `tensor.transpose(0, 1)` 时，PyTorch **根本没有复制或移动任何底层物理内存数据**！它仅仅是将步长元组从 $(W, 1)$ 偷梁换柱改为了 $(1, W)$！实现了惊人的 $O(1)$ 零拷贝极速转置；
- 但此时该张量已经不再是内存连续的（Non-contiguous），若直接调用强依赖连续内存的 `view()` 操作就会报错，必须通过 `.contiguous()` 进行深拷贝物理规整。

### 真实代码示例与分析
下面展示纯手写模拟张量的 Strides 步长变换，并结合 Autograd 验证自动求导与显存阻断机制："""

    l1_code = """import numpy as np

# 1. 模拟张量底层的步长 (Strides) 寻址与转置零拷贝原理
raw_storage = np.arange(6, dtype=float)  # 物理连续内存: [0, 1, 2, 3, 4, 5]
shape_2x3 = (2, 3)
strides_2x3 = (3, 1)  # 移动一行跳过 3 个元素，移动一列跳过 1 个元素

def get_element(storage, coords, strides):
    offset = sum(c * s for c, s in zip(coords, strides))
    return storage[offset]

print("=== 1. 底层物理内存与步长寻址 ===")
print("访问原矩阵 (1, 2) 元素:", get_element(raw_storage, (1, 2), strides_2x3))

# 转置只需交换步长 (无需移动任何底层内存数据!)
strides_transposed = (1, 3)
print("访问转置后矩阵 (2, 1) 元素:", get_element(raw_storage, (2, 1), strides_transposed), "(零拷贝瞬间完成!)")

# 2. 模拟自动微分动态计算图节点与 no_grad 阻断
class MockTensor:
    def __init__(self, data, requires_grad=False):
        self.data = np.array(data, dtype=float)
        self.requires_grad = requires_grad
        self.grad = np.zeros_like(self.data) if requires_grad else None
        self._creator = None

    def square(self):
        out = MockTensor(self.data ** 2, requires_grad=self.requires_grad)
        if self.requires_grad:
            out._creator = ('square', self)
        return out

    def backward(self, grad_output=1.0):
        if not self.requires_grad:
            return
        if self._creator is not None:
            op, parent = self._creator
            if op == 'square':
                # d(x^2)/dx = 2x
                parent.grad += 2.0 * parent.data * grad_output
                parent.backward(grad_output)

x = MockTensor(3.0, requires_grad=True)
y = x.square()  # y = x^2 = 9.0
y.backward()

print("\\n=== 2. 动态计算图自动微分验证 ===")
print(f"前向输出 y.data = {y.data:.1f} (期望 9.0)")
print(f"反向梯度 x.grad = {x.grad:.1f} (期望 2*x = 6.0)")
"""

    l1_tips = [
        tip("张量变形推荐优先使用 tensor.reshape(...) 而非 tensor.view(...)。reshape 会在张量内存连续时自动返回零拷贝视图，在不连续时自动调用 contiguous() 完成拷贝，更加安全鲁棒。", "performance"),
    ]

    # ── Lesson 6.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握基于 `torch.nn.Module` 的模块化分层网络架构规范（参数自动登记、子模块树状递归、`__call__` 与 `forward` 机制）；
2. 掌握工业级高效数据流水线：`torch.utils.data.Dataset` 的重写与 `DataLoader` 的多进程异步预加载机制（`num_workers`、`pin_memory` 锁页显存加速）；
3. 熟练掌握标准生产级训练与验证双循环闭环 SOP（梯度归零、前向计算、损失反向传播、梯度范数裁剪 `clip_grad_norm_` 与参数更新）；
4. 掌握自动混合精度训练（AMP, Automatic Mixed Precision: `torch.autocast` + `GradScaler`）以 FP16 / BF16 翻倍榨干现代 GPU 显存与 TensorCore 算力；
5. 掌握模型与优化器状态字典（`state_dict`）的安全持久化与断点续训（Checkpointing）；
6. 编写代码完整实现一个工业级深度神经网络端到端训练循环，并在验证集上追踪损失与准确率收敛全过程。

### 前置知识
- Python 面向对象高级编程（`__init__` 与 `__call__` 魔法方法）；
- 梯度下降与多分类交叉熵损失。

### 问题背景与 ML 用途
很多初学者在写深度学习代码时，习惯把数据加载、网络前向、反向求导和日志打印写成一整坨巨大的不可读脚本：
- 一旦需要切换到 GPU 分布式训练，代码立即彻底报废；
- 数据加载成为严重瓶颈：GPU 算力利用率常年低于 20%，大量时间在等待 CPU 单线程缓慢读取磁盘文件；
- 发生硬件断电或机器宕机时，漫长训练了数天的模型参数瞬间全部化为乌有；
**掌握 PyTorch 模块化工程规范与生产级训练双循环 SOP，是每一位工业级算法工程师的核心基本功**。

### 直觉理解
- **现代超级中央厨房（工业级训练循环流水线）**：
  - **Dataset & DataLoader（生鲜冷链多线程供货）**：主厨（GPU）做菜极快，绝对不能让主厨自己跑去菜市场一根一根挑菜（单线程磁盘 IO）。`DataLoader` 配备了 4 个卡车司机（`num_workers=4`），在主厨炒第一锅菜时，后台已经在多线程洗菜、切肉、打包，通过特快专用冷链电梯（`pin_memory=True` 锁页显存）无缝滑入主厨锅边！主厨开足马力（100% GPU 利用率）全力爆炒！
  - **训练与验证双循环**：白天接待食客（训练循环，计算梯度更新火候），晚上关店盘点（验证循环，关闭火候 `eval()`，客观打分检验味道）。
  - **存档点 Checkpoint（保险箱日记）**：每天深夜把菜谱参数（`state_dict`）放进耐火保险箱，哪怕厨房失火断电，次日开门接着上一页继续炒！

### 核心概念与符号对照表
| 核心环节 | 标准 PyTorch API | 核心工程职责 | 缺省引发的后果 |
| --- | --- | --- | --- |
| **网络抽象** | `class Net(nn.Module)` | 自动管理参数注册，统一设备搬移 `.to(device)` | 无法统一保存参数，无法自动追踪层级关系 |
| **多进程加载** | `DataLoader(dataset, num_workers=4, pin_memory=True)` | 异步多进程预读数据，锁页显存直达 GPU | GPU 严重饥饿，显卡利用率低迷（< 30%） |
| **梯度裁剪** | `nn.utils.clip_grad_norm_(parameters, max_norm=1.0)` | 限制梯度二范数最大上界，强力抑制梯度爆炸 | 遇到异常大 batch 时梯度爆炸产生 NaN 崩溃 |
| **混合精度** | `torch.autocast(device_type='cuda')` | 矩阵乘用 FP16，累加保留 FP32 | 训练速度提升 2~3 倍，显存占用砍半 |
| **状态持久化** | `torch.save(checkpoint, 'ckpt.pt')` | 完整固化模型与优化器状态字典 | 意外中断后无法续训，前功尽弃 |

### 真实代码示例与分析
下面展示构建一个符合全部现代工业级规范的标准 PyTorch 风格训练与验证双循环闭环模板："""

    l2_code = """import numpy as np

# 纯 Python 模拟 PyTorch 生产级网络结构与训练循环规范
class MockLinearModule:
    def __init__(self, in_features, out_features):
        np.random.seed(42)
        # Kaiming 初始化
        std = np.sqrt(2.0 / in_features)
        self.W = np.random.randn(out_features, in_features) * std
        self.b = np.zeros((out_features, 1))
        self.grad_W = np.zeros_like(self.W)
        self.grad_b = np.zeros_like(self.b)

    def forward(self, x):
        # x 形状 (in_features, batch_size)
        return self.W @ x + self.b

    def zero_grad(self):
        self.grad_W.fill(0.0)
        self.grad_b.fill(0.0)

# 模拟端到端训练与验证循环
# 构造包含 100 个样本的二维二分类数据集
np.random.seed(42)
X_data = np.random.randn(2, 100)
y_data = (X_data[0] + X_data[1] > 0).astype(float).reshape(1, 100)

layer = MockLinearModule(in_features=2, out_features=1)
lr = 0.2
batch_size = 20
n_epochs = 15

def sigmoid(z):
    return 1.0 / (1.0 + np.exp(-np.clip(z, -15, 15)))

print("=== 生产级训练循环启动 (双循环 SOP) ===")
for epoch in range(1, n_epochs + 1):
    # 模拟 DataLoader 打乱切分批次
    perm = np.random.permutation(100)
    epoch_losses = []
    
    # --- 训练循环 (Training Step) ---
    for start_idx in range(0, 100, batch_size):
        batch_indices = perm[start_idx:start_idx + batch_size]
        xb = X_data[:, batch_indices]
        yb = y_data[:, batch_indices]
        m = len(batch_indices)
        
        # 步骤 1: 梯度归零
        layer.zero_grad()
        
        # 步骤 2: 前向传播
        logits = layer.forward(xb)
        preds = sigmoid(logits)
        
        # 步骤 3: 损失计算 (二元交叉熵)
        loss = -np.mean(yb * np.log(preds + 1e-12) + (1.0 - yb) * np.log(1.0 - preds + 1e-12))
        epoch_losses.append(loss)
        
        # 步骤 4: 反向传播计算梯度
        delta = (preds - yb)
        layer.grad_W = (delta @ xb.T) / m
        layer.grad_b = np.sum(delta, axis=1, keepdims=True) / m
        
        # 步骤 5: 梯度范数裁剪 (模拟 clip_grad_norm_)
        grad_norm = np.sqrt(np.sum(layer.grad_W ** 2) + np.sum(layer.grad_b ** 2))
        if grad_norm > 1.0:
            scale = 1.0 / grad_norm
            layer.grad_W *= scale
            layer.grad_b *= scale
            
        # 步骤 6: 优化器参数更新
        layer.W -= lr * layer.grad_W
        layer.b -= lr * layer.grad_b
        
    if epoch % 5 == 0:
        # --- 验证循环 (Validation Step: 模拟 torch.no_grad() 与 model.eval()) ---
        val_logits = layer.forward(X_data)
        val_preds = (sigmoid(val_logits) >= 0.5).astype(int)
        val_acc = np.mean(val_preds == y_data)
        print(f"Epoch {epoch:2d}/{n_epochs} | 训练集平均损失: {np.mean(epoch_losses):.4f} | 验证集准确率: {val_acc * 100:.1f}%")

print("\\n训练完成！模型成功实现从随机初始化到高准确率稳定收敛。")
"""

    l2_tips = [
        tip("在 PyTorch 生产部署中保存模型时，永远优先使用 torch.save(model.state_dict(), 'path.pt') 只保存纯权重字典，而不是直接 torch.save(model, ...) 保存整个 Python 类！保存整个类强依赖源码文件结构与 Python 反序列化环境，极难跨项目迁移。", "interview"),
    ]

    lessons = [
        lesson("ml-dl-l6-1", "PyTorch 张量计算、广播与 Autograd 动态计算图", l1_content, 3, l1_tips, [demo(code=l1_code, title="张量步长 Strides 零拷贝与自动微分引擎验证")]),
        lesson("ml-dl-l6-2", "PyTorch 模块化体系与生产级训练循环 Capstone", l2_content, 3, l2_tips, [demo(code=l2_code, title="生产级训练循环 SOP、梯度裁剪与验证评估")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-dl-c6-ex1",
            question="在 PyTorch 中，当对一个经过矩阵转置（`tensor.t()`）处理后的张量调用 `tensor.view(-1)` 时，为什么会抛出 `RuntimeError: view size is not compatible with input tensor's size and stride` 错误？应该如何优雅解决？",
            options=[
                {"value": "A", "text": "因为转置操作仅改变了步长（Strides）而没有移动物理内存，导致张量在底层内存中不再是物理连续的；解决方法是在调用 `view()` 之前先调用 `.contiguous()` 强制连续化，或者直接改用更智能的 `.reshape()`"},
                {"value": "B", "text": "因为转置把所有的浮点数自动变成了整数"},
                {"value": "C", "text": "因为 PyTorch 的 view 只能用于一维张量"},
                {"value": "D", "text": "因为显存已经完全溢出耗尽"},
            ],
            answer="A",
            explanation="view() 要求张量在底层 Storage 中必须严格物理连续，而 transpose 仅在元数据层交换了步长实现了零拷贝转置，使得物理内存不连续。解决方案是调用 .contiguous() 重新分配连续内存，或者直接使用能自适应处理连续性的 .reshape()。",
            difficulty=2,
            related_lesson_id="ml-dl-l6-1",
            tags=["PyTorch", "Strides", "contiguous", "view与reshape"],
        ),
        judge(
            ex_id="ml-dl-c6-ex2",
            question="在 PyTorch 模型的验证测试循环中，使用 `with torch.no_grad():` 上下文管理器不仅可以防止意外计算反向梯度，还能彻底阻断 Autograd 引擎对中间激活值的显存缓存，使显存占用直接降低近一半并显著提升前向推理吞吐量。",
            answer=True,
            explanation="正确。在训练时，Autograd 必须在显存中保留所有中间前向激活值以供后续反向传播使用；而在 no_grad 模式下，这些激活值计算完后立即释放，不记录计算图历史，极大节省了宝贵的 GPU 显存并加速了推理。",
            difficulty=1,
            related_lesson_id="ml-dl-l6-1",
            tags=["torch.no_grad", "显存优化", "模型评估"],
        ),
        multiple_choice(
            ex_id="ml-dl-c6-ex3",
            question="在一个严谨完备的生产级 PyTorch 训练循环中，下列哪些步骤是确保数值稳定性与最佳工程实践所不可或缺的？",
            options=[
                {"value": "A", "text": "在执行反向传播 `loss.backward()` 之前，先调用 `optimizer.zero_grad()` 清空历史累积梯度"},
                {"value": "B", "text": "在调用 `optimizer.step()` 更新权重之前，使用 `torch.nn.utils.clip_grad_norm_()` 对梯度范数进行合理截断以防梯度爆炸"},
                {"value": "C", "text": "在进入验证评估循环前显式调用 `model.eval()`，在返回训练时调用 `model.train()`"},
                {"value": "D", "text": "在持久化模型存档时，优先保存纯权重状态字典 `model.state_dict()`"},
            ],
            answer=["A", "B", "C", "D"],
            explanation="这四个步骤是 PyTorch 生产级代码的四大金科玉律：梯度清零防累加、梯度裁剪防爆炸、train/eval 状态显式切换确保 BN 与 Dropout 行为正确、以及通过 state_dict 干净轻量地持久化权重。",
            difficulty=2,
            related_lesson_id="ml-dl-l6-2",
            tags=["训练循环SOP", "梯度裁剪", "model.eval", "state_dict"],
        ),
        fill(
            ex_id="ml-dl-c6-ex4",
            question="在 PyTorch 中，为了防止深层循环网络或复杂 Transformer 在反向传播时发生毁灭性的梯度爆炸，常用于将所有参数的全局梯度二范数限制在指定最大阈值（如 `max_norm=1.0`）之内的官方实用函数全称是 `torch.nn.utils.___`（请填写函数名，如 clip_grad_norm_）。",
            blanks=[["clip_grad_norm_", "clip_grad_norm"]],
            explanation="函数为 torch.nn.utils.clip_grad_norm_，它会就地计算所有参数梯度的总体范数，若超过 max_norm 则等比例缩放所有梯度向量，强力消除数值溢出与梯度爆炸。",
            difficulty=2,
            related_lesson_id="ml-dl-l6-2",
            tags=["clip_grad_norm_", "梯度裁剪", "数值稳定性"],
        ),
        open_ex(
            ex_id="ml-dl-c6-ex5",
            question="请详细对比早期框架的“静态计算图（Define-and-Run）”与 PyTorch 的“动态计算图（Define-by-Run）”在系统底层实现、调试便捷性（Debugging）、动态控制流（如变长循环与条件分支）以及生产部署导出方面的核心异同。",
            reference_answer="1. 架构机理与底层实现的根本差异：\n- 静态计算图（如早期 TensorFlow 1.x）：采用‘先构图、后运行’的两阶段分离机制。必须先用 Python 符号语句把整张图的拓扑节点在 C++ 后端完整编织固定，然后通过 Session.run() 填入数据灌水运行。图的结构在编译后完全不可变；\n- 动态计算图（PyTorch）：采用‘运行即构图’的即时追踪机制。前向传播就是真正的 Python 解释执行过程，每次前向传播都会伴随着算子调用实时动态生成一次有向无环计算图，反向传播完成后计算图立即销毁。每一次迭代甚至每个样本都可以拥有完全不同的网络结构。\n2. 调试便捷性与动态控制流：\n- 调试体验：动态图支持在任意行直接使用 pdb 打断点、使用 print() 实时观察中间张量数值，就像调试普通 Python 脚本一样自然丝滑；而静态图在没有启动 Session 之前，中间张量只是抽象的符号句柄，无法直接查看数值，报错栈冗长晦涩，调试如同黑盒摸黑；\n- 动态控制流：动态图原生支持 Python 自身的 if/else 条件判断、for/while 变长序列循环以及递归树结构；而静态图必须引入专有的 tf.cond、tf.while_loop 等复杂包装算子，语法极度繁琐痛苦。\n3. 生产部署与推理优化权衡：\n- 静态图天生利于生产优化：因为在运行前已经掌握了整张图的完整拓扑，编译器可以全局执行算子融合（Kernel Fusion）、死代码消除与内存复用，且容易脱离 Python 运行时直接交由 C++ 裸机部署；\n- PyTorch 的现代化折中破局：PyTorch 既保留了开发态的动态图丝滑调试体验，又通过推出 TorchScript（torch.jit.trace / script）和现代 PyTorch 2.0 的 `torch.compile` 图捕获编译器，实现了在开发时使用动态图、在生产发布时一键编译为静态图兼收并蓄的最佳工业实践。",
            explanation="从两阶段编译 vs 即时建图出发，深入对比交互调试体验、原生 Python 控制流支持，并分析生产编译优化（TorchScript / torch.compile）的演进权衡。",
            rubric=[
                {"points": 5, "description": "清晰阐明静态图‘先建图后执行’与动态图‘边执行边建图’的底层架构机制差异"},
                {"points": 5, "description": "从 pdb 断点调试、原生 Python 动态循环支持以及现代 TorchScript/torch.compile 静态图导出三个维度展开论述"},
            ],
            difficulty=3,
            related_lesson_id="ml-dl-l6-1",
            tags=["静态计算图", "动态计算图", "PyTorch哲学", "TorchScript"],
        ),
        # ── Code Exercise 5 ──
        {
            "id": "ml-dl-c6-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】从零实现基于 NumPy 的模块化线性全连接层前向计算：\n编写函数 `linear_module_forward(x, weight, bias)`：\n1. `x`：输入特征 2D 数组（形状 $(N, D_{\\text{in}})$，其中 $N$ 为批大小，$D_{\\text{in}}$ 为输入维度）；\n2. `weight`：权重矩阵 2D 数组（形状 $(D_{\\text{out}}, D_{\\text{in}})$，遵循 PyTorch `nn.Linear` 权重转置标准）；\n3. `bias`：偏置向量 1D 数组（形状 $(D_{\\text{out}},)$）；\n\n根据 PyTorch 官方线性层矩阵公式：\n$$\\mathbf{y} = \\mathbf{x} W^T + \\mathbf{b}$$\n输出张量形状为 $(N, D_{\\text{out}})$。\n\n函数返回包含各元素四舍五入保留 4 位小数的 2D 嵌套列表 `y.round(4).tolist()`。\n\n最后一行请以 `x_d = [[1.0, 2.0], [3.0, 4.0]]`, `w_d = [[0.5, -0.5], [1.0, 0.0]]`, `b_d = [0.1, 0.2]` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import List\n\ndef linear_module_forward(x: List[List[float]], weight: List[List[float]], bias: List[float]) -> List[List[float]]:\n    \"\"\"从零实现符合 PyTorch 规范的线性全连接层前向运算\"\"\"\n    # 请在此实现\n    ___\n\nx_d = [[1.0, 2.0], [3.0, 4.0]]\nw_d = [[0.5, -0.5], [1.0, 0.0]]\nb_d = [0.1, 0.2]\nlinear_module_forward(x_d, w_d, b_d)\n",
            "setupCode": "",
            "expectedOutput": "[[-0.4, 1.2], [-0.4, 3.2]]",
            "answer": "import numpy as np\nfrom typing import List\n\ndef linear_module_forward(x: List[List[float]], weight: List[List[float]], bias: List[float]) -> List[List[float]]:\n    x = np.array(x, dtype=float)\n    weight = np.array(weight, dtype=float)\n    bias = np.array(bias, dtype=float)\n    \n    # PyTorch nn.Linear 公式: x @ W.T + b\n    out = x @ weight.T + bias\n    return np.round(out, 4).tolist()\n\nx_d = [[1.0, 2.0], [3.0, 4.0]]\nw_d = [[0.5, -0.5], [1.0, 0.0]]\nb_d = [0.1, 0.2]\nlinear_module_forward(x_d, w_d, b_d)\n",
            "tests": "x_t = [[1.0, 1.0]]\nw_t = [[2.0, 3.0]]\nb_t = [0.5]\nres_t = linear_module_forward(x_t, w_t, b_t)\n# 1*2 + 1*3 + 0.5 = 5.5\nassert res_t == [[5.5]], f\"测试不匹配: {res_t}\"\n",
            "explanation": "根据 PyTorch 官方 nn.Linear 设计规范，输入矩阵 x 与转置后的权重矩阵做矩阵乘法，随后广播加上偏置向量，输出仿射变换结果。",
            "tags": ["nn.Linear", "矩阵运算", "PyTorch规范", "算法实战"],
            "related_lesson_id": "ml-dl-l6-2",
        },
        single_choice(
            ex_id="ml-dl-c6-ex7",
            question="在现代 GPU 上训练深层大模型时，开启自动混合精度（AMP, Automatic Mixed Precision: `torch.autocast` + `GradScaler`）的主要核心机理与收益是什么？",
            options=[
                {"value": "A", "text": "对显存占用与计算开销最大的算子（如卷积、全连接大矩阵乘）自动采用半精度（FP16/BF16）极速加速，同时在数值敏感算子（如 Softmax、残差累加）中保持高精度（FP32），并使用 GradScaler 动态防梯度下溢，在完全不损失模型精度的前提下使显存减半并带来数倍加速"},
                {"value": "B", "text": "将所有浮点数强制四舍五入为 8 位整数"},
                {"value": "C", "text": "完全抛弃 GPU，改用 CPU 并发"},
                {"value": "D", "text": "使模型不需要计算损失函数"},
            ],
            answer="A",
            explanation="AMP 充分发挥了现代 GPU TensorCore 的混合精度计算优势。通过对矩阵乘法自动使用 FP16/BF16 吞吐翻倍，对易溢出敏感算子维持 FP32，并辅以 GradScaler 动态缩放损失防止小梯度浮点下溢，在保精度的同时榨干硬件算力。",
            difficulty=2,
            related_lesson_id="ml-dl-l6-2",
            tags=["AMP", "自动混合精度", "FP16/BF16", "GPU算力优化"],
        ),
    ]

    return chapter(
        chapter_id="ml-dl-c6",
        course_id="ml-deep-learning",
        order=6,
        title="PyTorch 工业级开发与模型实战训练",
        goal="掌握 PyTorch 底层张量 Strides 零拷贝与 Autograd 动态图，熟练运用 nn.Module、数据加载与生产级训练双循环 SOP。",
        lessons=lessons,
        exercises=exercises,
    )
