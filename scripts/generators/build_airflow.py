# -*- coding: utf-8 -*-
"""
Build airflow-data-engineering.json
"""

import sys
import os

sys.path.append(os.path.dirname(__file__))

from common import course, validate_and_save
from airflow_part1 import get_chapters_1_to_5
from airflow_part2 import get_chapters_6_to_10

def main():
    chapters = []
    chapters.extend(get_chapters_1_to_5())
    chapters.extend(get_chapters_6_to_10())

    course_data = course(
        course_id="airflow-data-engineering",
        title="数据管道编排：Apache Airflow 生产级实战",
        subtitle="从调度哲学、TaskFlow 范式到传感器异步事件、幂等补数与 dbt 联合生产实战全景指南",
        description="本课程对标 Apache Airflow 官方权威教程体系与一线大厂生产级最佳实践进行深度重构。全课程以“打造工业级高可用数据编排系统”为主线，彻底告别脆弱的 Crontab 脚本调度。内容覆盖从 Airflow 五大核心组件分布式架构与四大执行器权衡、首个工业级 DAG 与 default_args 弹性容灾配置、传统 Operators 与 Hook 通信底层、Airflow 2.0 现代 TaskFlow API 与 @task 装饰器范式革命、XCom 跨任务通信与大对象防崩法则，到高级任务拓扑与 Trigger Rules 触发规则矩阵、传感器（Sensors）与 Deferrable 异步触发器、数据感知调度（Datasets）、批处理调度因果律与 Pendulum 时区治理、三大幂等写入范式与防风暴历史回溯补数（Backfill），以及动态任务映射（Dynamic Task Mapping / expand）和 Airflow + dbt Cosmos 联合实战。全课程零外部教材依赖，配套阶梯式题库与详尽推导判分规约，助力学员从零构建具备大厂级自愈与弹性调度能力的生产级数据管道。",
        icon="GitBranch",
        color="#0284c7",
        domain_id="data-engineering",
        prerequisites=["基础 Python 编程基础（函数、字典、装饰器概念）与 SQL 查询基础"],
        target_audience="数据工程师、数据仓库/ETL 开发工程师、大数据平台运维人员、希望系统掌握生产级工作流编排的数据科学家与技术架构师",
        estimated_hours=50,
        chapters=chapters,
        series_id="data-engineering-foundations",
    )

    out_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses", "airflow-data-engineering.json"))
    validate_and_save(course_data, out_path)

if __name__ == "__main__":
    main()
