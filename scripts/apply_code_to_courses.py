# -*- coding: utf-8 -*-
"""
Apply runnable code demos and code exercises into course JSON files.
"""

import json
import os
import sys

from code_dbt import DBT_CHAPTER_CODE
from code_airflow import AIRFLOW_CHAPTER_CODE
from code_stats import STATS_CODE
from code_causal import CAUSAL_CODE
from code_finance import FINANCE_CODE

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

def apply_chapter_style(filename, chapter_code_dict):
    path = os.path.join(root, "content-data", "courses", filename)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    demos_added = 0
    exercises_added = 0

    for ch in data["chapters"]:
        ch_id = ch["id"]
        ch_code = chapter_code_dict.get(ch_id, {})
        
        # 1. Inject Demos to Lessons
        demos_dict = ch_code.get("demos", {})
        for ls in ch["lessons"]:
            lid = ls["id"]
            if lid in demos_dict:
                d_info = demos_dict[lid]
                existing_titles = [d.get("title") for d in ls.get("demos", [])]
                if d_info["title"] not in existing_titles:
                    if "demos" not in ls:
                        ls["demos"] = []
                    ls["demos"].append({
                        "title": d_info["title"],
                        "lang": d_info["lang"],
                        "code": d_info["code"]
                    })
                    demos_added += 1

        # 2. Inject Code Exercises to Chapter
        code_exercises = ch_code.get("exercises", [])
        existing_ex_ids = {e["id"] for e in ch["exercises"]}
        for ex in code_exercises:
            if ex["id"] not in existing_ex_ids:
                ch["exercises"].append(ex)
                exercises_added += 1

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Applied to {filename}: {demos_added} demos added, {exercises_added} code exercises added.")

def apply_flat_style(filename, flat_dict):
    path = os.path.join(root, "content-data", "courses", filename)
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)

    demos_added = 0
    exercises_added = 0

    demos_dict = flat_dict.get("demos", {})
    exercises_list = flat_dict.get("exercises", [])

    for ch in data["chapters"]:
        # 1. Demos
        for ls in ch["lessons"]:
            lid = ls["id"]
            if lid in demos_dict:
                d_info = demos_dict[lid]
                existing_titles = [d.get("title") for d in ls.get("demos", [])]
                if d_info["title"] not in existing_titles:
                    if "demos" not in ls:
                        ls["demos"] = []
                    ls["demos"].append({
                        "title": d_info["title"],
                        "lang": d_info["lang"],
                        "code": d_info["code"]
                    })
                    demos_added += 1

        # 2. Exercises (match chapter_id)
        existing_ex_ids = {e["id"] for e in ch["exercises"]}
        for ex in exercises_list:
            if ex.get("chapter_id") == ch["id"] and ex["id"] not in existing_ex_ids:
                # remove chapter_id from exercise object before appending
                ex_copy = dict(ex)
                del ex_copy["chapter_id"]
                ch["exercises"].append(ex_copy)
                exercises_added += 1

    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"Applied to {filename}: {demos_added} demos added, {exercises_added} code exercises added.")

def main():
    apply_chapter_style("dbt-analytics-engineering.json", DBT_CHAPTER_CODE)
    apply_chapter_style("airflow-data-engineering.json", AIRFLOW_CHAPTER_CODE)
    apply_flat_style("stats-foundations.json", STATS_CODE)
    apply_flat_style("causal-inference.json", CAUSAL_CODE)
    apply_flat_style("financial-statements.json", FINANCE_CODE)

if __name__ == "__main__":
    main()
