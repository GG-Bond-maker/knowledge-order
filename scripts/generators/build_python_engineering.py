# -*- coding: utf-8 -*-
"""
Python 工程实践 - 课程全量生成器与自动自测脚本
生成：content-data/courses/python-engineering-practices.json
"""

import json
import os
import sys
import io
import contextlib

# 确保脚本所在目录加入 sys.path
sys.path.insert(0, os.path.dirname(__file__))

from pep_ch1_to_ch3 import CHAPTER_1, CHAPTER_2, CHAPTER_3
from pep_ch4_to_ch6 import CHAPTER_4, CHAPTER_5, CHAPTER_6
from pep_ch7_to_ch9 import CHAPTER_7, CHAPTER_8, CHAPTER_9

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
COURSES_DIR = os.path.join(ROOT_DIR, "content-data", "courses")

PYTHON_ENGINEERING_COURSE = {
    "id": "python-engineering-practices",
    "title": "Python 工程实践",
    "subtitle": "面向生产级架构的规范演进、模块化设计、现代包管理与自动化测试重构",
    "description": "专为具备 Python 基础语法能力的学习者量身定制的高阶工程化实践教程。本课程彻底跳出简单单文件脚本思维，系统建立工业级软件工程心智模型：深入剖析 PEP 8/257 规范、Ruff 静态检查与 PEP 484/544 强类型注解；熟练驾驭 Poetry 与 uv 现代化依赖锁定与 pyproject.toml 规范打包；透视 Python 底层数据模型与 dunder 魔术方法，结合 dataclass 与 Pydantic 构建纯净业务领域模型；全方位掌握 pytest 自动化测试矩阵、Fixture 依赖注入与 Mock/Monkeypatch 隔离测试；贯彻 SOLID 五大面向对象原则与工厂、策略、单例经典设计模式；搭建标准层级自定义异常体系与 Loguru 结构化追踪日志；攻克生成器惰性管道与闭包装饰器切面；解密 CPython GIL 机制，实战多进程、线程池与 asyncio 异步高并发；最终通过手写一个生产级高可靠可插拔 ETL 数据清洗管道引擎，融合工厂策略、依赖注入、健全异常与测试矩阵，完成现代 Python 工程师的专业蜕变。站内教学全文字讲义搭配可运行代码演示与多题型阶梯题库，零外部网课依赖。",
    "icon": "Layers",
    "color": "#059669",
    "domainId": "python-track",
    "prerequisites": [
        "熟练掌握 Python 基础语法、常用数据结构与函数封装（学完《Python 基础与数据处理》或具备同等基础）",
        "熟悉计算机基本命令行（cd, ls/dir）与版本控制 Git 基础"
    ],
    "targetAudience": "已掌握 Python 基础语法的初中级开发者、希望摆脱“脚本小子”迈向正规军的数据分析师/算法工程师、以及寻求构建生产级稳健 Python 架构的工程团队成员",
    "estimatedHours": 38,
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
        CHAPTER_9
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
    verify_code_snippets(PYTHON_ENGINEERING_COURSE)
    
    out_path = os.path.join(COURSES_DIR, "python-engineering-practices.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(PYTHON_ENGINEERING_COURSE, f, ensure_ascii=False, indent=2)
        
    print(f"\n[OK] 成功生成课程文件: {out_path}")
    print(f"  章节数: {len(PYTHON_ENGINEERING_COURSE['chapters'])}")
    total_lessons = sum(len(c['lessons']) for c in PYTHON_ENGINEERING_COURSE['chapters'])
    total_exercises = sum(len(c['exercises']) for c in PYTHON_ENGINEERING_COURSE['chapters'])
    print(f"  小节数: {total_lessons}")
    print(f"  习题数: {total_exercises}")

if __name__ == "__main__":
    main()
