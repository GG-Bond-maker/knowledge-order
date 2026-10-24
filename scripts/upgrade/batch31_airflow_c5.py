# -*- coding: utf-8 -*-
"""batch31: Airflow 课程第 5 章（XCom 通信与大对象）章主题包升级"""
import json, io
P = r"D:\Python_Project\knowledge-order\content-data\courses\airflow-data-engineering.json"
c = json.load(io.open(P, encoding="utf-8"))
BT3 = chr(96) * 3
N = 5

THEME = dict(
why="任务 A 算出的行数、文件路径、批次号，任务 B 怎么拿到？Airflow 的答案是把这张『小纸条』写进元数据库，再由下游按 (dag_id, task_id, key, 日期) 精确取回。机制优雅，坑也深：元数据库有字节红线、对象要能序列化、一个 DataFrame 就能打爆全站、垃圾 XCom 会无限膨胀。这一章把 XCom 从『会用』讲到『敢托付生产』：底层 API、事故复盘、自定义后端直到指针传递法则与清理作业。",
intuition="XCom 是调度世界的『传菜窗口小票』：后厨每个工位（任务）做完菜不直接把锅端给下一工位，而是把要点写在小票上放进窗口（元数据库），下一工位按桌号（task_id + key + 日期）取票。小票该写『3 号桌的菜在保温柜第二层』（指针），绝不该把整锅汤泼在窗口上（传 DataFrame）——窗口只有那么大（字节限制），泼了汤整个餐厅跟着瘫痪（元数据库被打爆）。",
code="""import pickle

XCOM = []                              # 元数据库中的 xcom 表（简化）

def push(task_id, key, value):
    blob = pickle.dumps(value)
    if len(blob) > 48:                 # 模拟元数据库大小红线（真实约几十 KB 起）
        raise ValueError(f"{len(blob)} 字节超限：应传对象存储指针，不传数据")
    XCOM.append(("etl", task_id, key, blob))

def pull(task_id, key="return_value"):  # 按 (dag, task, key) 精确寻址
    for d, t, k, b in reversed(XCOM):
        if (d, t, k) == ("etl", task_id, key):
            return pickle.loads(b)

push("extract", "return_value", [1, 2, 3])
print("小对象取回:", pull("extract"))
try:
    push("extract", "df", list(range(10_000)))
except ValueError as e:
    print("大对象拦截:", e)
push("extract", "s3_uri", "s3://lake/dt=2026-10-22/")
print("指针取回:", pull("extract", "s3_uri"), "← 生产正确姿势")""",
expected="小对象取回: [1, 2, 3]；大对象拦截: 29778 字节超限：应传对象存储指针，不传数据；指针取回: s3://lake/dt=2026-10-22/ ← 生产正确姿势——同一个通道，小信号畅通、大对象被拦、指针通行。",
cerr="默认以为 XCom 能传任意大小——元数据库单行有字节红线（视后端几十 KB 起），超限直接报错；push 了不可序列化对象（数据库连接句柄、未注册的自定义类），Worker 上序列化崩溃才暴露；只 push 不清，XCom 表无限膨胀拖慢 Scheduler 与 UI，必须配套清理作业。",
miscon="""1. **『XCom 是消息队列』**——它是元数据库里的一张表：每次读写都是一次 DB 往返，容量、性能、GC 都按数据库来思考，与 Kafka 类队列完全不同量级；
2. **『报错就把限制调大』**——加大 PostgreSQL 字段限制治标不治本：Scheduler 读写变慢、序列化内存暴涨；正解是自定义 S3/GCS 后端或干脆传指针；
3. **『传个 DataFrame 反正能跑』**——大对象会阻塞 Worker 序列化数分钟并打爆元数据库；传 parquet 路径，让下游自己读，才是生产姿势。""",
connection="""- **向前**：第 4 章的 XComArg 是本章机制在解析期的门面，本章讲清运行期那张『小票』如何落库；
- **向后**：第 10 章动态映射的 expand 直接消费上游 XCom 列表，第 9 章幂等性决定重跑时 XCom 被覆盖得对不对；
- **平行**：《dbt 分析工程》用仓内表而非 XCom 传状态——『大对象走存储、小信号走总线』是两门课共同的铁律。""",
summary="""| 结论 | 内容 |
| --- | --- |
| 本质 | 元数据库中的一张表，按 (dag, task, key, 日期) 寻址的小信号总线 |
| 两条 API | push(task_id, key, value) / pull(task_ids, key)，默认键 return_value |
| 大对象铁律 | 传指针（S3 URI/表名），不传数据；DataFrame 必须走对象存储 |
| 逃生通道 | 自定义 XCom Backend 桥接 S3/GCS；序列化器可插拔 |
| 运维 | 定期清理过期 XCom，防元数据库膨胀拖垮全站 |""",
)

GOALS = {
"airflow-l5-1": "1. 说出 XCom 的存储位置与寻址键的组成；\n2. 区分 XCom（小信号总线）与消息队列/文件通道的适用边界；\n3. 解释 return_value 默认自动推送机制。",
"airflow-l5-2": "1. 精确使用 xcom_push(key=...) 与 xcom_pull(task_ids=..., key=...)；\n2. 说明多 push 多 pull 的匹配规则与日期维度；\n3. 排查 pull 到 None 的三类常见原因。",
"airflow-l5-3": "1. 复盘 DataFrame 经 XCom 打爆内存/元数据库的事故链路；\n2. 估算给定对象序列化后的大小是否适合 XCom；\n3. 给出大对象传递的标准替代方案。",
"airflow-l5-4": "1. 说明 PostgreSQL 字段限制与各序列化器的差异；\n2. 诊断序列化异常（类型不支持/循环引用）；\n3. 配置 XCom 垃圾回收与保留策略。",
"airflow-l5-5": "1. 实现自定义 XCom Backend 桥接 S3；\n2. 说明后端接口的序列化/反序列化契约；\n3. 评估引入自定义后端的迁移与兼容成本。",
"airflow-l5-6": "1. 在 DAG 中贯彻『传指针/表名而非数据』法则；\n2. 设计下游按指针自主读取的任务接口；\n3. 说明该法则对重跑与幂等的贡献（联动第 9 章）。",
"airflow-l5-7": "1. 编写 XCom 清理维护 DAG（按日期/按 DAG 维度）；\n2. 设定保留窗口与清理频率的权衡；\n3. 监控 XCom 表增长趋势防患于未然。",
}

PREREQS = {
"airflow-l5-1": "- 「任务间数据流传」（l4-3）——TaskFlow 已在隐式使用 XCom；\n- 元数据库的基本概念（l1-3）。",
"airflow-l5-2": "- 「XCom 的本质」（l5-1）。",
"airflow-l5-3": "- 「底层 API」（l5-2）；\n- 对 DataFrame 内存布局的基本认识。",
"airflow-l5-4": "- 「致命反模式」（l5-3）——先见事故再谈底层限制。",
"airflow-l5-5": "- 「元数据库限制与排障」（l5-4）；\n- Python 类方法与序列化概念。",
"airflow-l5-6": "- 「致命反模式」（l5-3）与「元数据库限制与排障」（l5-4）的解法汇总。",
"airflow-l5-7": "- 全章汇合，尤其「元数据库限制与排障」（l5-4）。",
}

ch = c["chapters"][N-1]
for l in ch["lessons"]:
    if "学习目标" in l["content"]: continue
    lid = l["id"]
    l["content"] = (f"### 学习目标\n\n学完本节，你应该能够：\n{GOALS[lid]}\n\n"
        f"### 前置知识\n\n{PREREQS[lid]}\n\n"
        f"### 问题背景\n\n{THEME['why']}\n\n### 直觉理解\n\n{THEME['intuition']}\n\n"
        f"### 核心概念与原理详解\n\n{l['content'].strip()}\n\n"
        f"### 完整案例（含手算）\n\n以下代码完整演算本章主题的核心流程：\n\n"
        f"### 代码实践\n\n{BT3}python\n{THEME['code']}\n{BT3}\n\n预期输出（实测）：{THEME['expected']}\n\n**常见错误**：{THEME['cerr']}\n\n"
        f"### 常见误区\n\n{THEME['miscon']}\n\n### 知识关联\n\n{THEME['connection']}\n\n"
        f"### 本节总结\n\n{THEME['summary']}\n\n"
        f"### 参考资料\n\n> **来源类型：参考资料**\n> - 本课程整理（可参见 Apache Airflow 官方文档 docs.airflow.io 相应章节）")
c["updatedAt"] = int(__import__("time").time()*1000)
json.dump(c, io.open(P,"w",encoding="utf-8",newline="\n"),ensure_ascii=False,indent=2)
print("chapter", N, "done,", len(ch["lessons"]), "lessons")
