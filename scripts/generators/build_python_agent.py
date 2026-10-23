# -*- coding: utf-8 -*-
"""
Python Agent 开发实战 - 课程全量生成器与自动自测脚本
生成：content-data/courses/python-agent-development.json
"""

import json
import os
import sys
import io
import contextlib

# 确保脚本所在目录加入 sys.path
sys.path.insert(0, os.path.dirname(__file__))

from agent_ch1_to_ch3 import CHAPTER_1, CHAPTER_2, CHAPTER_3
from agent_ch4_to_ch6 import CHAPTER_4, CHAPTER_5, CHAPTER_6
from agent_ch7_to_ch8 import CHAPTER_7, CHAPTER_8

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
COURSES_DIR = os.path.join(ROOT_DIR, "content-data", "courses")

PYTHON_AGENT_COURSE = {
    "id": "python-agent-development",
    "title": "Python Agent 开发实战",
    "subtitle": "自主智能体架构、工具调度、状态机循环、Multi-Agent 协作与生产安全落地的终极指南",
    "description": "专为追求构建下一代自主智能体系统的进阶开发者量身打造的工业级实战全景教程。本课程跳出简单的玩具 Demo，深入剖析 AI Agent 从理论认知到商业级落地的完整架构链路：透视 ReAct（Reasoning + Acting）思考-行动闭环本质，掌握死循环与重复动作指纹熔断防御；掌握 Python 函数反射机制自动编译 OpenAPI / JSON Schema 工具契约，实战海量工具向量动态路由与沙箱隔离；深入剖析 LangGraph 含环状态机拓扑、条件边分发、持久化检查点（Checkpointer）与时间旅行调试；建立包含短期工作记忆（Scratchpad 动态折叠）与长期情景记忆（Generative Agents 三维衰减评分检索）的双层认知中枢；掌握 Reflexion 言语强化自省闭环与 Plan-and-Execute 动态重规划；落地 CrewAI 角色扮演（Role/Goal/Backstory）多智能体层级协同网络与防踢皮球治理；攻克 OWASP Excessive Agency 安全红线，实现基于检查点中断的人工在回路（HITL）审批放行与 OpenInference 细粒度全链路追踪；最终全流程贯穿手写生产级全自主数据分析智能体，通过 Golden Task 自动化全回归评测矩阵。站内全文字讲义搭配可运行代码沙箱与阶梯题库，零外部网课依赖。",
    "icon": "Bot",
    "color": "#8b5cf6",
    "domainId": "python-track",
    "prerequisites": [
        "熟练掌握 Python 语法与面向对象设计（学完《Python 基础与数据处理》）",
        "具备模块化代码架构与自动化测试重构能力（建议先修《Python 工程实践》）",
        "深入理解 Prompt 工程、Function Calling 协议与 RAG 检索体系（建议先修《Python 大模型应用开发》）"
    ],
    "targetAudience": "寻求构建具有自主推理决策、动态工具调用、自我反思纠错与多智能体协同能力系统的研发架构师、AI 算法工程师、以及致力于探索下一代自动化企业软件的全栈开发者",
    "estimatedHours": 42,
    "source": "builtin",
    "chapters": [
        CHAPTER_1,
        CHAPTER_2,
        CHAPTER_3,
        CHAPTER_4,
        CHAPTER_5,
        CHAPTER_6,
        CHAPTER_7,
        CHAPTER_8
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
    verify_code_snippets(PYTHON_AGENT_COURSE)
    
    out_path = os.path.join(COURSES_DIR, "python-agent-development.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(PYTHON_AGENT_COURSE, f, ensure_ascii=False, indent=2)
        
    print(f"\n[OK] 成功生成课程文件: {out_path}")
    print(f"  章节数: {len(PYTHON_AGENT_COURSE['chapters'])}")
    total_lessons = sum(len(c['lessons']) for c in PYTHON_AGENT_COURSE['chapters'])
    total_exercises = sum(len(c['exercises']) for c in PYTHON_AGENT_COURSE['chapters'])
    print(f"  小节数: {total_lessons}")
    print(f"  习题数: {total_exercises}")

if __name__ == "__main__":
    main()
