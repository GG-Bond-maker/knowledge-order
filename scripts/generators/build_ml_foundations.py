# -*- coding: utf-8 -*-
"""
Build ml-foundations.json
"""

import sys
import os

# Ensure generator modules can be imported
sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from ml_found_ch1 import get_chapter_1
from ml_found_ch2 import get_chapter_2
from ml_found_ch3 import get_chapter_3
from ml_found_ch4 import get_chapter_4
from ml_found_ch5 import get_chapter_5

def main():
    chapters = [
        get_chapter_1(),
        get_chapter_2(),
        get_chapter_3(),
        get_chapter_4(),
        get_chapter_5(),
    ]

    course_data = course(
        course_id="ml-foundations",
        title="机器学习导论与基本原理",
        subtitle="从假说空间、损失函数到偏差—方差权衡与无泄漏工程闭环",
        description="对标 Stanford CS229 与经典统计学习理论（ESL/ISLP），摒弃浮躁调包，深入算法骨髓。从 Mitchell 形式化定义与归纳偏置破冰，深刻推导均方误差的高斯最大似然对偶性，从头推导偏差—方差权衡恒等式，揭秘 L1 菱形等高线产生稀疏解的几何第一性原理，直击无泄漏交叉验证与全流程 Capstone 落地实战。全套自包含可运行实验与阶梯式题库，助你建立最坚实的机器学习底层认知框架。",
        icon="🧠",
        color="#6366f1",
        domain_id="ml",
        prerequisites=["python"],
        target_audience="希望彻底掌握机器学习第一性原理的自学者、数据科学家与 AI 算法工程师",
        estimated_hours=18,
        chapters=chapters,
        series_id="ml-foundations",
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses", "ml-foundations.json"))
    validate_and_save(course_data, out_path)

if __name__ == "__main__":
    main()
