# -*- coding: utf-8 -*-
"""
Verify all demos and code exercises in ml-python-data.json
"""
import json
import io
import contextlib
import sys

def test_code(code_str, desc=""):
    buffer = io.StringIO()
    globals_dict = {}
    try:
        with contextlib.redirect_stdout(buffer):
            exec(code_str, globals_dict)
        return True, buffer.getvalue()
    except Exception as e:
        return False, f"Error in {desc}: {e}"

def main():
    with open("content-data/courses/ml-python-data.json", "r", encoding="utf-8") as f:
        course = json.load(f)

    print(f"=== Verifying Course: {course['title']} ===")
    total_demos = 0
    passed_demos = 0
    total_code_ex = 0
    passed_code_ex = 0

    for ch in course["chapters"]:
        print(f"\nChapter: {ch['title']}")
        for l in ch["lessons"]:
            demos = l.get("demos", [])
            for d in demos:
                total_demos += 1
                ok, out = test_code(d["code"], f"Demo in {l['id']}")
                if ok:
                    passed_demos += 1
                    print(f"  [PASS] Demo: {l['title'][:25]}")
                else:
                    print(f"  [FAIL] Demo in {l['id']}: {out}")
                    sys.exit(1)

        for ex in ch["exercises"]:
            if ex["type"] == "code":
                total_code_ex += 1
                full_code = ex.get("setupCode", "") + "\n" + ex["answer"] + "\n" + ex["tests"]
                ok, out = test_code(full_code, f"Code Ex: {ex['id']}")
                if ok:
                    passed_code_ex += 1
                    print(f"  [PASS] Code Exercise: {ex['id']} - {ex['question'][:25]}...")
                else:
                    print(f"  [FAIL] Code Exercise {ex['id']}: {out}")
                    sys.exit(1)

    print(f"\n==========================================")
    print(f"VERIFICATION SUMMARY for ml-python-data:")
    print(f"  Demos: {passed_demos}/{total_demos} Passed ({passed_demos/total_demos:.0%})")
    print(f"  Code Exercises: {passed_code_ex}/{total_code_ex} Passed ({passed_code_ex/total_code_ex:.0%})")
    print(f"==========================================")

if __name__ == "__main__":
    main()
