# -*- coding: utf-8 -*-
"""
Verification script for ml-classical-algorithms
Executes all 15 Lesson Demos and all 5 Code Exercises.
"""

import json
import os
import sys

def main():
    course_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "content-data", "courses", "ml-classical-algorithms.json"))
    with open(course_path, "r", encoding="utf-8") as f:
        course = json.load(f)

    print(f"=== Verifying Course: {course['title']} ({course['id']}) ===")
    
    total_demos = 0
    passed_demos = 0
    total_code_ex = 0
    passed_code_ex = 0

    # 1. Verify Demos
    for ch in course["chapters"]:
        for les in ch["lessons"]:
            for d in les.get("demos", []):
                total_demos += 1
                demo_title = d.get("title", les["title"])
                code = d["code"]
                print(f"[Demo {total_demos}] {les['id']}: {demo_title}...", end=" ", flush=True)
                try:
                    env = {}
                    exec(code, env)
                    passed_demos += 1
                    print("PASSED")
                except Exception as e:
                    print(f"FAILED: {e}")
                    raise

    # 2. Verify Code Exercises
    for ch in course["chapters"]:
        for ex in ch.get("exercises", []):
            if ex.get("type") == "code":
                total_code_ex += 1
                ex_id = ex["id"]
                print(f"[Code Ex {total_code_ex}] {ex_id}: {ex.get('tags', ['Code'])[0]}...", end=" ", flush=True)
                answer_code = ex["answer"]
                setup_code = ex.get("setupCode", "")
                test_code = ex.get("tests", "")
                full_test_script = f"{setup_code}\n{answer_code}\n{test_code}"
                try:
                    env = {}
                    exec(full_test_script, env)
                    passed_code_ex += 1
                    print("PASSED")
                except Exception as e:
                    print(f"FAILED: {e}")
                    raise

    print(f"\n==========================================")
    print(f"Verification Results:")
    print(f"  Demos: {passed_demos}/{total_demos} passed")
    print(f"  Code Exercises: {passed_code_ex}/{total_code_ex} passed")
    print(f"==========================================")

if __name__ == "__main__":
    main()
