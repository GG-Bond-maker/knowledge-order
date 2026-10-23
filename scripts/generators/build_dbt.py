# -*- coding: utf-8 -*-
"""
Build dbt-analytics-engineering.json
"""

import sys
import os

sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from dbt_part1 import get_chapters_1_to_5
from dbt_part2 import get_chapters_6_to_10

def main():
    chapters = []
    chapters.extend(get_chapters_1_to_5())
    chapters.extend(get_chapters_6_to_10())

    course_data = course(
        course_id="dbt-analytics-engineering",
        title="分析工程实战：dbt 与现代数据建模",
        subtitle="从 ELT 范式演进、Kimball 维度建模理论，到 dbt 工业级三层数仓、增量物化、Jinja 宏与语义层治理的全景指南",
        description="本课程对标 dbt 官方官方课程体系（dbt Fundamentals、Jinja & Macros、Advanced Modeling、Semantic Layer）并融合 MIT/UC Berkeley 数据系统设计精髓进行工业级重构。全课程以“软件工程引入数据转换”为主线，涵盖现代数据栈架构演进、Kimball 维度建模事实表与维度表规范、dbt 项目初始化与 DAG 依赖解耦、Staging/Intermediate/Marts 工业级三层数仓实战、View/Table/Incremental/Ephemeral 四大物化机制与滑动回溯窗口设计、Jinja 模板引擎与动态 SQL 编程、自定义通用测试与模型契约（Model Contracts）、SCD Type 2 缓慢变化维快照以及 MetricFlow 数据语义层治理。全课程零外部教材依赖，配备从基础到挑战级的多题型阶梯题库与详尽解析，助力零基础学员轻松进阶为具备大厂标准架构思维的专业分析工程师（Analytics Engineer）。",
        icon="Layers",
        color="#f97316",
        domain_id="data-engineering",
        prerequisites=["基础 SQL 查询语法（SELECT / JOIN / GROUP BY）"],
        target_audience="零基础转岗数据分析工程人员、传统数仓/ETL 工程师、希望掌握现代数据栈（MDS）规范的数据科学家与商业智能（BI）工程师",
        estimated_hours=45,
        chapters=chapters,
        series_id="data-engineering-foundations",
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses", "dbt-analytics-engineering.json"))
    validate_and_save(course_data, out_path)

if __name__ == "__main__":
    main()
