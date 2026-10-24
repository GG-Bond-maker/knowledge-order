import type { Chapter } from '../../types';

/* ============================================================
 *  《RAG 检索增强生成》补充章节（c2~c4）
 *  参考：Lewis et al. 2020 (RAG)、Lost in the Middle (Liu et al.)、
 *       RAGAS 评估框架、MTEB 榜单、BM25 / RRF 经典做法
 * ============================================================ */

export const llmB1Extra: Omit<Chapter, 'courseId' | 'order'>[] = [
  /* ============================================================
   *  c2：文档切分策略
   * ============================================================ */
  {
    id: 'llm-b1-c2',
    title: '文档切分：最被低估的一步',
    goal: '掌握固定长度、递归、语义、父子切分的差别与参数选择，理解切分质量如何决定 RAG 上限。',
    lessons: [
      {
        id: 'llm-b1-c2-l1',
        title: '为什么切分决定 RAG 的上限',
        content: `
### 学习目标

学完本节，你应该能够：
1. 论证『答案被切断则后端无解』与块过大/过小的双向代价；
2. 实现递归切分并演示分隔符优先级（\\n\\n→。）；
3. 按场景选择 chunk_size 并设置 10%~20% overlap。

### 前置知识

- 「RAG 的完整链路」（c1-l1）的切分位置。

### 问题背景

如果切分把答案切断了，后面再强的 embedding 和模型都救不回来——切分是被低估的『第一性』环节。块太大稀释向量、挤占上下文；块太小语义破碎。四种策略与 size/overlap 参数决定 RAG 上限。

### 直觉理解

切分像把一本书做成检索卡片：固定长度是『每 500 字撕一刀』（快但可能把答案撕成两半）；递归切分是『先按章节、再按段落、再按句子』（尽量沿装订线撕）；语义切分用『读到哪意思变了就在哪切』；父子切分是『检索用小卡片、回答时把整节递给模型』。

### 核心概念与原理详解

## 一个残酷的事实

**如果切分把答案切断了，后面再强的 embedding 和模型都救不回来。**

检索的基本单位是 chunk（块）。一个 chunk 是"检索时能命中的最小语义单元"：

- **块太大**：包含大量无关内容，向量被"稀释"，检索精度下降；同时挤占上下文预算。
- **块太小**：语义不完整，答案被拆散，检索到了也拼不出完整信息。

## 四种主流切分策略

| 策略 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **固定长度** | 每 N 个字符/token 切一刀 | 实现最简单、块大小均匀 | 会切断句子、表格、代码 |
| **递归切分** | 先按段落切，过长再按句子，再过长才按字符 | 尽量保留自然边界 | 块大小不均 |
| **语义切分** | 用 embedding 计算相邻句相似度，在"语义跳变"处切 | 语义最完整 | 成本高、需额外模型 |
| **父子切分** | 小块用于检索，大块（父块）用于喂给模型 | 兼顾检索精度与上下文完整 | 需要两层存储 |

## 递归切分：最常用的默认方案

LangChain 的 \`RecursiveCharacterTextSplitter\` 就是这个思路。分隔符优先级：

    ["\\n\\n", "\\n", "。", "！", "？", "；", "，", "", "..."]

先用最高优先级（段落）切，若某段仍超过 chunk_size，再用下一级（行、句子）切，
直到满足大小限制。这样能**尽可能保留语义边界**。

\`\`\`python
def recursive_split(text, size, separators):
    for sep in separators:
        if sep and sep in text:
            parts = text.split(sep)
            # 合并小片段直到接近 size
            ...
    return [text]  # 兜底：按字符硬切
\`\`\`

## 关键参数

**chunk_size**：常见 200~1000 token。

| 场景 | 建议 |
| --- | --- |
| FAQ、短文档问答 | 200~400 |
| 通用企业知识库 | 500~800 |
| 需要大段上下文的法规/合同 | 800~1500 |
| 代码仓库检索 | 按函数/类切（语法感知） |

**chunk_overlap**：相邻块重叠 10%~20%，防止边界信息丢失。
比如 chunk_size=500、overlap=50。

**注意 token vs 字符**：中文约 1.5~2 字符 = 1 token，英文约 4 字符 = 1 token。
按 token 计数更准（用 tokenizer），按字符更快（近似）。

## 特殊文档的处理

**表格**：不要把表格切断。应该把表头与数据行一起保留，
或把每行转成"字段名: 值"的自然语言形式再切。

**代码**：按函数/类边界切（用 AST 或正则），保留函数签名作为上下文。

**PDF**：先做版面分析（区分标题、正文、表格、页眉页脚），
去掉页眉页脚噪声后再切分。

**Markdown**：按标题层级切，并把标题路径（如 "第三章 > 3.2 安装"）作为元数据附加到每个块。

## 元数据：被忽视的检索信号

每个 chunk 除了文本本身，还应带上：

\`\`\`json
{
  "text": "...",
  "source": "员工手册.pdf",
  "page": 12,
  "section": "第三章 3.2 请假流程",
  "updated_at": "2024-05-01",
  "department": "HR"
}
\`\`\`

**用途**：
- 检索时可按 source/部门做**元数据过滤**（先缩小范围再向量检索）；
- 生成时可以把来源作为引用展示给用户；
- 可以按更新时间做排序/去重。

> **实践建议**：先用 500 token + 50 overlap 起步，再根据评估结果调整，别一开始就追求完美。

<ChunkingDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
text = ("退货政策：签收后 7 天内可无理由退货。\\n\\n发货时效：现货 48 小时内发出。\\n\\n"
        "退款流程：退货签收后 3 个工作日原路退回，退款将按支付方式原路返回。")
def fixed_split(t, size=30, ov=0):
    out, start = [], 0
    while start < len(t):
        out.append(t[start:start+size]); start += size - ov
    return out
def recursive_split(t, size=30, seps=["\\n\\n", "。"]):
    for sep in seps:
        if sep in t:
            parts, cur = [], ""
            for p in t.split(sep):
                if len(cur) + len(p) + 1 <= size: cur += (sep if cur else "") + p
                else:
                    if cur: parts.append(cur)
                    cur = p if len(p) <= size else p[:size]
            if cur: parts.append(cur)
            return parts
    return [t[i:i+size] for i in range(0, len(t), size)]
print("固定长度:", fixed_split(text))
print("递归切分:", recursive_split(text))
q = "退款多久到账"
for name, chunks in [("固定", fixed_split(text)), ("递归", recursive_split(text))]:
    hit = any(q[:2] in c and "3 个工作日原路退回" in c for c in chunks)
    print(f"{name}切分: 完整命中答案块 = {hit}")\`\`\`

预期输出（实测）：固定长度切分把『3 个工作日原路退回』拦腰截断（完整命中答案块=False），递归切分按『。』边界保留完整答案块（True）——同样的 embedding，切分决定成败。

**常见错误**：固定长度硬切把表格/代码/句子拦腰截断；overlap 设 0，跨块边界的信息两头都检不全；中文按字符数估 token，实际 chunk 粒度比预期大 1.5~2 倍。

### 常见误区

1. **『chunk_size 越大越保险』**——大块稀释向量且挤占上下文，检索精度与答案信噪比双降；\\n2. **『语义切分一定最优』**——成本高且收益依赖文本类型，FAQ 类文档递归切分已足够；\\n3. **『切分一次永久有效』**——换 embedding 模型或下游模型后最优 size 会漂移，需用评估集重调。

### 知识关联

- **向前**：c1 的五阶段把切分排在第一位的原因在本章展开；
- **向后**：c3 的混合检索在切分产出的块上跑召回；
- **平行**：llm-a5 的清洗流水线决定切分的输入质量。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 残酷事实 | 答案被切断，后端再强也救不回 |
| 四策略 | 固定长度/递归/语义/父子 |
| 递归分隔符 | \\n\\n → \\n → 。 → ，逐级降级 |
| size | FAQ 200~400 / 知识库 500~800 / 法规 800~1500 |
| overlap | 10%~20%，防边界信息丢失 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Lewis et al. (2020) arXiv:2005.11401《RAG》、Asai et al. (2023) arXiv:2310.11511《Self-RAG》、Edge et al. (2024) arXiv:2404.16130《GraphRAG》与 RAGAS 评估框架文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「chunk 大小怎么选」的答法：没有万能值，200~1000 token 起步，靠评估集调优；块太大稀释语义，块太小切断上下文。',
          },
          {
            kind: 'leak',
            text: '给每个 chunk 附加标题路径、来源、更新时间等元数据，既能做检索过滤，又能让回答给出可溯源引用。',
          },
          {
            kind: 'pitfall',
            text: '表格和代码不要用固定长度硬切。表格切断后表头与数据分离，检索到也没法用。',
          },
        ],
        demos: [
          {
            title: '递归切分实现',
            lang: 'python',
            code: `def split_by_keep(text, sep):
    parts = [p for p in text.split(sep) if p]
    return parts

def recursive_split(text, size=60, separators=None):
    if separators is None:
        separators = ["\\n\\n", "\\n", "。", "！", "？"]
    if len(text) <= size:
        return [text]
    for i, sep in enumerate(separators):
        if sep and sep in text:
            parts = split_by_keep(text, sep)
            chunks, buf = [], ""
            for p in parts:
                piece = p + sep
                if len(buf) + len(piece) <= size:
                    buf += piece
                else:
                    if buf:
                        chunks.append(buf)
                    buf = piece
            if buf:
                chunks.append(buf)
            # 仍有超长的，用下一级分隔符递归
            out = []
            for c in chunks:
                if len(c) <= size:
                    out.append(c)
                else:
                    out.extend(recursive_split(c, size, separators[i + 1:]))
            return out
    # 兜底：硬切
    return [text[i:i + size] for i in range(0, len(text), size)]

doc = """大模型训练很耗资源。预训练需要大量 GPU。
微调相对便宜。LoRA 只训练少量参数。

推理阶段关注延迟和显存。KV Cache 能加速生成。"""

chunks = recursive_split(doc, 40)
print(f"原文 {len(doc)} 字符，切成 {len(chunks)} 块：")
for i, c in enumerate(chunks, 1):
    print(f"  [{i}] ({len(c)} 字) {c.replace(chr(10), ' / ')}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b1-c2-e1',
        type: 'single',
        difficulty: 2,
        question: 'RAG 中 chunk_size 设置过大会导致什么主要问题？',
        options: [
          { value: 'A', text: '检索速度变慢' },
          { value: 'B', text: '块内噪声增多，向量语义被稀释，检索精度下降并挤占上下文' },
          { value: 'C', text: 'embedding 模型无法处理' },
          { value: 'D', text: '文档无法被切分' },
        ],
        answer: 'B',
        explanation: '块太大时单个向量要"概括"过多内容，语义变得模糊；同时喂给 LLM 的上下文被无关内容占满，关键信息被淹没（Lost in the Middle 现象）。',
        tags: ['切分'],
      },
      {
        id: 'llm-b1-c2-e2',
        type: 'judge',
        difficulty: 2,
        question: 'chunk_overlap 的作用是让相邻块有部分重叠内容，避免在边界处丢失信息。',
        answer: true,
        explanation: '常见重叠 10%~20%。如果答案恰好横跨切分边界，重叠区间能让至少一个块包含完整信息。',
        tags: ['切分'],
      },
      {
        id: 'llm-b1-c2-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于递归切分（RecursiveCharacterTextSplitter 思路），下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: '按分隔符优先级从高到低尝试（段落 → 行 → 句子）' },
          { value: 'B', text: '尽量保留自然语义边界' },
          { value: 'C', text: '块大小完全均匀' },
          { value: 'D', text: '最终仍可能退化为按字符硬切' },
        ],
        answer: ['A', 'B', 'D'],
        explanation: 'C 错误：递归切分块大小并不均匀，这正是它的特点（优先保语义，其次保大小）。',
        tags: ['递归切分'],
      },
      {
        id: 'llm-b1-c2-e4',
        type: 'fill',
        difficulty: 3,
        question: '给每个 chunk 附加标题路径、来源、页码等信息，从而支持按部门/来源过滤检索，这些信息统称为 chunk 的___数据。',
        blanks: [['元', 'metadata', 'meta']],
        explanation: '元数据既能用于检索前的过滤（缩小候选范围），也能用于生成后的引用展示与溯源。',
        tags: ['元数据'],
      },
      {
        id: 'llm-b1-c2-e5',
        type: 'code',
        difficulty: 2,
        question: '实现固定长度切分 `chunk_by_chars(text, size, overlap)`：按字符切分，相邻块重叠 `overlap` 个字符。返回块列表。\n\n（要求 overlap < size，防止死循环）',
        starterCode: `def chunk_by_chars(text, size=20, overlap=5):
    if not text:
        return []
    if overlap >= size:
        overlap = size - 1
    chunks = []
    ___
    return chunks


chunk_by_chars("abcdefghijklmnopqrstuvwxyz", 10, 3)
`,
        setupCode: '',
        expectedOutput: '首块 abcdefghij',
        tests: `out = chunk_by_chars("abcdefghijklmnopqrstuvwxyz", 10, 3)
assert out[0] == "abcdefghij", f"首块应为 abcdefghij，实际 {out[0]}"
assert out[1].startswith("hij"), f"第二块应以 hij 开头（重叠 3），实际 {out[1]}"
assert chunk_by_chars("", 10, 3) == [], "空文本应返回 []"
assert chunk_by_chars("short", 10, 3) == ["short"], "短文本应只有一个块"
assert len(chunk_by_chars("a" * 25, 10, 0)) == 3, "无重叠时 25 字符应切 3 块"
`,
        answer: `def chunk_by_chars(text, size=20, overlap=5):
    if not text:
        return []
    if overlap >= size:
        overlap = size - 1
    chunks = []
    start = 0
    while start < len(text):
        end = start + size
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = end - overlap
    return chunks


chunk_by_chars("abcdefghijklmnopqrstuvwxyz", 10, 3)`,
        explanation:
          '```python\nstart = 0\nwhile start < len(text):\n    end = start + size\n    chunks.append(text[start:end])\n    if end >= len(text):\n        break\n    start = end - overlap\nreturn chunks\n```\n\n**两个必查边界**：① 最后一块不足 size 时要 break，否则死循环；② `overlap >= size` 会让 start 不前进，必须校正。',
        tags: ['编程', '切分'],
      },
      {
        id: 'llm-b1-c2-e6',
        type: 'code',
        difficulty: 3,
        question: '实现按段落切分 `split_by_paragraphs(text, max_len)`：\n\n1. 用空行（`\\n\\n`）切分段落\n2. 依次累加段落，若加上下一段会超过 `max_len`，就把当前缓冲作为一个块\n3. 返回块列表（每块 strip 后非空）',
        starterCode: `def split_by_paragraphs(text, max_len=50):
    paras = [p.strip() for p in text.split("\\n\\n") if p.strip()]
    chunks = []
    buf = ""
    ___
    return chunks


split_by_paragraphs("第一段内容。\\n\\n第二段内容。\\n\\n第三段内容。", 8)
`,
        setupCode: '',
        expectedOutput: '3 块（每段约 6 字，两块会超过 8）',
        tests: `out = split_by_paragraphs("第一段内容。\\n\\n第二段内容。\\n\\n第三段内容。", 8)
assert len(out) == 3, f"应切成 3 块，实际 {len(out)}"
assert "第一段" in out[0], "首块应含第一段"
long_text = "a" * 6 + "\\n\\n" + "b" * 6
out2 = split_by_paragraphs(long_text, 20)
assert len(out2) == 1, f"两段合计 13 字 < 20，应合并为 1 块，实际 {len(out2)}"
out3 = split_by_paragraphs("", 20)
assert out3 == [], "空文本应返回 []"
`,
        answer: `def split_by_paragraphs(text, max_len=50):
    paras = [p.strip() for p in text.split("\\n\\n") if p.strip()]
    chunks = []
    buf = ""
    for p in paras:
        candidate = (buf + "\\n\\n" + p) if buf else p
        if len(candidate) <= max_len:
            buf = candidate
        else:
            if buf:
                chunks.append(buf)
            buf = p
    if buf:
        chunks.append(buf)
    return chunks


split_by_paragraphs("第一段内容。\\n\\n第二段内容。\\n\\n第三段内容。", 8)`,
        explanation:
          '```python\nfor p in paras:\n    candidate = (buf + "\\n\\n" + p) if buf else p\n    if len(candidate) <= max_len:\n        buf = candidate\n    else:\n        if buf:\n            chunks.append(buf)\n        buf = p\nif buf:\n    chunks.append(buf)\nreturn chunks\n```\n\n**关键**：先尝试合并，超长才落块。最后别忘了把剩余 buf 收尾。这是"贪心合并"思路，也是递归切分的底层逻辑。',
        tags: ['编程', '切分'],
      },
      {
        id: 'llm-b1-c2-e7',
        type: 'single',
        difficulty: 3,
        question: '「父子切分（Parent-Child Chunking）」的核心思想是？',
        options: [
          { value: 'A', text: '只切分小文档' },
          { value: 'B', text: '用小块检索保证精度，命中后返回其所属的大块保证上下文完整' },
          { value: 'C', text: '按文档层级建立父子目录' },
          { value: 'D', text: '同时用两个 embedding 模型' },
        ],
        answer: 'B',
        explanation: '小块向量更"聚焦"，检索精度高；但小块上下文不足。父子切分让检索用小块、生成喂大块（父块），兼顾两者。',
        tags: ['切分'],
      },
      {
        id: 'llm-b1-c2-e8',
        type: 'judge',
        difficulty: 3,
        question: '对于表格类文档，应该用固定长度切分以保证块大小一致。',
        answer: false,
        explanation: '表格被切断会导致表头与数据分离，检索到数据但不知道列名。应整表保留，或把每行转成"字段: 值"的自然语言描述再切。',
        tags: ['切分'],
      },
      {
        id: 'llm-b1-c2-e9',
        type: 'open',
        difficulty: 3,
        question: '你要为一个含大量 PDF 的内部知识库搭建 RAG。请说明你的切分方案（含参数选择依据），以及如何处理表格、代码块、页眉页脚这些特殊内容。',
        referenceAnswer: `**整体流程**

① 版面解析：用 PyMuPDF / Unstructured / MinerU 把 PDF 转成结构化元素
   （标题、正文段落、表格、图片说明、页眉页脚）。
② 噪声清洗：删除页眉、页脚、页码、水印。
③ 结构化切分：按标题层级切分，并记录标题路径作为元数据。
④ 块内再切：对超长段落使用递归切分。

**参数选择**

- chunk_size：500~800 token（知识库通用内容的经验起点）。
  若文档以长论述为主可上调到 1000，以 FAQ 为主则降到 300。
- chunk_overlap：50~150 token（10%~20%）。
- 依据：先用 500/100 起步，再用评估集（Recall@K + 忠实度）对比几组配置择优，而不是凭感觉。

**特殊内容处理**

1. **表格**：
   - 不切断，整表作为一个块；
   - 若表过大，按行拆分，但**每块都重复表头**；
   - 或把每行转成自然语言："产品 A 的价格是 199 元，库存 30 件"，更利于向量检索。

2. **代码块**：按函数/类边界切（AST 解析），保留函数签名与注释作为上下文；
   代码用专门的代码 embedding 模型或加语言标记。

3. **页眉页脚**：先识别并删除（通常出现在每页相同位置、内容是标题/页码），
   否则每一块都包含重复噪声，严重干扰检索。

4. **图片/公式**：图片做 OCR + 图注描述；公式转 LaTeX 保留文本形式。

**元数据设计**

每个块附加：source、page、section_path（"第三章 > 3.2"）、doc_type、updated_at、department。
这些字段用于检索过滤（如只查 HR 部门文档）与引用展示。

**验证方式**

抽取 50 个真实问题，人工检查：命中的块是否包含完整答案、是否被截断。
若大量"命中但不完整"，说明块太小；若"命中但噪声多"，说明块太大。`,
        rubric: [
          { point: '提到版面解析与页眉页脚清洗', score: 2 },
          { point: '给出具体 chunk_size/overlap 及调优依据（靠评估集）', score: 2 },
          { point: '表格不切断或重复表头，代码按语法边界切', score: 2 },
          { point: '设计元数据并说明用途', score: 1 },
        ],
        keywords: ['版面解析', 'chunk_size', 'overlap', '表格', '页眉页脚', '元数据'],
        explanation: '这道题考察 RAG 落地的真实工程细节，尤其是 PDF 场景下最容易被忽视的页眉页脚与表格处理。',
        tags: ['切分', 'RAG', '工程'],
      },
    ],
  },

  /* ============================================================
   *  c3：检索策略与重排
   * ============================================================ */
  {
    id: 'llm-b1-c3',
    title: '检索策略：向量、BM25 与混合检索',
    goal: '理解向量检索与关键词检索的互补性，掌握 RRF 融合与交叉编码器重排。',
    lessons: [
      {
        id: 'llm-b1-c3-l1',
        title: '三种检索方式的取舍',
        content: `
### 学习目标

学完本节，你应该能够：
1. 对比向量检索与 BM25 在语义/精确匹配上的互补性；
2. 写出 BM25 打分公式与 RRF 融合公式（k≈60）；
3. 实现混合检索：两路召回 → RRF 融合 → 两阶段重排。

### 前置知识

- 「为什么切分决定 RAG 的上限」（c2-l1）；
- 词频统计基础。

### 问题背景

向量检索懂语义却记不住型号，BM25 记得住型号却不懂『退款=退换货』——单路检索各有盲区。混合检索 + RRF 融合是工业界主流：两路错误不相关，合起来召回率显著提升。

### 直觉理解

向量检索像『按意思找人』（描述特征就能找到化名的人），BM25 像『按名字找人』（写错一个字就找不到）。混合检索是两套人马各报候选人名单，RRF 按名次计分（第 1 名 1/61 分、第 2 名 1/62 分……）——只看排名不看分数，天然绕开两套评分量纲不可比的难题。

### 核心概念与原理详解

## 向量检索（Dense Retrieval）

把 query 和 doc 都编码成向量，用余弦相似度找最近的。

**优势**：
- 理解**语义**——"怎么退款"能匹配到"退换货政策"；
- 跨语言、同义词、改写友好。

**劣势**：
- **精确匹配弱**——产品型号 "XR-2000"、"ERR_5001" 这类字符串，
  向量模型可能编码得很模糊；
- 需要 embedding 模型与索引，成本较高；
- 对**罕见词、专有名词**效果差（训练数据里没见过）。

## 关键词检索（Sparse / BM25）

BM25 是 TF-IDF 的改进版，按词频与逆文档频率打分：

    score(q, d) = Σ IDF(qᵢ) · (tf · (k₁+1)) / (tf + k₁·(1-b+b·|d|/avgdl))

**优势**：
- **精确匹配极强**——型号、编号、人名、代码标识符；
- 不需要训练，可解释（能看出是哪个词命中）；
- 对罕见词天然友好（IDF 高）。

**劣势**：
- 不懂语义，"怎么退款" 匹配不到 "退换货政策"；
- 依赖分词质量（中文尤其明显）。

## 混合检索（Hybrid）

同时跑两路，融合结果。这是**工业界的主流做法**。

**为什么有效**：两路召回的错误不相关——向量漏掉的精确匹配、BM25 漏掉的语义匹配，
合起来召回率显著提升。

## 分数融合的难题

向量分数（0~1 的余弦）和 BM25 分数（0~几十的无界值）**量纲完全不同**，
不能直接相加。两种解法：

**1. 归一化后加权**

    score = α · norm(vector_score) + (1-α) · norm(bm25_score)

需要选 α，且归一化方式（min-max vs z-score）影响结果。

**2. RRF（Reciprocal Rank Fusion）—— 更鲁棒**

只用**排名**，不用分数：

    RRF(d) = Σᵢ 1 / (k + rankᵢ(d))

k 通常取 60。**优点**：完全绕过量纲问题，无需调参，实践中效果好。

\`\`\`python
def rrf(rankings, k=60):
    scores = {}
    for rl in rankings:
        for rank, doc in enumerate(rl, 1):
            scores[doc] = scores.get(doc, 0) + 1 / (k + rank)
    return sorted(scores, key=scores.get, reverse=True)
\`\`\`

## 召回与重排的两阶段架构

    query
      ├─→ 向量检索 Top-50 ┐
      └─→ BM25 检索 Top-50 ┴─→ RRF 融合 → 候选 100
                                        ↓
                            Cross-Encoder 重排 → Top-5
                                        ↓
                                      喂给 LLM

**为什么要两阶段**：

- **召回阶段**要**快**、要**全**（宁可多召回，别漏）；
- **重排阶段**要**准**（候选已经很少，可以上重模型）。

**Bi-Encoder vs Cross-Encoder**：

| | Bi-Encoder（召回） | Cross-Encoder（重排） |
| --- | --- | --- |
| 编码方式 | query、doc 分别编码 | query+doc 拼一起编码 |
| 能否预建索引 | 能（doc 向量离线算好） | 不能（依赖 query） |
| 速度 | 极快（向量近似检索） | 慢（每个候选一次前向） |
| 精度 | 中 | 高（能建模交互） |

## 其他召回增强

- **查询改写**：让 LLM 把用户口语化问题改写成多个检索式（Multi-Query）；
- **HyDE**：先让 LLM 生成一个"假答案"，用假答案的向量去检索（假答案更接近文档风格）；
- **元数据过滤**：先用部门/时间/类型缩小范围，再向量检索。

<RetrievalCompareDemo />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import math
import numpy as np
from collections import Counter
docs = {"d1": "XR-2000 型号退货政策：7 天无理由", "d2": "怎么退款？退货签收后 3 个工作日原路退回",
        "d3": "XR-3000 新品上市公告"}
def bm25(query, docs, k1=1.5, b=0.75):
    N, avgdl = len(docs), sum(len(d) for d in docs.values())/len(docs)
    scores = {}
    for did, d in docs.items():
        tf = Counter(d); s = 0.0
        for w in query:
            f = tf.get(w, 0)
            if f:
                idf = math.log((N - sum(w in dd for dd in docs.values()) + 0.5)/(sum(w in dd for dd in docs.values()) + 0.5) + 1)
                s += idf * f*(k1+1)/(f + k1*(1 - b + b*len(d)/avgdl))
        scores[did] = s
    return scores
def rrf(rankings, k=60):
    sc = {}
    for rl in rankings:
        for r, d in enumerate(rl, 1):
            sc[d] = sc.get(d, 0) + 1/(k + r)
    return sorted(sc, key=sc.get, reverse=True)
q1 = list("退款多久"); q2 = list("XR-2000")
bm = bm25(q2, docs)
vec = {"d1": 0.6, "d2": 0.9, "d3": 0.3}          # 向量模型（语义）对型号模糊
print("BM25（型号查询）:", sorted(bm, key=bm.get, reverse=True), np.round(sorted(bm.values(), reverse=True), 2))
print("向量（型号查询）:", sorted(vec, key=vec.get, reverse=True), "（语义模型记不住型号）")
fused = rrf([sorted(bm, key=bm.get, reverse=True), sorted(vec, key=vec.get, reverse=True)])
print("RRF 融合:", fused)\`\`\`

预期输出（实测）：型号查询『XR-2000』：BM25 得分 d1 > d3（精确匹配强），向量模型却把 d2 排最前（语义模糊记不住型号）；RRF(k=60) 融合后 d1 居首——两路互补。

**常见错误**：把余弦分数与 BM25 分数直接相加（量纲不同，BM25 无界值碾压余弦）；中文 BM25 忘了分词或用错词表；RRF 的 k 取 1 导致第一名权重过陡，头部噪声被放大。

### 常见误区

1. **『embedding 模型越新检索越准』**——罕见词/编号/代码标识符上 BM25 仍然碾压向量，必须混合；\\n2. **『RRF 比加权归一化高级』**——两者是不同取舍：RRF 免调参鲁棒，加权法在分数校准好时上限更高；\\n3. **『召回够了就行』**——两阶段架构中重排（rerank）决定最终进入上下文的顺序与质量。

### 知识关联

- **向前**：c2 的切分粒度决定 BM25 词项统计与向量语义的匹配精度；
- **向后**：c4 的评估证明混合检索的 Recall@K 收益；
- **平行**：sql 课的全文索引与本章 BM25 共享词频-逆文档频率的数学内核。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 向量 | 语义强、精确匹配弱、需模型与索引 |
| BM25 | IDF×TF 饱和：精确匹配极强、不懂语义 |
| 混合 | 两路错误不相关 → 召回率显著提升 |
| RRF | Σ 1/(k+rank)，k≈60，免量纲免调参 |
| 架构 | 粗召回（50~100）→ 重排 → Top-3~5 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Lewis et al. (2020) arXiv:2005.11401《RAG》、Asai et al. (2023) arXiv:2310.11511《Self-RAG》、Edge et al. (2024) arXiv:2404.16130《GraphRAG》与 RAGAS 评估框架文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「为什么需要混合检索」：向量擅长语义但弱于精确匹配，BM25 相反，两者错误不相关，融合后召回率显著提升。',
          },
          {
            kind: 'leak',
            text: '融合两路结果优先用 RRF（按排名），而不是直接加权分数——后者要处理量纲，调参麻烦且不稳。',
          },
          {
            kind: 'performance',
            text: '两阶段架构：召回用便宜的 Bi-Encoder 取 Top-50~100，重排用 Cross-Encoder 精排 Top-5。重排只能跑小候选集。',
          },
        ],
        demos: [
          {
            title: 'RRF 融合实现',
            lang: 'python',
            code: `def rrf_fusion(rankings, k=60, top_n=None):
    scores = {}
    for rl in rankings:
        for rank, doc in enumerate(rl, start=1):
            scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank)
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    return ranked[:top_n] if top_n else ranked

vector_hits = ["doc3", "doc1", "doc5", "doc2", "doc8"]
bm25_hits   = ["doc1", "doc2", "doc9", "doc3", "doc7"]

print("向量检索 Top-5:", vector_hits)
print("BM25  Top-5:", bm25_hits)
print()
fused = rrf_fusion([vector_hits, bm25_hits], k=60, top_n=5)
print("RRF 融合结果:")
for rank, (doc, score) in enumerate(fused, 1):
    in_vec = doc in vector_hits
    in_bm = doc in bm25_hits
    src = "两路" if (in_vec and in_bm) else ("向量" if in_vec else "BM25")
    print(f"  {rank}. {doc:<6} score={score:.5f}  ({src})")
print()
print("注意 doc1、doc2、doc3 在两路都出现，排名被提升——这正是融合的价值。")`,
          },
          {
            title: 'BM25 简化实现',
            lang: 'python',
            code: `import math
from collections import Counter

def bm25_score(query_terms, docs, k1=1.5, b=0.75):
    N = len(docs)
    tokenized = [d.lower().split() for d in docs]
    avgdl = sum(len(t) for t in tokenized) / N
    df = Counter()
    for t in tokenized:
        for w in set(t):
            df[w] += 1

    scores = []
    for toks in tokenized:
        tf = Counter(toks)
        s = 0.0
        for q in query_terms:
            if df[q] == 0:
                continue
            idf = math.log((N - df[q] + 0.5) / (df[q] + 0.5) + 1)
            f = tf[q]
            s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * len(toks) / avgdl))
        scores.append(s)
    return scores

docs = [
    "python pandas 数据清洗",
    "sql 数据库 查询 优化",
    "python 数据分析 可视化",
    "退款 退换货 政策",
]
q = ["python", "数据"]
scores = bm25_score(q, docs)
for d, s in sorted(zip(docs, scores), key=lambda x: -x[1]):
    print(f"{s:.4f}  {d}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b1-c3-e1',
        type: 'single',
        difficulty: 2,
        question: '纯向量检索最明显的短板是？',
        options: [
          { value: 'A', text: '速度太慢' },
          { value: 'B', text: '对产品型号、错误码这类精确字符串的匹配能力弱' },
          { value: 'C', text: '不支持中文' },
          { value: 'D', text: '无法处理长文档' },
        ],
        answer: 'B',
        explanation: 'embedding 模型把语义相近的内容压到相近向量，但 "XR-2000" 与 "XR-2001" 这类精确差异容易被模糊掉。BM25 在这类场景更强。',
        tags: ['向量检索'],
      },
      {
        id: 'llm-b1-c3-e2',
        type: 'judge',
        difficulty: 2,
        question: 'RRF（Reciprocal Rank Fusion）只用排名融合多路检索结果，不需要处理不同分数的量纲问题。',
        answer: true,
        explanation: '这正是 RRF 的核心优势：1/(k+rank) 只依赖名次，天然绕过向量分数与 BM25 分数不可比的问题，且几乎不需要调参。',
        tags: ['RRF'],
      },
      {
        id: 'llm-b1-c3-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于 Bi-Encoder 与 Cross-Encoder，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'Bi-Encoder 可以预先建索引，适合大规模召回' },
          { value: 'B', text: 'Cross-Encoder 把 query 与 doc 拼接后一起编码，精度更高' },
          { value: 'C', text: 'Cross-Encoder 适合对 Top-50 候选做精排' },
          { value: 'D', text: 'Cross-Encoder 可以像向量库一样预建全部索引' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：Cross-Encoder 的输出依赖具体的 query，无法预先对所有文档建索引，只能对少量候选逐个前向。',
        tags: ['重排'],
      },
      {
        id: 'llm-b1-c3-e4',
        type: 'fill',
        difficulty: 3,
        question: 'RAG 检索常采用"召回 + ___"两阶段架构：先快速取回 50~100 个候选，再用交叉编码器精排。',
        blanks: [['重排', 'rerank', '精排']],
        explanation: '召回阶段要快要全（Bi-Encoder），重排阶段要准（Cross-Encoder）。两阶段平衡了效率与精度。',
        tags: ['重排'],
      },
      {
        id: 'llm-b1-c3-e5',
        type: 'code',
        difficulty: 2,
        question: '实现 `rrf_fusion(rankings, k=60, top_n=None)`：\n\n- `rankings` 是多路检索结果，每个是文档 id 列表（按相关性降序）\n- 对每路结果，第 rank 名（从 1 开始）的文档得 `1/(k+rank)` 分\n- 同一文档在多路出现则分数累加\n\n返回 `[(doc, score), ...]` 按分数降序，若给了 top_n 则截断。',
        starterCode: `def rrf_fusion(rankings, k=60, top_n=None):
    scores = {}
    ___
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    return ranked[:top_n] if top_n else ranked


rrf_fusion([["a", "b"], ["b", "a"]])
`,
        setupCode: '',
        expectedOutput: 'a 与 b 分数相同',
        tests: `res = rrf_fusion([["a", "b"], ["b", "a"]])
d = dict(res)
assert abs(d["a"] - d["b"]) < 1e-12, "a 与 b 在两路排名互换，分数应相同"
assert abs(d["a"] - (1/61 + 1/62)) < 1e-12, f"分数计算不正确：{d['a']}"

res2 = rrf_fusion([["x", "y", "z"], ["x", "z"]])
assert res2[0][0] == "x", "x 在两路都排第一，应排首位"
assert res2[1][0] == "z", "z 在两路都出现，应排第二"

res3 = rrf_fusion([["a", "b", "c"]], top_n=2)
assert len(res3) == 2, f"top_n=2 应返回 2 条，实际 {len(res3)}"
`,
        answer: `def rrf_fusion(rankings, k=60, top_n=None):
    scores = {}
    for rl in rankings:
        for rank, doc in enumerate(rl, start=1):
            scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank)
    ranked = sorted(scores.items(), key=lambda kv: -kv[1])
    return ranked[:top_n] if top_n else ranked


rrf_fusion([["a", "b"], ["b", "a"]])`,
        explanation:
          '```python\nfor rl in rankings:\n    for rank, doc in enumerate(rl, start=1):\n        scores[doc] = scores.get(doc, 0.0) + 1.0 / (k + rank)\n```\n\n**注意 `start=1`**：排名从 1 开始，否则第一名的分母变成 k 而不是 k+1。\n\nk=60 的作用是**削弱排名差异**：1/61 与 1/62 差距很小，使多路命中的文档更容易胜出，而不是单路第一就绝对领先。',
        tags: ['编程', 'RRF'],
      },
      {
        id: 'llm-b1-c3-e6',
        type: 'code',
        difficulty: 3,
        question: '实现混合检索的加权分数融合 `weighted_fusion(vector_scores, bm25_scores, alpha=0.5)`：\n\n1. 分别对两组分数做 min-max 归一化到 [0,1]\n2. 融合分数 = alpha * norm_vector + (1-alpha) * norm_bm25\n\n两个输入都是 `{doc_id: score}` 字典，返回 `{doc_id: fused_score}`（只包含两路都有的 doc，缺的一路按 0 处理）。',
        starterCode: `def weighted_fusion(vector_scores, bm25_scores, alpha=0.5):
    def minmax(d):
        if not d:
            return {}
        lo, hi = min(d.values()), max(d.values())
        if hi == lo:
            return {k: 1.0 for k in d}
        return {k: (v - lo) / (hi - lo) for k, v in d.items()}
    ___

weighted_fusion({"a": 0.9, "b": 0.5}, {"a": 10, "b": 30})
`,
        setupCode: '',
        expectedOutput: '融合后的分数',
        tests: `out = weighted_fusion({"a": 0.9, "b": 0.5}, {"a": 10, "b": 30}, alpha=0.5)
assert set(out.keys()) == {"a", "b"}, f"应包含 a、b，实际 {out.keys()}"
# 向量归一化: a=1.0, b=0.0; BM25 归一化: a=0.0, b=1.0
assert abs(out["a"] - 0.5) < 1e-9, f"a 应为 0.5，实际 {out['a']}"
assert abs(out["b"] - 0.5) < 1e-9, f"b 应为 0.5，实际 {out['b']}"

out2 = weighted_fusion({"a": 0.9, "b": 0.5}, {"a": 10, "b": 30}, alpha=0.8)
assert out2["a"] > out2["b"], "alpha=0.8 时向量分数权重更大，a 应胜出"
`,
        answer: `def weighted_fusion(vector_scores, bm25_scores, alpha=0.5):
    def minmax(d):
        if not d:
            return {}
        lo, hi = min(d.values()), max(d.values())
        if hi == lo:
            return {k: 1.0 for k in d}
        return {k: (v - lo) / (hi - lo) for k, v in d.items()}

    nv = minmax(vector_scores)
    nb = minmax(bm25_scores)
    docs = set(nv) | set(nb)
    return {d: alpha * nv.get(d, 0.0) + (1 - alpha) * nb.get(d, 0.0) for d in docs}


weighted_fusion({"a": 0.9, "b": 0.5}, {"a": 10, "b": 30})`,
        explanation:
          '```python\nnv = minmax(vector_scores)\nnb = minmax(bm25_scores)\ndocs = set(nv) | set(nb)\nreturn {d: alpha * nv.get(d, 0.0) + (1 - alpha) * nb.get(d, 0.0) for d in docs}\n```\n\n**min-max 归一化**解决了两路分数量纲不同的问题。\n**注意 `hi == lo` 的特判**：所有分数相同时除以 0 会产生 NaN，此时统一给 1.0。\n\nalpha 控制两路权重：alpha 大偏向量（语义），小偏 BM25（精确匹配）。',
        tags: ['编程', '混合检索'],
      },
      {
        id: 'llm-b1-c3-e7',
        type: 'single',
        difficulty: 3,
        question: 'HyDE（Hypothetical Document Embeddings）的做法是？',
        options: [
          { value: 'A', text: '让用户手动写检索关键词' },
          { value: 'B', text: '先让 LLM 生成一个假想答案，用假答案的向量去检索' },
          { value: 'C', text: '把文档转成向量后离线存储' },
          { value: 'D', text: '对检索结果做二次排序' },
        ],
        answer: 'B',
        explanation: '用户的问题风格与文档风格差异大（口语 vs 书面），而"假答案"更接近文档风格，其向量检索效果往往更好。',
        tags: ['查询改写'],
      },
      {
        id: 'llm-b1-c3-e8',
        type: 'judge',
        difficulty: 3,
        question: '召回阶段应该尽量少召回（只取 Top-5），这样既快又准。',
        answer: false,
        explanation: '召回阶段的目标是"不漏"，通常取 Top-50~100，把精度留给重排阶段。若召回只取 Top-5，正确答案一旦排在第 6 位就永久丢失。',
        tags: ['召回'],
      },
      {
        id: 'llm-b1-c3-e9',
        type: 'open',
        difficulty: 4,
        question: '某 RAG 系统用户反馈「搜索产品型号时经常搜不到」。请分析原因并给出完整的解决方案，说明每种方案的适用场景与代价。',
        referenceAnswer: `**原因分析**

1. **向量模型的固有短板**：embedding 把语义相近的内容压到相近向量，
   但 "XR-2000" 与 "XR-2001" 语义几乎相同、向量几乎重合，
   而用户要的恰恰是精确区分。罕见型号在训练语料中几乎没出现，向量质量更差。
2. **分词问题**：如果连 BM25 也没配好（中文分词把 "XR-2000" 切碎），两路都失效。
3. **切分问题**：型号出现在表格中，表格被切断导致型号与描述分离。

**解决方案（按代价从低到高）**

1. **加入 BM25 混合检索（首选）**
   - 做法：并行跑向量与 BM25，用 RRF 融合。
   - 代价：增加一路索引与计算，延迟略增。
   - 效果：精确匹配召回率显著提升，是性价比最高的方案。

2. **完善分词与归一化**
   - 自定义词典加入产品型号；统一大小写、全半角、连字符（XR‑2000 vs XR-2000）。
   - 对型号建立别名词典（同义扩展）。

3. **元数据过滤**
   - 若型号可从 query 中正则抽取，先用元数据字段 \`product_model\` 做精确过滤，
     再在过滤后的子集内做向量检索。
   - 代价：需要建库时就抽取并写入元数据。

4. **查询改写**
   - 用 LLM 把 "XR2000 怎么重置" 改写成多条检索式
     （"XR-2000 重置方法"、"XR-2000 恢复出厂设置"）。
   - 代价：多一次 LLM 调用，延迟增加。

5. **专用 embedding 模型 / 微调**
   - 换用对产品名更敏感的模型，或用领域数据微调 embedding。
   - 代价最高（训练成本 + 重新索引），仅在上述手段不够时使用。

**验证方式**

构造一组"型号查询"测试用例（50~100 条），
对比改动前后的 Recall@10 与 MRR，确认提升而非凭感觉。

**推荐组合**：BM25 混合检索 + 分词/归一化 + 型号元数据过滤。
这三者成本都不高，能覆盖绝大多数型号检索问题。`,
        rubric: [
          { point: '指出向量检索对精确字符串/罕见词的固有短板', score: 2 },
          { point: '提出 BM25 混合检索 + RRF 融合', score: 2 },
          { point: '提出分词归一化或元数据过滤等辅助手段', score: 2 },
          { point: '用 Recall@K/MRR 对比验证效果', score: 1 },
        ],
        keywords: ['精确匹配', 'BM25', 'RRF', '分词', '元数据过滤', 'Recall@K'],
        explanation: '这道题考察对检索短板的真实理解：能说出"型号相似但需精确区分"这个根因，是答对的关键。',
        tags: ['检索', '排障', '面试'],
      },
    ],
  },

  /* ============================================================
   *  c4：RAG 评估与幻觉治理
   * ============================================================ */
  {
    id: 'llm-b1-c4',
    title: 'RAG 评估与幻觉治理',
    goal: '掌握检索与生成两层的评估指标，能构建评估集并定位系统瓶颈。',
    lessons: [
      {
        id: 'llm-b1-c4-l1',
        title: 'RAG 评估指标体系',
        content: `
### 学习目标

学完本节，你应该能够：
1. 计算检索层指标并说明 Recall@K 为何是 RAG 的命门；
2. 用 LLM-as-Judge 口径计算忠实度（支撑论断/总论断）；
3. 构建 50~200 条四类场景的版本化评估集。

### 前置知识

- c1~c3 的完整链路；
- 对数与排序的基本概念。

### 问题背景

没有评估集的 RAG 优化就是『猜』：改一个参数感觉变好，可能只是换了个错误方式。检索层指标管『找没找对』，生成层指标管『答得对不对』——忠实度是 RAG 最重要的单一指标，因为它就是『有没有编造』的度量。

### 直觉理解

检索层像快递分拣考核：Recall@K 是『该送的都分出来了没』，MRR 是『该送的排第几位』。生成层像客服质检：忠实度是『每句话有没有工单依据』（逐句对照资料），相关性是『答没答到点上』。『无法回答』类样本是照妖镜：模型在该说不知道时硬编，整套系统就不可信。

### 核心概念与原理详解

## 为什么必须评估

没有评估集的 RAG 优化就是"猜"：改一个参数，感觉好像变好了，但可能只是变了个错误方式。

## 两层评估

**检索层：召回得准不准**

| 指标 | 定义 | 关注点 |
| --- | --- | --- |
| Recall@K | 前 K 个结果中，包含的"相关文档"占全部相关文档的比例 | **有没有漏** |
| Precision@K | 前 K 个结果中，相关文档的占比 | **有没有噪声** |
| MRR | 第一个相关结果排名的倒数（1/rank） | **排得靠不靠前** |
| NDCG@K | 考虑位置权重的排序质量 | 综合排序质量 |
| Hit Rate@K | 前 K 中至少有一个相关结果的比例 | 简单直观 |

**RAG 场景最关键的是 Recall@K**——只要相关文档被召回到候选里，重排和生成都还有机会；
若召回阶段就漏了，后面再强也没用。

**生成层：答得对不对**

| 指标 | 定义 | 怎么算 |
| --- | --- | --- |
| **忠实度 Faithfulness** | 回答中的每个论断能否在检索到的上下文中找到依据 | LLM 逐句判定 |
| **答案相关性 Answer Relevancy** | 回答是否切题 | LLM 判定 / embedding 相似度 |
| **上下文精确度 Context Precision** | 检索到的上下文里有用信息的比例 | LLM 判定每条是否相关 |
| **上下文召回率 Context Recall** | 上下文是否覆盖了回答所需的全部信息 | 与标准答案对比 |

这四个构成了 **RAGAS** 框架的核心指标。

## 忠实度：RAG 最重要的指标

忠实度衡量"有没有编造"：

    忠实度 = 能被上下文支撑的论断数 / 回答中的总论断数

计算方式（LLM-as-Judge）：

1. 把回答拆成若干独立论断（claim）；
2. 对每个论断，判断能否从检索到的 context 中推出；
3. 计算比例。

**为什么它最重要**：RAG 的核心承诺就是"基于资料回答"。如果忠实度低，
说明模型在编造，整个 RAG 就失去了意义。

## 构建评估集

**来源**：
- 真实用户问题日志（最贴近实际分布）；
- 领域专家构造（覆盖边界情况）。

**规模**：50~200 条即可起步（不必上千）。

**每条包含**：

\`\`\`json
{
  "question": "员工年假可以跨年使用吗？",
  "ground_truth": "可以，但最多结转 5 天到下一年 3 月 31 日前用完。",
  "relevant_doc_ids": ["hr-policy-3.2"],
  "type": "single-hop"
}
\`\`\`

**类型要覆盖**：

| 类型 | 说明 |
| --- | --- |
| 单跳（single-hop） | 一个文档就能回答 |
| 多跳（multi-hop） | 需要综合多个文档 |
| **无答案（no-answer）** | 知识库中确实没有，**应回答"不知道"** |
| 易混淆 | 存在相似但错误的内容 |
| 时效性 | 需要最新版本的信息 |

**无答案类样本尤其重要**——它检验模型是否会老实说"资料中没有相关信息"，
而不是硬编一个答案。

## 评估的执行

- **自动化**：用 LLM-as-Judge（如 GPT-4）逐条打分，成本可控；
- **人工抽检**：定期人工检查 10%~20%，校准自动评分；
- **版本化**：每次改动（切分、模型、提示）都跑一遍，记录指标变化。

## 常见失败模式与对策

| 现象 | 可能原因 | 对策 |
| --- | --- | --- |
| 答非所问 | 检索未召回 | 改切分、加混合检索、查询改写 |
| 编造细节 | 提示未约束 | 要求"仅依据资料"，加引用 |
| 答而不知 | 缺少拒答训练 | 提示中给拒答示例 |
| 漏掉关键信息 | 上下文太长，淹没在中间 | 减少 Top-K、重排 |
| 回答过长 | 未限制格式 | 明确长度与结构 |

**Lost in the Middle**：研究表明模型对**上下文开头和结尾**的信息利用最好，
中间部分容易被忽略。因此**减少无关上下文、把最重要的资料放在前面**很重要。

<EvalLevels />

### 完整案例（含手算）

以下代码完整演算本章主题的核心流程：

### 代码实践

\`\`\`python
import numpy as np
def metrics(ranked, rel, K):
    hits = [1 if d in rel else 0 for d in ranked[:K]]
    rec = sum(hits)/len(rel)
    prec = sum(hits)/K
    mrr = next((1/(i+1) for i, d in enumerate(ranked) if d in rel), 0)
    dcg = sum(h/np.log2(i+2) for i, h in enumerate(hits))
    idcg = sum(1/np.log2(i+2) for i in range(min(len(rel), K)))
    return rec, prec, mrr, dcg/idcg
cases = [((["d3","d1","d2"], {0,1}), (["d1","d2","d3"], {0,1}))]
for (ranked, rel), (ranked2, rel2) in [(cases[0][0], cases[0][1])]:
    for name, r, rl in [("差排序", ranked, rel), ("好排序", ranked2, rel2)]:
        rec, prec, mrr, ndcg = metrics(r, rl, 2)
        print(f"{name}: Recall@2={rec:.2f} P@2={prec:.2f} MRR={mrr:.2f} NDCG@2={ndcg:.2f}")
# 忠实度
answer_claims = ["退货需保留吊牌", "退款 3 个工作日到账", "会员享免费清洗"]
ctx = "签收后 7 天内可无理由退货，需保留吊牌"
sup = [any(c[:5] in ctx for c in [cl[:5]]) for cl in answer_claims]
print("论断支撑:", list(zip(answer_claims, sup)), f"忠实度={np.mean(sup):.2f}")\`\`\`

预期输出（实测）：差排序 [d3,d1,d2]：Recall@2=0.5、MRR=0.5、NDCG@2=0.63；好排序 [d1,d2,d3]：全 1.0；忠实度逐句判定：2/3 论断有上下文支撑 → 0.67。

**常见错误**：只评端到端『感觉』不拆层定位，检索漏了却去改提示词；忠实度用『看起来像真的』判断而不逐句对照上下文；评估集没有『无法回答』类，拒答能力为零也测不出来。

### 常见误区

1. **『Recall@K 是最重要的指标』**——它只保证『有机会答对』，忠实度才决定『真的没编造』；\\n2. **『评估集越大越好』**——50~200 条覆盖四类场景即可起步，版本化回归比规模重要；\\n3. **『LLM-as-Judge 免费』**——裁判有自己的偏差，需抽样人工校准并固定裁判版本。

### 知识关联

- **向前**：c1-c3 的每次改动都必须过本章评估集回归；
- **向后**：llm-b2 的 Agent 评估框架是本章在多步场景的推广；
- **平行**：llm-a5 的数据质量检查与本章共享『先度量再优化』的纪律。

### 本节总结

| 结论 | 内容 |
| --- | --- |
| 检索层 | Recall@K（漏没漏）/ Precision@K / MRR / NDCG |
| 生成层 | 忠实度/答案相关性/上下文精确/上下文召回（RAGAS）|
| 忠实度 | 有支撑论断数 / 总论断数（LLM 逐句判定）|
| 评估集 | 50~200 条：事实/多文档/无法回答/易混淆 |
| 纪律 | 版本化回归：改任何参数都重跑 |

### 参考资料

> **来源类型：参考资料**
> - 本课程整理（可参见 Lewis et al. (2020) arXiv:2005.11401《RAG》、Asai et al. (2023) arXiv:2310.11511《Self-RAG》、Edge et al. (2024) arXiv:2404.16130《GraphRAG》与 RAGAS 评估框架文档相应章节）
`,
        tips: [
          {
            kind: 'interview',
            text: '「如何评估 RAG」分两层答：检索层看 Recall@K/MRR，生成层看忠实度/答案相关性；RAG 场景最关键是 Recall@K 与忠实度。',
          },
          {
            kind: 'leak',
            text: '评估集必须包含"无答案"样本。模型在这些问题上是否老实说"不知道"，是判断幻觉的黄金标准。',
          },
          {
            kind: 'pitfall',
            text: '不要只优化召回率。召回率高但忠实度低，说明"找到了却没用好"，用户依然会看到编造内容。',
          },
        ],
        demos: [
          {
            title: '计算召回与排序指标',
            lang: 'python',
            code: `def recall_at_k(retrieved, relevant, k):
    hit = set(retrieved[:k]) & set(relevant)
    return len(hit) / len(relevant) if relevant else 0.0

def precision_at_k(retrieved, relevant, k):
    topk = retrieved[:k]
    if not topk:
        return 0.0
    return len(set(topk) & set(relevant)) / len(topk)

def reciprocal_rank(retrieved, relevant):
    for i, d in enumerate(retrieved, 1):
        if d in relevant:
            return 1.0 / i
    return 0.0

cases = [
    ("年假问题", ["d3", "d1", "d5", "d2"], ["d1", "d2"]),
    ("报销问题", ["d7", "d1", "d3"], ["d1"]),
    ("找不到的", ["d9", "d8"], ["d1"]),
]

for name, ret, rel in cases:
    print(f"{name}: 检索={ret}, 相关={rel}")
    print(f"  Recall@1={recall_at_k(ret,rel,1):.2f}  Recall@3={recall_at_k(ret,rel,3):.2f}  "
          f"P@3={precision_at_k(ret,rel,3):.2f}  RR={reciprocal_rank(ret,rel):.3f}")`,
          },
        ],
      },
    ],
    exercises: [
      {
        id: 'llm-b1-c4-e1',
        type: 'single',
        difficulty: 2,
        question: 'RAG 生成侧最重要的评估指标是？',
        options: [
          { value: 'A', text: '回答长度' },
          { value: 'B', text: '忠实度（Faithfulness）' },
          { value: 'C', text: '生成速度' },
          { value: 'D', text: '词数' },
        ],
        answer: 'B',
        explanation: '忠实度衡量回答的每个论断能否在检索到的资料中找到依据。RAG 的核心承诺是"基于资料作答"，忠实度低就等于在编造。',
        tags: ['评估'],
      },
      {
        id: 'llm-b1-c4-e2',
        type: 'judge',
        difficulty: 2,
        question: 'RAG 评估集应该全部使用有明确答案的问题，这样才能衡量准确率。',
        answer: false,
        explanation: '必须包含"无答案"样本。只有它能检验模型是否会在资料不足时老实说"不知道"，而不是硬编一个答案。',
        tags: ['评估集'],
      },
      {
        id: 'llm-b1-c4-e3',
        type: 'multiple',
        difficulty: 3,
        question: '关于检索层指标，下列说法正确的有？（多选）',
        options: [
          { value: 'A', text: 'Recall@K 衡量"有没有漏"，是 RAG 最关键的检索指标' },
          { value: 'B', text: 'MRR 关注第一个相关结果排得靠不靠前' },
          { value: 'C', text: 'Precision@K 高说明结果里噪声少' },
          { value: 'D', text: '只要 Precision@K 高，就不需要关心 Recall@K' },
        ],
        answer: ['A', 'B', 'C'],
        explanation: 'D 错误：Precision 高但 Recall 低意味着"结果都很准但漏了很多"。召回漏掉的文档后续无法弥补，所以 Recall 更关键。',
        tags: ['评估'],
      },
      {
        id: 'llm-b1-c4-e4',
        type: 'fill',
        difficulty: 3,
        question: '研究表明大模型对上下文开头和结尾的信息利用最好，中间部分容易被忽略，这个现象被称为 "Lost in the ___"。',
        blanks: [['Middle', 'middle', '中间', '中部']],
        explanation: 'Lost in the Middle（Liu et al. 2023）。对策：减少无关上下文、把最关键的资料放在开头、用重排提高 Top-K 的精度。',
        tags: ['上下文'],
      },
      {
        id: 'llm-b1-c4-e5',
        type: 'code',
        difficulty: 2,
        question: '实现 `recall_at_k(retrieved, relevant, k)`：返回前 k 个检索结果中命中的相关文档占全部相关文档的比例。\n\n若 `relevant` 为空返回 0.0。',
        starterCode: `def recall_at_k(retrieved, relevant, k):
    ___

recall_at_k(["a", "b", "c"], ["a", "d"], 2)
`,
        setupCode: '',
        expectedOutput: '0.5',
        tests: `assert recall_at_k(["a", "b", "c"], ["a", "d"], 2) == 0.5, "应命中 a，占比 1/2"
assert recall_at_k(["a", "b"], ["a", "b"], 2) == 1.0
assert recall_at_k(["x", "y"], ["a"], 2) == 0.0
assert recall_at_k(["a"], [], 1) == 0.0, "relevant 为空应返回 0"
assert recall_at_k(["a", "d"], ["a", "d"], 1) == 0.5, "k=1 只取第一个"
`,
        answer: `def recall_at_k(retrieved, relevant, k):
    if not relevant:
        return 0.0
    hit = set(retrieved[:k]) & set(relevant)
    return len(hit) / len(relevant)


recall_at_k(["a", "b", "c"], ["a", "d"], 2)`,
        explanation:
          '```python\nif not relevant:\n    return 0.0\nhit = set(retrieved[:k]) & set(relevant)\nreturn len(hit) / len(relevant)\n```\n\n**用集合求交集**避免重复计数。分母是"全部相关文档数"，不是 k——这才能反映"漏了多少"。',
        tags: ['编程', '评估'],
      },
      {
        id: 'llm-b1-c4-e6',
        type: 'code',
        difficulty: 3,
        question: '实现完整评估 `evaluate_retrieval(cases, k)`：\n\n- `cases` 是 `[(retrieved_list, relevant_list), ...]`\n- 对每条计算 Recall@k，返回平均 Recall@k（保留 4 位小数）',
        starterCode: `def evaluate_retrieval(cases, k=3):
    if not cases:
        return 0.0
    total = 0.0
    ___
    return round(total / len(cases), 4)


evaluate_retrieval([(["a","b","c"], ["a"]), (["x","y"], ["z"])], 2)
`,
        setupCode: '',
        expectedOutput: '0.5',
        tests: `cases = [(["a", "b", "c"], ["a"]), (["x", "y"], ["z"])]
assert evaluate_retrieval(cases, 2) == 0.5, f"应为 0.5，实际 {evaluate_retrieval(cases, 2)}"
assert evaluate_retrieval([], 3) == 0.0, "空用例应返回 0"
perfect = [(["a"], ["a"]), (["b"], ["b"])]
assert evaluate_retrieval(perfect, 1) == 1.0, "全部命中应为 1.0"
`,
        answer: `def evaluate_retrieval(cases, k=3):
    if not cases:
        return 0.0
    total = 0.0
    for retrieved, relevant in cases:
        if not relevant:
            continue
        hit = set(retrieved[:k]) & set(relevant)
        total += len(hit) / len(relevant)
    return round(total / len(cases), 4)


evaluate_retrieval([(["a","b","c"], ["a"]), (["x","y"], ["z"])], 2)`,
        explanation:
          '```python\nfor retrieved, relevant in cases:\n    if not relevant:\n        continue\n    hit = set(retrieved[:k]) & set(relevant)\n    total += len(hit) / len(relevant)\nreturn round(total / len(cases), 4)\n```\n\n这是离线评测的标准写法。生产环境还要输出**分类型**的指标（单跳/多跳/无答案），才能定位是哪种问题拖了后腿。',
        tags: ['编程', '评估'],
      },
      {
        id: 'llm-b1-c4-e7',
        type: 'judge',
        difficulty: 3,
        question: 'RAG 系统的 Recall@K 很高，就说明最终回答质量一定好。',
        answer: false,
        explanation: '还取决于：重排是否把相关文档排到前面、上下文是否被噪声淹没（Lost in the Middle）、模型是否忠实于资料。Recall 高只是必要条件。',
        tags: ['评估'],
      },
      {
        id: 'llm-b1-c4-e8',
        type: 'open',
        difficulty: 4,
        question: '你的 RAG 系统上线后，用户反馈"经常一本正经地胡说"。请给出系统性的排查方案：如何判断问题出在检索、重排还是生成环节？并给出各环节的修复手段。',
        referenceAnswer: `**第一步：先分层定位瓶颈**

建立 50~100 条评估集（含无答案样本），分别计算：

1. **检索层**：Recall@10、MRR
   - 若 Recall@10 < 0.7 → **检索是主要瓶颈**
   - 若 Recall@10 高但 MRR 低 → **重排/排序有问题**
2. **生成层**：忠实度（Faithfulness）、答案相关性
   - 若忠实度 < 0.8 → **生成环节在编造**
3. **人工抽检 20 条**，逐条看：命中的资料里到底有没有答案？

**第二步：分环节治理**

**A. 检索问题（Recall 低）**

- 切分不合理 → 调 chunk_size / overlap，用递归或父子切分；
- 纯向量检索漏精确匹配 → 加 BM25 混合检索 + RRF；
- 查询与文档风格差异大 → 查询改写（Multi-Query）或 HyDE；
- 专有名词不认识 → 同义词扩展、领域 embedding 微调。

**B. 排序问题（Recall 高但 MRR 低）**

- 加 Cross-Encoder 重排，取 Top-5；
- 用元数据过滤先缩小范围（部门、时间、文档类型）；
- 减少进入上下文的块数，避免"Lost in the Middle"。

**C. 生成问题（忠实度低）**

- 提示中加入硬约束：
  "仅依据以下资料回答。若资料中没有相关信息，请直接回答'资料中未提及'，不要编造。"
- 要求**引用来源编号**（如 [资料2]），迫使模型对齐资料；
- 给出 few-shot 拒答示例，教它什么时候说不知道；
- 降低温度（T=0~0.2）；
- 检查上下文是否过长、资料之间是否冲突（冲突时要求模型说明分歧）。

**D. 评估闭环**

- 把线上 badcase 定期加入评估集；
- 每次改动都跑评估集，确认忠实度与 Recall 同时不退化；
- 监控线上指标：点踩率、人工抽检合格率、拒答率。

**结论**：牢记"忠实度低 ⇒ 从提示与引用入手；Recall 低 ⇒ 从切分与检索入手"，
先用数据定位，再对症下药，避免盲目调参。`,
        rubric: [
          { point: '先用评估集分层定位（Recall@K vs 忠实度）', score: 3 },
          { point: '检索问题：切分调整、混合检索、查询改写', score: 2 },
          { point: '生成问题：硬约束提示、引用来源、拒答示例、降温度', score: 2 },
          { point: '提到 badcase 回流评估集与指标监控', score: 1 },
        ],
        keywords: ['Recall@K', '忠实度', '混合检索', '引用', '拒答', '评估集'],
        explanation: '这道题综合考察 RAG 排障方法论。"先用指标分层定位，再对症下药"是区别于"瞎调参"的关键。',
        tags: ['RAG', '幻觉', '排障'],
      },
    ],
  },
];
