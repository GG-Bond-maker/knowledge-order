# -*- coding: utf-8 -*-
"""batch35 p7：llm-b1/b3/b4/a4/a5 共 24 节章主题包升级（TS 源）。"""
from _batch34_lib import Lib, build_md, finish
import sys

LIBS = {
    "llm-b1": Lib("llm-b1", ["src/content/chapters/llm-b1.ts", "src/content/chapters/llm-b1-extra.ts", "src/content/chapters/llm-b1-extra2.ts"]),
    "llm-b3": Lib("llm-b3", ["src/content/chapters/llm-b3.ts", "src/content/chapters/llm-b3-extra.ts"]),
    "llm-b4": Lib("llm-b4", ["src/content/chapters/llm-b4a.ts", "src/content/chapters/llm-b4b.ts"]),
    "llm-a4": Lib("llm-a4", ["src/content/chapters/llm-a4.ts", "src/content/chapters/llm-a4-extra.ts"]),
    "llm-a5": Lib("llm-a5", ["src/content/chapters/llm-a5.ts", "src/content/chapters/llm-a5-extra.ts"]),
}
REFS = {
"llm-b1": "本课程整理（可参见 Lewis et al. (2020) arXiv:2005.11401《RAG》、Asai et al. (2023) arXiv:2310.11511《Self-RAG》、Edge et al. (2024) arXiv:2404.16130《GraphRAG》与 RAGAS 评估框架文档相应章节）",
"llm-b3": "本课程整理（可参见 Hu et al. (2021) arXiv:2106.09685《LoRA》、Dettmers et al. (2023) arXiv:2305.14314《QLoRA》、Kwon et al. (2023)《vLLM/PagedAttention》与 TensorRT-LLM 文档相应章节）",
"llm-b4": "本课程整理（可参见 Ouyang et al. (2022)《InstructGPT》、Rafailov et al. (2023) arXiv:2305.18290《DPO》、Shao et al. (2024)《GRPO》与 DeepSeek-R1 技术报告相应章节）",
"llm-a4": "本课程整理（可参见 Fedus et al. (2022)《Switch Transformer》、Jiang et al. (2024)《Mixtral》、DeepSeek-MoE/V3 技术报告相应章节）",
"llm-a5": "本课程整理（可参见 Penedo et al. (2023)《RefinedWeb》、Lee et al. (2021) C4 去重论文与 trafilatura 官方文档相应章节）",
}

T = {}; G = {}; P = {}; C = {}; EX = {}

# ═══════════ llm-b1 RAG ═══════════
T["llm-b1","c1"] = dict(
expected="""迷你 RAG：查询『7 天无理由退货怎么操作』检索 Top-2 = doc0(0.75)/doc3(0.60)，Recall@2=1.00、MRR=0.75；论断支撑：『7 天内可无理由退货』与『退款 3 个工作日原路退回』有依据、『客服全年无休』无依据 → 忠实度=0.67（暴露无出处论断）。""",
why=("大模型的知识冻结在训练时点、还会一本正经地胡说；企业私有知识更是模型从未见过的。RAG 用『检索外部知识库"
     "再生成』同时解决时效、幻觉与私有数据三个问题——但链条上任何一环（切分/检索/生成）掉链子，整套系统就"
     "变成『带引用的胡说』。"),
intuition=("RAG 像开卷考试：模型是考生，向量库是允许携带的资料册。切分是把教材撕成卡片（撕坏了就找不回答案）；"
     "embedding 是给每张卡片做语义指纹；检索是按指纹找卡片；生成是『只准照着卡片作答』。评估就是抽查："
     "找没找到（Recall@K）、答得有没有出处（忠实度）、不知道时会不会承认（拒答）。"),
cerr=("切分把答案拦腰截断且无 overlap，检索命中了却拼不出答案；把 top-10 全塞进上下文，噪声淹没证据导致忠实度下降；"
      "评估只看『回答顺不顺』不建评估集，改一版切分参数全凭感觉。"),
miscon=("1. **『RAG 等于向量数据库』**——检索只是五阶段之一，切分质量与生成约束同样决定成败；\\n"
        "2. **『召回越多越好』**——top-k 过大引入噪声并稀释注意力，工业界常 top-3~5 + 重排；\\n"
        "3. **『RAG 能消灭幻觉』**——它显著降低事实幻觉，但引用幻觉与逻辑幻觉仍在，必须配合忠实度评估与拒答设计。"),
connection=("- **向前**：llm-b2 的 Agent 把 RAG 当作一种工具调用；\n"
            "- **向后**：c2/c3/c4 逐环深挖本章流程，c5/c6 给出自适应与图谱化两条进阶路线；\n"
            "- **平行**：llm-a5 的语料清洗与本章切分共享 MinHash/质量过滤工具箱。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 五阶段 | 切分→向量化→存储→检索→重排→生成 |\n"
         "| 切分 | 递归切分最常用，size 200~1000 tok，overlap 10%~20% |\n"
         "| 相似度 | 余弦最常用；父-子块兼顾精度与上下文 |\n"
         "| 评估 | 检索层 Recall@K/MRR + 生成层忠实度/相关性（RAGAS）|\n"
         "| 失败模式 | 答非所问/编造细节/该拒不拒 → 分别对症 |"),
)
T["llm-b1","c2"] = dict(
expected="""固定长度切分把『3 个工作日原路退回』拦腰截断（完整命中答案块=False），递归切分按『。』边界保留完整答案块（True）——同样的 embedding，切分决定成败。""",
why=("如果切分把答案切断了，后面再强的 embedding 和模型都救不回来——切分是被低估的『第一性』环节。"
     "块太大稀释向量、挤占上下文；块太小语义破碎。四种策略与 size/overlap 参数决定 RAG 上限。"),
intuition=("切分像把一本书做成检索卡片：固定长度是『每 500 字撕一刀』（快但可能把答案撕成两半）；递归切分是"
           "『先按章节、再按段落、再按句子』（尽量沿装订线撕）；语义切分用『读到哪意思变了就在哪切』；"
           "父子切分是『检索用小卡片、回答时把整节递给模型』。"),
cerr=("固定长度硬切把表格/代码/句子拦腰截断；overlap 设 0，跨块边界的信息两头都检不全；中文按字符数估 token，"
      "实际 chunk 粒度比预期大 1.5~2 倍。"),
miscon=("1. **『chunk_size 越大越保险』**——大块稀释向量且挤占上下文，检索精度与答案信噪比双降；\\n"
        "2. **『语义切分一定最优』**——成本高且收益依赖文本类型，FAQ 类文档递归切分已足够；\\n"
        "3. **『切分一次永久有效』**——换 embedding 模型或下游模型后最优 size 会漂移，需用评估集重调。"),
connection=("- **向前**：c1 的五阶段把切分排在第一位的原因在本章展开；\n"
            "- **向后**：c3 的混合检索在切分产出的块上跑召回；\n"
            "- **平行**：llm-a5 的清洗流水线决定切分的输入质量。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 残酷事实 | 答案被切断，后端再强也救不回 |\n"
         "| 四策略 | 固定长度/递归/语义/父子 |\n"
         "| 递归分隔符 | \\n\\n → \\n → 。 → ，逐级降级 |\n"
         "| size | FAQ 200~400 / 知识库 500~800 / 法规 800~1500 |\n"
         "| overlap | 10%~20%，防边界信息丢失 |"),
)
T["llm-b1","c3"] = dict(
expected="""型号查询『XR-2000』：BM25 得分 d1 > d3（精确匹配强），向量模型却把 d2 排最前（语义模糊记不住型号）；RRF(k=60) 融合后 d1 居首——两路互补。""",
why=("向量检索懂语义却记不住型号，BM25 记得住型号却不懂『退款=退换货』——单路检索各有盲区。"
     "混合检索 + RRF 融合是工业界主流：两路错误不相关，合起来召回率显著提升。"),
intuition=("向量检索像『按意思找人』（描述特征就能找到化名的人），BM25 像『按名字找人』（写错一个字就找不到）。"
           "混合检索是两套人马各报候选人名单，RRF 按名次计分（第 1 名 1/61 分、第 2 名 1/62 分……）——"
           "只看排名不看分数，天然绕开两套评分量纲不可比的难题。"),
cerr=("把余弦分数与 BM25 分数直接相加（量纲不同，BM25 无界值碾压余弦）；中文 BM25 忘了分词或用错词表；"
      "RRF 的 k 取 1 导致第一名权重过陡，头部噪声被放大。"),
miscon=("1. **『embedding 模型越新检索越准』**——罕见词/编号/代码标识符上 BM25 仍然碾压向量，必须混合；\\n"
        "2. **『RRF 比加权归一化高级』**——两者是不同取舍：RRF 免调参鲁棒，加权法在分数校准好时上限更高；\\n"
        "3. **『召回够了就行』**——两阶段架构中重排（rerank）决定最终进入上下文的顺序与质量。"),
connection=("- **向前**：c2 的切分粒度决定 BM25 词项统计与向量语义的匹配精度；\n"
            "- **向后**：c4 的评估证明混合检索的 Recall@K 收益；\n"
            "- **平行**：sql 课的全文索引与本章 BM25 共享词频-逆文档频率的数学内核。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 向量 | 语义强、精确匹配弱、需模型与索引 |\n"
         "| BM25 | IDF×TF 饱和：精确匹配极强、不懂语义 |\n"
         "| 混合 | 两路错误不相关 → 召回率显著提升 |\n"
         "| RRF | Σ 1/(k+rank)，k≈60，免量纲免调参 |\n"
         "| 架构 | 粗召回（50~100）→ 重排 → Top-3~5 |"),
)
T["llm-b1","c4"] = dict(
expected="""差排序 [d3,d1,d2]：Recall@2=0.5、MRR=0.5、NDCG@2=0.63；好排序 [d1,d2,d3]：全 1.0；忠实度逐句判定：2/3 论断有上下文支撑 → 0.67。""",
why=("没有评估集的 RAG 优化就是『猜』：改一个参数感觉变好，可能只是换了个错误方式。检索层指标管『找没找对』，"
     "生成层指标管『答得对不对』——忠实度是 RAG 最重要的单一指标，因为它就是『有没有编造』的度量。"),
intuition=("检索层像快递分拣考核：Recall@K 是『该送的都分出来了没』，MRR 是『该送的排第几位』。生成层像客服质检："
           "忠实度是『每句话有没有工单依据』（逐句对照资料），相关性是『答没答到点上』。『无法回答』类样本是照妖镜："
           "模型在该说不知道时硬编，整套系统就不可信。"),
cerr=("只评端到端『感觉』不拆层定位，检索漏了却去改提示词；忠实度用『看起来像真的』判断而不逐句对照上下文；"
      "评估集没有『无法回答』类，拒答能力为零也测不出来。"),
miscon=("1. **『Recall@K 是最重要的指标』**——它只保证『有机会答对』，忠实度才决定『真的没编造』；\\n"
        "2. **『评估集越大越好』**——50~200 条覆盖四类场景即可起步，版本化回归比规模重要；\\n"
        "3. **『LLM-as-Judge 免费』**——裁判有自己的偏差，需抽样人工校准并固定裁判版本。"),
connection=("- **向前**：c1-c3 的每次改动都必须过本章评估集回归；\n"
            "- **向后**：llm-b2 的 Agent 评估框架是本章在多步场景的推广；\n"
            "- **平行**：llm-a5 的数据质量检查与本章共享『先度量再优化』的纪律。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 检索层 | Recall@K（漏没漏）/ Precision@K / MRR / NDCG |\n"
         "| 生成层 | 忠实度/答案相关性/上下文精确/上下文召回（RAGAS）|\n"
         "| 忠实度 | 有支撑论断数 / 总论断数（LLM 逐句判定）|\n"
         "| 评估集 | 50~200 条：事实/多文档/无法回答/易混淆 |\n"
         "| 纪律 | 版本化回归：改任何参数都重跑 |"),
)
T["llm-b1","c5"] = dict(
expected="""『1+1 等于几』→ Retrieve=no（省一次检索成本）；『退货政策』→ yes 检索后回答；第 3 句置信度 0.30 < 0.5 触发 FLARE 再检索；多轮检索 3 轮内命中（预算上限 3）。""",
why=("Naive RAG 是死流程：不需要检索也检索、检索到噪声也照用、只检索一次。Self-RAG 用反思标记决定『要不要检索』，"
     "FLARE 在低置信度时主动再检索，Agentic RAG 把检索变成可规划的工具——进阶 RAG 的共同思路是把检索从固定步骤"
     "变成可决策、可迭代的动作。"),
intuition=("Naive RAG 是不管病情先挂专家号还全开检查；Self-RAG 是会分诊的医生（先判断要不要查资料、资料相关吗、"
           "回答有依据吗、有用吗四连问）；FLARE 是边写边自查（写一句没把握就停下来翻书）；Agentic RAG 是"
           "会制定检查计划的主任医师——多轮、多源、按需深入。"),
cerr=("把『是否检索』写死为 true，简单问题白白付出检索成本与噪声；反思标记用提示词模拟（Self-RAG 的标记是训练出来的）；"
      "多轮检索没有终止条件，预算失控。"),
miscon=("1. **『高级 RAG 全面优于 Naive』**——简单 FAQ 场景 Naive 更快更稳，自适应机制是为难问题付费；\\n"
        "2. **『Self-RAG 是提示工程』**——四类反思标记需要专门构造数据训练，非即插即用；\\n"
        "3. **『检索次数越多越准』**——多轮检索引入延迟与噪声累积，需要置信度门控与预算上限。"),
connection=("- **向前**：c1-c4 的静态链路是本章的对照基线；\n"
            "- **向后**：c6 的 GraphRAG 是另一维度的进阶（换索引结构而非换流程）；\n"
            "- **平行**：llm-b2 的 ReAct 循环与 Agentic RAG 共享『观察-决策-行动』骨架。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| Naive 三病 | 不需也检索 / 噪声照用 / 只检索一次 |\n"
         "| Self-RAG | 四类反思标记：Retrieve/IsRel/IsSup/IsUse |\n"
         "| FLARE | 低置信 token 触发再检索 |\n"
         "| Agentic | 检索=工具，可规划、可多轮 |\n"
         "| 代价 | 训练成本/延迟上升，需按场景取舍 |"),
)
T["llm-b1","c6"] = dict(
expected="""实体图连通分量聚成一个大社区（产品部/销售部/退货政策→A 项目）；top-k 检索只见 [产品部, A 项目] 局部；map：各社区部分回答 → reduce：『两个部门围绕 A 项目协作』的全局答案。""",
why=("『这份语料的主要主题是什么』这类全局问题上 top-k 检索必然失败：答案不在任何单个段落里，"
     "这是 query-focused summarization 而非检索。GraphRAG 用实体图谱 + 层级社区摘要 + map-reduce "
     "回答全局问题。"),
intuition=("局部问题像『在书里找到张三的职位』（翻到那一页就行）；全局问题像『总结这本书讲了什么』（得读完整本）。"
     "GraphRAG 的做法是先给书写目录：LLM 抽出实体关系织成网（图），Leiden 把网分成主题社区，"
     "每个社区预先写好摘要；提问时每个社区各写一段小答案（map），再汇总成总答案（reduce）。"),
cerr=("社区摘要查询时现算（应为离线预计算，查询时复用）；层级选错——问全局主题却用 Level 3 细粒度社区；"
      "map-reduce 汇总时把部分回答直接拼接而不做冲突消解。"),
miscon=("1. **『GraphRAG 是更准的向量检索』**——它换的是索引范式（图+摘要），解决的是 QFS 不是检索；\\n"
        "2. **『构建图谱成本可忽略』**——每个 chunk 一次 LLM 抽取，是离线大头，需按更新频率权衡；\\n"
        "3. **『Leiden 社区=业务分类』**——社区是图连通性的产物，可能跨业务主题，需人工校准层级语义。"),
connection=("- **向前**：c5 的自适应检索仍以块检索为基本动作，本章换掉索引本身；\n"
            "- **向后**：知识图谱与关系抽取在 mining-graph 课有系统方法论；\n"
            "- **平行**：llm-b2 的多智能体汇总与 map-reduce 共享『局部作答→全局合并』结构。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 边界 | 局部问题用 RAG；全局问题是 QFS，RAG 失效 |\n"
         "| 离线 | 分块→实体抽取→Leiden 社区→社区摘要 |\n"
         "| 层级 | L0 全库 → L1 主题 → L2 细分 → L3 群组 |\n"
         "| 在线 | 每社区部分回答（map）→ 汇总（reduce）|\n"
         "| 代价 | 索引构建的 LLM 成本高，更新需重算 |"),
)
C[("llm-b1","c1")] = '''import numpy as np
np.set_printoptions(precision=3, suppress=True)
docs = ["退货政策：签收后 7 天内可无理由退货，需保留吊牌。", "发货时效：现货 48 小时内发出。",
        "会员权益：每年两次免费清洗服务。", "退款流程：退货签收后 3 个工作日原路退回。"]
def embed(t, dim=32):
    v = np.zeros(dim)
    for ch in t: v[ord(ch) % dim] += 1
    return v / (np.linalg.norm(v) + 1e-9)
M = np.array([embed(d) for d in docs])
q = embed("7 天无理由退货怎么操作")
sims = M @ q
top = sims.argsort()[::-1][:2]
print("检索 Top-2:", [f"doc{i}({sims[i]:.2f})" for i in top])
answer = "签收后 7 天内可无理由退货，需保留吊牌；退款在退货签收后 3 个工作日原路退回。"
claims = [("7 天内可无理由退货", "无理由退货"), ("退款 3 个工作日原路退回", "3 个工作日"), ("客服全年无休", "客服全年")]
ctx = docs[top[0]] + docs[top[1]]
faith = [key in ctx for _, key in claims]
print("论断支撑检查:", [(c, f) for (c, _), f in zip(claims, faith)], f"忠实度={np.mean(faith):.2f}")
# Recall@2 / MRR
rel = {0, 3}
rank_hits = [i for i in np.argsort(-sims) if i in rel]
print(f"Recall@2={len(rank_hits[:2])/len(rel):.2f} | MRR={np.mean([1/(list(np.argsort(-sims)).index(r)+1) for r in rel]):.2f}")'''
C[("llm-b1","c2")] = '''text = ("退货政策：签收后 7 天内可无理由退货。\\n\\n发货时效：现货 48 小时内发出。\\n\\n"
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
    print(f"{name}切分: 完整命中答案块 = {hit}")'''
C[("llm-b1","c3")] = '''import math
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
print("RRF 融合:", fused)'''
C[("llm-b1","c4")] = '''import numpy as np
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
print("论断支撑:", list(zip(answer_claims, sup)), f"忠实度={np.mean(sup):.2f}")'''
C[("llm-b1","c5")] = '''import random
random.seed(0)
# 模拟自适应检索决策（Self-RAG 思路的工程化）
def need_retrieve(q):
    factual = any(k in q for k in ["政策", "多久", "多少", "怎么退"])
    return "yes" if factual else "no"
def faithfulness(answer, ctx):
    return np.mean([c[:5] in ctx for c in answer]) if (np := __import__("numpy")) else 0
for q, ctx, ans in [("1+1 等于几", "", [2]), ("退货政策是什么", "7 天无理由退货", [0.9])]:
    decision = need_retrieve(q)
    print(f"『{q}』→ Retrieve={decision}", "（省一次检索成本）" if decision == "no" else "→ 检索后回答")
# FLARE：低置信触发再检索
conf = [0.8, 0.75, 0.3, 0.72]           # 逐句生成置信度
sent_i = conf.index(min(conf))
print(f"第 {sent_i} 句置信度 {conf[sent_i]:.2f} < 0.5 阈值 → 暂停生成，用当前句做查询再检索")
# 多轮预算
budget, rounds = 3, 0
satisfied = [False, False, True]
while not satisfied[rounds] and rounds < budget:
    rounds += 1
print(f"多轮检索在 {rounds} 轮后命中（预算上限 {budget}）")'''
C[("llm-b1","c6")] = '''import numpy as np
# 模拟实体图与社区（简化版连通分量）
edges = [("张三","产品部"),("李四","产品部"),("产品部","A 项目"),("王五","销售部"),
         ("销售部","A 项目"),("赵六","销售部"),("退货政策","A 项目")]
adj = {}
for a, b in edges: adj.setdefault(a, set()).add(b); adj.setdefault(b, set()).add(a)
seen, comms = set(), []
for node in adj:
    if node in seen: continue
    stack, comp = [node], set()
    while stack:
        n = stack.pop()
        if n in seen: continue
        seen.add(n); comp.add(n); stack.extend(adj[n] - seen)
    comms.append(comp)
comms.sort(key=len, reverse=True)
print("社区划分:", [sorted(c) for c in comms[:2]])
# 全局问题：top-k 失败 vs map-reduce
q = "这份组织材料里有哪些部门与项目关系？"
topk = sorted(adj, key=lambda n: -len(adj[n]))[:2]
print(f"top-k 检索只见局部: {topk}")
partial = [f"社区含 {sorted(c)[:3]} 等实体，主题为部门协作" for c in comms[:2]]
print("map（各社区部分回答）:", partial)
print("reduce → 最终回答：材料描述两个部门（产品部/销售部）围绕 A 项目协作")'''
G["llm-b1-c1-l1"] = ("1. 画出 RAG 五阶段链路并说明每阶段的输入输出；\n"
                     "2. 对比五种切分策略，写出 size/overlap 的经验区间；\n"
                     "3. 用 embedding 相似度完成一次迷你检索并解释余弦/内积/欧氏的取舍。")
G["llm-b1-c1-l2"] = ("1. 列出检索层四指标（Recall@K/Precision@K/MRR/NDCG）的口径；\n"
                     "2. 解释忠实度/答案相关性/上下文精确/上下文召回（RAGAS）的评估方式；\n"
                     "3. 按五类失败模式给出对策并设计含『无法回答』类的评估集。")
G["llm-b1-c2-l1"] = ("1. 论证『答案被切断则后端无解』与块过大/过小的双向代价；\n"
                     "2. 实现递归切分并演示分隔符优先级（\\n\\n→。）；\n"
                     "3. 按场景选择 chunk_size 并设置 10%~20% overlap。")
G["llm-b1-c3-l1"] = ("1. 对比向量检索与 BM25 在语义/精确匹配上的互补性；\n"
                     "2. 写出 BM25 打分公式与 RRF 融合公式（k≈60）；\n"
                     "3. 实现混合检索：两路召回 → RRF 融合 → 两阶段重排。")
G["llm-b1-c4-l1"] = ("1. 计算检索层指标并说明 Recall@K 为何是 RAG 的命门；\n"
                     "2. 用 LLM-as-Judge 口径计算忠实度（支撑论断/总论断）；\n"
                     "3. 构建 50~200 条四类场景的版本化评估集。")
G["llm-b1-c5-l1"] = ("1. 复述 Naive RAG 三大根本问题与 Self-RAG 四类反思标记；\n"
                     "2. 对比 Self-RAG/FLARE/Agentic RAG 的决策机制与代价；\n"
                     "3. 实现带预算上限的自适应检索与低置信再检索逻辑。")
G["llm-b1-c6-l1"] = ("1. 解释为何全局问题是 QFS 而 top-k 检索必然失败；\n"
                     "2. 描述 GraphRAG 两阶段：离线图谱+社区摘要、在线 map-reduce；\n"
                     "3. 说明 Leiden 层级（L0~L3）与问题粒度的匹配关系。")
P["llm-b1-c1-l1"] = "- llm-a1 的 embedding 概念；\n- 无其他硬前置。"
P["llm-b1-c1-l2"] = "- 「RAG 的完整链路与文档切分」（c1-l1）。"
P["llm-b1-c2-l1"] = "- 「RAG 的完整链路」（c1-l1）的切分位置。"
P["llm-b1-c3-l1"] = "- 「为什么切分决定 RAG 的上限」（c2-l1）；\n- 词频统计基础。"
P["llm-b1-c4-l1"] = "- c1~c3 的完整链路；\n- 对数与排序的基本概念。"
P["llm-b1-c5-l1"] = "- c1~c4 的 Naive RAG 全流程。"
P["llm-b1-c6-l1"] = "- c5 的自适应检索；\n- 图的基本概念（节点/边/连通）。"

# ═══════════ llm-b3 推理部署 ═══════════
T["llm-b3","c1"] = dict(
expected="""全参微调 7B ≈ 84 GB（16N 字节）；LoRA r=8/16/64 参数 66K/131K/524K（0.39%/0.78%/3.12%），B=0 初始增量=0 不打乱原能力；QLoRA 65B NF4 基座 ≈ 32 GB + 适配器 ~1.3MB → 48G 单机可行。""",
why=("预训练模型会『预测下一个 token』但不会『当助手』：续写问题、格式失控、对有害请求不拒绝。"
     "后训练（SFT→对齐→增强）把能力转成可用行为；而微调 vs RAG vs 提示工程的选型，"
     "决定了项目的钱花在哪里。"),
intuition=("基座模型像读遍图书馆但没上过班的学霸：SFT 是入职培训（教格式与流程），RLHF 是服务意识培训"
           "（哪种回答更好），蒸馏是把老员工的本事压缩进新人。选型口诀：改行为用微调、注入知识用 RAG、"
           "改格式用提示工程——微调不擅长记新知识。"),
cerr=("用微调注入频繁更新的私有知识（应 RAG），知识一变就要重训；SFT 数据不对 assistant 段计算损失"
      "（模型学会自问自答）；一上来全参微调 7B，过拟合且灾难性遗忘。"),
miscon=("1. **『微调能注入知识』**——微调擅长改变行为与格式，知识型需求 RAG 可追溯、可实时更新；\\n"
        "2. **『数据越多越好』**——1000 条精标通常胜过 1 万条未审核生成数据，质量控制清单优先；\\n"
        "3. **『基线可以不跑』**——没有提示工程基线，微调带来的提升无从归因。"),
connection=("- **向前**：llm-b4 的 RLHF/DPO 是本章 SFT 之后的对齐环节；\n"
            "- **向后**：c2 的 KV Cache 与 c3 的批处理决定微调后模型的部署形态；\n"
            "- **平行**：llm-b2 的评估三层次在本章用于微调效果验收。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三步 | SFT → RLHF/DPO → 推理增强与蒸馏 |\n"
         "| 选型 | 改行为=微调；注入知识=RAG；改格式=提示 |\n"
         "| 权重 | 数据 60% / 算法 20% / 工程 20% |\n"
         "| 流程 | 定评测→造数据→基线→LoRA 小试→评测→部署 |\n"
         "| 数据 | 只对 assistant 段算 loss，结尾必须 eos |"),
)
T["llm-b3","c2"] = dict(
expected="""KV 公式：7B MHA 4K 单请求 2.00 GiB，32 并发 64 GiB（远超 13.5 GiB 权重）；GQA-8 = 0.25x、MQA = 0.031x；预分配 0.41G 元 vs 分页 0.09G 元（利用率 20% → ~91%）。""",
why=("自回归生成的瓶颈不在算力而在访存：每生成一个 token 都要读全部历史的 K/V。KV Cache 用显存换掉"
     " O(n³) 的重复计算，但它的显存公式决定了并发与上下文的上限——MQA/GQA/量化/滑窗/PagedAttention "
     "是省这个『显存吞金兽』的五条路。"),
intuition=("KV Cache 像考试的草稿纸：因果掩码保证历史 K/V 不会变，写一次即可反复看，不必每步重抄全文。"
           "代价是草稿纸面积 = 2×层数×序列长×KV头×头维×字节数——7B 模型 4K 上下文一个请求就 2GB。"
           "PagedAttention 把连续草稿本换成便签本（按页分配），浪费从 60~80% 降到几乎为零。"),
cerr=("按 max_seq_len 预分配连续 KV 显存，实际利用率只有 20~40%；KV Cache 公式漏乘层数或字节数；"
      "并发估算用模型权重显存代替 KV 显存，上量后 OOM。"),
miscon=("1. **『KV Cache 显存=权重显存』**——权重固定、KV 随并发×序列长线性涨，长上下文时反超权重；\\n"
        "2. **『MQA 省```显存```没代价』**——KV 头砍到 1 有容量损失，GQA（8 组）是质量与显存的甜点；\\n"
        "3. **『滑动窗口无损』**——窗口外的注意力被截断，长程依赖任务会掉点。"),
connection=("- **向前**：llm-a3 的 GQA/MLA 从模型结构侧省 KV，本章从部署侧管理 KV；\n"
            "- **向后**：c3 的 continuous batching 依赖本章的动态 KV 管理；\n"
            "- **平行**：llm-a2 的显存账（训练侧）与本章（推理侧）合为一本总账。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 公式 | 2×L×S×H_kv×D×bytes（7B/4K/fp16≈2GB）|\n"
         "| 三方向 | 减头数（GQA）/降精度（INT8）/减长度（滑窗）|\n"
         "| PagedAttention | 按页分配 KV，消除 60~80% 预分配浪费 |\n"
         "| 瓶颈本质 | 自回归解码是访存密集型 |\n"
         "| 估算 | 并发上限 = 可用显存 / 单请求 KV |"),
)
T["llm-b3","c3"] = dict(
expected="""静态批：批次时长被最长请求（200 步）拖住，GPU 利用率仅 37%；连续批：t=60 时短请求已完成 3 个，新请求等待 0 步（静态批需再等 140 步）；总延迟 ≈ 0.3 + 0.025×200 = 5.3s。""",
why=("单个请求跑不满 GPU，批处理是吞吐的钥匙；但静态 batching 被最长请求拖死（短请求陪跑），"
     "continuous batching 以 token 为粒度调度把利用率拉满——vLLM/TensorRT-LLM 的核心价值所在。"),
intuition=("静态批像旅行社大巴：凑够一车发车，最早下车的乘客也要坐到终点站。连续批像地铁：每到一站"
           "（每步解码）有下车的立刻腾位、有候车的立刻上车，车厢始终满载。TTFT 是发车等待感，"
           "TPOT 是行驶速度感——batch 越大吞吐越高但两者都会变差。"),
cerr=("批大小拍脑袋拉满，TTFT 飙升用户流失；prefill 与 decode 混跑，长 prompt 的计算密集阶段堵塞"
      "所有 decode 请求（应分池或 chunked prefill）；忘了前缀缓存，同一系统提示反复重算。"),
miscon=("1. **『吞吐=延迟优化的对立面』**——连续批同时改善两者（相比静态批），取舍只在 batch 上限；\\n"
        "2. **『解码阶段算力瓶颈』**——decode 是访存密集（每步读全部权重+KV），提高 batch 摊薄访存才提速；\\n"
        "3. **『流式输出改变生成速度』**——它只降低体感 TTFT，token 生成速率不变。"),
connection=("- **向前**：c2 的 KV 显存管理是动态 batch 的物理前提；\n"
            "- **向后**：c4 的成本模型直接由本章吞吐决定；\n"
            "- **平行**：quant-live 的 continuous 概念与本章共享『事件到达即处理』思想。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 静态批 | 请求为粒度，短请求陪跑，利用率低 |\n"
         "| 连续批 | token 为粒度：完成即出、到达即入 |\n"
         "| 收益 | 吞吐提升 5~20 倍，单请求延迟几乎不变 |\n"
         "| 指标 | TTFT（prefill 决定）+ TPOT×输出长（decode）|\n"
         "| 阶段 | prefill 计算密集 / decode 访存密集 |"),
)
T["llm-b3","c4"] = dict(
expected="""未优化月成本 ≈ $6,800（系统提示占输入 56%）；精简提示+前缀缓存（10% 费率）→ ≈$5,200；70% 流量路由到小模型 → ≈$1,868（降 73%）。""",
why=("API 按 token 计费（输出贵 3~5 倍）、自建按 GPU 小时计费——LLM 应用的毛利藏在输入裁剪、前缀缓存、"
     "输出约束与模型路由四个杠杆里。路由是最大的降本杠杆：不是所有请求都需要最强模型。"),
intuition=("成本像话费账单：输入是接听费、输出是拨出费（更贵）。省法有四：少说废话（精简系统提示）、"
           "包月套餐（前缀缓存命中按 10% 计费）、短信化（max_tokens 与格式约束）、按需选运营商"
           "（路由：简单问题走小模型，复杂问题升级大模型，级联兜底）。"),
cerr=("系统提示 1000 token 在百万请求里烧掉 10 亿 token（能 200 字说清就别写 1000）；可变内容放在前缀"
      "导致缓存永不命中；路由阈值拍脑袋，错误路由让复杂请求质量崩塌且无监控。"),
miscon=("1. **『缓存命中质量会变差』**——前缀缓存是确定性复用计算，输出与不缓存完全一致；\\n"
        "2. **『路由省的钱不值风险』**——加置信度级联（小模型不确定再升级）可把风险压到可接受；\\n"
        "3. **『成本只看模型单价』**——吞吐、利用率、重试率与上下文长度同样进入账单。"),
connection=("- **向前**：c3 的吞吐决定自建 GPU 成本公式；\n"
            "- **向后**：llm-b2 的模型路由模式是本章的 Agent 版；\n"
            "- **平行**：quant-live 的费用精算与本章的 token 精算共享『单位成本×量』思维。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 成本式 | 输入×单价 + 输出×单价（输出贵 3~5x）|\n"
         "| 输入侧 | 精简系统提示 / 前缀缓存（≈10% 费率）/ 裁剪上下文 |\n"
         "| 输出侧 | max_tokens、格式约束、结构化输出 |\n"
         "| 路由 | 规则/小模型分类/级联，成本降 50~80% |\n"
         "| 纪律 | 逐请求记录 token 与成本，按路由归因 |"),
)
C[("llm-b3","c1")] = '''import numpy as np
P = 7e9
GB = 1e9
full = P*(2+2+8)          # bf16 权重 + bf16 梯度 + fp32 m,v
print(f"全参微调 7B: ~{full/GB:.0f} GB（16N 字节），单卡放不下 → 需 ZeRO/FSDP")
d = k = 4096
for r in (8, 16, 64):
    lora = r*(d+k)
    print(f"LoRA r={r}: {lora/1e3:.0f}K 参数 = {lora/(d*k):.2%} of 原矩阵 {d*k/1e6:.1f}M")
# LoRA 初始化：B=0 保证增量初始为 0
rng = np.random.default_rng(0)
A = rng.normal(0, 0.01, (16, k)); B = np.zeros((d, 16))
print("初始增量 BA =", np.abs(B@A).max(), "（不打乱原有能力）")
# QLoRA 显存
print(f"QLoRA: 65B NF4 基座 ≈ {65e9*0.5/GB:.0f} GB + 适配器 grads/opt 仅 ~1.3 MB → 48G 单机可行")'''
C[("llm-b3","c2")] = '''GB = 2**30
def kv_gb(L, S, H_kv, D, b=2): return 2*L*S*H_kv*D*b/GB
print(f"7B MHA 4K 单请求: {kv_gb(32,4096,32,128):.2f} GiB")
print(f"7B MHA 4K ×32 并发: {kv_gb(32,4096,32,128)*32:.0f} GiB（远超 13.5 GiB 权重）")
for name, h in [("MHA", 32), ("GQA-8", 8), ("MQA", 1)]:
    print(f"{name}: KV = MHA 的 {kv_gb(32,4096,h,128)/kv_gb(32,4096,32,128):.3f}")
# PagedAttention：预分配 vs 分页
max_len, avg_len, n_req = 4096, 800, 100
prealloc = max_len*n_req
paged = avg_len*n_req*1.1                      # 10% 页内碎片
print(f"预分配 {prealloc/1e6:.2f}G 元 vs 分页 {paged/1e6:.2f}G 元（利用率 {avg_len/max_len:.0%} → ~91%）")'''
C[("llm-b3","c3")] = '''import random
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
print(f"总延迟 ≈ TTFT {ttft}s + TPOT {tpot}s × {out} tok = {ttft + tpot*out:.1f}s")

'''
C[("llm-b3","c4")] = '''p_in, p_out = 2.0, 8.0          # $/M tokens（中模型示例价）
sys_prompt, hist, out = 1000, 800, 400
N = 1_000_000
cost = (sys_prompt+hist)*N/1e6*p_in + out*N/1e6*p_out
print(f"未优化月成本 ≈ ${cost:,.0f}（系统提示占输入 {(sys_prompt)/(sys_prompt+hist):.0%}）")
cached = (sys_prompt*0.1 + hist)*N/1e6*p_in + out*N/1e6*p_out
print(f"前缀缓存(命中按 10%)+精简提示(200 tok): ≈ ${(200+hist)*N/1e6*p_in*1.0 + out*N/1e6*p_out:,.0f}")
# 路由：70% 简单请求走小模型
simple = 0.7
small = (0.2, 0.6)
cost_routed = simple*N*((200+hist)*small[0]/1e6 + out*small[1]/1e6) + (1-simple)*N*((200+hist)*p_in/1e6 + out*p_out/1e6)
print(f"路由后 ≈ ${cost_routed:,.0f}（降 {(1-cost_routed/cost):.0%}）")'''
G["llm-b3-c1-l1"] = ("1. 解释预训练模型的『能用与好用』差距及后训练三步；\n"
                     "2. 按需求表做微调/RAG/提示工程的选型判断；\n"
                     "3. 复述微调项目七步流程与『数据 60%』的权重观。")
G["llm-b3-c1-l2"] = ("1. 算清全参微调 16N 字节的显存账（7B≈112GB）；\n"
                     "2. 推导 LoRA 参数量 r(d+k) 并验证 B=0 初始化的零扰动性质；\n"
                     "3. 说出 QLoRA 三技术（NF4/双重量化/分页优化器）与关键超参经验值。")
G["llm-b3-c1-l3"] = ("1. 写出 SFT 样本结构并解释『只对 assistant 段算损失+eos』的原因；\n"
                     "2. 对比四条数据来源路线的优缺点与混合策略；\n"
                     "3. 执行六项质量控制（去重/格式/事实/泄漏/长度/模板化）。")
G["llm-b3-c2-l1"] = ("1. 推导 KV Cache 显存公式并算出 7B/4K/fp16≈2GB；\n"
                     "2. 对比 MHA/GQA/MQA 的 KV 缩放与质量取舍；\n"
                     "3. 解释 PagedAttention 如何把 60~80% 预分配浪费降到页内碎片。")
G["llm-b3-c3-l1"] = ("1. 用生成长度差异说明静态批的利用率问题；\n"
                     "2. 模拟 continuous batching 的 token 级调度并对比 GPU 占比；\n"
                     "3. 定义 TTFT/TPOT 并写出总延迟公式与优化取舍。")
G["llm-b3-c4-l1"] = ("1. 写出 API 成本公式并说明输出单价更高的影响；\n"
                     "2. 计算前缀缓存与提示精简的节省比例；\n"
                     "3. 设计模型路由（规则/分类/级联）并估算 70% 流量走小模型的降本。")
P["llm-b3-c1-l1"] = "- llm-a2 预训练流程概念；\n- 无其他硬前置。"
P["llm-b3-c1-l2"] = "- 「从预训练到对齐」（c1-l1）；\n- 矩阵秩的直观概念。"
P["llm-b3-c1-l3"] = "- 「全参微调与 LoRA/QLoRA」（c1-l2）。"
P["llm-b3-c2-l1"] = "- llm-a1 的注意力与因果掩码；\n- llm-a3 的 GQA。"
P["llm-b3-c3-l1"] = "- 「KV Cache：用显存换速度」（c2-l1）。"
P["llm-b3-c4-l1"] = "- c2/c3 的显存与吞吐基础。"

# ═══════════ llm-b4 后训练 ═══════════
T["llm-b4","c2"] = dict(
expected="""Bradley-Terry：margin 0→L=0.693、margin 2→0.127、margin -2→2.127；KL 惩罚：beta=0 时 hacking 策略净奖励 +1.20，beta=0.2 变 -0.40（被抑制）；PPO 4 模型 bf16 权重 56 GB；DPO margin=2 → L=0.598。""",
why=("SFT 教会『怎么回答』却没教『回答得多好』：它无法表达相对偏好，也无法压制有害与啰嗦。"
     "RLHF 用奖励模型+PPO 把人类偏好注入策略，但四个模型同驻显存极其昂贵；DPO 把 RL 变成监督学习——"
     "对齐的经济学决定了谁能做对齐。"),
intuition=("RLHF 三阶段像培训客服：SFT 是话术培训（会答），偏好标注是收集顾客点评（哪个答得更好），"
           "PPO 是按点评发奖金上岗（强化好行为）。KL 惩罚是『不许为了讨好顾客胡乱承诺』——"
           "奖金（RM）只是人类偏好的近似，没有约束模型会学会钻空子（reward hacking）。"),
cerr=("RM 训练数据chosen/rejected标反，奖励信号系统性误导；KL 系数 β 设 0，模型输出 degenerate 文本刷分；"
      "PPO 四模型同驻显存没做显存预算直接 OOM。"),
miscon=("1. **『对齐就是 SFT 加数据』**——SFT 只能模仿单条示范，偏好是成对相对信号，需要 RM/PPO 或 DPO；\\n"
        "2. **『奖励模型分数=真实好坏』**——RM 是近似的代理，reward hacking 是对齐的头号风险；\\n"
        "3. **『DPO 弱于 PPO』**——DPO 免 RM 免采样、稳定易训，在多数偏好任务上与 PPO 相当，是资源有限时的默认。"),
connection=("- **向前**：llm-b3 的 SFT 是本章阶段 1；\n"
            "- **向后**：c3 的 GRPO/RLVR 把对齐推向可验证推理；\n"
            "- **平行**：llm-b2 的 LLM-as-Judge 与 RM 同享『用模型评模型』的方法论与偏差。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 3H | 有用/诚实/无害 |\n"
         "| RM 损失 | L = -log σ(r(chosen) − r(rejected)) |\n"
         "| PPO | reward − β·KL(π_new‖π_sft)，β≈0.01~0.1 |\n"
         "| 显存 | Actor+Critic+RM+Ref ≈ 4 倍模型 |\n"
         "| DPO | 免 RM 免采样，偏好对上直接监督 |"),
)
T["llm-b4","c3"] = dict(
expected="""RLVR：oxed{42} 得 1.0、oxed{40} 与无标签得 0；GRPO 组奖励 [0,1,1,1,0,0,0,0] → 优势 [-0.77,+1.29,...]（免 Critic），全对组优势全 0 需混难度；R1-Zero 轨迹：step 0/500/2000 准确率 15.6%/45%/71%、思考长度 200→9000 字（无长度奖励偏置，自发涌现）。""",
why=("数学与代码的答案非分明的判定催生了 RLVR：不用易被攻击的神经奖励模型，而用规则引擎（答案比对/单元测试）"
     "给奖励。GRPO 砍掉 Critic 用组内相对优势降低方差——R1-Zero 证明纯 RL 能自发涌现长思考与元反思，"
     "完整 R1 再用四阶段流水线把『科学奇迹』变成『工业产品』。"),
intuition=("RLVR 像奥数阅卷：只看最终答案对不对（\boxed{} 匹配），没人情分可刷，故无 reward hacking 空间。"
           "GRPO 是『同题多人作答排名次』：一组 8 个回答互相比较，比组均分高的是正优势——省掉了估计基线的"
           "Critic。R1-Zero 的思考长度爆发是『为了通关自发多打草稿』：奖励只看对错，长思考是策略不是奖励偏置。"),
cerr=("RLVR 奖励函数里混入『答案长度』等启发项，模型学会写长答案刷分（reward hacking 复活）；GRPO 组内 8 个"
      "回答全对/全错导致优势全 0、梯度消失，需混合难度题；把 R1-Zero 的可读性缺陷当『风格』保留上线。"),
miscon=("1. **『RLVR 适用于一切任务』**——它要求结果可验证，开放式写作仍需偏好模型；\\n"
        "2. **『思考变长=奖励函数鼓励长』**——R1-Zero 未加长度偏置，长度是准确率的副产品（test-time compute）；\\n"
        "3. **『蒸馏弱于小模型自己做 RL』**——R1 实验相反：蒸馏大模型的推理范式远胜小模型自训。"),
connection=("- **向前**：c2 的 RLHF 管偏好对齐，本章管可验证能力；两者在 R1 流水线阶段 4 合流；\n"
            "- **向后**：DeepSeek-V3 的 MoE 架构（llm-a4）是这些算法的算力底座；\n"
            "- **平行**：llm-b2 的评估纪律在本章变成奖励函数设计。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| RLVR | 规则引擎给奖励：答案比对/单元测试，防 hacking |\n"
         "| GRPO | 组内相对优势 (r−mean)/std 替代 Critic |\n"
         "| R1-Zero | 纯 RL：思考长度 15.6%→71.0% 准确率自发涌现 |\n"
         "| R1 四阶段 | 冷启动 SFT→推理 RL→拒绝采样 SFT→全场景 RL |\n"
         "| 蒸馏 | 大模型推理范式可蒸馏给 1.5B 小模型 |"),
)
C[("llm-b4","c2")] = '''import numpy as np
def rm_loss(rc, rr): return -np.log(1/(1+np.exp(-(rc-rr))))
print(f"margin=0: L={rm_loss(1.0, 1.0):.3f} | margin=2: L={rm_loss(3.0, 1.0):.3f} | margin=-2: L={rm_loss(1.0, 3.0):.3f}")
# KL 惩罚对策略的约束
for beta in (0.0, 0.05, 0.2):
    reward, kl = 1.2, 8.0        # 一个 hacking 策略：高分但严重偏离
    print(f"beta={beta}: total = {reward} - {beta}*{kl} = {reward - beta*kl:+.2f}")
# 四模型显存账
P = 7e9; GB = 1e9
print(f"PPO 4 模型（bf16 权重）: {4*P*2/GB:.0f} GB + 优化器/激活 → 7B 也需多机")
# DPO：同一偏好对上的监督损失
def dpo_loss(pc, pr, ref_c, ref_r, beta=0.1):
    import math
    return -math.log(1/(1+math.exp(-(beta*((pc-ref_c)-(pr-ref_r))))))
print(f"DPO margin(策略-参考)=2: L={dpo_loss(2.0, 0.0, 0.0, 0.0):.3f}")'''
C[("llm-b4","c3")] = '''import numpy as np, re
# ---- 1. RLVR：规则奖励 ----
def reward(ans, truth):
    m = re.search(r"\\\\boxed\\{([-0-9.]+)\\}", ans)
    if not m: return 0.0
    return 1.0 if abs(float(m.group(1)) - truth) < 1e-6 else 0.0
print("RLVR:", reward("所以 \\\\boxed{42}", 42), reward("所以 \\\\boxed{40}", 42), reward("答案 42", 42))
# ---- 2. GRPO：组内相对优势 ----
rng = np.random.default_rng(0)
def grpo_group(policy_acc, G=8):
    rs = (rng.random(G) < policy_acc).astype(float)
    adv = (rs - rs.mean()) / (rs.std() + 1e-8)
    return rs, adv
rs, adv = grpo_group(0.4)
print("组奖励:", rs.astype(int), "| 组内优势:", np.round(adv, 2), "（省去 Critic）")
all_same = np.ones(8); print("全对组优势:", np.round((all_same-all_same.mean())/(all_same.std()+1e-8), 2), "→ 无梯度，需混难度")
# ---- 3. 测试时计算：R1-Zero 轨迹 ----
steps = [0, 500, 2000]
acc = [15.6, 45.0, 71.0]; think = [200, 2000, 9000]
for s, a, t in zip(steps, acc, think):
    print(f"step {s}: 准确率 {a}% 思考长度 ~{t} 字（无长度奖励偏置，自发涌现）")'''
G["llm-b4-c2-l1"] = ("1. 解释 SFT 之后仍需对齐的三个理由与 3H 目标；\n"
                     "2. 写出 RM 的 Bradley-Terry 损失与 PPO 的 KL 惩罚目标；\n"
                     "3. 算清 PPO 四模型显存账，说明 DPO 把 RL 变监督的动机与公式。")
G["llm-b4-c3-l1"] = ("1. 定义 RLVR 并对比神经 RM 与规则引擎的防作弊性；\n"
                     "2. 推导 GRPO 组内相对优势并解释全对/全错组的梯度消失；\n"
                     "3. 实现规则奖励（\\boxed{} 匹配/单元测试）与组优势计算。")
G["llm-b4-c3-l2"] = ("1. 复述 R1-Zero 实验设置（跳过长 CoT SFT 直接 GRPO）；\n"
                     "2. 描述思考长度爆发与 Aha Moment 的涌现证据；\n"
                     "3. 解释 test-time compute 为何是策略涌现而非奖励偏置。")
G["llm-b4-c3-l3"] = ("1. 画出 R1 四阶段流水线（冷启动 SFT→推理 RL→拒绝采样 SFT→全场景 RL）；\n"
                     "2. 说明拒绝采样如何沉淀 60 万条黄金 Long-CoT；\n"
                     "3. 对比蒸馏 vs 小模型自训 RL 的结论及其工程含义。")
P["llm-b4-c2-l1"] = "- llm-b3 的 SFT 流程；\n- 强化学习基本词汇（策略/奖励/KL）。"
P["llm-b4-c3-l1"] = "- 「RLHF 三阶段与 DPO」（c2-l1）；\n- PPO 的 Critic 作用。"
P["llm-b4-c3-l2"] = "- 「GRPO 组内相对优势与 RLVR」（c3-l1）。"
P["llm-b4-c3-l3"] = "- 「DeepSeek-R1-Zero」（c3-l2）。"

# ═══════════ llm-a4 MoE ═══════════
T["llm-a4","c3"] = dict(
expected="""fp16 下 logit 7e4 溢出为 inf（router 必须 fp32）；无均衡负载变异系数 0.43（最热专家占 23%），模拟均衡后降至 0.25；all-to-all 每层 64 MiB → 60 层每步 ≈ 3.8 GiB。""",
why=("MoE 把『每次该用哪个专家』的离散选择引入训练：梯度只流向被选中的专家、路由在离散空间跳变、"
     "负载波动搅动数值尺度——不稳定性是结构性的。bf16 路由、小初始化、辅助损失与 all-to-all "
     "通信是让千卡 MoE 跑起来的四大件。"),
intuition=("MoE 像一家分科室的医院：患者（token）挂号（router），只看被挂到的科室。fp16 像小数点会溢出的"
           "老式计算器（路由分一极端就爆），bf16 量程与 fp32 相同所以稳；初始化缩小 10 倍是『新科室开张"
           "别一上来就开大剂量』；辅助损失是科室 KPI——没有它，人人挤热门科室，冷门科室永久闲置。"),
cerr=("router logits 用 fp16 计算，极端 logit 溢出为 inf 全批次报废；不加负载均衡损失，几个专家吃掉全部"
      "token 其余闲置；专家并行忘了 all-to-all 的两次通信成本，跨机带宽被打爆。"),
miscon=("1. **『MoE 省显存』**——省的是每 token FLOPs，全部专家权重仍须常驻显存；\\n"
        "2. **『专家越多越强』**——64 之后收益递减，通信与显存成本继续上升；\\n"
        "3. **『辅助损失权重越大越均衡』**——过强会干扰主损失，路由退化成近似均匀，失去稀疏意义。"),
connection=("- **向前**：c1/c2 的路由与容量因子是本章稳定性的上游；\n"
            "- **向后**：c4/c5 的细粒度与设备受限路由是稳定性在规模化下的演进；\n"
            "- **平行**：llm-a2 的混合精度与本章共享『敏感计算用 fp32』纪律。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 精度 | router 用 fp32、专家矩阵乘 bf16 |\n"
         "| 初始化 | 专家/嵌入 std 缩小 10 倍 |\n"
         "| 微调 | dropout 0.1（比稠密大）|\n"
         "| 专家并行 | 每层两次 all-to-all，需高速互联 |\n"
         "| 结论 | 同 FLOPs 下 MoE 快约 7 倍；>64 专家收益递减 |"),
)
T["llm-a4","c4"] = dict(
expected="""FLOPs 恒为 1.00（K_fine×d_fine=K·d_ff 守恒）；组合空间 C(8,2)=28 → C(32,8)=1.05e7（m=4）→ C(64,16)=4.89e14（m=8）——万倍于粗粒度的动态通路定制能力。""",
why=("粗粒度专家像『全能科室』：知识混杂、组合有限（C(8,2)=28 条通路）。DeepSeek-MoE 在 FLOPs 守恒下把大专家"
     "切碎、成倍增加激活数——组合空间从 28 爆炸到 488 万亿，每个小专家只需专精一件事。"),
intuition=("细粒度切分像把 8 个大科室拆成 64 个专科诊室：每次会诊叫 16 个专科（激活数×8）但每个诊室只有"
           " 1/8 的设备（隐层÷8），总算力不变；可定制的『会诊组合』却从 28 种暴增到百万亿种——"
           "面对 Python 数据分析代码可以同时叫上语法、Pandas、数学、类型检查四个专科。"),
cerr=("切分后忘记等比例放大激活专家数 K，总 FLOPs 缩水为 1/m；共享专家与路由专家的输出没相加；"
      "细粒度后仍用粗粒度的容量因子，token 大量溢出。"),
miscon=("1. **『细粒度=更多参数』**——FLOPs 守恒：K_fine×d_fine = K·d_ff，参数总量不变；\\n"
        "2. **『组合爆炸自动等于强』**——组合多只是『可能性』，需要共享专家隔离通用知识与足够的训练数据；\\n"
        "3. **『Mixtral 式粗粒度已过时』**——粗细粒度是算力/通信/专业化的三方权衡，混合方案（细粒度+共享）是主流。"),
connection=("- **向前**：c3 的负载均衡在专家数暴涨后更关键；\n"
            "- **向后**：c5 的 DeepSeek-V3 无辅助损失均衡是本思想的生产版；\n"
            "- **平行**：llm-a3 的 SwiGLU 8/3d 与本章同为『参数守恒下的结构换效』。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 切分 | N_fine=mN、d_fine=d_ff/m、K_fine=mK |\n"
         "| FLOPs 守恒 | K_fine×d_fine = K·d_ff |\n"
         "| 组合爆炸 | C(8,2)=28 → C(64,16)≈4.9e14 |\n"
         "| 共享专家 | 隔离通用知识，路由专家管专业 |\n"
         "| 效果 | 同算力下专家专业化度显著提升 |"),
)
T["llm-a4","c5"] = dict(
expected="""无约束路由平均跨机 7.2 台 → 设备受限 ≤4 台（跨机流约 1.8x 压减）；显存下限：bf16 1342GB（≥17 张 80G）、fp8 671GB（9 张）、int4 336GB（5 张）；专家负载 top5% 占 51%（热点倾斜）。""",
why=("DeepSeek-V3 的 256 个路由专家装不进任何单卡：专家并行把专家铺到千卡集群，跨机 all-to-all 成为咽喉。"
     "设备受限路由用『最多 M 台机』的硬约束把跨机流量砍半；而部署侧的现实是——MoE 省算力不省显存，"
     "671B 参数必须全量常驻。"),
intuition=("专家并行像全国会诊网络：每个患者（token）按挂号单寄往对应专家所在医院，看完再寄回来——"
           "两次全国快递（all-to-all）就是瓶颈。设备受限路由是『挂号单最多跨 4 家医院』：优先在本机="
           "NVLink 内解决，跨机快递直接减半。部署像开一家 671 件藏品全要入库的博物馆：观众每次只看 37 件"
           "（激活 37B），但仓库（显存）必须装下全部 671 件。"),
cerr=("以为激活 37B 就能用 2 张卡部署 V3（权重 1342GB 至少 17 张 80G）；设备受限路由的 M 设太大，"
      "跨机通信未压缩；热门专家所在 GPU 过载而其他卡闲置（需动态批+token 重组/热门副本）。"),
miscon=("1. **『MoE 推理便宜』**——省的是每 token FLOPs 与延迟；显存下限由总参数决定，量化后也要数百 GB；\\n"
        "2. **『负载均衡损失一劳永逸』**——V3 用无辅助损失的偏置调整避免均衡与主损失的冲突；\\n"
        "3. **『专家负载天然均匀』**——通用领域专家被高频命中，需统计在线热点并复制多份。"),
connection=("- **向前**：c3 的 all-to-all 通信与本章 EP 部署是同一枚硬币的两面；\n"
            "- **向后**：llm-b3 的 continuous batching/PagedAttention 是本章 token 重组的工具箱；\n"
            "- **平行**：llm-a2 的 3D 并行是本章 EP 的地基（DP/TP/PP/EP 组合）。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| EP | 专家分片到千卡，每层两次 all-to-all |\n"
         "| 设备受限路由 | 8 专家最多 M=4 台机，跨机流量减半 |\n"
         "| 显存现实 | 671B：bf16≈1342GB（≥17×80G）|\n"
         "| 专家倾斜 | 热门专家 GPU 跑满 → 副本+token 重组 |\n"
         "| 加速 | 推测解码：小模型草稿+MoE 验证 |"),
)
C[("llm-a4","c3")] = '''import numpy as np
rng = np.random.default_rng(0)
# ---- 1. fp16 vs bf16 量程（router 稳定性）----
print("fp16 max:", np.finfo(np.float16).max, "| logit 7e4 -> fp16:", np.float16(np.float32(7e4)))
# ---- 2. 无均衡 vs 有均衡损失：专家负载 ----
N, K, T = 8, 2, 10000
bias = rng.normal(0, 0.6, N)                     # 天然热门专家
logits = bias[None, :] + rng.normal(0, 1, (T, N))
top = np.argsort(-logits, 1)[:, :K]
load0 = np.bincount(top.ravel(), minlength=N)/T/K
print("无均衡负载:", np.round(load0, 2), "| 变异系数:", round(load0.std()/load0.mean(), 2))
# 简化模拟均衡损失：对热门专家打分施加惩罚
penalized = logits - 2.5*load0[None, :]
top2 = np.argsort(-penalized, 1)[:, :K]
load1 = np.bincount(top2.ravel(), minlength=N)/T/K
print("加均衡后负载:", np.round(load1, 2), "| 变异系数:", round(load1.std()/load1.mean(), 2))
# ---- 3. all-to-all 通信量 ----
d_model, tokens = 4096, 4096
bytes_sent = 2 * tokens * d_model * 2            # 每层两次 all-to-all（bf16）
print(f"每层 all-to-all ≈ {bytes_sent/2**20:.0f} MiB → 60 层每步 ≈ {60*bytes_sent/2**30:.1f} GiB")'''
C[("llm-a4","c4")] = '''import math
N, K, d_ff = 8, 2, 14336
for m in (1, 4, 8):
    Nf, Kf, df = m*N, m*K, d_ff//m
    flops_ratio = Kf*df/(K*d_ff)
    print(f"m={m}: 专家 {Nf}, 激活 {Kf}, 单专家隐层 {df}, FLOPs 比 {flops_ratio:.2f}, 组合 C({Nf},{Kf})={math.comb(Nf, Kf):.3e}")
print(f"粗粒度组合 C(8,2)={math.comb(8,2)}；细粒度 m=8 后 {math.comb(64,16):.2e}（组合空间爆炸）")'''
C[("llm-a4","c5")] = '''import numpy as np
rng = np.random.default_rng(1)
# ---- 1. 设备受限路由：跨机流量 ----
N, K, M, nodes = 256, 8, 4, 32
exp_node = rng.choice(nodes, N)                   # 专家随机分布到 32 台机
T = 2000
top = np.argsort(-rng.normal(0, 1, (T, N)), 1)[:, :K]
cross_full = np.mean([len(set(exp_node[row])) for row in top])
limited = []
for row in top:
    nodes_score = {nd: 0.0 for nd in set(exp_node[row])}
    for e in row: nodes_score[exp_node[e]] += 1
    keep = set(sorted(nodes_score, key=nodes_score.get, reverse=True)[:M])
    limited.append(len(keep))
print(f"无约束平均跨机 {cross_full:.1f} 台 → 设备受限 ≤{M} 台（跨机流 ~{cross_full/np.mean(limited):.1f}x 压减）")
# ---- 2. 显存下限 ----
P = 671e9
for name, b in [("bf16", 2), ("fp8", 1), ("int4", 0.5)]:
    gb = P*b/1e9
    print(f"{name}: {gb:.0f} GB → 至少 {int(np.ceil(gb/80))} 张 80G")
# ---- 3. 专家倾斜 ----
load = rng.pareto(1.2, N); load = load/load.sum()
print(f"专家负载 top5% 占比: {np.sort(load)[-13:].sum():.0%}（热点倾斜 → 复制热门专家+token 重组）")'''
G["llm-a4-c3-l1"] = ("1. 复述 MoE 不稳定的三个结构性来源（稀疏梯度/离散路由/负载波动）；\n"
                     "2. 演示 router fp32+专家 bf16 的选择性精度策略；\n"
                     "3. 用负载直方图对比加/不加均衡损失的专家利用率与 all-to-all 通信量级。")
G["llm-a4-c4-l2"] = ("1. 推导细粒度切分的 FLOPs 守恒式 K_fine×d_fine = K·d_ff；\n"
                     "2. 计算 m=4/8 时组合空间 C(mN,mK) 的爆炸量级；\n"
                     "3. 说明共享专家隔离通用知识的机制与 Mixtral→DeepSeek-MoE 的演进逻辑。")
G["llm-a4-c5-l2"] = ("1. 解释专家并行的 all-to-all 为何是跨机瓶颈；\n"
                     "2. 模拟设备受限路由（M≤4）对跨机流量的压减比例；\n"
                     "3. 复述拓扑感知路由的三步实施策略与集群扩展效率收益。")
G["llm-a4-c5-l3"] = ("1. 算清 V3 三种精度的显存下限（bf16 1342GB→≥17 张 80G）；\n"
                     "2. 解释专家负载倾斜的成因与三大生产级应对；\n"
                     "3. 破除『激活 37B 就能小卡部署』的误区并给出选型公式。")
P["llm-a4-c3-l1"] = "- c1/c2 的 MoE 路由与辅助损失；\n- llm-a2 的混合精度。"
P["llm-a4-c4-l2"] = "- c3 的训练稳定性技巧；\n- 组合数 C(n,k) 概念。"
P["llm-a4-c5-l2"] = "- c3 的专家并行与 all-to-all；\n- llm-a2 的 3D 并行。"
P["llm-a4-c5-l3"] = "- 「设备受限路由与 All-to-All」（c5-l2）；\n- llm-b3 的推理引擎概念。"

# ═══════════ llm-a5 数据工程 ═══════════
T["llm-a5","c1"] = dict(
expected="""LLaMA 配比加权质量 ≈ 0.44；把 5% 网页换成代码：加权质量 0.436→0.463，且推理能力增益超出质量账本（代码的语法结构与确定性执行的推理监督）。""",
why=("数据决定上限：同样的结构，语料质量差一点效果差很多；Chinchilla 之后高质量 token 比参数更稀缺。"
     "六大来源各有定位与风险，配比是『覆盖面 × 质量 × 推理能力』的三方权衡——代码数据提升推理是近年最重要发现之一。"),
intuition=("语料配比像熬一锅汤：Common Crawl 是主料（67%，量大腥味重），C4 是滤过的汤底（15%），"
           "书籍是吊鲜的火腿（4.5%），代码是提香的高汤（4.5% 却显著提升推理），维基是盐（4.5%，少量但决定"
           "基本味道）。中文语料还要额外过一遍『简繁混杂、火星文』的筛子。"),
cerr=("照搬 LLaMA 配比做中文模型（67% 英文网页）；书籍/百科直接全量入汤（版权与风格单一）；"
      "代码语料不做许可证过滤埋法律雷。"),
miscon=("1. **『数据越多模型越强』**——重复与低质数据的边际收益趋零，去重 25% 等效 4 倍数据；\\n"
        "2. **『代码只影响编程能力』**——严格语法与确定性结果提供推理监督信号，自然语言任务同样受益；\\n"
        "3. **『高质量来源占比小就没用』**——17.5% 的高质量语料对『说话质量』的影响远超比例。"),
connection=("- **向前**：c2 的七道清洗是本章配比的前置工序；\n"
            "- **向后**：llm-a2 的 Scaling Laws 把 D 当作与 N 同级的一等公民；\n"
            "- **平行**：mining-prep 的特征清洗与本章同源，只是对象从表格换到文本。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 六来源 | 网页/书籍/代码/论文/百科/问答（各有风险）|\n"
         "| LLaMA 配比 | CC 67% + C4 15% + 其余 17.5% |\n"
         "| 代码 | 4.5% 却显著提升推理（结构+确定性）|\n"
         "| 中文 | 需简繁/火星文/中英混杂专项过滤 |\n"
         "| 稀缺 | 高质量 token 快被挖完 → 合成数据变热 |"),
)
T["llm-a5","c2"] = dict(
expected="""①正文提取去掉 nav/script/footer 只剩正文；②规范化折叠空白；④重复行比例 50% > 30% 判为模板页；⑥PII：13812345678 → <PHONE>。""",
why=("原始网页是 HTML 大杂烩：脚本、导航、广告、爬虫陷阱。七道清洗流水线（提取→规范化→语言识别→启发式"
     "→模型打分→有害过滤→去重）决定『垃圾进垃圾出』的下半句能不能成立。"),
intuition=("清洗像食品加工：①去壳（trafilatura 提正文）、②洗净（规范化编码与空白）、③验产地（fastText "
           "语言识别）、④挑拣（启发式规则滤碎渣）、⑤品控员（质量分类器打分）、⑥摘除有害物（色情/PII）、"
           "⑦称重去重。每一步都要抽样人审——规则过猛会把诗歌和方言误杀。"),
cerr=("规范化用 NFKC 把全角字符统一，破坏代码块与数学公式；启发式规则一刀切（长度 <200 全删），"
      "误杀短而精的 FAQ；语言识别置信度阈值过低，混入大量机器翻译页。"),
miscon=("1. **『清洗越狠越好』**——过度清洗删掉长尾知识，RefinedWeb 的经验是规则要逐条按人工抽检校准；\\n"
        "2. **『质量分类器=维基正例就够』**——正负例都要覆盖多样性，否则分类器学到『像维基』而非『高质量』；\\n"
        "3. **『PII 过滤可以后置』**——隐私与版权风险必须在入库前处理，事后删除追不回已训练的模型。"),
connection=("- **向前**：c1 的来源质量决定清洗力度；\n"
            "- **向后**：c3 的去重是流水线最后一道闸门；\n"
            "- **平行**：llm-b1 的 RAG 文档预处理复用本章的提取与规范化工具。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 七道关 | 提取→规范化→语言→启发式→打分→有害→去重 |\n"
         "| 提取 | trafilatura 推荐，人工标注 200 页评 P/R |\n"
         "| 启发式 | 长度/词长/符号比/重复行/停用词 |\n"
         "| 分类器 | 维基正例 vs 随机网页负例二分类 |\n"
         "| 克制 | 过度处理破坏代码/公式/表格 |"),
)
T["llm-a5","c3"] = dict(
expected="""Jaccard（原文,转载）=0.37、（原文,无关）=0.00；MinHash 64 维签名估计 0.34≈真值；LSH(b=32,r=2) 只撞出候选对 (原文,转载)，无关对不撞。""",
why=("去重是性价比最高的数据优化：C4 模糊去重 25% 后效果等同 4 倍数据量。重复数据让模型背诵训练集、"
     "浪费算力并放大隐私与版权风险——三层去重从便宜到贵，MinHash+LSH 抓『改了几个字』的转载。"),
intuition=("去重像海关安检三层岗：URL 岗（同一页面多次闯关）、精确哈希岗（整篇复读）、MinHash 岗"
           "（换了马甲的转载——shingle 指纹高度重合）。LSH 分带是把『两两比对』变成『按指纹分桶』："
           "只有任意一个 band 撞桶才需要细查，上亿文档几小时跑完。"),
cerr=("只做精确哈希，改字转载全数漏网；shingle 的 k 取 1，Jaccard 被高频词淹没；LSH 的 b/r 配比失衡，"
      "要么召回不足漏掉重复、要么误杀海量相似但不重复的文档。"),
miscon=("1. **『去重损失数据量』**——重复 token 不提供新信息，去重后的等效数据量反而变大；\\n"
        "2. **『MinHash 签名越长越好』**——128~256 已够，更长只增加存储与计算；\\n"
        "3. **『去重只在文档级』**——段落级去重对转载聚合页同样关键，且要先便宜后昂贵排序。"),
connection=("- **向前**：c2 的七道清洗把去重排在最后（最贵的一关）；\n"
            "- **向后**：llm-a2 的 MinHash 与本章同一数学内核；\n"
            "- **平行**：llm-b3 的 SFT 数据去重清单复用本章工具。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 三层 | URL 级 → 文档/段落精确哈希 → MinHash 模糊 |\n"
         "| 顺序 | 从便宜到贵，先精确后模糊 |\n"
         "| 定理 | P(minhash 相同) = Jaccard |\n"
         "| LSH | b×r 分带撞桶，O(n²)→近似 O(n) |\n"
         "| 收益 | 去 25% 重复 ≈ 4 倍数据效果 |"),
)
C[("llm-a5","c1")] = '''ratio = {"Common Crawl": 67, "C4": 15, "GitHub": 4.5, "Wikipedia": 4.5, "Books": 4.5, "arXiv": 2.5, "StackExchange": 2}
quality = {"Common Crawl": 0.3, "C4": 0.5, "GitHub": 0.85, "Wikipedia": 0.95, "Books": 0.9, "arXiv": 0.88, "StackExchange": 0.8}
wq = sum(v/100*quality[k] for k, v in ratio.items())
print("LLaMA 配比:", ratio)
print(f"加权平均质量 ≈ {wq:.2f}（网页占 82% 但高质量 17.5% 主导说话质量）")
# 模拟：把 5% 网页换成代码
r2 = dict(ratio); r2["Common Crawl"] -= 5; r2["GitHub"] += 5
wq2 = sum(v/100*quality[k] for k, v in r2.items())
print(f"CC→代码 5%: 加权质量 {wq:.3f} → {wq2:.3f}，且推理能力增益超出质量账本")'''
C[("llm-a5","c2")] = '''import re
raw = "<html><nav>首页|登录</nav><p>退货政策：7 天无理由退货。</p><p>退货政策：7 天无理由退货。</p><script>ads()</script><footer>友情链接</footer></html>"
# ① 正文提取
text = re.sub(r"<(script|nav|footer)[^>]*>.*?</\\1>", "", raw, flags=re.S)
text = re.sub(r"<[^>]+>", "", text).strip()
print("①提取:", text)
# ② 规范化
text2 = re.sub(r"\\s+", " ", text)
print("②规范化:", text2)
# ④ 启发式：重复行比例
lines = [l for l in text.split("。") if l]
dup_ratio = 1 - len(set(lines))/len(lines)
print(f"④重复行比例 {dup_ratio:.0%}（>30% 判为模板页 → 需去重/降权）")
# ⑥ PII
pii = "联系张三 13812345678"
masked = re.sub(r"1[3-9]\\d{9}", "<PHONE>", pii)
print("⑥PII 脱敏:", masked)'''
C[("llm-a5","c3")] = '''import hashlib
def shingles(t, k=3): 
    w = t.split(); return set(" ".join(w[i:i+k]) for i in range(len(w)-k+1))
def jaccard(a, b): return len(a & b)/len(a | b)
docs = {"原文": "今天 天气 很好 我们 一起 去 公园 散步 然后 吃 了 午饭 然后 回家 睡觉",
        "转载": "今天 天气 不错 我们 一起 去 公园 走走 然后 吃 了 午饭 然后 回家 睡觉",
        "无关": "机器 学习 需要 大量 数据 与 算力 数据 质量 决定 上限"}
S = {n: shingles(t) for n, t in docs.items()}
print(f"Jaccard 原文-转载 {jaccard(S['原文'], S['转载']):.2f} | 原文-无关 {jaccard(S['原文'], S['无关']):.2f}")
def h(x, s): return int(hashlib.md5((str(s)+x).encode()).hexdigest()[:8], 16)
sig = {n: [min(h(x, s) for x in S_) for s in range(64)] for n, S_ in S.items()}
sig_sim = lambda a, b: sum(x == y for x, y in zip(sig[a], sig[b]))/64
print(f"MinHash 估计: 原文-转载 {sig_sim('原文','转载'):.2f}（近似 Jaccard）")
b, r = 32, 2
buckets = {}
for n, s in sig.items():
    for i in range(b): buckets.setdefault((i, tuple(s[i*r:(i+1)*r])), []).append(n)
pairs = {(v[i], v[j]) for v in buckets.values() if len(v) > 1 for i in range(len(v)) for j in range(i+1, len(v))}
print("LSH 撞桶候选对:", pairs, "（仅相似对，无关对不撞）")'''
G["llm-a5-c1-l1"] = ("1. 列出六大来源的规模/质量/价值/风险并复述 LLaMA 配比；\n"
                     "2. 解释代码数据提升推理能力的四个可能原因；\n"
                     "3. 为中文模型调整来源清单并指出额外过滤项。")
G["llm-a5-c2-l1"] = ("1. 画出七道清洗流水线并为每道选择工具与阈值；\n"
                     "2. 实现正文提取/规范化/PII 脱敏的最小代码；\n"
                     "3. 说明启发式规则与质量分类器的分工及过度清洗的风险。")
G["llm-a5-c3-l1"] = ("1. 列出三层去重与各自抓取对象，说明『先便宜后贵』的排序原则；\n"
                     "2. 证明 MinHash 核心定理 P(签名相同)=Jaccard 并用代码验证；\n"
                     "3. 用 LSH 分带把 O(n²) 降为近似 O(n)，调 b/r 平衡召回与精确。")
P["llm-a5-c1-l1"] = "- llm-a2 c8 的数据速览；\n- 无其他硬前置。"
P["llm-a5-c2-l1"] = "- 「预训练语料的六大来源」（c1-l1）；\n- 正则表达式基础。"
P["llm-a5-c3-l1"] = "- 「七道清洗流水线」（c2-l1）；\n- 集合与哈希基础。"

WHY = {k: v["why"] for k, v in T.items()}
INTU = {k: v["intuition"] for k, v in T.items()}
EX.update({k: v.get("expected", "") for k, v in T.items()})

MD = {}
for lid, goals in G.items():
    course = lid.rsplit("-c", 1)[0]
    ch = "c" + lid.split("-c")[1].split("-")[0]
    key = (course, ch)
    MD[lid] = build_md(LIBS[course].orig_content(lid), goals, P[lid], WHY[key], INTU[key],
                       C[key], EX[key], T[key]["cerr"], T[key]["miscon"],
                       T[key]["connection"], T[key]["summary"], REFS[course])

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    for key in C:
        print("=" * 20, key[0], key[1])
        exec(compile(C[key], "%s-%s" % key, "exec"), dict(globals()))
    print("VERIFY-ONLY")
elif not all(EX.values()):
    print("expected 未填:", [k for k in EX if not EX[k]])
else:
    for lid in G:
        LIBS[lid.rsplit("-c", 1)[0]].patch_lesson(lid, MD[lid])
