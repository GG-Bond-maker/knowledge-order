# -*- coding: utf-8 -*-
"""
Build ml-math.json
"""

import sys
import os

# Ensure generator modules can be imported
sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from ml_math_ch1 import get_chapter_1
from ml_math_ch2 import get_chapter_2
from ml_math_ch3 import get_chapter_3
from ml_math_ch4 import get_chapter_4
from ml_math_ch5 import get_chapter_5
from ml_math_ch6 import get_chapter_6

def main():
    chapters = [
        get_chapter_1(),
        get_chapter_2(),
        get_chapter_3(),
        get_chapter_4(),
        get_chapter_5(),
        get_chapter_6(),
    ]

    course_data = course(
        course_id="ml-math",
        title="机器学习数学基础",
        subtitle="线性代数几何、多元微积分、贝叶斯推断与凸优化分析",
        description="对标 MIT 18.065（Gilbert Strang）与 Stanford CS229 数学讲义。打破传统大学高数、线代、概统脱离应用的枯燥教法，每个数学定义均直通机器学习实战：从正交投影推导最小二乘正规方程，从实对称谱定理剖析协方差主轴解耦与 SVD 最优低秩逼近；从柯西-施瓦茨不等式严密证明负梯度最速下降，从拓扑 DAG 反向模式揭秘大模型反向传播算力奇迹；从贝塞尔校正与多元高斯椭球几何直达极大似然与正则化对偶，从一阶支撑超平面与 Descent Lemma 严格推导梯度下降步长门槛与 KKT 互补松弛性。全套自包含可执行 Python 实验与严谨阶梯式题库，助你夯实算法核心内功。",
        icon="📐",
        color="#4f46e5",
        domain_id="ml",
        prerequisites=["无特殊前置要求，具备高中代数与解析几何基础即可"],
        target_audience="渴望从第一性原理透彻理解机器学习算法底层的学习者、考研与算法面试准备者、AI 研发工程师",
        estimated_hours=24,
        chapters=chapters,
        series_id="ml-math",
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses", "ml-math.json"))
    validate_and_save(course_data, out_path)

if __name__ == "__main__":
    main()
