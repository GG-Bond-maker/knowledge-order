# -*- coding: utf-8 -*-
"""
Build ml-python-data.json
"""

import sys
import os

# Ensure generator modules can be imported
sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from ml_data_ch1 import get_chapter_1
from ml_data_ch2 import get_chapter_2
from ml_data_ch3 import get_chapter_3
from ml_data_ch4 import get_chapter_4
from ml_data_ch5 import get_chapter_5

def main():
    chapters = [
        get_chapter_1(),
        get_chapter_2(),
        get_chapter_3(),
        get_chapter_4(),
        get_chapter_5(),
    ]

    course_data = course(
        course_id="ml-python-data",
        title="Python 与机器学习数据处理",
        subtitle="NumPy 向量化计算、Pandas 数据整理与防泄漏流水线工程",
        description="拒绝低效 Python 循环与黑盒调包，从底层内存模型直通工业级生产流水线。深入剖析 NumPy ndarray 连续内存布局与步长切片零拷贝奥秘，推导广播机制匹配法则与成对距离矩阵极速展开；掌握 Pandas 索引哲学与 category 内存压缩，实战 Split-Apply-Combine 组内相对特征与时序滚动窗口；深度辨析 MCAR/MAR/MNAR 缺失机制与指示器建模，掌握 Tukey IQR 稳健盖帽与高基数长尾治理；破译 Pearson、Spearman 与互信息非线性相关矩阵，搭建对抗验证精准排查协变量漂移；最终通过 Scikit-learn Pipeline 与 ColumnTransformer 筑牢杜绝数据泄漏的工业级工程防线。全套自包含可执行实验与阶梯式题库，助你精通数据处理全流程。",
        icon="🐍",
        color="#10b981",
        domain_id="ml",
        prerequisites=["Python 基础语法与面向对象基础"],
        target_audience="希望摆脱低效循环、掌握工业级数据清洗与端到端防泄漏特征流水线的数据科学家与算法工程师",
        estimated_hours=20,
        chapters=chapters,
        series_id="ml-python-data",
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses", "ml-python-data.json"))
    validate_and_save(course_data, out_path)

if __name__ == "__main__":
    main()
