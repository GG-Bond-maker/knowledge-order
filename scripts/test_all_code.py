# -*- coding: utf-8 -*-
import sys
import io
import contextlib
from code_dbt import DBT_CHAPTER_CODE
from code_airflow import AIRFLOW_CHAPTER_CODE
from code_stats import STATS_CODE
from code_causal import CAUSAL_CODE
from code_finance import FINANCE_CODE

def run_code_safely(code_str, desc=""):
    buffer = io.StringIO()
    globals_dict = {}
    try:
        with contextlib.redirect_stdout(buffer):
            exec(code_str, globals_dict)
        return True, buffer.getvalue()
    except Exception as e:
        return False, f"Error in {desc}: {e}"

def test_chapter_style(course_name, chapter_code_dict):
    print(f"\n==========================================")
    print(f"Testing Course Code: {course_name}")
    print(f"==========================================")
    
    total_demos = 0
    passed_demos = 0
    total_exercises = 0
    passed_exercises = 0
    
    for ch_id, data in chapter_code_dict.items():
        # 1. Test Demos
        demos = data.get("demos", {})
        for lid, demo_info in demos.items():
            total_demos += 1
            code = demo_info["code"]
            ok, out = run_code_safely(code, f"Demo {lid} ({demo_info['title']})")
            if ok:
                passed_demos += 1
            else:
                print(f"  [FAIL] Demo FAILED [{lid}]: {out}")
                sys.exit(1)
                
        # 2. Test Code Exercises
        exercises = data.get("exercises", [])
        for ex in exercises:
            total_exercises += 1
            full_test_code = ex.get("setupCode", "") + "\n" + ex["answer"] + "\n" + ex["tests"]
            ok, out = run_code_safely(full_test_code, f"Exercise {ex['id']} ({ex['question'][:20]})")
            if ok:
                passed_exercises += 1
            else:
                print(f"  [FAIL] Exercise FAILED [{ex['id']}]: {out}")
                sys.exit(1)
                
    print(f"Course {course_name} Results:")
    print(f"  Demos: {passed_demos}/{total_demos} passed")
    print(f"  Code Exercises: {passed_exercises}/{total_exercises} passed")

def test_flat_style(course_name, flat_dict):
    print(f"\n==========================================")
    print(f"Testing Course Code: {course_name}")
    print(f"==========================================")
    
    total_demos = 0
    passed_demos = 0
    total_exercises = 0
    passed_exercises = 0
    
    demos = flat_dict.get("demos", {})
    for lid, demo_info in demos.items():
        total_demos += 1
        code = demo_info["code"]
        ok, out = run_code_safely(code, f"Demo {lid} ({demo_info['title']})")
        if ok:
            passed_demos += 1
        else:
            print(f"  [FAIL] Demo FAILED [{lid}]: {out}")
            sys.exit(1)
            
    exercises = flat_dict.get("exercises", [])
    for ex in exercises:
        total_exercises += 1
        full_test_code = ex.get("setupCode", "") + "\n" + ex["answer"] + "\n" + ex["tests"]
        ok, out = run_code_safely(full_test_code, f"Exercise {ex['id']} ({ex['question'][:20]})")
        if ok:
            passed_exercises += 1
        else:
            print(f"  [FAIL] Exercise FAILED [{ex['id']}]: {out}")
            sys.exit(1)
            
    print(f"Course {course_name} Results:")
    print(f"  Demos: {passed_demos}/{total_demos} passed")
    print(f"  Code Exercises: {passed_exercises}/{total_exercises} passed")

def test_json_course(filepath, course_name):
    import json
    print(f"\n==========================================")
    print(f"Testing Course Code: {course_name}")
    print(f"==========================================")
    with open(filepath, 'r', encoding='utf-8') as f:
        course = json.load(f)
    total_demos = 0
    passed_demos = 0
    total_exercises = 0
    passed_exercises = 0
    for ch in course['chapters']:
        for lesson in ch['lessons']:
            for d in lesson.get('demos', []):
                if d.get('lang') == 'python':
                    total_demos += 1
                    ok, out = run_code_safely(d['code'], f"Demo {lesson['id']} ({d.get('title', '')})")
                    if ok:
                        passed_demos += 1
                    else:
                        print(f"  [FAIL] Demo FAILED [{lesson['id']}]: {out}")
                        sys.exit(1)
        for ex in ch['exercises']:
            if ex.get('type') == 'code':
                total_exercises += 1
                full_test = ex.get('setupCode', '') + '\n' + ex['answer'] + '\n' + ex['tests']
                ok, out = run_code_safely(full_test, f"Exercise {ex['id']} ({ex['question'][:20]})")
                if ok:
                    passed_exercises += 1
                else:
                    print(f"  [FAIL] Exercise FAILED [{ex['id']}]: {out}")
                    sys.exit(1)
    print(f"Course {course_name} Results:")
    print(f"  Demos: {passed_demos}/{total_demos} passed")
    print(f"  Code Exercises: {passed_exercises}/{total_exercises} passed")

def main():
    test_chapter_style("dbt Analytics Engineering", DBT_CHAPTER_CODE)
    test_chapter_style("Apache Airflow Data Engineering", AIRFLOW_CHAPTER_CODE)
    test_flat_style("Probability & Statistics", STATS_CODE)
    test_flat_style("Causal Inference", CAUSAL_CODE)
    test_flat_style("Financial Statements", FINANCE_CODE)
    test_json_course("content-data/courses/python-foundations-data.json", "Python Foundations & Data Processing")
    test_json_course("content-data/courses/python-engineering-practices.json", "Python Engineering Practices")
    test_json_course("content-data/courses/python-llm-applications.json", "Python LLM Application Development")
    test_json_course("content-data/courses/python-agent-development.json", "Python Agent Development")
    print("\n[SUCCESS] ALL CODE IN ALL 9 COURSES EXECUTED AND PASSED 100%!\n")

if __name__ == "__main__":
    main()
