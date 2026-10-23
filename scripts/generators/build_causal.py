# -*- coding: utf-8 -*-
"""
Build causal-inference.json
"""

import sys
import os
from pathlib import Path

# Ensure generator modules can be imported
sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from causal_part1 import get_chapters_1_to_6
from causal_part2 import get_chapters_7_to_11
from causal_part3 import get_chapters_12_to_16

def main():
    chapters = []
    chapters.extend(get_chapters_1_to_6())
    chapters.extend(get_chapters_7_to_11())
    chapters.extend(get_chapters_12_to_16())

    course_data = course(
        course_id="causal-inference",
        title="因果推断：从问题到可信识别",
        subtitle="从潜在结果框架、因果图到准实验与双重机器学习的因果识别全景实战指南",
        description="本课程对标哈佛大学 Kosuke Imai 教授因果推断讲义及 Hernán & Robins 经典教材《Causal Inference: What If》，并全面融入近五年诺贝尔经济学奖得主（Card, Angrist, Imbens）及斯坦福 Athey、Chernozhukov 等学者的最新前沿成果。体系化覆盖潜在结果框架 (RCM)、DAG 因果图、随机对照实验 (RCT)、匹配加权、双重差分 (DID)、多期异质性 DID、工具变量 (IV)、断点回归 (RDD)、合成控制 (SCM)、面板固定效应、中介机制分析、CATE 因果森林以及双重机器学习 (DML)。全流程配套工业级算例、代码实现、六道因果防线自查与答辩避坑指南，零基础也可扎实进阶掌握科学严谨的因果识别能力。",
        icon="GitFork",
        color="#7C3AED",
        domain_id="data",
        prerequisites=["基础概率统计（条件概率、期望方差与一元回归直觉）"],
        target_audience="数据分析师、数据科学家、增长与策略产品经理、量化研究员、经济社科硕博及算法工程师",
        estimated_hours=110,
        chapters=chapters
    )

    output_path = Path(__file__).resolve().parent.parent.parent / "content-data" / "courses" / "causal-inference.json"
    validate_and_save(course_data, str(output_path))
    print(f"Successfully generated causal-inference.json at {output_path}")

if __name__ == "__main__":
    main()
