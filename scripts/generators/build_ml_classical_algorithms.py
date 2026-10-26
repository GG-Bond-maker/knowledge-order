# -*- coding: utf-8 -*-
"""
Build ml-classical-algorithms.json
"""

import sys
import os

sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from ml_algo_ch1 import get_chapter_1
from ml_algo_ch2 import get_chapter_2
from ml_algo_ch3 import get_chapter_3
from ml_algo_ch4 import get_chapter_4
from ml_algo_ch5 import get_chapter_5

def main():
    chapters = [
        get_chapter_1(),
        get_chapter_2(),
        get_chapter_3(),
        get_chapter_4(),
        get_chapter_5(),
    ]

    course_data = course(
        course_id="ml-classical-algorithms",
        title="经典机器学习算法：从数学推导到工业落地",
        subtitle="广义线性模型、决策树、SVM、Boosting提升树家族与无监督流形聚类",
        description="对标 Stanford CS229 与经典统计学习理论，深度推导并实现经典机器学习算法家族。涵盖 OLS 闭式解与几何投影、Ridge/Lasso 正则化、Logistic 回归凸性与 Hessian 矩阵证明、KNN 维数灾难与 KD-Tree 剪枝、朴素贝叶斯对数平滑、CART 决策树与基尼系数、支持向量机几何间隔与 RBF 无穷维核技巧、随机森林双重随机性与 OOB 评估、AdaBoost 指数损失推导、GBDT 负梯度拟合、XGBoost 二阶泰勒展开与 LightGBM 直方图加速、K-Means++ 概率采样与 DBSCAN 任意形状密度流形。全套自包含 Python 算法实现与高密度测验，奠定工业算法工程师坚实底座。",
        icon="⚡",
        color="#10b981",
        domain_id="ml",
        prerequisites=["ml-math", "ml-python-data", "ml-foundations"],
        target_audience="希望全面掌握经典机器学习算法数学推导、核心假设、实现细节与工业调优的算法工程师与高阶自学者",
        estimated_hours=24,
        chapters=chapters,
        series_id="ml-classical-algorithms",
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses", "ml-classical-algorithms.json"))
    validate_and_save(course_data, out_path)

if __name__ == "__main__":
    main()
