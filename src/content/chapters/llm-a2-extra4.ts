import type { Chapter } from '../../types';

/* ============================================================
 *  c7 混合精度  c8 数据工程  c9 Scaling Laws
 *  参考：CS336 L5(GPUs)/L9,L11(Scaling)/L13-L14(Data)、
 *       Mixed Precision Training (Micikevicius 2017)、Chinchilla
 * ============================================================ */

export const llmA2Extra4: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c7：混合精度与数值稳定性
   * ============================================================ */
  {
    id: 'llm-a2-c7',
    title: '混合精度：用一半显存跑更快的训练',
    goal: '理解 fp16/bf16 的取舍、loss scaling 的必要性、master weights 的作用，并能排查溢出问题。',
    lessons: [
      {
        id: 'llm-a2-c7-l1',
        title: 'fp32 / fp16 / bf16 的位数取舍',
        content: `
### 学习目标

学完本节，你应该能够：
1. 画出 fp32/fp16/bf16 位分配表，解释 fp16 与 bf16 取舍方向相反；
2. 演示 fp16 的 65504 溢出与 1e-8 下溢，解释 bf16 成为默认的原因；
3. 复述混合精度配方：计算用低精度、存储与累加用高精度。

### 前置知识

- c5/c6 的训练流程；
- 二进制与科学计数法。

### 问题背景

fp32 训练 7B 光权重就 28GB，bf16 直接减半且张量核算力翻倍——混合精度是现代 LLM 训练的默认开关。但 fp16 的 65504 上限与 1e-8 下限随时引爆 NaN：理解位分配与 loss scaling，是排查训练崩溃的第一技能。

### 直觉理解

浮点数像科学计数法：fp32 给 8 位指数（量程）和 23 位尾数（刻度）；fp16 把两者都砍——量程只剩 ±65504；bf16 聪明在保住 8 位指数只砍尾数——『量程不变、刻度变粗』。训练里致命的是溢出（激活 1e5 直接 inf）而不是 2 位精度，所以 bf16 胜出。混合配方一句话：算用低精度（快），存和加用高精度（准）。

### 核心概念与原理详解

## 三种精度的位分配

浮点数的格式是「1 位符号 + 指数位 + 尾数位」：

| 格式 | 符号 | 指数 | 尾数 | 动态范围 | 精度（有效数字） | 字节 |
| --- | --- | --- | --- | --- | --- | --- |
| **fp32** | 1 | 8 | 23 | ±3.4e38 | ~7 位十进制 | 4 |
| **fp16** | 1 | 5 | 10 | ±65504 | ~3 位十进制 | 2 |
| **bf16** | 1 | 8 | 7 | ±3.4e38 | ~2 位十进制 | 2 |

**关键观察**：
- fp16 与 bf16 **同为 2 字节**，省一半显存与带宽；
- 但两者的取舍方向**完全相反**：
  - fp16 尾数多（10 位）→ **精度高但范围窄**（超过 65504 就溢出）
  - bf16 指数多（8 位，与 fp32 相同）→ **范围大但精度低**

## 为什么大模型几乎都选 bf16

训练中最大的风险是**数值溢出**，而不是精度不够。典型场景：

- 梯度算出来是 1e-8（fp16 下溢为 0）
- 中间激活达到 1e5（fp16 直接 inf）
- softmax 的 exp 结果都可能超范围

**bf16 的动态范围与 fp32 完全一致**，因此几乎不会溢出，
代价是尾数只有 7 位（约 2 位十进制精度）——但对神经网络训练已经足够。

**历史背景**：Google TPU 原生支持 bf16（2018 起），
NVIDIA 从 A100（2020）开始支持。这也是 bf16 在 LLM 时代成为默认的原因。

## 混合精度的标准配方

不是"全部用 bf16"，而是**混合**：

| 部分 | 精度 | 理由 |
| --- | --- | --- |
| 前向/反向的矩阵乘 | **bf16** | 占绝大部分算力，用低精度加速 |
| 权重的主副本（master weights） | **fp32** | 参数更新需要精度，避免累积误差 |
| 梯度累加 | **fp32** | 小数相加在 bf16 下会丢失 |
| 优化器状态（m, v） | **fp32** | 同上 |
| LayerNorm / softmax / loss | **fp32** | 数值敏感操作 |
| 归约（all-reduce） | **fp32** | 跨卡求和的精度 |

**核心思想**：**计算用低精度（快），存储和累加用高精度（准）**。

\`\`\`python
# PyTorch 的自动混合精度
from torch.cuda.amp import autocast, GradScaler

scaler = GradScaler()
for x, y in loader:
    optimizer.zero_grad()
    with autocast(dtype=torch.bfloat16):
        out = model(x)          # 前向自动用 bf16
        loss = criterion(out, y)
    scaler.scale(loss).backward()   # 反向用 fp16 时需要 scale
    scaler.step(optimizer)
    scaler.update()
\`\`\`

## 为什么 bf16 通常不需要 loss scaling

**loss scaling 是为 fp16 设计的补丁**：
fp16 的最小正规数约 6e-5，很多梯度小于这个值会变成 0（下溢）。

**做法**：把 loss 乘以一个大常数（如 2^16），梯度跟着放大，
就不会下溢；更新参数前再除回来。

      scaled_loss = loss * 2^16
      scaled_loss.backward()      # 梯度也被放大
      optimizer.step()            # 内部把梯度除以 2^16

**bf16 因为指数范围与 fp32 相同，不存在下溢问题，通常无需 loss scaling。**

> 这就是为什么现代 LLM 训练代码里几乎看不到 GradScaler——
> 大家都用 bf16 了。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
print("fp16 max:", np.finfo(np.float16).max, "| fp16(1e-8) =", np.float16(np.float32(1e-8)))
def to_bf16(x):     # fp32 舍入到 bf16（尾数截到 7 位）
    x = np.float32(x)
    bits = x.view(np.uint32)
    bits = (bits + np.uint32(0x7FFF) + ((bits >> np.uint32(16)) & np.uint32(1))) & np.uint32(0xFFFF0000)
    return bits.view(np.float32)
for v in (3.14159, 1e-8, 1e5, 65520.0):
    f16 = np.float16(np.float32(v)) if abs(np.float32(v)) <= 65504 else np.float16(np.inf)
    print(f"{v}: fp32={np.float32(v):.6g}  bf16≈{to_bf16(v):.6g}  fp16={f16}")
s32 = np.float32(0); s16 = np.float16(0)
for _ in range(10000):                          # 顺序累加（模拟梯度累加）
    s32 = np.float32(s32 + np.float32(0.01))
    s16 = np.float16(s16 + np.float16(0.01))
print(f"顺序累加 0.01×10000: fp32={float(s32):.2f} | fp16={float(s16):.2f}（期望 100，fp16 在 32 附近饱和：ulp>0.01 加不上去）")\`\`\`

预期输出（实测）：fp16 上限 65504：1e5 与 65520 均 inf、1e-8 下溢为 0；bf16 全部保留量程（65520→65536、1e5→99840、1e-8→1.00117e-08）；顺序累加 0.01×10000：fp32=100.00，fp16 在 32 附近饱和（ulp>0.01 加不上去）——梯度累加必须 fp32。

**常见错误**：fp16 训练没加 loss scaling，小梯度 1e-8 全部下溢为 0，模型『看起来在训但不动』；把 master weights 也存成 fp16，万次更新误差累积吞掉学习效果；softmax/LayerNorm 也跑 bf16，数值敏感操作放大误差。

### 常见误区

1. **『bf16 精度低所以不如 fp16』**——训练瓶颈是溢出不是精度，bf16 量程与 fp32 相同，实践更稳；\\n2. **『混合精度=全部半精度』**——master weights/优化器状态/归约仍 fp32，纯 fp16 训练几乎必炸；\\n3. **『loss scaling 适用于 bf16』**——bf16 量程大基本不需要 scaling，它是 fp16 专属补丁。

### 知识关联

- **向前**：c8 数据质量决定模型上限，精度只决定下限；
- **向后**：c6 的 all-reduce 要求 fp32 归约与本章精度纪律一致；
- **平行**：llm-a3 的 RMSNorm fp32 归约是『低精度存储+高精度归约』的单层缩影。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 位分配 | fp32 1+8+23 / fp16 1+5+10 / bf16 1+8+7 |
| fp16 风险 | ±65504 溢出、1e-8 下溢 → 需 loss scaling |
| bf16 优势 | 量程=fp32 不易溢出，尾数 7 位够用 |
| 混合配方 | 矩阵乘 bf16 + master weights/累加/归约 fp32 |
| 排查 | NaN 先查 fp16 溢出位置，再查 lr 与 warmup |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Vaswani et al. (2017)、Hoffmann et al. (2022) arXiv:2203.15556《Chinchilla》、Rajbhandari et al. (2020) ZeRO 论文与 PyTorch FSDP 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「fp16 与 bf16 的区别」：同 2 字节，fp16 尾数多（精度高）但范围窄（±65504 易溢出）；bf16 指数与 fp32 相同（范围大）但尾数少（精度低）。大模型都选 bf16。',
          },
          {
            kind: 'leak',
            text: '混合精度配方的核心：矩阵乘用 bf16（快），master weights / 梯度累加 / 优化器状态 / 归一化用 fp32（准）。',
          },
          {
            kind: 'note',
            text: 'loss scaling 是 fp16 专用的补丁（防下溢）。用 bf16 时通常不需要 GradScaler。',
          },
        ],
        demos: [
          {
            title: 'fp16 / bf16 表示范围实测',
            lang: 'python',
            code: `import numpy as np

print("格式     | 最大可表示 | 最小正规数 | 有效数字")
print("-" * 55)
print(f"fp32     | {np.finfo(np.float32).max:10.3e} | {np.finfo(np.float32).tiny:10.3e} | ~7 位")
print(f"fp16     | {np.finfo(np.float16).max:10.3e} | {np.finfo(np.float16).tiny:10.3e} | ~3 位")
# numpy 无 bf16，用 float32 手动模拟（保留 8 位尾数）
print(f"bf16(理) | {3.4e38:10.3e} | {1.2e-38:10.3e} | ~2 位")

print()
print("=== 溢出演示 ===")
big = 1e5
print(f"数值 {big:.0e}:")
print(f"  转 fp16 -> {np.float16(big)}  (inf 表示溢出)")
print(f"  转 fp32 -> {np.float32(big)}")

print()
print("=== 下溢演示 ===")
small = 1e-8
print(f"数值 {small:.0e}:")
print(f"  转 fp16 -> {np.float16(small)}  (0 表示下溢)")
print(f"  转 fp32 -> {np.float32(small)}")

print()
print("结论：fp16 容易溢出/下溢，bf16 因指数与 fp32 相同而安全")`,
          },
          {
            title: 'loss scaling 的原理',
            lang: 'python',
            code: `import numpy as np

# 模拟 fp16 下溢
FP16_MIN = 6.1e-5

grads = np.array([1e-6, 1e-5, 1e-4, 1e-3])
print("原始梯度:", grads)
print(f"fp16 最小正规数: {FP16_MIN:.1e}")
print()

# 不 scale：小梯度归零
unscaled = np.array([g if g >= FP16_MIN else 0.0 for g in grads])
print("不 scale -> fp16 表示:", unscaled)
print(f"  丢失了 {np.sum(unscaled == 0)} / {len(grads)} 个梯度！")
print()

# 用 scale 放大
SCALE = 2**16
scaled = grads * SCALE
print(f"乘以 {SCALE} 后:", scaled)
print("都能被 fp16 表示:", all(g >= FP16_MIN for g in scaled))
print()

# 更新前除回来
unscaled_back = scaled / SCALE
print("除回来更新参数:", unscaled_back)
print("与原始梯度一致:", np.allclose(unscaled_back, grads))
print()
print("这就是 GradScaler 做的事：放大 -> 反向 -> 除回 -> 更新")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a2-c7-e1',
        type: 'single',
        difficulty: 2,
        question: 'fp16 与 bf16 都是 2 字节，主要区别是？',
        options: [
          { value: 'A', text: 'bf16 精度更高' },
          { value: 'B', text: 'fp16 尾数位多（精度高）但指数位少（范围窄）；bf16 相反' },
          { value: 'C', text: '两者完全相同' },
          { value: 'D', text: 'bf16 占用更多显存' },
        ],
        answer: 'B',
        explanation: 'fp16 是 1+5+10 位，bf16 是 1+8+7 位。bf16 的 8 位指数与 fp32 相同，动态范围一致，不会溢出；但尾数只有 7 位，精度较低。',
        tags: ['精度格式'],
      },
      {
        id: 'llm-a2-c7-e2',
        type: 'judge',
        difficulty: 2,
        question: 'bf16 的最大可表示数值约为 65504。',
        answer: false,
        explanation: '65504 是 **fp16** 的上限。bf16 的指数位与 fp32 相同（8 位），最大值约 3.4e38。这正是 bf16 不易溢出的原因。',
        tags: ['精度格式'],
      },
      {
        id: 'llm-a2-c7-e3',
        type: 'multiple',
        difficulty: 3,
        question: '混合精度训练中，哪些部分通常保持 fp32？（多选）',
        options: [
          { value: 'A', text: '权重的主副本（master weights）' },
          { value: 'B', text: '优化器状态（Adam 的 m、v）' },
          { value: 'C', text: '梯度累加' },
          { value: 'D', text: '矩阵乘法的输入' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：矩阵乘用 bf16 才快，这是混合精度的收益来源。A/B/C 都需要精度，保持 fp32。',
        tags: ['混合精度'],
      },
      {
        id: 'llm-a2-c7-e4',
        type: 'fill',
        difficulty: 3,
        question: '为避免 fp16 下溢，训练时把 loss 乘以一个大常数再反向传播，这个技术叫 loss ___。',
        blanks: [['scaling', 'scale', '缩放', '放大']],
        explanation: 'loss scaling：放大 loss → 梯度同比放大 → 不下溢 → 更新参数前除回来。用 bf16 时通常不需要，因为 bf16 范围与 fp32 相同。',
        tags: ['loss scaling'],
      },
      {
        id: 'llm-a2-c7-e5',
        type: 'code',
        difficulty: 2,
        question: '计算精度格式的位分配：实现 `float_bits(fmt)`，返回 `(符号位, 指数位, 尾数位, 字节数)`。\n\n支持 "fp32"、"fp16"、"bf16"。',
        starterCode: `def float_bits(fmt):
    table = {
        "fp32": ___,   # (符号, 指数, 尾数, 字节)
        "fp16": ___,
        "bf16": ___,
    }
    return table[fmt]


float_bits("bf16")
`,
        setupCode: '',
        expectedOutput: '(1, 8, 7, 2)',
        tests: `assert float_bits("fp32") == (1, 8, 23, 4), f"fp32 错误: {float_bits('fp32')}"
assert float_bits("fp16") == (1, 5, 10, 2), f"fp16 错误: {float_bits('fp16')}"
assert float_bits("bf16") == (1, 8, 7, 2), f"bf16 错误: {float_bits('bf16')}"
# 位数总和应为 32 或 16
for f in ("fp32", "fp16", "bf16"):
    s, e, m, b = float_bits(f)
    assert s + e + m == b * 8, f"{f} 位数与字节数不符"
`,
        answer: `def float_bits(fmt):
    table = {
        "fp32": (1, 8, 23, 4),
        "fp16": (1, 5, 10, 2),
        "bf16": (1, 8, 7, 2),
    }
    return table[fmt]


float_bits("bf16")`,
        explanation:
          '```python\ntable = {\n    "fp32": (1, 8, 23, 4),\n    "fp16": (1, 5, 10, 2),\n    "bf16": (1, 8, 7, 2),\n}\nreturn table[fmt]\n```\n\n**记忆方法**：fp32 = 1+8+23；fp16 把指数砍到 5、尾数砍到 10；bf16 只砍尾数到 7，保留 8 位指数——这就是"b"（brain float）的设计哲学。',
        tags: ['编程', '精度格式'],
      },
      {
        id: 'llm-a2-c7-e6',
        type: 'code',
        difficulty: 3,
        question: '模拟 loss scaling：实现 `simulate_loss_scaling(grads, scale, fp16_min=6.1e-5)`。\n\n1. 不 scale 时，把 < fp16_min 的梯度置 0（下溢）\n2. scale 后，检查是否所有梯度都 >= fp16_min\n3. 返回 `(下溢数量_不scale, 下溢数量_scale, 恢复后是否等于原梯度)`',
        starterCode: `import numpy as np

def simulate_loss_scaling(grads, scale, fp16_min=6.1e-5):
    grads = np.asarray(grads, dtype=float)
    underflow_raw = ___
    scaled = ___
    underflow_scaled = ___
    recovered = scaled / scale
    ok = bool(np.allclose(recovered, grads))
    return underflow_raw, underflow_scaled, ok


simulate_loss_scaling([1e-6, 1e-5, 1e-4, 1e-3], 2**16)
`,
        setupCode: '',
        expectedOutput: '(2, 0, True)',
        tests: `import numpy as np
raw, sc, ok = simulate_loss_scaling([1e-6, 1e-5, 1e-4, 1e-3], 2**16)
assert raw == 2, f"不 scale 应有 2 个下溢，实际 {raw}"
assert sc == 0, f"scale 后应无下溢，实际 {sc}"
assert ok == True, "恢复后应等于原梯度"

raw2, sc2, _ = simulate_loss_scaling([1e-8, 1e-7], 2**16)
assert raw2 == 2, "极小的梯度都下溢"
assert sc2 == 0, f"放大后不再下溢，实际 {sc2}"
`,
        answer: `import numpy as np

def simulate_loss_scaling(grads, scale, fp16_min=6.1e-5):
    grads = np.asarray(grads, dtype=float)
    underflow_raw = int(np.sum(grads < fp16_min))
    scaled = grads * scale
    underflow_scaled = int(np.sum(scaled < fp16_min))
    recovered = scaled / scale
    ok = bool(np.allclose(recovered, grads))
    return underflow_raw, underflow_scaled, ok


simulate_loss_scaling([1e-6, 1e-5, 1e-4, 1e-3], 2**16)`,
        explanation:
          '```python\nunderflow_raw = int(np.sum(grads < fp16_min))\nscaled = grads * scale\nunderflow_scaled = int(np.sum(scaled < fp16_min))\nrecovered = scaled / scale\nok = bool(np.allclose(recovered, grads))\n```\n\n**核心逻辑**：放大后所有梯度都超过 fp16 最小正规数，不再下溢；除回来数值不变。\n\n2^16 = 65536 是 bf16/fp16 混训的常见 scale 值。',
        tags: ['编程', 'loss scaling'],
      },
      {
        id: 'llm-a2-c7-e7',
        type: 'judge',
        difficulty: 3,
        question: '使用 bf16 训练通常不需要 loss scaling。',
        answer: true,
        explanation: 'bf16 的指数位与 fp32 相同（8 位），最小正规数约 1.2e-38，几乎不会下溢。loss scaling 是专门为 fp16（最小正规数 6e-5）设计的补丁。',
        tags: ['混合精度'],
      },
      {
        id: 'llm-a2-c7-e8',
        type: 'single',
        difficulty: 3,
        question: '训练时 loss 突然变成 NaN，且已经用了 bf16，最应该先检查什么？',
        options: [
          { value: 'A', text: '学习率是否过大' },
          { value: 'B', text: '数据里是否有 inf/nan' },
          { value: 'C', text: '模型层数' },
          { value: 'D', text: 'GPU 型号' },
        ],
        answer: 'A',
        explanation: 'bf16 下溢/溢出的可能性很低，因此 NaN 更可能来自学习率过大导致的梯度爆炸。其次是数据本身的异常值。排查顺序：降学习率 → 加梯度裁剪 → 检查数据。',
        tags: ['数值稳定'],
      },
      {
        id: 'llm-a2-c7-e9',
        type: 'open',
        difficulty: 4,
        question:
          '请解释为什么大模型训练普遍使用 bf16 而不是 fp16，并从「动态范围」「精度」「历史原因」「工程实践」四个角度展开。同时说明混合精度训练中哪些部分必须保留 fp32。',
        referenceAnswer: `**一、动态范围：决定性因素**

- fp16：1+5+10 位，最大 65504，最小正规数 6.1e-5。
- bf16：1+8+7 位，最大 3.4e38，最小正规数 1.2e-38——**与 fp32 完全一致**。

训练中极易出现超出 fp16 范围的数值：
- softmax 的中间结果、attention 的 logits 可能达到 1e4~1e5（fp16 溢出为 inf）
- 小梯度、小激活可能低于 6.1e-5（fp16 下溢为 0）
- 一旦出现 inf，反向传播就会产生 NaN，整个训练崩溃

bf16 因为范围与 fp32 相同，这些情况都不会发生。

**二、精度：bf16 的劣势可接受**

bf16 尾数只有 7 位（约 2~3 位十进制），比 fp16 的 10 位低。
但神经网络训练对精度并不苛刻：
- 参数更新本身有随机性（SGD 噪声）；
- 大量实验表明 bf16 与 fp16 的最终效果几乎无差异；
- 真正需要精度的部分（权重更新、梯度累加）会用 fp32 保留。

**三、历史与硬件**

- Google TPU 从 2018 年起原生支持 bf16，专为深度学习设计；
- NVIDIA 从 A100（2020）开始支持 bf16；
- 随着 A100/H100 成为 LLM 训练主力，bf16 成为默认。

**四、工程实践：省去 loss scaling**

fp16 必须配 GradScaler（放大 loss 防下溢 + 除回），
这引入了额外的调参（scale 初值、growth/backoff 策略）和调试成本。
bf16 不需要这一层，代码更简单、更少出错。

**五、必须保留 fp32 的部分**

| 部分 | 原因 |
| --- | --- |
| Master weights（权重主副本） | 参数更新是"小量累加"，低精度会丢失更新量 |
| 梯度累加 | 同上，多个小梯度相加在低精度下会被舍入 |
| 优化器状态 m、v | Adam 的动量需要长期累积，精度敏感 |
| LayerNorm / softmax / loss 计算 | 数值敏感，容易溢出或精度损失 |
| 跨卡 all-reduce | 大数相加需要精度 |
| 矩阵乘的输入/输出 | **用 bf16**（这是加速来源） |

**核心原则**：计算密集的部分用低精度（快），存储与累加用高精度（准）。`,
        rubric: [
          { point: 'bf16 指数与 fp32 相同、范围大不易溢出', score: 3 },
          { point: 'fp16 范围窄易溢出/下溢，需 loss scaling', score: 2 },
          { point: 'bf16 精度较低但训练可接受', score: 1 },
          { point: '正确列出必须 fp32 的部分（master weights/优化器/归一化）', score: 2 },
        ],
        keywords: ['动态范围', '65504', 'loss scaling', 'master weights', 'fp32', '溢出'],
        explanation: '这是混合精度的核心题。能说清"范围比精度更重要"这个判断，就抓住了本质。',
        tags: ['混合精度', '面试'],
      },
    ],
  },

  /* ============================================================
   *  c8：数据工程
   * ============================================================ */
  {
    id: 'llm-a2-c8',
    title: '预训练数据概览（深入见 A5）',
    goal: '建立"数据决定模型上限"的直觉，了解来源、清洗、去重与配比的全貌。完整的数据工程方法在「数据工程与语料构建（A5）」中展开。',
    lessons: [
      {
        id: 'llm-a2-c8-l1',
        title: '预训练数据全景：来源、清洗与去重的速览',
        content: `
### 学习目标

学完本节，你应该能够：
1. 列出六大数据来源与 LLaMA 配比，说明代码数据对推理能力的增益；
2. 写出网页清洗七道关流水线（提取→语言→质量→去重→安全→配比）；
3. 用启发式规则表过滤低质文本，并说明质量分类器打分方案。

### 前置知识

- 无课内硬前置；
- 知道 token 概念即可。

### 问题背景

『数据决定上限』：同样的 7B 架构，喂垃圾语料就是垃圾模型。Chinchilla 之后高质量 token 成了最稀缺资源——来源配比、七道清洗关、MinHash 模糊去重，是数据工程的地图（深入版在 A5 展开）。

### 直觉理解

语料像食材：Common Crawl 是刚捞上来的海产（量大但混着塑料袋），维基是净菜，书籍是精品肉，代码是提鲜的高汤（带推理能力）。清洗是洗菜七步：去壳（正文提取）、挑产地（语言识别）、挑品质（质量过滤）、去重（精确+模糊）、挑安全（有害内容）、配菜（配比）。MinHash 则是『闻味道认菜』：改了几个字的转载，shingle 集合高度重合，签名大概率相同。

### 核心概念与原理详解

> **本章是速览**。完整深入内容（清洗流水线、MinHash/LSH 实现、配比与合成数据）见
> **🗄️ 数据工程与语料构建（A5）** 课程。

## 数据是模型的上限

一个被反复验证的结论：**同样的模型结构，数据质量差 10%，效果可能差 30%。**

Chinchilla 之后大家意识到：**数据量比模型参数更稀缺**。
高质量 token 已经快被"挖完"了，这也是合成数据、多模态数据变热的原因。

## 主流数据来源

| 来源 | 规模 | 质量 | 特点 |
| --- | --- | --- | --- |
| **Common Crawl** | 数百 TB | 低（需大量清洗） | 网页抓取，最大来源 |
| **书籍**（Books3 等） | 数十 GB | 高 | 长文本、逻辑连贯 |
| **代码**（GitHub） | 数十 GB | 高 | 提升推理能力的关键 |
| **学术论文**（arXiv/S2ORC） | 数十 GB | 高 | 专业性强 |
| **百科**（Wikipedia） | ~20 GB | 很高 | 事实准确、中立 |
| **问答/对话** | 数 GB | 高 | 指令跟随基础 |

**LLaMA 的配比**（公开信息）：Common Crawl 67%、C4 15%、GitHub 4.5%、
Wikipedia 4.5%、书籍 4.5%、arXiv 2.5%、StackExchange 2%。

**代码数据的重要性**：多篇论文（如 Codex、Code Llama）发现
加入代码数据能显著提升**逻辑推理**能力，即使目标是自然语言任务。

## 网页数据清洗的完整流程

从 Common Crawl 原始 HTML 到可用文本，通常要过 7 道关：

\`\`\`
原始 WARC
  ↓ ① 提取正文（去掉 HTML 标签、导航、广告、页脚）
纯文本
  ↓ ② 语言识别（fastText，保留目标语言）
单语文本
  ↓ ③ 质量过滤（模型打分 / 启发式规则）
较高质量文本
  ↓ ④ 去重（精确 + 模糊）
无重复文本
  ↓ ⑤ 有害内容过滤（色情、暴力、PII）
安全文本
  ↓ ⑥ 领域配比 / 采样
训练语料
\`\`\`

## ③ 质量过滤：启发式规则

不需要模型就能过滤掉大量垃圾：

| 规则 | 阈值示例 | 过滤掉什么 |
| --- | --- | --- |
| 文本长度 | < 200 字符 或 > 100000 | 碎片、超长滚屏页 |
| 平均词长 | > 10 字符 | 乱码、无空格拼接 |
| 符号/数字占比 | > 30% | 代码混淆、表格残骸 |
| 重复行比例 | > 30% | 模板页、爬虫陷阱 |
| 停用词比例 | < 15% | 非自然语言 |
| 是否含"lorem ipsum" | 是 | 占位模板 |

**更好的方案：训练一个质量分类器**。
用高质量语料（Wikipedia、书籍）作正例，随机网页作负例，
训练一个轻量分类器给每个网页打分（如 fastText 或小型 Transformer），
只保留得分高的。

**C4 / RefinedWeb 的处理**：都是公开的清洗后网页数据集，
C4 用启发式规则，RefinedWeb 用更严格的过滤 + 去重。

## ④ 去重：为什么必须做

**重复数据的危害**：
1. 模型会在重复内容上**过度训练**，导致记忆和复述；
2. 浪费算力（重复 token 不提供新信息）；
3. 会增加隐私泄露与版权风险。

**实测数据**：原始 Common Crawl 中，**约 30%~50% 的内容是重复或近似重复的**。

**三种去重粒度**：

| 粒度 | 方法 | 效果 |
| --- | --- | --- |
| **文档级精确** | 哈希整篇文档 | 只能抓完全相同的 |
| **段落级** | 按段落哈希 | 抓部分重复（如转载） |
| **模糊（近似）** | MinHash + LSH | 抓"改了几个字"的转载 |

**实际效果（Lee et al. 2021）**：在 C4 上做模糊去重，
训练出的模型效果等同于"训练 4 倍数据量"——
**去重比堆数据更有效**。

## ⑤ 有害内容与 PII

- **PII（个人身份信息）**：邮箱、电话、身份证号、地址，用正则 + NER 识别并脱敏；
- **有害内容**：色情、暴力、仇恨言论，用分类器过滤；
- **版权内容**：书籍、新闻全文需要谨慎处理（法律风险）。

这部分要做，但也要**避免过度过滤**——过度过滤会让模型"变笨"（缺乏多样性）。

## 数据的"最后一公里"：配比与课程

- **配比**：各来源按什么比例混合（数学要多放吗？代码放多少？）；
- **课程学习**：先训简单/通用数据，再训高质量/专业数据；
- **退火（annealing）**：训练末期切换到最高质量数据，能显著提升效果。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import hashlib

def shingles(text, k=3):
    w = text.split()
    return set(" ".join(w[i:i+k]) for i in range(len(w)-k+1))
def jaccard(a, b): return len(a & b) / len(a | b)

docs = {
    "原文": "今天 天气 很好 我们 一起 去 公园 散步 然后 吃 了 午饭 感觉 很 开心",
    "转载": "今天 天气 不错 我们 一起 去 公园 走走 然后 吃 了 午饭 感觉 很 开心",
    "无关": "机器 学习 模型 需要 大量 数据 训练 参数 量 决定 上限 数据 质量 决定 效果",
}
S = {n: shingles(t) for n, t in docs.items()}
print("shingle 数: 原文 %d | Jaccard(原文,转载)=%.2f | Jaccard(原文,无关)=%.2f"
      % (len(S['原文']), jaccard(S['原文'], S['转载']), jaccard(S['原文'], S['无关'])))

def h(x, seed): return int(hashlib.md5((str(seed) + x).encode()).hexdigest()[:8], 16)
def signature(S_, n=64): return [min(h(x, s) for x in S_) for s in range(n)]
sig = {n: signature(S_) for n, S_ in S.items()}
sig_sim = lambda a, b: sum(x == y for x, y in zip(sig[a], sig[b])) / 64
print("MinHash 估计: 原文-转载 %.2f | 原文-无关 %.2f" % (sig_sim('原文', '转载'), sig_sim('原文', '无关')))

b, r = 32, 2
buckets = {}
for n, s in sig.items():
    for i in range(b):
        buckets.setdefault((i, tuple(s[i*r:(i+1)*r])), []).append(n)
pairs = {(v[i], v[j]) for v in buckets.values() if len(v) > 1 for i in range(len(v)) for j in range(i+1, len(v))}
print(f"LSH(b=32,r=2) 候选重复对: {pairs or '-'}（相似对以概率 1-(1-J^r)^b≈{1-(1-0.37**2)**32:.2f} 撞桶，无关对不撞）")\`\`\`

预期输出（实测）：原文 13 个 3-shingle；Jaccard(原文,转载)=0.37、(原文,无关)=0.00；MinHash 64 维签名估计 0.33 与 0.00（接近真值）；LSH(b=32,r=2) 只撞出候选对 (原文,转载)，理论撞桶概率 ≈0.99，无关对不撞。

**常见错误**：去重只做精确哈希，改字转载全数漏网，25% 冗余数据白白烧卡；MinHash 签名长度太短（<32），估计方差大到把不相似文档判成重复；shingle 的 k 取 1，Jaccard 被高频词淹没失去区分度。

### 常见误区

1. **『数据越多越好』**——重复数据边际收益趋零，C4 去重 25% 后等效 4 倍数据效果（Lee et al. 2021）；\\n2. **『清洗规则拍脑袋定』**——每条规则都要抽样人审校准，规则过猛会把方言/诗歌/代码一起误杀；\\n3. **『配比照抄 LLaMA 就行』**——配比依赖目标语言与下游任务，中文模型照搬 67% 英文网页必翻车。

### 知识关联

- **向前**：c9 的 Scaling Laws 里 D 是与 N 同级的一等公民；
- **向后**：A5（数据工程与语料构建）把本章每一步展开成完整流水线；
- **平行**：mining-prep 的预处理思想同源，只是对象从网页换成表格。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 上限观 | 同构模型，数据差 10% 效果可差 30% |
| 来源 | CC 67% / C4 15% / GitHub/Wiki/书/arXiv（LLaMA 配比）|
| 七道关 | 提取→语言→质量→去重→安全→配比 |
| 质量过滤 | 长度/词长/符号比/重复行启发式 + 分类器打分 |
| MinHash | P(签名相同)=Jaccard；LSH 分带降为近似 O(n) |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Vaswani et al. (2017)、Hoffmann et al. (2022) arXiv:2203.15556《Chinchilla》、Rajbhandari et al. (2020) ZeRO 论文与 PyTorch FSDP 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「预训练数据要经过哪些处理」：提取正文 → 语言识别 → 质量过滤 → 去重 → 有害内容/PII 过滤 → 配比采样。',
          },
          {
            kind: 'leak',
            text: '模糊去重（MinHash）的效果约等于"训练 4 倍数据量"。去重是性价比最高的数据优化手段。',
          },
          {
            kind: 'note',
            text: '代码数据能提升逻辑推理能力，即使目标是自然语言任务。LLaMA 配比里代码占 4.5%。',
          },
        ],
        demos: [
          {
            title: '启发式质量过滤规则',
            lang: 'python',
            code: `import re
from collections import Counter

def quality_score(text):
    """按启发式规则给文本打分，返回 (分数, 原因列表)。"""
    reasons = []
    score = 1.0

    n = len(text)
    if n < 200:
        score -= 0.5; reasons.append(f"过短({n})")
    if n > 100000:
        score -= 0.3; reasons.append("过长")

    words = re.findall(r"\\w+", text)
    if not words:
        return 0.0, ["无有效词"]

    avg_len = sum(len(w) for w in words) / len(words)
    if avg_len > 10:
        score -= 0.4; reasons.append(f"平均词长过长({avg_len:.1f})")

    # 符号/数字占比
    symbols = sum(1 for c in text if not c.isalnum() and not c.isspace())
    if symbols / max(n, 1) > 0.3:
        score -= 0.4; reasons.append(f"符号占比高({symbols/n:.0%})")

    # 重复行比例
    lines = [l.strip() for l in text.split("\\n") if l.strip()]
    if len(lines) > 3:
        uniq = len(set(lines))
        if uniq / len(lines) < 0.7:
            score -= 0.3; reasons.append(f"重复行多({1-uniq/len(lines):.0%})")

    return max(0.0, score), reasons

samples = [
    ("好的文本", "这是一段正常的中文文本，讲述了数据分析的基本流程。首先要理解业务问题，然后收集数据、清洗数据、分析数据，最后得出结论。整个过程需要严谨的思维和熟练的工具使用能力。" * 2),
    ("太短", "你好"),
    ("符号多", "|||||-----=====*****>>>>>" * 10),
    ("重复行", "重复的一行\\n" * 50),
]

for name, text in samples:
    score, reasons = quality_score(text)
    print(f"{name:8} 分数={score:.2f}  {'通过' if score > 0.5 else '过滤'}  {reasons if reasons else ''}")`,
          },
        ],
      },
      {
        id: 'llm-a2-c8-l2',
        title: 'MinHash 去重：找出"改了几个字"的转载',
        content: `
### 学习目标

学完本节，你应该能够：
1. 计算 shingle 集合的 Jaccard 相似度并解释 k 的典型取值（5 或 9）；
2. 实现 MinHash 签名并验证 P(签名相同)=Jaccard 定理；
3. 用 LSH 分带把 O(n²) 降到近似 O(n)，说明 b/r 对召回与精确的权衡。

### 前置知识

- 「预训练数据全景」（c8-l1）；
- 集合运算与哈希基础。

### 问题背景

『数据决定上限』：同样的 7B 架构，喂垃圾语料就是垃圾模型。Chinchilla 之后高质量 token 成了最稀缺资源——来源配比、七道清洗关、MinHash 模糊去重，是数据工程的地图（深入版在 A5 展开）。

### 直觉理解

语料像食材：Common Crawl 是刚捞上来的海产（量大但混着塑料袋），维基是净菜，书籍是精品肉，代码是提鲜的高汤（带推理能力）。清洗是洗菜七步：去壳（正文提取）、挑产地（语言识别）、挑品质（质量过滤）、去重（精确+模糊）、挑安全（有害内容）、配菜（配比）。MinHash 则是『闻味道认菜』：改了几个字的转载，shingle 集合高度重合，签名大概率相同。

### 核心概念与原理详解

## 为什么需要模糊去重

精确哈希只能抓**完全相同**的文档。但互联网上大量是"改了几个字"的转载：

    原文：今天天气很好，我们一起去公园散步吧。
    转载：今天天气不错，我们一起去公园走走吧。

哈希完全不同，但显然是重复内容。

**目标**：用一个短签名（signature），使得
**相似文档的签名大概率相同，不相似的大概率不同**。

## Jaccard 相似度

定义两个集合（这里是文档的 shingle 集合）的相似度：

    J(A, B) = |A ∩ B| / |A ∪ B|

**Shingle**：把文档切成 k 个连续词的片段（k 通常 5 或 9）。
例如 "a b c d e f" 在 k=3 时，shingle 是 {abc, bcd, cde, def}。

两篇"改了几个字"的文档，其 shingle 集合的 Jaccard 相似度通常 > 0.8。

## MinHash 的核心思想

**问题**：直接算 Jaccard 需要比较所有 shingle，太慢（O(文档长度)）。

**MinHash 的巧妙之处**：用**随机哈希**近似 Jaccard。

    对集合 S 的每个元素用哈希函数 h 求值，取最小值：
    minhash(S) = min{ h(x) : x ∈ S }

**关键定理**：两个集合的 minhash 值相同的概率，等于它们的 Jaccard 相似度：

    P(minhash(A) == minhash(B)) = J(A, B)

**所以**：用 k 个不同的哈希函数，得到 k 维签名；
比较两个签名**对应位置相同的比例**，就是 Jaccard 的估计值。

    # 签名 A: [3, 7, 1, 9, 2]
    # 签名 B: [3, 7, 5, 9, 8]
    # 相同位置: 3/5 → 估计相似度 0.6

**为什么**：如果 A、B 的并集里最小哈希值落在交集元素上，
两个集合的 minhash 就相同。而这个概率正是 J(A,B)。

## LSH：把 O(n²) 比较降到近似 O(n)

去重时文档有上亿篇，两两比较不可能。

**LSH（Locality-Sensitive Hashing）**：
把 k 维签名分成 b 个 band，每个 band 有 r 个哈希值（k = b × r）。

    band1: [3, 7]  -> 哈希成一个桶 key
    band2: [1, 9]  -> 另一个桶 key
    ...

**规则**：只要**任意一个 band 完全相同**，两篇文档就被判为候选重复对。

**调节 b 和 r 的意义**：
- b 越大 → 越容易撞上 → 召回率高但误判多；
- r 越大 → 每个 band 越难完全相同 → 精确率高但召不回。

实测常用：**k=128~256，b=32~64**。

**效果**：从 O(n²) 降到近似 O(n)，上亿文档可在数小时内完成去重。

## 实测收益

Lee et al. (2021) 在 C4 上做模糊去重：
- 去掉约 **25%** 的重复内容；
- 训练出的模型**效果等同于使用 4 倍数据量**；
- 训练速度更快（token 更少）。

## 去重的工程细节

| 问题 | 处理 |
| --- | --- |
| 内存不够 | 分批 + 外排序；或用布隆过滤器做第一道粗筛 |
| 跨数据集去重 | 训练集 vs 评测集必须去重（防泄漏） |
| 段落级 vs 文档级 | 先文档级粗筛，再段落级精筛 |
| 阈值选择 | 通常 0.8（太松漏删，太严误删） |

**特别注意**：**训练集与评测集必须去重**！
否则模型会在测试集上"背答案"，造成指标虚高——这是被反复引用的严重问题。

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import hashlib

def shingles(text, k=3):
    w = text.split()
    return set(" ".join(w[i:i+k]) for i in range(len(w)-k+1))
def jaccard(a, b): return len(a & b) / len(a | b)

docs = {
    "原文": "今天 天气 很好 我们 一起 去 公园 散步 然后 吃 了 午饭 感觉 很 开心",
    "转载": "今天 天气 不错 我们 一起 去 公园 走走 然后 吃 了 午饭 感觉 很 开心",
    "无关": "机器 学习 模型 需要 大量 数据 训练 参数 量 决定 上限 数据 质量 决定 效果",
}
S = {n: shingles(t) for n, t in docs.items()}
print("shingle 数: 原文 %d | Jaccard(原文,转载)=%.2f | Jaccard(原文,无关)=%.2f"
      % (len(S['原文']), jaccard(S['原文'], S['转载']), jaccard(S['原文'], S['无关'])))

def h(x, seed): return int(hashlib.md5((str(seed) + x).encode()).hexdigest()[:8], 16)
def signature(S_, n=64): return [min(h(x, s) for x in S_) for s in range(n)]
sig = {n: signature(S_) for n, S_ in S.items()}
sig_sim = lambda a, b: sum(x == y for x, y in zip(sig[a], sig[b])) / 64
print("MinHash 估计: 原文-转载 %.2f | 原文-无关 %.2f" % (sig_sim('原文', '转载'), sig_sim('原文', '无关')))

b, r = 32, 2
buckets = {}
for n, s in sig.items():
    for i in range(b):
        buckets.setdefault((i, tuple(s[i*r:(i+1)*r])), []).append(n)
pairs = {(v[i], v[j]) for v in buckets.values() if len(v) > 1 for i in range(len(v)) for j in range(i+1, len(v))}
print(f"LSH(b=32,r=2) 候选重复对: {pairs or '-'}（相似对以概率 1-(1-J^r)^b≈{1-(1-0.37**2)**32:.2f} 撞桶，无关对不撞）")\`\`\`

预期输出（实测）：原文 13 个 3-shingle；Jaccard(原文,转载)=0.37、(原文,无关)=0.00；MinHash 64 维签名估计 0.33 与 0.00（接近真值）；LSH(b=32,r=2) 只撞出候选对 (原文,转载)，理论撞桶概率 ≈0.99，无关对不撞。

**常见错误**：去重只做精确哈希，改字转载全数漏网，25% 冗余数据白白烧卡；MinHash 签名长度太短（<32），估计方差大到把不相似文档判成重复；shingle 的 k 取 1，Jaccard 被高频词淹没失去区分度。

### 常见误区

1. **『数据越多越好』**——重复数据边际收益趋零，C4 去重 25% 后等效 4 倍数据效果（Lee et al. 2021）；\\n2. **『清洗规则拍脑袋定』**——每条规则都要抽样人审校准，规则过猛会把方言/诗歌/代码一起误杀；\\n3. **『配比照抄 LLaMA 就行』**——配比依赖目标语言与下游任务，中文模型照搬 67% 英文网页必翻车。

### 知识关联

- **向前**：c9 的 Scaling Laws 里 D 是与 N 同级的一等公民；
- **向后**：A5（数据工程与语料构建）把本章每一步展开成完整流水线；
- **平行**：mining-prep 的预处理思想同源，只是对象从网页换成表格。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 上限观 | 同构模型，数据差 10% 效果可差 30% |
| 来源 | CC 67% / C4 15% / GitHub/Wiki/书/arXiv（LLaMA 配比）|
| 七道关 | 提取→语言→质量→去重→安全→配比 |
| 质量过滤 | 长度/词长/符号比/重复行启发式 + 分类器打分 |
| MinHash | P(签名相同)=Jaccard；LSH 分带降为近似 O(n) |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Vaswani et al. (2017)、Hoffmann et al. (2022) arXiv:2203.15556《Chinchilla》、Rajbhandari et al. (2020) ZeRO 论文与 PyTorch FSDP 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「MinHash 为什么能估计 Jaccard」：两个集合的 minhash 相同的概率恰好等于它们的 Jaccard 相似度。用 k 个哈希得到 k 维签名，相同位置的比例就是估计值。',
          },
          {
            kind: 'leak',
            text: '模糊去重实测收益：去掉 25% 重复内容，效果等同于 4 倍数据量。这是数据工程里 ROI 最高的操作之一。',
          },
          {
            kind: 'pitfall',
            text: '训练集与评测集必须去重。否则指标虚高，且这种"泄漏"极难在事后发现。',
          },
        ],
        demos: [
          {
            title: 'MinHash 完整实现',
            lang: 'python',
            code: `import hashlib

def shingles(text, k=5):
    """切成 k 个词的 shingle 集合。"""
    words = text.split()
    if len(words) < k:
        return set([" ".join(words)])
    return set(" ".join(words[i:i+k]) for i in range(len(words) - k + 1))

def minhash_signature(shingle_set, n_hashes=64):
    """用 n_hashes 个哈希函数，得到签名。"""
    sig = []
    for seed in range(n_hashes):
        min_val = float("inf")
        for s in shingle_set:
            # 用 hash + seed 模拟不同的哈希函数
            h = int(hashlib.md5(f"{seed}:{s}".encode()).hexdigest()[:8], 16)
            if h < min_val:
                min_val = h
        sig.append(min_val)
    return sig

def jaccard(a, b):
    """真实 Jaccard 相似度。"""
    return len(a & b) / len(a | b) if (a | b) else 0.0

def signature_similarity(sig_a, sig_b):
    """通过签名估计相似度。"""
    same = sum(1 for x, y in zip(sig_a, sig_b) if x == y)
    return same / len(sig_a)

doc_a = "今天 天气 很 好 我们 一起 去 公园 散步 吧"
doc_b = "今天 天气 不错 我们 一起 去 公园 走走 吧"   # 改了两个词
doc_c = "机器学习 模型 训练 需要 大量 的 数据 和 算力"

sa, sb, sc = shingles(doc_a), shingles(doc_b), shingles(doc_c)
ma, mb, mc = minhash_signature(sa), minhash_signature(sb), minhash_signature(sc)

print("真实 Jaccard：")
print(f"  A vs B（近似重复）: {jaccard(sa, sb):.3f}")
print(f"  A vs C（完全不同）: {jaccard(sa, sc):.3f}")
print()
print("MinHash 签名估计（64 维）：")
print(f"  A vs B: {signature_similarity(ma, mb):.3f}")
print(f"  A vs C: {signature_similarity(ma, mc):.3f}")
print()
print("→ 签名估计值接近真实 Jaccard，但只需比较 64 个整数")`,
          },
          {
            title: 'LSH 分桶加速',
            lang: 'python',
            code: `def lsh_buckets(signatures, bands=8, rows=8):
    """把签名按 band 分桶，返回 {(band_idx, bucket_key): [doc_ids]}"""
    buckets = {}
    for doc_id, sig in signatures.items():
        for b in range(bands):
            chunk = tuple(sig[b*rows:(b+1)*rows])
            key = (b, hash(chunk))
            buckets.setdefault(key, []).append(doc_id)
    return buckets

def find_candidates(buckets):
    """同一桶内的文档互为候选重复对。"""
    pairs = set()
    for key, docs in buckets.items():
        if len(docs) < 2:
            continue
        for i in range(len(docs)):
            for j in range(i+1, len(docs)):
                pairs.add(tuple(sorted([docs[i], docs[j]])))
    return pairs

# 模拟 5 篇文档的 64 维签名
sigs = {
    "A": [i % 100 for i in range(64)],
    "B": [i % 100 for i in range(64)],          # 与 A 完全相同
    "C": [(i * 3) % 100 for i in range(64)],    # 不同
    "D": [i % 100 if i < 60 else 999 for i in range(64)],  # 前 60 位相同
    "E": [(i * 7) % 100 for i in range(64)],
}

buckets = lsh_buckets(sigs, bands=8, rows=8)
pairs = find_candidates(buckets)

print("候选重复对:")
for p in sorted(pairs):
    print(f"  {p}")
print()
print("说明：只需比较同一桶内的文档，把 O(n²) 降到近似 O(n)。")
print("A 与 B 完全相同、A 与 D 前 60 位相同，都会进入同一桶。")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a2-c8-e1',
        type: 'single',
        difficulty: 2,
        question: '预训练数据处理中，模糊去重（如 MinHash）的主要目的是？',
        options: [
          { value: 'A', text: '压缩存储空间' },
          { value: 'B', text: '找出"改了几个字"的近似重复文档，避免模型过度训练重复内容' },
          { value: 'C', text: '提高训练速度' },
          { value: 'D', text: '翻译文档' },
        ],
        answer: 'B',
        explanation: '互联网上大量内容是转载/微改的近似重复。模糊去重能识别这类内容，避免模型在重复内容上过度训练、浪费算力、增加记忆与版权风险。',
        tags: ['去重'],
      },
      {
        id: 'llm-a2-c8-e2',
        type: 'judge',
        difficulty: 2,
        question: '训练集与评测集之间不需要去重，因为它们是不同来源的数据。',
        answer: false,
        explanation: '必须去重！如果评测集内容出现在训练集中（数据泄漏），模型会"背答案"，指标虚高。这是极难事后发现、但影响严重的问题。',
        tags: ['数据泄漏'],
      },
      {
        id: 'llm-a2-c8-e3',
        type: 'single',
        difficulty: 3,
        question: 'MinHash 能估计 Jaccard 相似度的数学基础是？',
        options: [
          { value: 'A', text: '中心极限定理' },
          { value: 'B', text: '两个集合的 minhash 值相同的概率等于它们的 Jaccard 相似度' },
          { value: 'C', text: '大数定律' },
          { value: 'D', text: '傅里叶变换' },
        ],
        answer: 'B',
        explanation: '这是 MinHash 的核心定理：P(minhash(A) == minhash(B)) = J(A,B)。因此用 k 个哈希得到签名，相同位置的比例就是 Jaccard 的无偏估计。',
        tags: ['MinHash'],
      },
      {
        id: 'llm-a2-c8-e4',
        type: 'multiple',
        difficulty: 3,
        question: '网页数据清洗通常包含哪些步骤？（多选）',
        options: [
          { value: 'A', text: '提取正文，去掉 HTML 标签与导航' },
          { value: 'B', text: '语言识别，保留目标语言' },
          { value: 'C', text: '质量过滤（启发式规则或分类器）' },
          { value: 'D', text: '把全部网页文本原样加入训练集' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：原始网页含大量垃圾（广告、模板、乱码），直接训练会严重损害模型。必须经过多道清洗。',
        tags: ['数据清洗'],
      },
      {
        id: 'llm-a2-c8-e5',
        type: 'fill',
        difficulty: 3,
        question: '把文档切成 k 个连续词的片段用于相似度比较，这些片段叫 ___（shingle）。',
        blanks: [['shingle', 'Shingle', '瓦片', '词片']],
        explanation: 'Shingle（瓦片）是 n-gram 的另一种叫法。k 通常取 5 或 9。两篇近似重复的文档，其 shingle 集合的 Jaccard 相似度通常 > 0.8。',
        tags: ['shingle'],
      },
      {
        id: 'llm-a2-c8-e6',
        type: 'code',
        difficulty: 2,
        question: '实现 `jaccard(set_a, set_b)`：计算两个集合的 Jaccard 相似度 `|A∩B| / |A∪B|`，保留 4 位小数。空集时返回 0.0。',
        starterCode: `def jaccard(set_a, set_b):
    ___

jaccard({1, 2, 3}, {2, 3, 4})
`,
        setupCode: '',
        expectedOutput: '约 0.5',
        tests: `assert abs(jaccard({1,2,3}, {2,3,4}) - 0.5) < 1e-9, f"应为 0.5，实际 {jaccard({1,2,3},{2,3,4})}"
assert jaccard({1,2}, {1,2}) == 1.0, "完全相同应为 1"
assert jaccard({1,2}, {3,4}) == 0.0, "完全不同应为 0"
assert jaccard(set(), set()) == 0.0, "空集应返回 0"
assert abs(jaccard({1,2,3,4}, {3,4,5,6}) - 0.3333) < 1e-4
`,
        answer: `def jaccard(set_a, set_b):
    union = set_a | set_b
    if not union:
        return 0.0
    return round(len(set_a & set_b) / len(union), 4)


jaccard({1, 2, 3}, {2, 3, 4})`,
        explanation:
          '```python\nunion = set_a | set_b\nif not union:\n    return 0.0\nreturn round(len(set_a & set_b) / len(union), 4)\n```\n\n**注意空集保护**：两个空集的并集为空，除零会崩。\n\nJaccard 的取值 [0, 1]，1 表示完全相同。',
        tags: ['编程', 'Jaccard'],
      },
      {
        id: 'llm-a2-c8-e7',
        type: 'code',
        difficulty: 3,
        question: '实现 shingles 切分：`make_shingles(text, k=5)`，把文本按空格切成词，返回所有连续 k 个词组成的片段的集合。\n\n若词数 < k，返回包含整个文本的单元素集合。',
        starterCode: `def make_shingles(text, k=5):
    words = text.split()
    ___

make_shingles("a b c d e f g", 3)
`,
        setupCode: '',
        expectedOutput: "{'a b c', 'b c d', 'c d e', 'd e f', 'e f g'}",
        tests: `out = make_shingles("a b c d e f g", 3)
assert out == {"a b c", "b c d", "c d e", "d e f", "e f g"}, f"结果不正确: {out}"
assert len(make_shingles("a b c", 5)) == 1, "词数不足 k 时应返回单元素集合"
assert make_shingles("a b c", 5) == {"a b c"}, "应包含整个文本"
assert len(make_shingles("a b c d e", 2)) == 4, "5 个词 k=2 应有 4 个 shingle"
assert len(make_shingles("a b c d", 1)) == 4, "k=1 时应等于词数"
`,
        answer: `def make_shingles(text, k=5):
    words = text.split()
    if len(words) < k:
        return set([" ".join(words)])
    return set(" ".join(words[i:i+k]) for i in range(len(words) - k + 1))


make_shingles("a b c d e f g", 3)`,
        explanation:
          '```python\nwords = text.split()\nif len(words) < k:\n    return set([" ".join(words)])\nreturn set(" ".join(words[i:i+k]) for i in range(len(words) - k + 1))\n```\n\nn 个词、k 个一片，共 `n - k + 1` 个 shingle。\n\n**用 set 去重**：相同片段（如重复的短语）只算一次，这符合 Jaccard 的集合语义。',
        tags: ['编程', 'shingle'],
      },
      {
        id: 'llm-a2-c8-e8',
        type: 'code',
        difficulty: 4,
        question: '实现 MinHash 签名：`minhash_signature(shingle_set, n_hashes=32)`。\n\n对每个哈希函数（用 seed 0..n_hashes-1 模拟），取所有 shingle 哈希值的最小值。\n\n哈希用 `hash(f"{seed}:{s}") % 2**32` 模拟。返回长度为 n_hashes 的列表。',
        starterCode: `def minhash_signature(shingle_set, n_hashes=32):
    sig = []
    ___
    return sig


minhash_signature({"a b c", "b c d"}, 8)
`,
        setupCode: '',
        expectedOutput: '长度 8 的整数列表',
        tests: `s = {"a b c", "b c d", "c d e"}
sig = minhash_signature(s, 8)
assert len(sig) == 8, f"签名长度应为 8，实际 {len(sig)}"
assert all(isinstance(v, int) for v in sig), "签名应为整数列表"
# 同一集合的签名必须稳定
assert minhash_signature(s, 8) == sig, "同一集合签名应确定"
# 不同 seed 的签名通常不同
assert len(set(sig)) > 1, "不同哈希函数的最小值应有差异"
# 相同集合签名相同
assert minhash_signature({"a b c", "b c d", "c d e"}, 8) == sig
`,
        answer: `def minhash_signature(shingle_set, n_hashes=32):
    sig = []
    for seed in range(n_hashes):
        min_val = None
        for s in shingle_set:
            h = hash(f"{seed}:{s}") % (2**32)
            if min_val is None or h < min_val:
                min_val = h
        sig.append(min_val if min_val is not None else 0)
    return sig


minhash_signature({"a b c", "b c d"}, 8)`,
        explanation:
          '```python\nfor seed in range(n_hashes):\n    min_val = None\n    for s in shingle_set:\n        h = hash(f"{seed}:{s}") % (2**32)\n        if min_val is None or h < min_val:\n            min_val = h\n    sig.append(min_val if min_val is not None else 0)\n```\n\n**核心**：每个哈希函数取集合中所有元素哈希的最小值。\n\n注意：Python 的 `hash()` 对字符串每次运行结果不同（哈希随机化），生产环境要用 `hashlib.md5` 等确定性哈希。',
        tags: ['编程', 'MinHash'],
      },
      {
        id: 'llm-a2-c8-e9',
        type: 'judge',
        difficulty: 3,
        question: '数据量越大，模型效果一定越好，所以应该尽可能多地收集数据。',
        answer: false,
        explanation: '质量比数量更关键。模糊去重的实测结果：去掉 25% 重复内容后，效果等同于用 4 倍数据量。低质量数据会主动损害模型。',
        tags: ['数据质量'],
      },
      {
        id: 'llm-a2-c8-e10',
        type: 'open',
        difficulty: 4,
        question:
          '你要为中文大模型构建预训练语料。请设计完整的数据处理流水线：从中文网页数据到最终训练集，说明每一步做什么、用什么方法、以及如何验证效果。',
        referenceAnswer: `**一、数据来源与规模**

- 中文网页：Common Crawl 中文子集、WuDaoCorpora、中文维基、百科
- 高质量长文本：中文书籍、学术论文（CNKI/arXiv 中文）、法律文书
- 代码：GitHub 中文注释代码（提升推理能力）
- 问答社区：知乎、Stack Overflow 中文

目标规模：参考 Chinchilla 的 1:20 比例，10B 模型需约 200B token。

**二、处理流水线**

**① 正文提取**
- 用 trafilatura / readability 从 HTML 提取主内容；
- 去掉导航、广告、评论区、页脚。

**② 语言识别与过滤**
- fastText 语言模型（lid.176）识别，保留中文占比 > 0.8 的文档；
- 注意区分繁体/简体，按需统一。

**③ 质量过滤（关键）**
- **启发式规则**：长度 200~100000 字符；平均词长 < 10；
  符号占比 < 30%；重复行比例 < 30%；停用词比例 > 15%；
- **质量分类器**：以维基/书籍为正例、随机网页为负例，
  训练 fastText 或小型 Transformer 打分，保留 Top 60~70%；
- **中文特有规则**：过滤繁体乱码、拼音混杂、纯英文页面、
  以及"SEO 垃圾"（关键词堆砌）。

**④ 去重（分层）**
- **URL 级**：同 URL 只保留最新版本；
- **文档级精确**：整篇 MD5 哈希；
- **段落级**：按段落哈希，去掉跨文档重复段落；
- **模糊去重**：MinHash + LSH，k=128、b=32、阈值 0.8；
- **与评测集去重**：与 C-Eval、CMMLU、GSM8K 中文版做 n-gram 重叠检查。

**⑤ 敏感与合规处理**
- **PII 脱敏**：正则 + NER 识别手机号、身份证、邮箱、地址，
  替换为占位符；
- **有害内容过滤**：色情/暴力/仇恨言论分类器；
- **版权风险**：书籍、新闻全文谨慎使用，优先选开放许可内容。

**⑥ 配比与课程**
- 基础配比：网页 60%、书籍 10%、代码 10%、学术 10%、
  百科/问答 10%（按中文语料特点调整）；
- 课程学习：前期用通用数据，末期退火到高质量数据。

**三、验证方法**

| 层次 | 指标 |
| --- | --- |
| 数据统计 | 各步骤保留率、去重率、平均文档长度分布 |
| 质量抽检 | 人工抽样 200 篇，评估通顺度与信息密度 |
| 小模型验证 | 用 1B 小模型在 10B token 上训练，看 PPL 与下游任务 |
| 泄漏检查 | 训练集 vs 评测集的 n-gram 重叠率应 < 0.1% |
| 多样性 | 主题分布（用聚类或关键词统计），避免过度集中 |

**四、常见陷阱**

1. **过度过滤导致"变笨"**：过滤太狠会失去多样性，模型表达僵化；
2. **忽略中文 token 效率**：中文同样内容 token 更多，预算要按 token 而非字符算；
3. **评测集泄漏**：必须在最后一道关做交叉去重；
4. **只看量不看质**：去重后数据变少但效果更好，不要因"数据量下降"而回退。`,
        rubric: [
          { point: '完整流水线：提取→语言识别→质量过滤→去重→合规→配比', score: 3 },
          { point: '质量过滤含启发式规则 + 分类器，并有中文特有规则', score: 2 },
          { point: '分层去重（精确/段落/模糊），并强调与评测集去重', score: 2 },
          { point: '给出验证方法（小模型验证、泄漏检查、多样性统计）', score: 2 },
          { point: '提到过度过滤的陷阱', score: 1 },
        ],
        keywords: ['正文提取', 'fastText', '质量分类器', 'MinHash', 'PII', '评测集去重'],
        explanation: '这是数据工程的综合设计题。能说出"分层去重"和"与评测集去重"是关键，前者体现工程经验，后者体现严谨性。',
        tags: ['数据工程', '系统设计'],
      },
    ],
  },

  /* ============================================================
   *  c9：Scaling Laws
   * ============================================================ */
  {
    id: 'llm-a2-c9',
    title: 'Scaling Laws：用公式预测模型效果',
    goal: '理解 Kaplan 与 Chinchilla 两代缩放定律的差异，掌握计算最优配比的计算方法。',
    lessons: [
      {
        id: 'llm-a2-c9-l1',
        title: 'Kaplan 定律与 Chinchilla 修正',
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出幂律形式 L∝N^-α、L∝D^-β 并解释『收益递减但不停』；
2. 用 Chinchilla 参数化损失复算 Gopher vs Chinchilla（同算力 70B/1.4T 胜出）；
3. 区分 Chinchilla-optimal 与 inference-optimal，解释 LLaMA 过训的经济学。

### 前置知识

- c5 的学习率、c8 的数据量概念；
- 幂函数与对数。

### 问题背景

给定 1e24 FLOPs 预算，训 100B 模型 2T token 还是 10B 模型 200T token？Scaling Law 把这个拍脑袋问题变成可计算的公式——Kaplan 说优先堆参数，Chinchilla 修正为参数与数据同比增，LLaMA 再修正为『推理优先故意过训』。三次范式转变全在这一章。

### 直觉理解

幂律像往水池注水：模型翻 10 倍，loss 只降一个固定比例——收益递减但从不停止。Chinchilla 最优是『训练侧最省钱』：每参数 20 token；LLaMA 的过训是『推理侧最省钱』：模型上线服务百万次请求，小一号参数省下的推理费远超多花的训练费。两者的分歧不在公式，在『谁的账本』。

### 核心概念与原理详解

## 什么是 Scaling Law

**核心问题**：给定固定的算力预算，应该训多大的模型、用多少数据？

**Scaling Law 的答案**：损失 L 与参数量 N、数据量 D、算力 C 之间存在**幂律关系**：

    L(N) ∝ N^(-α)      α ≈ 0.076
    L(D) ∝ D^(-β)      β ≈ 0.095

**幂律的含义**：模型规模翻 10 倍，loss 下降一个固定比例（而不是线性的收益）。
这意味着**收益递减但从不停止**——这就是"更大模型更好"的理论基础。

## Kaplan et al. (2020) 的结论

OpenAI 的研究（GPT-3 同期）给出的建议：

> **在固定算力下，应该优先增大模型参数，数据量只需温和增长。**

具体配比：N ∝ C^0.73，D ∝ C^0.27。

**实践后果**：GPT-3（175B）只训练了 300B token——
**每个参数约 1.7 个 token**。这在现在看来是"训练不足"的。

## Chinchilla (2022) 的修正

DeepMind 重新做了实验，发现 Kaplan 的结论**有系统性偏差**（学习率调度与训练 token 数不匹配）。

**修正后的结论**：

> **在固定算力下，参数量与数据量应该同比例增长。**
>
> **最优配比：D ≈ 20 × N**（每个参数训 20 个 token）

**对比**：

| 模型 | 参数量 | 训练 token | 比例 | 评价 |
| --- | --- | --- | --- | --- |
| GPT-3 | 175B | 300B | 1.7:1 | **严重不足** |
| Chinchilla | 70B | 1.4T | 20:1 | 最优 |
| LLaMA-1 7B | 7B | 1T | 143:1 | **远超** |
| LLaMA-3 8B | 8B | 15T | 1875:1 | **极端过训** |

**关键洞察**：Chinchilla 70B 的效果**超过了 GPT-3 175B**，
而推理成本只有 1/2.5——因为它的参数更少但训得更充分。

## 为什么 LLaMA 系列"过度训练"

Chinchilla 的最优配比是**在训练算力固定**的前提下最优。

但实际部署时，**推理成本远大于训练成本**：
一个模型上线后要服务数百万次请求，推理成本可能是训练的 100 倍。

**所以工业界的选择**：故意"过训"小模型——
多花训练算力，换取一个**参数更少、推理更快**的模型。

    Chinchilla 最优：训练成本 + 推理成本 的总和最小
    LLaMA 的选择：牺牲训练效率，换取推理效率

**这就是"Chinchilla-optimal"与"inference-optimal"的区别。**

## 三种算力分配策略

| 策略 | 参数 N | 数据 D | 适用 |
| --- | --- | --- | --- |
| **Chinchilla 最优** | 平衡 | 20N | 一次性训练、少量推理 |
| **过训**（LLaMA） | 小 | 100~2000N | 大规模部署、推理密集 |
| **欠训**（GPT-3） | 大 | <5N | 已过时，不推荐 |

## 算力公式

训练算力（FLOPs）的粗略估算：

    C ≈ 6 × N × D

系数 6 = 前向 2 + 反向 4（每个参数每个 token）。

**举例**：70B 模型、1.4T token

    C = 6 × 70e9 × 1.4e12 = 5.88e23 FLOPs
    以 A100（312 TFLOPS，实际利用率 40%）= 1.25e14 FLOPS 计
    需要 5.88e23 / 1.25e14 = 4.7e9 秒·卡 = 54,000 卡·天

## 如何用 Scaling Law 做决策

**场景**：你有 1000 张 A100，训练 2 个月，该训多大的模型？

1. 总算力 C = 1000 × 1.25e14 × 60×60×24×60 ≈ **1.08e25 FLOPs**
2. Chinchilla 最优：D = 20N，C = 6ND = 120N²
   → N = √(C/120) = √(1.08e25/120) ≈ **9.5e11 = 950B**？
   
   这显然过大——因为 Chinchilla 的系数是在较小规模拟合的，
   外推到千 B 级不一定准确。

3. **实际做法**：用公开的 Scaling Law 公式做**初始估算**，
   再用小规模实验（如 1B、7B）**校准**自己数据上的系数，
   最后外推。

**这就是 CS336 作业 3 让你做的**：通过训练 API 拟合自己的 scaling law。

<ChinchillaDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
E, A, alpha, B, beta = 1.69, 406.4, 0.34, 410.7, 0.28   # Chinchilla 参数化损失
loss = lambda N, D: E + A/N**alpha + B/D**beta
models = [("GPT-3", 175e9, 300e9), ("Gopher", 280e9, 300e9), ("Chinchilla", 70e9, 1.4e12),
          ("LLaMA-1 7B", 7e9, 1e12), ("LLaMA-3 8B", 8e9, 15e12)]
print("模型          N      D     tok/参数  训练FLOPs   loss")
for name, N, D in models:
    print(f"{name:12} {N/1e9:4.0f}B {D/1e12:5.2f}T  {D/N:8.1f}  {6*N*D:.2e}  {loss(N, D):.3f}")
C = 6*70e9*1.4e12                       # 与 Chinchilla 同算力
Nopt = (C/(6*20))**0.5
print(f"C={C:.2e} 下 compute-optimal: N≈{Nopt/1e9:.0f}B, D≈{20*Nopt/1e12:.2f}T（20N 规则复现 Chinchilla 配置）")
print("Gopher vs Chinchilla 同算力: loss %.3f -> %.3f" % (loss(280e9, 300e9), loss(70e9, 1.4e12)))\`\`\`

预期输出（实测）：GPT-3 175B/300B：tok/参数 1.7、loss≈2.00；Gopher 280B/300B：1.99；Chinchilla 70B/1.4T：20.0、loss≈1.94（同算力反超 Gopher）；LLaMA-1 7B 143:1、LLaMA-3 8B 1875:1（极端过训）；20N 规则复现 compute-optimal N≈70B、D≈1.40T。

**常见错误**：用 Kaplan 配比把 175B 模型只训 300B token，如今看是严重欠训；拿 Chinchilla 20N 批评 LLaMA『浪费』——忽略推理成本才是主要成本；拟合 Scaling Law 时学习率调度与训练时长不匹配，测出的损失偏高（Kaplan 偏差来源）。

### 常见误区

1. **『Scaling Law 是精确预言』**——幂律是拟合外推，数据分布突变（换语料/加代码）后系数要重估；\\n2. **『20N 是铁律』**——它只在『训练算力固定』前提下最优，推理优先场景故意过训 100~2000N；\\n3. **『loss 越低模型越好』**——下游能力与 loss 不完全同步，基准评测与红队测试不可省。

### 知识关联

- **向前**：A2 收官——本章算力账与 c6 显存账、c7 精度账合成一本总账；
- **向后**：A5 的数据工程决定 D 的质量上限，llm-a4 的 MoE 改写 N 的定义；
- **平行**：llm-b1 的训练实践把本章公式落成预算表。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 幂律 | L ∝ N^-α / D^-β（Kaplan：α≈0.076、β≈0.095）|
| Kaplan | 优先堆参数：N∝C^0.73，D∝C^0.27 |
| Chinchilla | 修正：D≈20N；70B/1.4T 胜 280B/300B |
| 参数化 | L = 1.69 + 406.4/N^0.34 + 410.7/D^0.28 |
| 过训逻辑 | 推理成本主导 → LLaMA 用 15T token 训 8B |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Vaswani et al. (2017)、Hoffmann et al. (2022) arXiv:2203.15556《Chinchilla》、Rajbhandari et al. (2020) ZeRO 论文与 PyTorch FSDP 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「Chinchilla 的核心结论」：固定算力下参数量与数据量应同比例增长，最优配比 D ≈ 20N。这推翻了 Kaplan 的"优先增大参数"。',
          },
          {
            kind: 'leak',
            text: 'LLaMA 故意"过训"（D/N 远超 20），原因是推理成本远大于训练成本，小模型推理更快更便宜。这是 Chinchilla-optimal 与 inference-optimal 的区别。',
          },
          {
            kind: 'note',
            text: '训练 FLOPs 的快速估算：C ≈ 6 × N × D（前向 2 + 反向 4）。这是做算力预算的基本公式。',
          },
        ],
        demos: [
          {
            title: 'Chinchilla 最优配比计算',
            lang: 'python',
            code: `def chinchilla_optimal(compute_flops, tokens_per_param=20):
    """给定算力预算，算最优 N 和 D。C = 6ND, D = 20N -> C = 120 N^2"""
    n = (compute_flops / (6 * 20)) ** 0.5
    d = tokens_per_param * n
    return n, d

def train_cost_days(n_params, n_tokens, n_gpus=1000, tflops_per_gpu=312, utilization=0.4):
    """估算训练天数。"""
    flops = 6 * n_params * n_tokens
    effective = n_gpus * tflops_per_gpu * 1e12 * utilization
    seconds = flops / effective
    return seconds / 86400

print("算力预算 | 最优 N | 最优 D | 训练天数(1000×A100)")
print("-" * 62)
for exp in (22, 23, 24, 25):
    c = 10 ** exp
    n, d = chinchilla_optimal(c)
    days = train_cost_days(n, d)
    print(f"1e{exp}   | {n/1e9:6.1f}B | {d/1e12:5.2f}T | {days:8.1f} 天")

print()
print("=== 实际模型 vs Chinchilla 最优 ===")
models = [
    ("GPT-3", 175, 0.3),
    ("Chinchilla", 70, 1.4),
    ("LLaMA-7B", 7, 1.0),
    ("LLaMA-3 8B", 8, 15.0),
]
print("模型        | 参数 | 数据 | D/N 比例 | 评价")
print("-" * 58)
for name, n, d in models:
    ratio = d * 1e12 / (n * 1e9)
    if ratio < 5:
        verdict = "欠训"
    elif ratio < 30:
        verdict = "接近最优"
    else:
        verdict = "过训(推理优化)"
    print(f"{name:11} | {n:4}B | {d:5.1f}T | {ratio:7.1f} | {verdict}")`,
          },
          {
            title: 'Scaling Law 拟合与外推',
            lang: 'python',
            code: `import numpy as np

# 模拟：损失随参数量的幂律下降 L = a * N^(-alpha) + c
# 真实论文里 alpha 约 0.076，这里用模拟数据演示拟合
TRUE_A, TRUE_ALPHA, TRUE_C = 400, 0.076, 1.7

def loss(n_params):
    return TRUE_A * (n_params ** -TRUE_ALPHA) + TRUE_C

sizes = [1e8, 3e8, 1e9, 3e9, 1e10]
losses = [loss(n) for n in sizes]

print("已知数据点（小规模实验）:")
for n, l in zip(sizes, losses):
    print(f"  N={n:.0e}  L={l:.4f}")

# 对数线性拟合（忽略常数项 c 做简化演示）
log_n = np.log(sizes)
log_l = np.log([l - TRUE_C for l in losses])
coef = np.polyfit(log_n, log_l, 1)
alpha_fit = -coef[0]
a_fit = np.exp(coef[1])

print(f"\\n拟合结果: alpha = {alpha_fit:.4f} (真实 {TRUE_ALPHA})")

print("\\n外推预测:")
for n in (1e11, 1e12):
    predicted = a_fit * (n ** -alpha_fit) + TRUE_C
    actual = loss(n)
    print(f"  N={n:.0e}  预测 L={predicted:.4f}  真实 L={actual:.4f}  误差 {abs(predicted-actual):.4f}")

print()
print("→ 幂律在小规模拟合后能较准确外推，这就是 Scaling Law 的实用价值")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-a2-c9-e1',
        type: 'single',
        difficulty: 2,
        question: 'Chinchilla 论文的核心结论是？',
        options: [
          { value: 'A', text: '模型参数越多越好' },
          { value: 'B', text: '固定算力下，参数量与数据量应同比例增长，最优配比 D ≈ 20N' },
          { value: 'C', text: '数据量不重要' },
          { value: 'D', text: '训练越久越好' },
        ],
        answer: 'B',
        explanation: 'Chinchilla 推翻了 Kaplan"优先增大参数"的结论，指出参数量与数据量应同比例增长。70B 的 Chinchilla 效果超过 175B 的 GPT-3。',
        tags: ['Chinchilla'],
      },
      {
        id: 'llm-a2-c9-e2',
        type: 'judge',
        difficulty: 2,
        question: 'LLaMA 系列训练的数据/参数比例远超 Chinchilla 的 20:1，是为了优化推理成本。',
        answer: true,
        explanation: 'Chinchilla 最优是"训练+推理总成本最小"。但大规模部署时推理成本远大于训练，所以故意"过训"小模型，换取更小更快的推理。这是 inference-optimal 的取舍。',
        tags: ['Scaling'],
      },
      {
        id: 'llm-a2-c9-e3',
        type: 'single',
        difficulty: 3,
        question: '训练一个大模型的算力（FLOPs）粗略估算公式是？',
        options: [
          { value: 'A', text: 'C ≈ N × D' },
          { value: 'B', text: 'C ≈ 6 × N × D' },
          { value: 'C', text: 'C ≈ N² × D' },
          { value: 'D', text: 'C ≈ N + D' },
        ],
        answer: 'B',
        explanation: '系数 6 = 前向 2 + 反向 4（每个参数每个 token）。这是做算力预算与训练时间估算的基本公式。',
        tags: ['算力'],
      },
      {
        id: 'llm-a2-c9-e4',
        type: 'multiple',
        difficulty: 3,
        question: '关于 Scaling Law，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '损失随参数量呈幂律下降' },
          { value: 'B', text: '收益递减但不会停止' },
          { value: 'C', text: '可以用小规模实验拟合系数后外推' },
          { value: 'D', text: '模型越大，单位算力带来的收益越高' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：幂律意味着**收益递减**——模型翻倍带来的 loss 下降会越来越小。但收益不会归零，这是持续扩大规模的理论依据。',
        tags: ['Scaling 原理'],
      },
      {
        id: 'llm-a2-c9-e5',
        type: 'fill',
        difficulty: 3,
        question: 'Chinchilla 最优配比中，每个参数对应的训练 token 数约为 ___ 个。',
        blanks: [['20', '二十']],
        explanation: 'D ≈ 20N。例如 70B 模型应训练约 1.4T token。这是"计算最优"（compute-optimal）的经验法则。',
        tags: ['Chinchilla'],
      },
      {
        id: 'llm-a2-c9-e6',
        type: 'code',
        difficulty: 2,
        question: '计算训练算力：`train_flops(n_params_b, n_tokens_t)`，用 `C = 6 × N × D`，返回 FLOPs（科学记数法的浮点数）。',
        starterCode: `def train_flops(n_params_b, n_tokens_t):
    n = n_params_b * 1e9
    d = n_tokens_t * 1e12
    return ___

train_flops(70, 1.4)
`,
        setupCode: '',
        expectedOutput: '约 5.88e23',
        tests: `c = train_flops(70, 1.4)
assert abs(c - 5.88e23) / 5.88e23 < 1e-6, f"应约 5.88e23，实际 {c}"
assert abs(train_flops(7, 1.0) - 4.2e22) / 4.2e22 < 1e-6, f"7B×1T 应约 4.2e22"
assert train_flops(1, 0.1) < c, "小模型算力应更小"
# 线性关系
assert abs(train_flops(140, 1.4) / c - 2.0) < 1e-6, "参数翻倍算力应翻倍"
`,
        answer: `def train_flops(n_params_b, n_tokens_t):
    n = n_params_b * 1e9
    d = n_tokens_t * 1e12
    return 6 * n * d


train_flops(70, 1.4)`,
        explanation:
          '```python\nn = n_params_b * 1e9\nd = n_tokens_t * 1e12\nreturn 6 * n * d\n```\n\n70B × 1.4T：6 × 70e9 × 1.4e12 = 5.88e23 FLOPs。\n\n**系数 6 的来历**：前向传播每个参数每个 token 需要 2 FLOPs（乘 + 加），反向需要 4 FLOPs（算梯度 + 算参数更新），合计 6。',
        tags: ['编程', '算力'],
      },
      {
        id: 'llm-a2-c9-e7',
        type: 'code',
        difficulty: 3,
        question: '实现 Chinchilla 最优配比：`chinchilla_optimal(compute_flops, tokens_per_param=20)`。\n\n由 `C = 6ND` 和 `D = t × N` 得 `N = sqrt(C / (6t))`，`D = t × N`。\n\n返回 `(n_params, n_tokens)`。',
        starterCode: `import math

def chinchilla_optimal(compute_flops, tokens_per_param=20):
    n = ___
    d = ___
    return n, d


chinchilla_optimal(1e24)
`,
        setupCode: '',
        expectedOutput: 'N 约 9.13e10, D 约 1.83e12',
        tests: `import math
n, d = chinchilla_optimal(1e24)
assert abs(n - math.sqrt(1e24/120)) < 1e6, f"N 计算错误: {n}"
assert abs(d - 20*n) < 1e6, f"D 应等于 20N，实际 {d}"
# 验证 C = 6ND
c = 6 * n * d
assert abs(c - 1e24) / 1e24 < 1e-6, f"回代应等于原算力，实际 {c}"
# 更大的算力 -> 更大的模型与数据
n2, d2 = chinchilla_optimal(1e25)
assert n2 > n and d2 > d
`,
        answer: `import math

def chinchilla_optimal(compute_flops, tokens_per_param=20):
    n = math.sqrt(compute_flops / (6 * tokens_per_param))
    d = tokens_per_param * n
    return n, d


chinchilla_optimal(1e24)`,
        explanation:
          '```python\nn = math.sqrt(compute_flops / (6 * tokens_per_param))\nd = tokens_per_param * n\nreturn n, d\n```\n\n**推导**：C = 6ND，D = 20N → C = 6 × N × 20N = 120N² → N = √(C/120)。\n\n1e24 算力：N ≈ 9.13e10（91B），D ≈ 1.83e12（1.83T）。\n\n回代验证：6 × 91e9 × 1.83e12 ≈ 1e24 ✓',
        tags: ['编程', 'Chinchilla'],
      },
      {
        id: 'llm-a2-c9-e8',
        type: 'code',
        difficulty: 3,
        question: '估算训练天数：`train_days(n_params_b, n_tokens_t, n_gpus=1000, tflops=312, util=0.4)`。\n\n- 总 FLOPs = 6 × N × D\n- 有效算力 = n_gpus × tflops × 1e12 × util（FLOPS）\n- 天数 = FLOPs / 有效算力 / 86400\n\n保留 1 位小数。',
        starterCode: `def train_days(n_params_b, n_tokens_t, n_gpus=1000, tflops=312, util=0.4):
    flops = ___
    effective = ___
    return round(flops / effective / 86400, 1)


train_days(70, 1.4)
`,
        setupCode: '',
        expectedOutput: '约 54.4 天',
        tests: `d = train_days(70, 1.4)
assert 50 < d < 60, f"70B×1.4T 在 1000 卡上应约 54 天，实际 {d}"
assert train_days(7, 1.0) < d, "7B 应更快"
assert train_days(70, 1.4, n_gpus=2000) < d / 1.5, "卡翻倍时间应减半"
assert train_days(70, 1.4, util=0.8) < d, "利用率提高应更快"
`,
        answer: `def train_days(n_params_b, n_tokens_t, n_gpus=1000, tflops=312, util=0.4):
    flops = 6 * (n_params_b * 1e9) * (n_tokens_t * 1e12)
    effective = n_gpus * tflops * 1e12 * util
    return round(flops / effective / 86400, 1)


train_days(70, 1.4)`,
        explanation:
          '```python\nflops = 6 * (n_params_b * 1e9) * (n_tokens_t * 1e12)\neffective = n_gpus * tflops * 1e12 * util\nreturn round(flops / effective / 86400, 1)\n```\n\n70B × 1.4T = 5.88e23 FLOPs；1000 × A100 × 40% 利用率 ≈ 1.25e17 FLOPS。\n\n5.88e23 / 1.25e17 ≈ 4.7e6 秒 ≈ **54.4 天**。\n\n**util 取 0.4 是现实值**——理论峰值 312 TFLOPS 实际很难超过 50%。',
        tags: ['编程', '算力估算'],
      },
      {
        id: 'llm-a2-c9-e9',
        type: 'judge',
        difficulty: 3,
        question: 'GPT-3（175B 参数，300B token）按 Chinchilla 标准属于"训练不足"。',
        answer: true,
        explanation: 'GPT-3 的 D/N 比例约 1.7:1，远低于 Chinchilla 建议的 20:1。这也是为什么 Chinchilla 70B（1.4T token）能达到甚至超过 GPT-3 175B 的效果。',
        tags: ['Chinchilla'],
      },
      {
        id: 'llm-a2-c9-e10',
        type: 'open',
        difficulty: 4,
        question:
          '你有 512 张 A100（80GB），6 个月预算。请用 Scaling Law 设计训练方案：算多少算力、训多大模型、用多少数据，并说明你会选"Chinchilla 最优"还是"过训"，理由是什么。',
        referenceAnswer: `**一、可用算力估算**

- A100 峰值 312 TFLOPS（bf16），实际利用率约 40% → 125 TFLOPS/卡
- 512 卡 × 125e12 = 6.4e16 FLOPS
- 6 个月 = 180 天 = 1.555e7 秒
- **总算力 C ≈ 6.4e16 × 1.555e7 ≈ 1.0e24 FLOPs**

注意要扣除故障恢复、调试、评估的时间，实际训练时间按 **70%** 计：
C_effective ≈ 7.0e23 FLOPs。

**二、Chinchilla 最优配置**

    C = 6ND, D = 20N  →  N = √(C/120)
    N = √(7e23/120) ≈ 7.6e10 = 76B
    D = 20 × 76B = 1.52T token

**结论**：Chinchilla 最优约 **76B 参数 + 1.5T token**。

**三、是否选择过训？**

**我推荐"适度过训"**，理由：

1. **推理成本主导**：模型上线后要长期服务。若日请求 100 万次、
   每次 2000 token，单次推理成本虽小但累积远超训练；
   小模型推理更快更便宜，长期 ROI 更高。

2. **具体方案**：训 **30B 参数 + 2T token**（D/N ≈ 67，约 3.3 倍过训）
   - 训练算力：6 × 30e9 × 2e12 = 3.6e23 FLOPs（用了约一半预算）
   - 剩余预算可用于：多轮实验、消融研究、后训练（SFT/RLHF）
   - 推理时，30B 比 76B 快约 2.5 倍、显存省 60%

3. **风险控制**：过训程度不宜过极端。
   LLaMA-3 的 1875:1 是因为 Meta 有超大规模推理需求；
   一般团队 50~100:1 更稳妥。

**四、为什么不选"欠训"**

训 200B 参数 + 0.3T token（D/N=1.5，类似 GPT-3）：
- 虽然参数大、能力强，但训练不充分，loss 会明显偏高；
- Chinchilla 已证明这样是浪费算力。

**五、完整方案**

| 项目 | 配置 |
| --- | --- |
| 模型规模 | 30B 参数 |
| 训练数据 | 2T token（中文为主，中英混合） |
| 训练算力 | 3.6e23 FLOPs（约 50% 预算） |
| 预留预算 | 50% 用于实验、消融、后训练 |
| 预计时长 | 约 65 天（512 卡，40% 利用率） |
| 并行方案 | TP=8 × PP=4 × DP=16 |

**六、验证与调整**

1. 先训 1B/3B 小模型验证数据质量与超参；
2. 用小规模实验**拟合自己的 scaling law**（不同数据配比下的系数）；
3. 训练中监控 loss 曲线是否符合幂律预测，偏离则说明有问题；
4. 保留 20% 算力应对"训到一半发现数据有问题"的风险。

**核心判断**：**Chinchilla 最优是"训练即结束"场景的答案；
实际产品要考虑推理成本，因此适度过训更划算。**`,
        rubric: [
          { point: '正确算出总算力（512×A100×40%×6个月）', score: 2 },
          { point: '用 N=√(C/120) 算出 Chinchilla 最优约 76B/1.5T', score: 2 },
          { point: '论证选择过训的理由：推理成本主导', score: 2 },
          { point: '给出具体方案（如 30B×2T）与算力分配', score: 2 },
          { point: '提到预留预算做实验与后训练', score: 1 },
        ],
        keywords: ['1e24', '76B', '1.5T', '过训', '推理成本', '预留预算'],
        explanation: '这是 Scaling Law 的综合应用题。核心是理解"Chinchilla 最优 ≠ 商业最优"，以及预留预算的重要性。',
        tags: ['Scaling', '系统设计'],
      },
    ],
  },
];
