import type { Chapter } from '../../types';

/* ============================================================
 *  《推理与部署工程》补充章节（c2~c4）
 *  参考：vLLM PagedAttention 论文、FlashAttention、Continuous Batching、
 *       GPTQ / AWQ 量化、Speculative Decoding、LoRA / QLoRA 论文
 * ============================================================ */

export const llmB3Extra: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2：KV Cache 与注意力推理优化
   * ============================================================ */
  {
    id: 'llm-b3-c2',
    title: 'KV Cache 与显存优化',
    goal: '理解 KV Cache 的原理与显存代价，掌握 MQA/GQA 的选择与 PagedAttention 解决的问题。',
    lessons: [
      {
        id: 'llm-b3-c2-l1',
        title: 'KV Cache：用显存换速度',
        content: `
### 学习目标

学完本节，你应该能够：
1. 推导 KV Cache 显存公式并算出 7B/4K/fp16≈2GB；
2. 对比 MHA/GQA/MQA 的 KV 缩放与质量取舍；
3. 解释 PagedAttention 如何把 60~80% 预分配浪费降到页内碎片。

### 前置知识

- llm-a1 的注意力与因果掩码；
- llm-a3 的 GQA。

### 问题背景

自回归生成的瓶颈不在算力而在访存：每生成一个 token 都要读全部历史的 K/V。KV Cache 用显存换掉 O(n³) 的重复计算，但它的显存公式决定了并发与上下文的上限——MQA/GQA/量化/滑窗/PagedAttention 是省这个『显存吞金兽』的五条路。

### 直觉理解

KV Cache 像考试的草稿纸：因果掩码保证历史 K/V 不会变，写一次即可反复看，不必每步重抄全文。代价是草稿纸面积 = 2×层数×序列长×KV头×头维×字节数——7B 模型 4K 上下文一个请求就 2GB。PagedAttention 把连续草稿本换成便签本（按页分配），浪费从 60~80% 降到几乎为零。

### 核心概念与原理详解

## 自回归生成的性能瓶颈

生成第 t 个 token 时，注意力需要**全部历史 token 的 K、V**。
如果没有缓存，每步都要重算整个前缀，复杂度 O(t²)，整体生成 O(n³)。

**关键洞察**：由于因果掩码，历史 token 的 K、V 在生成过程中**不会改变**。
所以可以缓存下来，每步只算新 token 的 Q、K、V。

<Diagram type="arch" name="kv-cache" />

## KV Cache 的显存公式

    size = 2 × L × S × H_kv × D × bytes

| 符号 | 含义 |
| --- | --- |
| 2 | K 和 V 各一份 |
| L | 层数 |
| S | 序列长度 |
| H_kv | KV 头数 |
| D | 每个头的维度 |
| bytes | 精度字节数（fp16 = 2） |

**以 7B 级模型为例**：L=32, S=4096, H=32, D=128, fp16

    2 × 32 × 4096 × 32 × 128 × 2 = 2.0 GB

**这只是一个请求的 KV Cache**。若并发 32 个用户，就是 64 GB——远超模型权重本身。

<Slider name="kv-cache-budget" />

## 三个减少 KV Cache 的方向

**1. 减少头数：MQA / GQA**

| 结构 | KV 头数 | KV Cache | 代表模型 |
| --- | --- | --- | --- |
| MHA | = Q 头数（32） | 100% | GPT-3、原始 Transformer |
| GQA | 分组（如 8） | 1/4 | LLaMA 2/3、Qwen |
| MQA | 1 | 1/32 | PaLM、Falcon |

**GQA 是当前主流**：在质量与显存之间取得最佳平衡。
LLaMA 2 70B 用 8 组 GQA，KV Cache 只有 MHA 的 1/8。

**2. 降低精度**

KV Cache 量化到 INT8 / FP8：显存减半，质量损失通常可接受。

**3. 减少长度：滑动窗口 / 稀疏注意力**

只保留最近 W 个 token 的 KV（如 Mistral 的 sliding window attention），
显存变成 O(W) 与序列长度无关。

## PagedAttention：vLLM 的核心创新

**问题**：传统实现为每个请求**预分配**一段连续的显存来存 KV Cache，
长度按 max_seq_len 分配。但实际生成长度远小于上限，导致**60%~80% 的显存浪费**。

**PagedAttention 的思路**：借鉴操作系统的虚拟内存分页——

- 把 KV Cache 切成固定大小的 **block**（如 16 个 token 一块）；
- 用**块表（block table）**记录逻辑位置到物理块的映射；
- 块可以**不连续**地存放，按需分配。

**效果**：
- 显存浪费从 60%~80% 降到 4% 以下；
- 相同显存下可支持 2~4 倍并发；
- 还支持**前缀共享**（多个请求共享系统提示的 KV 块）。

## FlashAttention：不是省显存，是省带宽

注意力的瓶颈往往不是算力，而是 **HBM 与 SRAM 之间的数据搬运**。

FlashAttention 的思路：
1. 把 Q、K、V 分块，**在 SRAM 内完成计算**；
2. 用**在线 softmax**（分块累加，避免存完整的注意力矩阵）；
3. 反向时重新计算而不是存中间结果。

**效果**：同样的 FLOPs，但 HBM 读写大幅减少，
实际速度提升 2~4 倍，显存从 O(n²) 降到 O(n)。

> **注意区分**：KV Cache 是"缓存历史 K/V 避免重算"；
> FlashAttention 是"优化注意力计算本身的访存效率"。两者互补，通常一起用。

<MultiHeadMemoryDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
GB = 2**30
def kv_gb(L, S, H_kv, D, b=2): return 2*L*S*H_kv*D*b/GB
print(f"7B MHA 4K 单请求: {kv_gb(32,4096,32,128):.2f} GiB")
print(f"7B MHA 4K ×32 并发: {kv_gb(32,4096,32,128)*32:.0f} GiB（远超 13.5 GiB 权重）")
for name, h in [("MHA", 32), ("GQA-8", 8), ("MQA", 1)]:
    print(f"{name}: KV = MHA 的 {kv_gb(32,4096,h,128)/kv_gb(32,4096,32,128):.3f}")
# PagedAttention：预分配 vs 分页
max_len, avg_len, n_req = 4096, 800, 100
prealloc = max_len*n_req
paged = avg_len*n_req*1.1                      # 10% 页内碎片
print(f"预分配 {prealloc/1e6:.2f}G 元 vs 分页 {paged/1e6:.2f}G 元（利用率 {avg_len/max_len:.0%} → ~91%）")\`\`\`

预期输出（实测）：KV 公式：7B MHA 4K 单请求 2.00 GiB，32 并发 64 GiB（远超 13.5 GiB 权重）；GQA-8 = 0.25x、MQA = 0.031x；预分配 0.41G 元 vs 分页 0.09G 元（利用率 20% → ~91%）。

**常见错误**：按 max_seq_len 预分配连续 KV 显存，实际利用率只有 20~40%；KV Cache 公式漏乘层数或字节数；并发估算用模型权重显存代替 KV 显存，上量后 OOM。

### 常见误区

1. **『KV Cache 显存=权重显存』**——权重固定、KV 随并发×序列长线性涨，长上下文时反超权重；\\n2. **『MQA 省\`\`\`显存\`\`\`没代价』**——KV 头砍到 1 有容量损失，GQA（8 组）是质量与显存的甜点；\\n3. **『滑动窗口无损』**——窗口外的注意力被截断，长程依赖任务会掉点。

### 知识关联

- **向前**：llm-a3 的 GQA/MLA 从模型结构侧省 KV，本章从部署侧管理 KV；
- **向后**：c3 的 continuous batching 依赖本章的动态 KV 管理；
- **平行**：llm-a2 的显存账（训练侧）与本章（推理侧）合为一本总账。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 公式 | 2×L×S×H_kv×D×bytes（7B/4K/fp16≈2GB）|
| 三方向 | 减头数（GQA）/降精度（INT8）/减长度（滑窗）|
| PagedAttention | 按页分配 KV，消除 60~80% 预分配浪费 |
| 瓶颈本质 | 自回归解码是访存密集型 |
| 估算 | 并发上限 = 可用显存 / 单请求 KV |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Hu et al. (2021) arXiv:2106.09685《LoRA》、Dettmers et al. (2023) arXiv:2305.14314《QLoRA》、Kwon et al. (2023)《vLLM/PagedAttention》与 TensorRT-LLM 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「为什么长上下文推理吃显存」：KV Cache 大小 = 2×L×S×H_kv×D×bytes，随序列长度线性增长，且每个并发请求都要一份。',
          },
          {
            kind: 'leak',
            text: '部署长上下文服务时优先选 GQA 模型（KV 头数少），或开启 PagedAttention（vLLM 默认）。',
          },
          {
            kind: 'note',
            text: 'FlashAttention 与 KV Cache 解决的是不同问题：前者优化注意力计算的访存，后者避免重复计算历史 K/V。',
          },
        ],
        demos: [
          {
            title: 'KV Cache 显存计算与并发估算',
            lang: 'python',
            code: `def kv_cache_gb(layers, seq_len, kv_heads, head_dim=128, bytes_per=2):
    return 2 * layers * seq_len * kv_heads * head_dim * bytes_per / (1024 ** 3)

print("单个请求的 KV Cache：")
configs = [
    ("MHA (32 头)", 32, 4096, 32),
    ("GQA (8 组)", 32, 4096, 8),
    ("MQA (1 组)", 32, 4096, 1),
]
for name, L, S, H in configs:
    print(f"  {name:<14} {kv_cache_gb(L, S, H):6.2f} GB")

print()
print("并发 32 个请求，序列 4096（GQA 8 组）：")
per = kv_cache_gb(32, 4096, 8)
print(f"  单请求 {per:.2f} GB × 32 = {per*32:.1f} GB")
print(f"  加上模型权重（14GB fp16）总计约 {per*32+14:.0f} GB")
print()
print("→ 这就是为什么 24GB 显卡只能服务很少的长上下文并发")`,
          },
          {
            title: 'PagedAttention 的块表映射',
            lang: 'python',
            code: `class BlockTable:
    """模拟 PagedAttention 的逻辑块 → 物理块映射。"""
    def __init__(self, block_size=4):
        self.block_size = block_size
        self.table = []      # 逻辑块序号 -> 物理块 id
        self.next_physical = 0
        self.total_allocated = 0

    def append_tokens(self, n_tokens):
        # 需要多少块（按需分配，不预分配）
        while len(self.table) * self.block_size < n_tokens:
            self.table.append(self.next_physical)
            self.next_physical += 1
            self.total_allocated += 1
        return self.table

    def physical_of(self, logical_pos):
        blk = self.table[logical_pos // self.block_size]
        off = logical_pos % self.block_size
        return blk * self.block_size + off

bt = BlockTable(block_size=4)
print("逐步生成 10 个 token（块大小 4）：")
for i in range(1, 11):
    bt.append_tokens(i)
    print(f"  生成 {i:2d} 个 token -> 占用 {len(bt.table)} 块，逻辑块表 {bt.table}")

print()
print(f"总共分配 {bt.total_allocated} 块 = {bt.total_allocated*4} 个 token 容量")
print(f"实际使用 10 个 token，浪费率 {(1 - 10/(bt.total_allocated*4)):.0%}")
print()
print("若按 max_seq_len=4096 预分配：需 1024 块，浪费率 99.8%")
print("→ 这就是 PagedAttention 能把显存浪费降到 <4% 的原因")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b3-c2-e1',
        type: 'single',
        difficulty: 2,
        question: 'KV Cache 能加速推理的本质原因是？',
        options: [
          { value: 'A', text: '减少了模型参数量' },
          { value: 'B', text: '历史 token 的 K/V 在生成过程中不变，可以缓存避免重算' },
          { value: 'C', text: '跳过了部分注意力计算' },
          { value: 'D', text: '降低了输出精度' },
        ],
        answer: 'B',
        explanation: '因果掩码保证历史 token 的 K/V 不会被后续 token 影响，因此可以缓存。这让每步 K/V 计算量从 O(t) 降到 O(1)。',
        tags: ['KV Cache'],
      },
      {
        id: 'llm-b3-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: 'KV Cache 会减少显存占用。',
        answer: false,
        explanation: 'KV Cache 用**显存换时间**。它减少了重复计算，但增加了显存占用，而且是长上下文推理的主要显存瓶颈。',
        tags: ['KV Cache'],
      },
      {
        id: 'llm-b3-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: '下列哪些手段可以减少 KV Cache 的显存占用？（多选）',
        options: [
          { value: 'A', text: '使用 GQA 减少 KV 头数' },
          { value: 'B', text: '把 KV Cache 量化到 INT8' },
          { value: 'C', text: '使用滑动窗口注意力只保留最近 W 个 token' },
          { value: 'D', text: '增大 batch size' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 反而会增加总显存（每个请求都要一份 KV Cache）。A/B/C 分别从头数、精度、长度三个方向削减。',
        tags: ['显存优化'],
      },
      {
        id: 'llm-b3-c2-e4',
        type: 'fill',
        difficulty: 3,
        question: 'vLLM 提出的 ___ 技术借鉴操作系统虚拟内存分页，把 KV Cache 切成固定大小的块按需分配，把显存浪费降到 4% 以下。',
        blanks: [['PagedAttention', 'pagedattention', '分页注意力', 'Paged Attention']],
        explanation: 'PagedAttention 用块表（block table）维护逻辑块到物理块的映射，块可以不连续，无需按 max_seq_len 预分配，还支持前缀共享。',
        tags: ['PagedAttention'],
      },
      {
        id: 'llm-b3-c2-e5',
        type: 'code',
        difficulty: 2,
        question: '计算 KV Cache 显存（GB）：实现 `kv_cache_gb(layers, seq_len, kv_heads, head_dim=128, bytes_per=2)`。\n\n公式：`2 * layers * seq_len * kv_heads * head_dim * bytes_per / (1024**3)`，返回保留 4 位小数。',
        starterCode: `def kv_cache_gb(layers, seq_len, kv_heads, head_dim=128, bytes_per=2):
    ___

kv_cache_gb(32, 4096, 32)
`,
        setupCode: '',
        expectedOutput: '2.0',
        tests: `assert abs(kv_cache_gb(32, 4096, 32) - 2.0) < 1e-4, f"MHA 32 头应约 2.0GB，实际 {kv_cache_gb(32,4096,32)}"
assert abs(kv_cache_gb(32, 4096, 8) - 0.5) < 1e-4, f"GQA 8 组应约 0.5GB"
assert abs(kv_cache_gb(32, 4096, 1) - 0.0625) < 1e-4, f"MQA 应约 0.0625GB"
assert kv_cache_gb(32, 4096, 32, bytes_per=1) < kv_cache_gb(32, 4096, 32, bytes_per=2), "低精度应更省显存"
assert kv_cache_gb(32, 8192, 32) > kv_cache_gb(32, 4096, 32), "序列越长显存越多"
`,
        answer: `def kv_cache_gb(layers, seq_len, kv_heads, head_dim=128, bytes_per=2):
    return round(2 * layers * seq_len * kv_heads * head_dim * bytes_per / (1024 ** 3), 4)


kv_cache_gb(32, 4096, 32)`,
        explanation:
          '```python\nreturn round(2 * layers * seq_len * kv_heads * head_dim * bytes_per / (1024 ** 3), 4)\n```\n\n**系数 2** 表示 K 与 V 各一份。头数从 32 降到 8，显存直接降到 1/4——这就是 GQA 的价值。',
        tags: ['编程', '显存估算'],
      },
      {
        id: 'llm-b3-c2-e6',
        type: 'code',
        difficulty: 4,
        question: '估算可支持的并发数：实现 `max_concurrency(gpu_gb, model_gb, layers, seq_len, kv_heads, head_dim=128, bytes_per=2)`。\n\n- 先算出单请求 KV Cache（GB）\n- 可并发数 = floor((gpu_gb - model_gb) / per_request_kv)\n- 若剩余显存不足或 per_request_kv 为 0，返回 0',
        starterCode: `def max_concurrency(gpu_gb, model_gb, layers, seq_len, kv_heads, head_dim=128, bytes_per=2):
    per = ___
    if per <= 0:
        return 0
    remain = ___
    if remain <= 0:
        return 0
    return int(remain // per)


max_concurrency(80, 14, 32, 4096, 8)
`,
        setupCode: '',
        expectedOutput: '约 132',
        tests: `# 80GB 卡，模型 14GB，GQA 8 组，4096 长度
n = max_concurrency(80, 14, 32, 4096, 8)
assert n > 100, f"应能支持上百并发，实际 {n}"
assert isinstance(n, int), "应返回整数"

# MHA 32 头，显存需求大 4 倍，并发数约 1/4
n_mha = max_concurrency(80, 14, 32, 4096, 32)
assert n_mha < n / 3, f"MHA 并发数应显著更少（{n_mha} vs {n}）"

# 显存不足
assert max_concurrency(10, 14, 32, 4096, 8) == 0, "显存不足应返回 0"
`,
        answer: `def max_concurrency(gpu_gb, model_gb, layers, seq_len, kv_heads, head_dim=128, bytes_per=2):
    per = 2 * layers * seq_len * kv_heads * head_dim * bytes_per / (1024 ** 3)
    if per <= 0:
        return 0
    remain = gpu_gb - model_gb
    if remain <= 0:
        return 0
    return int(remain // per)


max_concurrency(80, 14, 32, 4096, 8)`,
        explanation:
          '```python\nper = 2 * layers * seq_len * kv_heads * head_dim * bytes_per / (1024 ** 3)\nif per <= 0:\n    return 0\nremain = gpu_gb - model_gb\nif remain <= 0:\n    return 0\nreturn int(remain // per)\n```\n\n**两组除零保护**：per 不能为 0，剩余显存不能为负。\n\n结果说明：80GB 卡、14GB 模型、GQA 8 组，剩余 66GB ÷ 0.5GB ≈ 132 并发。\n换成 MHA 32 头时每请求 2GB，只能支持约 33 并发——差距 4 倍。',
        tags: ['编程', '容量规划'],
      },
      {
        id: 'llm-b3-c2-e7',
        type: 'single',
        difficulty: 3,
        question: 'FlashAttention 主要优化的是？',
        options: [
          { value: 'A', text: '减少模型参数量' },
          { value: 'B', text: '减少注意力计算中的 HBM 读写，提升访存效率' },
          { value: 'C', text: '压缩 KV Cache' },
          { value: 'D', text: '加速数据加载' },
        ],
        answer: 'B',
        explanation: '注意力往往是访存瓶颈而非算力瓶颈。FlashAttention 通过分块 + 在线 softmax 在 SRAM 内完成计算，减少 HBM 读写，速度提升 2~4 倍且显存从 O(n²) 降到 O(n)。',
        tags: ['FlashAttention'],
      },
      {
        id: 'llm-b3-c2-e8',
        type: 'judge',
        difficulty: 3,
        question: 'PagedAttention 的核心是借鉴操作系统虚拟内存分页，让 KV Cache 的物理块可以不连续。',
        answer: true,
        explanation: '通过块表（block table）维护逻辑位置到物理块的映射，实现按需分配、非连续存储，把显存浪费从 60%~80% 降到 4% 以下，还支持前缀共享。',
        tags: ['PagedAttention'],
      },
      {
        id: 'llm-b3-c2-e9',
        type: 'open',
        difficulty: 4,
        question: '你需要在单张 80GB GPU 上部署一个 70B 模型（fp16 约 140GB）提供长上下文（32K）服务。请说明你会如何设计，涉及模型无法放入显存时的处理、KV Cache 的管理、以及吞吐与延迟的权衡。',
        referenceAnswer: `**核心矛盾**：70B fp16 权重 140GB 放不进 80GB，且 32K 上下文的 KV Cache 更大。

**一、模型无法放入显存的处理**

1. **量化（首选）**
   - 权重 INT4（GPTQ/AWQ）：140GB → 约 35GB，剩余约 45GB 给 KV Cache 与激活；
   - 质量损失通常可接受（PPL 上升几个百分点），需评估集验证。
   - INT8 约 70GB，也能放下但留给 KV 的空间紧张。

2. **张量并行（Tensor Parallelism）**
   - 拆到 2 张 80GB 卡上（每卡 70GB），这是扩展 70B 服务的标准做法；
   - 单卡 80GB 场景下无法用 TP，因此优先量化。

3. **绝不能指望 CPU offload**：权重量在 CPU 上会导致每步搬运数十 GB，延迟不可接受。

**二、KV Cache 管理**

先算单请求需求（以 GQA 8 头为例，L=80, S=32768, D=128）：

    KV = 2 × 80 × 32768 × 8 × 128 × 2 / 1024³ ≈ 2.5 GB

- 45GB 剩余 ÷ 2.5GB ≈ **18 个并发**；
- 若 KV 再量化到 INT8，可到约 36 并发。

措施：
- 用 **vLLM PagedAttention** 按需分块分配，把浪费从 60% 降到 <4%；
- 开启**前缀缓存**（相同系统提示共享 KV 块）；
- 限制 max_model_len（如真的需要 32K 才放开，否则设为 8K）。

**三、吞吐与延迟的权衡**

| 目标 | 手段 | 代价 |
| --- | --- | --- |
| 降 TTFT | 前缀缓存、减少输入长度 | 需要请求共享前缀 |
| 降 TPOT | 量化、投机解码 | 质量/复杂度 |
| 提吞吐 | Continuous Batching、增大并发 | 单请求延迟上升 |
| 保延迟 | 限制最大并发、优先保证 SLO | 吞吐下降 |

**推荐配置**：
- INT4 量化 + vLLM + Continuous Batching + PagedAttention；
- 设置合理的 max_num_seqs（如 16~24），避免过度批处理导致 P99 延迟飙升；
- 监控 TTFT、TPOT、KV Cache 使用率、请求排队长度。

**四、验证**

压测：固定输入长度，逐步加并发，观察吞吐与 P99 延迟的拐点，
找到"吞吐/延迟"的最佳工作点，而不是盲目追求最大并发。`,
        rubric: [
          { point: '指出 fp16 放不进 80GB，首选 INT4/INT8 量化', score: 2 },
          { point: '提出张量并行但认识到单卡不适用', score: 1 },
          { point: '计算 KV Cache 需求并给出并发估算', score: 2 },
          { point: '使用 PagedAttention / 前缀缓存 / Continuous Batching', score: 2 },
          { point: '通过压测找吞吐与延迟的最佳工作点', score: 1 },
        ],
        keywords: ['INT4', '量化', '张量并行', 'PagedAttention', '前缀缓存', 'Continuous Batching', 'P99'],
        explanation: '这是生产部署的真实决策题，考察能否把显存估算、量化、批处理策略串成一套可行方案。',
        tags: ['部署', '容量规划'],
      },
    ],
  },

  /* ============================================================
   *  c3：批处理与推理引擎
   * ============================================================ */
  {
    id: 'llm-b3-c3',
    title: '批处理与推理引擎',
    goal: '理解静态批处理与 Continuous Batching 的差别，掌握 vLLM 的关键机制与 TTFT/TPOT 的含义。',
    lessons: [
      {
        id: 'llm-b3-c3-l1',
        title: 'Continuous Batching：把 GPU 喂饱',
        content: `
### 学习目标

学完本节，你应该能够：
1. 用生成长度差异说明静态批的利用率问题；
2. 模拟 continuous batching 的 token 级调度并对比 GPU 占比；
3. 定义 TTFT/TPOT 并写出总延迟公式与优化取舍。

### 前置知识

- 「KV Cache：用显存换速度」（c2-l1）。

### 问题背景

单个请求跑不满 GPU，批处理是吞吐的钥匙；但静态 batching 被最长请求拖死（短请求陪跑），continuous batching 以 token 为粒度调度把利用率拉满——vLLM/TensorRT-LLM 的核心价值所在。

### 直觉理解

静态批像旅行社大巴：凑够一车发车，最早下车的乘客也要坐到终点站。连续批像地铁：每到一站（每步解码）有下车的立刻腾位、有候车的立刻上车，车厢始终满载。TTFT 是发车等待感，TPOT 是行驶速度感——batch 越大吞吐越高但两者都会变差。

### 核心概念与原理详解

## 为什么需要批处理

GPU 擅长并行计算。单个请求生成时，大部分算力是闲置的。
把多个请求打包成一个 batch，能显著提升吞吐。

## 静态批处理的问题

**做法**：攒够 N 个请求，一起跑，全部结束后再处理下一批。

**问题**：请求的**生成长度差异极大**。

    [请求 A: 生成 10 个 token]  ■■■
    [请求 B: 生成 200 个 token] ■■■■■■■■■■■■■■■■■■■■
    [请求 C: 生成 50 个 token]  ■■■■■

    A 完成后，那部分算力就**闲置**了，必须等 B 跑完才能开始下一批。

**结果**：GPU 利用率低，平均延迟被最长的请求拖累。

## Continuous Batching（连续批处理）

**核心思想**：以 **token 为粒度**调度，而不是以请求为粒度。

- 每一步解码时，检查是否有请求已完成 → **立即移出 batch**；
- 检查是否有新请求到达 → **立即加入 batch**；
- batch 的大小每一步都可能变化。

    step 1: [A, B, C]
    step 2: [A, B, C]
    step 3: [A, B, C, D]   ← D 到达，加入
    step 4: [B, C, D, E]   ← A 完成，移出；E 加入
    ...

**效果**：GPU 几乎不闲置，吞吐可提升 **5~20 倍**，而单个请求的延迟几乎不变。

**代价**：实现复杂（动态 batch、KV Cache 的动态管理），
这也是 vLLM / TensorRT-LLM 这类引擎的核心价值。

## 两个关键延迟指标

| 指标 | 含义 | 影响 |
| --- | --- | --- |
| **TTFT**（Time To First Token） | 从请求到第一个 token 输出的时间 | 用户"等待感" |
| **TPOT**（Time Per Output Token） | 后续每生成一个 token 的平均耗时 | 阅读速度感知 |

**总延迟** ≈ TTFT + TPOT × 输出 token 数

**优化取舍**：
- 增大 batch → 吞吐上升，但 TTFT 与 TPOT 都会变差；
- 流式输出降低"体感 TTFT"（用户先看到字）；
- 前缀缓存能显著降低 TTFT（相同系统提示无需重算）。

## Prefill 与 Decode 两个阶段

**Prefill（预填充）**：处理整个输入 prompt，**计算密集**（大矩阵乘），并行度高。
→ 决定了 TTFT。

**Decode（解码）**：逐个生成 token，**访存密集**（每步要读全部权重与 KV Cache），GPU 算力利用率低。
→ 决定了 TPOT。

**Chunked Prefill**：把长 prompt 的 prefill 切成几块，
与 decode 交错执行，避免一个超长请求阻塞其他请求的 decode。

## vLLM 的整体架构

    ┌──────────────────────────────────┐
    │  Scheduler（调度器）              │
    │  决定每步哪些请求参与、如何分配块  │
    ├──────────────────────────────────┤
    │  Block Manager（块管理器）         │
    │  PagedAttention：逻辑块→物理块     │
    ├──────────────────────────────────┤
    │  Worker（GPU 执行）                │
    │  模型前向 + KV Cache 读写          │
    └──────────────────────────────────┘

**关键特性**：
- PagedAttention 管理 KV Cache；
- Continuous Batching 动态组批；
- 前缀缓存（Automatic Prefix Caching）；
- 张量并行 / 流水线并行支持多卡。

## 其他引擎

| 引擎 | 特点 |
| --- | --- |
| **vLLM** | 开源事实标准，PagedAttention + Continuous Batching |
| **TensorRT-LLM** | NVIDIA 官方，极致性能，需编译引擎 |
| **SGLang** | RadixAttention 前缀共享，适合多轮与结构化生成 |
| **llama.cpp** | CPU / 消费级 GPU，GGUF 量化，本地部署首选 |
| **Ollama** | 基于 llama.cpp 的易用封装 |

**选型建议**：服务端高并发选 vLLM；极致性能且愿意投入工程选 TensorRT-LLM；
本地/边缘选 llama.cpp / Ollama。

<PipelineScheduleDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import random
random.seed(0)
lens = [10, 200, 50, 80, 30]                   # 5 个请求的输出长度
# ---- 静态批：最长请求决定批次时长 ----
t_static = max(lens)
util = sum(lens)/(t_static*len(lens))
print(f"静态批: 批次时长 {t_static} 步, GPU 利用率 {util:.0%}（短请求陪跑）")
# ---- 连续批：token 粒度进出，t=60 有新请求到达 ----
active = lens[:]; t = 0; arrival = 60
while t < arrival and active:
    active = [x-1 for x in active if x-1 > 0]
    t += 1
print(f"t={t}: 已完成 {len(lens)-len(active)} 个请求，新请求立即加入（等待 0 步；静态批需再等 {t_static-arrival} 步）")
# ---- TTFT / TPOT ----
ttft, tpot, out = 0.30, 0.025, 200
print(f"总延迟 ≈ TTFT {ttft}s + TPOT {tpot}s × {out} tok = {ttft + tpot*out:.1f}s")\`\`\`

预期输出（实测）：静态批：批次时长被最长请求（200 步）拖住，GPU 利用率仅 37%；连续批：t=60 时短请求已完成 3 个，新请求等待 0 步（静态批需再等 140 步）；总延迟 ≈ 0.3 + 0.025×200 = 5.3s。

**常见错误**：批大小拍脑袋拉满，TTFT 飙升用户流失；prefill 与 decode 混跑，长 prompt 的计算密集阶段堵塞所有 decode 请求（应分池或 chunked prefill）；忘了前缀缓存，同一系统提示反复重算。

### 常见误区

1. **『吞吐=延迟优化的对立面』**——连续批同时改善两者（相比静态批），取舍只在 batch 上限；\\n2. **『解码阶段算力瓶颈』**——decode 是访存密集（每步读全部权重+KV），提高 batch 摊薄访存才提速；\\n3. **『流式输出改变生成速度』**——它只降低体感 TTFT，token 生成速率不变。

### 知识关联

- **向前**：c2 的 KV 显存管理是动态 batch 的物理前提；
- **向后**：c4 的成本模型直接由本章吞吐决定；
- **平行**：quant-live 的 continuous 概念与本章共享『事件到达即处理』思想。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 静态批 | 请求为粒度，短请求陪跑，利用率低 |
| 连续批 | token 为粒度：完成即出、到达即入 |
| 收益 | 吞吐提升 5~20 倍，单请求延迟几乎不变 |
| 指标 | TTFT（prefill 决定）+ TPOT×输出长（decode）|
| 阶段 | prefill 计算密集 / decode 访存密集 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Hu et al. (2021) arXiv:2106.09685《LoRA》、Dettmers et al. (2023) arXiv:2305.14314《QLoRA》、Kwon et al. (2023)《vLLM/PagedAttention》与 TensorRT-LLM 文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「Continuous Batching 与静态批处理的区别」：以 token 为粒度动态加入/移出请求，而不是等整批结束，吞吐可提升数倍。',
          },
          {
            kind: 'leak',
            text: 'TTFT 由 prefill 决定（计算密集），TPOT 由 decode 决定（访存密集）。优化两者要用不同手段。',
          },
          {
            kind: 'note',
            text: 'Chunked Prefill 能避免一个超长 prompt 阻塞整批请求的 decode，是生产环境的常见配置。',
          },
        ],
        demos: [
          {
            title: '静态批处理 vs 连续批处理',
            lang: 'python',
            code: `def static_batching(requests):
    """每批等最长的请求结束。"""
    total_steps = 0
    for i in range(0, len(requests), 3):
        batch = requests[i:i+3]
        total_steps += max(batch)      # 等最长的
    return total_steps

def continuous_batching(requests):
    """每个 token 一步，完成的立即移出。"""
    active = []
    total_steps = 0
    queue = list(requests)
    while queue or active:
        # 有空位就加入新请求
        while queue and len(active) < 3:
            active.append(queue.pop(0))
        # 走一步
        total_steps += 1
        active = [r - 1 for r in active]
        active = [r for r in active if r > 0]
    return total_steps

requests = [10, 200, 50, 30, 120, 15]
print(f"6 个请求的输出长度: {requests}")
print(f"静态批处理总步数: {static_batching(requests)}")
print(f"连续批处理总步数: {continuous_batching(requests)}")
print()
print("静态批处理：每批都要等最长的那个，A 完成后算力闲置")
print("连续批处理：完成的立即让位给新请求，GPU 持续满载")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b3-c3-e1',
        type: 'single',
        difficulty: 2,
        question: 'Continuous Batching 相比静态批处理的核心改进是？',
        options: [
          { value: 'A', text: '使用更大的 batch size' },
          { value: 'B', text: '以 token 为粒度动态加入/移出请求，避免等待最长请求' },
          { value: 'C', text: '减少模型层数' },
          { value: 'D', text: '降低输出 token 数' },
        ],
        answer: 'B',
        explanation: '静态批处理要等整批结束，短请求完成后算力闲置。连续批处理每步检查，完成的立即移出、新到的立即加入，GPU 持续满载。',
        tags: ['批处理'],
      },
      {
        id: 'llm-b3-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: 'TTFT（首 token 时间）主要由 prefill 阶段决定，而 TPOT（每 token 时间）主要由 decode 阶段决定。',
        answer: true,
        explanation: 'Prefill 处理整个 prompt，计算密集，决定用户等待第一个字的时间；Decode 逐 token 生成，访存密集，决定后续出字速度。',
        tags: ['延迟指标'],
      },
      {
        id: 'llm-b3-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于 prefill 与 decode，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'prefill 计算密集，GPU 利用率高' },
          { value: 'B', text: 'decode 访存密集，需要反复读取全部权重与 KV Cache' },
          { value: 'C', text: '增大 batch 能提升吞吐，但会恶化 TTFT 与 TPOT' },
          { value: 'D', text: 'Chunked Prefill 可以让长 prompt 不阻塞其他请求的 decode' },
        ],
        answer: ['A', 'B', 'C', 'D'],
        explanation: '四项都正确。prefill 是大矩阵乘（算力受限），decode 每步只算一个 token 却要读全部权重（带宽受限）。Chunked Prefill 正是为了解决长 prompt 阻塞问题。',
        tags: ['推理阶段'],
      },
      {
        id: 'llm-b3-c3-e4',
        type: 'fill',
        difficulty: 3,
        question: 'vLLM 的核心创新是 PagedAttention，配合 ___ Batching 动态组批，吞吐相比朴素实现可提升数倍。',
        blanks: [['Continuous', 'continuous', '连续', '连续批处理']],
        explanation: 'PagedAttention 解决 KV Cache 显存碎片，Continuous Batching 解决 GPU 闲置。两者是 vLLM 高性能的两大支柱。',
        tags: ['vLLM'],
      },
      {
        id: 'llm-b3-c3-e5',
        type: 'code',
        difficulty: 3,
        question: '模拟静态批处理：实现 `static_batching_steps(requests, batch_size)`。\n\n- `requests` 是各请求需要的 decode 步数列表\n- 每批取 batch_size 个请求，该批耗时 = 这批中最大的步数\n- 返回总步数',
        starterCode: `def static_batching_steps(requests, batch_size=2):
    total = 0
    ___
    return total


static_batching_steps([10, 200, 50, 30], 2)
`,
        setupCode: '',
        expectedOutput: '250',
        tests: `assert static_batching_steps([10, 200, 50, 30], 2) == 250, f"应为 max(10,200)+max(50,30)=250，实际 {static_batching_steps([10,200,50,30],2)}"
assert static_batching_steps([5, 5], 2) == 5, "两个相同长度只需 5 步"
assert static_batching_steps([], 2) == 0, "空列表应返回 0"
assert static_batching_steps([1, 2, 3], 1) == 6, "batch_size=1 时是串行 1+2+3"
`,
        answer: `def static_batching_steps(requests, batch_size=2):
    total = 0
    for i in range(0, len(requests), batch_size):
        batch = requests[i:i + batch_size]
        if batch:
            total += max(batch)
    return total


static_batching_steps([10, 200, 50, 30], 2)`,
        explanation:
          '```python\nfor i in range(0, len(requests), batch_size):\n    batch = requests[i:i + batch_size]\n    if batch:\n        total += max(batch)\nreturn total\n```\n\n每批的耗时由最长的请求决定——这正是静态批处理低效的原因：短请求完成后算力闲置，但时间仍按最长的算。',
        tags: ['编程', '批处理'],
      },
      {
        id: 'llm-b3-c3-e6',
        type: 'code',
        difficulty: 4,
        question: '估算吞吐：实现 `estimate_throughput(total_tokens, avg_batch, tpot_ms, concurrency_overhead=1.2)`。\n\n- 有效每 token 耗时 = `tpot_ms / avg_batch`（批处理摊薄）再乘 overhead\n- 吞吐（tokens/s）= 1000 / 有效每 token 毫秒\n- 返回 `(throughput_tokens_per_sec, total_seconds)`，保留 2 位小数',
        starterCode: `def estimate_throughput(total_tokens, avg_batch, tpot_ms, concurrency_overhead=1.2):
    effective = ___
    tps = ___
    total_s = ___
    return round(tps, 2), round(total_s, 2)


estimate_throughput(10000, 8, 20)
`,
        setupCode: '',
        expectedOutput: '吞吐与总耗时',
        tests: `tps, secs = estimate_throughput(10000, 8, 20)
# 有效 = 20/8*1.2 = 3.0 ms/token -> 333.33 tokens/s
assert abs(tps - 333.33) < 0.1, f"吞吐应约 333.33，实际 {tps}"
assert abs(secs - 30.0) < 0.1, f"总耗时应约 30s，实际 {secs}"

# batch 翻倍，吞吐应翻倍
tps2, _ = estimate_throughput(10000, 16, 20)
assert abs(tps2 - tps * 2) < 1, "batch 翻倍吞吐应近似翻倍"

# 单请求（batch=1）吞吐最低
tps1, _ = estimate_throughput(10000, 1, 20)
assert tps1 < tps, "单请求吞吐应低于批处理"
`,
        answer: `def estimate_throughput(total_tokens, avg_batch, tpot_ms, concurrency_overhead=1.2):
    effective = tpot_ms / avg_batch * concurrency_overhead
    tps = 1000.0 / effective
    total_s = total_tokens / tps
    return round(tps, 2), round(total_s, 2)


estimate_throughput(10000, 8, 20)`,
        explanation:
          '```python\neffective = tpot_ms / avg_batch * concurrency_overhead\ntps = 1000.0 / effective\ntotal_s = total_tokens / tps\nreturn round(tps, 2), round(total_s, 2)\n```\n\n**核心洞察**：批处理让多个请求共享同一份权重读取，因此单位 token 的有效成本被除以 batch size。\n\n`concurrency_overhead` 模拟批处理带来的额外开销（如 KV Cache 竞争、调度成本），所以吞吐不是严格线性增长。',
        tags: ['编程', '性能估算'],
      },
      {
        id: 'llm-b3-c3-e7',
        type: 'single',
        difficulty: 3,
        question: '本地部署（个人电脑/边缘设备）最常用的推理方案是？',
        options: [
          { value: 'A', text: 'vLLM' },
          { value: 'B', text: 'TensorRT-LLM' },
          { value: 'C', text: 'llama.cpp / Ollama（GGUF 量化）' },
          { value: 'D', text: '直接跑 PyTorch 原始权重' },
        ],
        answer: 'C',
        explanation: 'llama.cpp 支持 CPU 与消费级 GPU，用 GGUF 格式做低比特量化，是本地部署的事实标准。Ollama 在其之上提供了易用封装。vLLM/TensorRT-LLM 面向服务端多卡高并发场景。',
        tags: ['部署选型'],
      },
      {
        id: 'llm-b3-c3-e8',
        type: 'judge',
        difficulty: 3,
        question: '增大 batch size 能同时提升吞吐和降低单请求延迟。',
        answer: false,
        explanation: '增大 batch 提升的是吞吐（单位时间处理的 token 数），但会拉长每个请求的 TTFT 与 TPOT。吞吐与延迟是此消彼长的权衡关系。',
        tags: ['性能权衡'],
      },
      {
        id: 'llm-b3-c3-e9',
        type: 'open',
        difficulty: 4,
        question: '一个在线服务要求 P99 延迟 < 2 秒、且要尽可能高的吞吐。请说明你会如何调优推理引擎：从批处理、KV Cache、量化、请求调度四个方面给出具体措施，并说明如何找到吞吐与延迟的平衡点。',
        referenceAnswer: `**一、批处理**

- 启用 **Continuous Batching**（vLLM 默认）：以 token 粒度动态进出 batch，避免等最长请求；
- 设置 \`max_num_seqs\` 上限（如 32~64），防止 batch 过大导致 TPOT 飙升；
- 启用 **Chunked Prefill**：把长 prompt 的 prefill 切块，与 decode 交错，
  避免单个长请求阻塞其他请求超过 P99 预算。

**二、KV Cache**

- 用 **PagedAttention** 按需分块，把显存浪费从 60% 降到 <4%，同显存下并发翻倍；
- 开启**自动前缀缓存**（Automatic Prefix Caching）：系统提示固定时，
  相同前缀的请求共享 KV 块，显著降低 TTFT；
- KV Cache 量化（FP8/INT8）：显存减半，可容纳更多并发；
- 合理设置 \`max_model_len\`，不要盲目开到模型上限。

**三、量化**

- 权重 **INT8/FP8**：几乎无损，显存减半，TPOT 改善明显（访存带宽减半）；
- 权重 **INT4（AWQ/GPTQ）**：显存降到 1/4，可大幅提升并发，但需评估质量损失；
- 注意量化对**长上下文与小模型**的损失更明显，要用评估集验证。

**四、请求调度**

- **分离思考与快速通道**：简单请求路由到小模型，复杂请求才用大模型；
- **优先级队列**：交互式请求优先于批量离线任务（离线任务可放到低峰期跑）；
- **超时与降级**：超过 P99 预算的请求截断输出或降级到小模型；
- **限流**：控制并发上限，避免排队长度爆炸导致所有请求都超时。

**五、如何找到平衡点**

1. 固定输入/输出长度分布，逐步提高并发（如 1→8→16→32→64）；
2. 每档测量：吞吐（tokens/s）、TTFT P50/P99、TPOT P50/P99；
3. 画出「并发 vs 吞吐」与「并发 vs P99 延迟」两条曲线；
4. 找到 **P99 刚好满足 2 秒** 的最大并发点，那就是工作点；
5. 上线后持续监控，业务量变化时重新压测定档。

**经验值**：多数场景下，把 P99 控制在预算的 70%~80% 留出余量，
比压到 99% 更稳妥（避免突发流量导致大面积超时）。`,
        rubric: [
          { point: 'Continuous Batching + max_num_seqs 上限 + Chunked Prefill', score: 2 },
          { point: 'PagedAttention / 前缀缓存 / KV 量化', score: 2 },
          { point: 'INT8/FP8 或 INT4 量化并说明质量权衡', score: 1 },
          { point: '请求分级、限流、超时降级', score: 1 },
          { point: '用并发扫描 + 双曲线找 P99 满足下的最大吞吐', score: 2 },
        ],
        keywords: ['Continuous Batching', 'Chunked Prefill', 'PagedAttention', '前缀缓存', '量化', 'P99', '压测'],
        explanation: '这是推理部署的综合题，考察能否把引擎特性、量化、调度策略组合成满足 SLO 的方案。',
        tags: ['部署', '性能调优'],
      },
    ],
  },

  /* ============================================================
   *  c4：成本优化与服务化
   * ============================================================ */
  {
    id: 'llm-b3-c4',
    title: '成本优化与服务化',
    goal: '掌握 token 成本构成、Prompt Caching、模型路由与缓存策略，能做出成本与质量的权衡决策。',
    lessons: [
      {
        id: 'llm-b3-c4-l1',
        title: '成本结构与优化手段',
        content: `
### 学习目标

学完本节，你应该能够：
1. 写出 API 成本公式并说明输出单价更高的影响；
2. 计算前缀缓存与提示精简的节省比例；
3. 设计模型路由（规则/分类/级联）并估算 70% 流量走小模型的降本。

### 前置知识

- c2/c3 的显存与吞吐基础。

### 问题背景

API 按 token 计费（输出贵 3~5 倍）、自建按 GPU 小时计费——LLM 应用的毛利藏在输入裁剪、前缀缓存、输出约束与模型路由四个杠杆里。路由是最大的降本杠杆：不是所有请求都需要最强模型。

### 直觉理解

成本像话费账单：输入是接听费、输出是拨出费（更贵）。省法有四：少说废话（精简系统提示）、包月套餐（前缀缓存命中按 10% 计费）、短信化（max_tokens 与格式约束）、按需选运营商（路由：简单问题走小模型，复杂问题升级大模型，级联兜底）。

### 核心概念与原理详解

## 成本从哪里来

调用 API 时按 token 计费，**输入与输出价格不同**（输出通常贵 3~5 倍）：

| 模型档位 | 输入（$/M tokens） | 输出（$/M tokens） |
| --- | --- | --- |
| 小模型 | 0.1~0.5 | 0.4~1.5 |
| 中模型 | 1~3 | 4~15 |
| 大模型 | 5~15 | 15~75 |

**成本 = 输入 token × 输入单价 + 输出 token × 输出单价**

自建推理则按 GPU 小时计费，成本取决于吞吐与利用率。

## 输入侧优化

**1. 精简系统提示**

系统提示在每个请求里重复。一个 1000 token 的系统提示，
100 万次请求 = 10 亿 token —— 这笔钱完全可以省。
能 200 字说清的就别写 1000 字。

**2. Prompt Caching（前缀缓存）**

把固定的系统提示 / 长文档前缀缓存起来，后续请求命中缓存时**按极低价格计费**
（很多厂商对缓存命中的输入收 10% 甚至更低）。

**适用场景**：系统提示长、多轮对话、RAG 中相同的文档被反复查询。

**要求**：前缀必须**完全一致**（一个字都不能变），所以要把可变内容放在后面。

**3. 裁剪上下文**

- RAG 只放 Top-3 而非 Top-10；
- 工具返回结果先摘要再放入；
- 历史对话做滑动窗口或摘要压缩。

## 输出侧优化

- 设置 \`max_tokens\` 上限；
- 提示中要求简洁（"不超过 100 字"、"只输出 JSON"）；
- 用结构化输出减少冗余文字。

## 模型路由：最大的降本杠杆

**不是所有请求都需要最强模型**：

    def route(query, complexity):
        if is_simple(query):        return small_model    # 分类、抽取、短问答
        if needs_reasoning(query):  return large_model    # 数学、多步推理、代码
        return medium_model

**收益**：成本可降 50%~80%，大多数简单请求质量不受影响。
**风险**：路由判断错误会让简单请求变差或复杂请求变弱。

**实现方式**：
- **规则路由**：按长度、关键词、是否含代码块判断；
- **小模型分类**：用一个小模型判断复杂度（额外一次调用，但很便宜）；
- **级联（Cascade）**：先小模型回答，置信度低时再升级到大模型。

## 缓存策略

| 类型 | 说明 | 命中率 | 风险 |
| --- | --- | --- | --- |
| 精确缓存 | 相同输入直接返回 | 低 | 无 |
| 语义缓存 | 相似问题复用答案（向量相似度阈值） | 中 | 阈值不当会答错 |
| Prompt 缓存 | 复用相同前缀的 KV | 高 | 无（不影响正确性） |

**语义缓存的坑**：知识更新后必须失效；相似但问法不同的问题可能答案不同
（如"如何退款"vs"如何退货"）。建议用于 FAQ 类稳定问题。

## 成本监控

必须按以下维度打点：

- 每请求：输入/输出 token、模型、是否命中缓存；
- 每用户/每功能：日成本、调用次数；
- 整体：日成本、成本/请求、缓存命中率。

**告警**：日成本突增、单请求 token 异常（可能是上下文泄漏或死循环）。

## 自建 vs API 的决策

| 场景 | 建议 |
| --- | --- |
| 请求量小（< 百万 token/天） | 用 API（省运维） |
| 量大且稳定 | 自建（成本可降 3~10 倍） |
| 数据敏感不能出内网 | 自建 |
| 需要最新最强模型 | 用 API |
| 需要定制微调 | 自建或私有部署 |

**盈亏平衡点**：粗略估算，当日 token 量达到数百万级别时，
自建（一张 4090/A100 的日成本）往往比 API 更便宜。

<CostAttribution />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
p_in, p_out = 2.0, 8.0          # $/M tokens（中模型示例价）
sys_prompt, hist, out = 1000, 800, 400
N = 1_000_000
cost = (sys_prompt+hist)*N/1e6*p_in + out*N/1e6*p_out
print(f"未优化月成本 ≈ \${cost:,.0f}（系统提示占输入 {(sys_prompt)/(sys_prompt+hist):.0%}）")
cached = (sys_prompt*0.1 + hist)*N/1e6*p_in + out*N/1e6*p_out
print(f"前缀缓存(命中按 10%)+精简提示(200 tok): ≈ \${(200+hist)*N/1e6*p_in*1.0 + out*N/1e6*p_out:,.0f}")
# 路由：70% 简单请求走小模型
simple = 0.7
small = (0.2, 0.6)
cost_routed = simple*N*((200+hist)*small[0]/1e6 + out*small[1]/1e6) + (1-simple)*N*((200+hist)*p_in/1e6 + out*p_out/1e6)
print(f"路由后 ≈ \${cost_routed:,.0f}（降 {(1-cost_routed/cost):.0%}）")\`\`\`

预期输出（实测）：未优化月成本 ≈ $6,800（系统提示占输入 56%）；精简提示+前缀缓存（10% 费率）→ ≈$5,200；70% 流量路由到小模型 → ≈$1,868（降 73%）。

**常见错误**：系统提示 1000 token 在百万请求里烧掉 10 亿 token（能 200 字说清就别写 1000）；可变内容放在前缀导致缓存永不命中；路由阈值拍脑袋，错误路由让复杂请求质量崩塌且无监控。

### 常见误区

1. **『缓存命中质量会变差』**——前缀缓存是确定性复用计算，输出与不缓存完全一致；\\n2. **『路由省的钱不值风险』**——加置信度级联（小模型不确定再升级）可把风险压到可接受；\\n3. **『成本只看模型单价』**——吞吐、利用率、重试率与上下文长度同样进入账单。

### 知识关联

- **向前**：c3 的吞吐决定自建 GPU 成本公式；
- **向后**：llm-b2 的模型路由模式是本章的 Agent 版；
- **平行**：quant-live 的费用精算与本章的 token 精算共享『单位成本×量』思维。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 成本式 | 输入×单价 + 输出×单价（输出贵 3~5x）|
| 输入侧 | 精简系统提示 / 前缀缓存（≈10% 费率）/ 裁剪上下文 |
| 输出侧 | max_tokens、格式约束、结构化输出 |
| 路由 | 规则/小模型分类/级联，成本降 50~80% |
| 纪律 | 逐请求记录 token 与成本，按路由归因 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Hu et al. (2021) arXiv:2106.09685《LoRA》、Dettmers et al. (2023) arXiv:2305.14314《QLoRA》、Kwon et al. (2023)《vLLM/PagedAttention》与 TensorRT-LLM 文档相应章节）
`,
        tips: [
          {
            kind: 'leak',
            text: 'Prompt Caching 对"长系统提示 + 固定前缀"的场景收益极大，命中时输入成本常降到 10% 以下。务必把可变内容放在提示末尾。',
          },
          {
            kind: 'performance',
            text: '模型路由是最大的降本杠杆，通常能砍掉 50%~80% 成本。前提是有可靠的复杂度判断与评估保障。',
          },
          {
            kind: 'pitfall',
            text: '语义缓存要设相似度阈值并及时失效。知识库更新后缓存不失效，会持续返回过期答案。',
          },
        ],
        demos: [
          {
            title: '成本估算与优化收益',
            lang: 'python',
            code: `PRICE = {
    "small":  (0.15, 0.6),
    "medium": (3.0, 15.0),
    "large":  (15.0, 75.0),
}

def cost(model, tin, tout):
    p = PRICE[model]
    return (tin * p[0] + tout * p[1]) / 1_000_000

N = 100_000
IN, OUT = 2000, 300

print("每天", N, "次请求，每次输入", IN, "输出", OUT, "token")

base = N * cost("large", IN, OUT)
print("全部用大模型:        ", round(base, 2), "/天")

# 优化 1: 路由 70% 到小模型
routed = int(N*0.7)*cost("small", IN, OUT) + int(N*0.3)*cost("large", IN, OUT)
print("+ 模型路由 (70% 小):", round(routed, 2), "/天   省", f"{1-routed/base:.0%}")

# 优化 2: Prompt Caching 命中一半输入
cached_in = IN * 0.5
cached_in_price = 0.1     # 缓存命中的输入按 10% 计费
routed2 = (int(N*0.7) * (cached_in*cached_in_price + IN*0.5*PRICE["small"][0] + OUT*PRICE["small"][1])/1e6
           + int(N*0.3) * (cached_in*cached_in_price + IN*0.5*PRICE["large"][0] + OUT*PRICE["large"][1])/1e6)
print("+ Prompt Caching:   ", round(routed2, 2), "/天   省", f"{1-routed2/base:.0%}")

# 优化 3: 裁剪上下文 2000 -> 800
routed3 = (int(N*0.7)*cost("small", 800, OUT) + int(N*0.3)*cost("large", 800, OUT))
print("+ 裁剪上下文到 800:  ", round(routed3, 2), "/天   省", f"{1-routed3/base:.0%}")

print("年化节省:", round((base-routed3)*365))`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b3-c4-e1',
        type: 'single',
        difficulty: 2,
        question: '通常 LLM API 中，输出 token 的价格相比输入 token 是？',
        options: [
          { value: 'A', text: '更便宜' },
          { value: 'B', text: '更贵（通常贵 3~5 倍）' },
          { value: 'C', text: '完全相同' },
          { value: 'D', text: '免费' },
        ],
        answer: 'B',
        explanation: '输出需要逐个自回归生成，无法并行，因此单价显著更高。这决定了"控制输出长度"是重要的降本手段。',
        tags: ['成本'],
      },
      {
        id: 'llm-b3-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: 'Prompt Caching 要求前缀完全一致才能命中，因此应把可变内容放在提示的末尾。',
        answer: true,
        explanation: '缓存基于前缀匹配。若把可变内容（如用户问题）放在前面，后续所有请求的前缀都不同，缓存完全失效。',
        tags: ['Prompt Caching'],
      },
      {
        id: 'llm-b3-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: '降低 LLM 应用成本的可行手段有？（多选）',
        options: [
          { value: 'A', text: '模型路由，简单请求用小模型' },
          { value: 'B', text: 'Prompt Caching 复用固定前缀' },
          { value: 'C', text: '裁剪 RAG 检索结果，减少输入 token' },
          { value: 'D', text: '把 max_tokens 调大让模型充分思考' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 会增加输出 token（最贵的那部分），反而提高成本。A/B/C 分别从模型选择、缓存、输入裁剪三个角度降本。',
        tags: ['成本优化'],
      },
      {
        id: 'llm-b3-c4-e4',
        type: 'fill',
        difficulty: 3,
        question: '用一个小模型或规则先回答，置信度低时再升级到大模型，这种降低成本的方式叫___（级联/路由）。',
        blanks: [['级联', 'cascade', 'Cascade']],
        explanation: '级联（Cascade）的思路是"大多数简单请求用小模型就能解决"，只有少数难题才升级。相比纯路由，它能自适应难度而不是靠预设规则。',
        tags: ['级联'],
      },
      {
        id: 'llm-b3-c4-e5',
        type: 'code',
        difficulty: 2,
        question: '实现成本计算 `calc_cost(input_tokens, output_tokens, price_in, price_out)`：\n\n`price_in`/`price_out` 是每百万 token 的价格（美元），返回总成本（保留 6 位小数）。',
        starterCode: `def calc_cost(input_tokens, output_tokens, price_in, price_out):
    return ___


calc_cost(1000, 500, 3.0, 15.0)
`,
        setupCode: '',
        expectedOutput: '0.0105',
        tests: `assert abs(calc_cost(1000, 500, 3.0, 15.0) - 0.0105) < 1e-9, f"应为 0.0105，实际 {calc_cost(1000,500,3.0,15.0)}"
assert abs(calc_cost(0, 0, 3.0, 15.0)) < 1e-12, "零 token 应零成本"
assert calc_cost(1_000_000, 0, 3.0, 15.0) == 3.0, "100 万输入 token 应正好等于单价"
assert calc_cost(0, 1_000_000, 3.0, 15.0) == 15.0, "100 万输出 token 应等于输出单价"
`,
        answer: `def calc_cost(input_tokens, output_tokens, price_in, price_out):
    return round((input_tokens * price_in + output_tokens * price_out) / 1_000_000, 6)


calc_cost(1000, 500, 3.0, 15.0)`,
        explanation:
          '```python\nreturn round((input_tokens * price_in + output_tokens * price_out) / 1_000_000, 6)\n```\n\n除以 1,000,000 是因为价格按"每百万 token"计。这是所有成本分析的基础公式。',
        tags: ['编程', '成本'],
      },
      {
        id: 'llm-b3-c4-e6',
        type: 'code',
        difficulty: 4,
        question: '实现模型路由的成本对比 `compare_routing(requests, prices, routing)`：\n\n- `requests`: `[(in_tokens, out_tokens)]`\n- `prices`: `{\'small\': (pin, pout), \'large\': (pin, pout)}`\n- `routing`: `{\'small\': [...索引...], \'large\': [...索引...]}` 或 `None`（全用 large）\n\n返回 `(all_large_cost, routed_cost, saved_ratio)`，saved_ratio 保留 4 位小数。',
        starterCode: `def compare_routing(requests, prices, routing=None):
    def cost(model, tin, tout):
        p = prices[model]
        return (tin * p[0] + tout * p[1]) / 1_000_000

    all_large = sum(cost("large", tin, tout) for tin, tout in requests)
    if not routing:
        return all_large, all_large, 0.0
    routed = 0.0
    ___
    return all_large, routed, round(saved, 4)


compare_routing(
    [(2000, 300), (1000, 200)],
    {"small": (0.15, 0.6), "large": (15.0, 75.0)},
    {"small": [0], "large": [1]},
)
`,
        setupCode: '',
        expectedOutput: 'saved_ratio 约 0.6305',
        tests: `reqs = [(2000, 300), (1000, 200)]
prices = {"small": (0.15, 0.6), "large": (15.0, 75.0)}
routing = {"small": [0], "large": [1]}
base, routed, saved = compare_routing(reqs, prices, routing)
assert routed < base, "路由后成本应更低"
assert 0 < saved < 1, f"saved_ratio 应在 (0,1)，实际 {saved}"
assert abs(saved - 0.6305) < 1e-3, f"应省约 63%（第二个请求仍走大模型），实际 {saved}"

# 无路由时两者相等
b2, r2, s2 = compare_routing(reqs, prices, None)
assert abs(b2 - r2) < 1e-12 and s2 == 0.0, "无路由时不应节省"

# 空请求除零保护
b3, r3, s3 = compare_routing([], prices, {"small": [], "large": []})
assert s3 == 0.0, f"空请求应返回 0，实际 {s3}"
`,
        answer: `def compare_routing(requests, prices, routing=None):
    def cost(model, tin, tout):
        p = prices[model]
        return (tin * p[0] + tout * p[1]) / 1_000_000

    all_large = sum(cost("large", tin, tout) for tin, tout in requests)
    if not routing:
        return all_large, all_large, 0.0
    routed = 0.0
    for model, idxs in routing.items():
        for i in idxs:
            tin, tout = requests[i]
            routed += cost(model, tin, tout)
    saved = (all_large - routed) / all_large if all_large else 0.0
    return all_large, routed, round(saved, 4)


compare_routing(
    [(2000, 300), (1000, 200)],
    {"small": (0.15, 0.6), "large": (15.0, 75.0)},
    {"small": [0], "large": [1]},
)`,
        explanation:
          '```python\nrouted = 0.0\nfor model, idxs in routing.items():\n    for i in idxs:\n        tin, tout = requests[i]\n        routed += cost(model, tin, tout)\nsaved = (all_large - routed) / all_large if all_large else 0.0\nreturn all_large, routed, round(saved, 4)\n```\n\n**注意两点**：① 按 routing 指定的模型逐个累加，而不是简单按比例；② `all_large == 0` 时除零要保护。\n\n这个函数就是评估"模型路由能省多少钱"的标准工具。',
        tags: ['编程', '成本优化'],
      },
      {
        id: 'llm-b3-c4-e7',
        type: 'single',
        difficulty: 3,
        question: '语义缓存（Semantic Cache）的最大风险是？',
        options: [
          { value: 'A', text: '缓存命中率太低' },
          { value: 'B', text: '知识更新后缓存未失效，返回过期或错误答案' },
          { value: 'C', text: '占用显存太大' },
          { value: 'D', text: '无法计算相似度' },
        ],
        answer: 'B',
        explanation: '相似问题未必有相同答案（"如何退款"vs"如何退货"），且知识变更后缓存不失效会持续返回旧答案。必须设合理阈值 + 及时失效机制。',
        tags: ['缓存'],
      },
      {
        id: 'llm-b3-c4-e8',
        type: 'judge',
        difficulty: 3,
        question: '当日 token 使用量很大且稳定时，自建推理通常比调用 API 更经济。',
        answer: true,
        explanation: '自建按 GPU 小时计费，与请求量无关（只要不超载）。量足够大时，摊薄后的单位 token 成本远低于 API 价格，通常有 3~10 倍差距。',
        tags: ['自建 vs API'],
      },
      {
        id: 'llm-b3-c4-e9',
        type: 'open',
        difficulty: 4,
        question: '某 LLM 应用月成本 $50,000，其中 70% 来自输入 token（平均每次请求 8000 token，主要是系统提示 + RAG 检索结果）。请给出一份完整的降本方案，按预期收益排序，并说明每项的风险与验证方式。',
        referenceAnswer: `**成本结构诊断**

- 输入 token 占 70%，说明瓶颈在**上下文长度**而非输出；
- 8000 token 中大概率是：系统提示（可能 1000~2000）+ RAG 检索结果（4000~5000）+ 对话历史。

**降本方案（按预期收益排序）**

**① Prompt Caching（预计省 25%~35% 输入成本）**

- 把系统提示、固定的指令模板放在最前面，确保前缀完全一致；
- 命中缓存的输入 token 按 10% 或更低价格计费。
- 风险：几乎无（不影响回答正确性）。
- 验证：监控缓存命中率与输入 token 计费结构。

**② 裁剪 RAG 检索结果（预计省 20%~30%）**

- 从 Top-10 降到 Top-3~5，配合 Cross-Encoder 重排保证召回质量；
- 长文档块先摘要再放入。
- 风险：可能丢失关键信息 → 用评估集（忠实度 + 答案正确率）验证不退化。
- 验证：对比改动前后 RAGAS 指标。

**③ 模型路由（预计省 30%~50% 总成本）**

- 规则 + 小模型分类，把简单请求（FAQ、分类、抽取）路由到小模型；
- 复杂请求（多步推理、代码、长文档分析）才用大模型。
- 风险：误判导致质量下降 → 抽样人工评估 + 线上点踩率监控。
- 验证：分层看不同请求类型的满意度与成本。

**④ 精简系统提示（预计省 5%~10%）**

- 把 2000 token 的系统提示压缩到 500，去掉重复的示例与冗余说明。
- 风险：可能丢失关键约束 → A/B 测试输出质量。
- 验证：对比指令遵循率。

**⑤ 对话历史压缩（若有多轮，预计省 10%）**

- 滑动窗口 + 滚动摘要，只保留最近 3~5 轮 + 早期摘要。
- 风险：可能丢失早期上下文 → 用多轮对话测试集验证。

**⑥ 输出侧优化（输出占 30%，可省其中 20%）**

- 设置 max_tokens、要求简洁输出、结构化 JSON 替代长文本。
- 风险：可能截断必要内容 → 监控 finish_reason 中的 length 比例。

**实施顺序与验证**

1. 先做**零风险**的 ①②（Prompt Caching + 裁剪检索），
   用评估集确认质量不退化；
2. 再做 ③ 模型路由，先在 10% 流量上灰度，对比满意度；
3. 最后做 ④⑤⑥ 的深度优化。

**预期总效果**：组合起来可降 55%~70%，即月成本从 $50,000 降到 $15,000~$22,000。

**持续机制**：建立成本看板（按功能/用户/模型维度），
设置日成本告警，定期做 badcase 回流与提示优化。`,
        rubric: [
          { point: '正确诊断：输入 token 占比高说明瓶颈在上下文长度', score: 1 },
          { point: 'Prompt Caching + 裁剪检索（零风险优先）', score: 2 },
          { point: '模型路由及其收益与风险', score: 2 },
          { point: '每项措施都给出风险与验证方式（评估集/A-B）', score: 2 },
          { point: '给出实施顺序与预期总收益区间', score: 1 },
        ],
        keywords: ['Prompt Caching', '裁剪检索', '模型路由', '评估集', '灰度', '成本看板'],
        explanation: '这是成本优化的综合实战题。答题关键是"按风险从低到高排序 + 每项都要有验证手段"，而不是罗列所有手段。',
        tags: ['成本优化', '系统设计'],
      },
    ],
  },
];
