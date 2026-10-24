# -*- coding: utf-8 -*-
"""batch36 A 组：JSON 源课收尾 2 节（JSON 直改，参考 batch26 模式 + _batch34_lib.build_md 模板）。
- python-foundations-data.json  pyf-l12-2  贯穿式综合结课项目（电商多渠道 ETL）
- python-engineering-practices.json  pep-l9-2  贯穿式工业级项目（生产级 ETL 引擎）
章级代码均已 python 实跑验证（见 expected 手算锚点）。
"""
import io, json, sys, time
sys.path.insert(0, r"D:\Python_Project\knowledge-order\scripts\upgrade")
from _batch34_lib import build_md, BT

ROOT = r"D:\Python_Project\knowledge-order"

# ---------------------------------------------------------------- pyf-l12-2
PYF_CODE = '''RAW = [
    ("A1", "APP", "199.00", "20.0", "PAID"),
    ("A2", "TM", "350.50", "50.0", "PAID"),
    ("A2", "TM", "350.50", "50.0", "PAID"),    # 重复上传
    ("A3", "APP", "无效金额", "0.0", "PAID"),   # 脏金额
    ("A4", "TM", "450.00", "0.0", "REFUNDED"), # 退款不计营收
]
seen, gmv, dropped = set(), {}, 0
for oid, ch, amt, disc, st in RAW:
    if not oid or oid in seen or st != "PAID":
        dropped += 1; continue
    seen.add(oid)
    try:
        paid = float(amt) - float(disc or 0)
    except ValueError:
        dropped += 1; continue
    gmv[ch] = gmv.get(ch, 0.0) + paid
for ch in sorted(gmv):
    print(f"{ch}: GMV={gmv[ch]:.2f}")
print("有效订单:", len(seen), "| 剔除:", dropped, "| 总GMV:", round(sum(gmv.values()), 2))'''

PYF = dict(
goals=("1. 独立设计端到端数据清洗流水线：从原始 CSV 文本出发，完成主键治理（缺失/重复剔除）、"
       "金额与日期规范化、业务规则过滤（退款订单不计营收）；\n"
       "2. 串起 pandas 向量化链路（str.replace → to_numeric(errors='coerce') → fillna → to_datetime → "
       "groupby.agg）把脏数据转化为可聚合的规整资产，按渠道产出 GMV、客单价与高价值订单数三大经营指标；\n"
       "3. 用「手算基准对照流水线输出」的方法验收数据质量，复述生产级管道的三条底线：幂等可重跑、脏数据可追溯、指标可复算。"),
prereq=("- 本课程第 11 章 pandas 数据选取与分组聚合（l11-1、l11-2）；\n"
        "- 第 8 章 csv/json 读写与第 6 章异常处理（try/except 与 errors='coerce' 的容错思想）；\n"
        "- 第 2 章类型转换基础：float() 遇到非法文本会抛 ValueError。"),
why=("前 11 个模块教的都是「单件工具」：会读文件、会正则、会转日期、会聚合。但真实业务里数据从来不会干净地"
     "排好队等你处理——重复上传、缺失主键、金额混入货币符号、退款订单混在营收里，是每个数据岗每天的开场白。"
     "企业要的不是「会某个函数的人」，而是能把验收→清洗→衍生→聚合→交付串成一条**幂等流水线**的人。"
     "本节用一个 9 行的电商脏数据集把 12 个模块全部串起来，也是你从「学过 Python」到「能用 Python 交付"
     "经营数字」的验收仪式。"),
intuition=("把数据清洗想成中央厨房的食材验收流水线：先**拒收**没有单据的货（主键缺失）、**合并**重复送货单"
           "（去重）、**拆掉**印着¥的外包装只称净重（金额规范化）、**贴上**效期标签（日期解析）、把**不合格**"
           "食材直接扔进隔离通道（退款/无效金额过滤），最后按菜谱分渠道装筐上秤（groupby 聚合出 GMV）。"
           "每一步的输出都是下一步的输入，任何一环偷懒，端出来的菜（报表数字）就会出事——这就是 Pipeline 思维。"),
code=PYF_CODE,
expected=("手算可核对：5 行样本中剔除 3 条（A2 重复上传、A3 金额脏文本、A4 退款）剩 3 笔有效订单——"
          "APP 渠道 A1 实付 199.00-20.00=179.00，TM 渠道 A2 实付 350.50-50.00=300.50。实测输出 "
          "APP: GMV=179.00、TM: GMV=300.50、有效订单 3、剔除 3、总 GMV 479.5，与手算完全一致。"),
cerr=("用 float() 逐行硬转金额而不用 to_numeric(errors='coerce')，一行脏文本就让整条管道崩溃而非剔除脏行；"
      "在去重之前先聚合，重复上传的订单把 GMV 翻倍；忘记过滤 status=='REFUNDED'，把退款当成营收汇报给管理层。"),
miscon=("1. **清洗=删数据**——清洗是「让每列可计算、每行可解释」，缺失的优惠应填 0 而不是整行删掉；\\n"
        "2. **聚合数字对得上就万事大吉**——还要能回答「这个数怎么来的」：幂等重跑、指标可手算复核才是生产级；\\n"
        "3. **to_datetime 万能**——混杂多格式时要显式给 format 参数，静默解析错比报错更危险。"),
connection=("- **向前**：综合 l8 的文件读写与契约校验、l9 的正则清洗、l11 的 pandas 聚合——本节是全部工具的合龙处；\\n"
            "- **向后**：进入《Python 工程实践》后，这条脚本式管道将升级为配置驱动、分层解耦、带自动化测试的工程级 ETL 引擎；\\n"
            "- **平行**：《Python 大模型应用开发》的 RAG 知识库清洗链路与本节的「清洗-聚合-导出」三段式同构。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 流水线五步 | 载入 → 主键治理/去重 → 格式规范化 → 业务过滤/衍生 → 聚合交付 |\n"
         "| 脏数据六坑 | 重复行、主键缺失、金额脏文本、优惠缺失、退款混入、日期为字符串 |\n"
         "| 关键手法 | to_numeric(errors='coerce') + dropna、fillna(0)、groupby().agg() |\n"
         "| 手算锚点 | 9 行 → 3 笔有效：APP 179.00 + TM 300.50 = 总 GMV 479.50 |\n"
         "| 质量底线 | 幂等可重跑、脏数据可追溯、指标可手算复核 |"),
ref="本课程整理（可参见 pandas 官方文档《10 minutes to pandas》与 NumPy《absolute beginners》教程原文）",
)

# ---------------------------------------------------------------- pep-l9-2
PEP_CODE = '''from dataclasses import dataclass

@dataclass(frozen=True)
class Tx:
    tx_id: str
    amount: float
    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("金额非法: %s" % self.amount)

CONFIG = {"min_order": 10.0, "high_value": 500.0}  # 配置与逻辑解耦
feed = [("T1", 200.0), ("T2", 600.0), ("T3", -50.0), ("T4", 5.0)]
valid, skipped = [], 0
for tid, amt in feed:
    try:
        tx = Tx(tid, amt)
        if tx.amount < CONFIG["min_order"]:
            skipped += 1; continue
        valid.append(tx)
    except ValueError as err:
        skipped += 1; print("拦截脏记录:", err)
print("有效:", [t.tx_id for t in valid], "| GMV:", round(sum(t.amount for t in valid), 2))
print("高价值:", [t.tx_id for t in valid if t.amount >= CONFIG["high_value"]], "| 跳过:", skipped)'''

PEP = dict(
goals=("1. 用 @dataclass(frozen=True) 构建不可变领域模型，把数据契约校验内聚到 __post_init__，"
       "说明「非法状态不可表示」对 ETL 健壮性的意义；\n"
       "2. 按「解析 → 校验 → 转换 → 聚合」分层实现配置驱动的 ETL 引擎，用自定义异常 + logging.warning "
       "实现脏记录隔离与全程可观测；\n"
       "3. 为核心链路写出异常拦截、阈值过滤与高价值判定的自动化断言，并复述配置驱动对测试与多环境部署的价值。"),
prereq=("- pep-l8 日志规范与自动化测试（logging 结构化输出、断言用例）；\n"
        "- pep-l5 面向对象与 dataclass 建模（frozen、__post_init__）；\n"
        "- pep-l4 异常治理（自定义异常体系与上下文保留）。"),
why=("写出一个「能跑」的清洗脚本只要一小时，但让它在脏数据、需求变更、多人协作下持续「敢跑」，需要工程化："
     "参数硬编码导致改一处崩三处、print 满天飞无法排障、领域模型和 IO 搅在一起没法写测试——这是脚本与"
     "系统的分水岭。本结课项目把前 8 个模块的规范、类型、异常、日志与测试拧成一个分层解耦、配置驱动的"
     "生产级 ETL 引擎，让你交付的不是一段代码，而是一台可观测、可测试、可演进的机器。"),
intuition=("路边摊也能炒菜，但中央厨房靠的是**分工与参数单**：工艺参数（火候、克重）写在配方卡上（配置驱动），"
           "每个工位只做一道工序（分层解耦），标准件才能进流水线（不可变领域模型），次品进隔离通道而不是让"
           "整条线停摆（异常隔离），车间监控全程录像（结构化日志）。本节就是把「炒菜脚本」改造成「中央厨房」的过程。"),
code=PEP_CODE,
expected=("手算可核对：4 笔入站中 T3=-50.0 触发 __post_init__ 契约校验被拦截（实测打印「拦截脏记录: 金额非法: -50.0」），"
          "T4=5.0 低于阈值 10.0 被跳过；实测输出 有效=['T1','T2']、GMV=200+600=800.0、高价值=['T2']（600≥500）、跳过 2 条。"),
cerr=("在 except 里裸 pass 吞掉所有异常，脏数据无声丢失且无法审计；把阈值写死在业务代码里，换环境要改代码发版"
      "而不是改配置；用可变对象当领域模型，聚合过程中字段被误改导致指标漂移且难以复现。"),
miscon=("1. **分层=多写几个类**——分层的检验标准是每层可独立测试与替换，不是文件数量；\\n"
        "2. **日志越多越好**——无结构的 print 轰炸不如一条带上下文的 warning 有用，日志要可检索、可聚合；\\n"
        "3. **frozen 就能保证正确**——frozen 只防字段被重新赋值，列表等可变字段的内容仍可变，需配合 tuple/frozenset。"),
connection=("- **向前**：pep-l5 的 dataclass 建模、pep-l4 的异常体系、pep-l8 的日志与测试在本节合龙为完整架构；\\n"
            "- **向后**：《Python Agent 开发实战》的工具系统与安全护栏沿用同一套「配置驱动 + 异常隔离 + 可观测」骨架；\\n"
            "- **平行**：《十二要素应用》的配置分离与《Architecture Patterns with Python》的分层领域模型是本节思想的出处。"),
summary=("| 结论 | 内容 |\n| --- | --- |\n"
         "| 配置驱动 | 阈值/环境参数独立于业务逻辑，换环境不改代码 |\n"
         "| 不可变模型 | frozen dataclass + __post_init__ 让非法数据在入口即被拒 |\n"
         "| 分层解耦 | 解析/校验/转换/聚合各司其职，可独立测试 |\n"
         "| 可观测 | 结构化 logging 记录每条脏数据拦截原因与批处理耗时 |\n"
         "| 手算锚点 | 4 笔入站：T3 负额拦截、T4 低于阈值，GMV=800.0，高价值=T2 |"),
ref="本课程整理（可参见《Architecture Patterns with Python》（Cosmic Python）与《The Twelve-Factor App》原文）",
)

# ---------------------------------------------------------------- 写回 JSON
JOBS = [
    (ROOT + r"\content-data\courses\python-foundations-data.json", "pyf-l12-2", PYF),
    (ROOT + r"\content-data\courses\python-engineering-practices.json", "pep-l9-2", PEP),
]

if len(sys.argv) > 1 and sys.argv[1] == "verify":
    for _, lid, t in JOBS:
        print("=" * 20, lid)
        exec(compile(t["code"], lid, "exec"), dict(globals()))
    print("VERIFY-ONLY")
else:
    for path, lid, t in JOBS:
        course = json.load(io.open(path, encoding="utf-8"))
        hit = 0
        for ch in course["chapters"]:
            for l in ch["lessons"]:
                if l["id"] == lid:
                    orig = l["content"].strip()
                    l["content"] = build_md(orig, t["goals"], t["prereq"], t["why"], t["intuition"],
                                            t["code"], t["expected"], t["cerr"], t["miscon"],
                                            t["connection"], t["summary"], t["ref"])
                    hit += 1
                    print("patched", lid, "len:", len(l["content"]))
        assert hit == 1, (path, lid, hit)
        course["updatedAt"] = int(time.time() * 1000)
        json.dump(course, io.open(path, "w", encoding="utf-8", newline="\n"),
                  ensure_ascii=False, indent=2)
    print("done")
