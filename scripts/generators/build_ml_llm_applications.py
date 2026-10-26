# -*- coding: utf-8 -*-
"""
Build script for Course 8: 大语言模型应用与进阶：RAG、微调与智能体系统 (ml-llm-applications)
"""

import sys
import os
import json

sys.path.append(os.path.dirname(__file__))

from ml_app_ch1 import get_chapter_1
from ml_app_ch2 import get_chapter_2
from ml_app_ch3 import get_chapter_3
from ml_app_ch4 import get_chapter_4
from ml_app_ch5 import get_chapter_5

def build_course():
    ch1 = get_chapter_1()
    ch2 = get_chapter_2()
    ch3 = get_chapter_3()
    ch4 = get_chapter_4()
    ch5 = get_chapter_5()

    course = {
        "id": "ml-llm-applications",
        "title": "大语言模型应用与进阶：RAG、微调与智能体系统",
        "description": "从提示词工程、结构化输出，到向量数据库 HNSW 索引、高级多路召回 RAG、LoRA/QLoRA 高效微调、KV Cache 与 vLLM 推理加速，以及 AI Agent 智能体工具调用全栈工程。",
        "domainId": "ml",
        "icon": "🚀",
        "color": "#ef4444",
        "series": "前沿",
        "estimatedHours": 32,
        "level": "高级",
        "chapters": [ch1, ch2, ch3, ch4, ch5]
    }

    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses"))
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "ml-llm-applications.json")

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(course, f, ensure_ascii=False, indent=2)

    print(f"Course built successfully: {out_path}")
    print(f"Total chapters: {len(course['chapters'])}")
    total_lessons = sum(len(c["lessons"]) for c in course["chapters"])
    total_exercises = sum(len(c["exercises"]) for c in course["chapters"])
    print(f"Total lessons: {total_lessons}")
    print(f"Total exercises: {total_exercises}")

if __name__ == "__main__":
    build_course()
