# -*- coding: utf-8 -*-
"""
Build script for Course 7: Transformer 与大语言模型基础：从注意力机制到预训练架构 (ml-transformer-llm)
"""

import sys
import os
import json

sys.path.append(os.path.dirname(__file__))

from ml_tf_ch1 import get_chapter_1
from ml_tf_ch2 import get_chapter_2
from ml_tf_ch3 import get_chapter_3
from ml_tf_ch4 import get_chapter_4
from ml_tf_ch5 import get_chapter_5

def build_course():
    ch1 = get_chapter_1()
    ch2 = get_chapter_2()
    ch3 = get_chapter_3()
    ch4 = get_chapter_4()
    ch5 = get_chapter_5()

    course = {
        "id": "ml-transformer-llm",
        "title": "Transformer 与大语言模型基础：从注意力机制到预训练架构",
        "description": "从 Tokenization、自注意力机制数学推导，到 Transformer 编码器-解码器架构、RoPE 旋转位置编码、SwiGLU/RMSNorm 现代变体，以及 Causal LM 预训练、Scaling Laws 与对齐全景。",
        "domainId": "ml",
        "icon": "✨",
        "color": "#ec4899",
        "series": "前沿",
        "estimatedHours": 32,
        "level": "高级",
        "chapters": [ch1, ch2, ch3, ch4, ch5]
    }

    out_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "content-data", "courses"))
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "ml-transformer-llm.json")

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
