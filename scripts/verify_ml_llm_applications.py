# -*- coding: utf-8 -*-
"""
Verification script for Course 8: ml-llm-applications
Validates:
1. JSON integrity
2. All 11 Lesson Python Demos execute and pass asserts
3. All Code Exercises execute answer + tests and pass asserts
"""

import json
import os
import sys

def verify():
    course_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "content-data", "courses", "ml-llm-applications.json"))
    with open(course_path, "r", encoding="utf-8") as f:
        course = json.load(f)

    print(f"=== 验证课程: {course['title']} ({course['id']}) ===")
    
    # 1. 验证 Lesson Demos
    demo_count = 0
    passed_demos = 0
    for ch in course["chapters"]:
        for l in ch["lessons"]:
            if "demos" in l:
                for d in l["demos"]:
                    if d.get("lang") == "python":
                        demo_count += 1
                        code = d["code"]
                        env = {}
                        try:
                            exec(code, env)
                            passed_demos += 1
                            print(f"  [Demo OK] {l['id']}: {d.get('title', 'Demo')}")
                        except Exception as e:
                            print(f"  [Demo FAIL] {l['id']}: {d.get('title', 'Demo')}")
                            print(f"    Error: {e}")
                            sys.exit(1)

    print(f"\nDemo 验证完成: {passed_demos}/{demo_count} 全部通过！\n")

    # 2. 验证 Code Exercises
    ex_count = 0
    passed_ex = 0
    for ch in course["chapters"]:
        for ex in ch["exercises"]:
            if ex.get("type") == "code":
                ex_count += 1
                answer_code = ex["answer"]
                test_code = ex.get("tests", "")
                full_code = answer_code + "\n" + test_code
                env = {}
                try:
                    exec(full_code, env)
                    passed_ex += 1
                    print(f"  [Code Exercise OK] {ex['id']}")
                except Exception as e:
                    print(f"  [Code Exercise FAIL] {ex['id']}")
                    print(f"    Error: {e}")
                    sys.exit(1)

    print("\nCode Exercise 验证完成: " + str(passed_ex) + "/" + str(ex_count) + " 全部通过！\n")
    print("SUCCESS: Course 8 ml-llm-applications 100% 验证通过！")

if __name__ == "__main__":
    verify()
