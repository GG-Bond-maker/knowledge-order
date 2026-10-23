# -*- coding: utf-8 -*-
"""
Apply visual and interactive diagrams to dbt and Airflow courses.
"""

import json
import os
import sys

from diagrams_dbt import DBT_DIAGRAMS
from diagrams_airflow import AIRFLOW_DIAGRAMS

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def apply_to_course(file_name, diagrams_dict):
    path = os.path.join(root, "content-data", "courses", file_name)
    with open(path, "r", encoding="utf-8") as f:
        course = json.load(f)

    updated_count = 0
    diagram_tag_count = 0

    for ch in course["chapters"]:
        for ls in ch["lessons"]:
            lid = ls["id"]
            if lid in diagrams_dict:
                diagram_content = diagrams_dict[lid]
                # Check if already applied
                if "### 核心图解" in ls["content"] or "### 核心架构图解" in ls["content"] or "### 核心职责图解" in ls["content"] or "### 原理图解" in ls["content"] or "### 痛点对比图解" in ls["content"]:
                    continue
                # Append diagram section cleanly
                ls["content"] = ls["content"] + "\n\n" + diagram_content
                updated_count += 1
                if "<Diagram" in diagram_content:
                    diagram_tag_count += 1

    with open(path, "w", encoding="utf-8") as f:
        json.dump(course, f, ensure_ascii=False, indent=2)

    print(f"Applied to {file_name}: {updated_count} lessons enriched with diagrams ({diagram_tag_count} interactive dynamic widgets).")

def main():
    apply_to_course("dbt-analytics-engineering.json", DBT_DIAGRAMS)
    apply_to_course("airflow-data-engineering.json", AIRFLOW_DIAGRAMS)

if __name__ == "__main__":
    main()
