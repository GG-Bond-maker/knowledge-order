# -*- coding: utf-8 -*-
"""
Python 基础与数据处理 - 课程全量生成器与自动自测脚本
生成：content-data/courses/python-foundations-data.json
"""

import json
import os
import sys
import io
import contextlib

from pyf_ch1_to_ch4 import CHAPTER_1, CHAPTER_2, CHAPTER_3, CHAPTER_4
from pyf_ch5_to_ch8 import CHAPTER_5, CHAPTER_6, CHAPTER_7, CHAPTER_8
from pyf_ch9_to_ch12 import CHAPTER_9, CHAPTER_10, CHAPTER_11, CHAPTER_12

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
COURSES_DIR = os.path.join(ROOT_DIR, "content-data", "courses")

PYTHON_FOUNDATIONS_COURSE = {
    "id": "python-foundations-data",
    "title": "Python 基础与数据处理",
    "subtitle": "零基础系统入门 Python 编程、核心数据结构与现代数据清洗实战",
    "description": "面向完全零编程经验学员的系统化 Python 编程与数据处理硬核全景教程。本课程从计算机底层执行模型与第一行 print 代码讲起，循序渐进剖析内存引用、标量类型、分支循环流程控制、序列容器与哈希映射，精通健壮的函数设计与异常调试排错；随后平滑进阶至标准库文件处理、CSV/JSON 交换、NumPy 向量化矩阵加速与 pandas 表格数据分析；全课程以一个贯穿式真实电商销售与学员订单数据清洗聚合导出大作业结课。站内教学全文字讲义搭配可运行代码演示与多题型阶梯题库，零外部网课依赖，助你轻松掌握独立开发生产级数据处理脚本的硬核技能。",
    "icon": "Terminal",
    "color": "#0284c7",
    "domainId": "python-track",
    "prerequisites": [],
    "targetAudience": "完全零编程经验的初学者、希望系统重构 Python 知识体系的数据分析师、以及需要编写日常自动化数据脚本的职场从业人员",
    "estimatedHours": 45,
    "source": "builtin",
    "chapters": [
        CHAPTER_1,
        CHAPTER_2,
        CHAPTER_3,
        CHAPTER_4,
        CHAPTER_5,
        CHAPTER_6,
        CHAPTER_7,
        CHAPTER_8,
        CHAPTER_9,
        CHAPTER_10,
        CHAPTER_11,
        CHAPTER_12
    ]
}

def verify_code_snippets(course_data):
    print("\n==========================================")
    print("开始对课程全部 Demo 与 Code 习题执行沙箱自测")
    print("==========================================")
    
    total_demos = 0
    passed_demos = 0
    total_code_exercises = 0
    passed_code_exercises = 0
    
    for ch in course_data["chapters"]:
        # 1. 验证 Demos
        for lesson in ch["lessons"]:
            for d in lesson.get("demos", []):
                if d.get("lang") == "python":
                    total_demos += 1
                    code = d["code"]
                    buffer = io.StringIO()
                    try:
                        with contextlib.redirect_stdout(buffer):
                            exec(code, {})
                        passed_demos += 1
                    except Exception as e:
                        print(f"  [FAIL] Demo 运行失败 [{ch['id']} / {lesson['id']}]: {e}")
                        raise
        
        # 2. 验证 Code Exercises
        for ex in ch["exercises"]:
            if ex.get("type") == "code":
                total_code_exercises += 1
                full_test_script = (
                    ex.get("setupCode", "") + "\n" +
                    ex["answer"] + "\n" +
                    ex["tests"]
                )
                buffer = io.StringIO()
                try:
                    with contextlib.redirect_stdout(buffer):
                        exec(full_test_script, {})
                    passed_code_exercises += 1
                except Exception as e:
                    print(f"  [FAIL] 编程习题测试用例失败 [{ch['id']} / {ex['id']}]: {e}")
                    raise

    print(f"[OK] 课程代码全部通过自测：")
    print(f"  - 交互演示 (Demos): {passed_demos}/{total_demos} 全部通过")
    print(f"  - 编程习题 (Code Exercises): {passed_code_exercises}/{total_code_exercises} 全部通过")

def main():
    os.makedirs(COURSES_DIR, exist_ok=True)
    
    # 执行自动化代码自测
    verify_code_snippets(PYTHON_FOUNDATIONS_COURSE)
    
    out_path = os.path.join(COURSES_DIR, "python-foundations-data.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(PYTHON_FOUNDATIONS_COURSE, f, ensure_ascii=False, indent=2)
        
    print(f"\n[OK] 成功生成课程文件: {out_path}")
    print(f"  章节数: {len(PYTHON_FOUNDATIONS_COURSE['chapters'])}")
    total_lessons = sum(len(c['lessons']) for c in PYTHON_FOUNDATIONS_COURSE['chapters'])
    total_exercises = sum(len(c['exercises']) for c in PYTHON_FOUNDATIONS_COURSE['chapters'])
    print(f"  小节数: {total_lessons}")
    print(f"  习题数: {total_exercises}")

if __name__ == "__main__":
    main()
