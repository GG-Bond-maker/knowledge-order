# -*- coding: utf-8 -*-
"""
Chapter 5: 工业级部署与端到端 Capstone 项目实战 (Model Deployment & End-to-End Production Capstone)
Course: ml-engineering
"""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from common import tip, demo, lesson, single_choice, multiple_choice, judge, fill, open_ex, chapter

def get_chapter_5():
    # ── Lesson 5.1 ──
    l1_content = """### 学习目标
学完本节，你应该能够：
1. 掌握机器学习模型序列化（Serialization）与持久化的底层机制；
2. 深刻识别传统 Python 原生 Pickle / Joblib 的致命安全缺陷（任意代码执行漏洞 CVE）与跨版本依赖地狱；
3. 掌握开放神经网络交换标准 **ONNX（Open Neural Network Exchange）** 的计算图拓扑结构与类型安全；
4. 掌握微软 **ONNX Runtime** 高性能推理引擎的算子融合（Operator Fusion）与极速 C++ 运行时并发优势；
5. 掌握基于 FastAPI 与 Pydantic 的工业级低延迟微服务架构设计与 Docker 容器化标准封装；
6. 编写代码使用 Joblib/ONNX 导出完整特征工程与模型管道，实现单条请求的毫秒级高并发在线推理。

### 前置知识
- Python 二进制文件 I/O；
- RESTful HTTP 接口与 JSON 数据规范。

### 问题背景与 ML 用途
在真实的软件工程产线中，“在 Jupyter Notebook 里跑通了代码”仅仅完成了整个机器学习生命周期的 20%：
- **版本与依赖断崖**：数据科学家在 Python 3.11、Scikit-learn 1.4 环境下训练出来的模型，如果通过 Pickle 存储并直接发给线上运行在 Go/Java 或低版本 Python 容器的服务器，往往会报出致命的 `ImportError` 或反序列化崩溃；
- **安全红线**：Pickle 文件在 `pickle.load()` 时具有无限制执行任意字节码的能力，接收不可信的模型文件相当于向黑客拱手让出整个服务器 root 权限；
- **推理延迟瓶颈**：在线广告竞价（RTB）或高频量化交易要求模型在 10 毫秒以内返回结果，Python 运行时的 GIL 锁与解释执行开销无法满足严苛的吞吐要求。
**ONNX 跨平台中间表征与 FastAPI 异步服务化构成了现代机器学习生产部署的黄金搭档**。

### 直觉理解
- **建筑施工图的跨国标准化（ONNX）**：
  - 如果设计师用只有自己电脑才能打开的草稿软件（Pickle）画了一张图纸，给到国外的施工队（C++ 后端、Android 客户端、iOS 芯片），施工队根本无法读取，或者一打开就炸毁电脑（安全漏洞）；
  - ONNX 就像通用的 **国际建筑标准蓝图（PDF / CAD 矢量标准）**：它用抽象严格的数学计算图节点（矩阵乘、加法、Sigmoid）定义网络结构。无论施工队用的是 C++、Java、Rust 还是嵌入式边缘硬件，都可以直接调用专用的加速引擎（ONNX Runtime）以纯机器码超高速建造！

### 核心概念与符号对照表
| 部署工具 | 运行架构 | 典型延迟 | 优缺点对比 |
| --- | --- | --- | --- |
| **Joblib / Pickle** | Python 原生字节码对象持久化 | 10~50 ms (受 GIL 限制) | 简单方便；但存在**致命安全漏洞**且强绑定特定 Python 版本 |
| **ONNX Runtime** | 跨平台静态计算图，纯 C++ 执行 | **1~5 ms (提升 3~10 倍)** | 消除 Python 依赖，支持图优化与多线程并发，极度安全高效 |
| **FastAPI + Pydantic** | 异步非阻塞 ASGI 微服务 | 网络传输 5~15 ms | 自动执行入参强类型校验，原生支持 OpenAPI Swagger 交互文档 |
| **Docker 镜像** | 操作系统级轻量虚拟化隔离 | 一致性交付 | 保证开发、测试、生产环境 100% 依赖环境绝对一致 |

### 真实代码示例与分析
下面展示如何将完整的端到端 Pipeline 序列化持久化并模拟在线微服务实时调用："""

    l1_code = """import numpy as np
import pandas as pd
import io
import joblib
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

# 1. 训练一个生产级二分类流水线
X_train = np.array([[20.0, 50000.0], [45.0, 120000.0], [35.0, 80000.0], [50.0, 30000.0]])
y_train = np.array([0, 1, 1, 0])

pipeline = Pipeline([
    ('scaler', StandardScaler()),
    ('clf', LogisticRegression(random_state=42))
])
pipeline.fit(X_train, y_train)

# 2. 模型持久化: 模拟保存至二进制流 (工业界写入 .joblib 文件)
buffer = io.BytesIO()
joblib.dump(pipeline, buffer)
saved_bytes_size = buffer.tell()
buffer.seek(0)

# 3. 模拟线上推理微服务启动: 加载模型对象
online_model = joblib.load(buffer)

# 4. 模拟线上接收到的单条用户实时 JSON 请求
incoming_request_json = {"age": 42.0, "annual_salary": 95000.0}
feature_vector = np.array([[incoming_request_json["age"], incoming_request_json["annual_salary"]]])

# 5. 执行在线预测 (毫秒级输出)
pred_prob = online_model.predict_proba(feature_vector)[0, 1]
pred_label = int(pred_prob >= 0.5)

print("=== 模型持久化与在线推理微服务流程验证 ===")
print(f"模型序列化后大小: {saved_bytes_size} 字节")
print(f"收到在线请求: {incoming_request_json}")
print(f"模型预测该客户正类概率: {pred_prob:.4f}")
print(f"系统决策输出类别: {pred_label} (通过 API 毫秒级返回响应)")
"""

    l1_tips = [
        tip("安全警报：切勿在生产环境中从公开网络或不受信任的第三方加载 .pkl 或 .joblib 模型文件！恶意攻击者可以在 pickle 构造函数中注入 `os.system('rm -rf /')` 等恶意代码，在反序列化瞬间攻陷服务器。生产环境推荐使用 ONNX 格式。", "pitfall"),
    ]

    # ── Lesson 5.2 ──
    l2_content = """### 学习目标
学完本节，你应该能够：
1. 掌握工业级电信客户流失预测（Telco Customer Churn）项目的端到端全生命周期闭环标准 SOP；
2. 熟练完成真实业务数据的探索性数据分析（EDA）、异常格式清洗与混合异构特征处理；
3. 构建绝无数据泄漏的 `ColumnTransformer` + 现代化提升树（HistGBDT / LightGBM）流水线；
4. 使用 5 折分层交叉验证进行严谨的离线指标评估（联合监控 ROC-AUC 与 PR-AUC）；
5. 结合电信运营商的客户挽留成本（Retention Marketing Campaign）与客户终身价值（LTV）构建**业务收益矩阵，计算最赚钱的最优决策阈值**；
6. 提取全局关键流失驱动因子，并针对高危流失客户输出专属的业务维系策略建议。

### 前置知识
- 前四章全部内容（特征工程 Pipeline、代价敏感阈值调优、模型可解释性归因）。

### 问题背景与 ML 用途
在通信、SaaS 软件与电商订阅制行业中，“**获取一个新客户的成本往往是留存一个老客户的 5 到 7 倍**”：
- 如果等到客户主动拨打客服电话退订，挽回成功率几乎为零；
- 电信流失预测（Telco Churn Prediction）通过监控客户在网时长、合约类型、月度消费波动、上网故障报修频次等动态行为，提前 30 天预测其未来流失倾向；
- 针对预测出的高危流失客户，市场部定向推送“赠送流量包”、“升级优惠合约”等维系策略，帮助企业每年减少数千万元的净收入损失！

### 直觉理解
- **从听诊到精准微创手术（端到端实战）**：
  - 第一步（望闻问切）：观察数据分布，清洗掉杂质；
  - 第二步（化验单归一）：把不同的指标标准化、分类化；
  - 第三步（专家会诊）：5 折交叉验证确保诊断客观无偏；
  - 第四步（经济处方）：不是每个有流失风险的人都发大额优惠券，而是精细计算“发券成本 vs 客户价值”，找到最佳商业盈利阈值！
  - 第五步（术后回访）：通过特征归因清晰告知业务部门“他是因为没有签长期合约而想走”，精准施策！

### 核心概念与符号对照表
| 阶段工序 | 核心输出 | 工业最佳实践 |
| --- | --- | --- |
| **1. 业务定义** | 确定预测目标与经济目标 | 将“提高 AUC”转化为“最大化企业年净挽回挽留收益（ROI）” |
| **2. 防泄漏流水线** | `ColumnTransformer` 异构封装 | 数值列中位数填充+标准化，类别列独热编码，handle_unknown='ignore' |
| **3. 严谨评估** | `StratifiedKFold` (5 折) | 联合监控 ROC-AUC（宏观辨识度）与 PR-AUC（稀有正类纯度） |
| **4. 商业阈值调优** | 最优利润截断点 $p^*$ | 结合单客户挽留成本 $C_{\\text{camp}}$ 与留存价值 $V_{\\text{ret}}$ 寻找净利润顶峰 |

### 真实代码示例与分析
下面展示电信客户流失预测端到端 Capstone 实战的完整执行流程："""

    l2_code = """import numpy as np
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import StandardScaler, OneHotEncoder
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import roc_auc_score, average_precision_score

# 1. 模拟电信客户真实业务数据 (1000 样本，包含在网月数、月消费、合约类型等)
np.random.seed(42)
n_cust = 1000

df_churn = pd.DataFrame({
    'tenure_months': np.random.exponential(scale=20, size=n_cust).clip(1, 72),
    'monthly_charges': np.random.uniform(20.0, 120.0, size=n_cust),
    'total_tickets': np.random.poisson(lam=1.5, size=n_cust),  # 投诉与报修次数
    'contract_type': np.random.choice(['month-to-month', 'one-year', 'two-year'], p=[0.55, 0.25, 0.20], size=n_cust),
    'payment_method': np.random.choice(['electronic_check', 'credit_card', 'bank_transfer'], size=n_cust)
})

# 模拟真实流失因果机制: 月付短约、投诉多、资费高的客户流失率极高
churn_logits = (
    -0.05 * df_churn['tenure_months'] + 
    0.02 * df_churn['monthly_charges'] + 
    0.6 * df_churn['total_tickets'] + 
    np.where(df_churn['contract_type'] == 'month-to-month', 1.2, -0.8) - 1.5
)
churn_prob_true = 1.0 / (1.0 + np.exp(-churn_logits))
df_churn['churn'] = (np.random.rand(n_cust) < churn_prob_true).astype(int)

# 2. 组装工业级防泄漏特征流水线
num_cols = ['tenure_months', 'monthly_charges', 'total_tickets']
cat_cols = ['contract_type', 'payment_method']

preprocessor = ColumnTransformer([
    ('num', Pipeline([
        ('imputer', SimpleImputer(strategy='median')),
        ('scaler', StandardScaler())
    ]), num_cols),
    ('cat', Pipeline([
        ('imputer', SimpleImputer(strategy='most_frequent')),
        ('ohe', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
    ]), cat_cols)
])

churn_pipeline = Pipeline([
    ('prep', preprocessor),
    ('model', HistGradientBoostingClassifier(random_state=42, max_iter=50))
])

# 3. 5 折交叉验证获取完全无偏的 Out-Of-Fold (OOF) 预测概率
X = df_churn[num_cols + cat_cols]
y = df_churn['churn']
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

oof_probs = cross_val_predict(churn_pipeline, X, y, cv=cv, method='predict_proba')[:, 1]
roc_auc = roc_auc_score(y, oof_probs)
pr_auc = average_precision_score(y, oof_probs)

print("=== 电信客户流失 Capstone: 5 折 OOF 泛化评估 ===")
print(f"客户流失发生率: {y.mean() * 100:.1f}%")
print(f"OOF ROC-AUC: {roc_auc:.4f} (宏观排序能力卓越)")
print(f"OOF PR-AUC : {pr_auc:.4f} (精准捕获流失高危人群)")

# 4. 商业商业价值闭环: 最优流失维系活动营销净收益调优
# 商业假设: 单个挽留营销活动成本 50 元; 挽回一名高价值流失客户挽回终身价值 LTV 500 元
campaign_cost = 50.0
recovered_ltv = 500.0

best_thresh = 0.5
max_net_profit = -float('inf')

for th in np.linspace(0.1, 0.9, 81):
    targeted = (oof_probs >= th)
    # 命中真流失客户 (TP) 带来 LTV 挽回收益
    tp = np.sum((y == 1) & targeted)
    # 所有被营销客户 (TP + FP) 消耗营销成本
    cost = np.sum(targeted) * campaign_cost
    profit = tp * recovered_ltv - cost
    if profit > max_net_profit:
        max_net_profit = profit
        best_thresh = th

print(f"\\n=== 商业盈利阈值优化结果 ===")
print(f"最佳营销触发阈值: {best_thresh:.2f}")
print(f"预计产生企业净挽留利润: {max_net_profit:,.0f} 元 (极大超出盲目营销收益!)")
"""

    l2_tips = [
        tip("在工业实战中，永远要将模型评估指标与商业货币回报（ROI）挂钩！纯粹追求从 AUC 0.82 提升到 0.83 的边际收益，往往远不如把决策阈值从默认 0.5 调整到符合企业边际成本的 0.32 带来的真实商业净利润提升显著！", "performance"),
    ]

    lessons = [
        lesson("ml-eng-l5-1", "模型持久化、ONNX 高性能运行时与服务化", l1_content, 3, l1_tips, [demo(code=l1_code, title="Joblib 端到端流水线序列化与在线推理")]),
        lesson("ml-eng-l5-2", "电信客户流失预测端到端 Capstone 实战", l2_content, 3, l2_tips, [demo(code=l2_code, title="电信客户流失预测全流程 SOP 与商业 ROI 阈值调优")]),
    ]

    exercises = [
        single_choice(
            ex_id="ml-eng-c5-ex1",
            question="在将训练好的机器学习模型部署至生产环境微服务时，相较于传统的 Python `pickle.dump()`，采用开放神经网络交换格式 **ONNX（Open Neural Network Exchange）** 的最关键架构优势是什么？",
            options=[
                {"value": "A", "text": "ONNX 采用跨语言强类型的标准计算图定义，消除了对特定 Python 版本与依赖库的硬绑定，且通过 C++ ONNX Runtime 推理引擎可彻底摆脱 Python GIL 锁实现极速低延迟并发，同时彻底根除了 Pickle 的恶意反序列化代码执行漏洞"},
                {"value": "B", "text": "ONNX 可以自动把模型的准确率翻倍"},
                {"value": "C", "text": "ONNX 只能用于在手机上运行，不能用于云端服务器"},
                {"value": "D", "text": "ONNX 导出的模型体积比任何格式都小一千倍"},
            ],
            answer="A",
            explanation="ONNX 是跨平台工业标准。它跨语言、跨硬件，配合 C++ 原生的 ONNX Runtime 能够完成算子融合和硬件加速，极大降低推理延迟，且彻底规避了 Python Pickle/Joblib 面临的恶意字节码任意代码执行（RCE）安全红线。",
            difficulty=2,
            related_lesson_id="ml-eng-l5-1",
            tags=["ONNX", "模型部署", "跨平台推理", "服务化安全"],
        ),
        judge(
            ex_id="ml-eng-c5-ex2",
            question="使用 `pickle.load()` 或 `joblib.load()` 从公开网络或未经认证的外部第三方来源直接加载预训练模型文件是安全的，因为模型权重只是纯粹的浮点数矩阵，不可能包含可执行代码。",
            answer=False,
            explanation="严重错误！Pickle 机制具有图灵完备的反序列化能力。攻击者可以通过重写 `__reduce__` 方法在 pickle 文件内部注入任意系统级命令（如执行恶意反向 shell 或删除数据库）。生产中严禁随意加载不可信的 .pkl 或 .joblib 文件！",
            difficulty=1,
            related_lesson_id="ml-eng-l5-1",
            tags=["Pickle漏洞", "网络安全", "反序列化攻击", "模型安全"],
        ),
        multiple_choice(
            ex_id="ml-eng-c5-ex3",
            question="在工业级电信客户流失预测（Telco Churn）项目的端到端生产交付中，优秀的机器学习工程师必须完成哪些核心环节的闭环构建？",
            options=[
                {"value": "A", "text": "利用 ColumnTransformer 构建包含数值填补标准化与类别编码的高内聚无泄漏特征管道"},
                {"value": "B", "text": "采用分层 K 折（StratifiedKFold）进行 Out-Of-Fold 无偏评估，联合监控 ROC-AUC 与 PR-AUC"},
                {"value": "C", "text": "结合客户维系营销成本与客户终身价值（LTV），通过业务代价矩阵搜索使得企业净挽留利润最大化的最优决策阈值"},
                {"value": "D", "text": "通过 SHAP 提取单客户特征贡献，向市场运营部门输出可执行的高危流失挽留原因清单"},
            ],
            answer=["A", "B", "C", "D"],
            explanation="这四个步骤构成了现代数据科学工业交付的完整 SOP：防泄漏管道封装、严密无偏交叉验证、商业驱动的利润阈值调优、以及面向一线业务的可解释因果归因落地。",
            difficulty=2,
            related_lesson_id="ml-eng-l5-2",
            tags=["Capstone", "端到端实战", "电信流失", "工程闭环"],
        ),
        fill(
            ex_id="ml-eng-c5-ex4",
            question="在利用 FastAPI 构建现代化高性能模型在线预测微服务时，常用于定义入参请求体（Request Body）数据结构并提供自动类型校验与格式清洗的底层核心库是 ___（请填写库名英文全拼，全小写）。",
            blanks=[["pydantic"]],
            explanation="FastAPI 底层基于 Pydantic 构建。通过继承 BaseModel 定义强类型模式，可在请求到达业务逻辑前全自动完成入参数据格式校验与序列化，阻断脏数据。",
            difficulty=2,
            related_lesson_id="ml-eng-l5-1",
            tags=["FastAPI", "Pydantic", "微服务", "数据校验"],
        ),
        open_ex(
            ex_id="ml-eng-c5-ex5",
            question="【综合架构实战题】设想你刚接手一个刚从大学实验室毕业的新人研发的客户流失预测系统：该系统在单脚本中直接对全量数据做了 One-Hot 编码和均值填充，使用默认 0.5 阈值的随机森林，在离线汇报了 92% 的惊人准确率。但运营团队反映：上线两周以来，流失客户依然大面积退订，同时营销部门乱发优惠券导致成本剧增。请根据本课程学到的工程全链路规范，系统给出你的诊断与重构方案。",
            reference_answer="诊断与重构全链路方案如下：\n1. 诊断问题根源：\n- 准确率虚假繁荣：电信流失存在严重样本不平衡（例如流失率仅 10%），92% 的准确率很可能是因为模型全猜不流失（多数类），大量真流失客户被漏判；\n- 严重数据泄漏：在全集上做均值填充与编码，导致测试数据统计量提前渗透，离线泛化指标失真；\n- 决策阈值盲目：死板沿用 0.5 默认阈值，未结合单个优惠券营销成本与客户流失损失（LTV）进行代价权衡，导致 ROI 为负。\n2. 重构与落地方案：\n- 架构重构：使用 Scikit-Learn 的 ColumnTransformer 封装数值中位数填补、标准化和 OneHotEncoder(handle_unknown='ignore')，绑定提升树构成原子 Pipeline，杜绝任何数据泄漏；\n- 验证与评估纠偏：改用 5 折 StratifiedKFold，改用 PR-AUC、ROC-AUC 与查全率（Recall）作为核心监控指标；\n- 商业代价敏感阈值调优：构建预期净利润目标函数 Profit = TP * LTV - (TP + FP) * Campaign_Cost，通过网格搜索计算出让企业净收益最大的最优触发阈值（通常在 0.25~0.35 之间）；\n- 可解释性与工程部署：集成 TreeSHAP，针对每个预测出的高危客户输出Top-3 流失驱动特征，输出至 CRM 推荐引擎；使用 ONNX 格式导出并封装成异步 FastAPI 容器微服务，实现毫秒级在线推理。",
            explanation="全方位诊断数据泄漏、不平衡准确率陷阱与死板阈值的工业病症，系统给出基于防泄漏 Pipeline、PR-AUC 评估、代价敏感利润阈值调优与 SHAP 归因的完整重构闭环。",
            rubric=[
                {"points": 5, "description": "精准指出不平衡数据下的准确率悖论、全局预处理造成的数据泄漏以及 0.5 阈值忽视商业成本的核心痛点"},
                {"points": 5, "description": "系统提出基于 ColumnTransformer Pipeline、PR-AUC/StratifiedKFold、商业 ROI 阈值调优与 SHAP 解释落地的完整工业级重构方案"},
            ],
            difficulty=4,
            related_lesson_id="ml-eng-l5-2",
            tags=["架构实战", "项目重构", "数据泄漏", "商业ROI", "工业闭环"],
        ),
        # ── Code Exercise 5 ──
        {
            "id": "ml-eng-c5-ex6",
            "type": "code",
            "difficulty": 3,
            "question": "【编程实战】实现电信客户流失营销活动净投资回报（ROI）收益计算器：\n编写函数 `calculate_churn_campaign_roi(y_true, y_probs, threshold, ltv_recovered=500.0, campaign_cost=50.0)`：\n1. `y_true`：客户真实流失标签一维数组或列表（1 代表流失，0 代表留存）；\n2. `y_probs`：模型预测客户流失的概率打分一维数组或列表；\n3. `threshold`：营销决策干预阈值（概率大于等于该阈值的客户将被纳入营销挽留活动）；\n4. `ltv_recovered`：成功挽留一名真实流失客户所保护的客户终身价值（LTV）；\n5. `campaign_cost`：向单个客户发起挽留营销行动（如赠送权益/客服回访）的单人固定成本。\n\n规则：\n- 只要预测概率 $\\ge$ `threshold`，判定为营销目标（Positive）；\n- 真正流失客户被成功识别（TP）产生业务挽回价值：$V_{\\text{gain}} = \\text{TP} \\times \\text{ltv_recovered}$；\n- 所有被营销的目标客户（$\\text{TP} + \\text{FP}$）均发生营销成本：$C_{\\text{total}} = (\\text{TP} + \\text{FP}) \\times \\text{campaign_cost}$；\n- 活动净利润为：$\\text{Net Profit} = V_{\\text{gain}} - C_{\\text{total}}$。\n\n函数返回包含 `(tp, fp, round(net_profit, 2))` 的元组（其中 `tp` 和 `fp` 为整数，`net_profit` 为浮点数）。\n\n最后一行请以 `yt = [1, 1, 0, 0, 0]`, `yp = [0.9, 0.4, 0.7, 0.2, 0.1]`, `thresh = 0.5` 调用该函数测试。",
            "starterCode": "import numpy as np\nfrom typing import Tuple, List\n\ndef calculate_churn_campaign_roi(\n    y_true: List[int], y_probs: List[float], threshold: float,\n    ltv_recovered: float = 500.0, campaign_cost: float = 50.0\n) -> Tuple[int, int, float]:\n    \"\"\"计算在特定决策阈值下客户流失营销活动带来的 TP、FP 及企业净挽回利润\"\"\"\n    # 请在此实现\n    ___\n\nyt = [1, 1, 0, 0, 0]\nyp = [0.9, 0.4, 0.7, 0.2, 0.1]\nthresh = 0.5\ncalculate_churn_campaign_roi(yt, yp, thresh, ltv_recovered=500.0, campaign_cost=50.0)\n",
            "setupCode": "",
            "expectedOutput": "(1, 1, 400.0)",
            "answer": "import numpy as np\nfrom typing import Tuple, List\n\ndef calculate_churn_campaign_roi(\n    y_true: List[int], y_probs: List[float], threshold: float,\n    ltv_recovered: float = 500.0, campaign_cost: float = 50.0\n) -> Tuple[int, int, float]:\n    y_true = np.array(y_true, dtype=int)\n    y_probs = np.array(y_probs, dtype=float)\n    \n    preds = (y_probs >= threshold).astype(int)\n    tp = int(np.sum((y_true == 1) & (preds == 1)))\n    fp = int(np.sum((y_true == 0) & (preds == 1)))\n    \n    gain = tp * ltv_recovered\n    cost = (tp + fp) * campaign_cost\n    net_profit = gain - cost\n    \n    return tp, fp, round(float(net_profit), 2)\n\nyt = [1, 1, 0, 0, 0]\nyp = [0.9, 0.4, 0.7, 0.2, 0.1]\nthresh = 0.5\ncalculate_churn_campaign_roi(yt, yp, thresh, ltv_recovered=500.0, campaign_cost=50.0)\n",
            "tests": "yt_t = [1, 0]\nyp_t = [0.8, 0.1]\ntp_res, fp_res, p_res = calculate_churn_campaign_roi(yt_t, yp_t, 0.5, 1000.0, 100.0)\n# 1 识别为正类 (TP=1), 0 识别为负类 (FP=0), profit = 1*1000 - 1*100 = 900.0\nassert tp_res == 1 and fp_res == 0 and p_res == 900.0, f\"测试不匹配: {tp_res}, {fp_res}, {p_res}\"\n",
            "explanation": "根据阈值划定营销干预名单，统计真阳性与假阳性数量，计算挽回客户资产价值与营销活动消耗总成本之差，得到活动真实净利润。",
            "tags": ["商业ROI", "电信流失", "混淆矩阵", "算法实战"],
            "related_lesson_id": "ml-eng-l5-2",
        },
        single_choice(
            ex_id="ml-eng-c5-ex7",
            question="在将机器学习微服务打包发布到生产环境时，采用 Docker 容器化技术（Containerization）能够解决的最核心工程痛点是什么？",
            options=[
                {"value": "A", "text": "将底层操作系统、Python 解释器版本、C++ 动态链接库与所有的依赖轮子（Wheels）固化为不可变环境镜像，彻底消除了‘在我的电脑上能跑、在服务器上就崩溃’的环境漂移问题"},
                {"value": "B", "text": "能够自动消除数据集中的缺失值和异常值"},
                {"value": "C", "text": "使模型永远不需要重新训练"},
                {"value": "D", "text": "将所有模型的参数压缩至 1KB 以内"},
            ],
            answer="A",
            explanation="Docker 镜像将代码、运行时、系统工具和库完整打包，提供轻量级的独立运行沙箱，彻底根治跨开发、测试和生产环境的‘依赖地狱’与版本漂移难题，是现代 MLOps 持续交付与弹性扩缩容的基础设施。",
            difficulty=1,
            related_lesson_id="ml-eng-l5-1",
            tags=["Docker", "容器化", "MLOps", "生产部署"],
        ),
    ]

    return chapter(
        chapter_id="ml-eng-c5",
        course_id="ml-engineering",
        order=5,
        title="工业级部署与端到端 Capstone 项目实战",
        goal="掌握 ONNX 极速推理与微服务持久化安全，完成电信客户流失预测端到端全流程 Capstone 实战与商业 ROI 调优。",
        lessons=lessons,
        exercises=exercises,
    )
