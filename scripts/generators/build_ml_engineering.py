# -*- coding: utf-8 -*-
"""
Build ml-engineering.json
"""

import sys
import os

sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from ml_eng_ch1 import get_chapter_1
from ml_eng_ch2 import get_chapter_2
from ml_eng_ch3 import get_chapter_3
from ml_eng_ch4 import get_chapter_4
from ml_eng_ch5 import get_chapter_5

def main():
    chapters = [
        get_chapter_1(),
        get_chapter_2(),
        get_chapter_3(),
        get_chapter_4(),
        get_chapter_5(),
    ]

    course_data = course(
        course_id="ml-engineering",
        title="机器学习工程实践：特征工程、模型评估与工业落地产线",
        subtitle="从特征管道、不平衡学习、超参数优化到 SHAP 模型解释与全流程上线",
        description="系统打通机器学习从离线实验到生产落地的关键工程闭环。涵盖工业级平滑目标编码（Target Encoding）、WoE/IV 分箱、互信息与嵌入式特征选择、Scikit-Learn 生产级 Pipeline 与 ColumnTransformer 防泄漏封装；深度剖析 GroupKFold 实体隔离与时序未来穿越防范、混淆矩阵、ROC/PR-AUC 诊断本质、Platt 概率校准与业务成本损失矩阵最优阈值搜索；掌握 SMOTE 近邻凸插值与 Borderline-SMOTE、Focal Loss 动态梯度聚焦机制；精通 TPE 贝叶斯超参优化（Optuna）与自动剪枝、置换特征重要性 PFI、合作博弈论沙普利值四大公理与 SHAP 样本级局部归因；掌握 ONNX 跨语言高性能极速推理与电信客户流失预测端到端 Capstone 综合实战。全套自包含 Python 算法实现，打造工业级全栈算法工程师。",
        icon="🛠️",
        color="#f59e0b",
        domain_id="ml",
        prerequisites=["ml-math", "ml-python-data", "ml-foundations", "ml-classical-algorithms"],
        target_audience="希望全面掌握机器学习工程化规范、防泄漏检验、不平衡建模、超参调优、模型解释与商业化落地的算法工程师与数据科学家",
        estimated_hours=20,
        chapters=chapters,
        series_id="ml-engineering",
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses", "ml-engineering.json"))
    validate_and_save(course_data, out_path)

if __name__ == "__main__":
    main()
