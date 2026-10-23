# -*- coding: utf-8 -*-
"""
Python 大模型应用开发 - 课程全量生成器与自动自测脚本
生成：content-data/courses/python-llm-applications.json
"""

import json
import os
import sys
import io
import contextlib

# 确保脚本所在目录加入 sys.path
sys.path.insert(0, os.path.dirname(__file__))

from llma_ch1_to_ch3 import CHAPTER_1, CHAPTER_2, CHAPTER_3
from llma_ch4_to_ch6 import CHAPTER_4, CHAPTER_5, CHAPTER_6
from llma_ch7_to_ch8 import CHAPTER_7, CHAPTER_8

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
COURSES_DIR = os.path.join(ROOT_DIR, "content-data", "courses")

PYTHON_LLM_COURSE = {
    "id": "python-llm-applications",
    "title": "Python 大模型应用开发",
    "subtitle": "从底层 API、结构化输出、提示词工程到 LangChain、LlamaIndex 与企业级 RAG 实战",
    "description": "专为具备 Python 基础与工程能力的开发者量身打造的大模型（LLM）工业级应用开发高阶实战课程。本课程不搞虚无缥缈的玩具 Demo，系统拆解现代企业大模型落地的完整技术栈：深入剖析 BPE 分词、自回归采样参数（Temperature/Top-P）与 OpenAI/DeepSeek 统一 API 异步高并发与 SSE 流式客户端；掌握 Pydantic v2 与 Strict Structured Outputs 约束解码，运用 Instructor 思想构建自愈纠错循环；系统化掌握 Few-Shot、思维链（CoT）推理、自洽性投票及防提示词注入安全护栏；深入长文档切块策略、向量嵌入数学几何本质与 MTEB 选型；掌握 HNSW 图索引、BM25 关键词匹配、RRF 倒数排名融合与 Cross-Encoder 二阶段重排检索漏斗；深度剖析 LangChain 0.3+ 架构演进与 LCEL 管道操作符底层原理；实战 LlamaIndex Document-Node 拓扑模型与 Refine 响应合成；最终全流程贯穿手写企业级知识库 RAG 问答引擎，实现置信度门禁拒答、段落级溯源引用与 Golden QA 自动化回归测试。全文字讲义搭配可运行代码沙箱与阶梯题库，零外部网课依赖。",
    "icon": "Cpu",
    "color": "#6366f1",
    "domainId": "python-track",
    "prerequisites": [
        "掌握 Python 基础语法与核心数据结构（学完《Python 基础与数据处理》）",
        "掌握面向对象设计、异常处理与模块化工程基础（建议先学《Python 工程实践》）",
        "了解 HTTP 网络请求、异步编程与 JSON 格式解析"
    ],
    "targetAudience": "希望系统掌握大语言模型落地应用开发技能的 Python 后端工程师、算法工程师、数据科学家、以及寻求构建企业私有知识库与 AI Native 产品的研发架构师",
    "estimatedHours": 40,
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
    verify_code_snippets(PYTHON_LLM_COURSE)
    
    out_path = os.path.join(COURSES_DIR, "python-llm-applications.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(PYTHON_LLM_COURSE, f, ensure_ascii=False, indent=2)
        
    print(f"\n[OK] 成功生成课程文件: {out_path}")
    print(f"  章节数: {len(PYTHON_LLM_COURSE['chapters'])}")
    total_lessons = sum(len(c['lessons']) for c in PYTHON_LLM_COURSE['chapters'])
    total_exercises = sum(len(c['exercises']) for c in PYTHON_LLM_COURSE['chapters'])
    print(f"  小节数: {total_lessons}")
    print(f"  习题数: {total_exercises}")

if __name__ == "__main__":
    main()
