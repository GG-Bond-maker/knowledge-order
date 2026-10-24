# -*- coding: utf-8 -*-
"""batch34 p1：llm-a1 第 1 章「token 与分词」4 节章主题包升级（TS 源 llm-a1.ts）。
用法：python batch34_llm_a1_p1.py verify  -> 跑章代码看输出（expected 未填时）
     python batch34_llm_a1_p1.py         -> 打补丁
"""
from _batch34_lib import Lib, build_md, finish
import sys

lib = Lib("llm-a1", [
    "src/content/chapters/llm-a1.ts",
    "src/content/chapters/llm-a1-extra.ts",
    "src/content/chapters/llm-a1-extra2.ts",
])

C1 = "llm-a1-c1"
REF = "本课程整理（可参见 Sennrich et al., 2016, arXiv:1508.07909 与 Hugging Face Tokenizers 文档相应章节）"

THEME = dict(
name="c1 token 与分词：文本到数字的桥梁",
why=("模型的一切能力都始于「读」——但 Transformer 的全部计算是矩阵乘法与逐元素运算，"
     "输入必须是数字。因此所有世界知识都要先被压缩成一条整数 ID 序列：怎么切（分词粒度）、"
     "怎么编号（词表）、切不出的怎么办（OOV）、一段文本值多少钱（token 成本），这四个工程决定"
     "全部发生在模型第一层之前。中文在英文系 tokenizer 上可能多花一倍 token，上下文、账单、"
     "延迟全部翻倍——分词不是预处理细节，而是贯穿成本与能力的第一性约束。"),
intuition=("把文本想成一堵乐高墙，tokenizer 是一本「拆砖手册」：常见整砖（高频整词）保留完整，"
           "稀有形状拆成小砖（子词）再拼装。小砖库（词表）加拆装规则可以砌出任何墙——再怪的"
           "新句子也能拼出来，OOV 问题就此消失。编号（ID）只是砖的货号；embedding 查表是按货号"
           "取出这块砖的「材质卡」（稠密向量）；而中文砖常被切成两三块，同样的墙要用更多货号——"
           "这就是 token 成本差异的来源。"),
code='''import numpy as np
from collections import Counter

# ---- 1. 迷你 BPE 训练：反复合并语料中最高频的相邻符号对 ----
corpus = ["low", "lower", "lowest", "newer", "newest", "wide", "wider", "widest"]
words = [list(w) + ["</w>"] for w in corpus]
pairs = Counter()
for w in words:
    for a, b in zip(w, w[1:]):
        pairs[(a, b)] += 1
merges = []
for _ in range(5):
    (a, b), n = pairs.most_common(1)[0]
    merges.append(a + b)
    print(f"merge #{len(merges)}: {a!r}+{b!r} -> {a+b!r} (频次 {n})")
    nxt, pairs = [], Counter()
    for w in words:
        i, w2 = 0, []
        while i < len(w):
            if i < len(w) - 1 and w[i] == a and w[i + 1] == b:
                w2.append(a + b); i += 2
            else:
                w2.append(w[i]); i += 1
        nxt.append(w2)
        for x, y in zip(w2, w2[1:]):
            pairs[(x, y)] += 1
    words, nxt = nxt, None

# ---- 2. 编码：按合并表贪心还原 ----
def encode(word):
    toks = list(word) + ["</w>"]
    for m in merges:
        i = 0
        while i < len(toks) - 1:
            if toks[i] + toks[i + 1] == m:
                toks[i:i + 2] = [m]
            else:
                i += 1
    return toks

for w in ("lowest", "newest"):
    print("encode", w, "->", encode(w))

# ---- 3. 词表与向量：ID 查表得到稠密向量 ----
V, d = 12, 4
rng = np.random.default_rng(0)
E = rng.normal(0, 1, (V, d))
ids = np.array([3, 0, 7])
print("embedding 查表形状:", E[ids].shape, "= one-hot 乘法:", np.allclose(E[ids], np.eye(V)[ids] @ E))

# ---- 4. 中英文 token 成本（经验值）与预算 ----
en_tok, zh_tok_en, zh_tok_zh = 1300, 1300, 620   # 1000 英文词 / 1000 中文字
print(f"英文 1000 词 ≈ {en_tok} tok；中文 1000 字@英文系 ≈ {zh_tok_en} tok，@中文优化 ≈ {zh_tok_zh} tok")
print(f"同内容中文成本差 ≈ {zh_tok_en / zh_tok_zh:.1f}x；4k 上下文 ≈ {int(4000 * 1000 / zh_tok_en)} 中文字（英文系）"[:80])
price = 0.002 / 1000  # $/tok 示例价
print(f"成本模型: 100 万 tok 训练语料 ≈ ${1_000_000 * price:.2f}")''',
expected=("BPE 合并序列：'w'+'e'→'we'(频次4)、'l'+'o'→'lo'(3)、'r'+'</w>'→'r</w>'(3)、's'+'t'→'st'(3)、'st'+'</w>'→'st</w>'(3)；"
          "encode lowest → ['lo','we','st</w>']，newest → ['n','e','we','st</w>']（子词既压缩又无 OOV）；"
          "embedding 查表形状 (3,4) 且与 one-hot 乘法 allclose=True；"
          "英文 1000 词≈1300 tok，中文 1000 字@英文系≈1300 tok、@中文优化≈620 tok（成本差 2.1x）；"
          "4k 上下文≈3076 中文字（英文系）；100 万 tok 语料按 $0.002/1k ≈ $2.00。"),
cerr=("编码时逐符号扫描却不做最长匹配，把 'lowest' 切成 l-o-w-e-s-t 而不是 lowest；"
      "按字符数而不是 token 数估上下文，中文场景预算直接差一倍以上；"
      "微调时新增特殊 token 却不改 embedding 矩阵行数，旧权重加载后 ID 错位全乱。"),
miscon=("1. **token 等于单词**——主流是子词：'unbelievable' 会被拆成 un/believ/able 几块，token 是词表里的条目不是语言学词；\\n"
        "2. **词表越大越好**——词表大 embedding 参数与 softmax 计算暴涨，低频 token 学不充分，主流在 3 万～25 万权衡；\\n"
        "3. **分词只影响预处理**——它决定序列长度（算力）、OOV（能力边界）、多语言成本（账单），是模型设计的一部分。"),
connection=("- **向前**：ID 序列进入 c3 嵌入层查表变成向量，本章的「货号」在 c3-l1 变成「材质卡」；\n"
            "- **向后**：c10 加载权重必须用配套 tokenizer，c11 生成循环的输出 ID 也要 decode 回文本；\n"
            "- **平行**：llm-a3 的 tokenizer 工程与 RAG 按 token 切分实践，是本章成本观的落地。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 桥梁 | 文本 → 分词 → 整数 ID → embedding 向量，模型只看见数字 |\n"
         "| 主流算法 | byte-level BPE（GPT/LLaMA）、WordPiece（BERT）、SentencePiece/Unigram（T5） |\n"
         "| 粒度权衡 | 字符级无 OOV 但序列长，词级短但 OOV 多，子词级兼顾 |\n"
         "| 中英文成本 | 同内容中文在英文系 tokenizer 上可达 2 倍 token |\n"
         "| 预算纪律 | 按 token 计量、按目标模型 tokenizer 计算、换模型重算 |"),
)

GOALS = {
"llm-a1-c1-l1": ("1. 解释模型为什么「看不见」文字：所有计算是矩阵运算，输入必须是整数 ID；\n"
                 "2. 对比字符级/词级/子词级三种分词粒度的词表、序列长度与 OOV 权衡，并复述 BPE 的合并过程；\n"
                 "3. 区分 byte-level BPE、WordPiece、SentencePiece 三条路线的关键差异（字节兜底/似然合并/无预分词）。"),
"llm-a1-c1-l2": ("1. 说明 one-hot 表示的两大缺陷（维数=词表大小、任意两个词向量正交即无相似度）；\n"
                 "2. 对比 Word2Vec（用上下文预测学表示）与 GloVe（直接分解共现矩阵）的建模范式；\n"
                 "3. 区分静态词向量与上下文向量两种 embedding 在工程中的不同用途。"),
"llm-a1-c1-l3": ("1. 说明 embedding 查表就是矩阵按行取值，与 one-hot 乘法数学等价但 O(1)；\n"
                 "2. 解释输入 embedding 为什么要乘 sqrt(d_model)：抵消方差、与位置编码量级匹配；\n"
                 "3. 识别特殊 token 预留与「len=字符数」长度 bug 两类工程陷阱。"),
"llm-a1-c1-l4": ("1. 复述 OOV 的来源（词表封闭性）与词表大小是覆盖率/参数量/算力的权衡结果；\n"
                 "2. 用 token 数（而非字符数）做上下文预算，并写出成本 ≈ token 数 × 单价的估算式；\n"
                 "3. 为长文档场景设计窗口管理策略：按 token 截断、分段映射、成本分级。"),
}
PREREQS = {
"llm-a1-c1-l1": "- 本课程第一节，无课内前置；\n- 知道矩阵乘法的输入必须是数字即可。",
"llm-a1-c1-l2": "- 「从文本到 token」（l1）：token ID 的概念；\n- 向量内积/余弦相似度衡量「相似」的直觉。",
"llm-a1-c1-l3": "- 「Embedding：从 one-hot 到稠密词向量」（l2）的稠密表示概念；\n- Python 列表按下标取值的经验。",
"llm-a1-c1-l4": "- 「从文本到 token」（l1）的子词词表；\n- 「Embedding 查表」（l3）的特殊 token 预留。",
}

CODE = THEME["code"]
WHY, INTU = THEME["why"], THEME["intuition"]
CERR, MISCON, CONN, SUMM = THEME["cerr"], THEME["miscon"], THEME["connection"], THEME["summary"]

MD = {}
for lid in GOALS:
    MD[lid] = build_md(lib.orig_content(lid), GOALS[lid], PREREQS[lid],
                       WHY, INTU, CODE, THEME["expected"], CERR, MISCON, CONN, SUMM, REF)

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    lib.verify_codes({C1: THEME}, GOALS)
elif not THEME["expected"]:
    lib.verify_codes({C1: THEME}, GOALS)
else:
    for lid in ("llm-a1-c1-l1", "llm-a1-c1-l2", "llm-a1-c1-l3", "llm-a1-c1-l4"):
        lib.patch_lesson(lid, MD[lid])
    finish(lib)
