# -*- coding: utf-8 -*-
"""
Build stats-foundations.json
"""

import sys
import os

# Ensure generator modules can be imported
sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from stats_part1 import get_chapters_1_to_6
from stats_part2 import get_chapters_7_to_12
from stats_part3 import get_chapters_13_to_18

def main():
    chapters = []
    chapters.extend(get_chapters_1_to_6())
    chapters.extend(get_chapters_7_to_12())
    chapters.extend(get_chapters_13_to_18())

    course_data = course(
        course_id="stats-foundations",
        title="概率统计：从直觉到推断",
        subtitle="基于 MIT 18.05 体系重构，从随机变量、假说检验到多元回归与贝叶斯推断的全景实战指南",
        description="本课程对标 MIT 18.05 Introduction to Probability and Statistics 核心体系并进行全面本土化与工程化重构。课程摒弃脱离实际的纯枯燥定理背诵，以'直觉理解 - 严密数学 - 业务算例 - 诊断避坑'为四维坐标系，覆盖描述统计、概率公理、离散与连续分布、大数定律与中心极限定理、点估计与区间估计、假设检验决策矩阵、方差分析与多重比较、列联表卡方、相关与简单/多元线性回归、贝叶斯共轭推断与 A/B 测试、以及时间序列平稳性与辛普森悖论全景。全课程零外部教材依赖，配套阶梯式题库与详尽推导判分规约，让学习者从零基础直达量化分析与数据科学实战前沿。",
        icon="BarChart3",
        color="#2563EB",
        domain_id="data",
        prerequisites=["高中代数基础与简单微积分导数直觉（选修）"],
        target_audience="零基础数据分析师、数据科学与量化投研转岗人员、希望彻底搞懂统计推断与A/B测试内核的产品经理与算法工程师",
        estimated_hours=65,
        chapters=chapters,
        series_id="data-foundations",
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses", "stats-foundations.json"))
    validate_and_save(course_data, out_path)

if __name__ == "__main__":
    main()
