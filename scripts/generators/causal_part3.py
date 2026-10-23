# -*- coding: utf-8 -*-
"""
Causal Inference - Part 3: Chapters 12 to 16
"""

from causal_ch12 import get_chapter_12
from causal_ch13 import get_chapter_13
from causal_ch14 import get_chapter_14
from causal_ch15 import get_chapter_15
from causal_ch16 import get_chapter_16

def get_chapters_12_to_16():
    return [
        get_chapter_12(),
        get_chapter_13(),
        get_chapter_14(),
        get_chapter_15(),
        get_chapter_16(),
    ]

if __name__ == "__main__":
    chs = get_chapters_12_to_16()
    print(f"Loaded {len(chs)} chapters: {[ch['title'] for ch in chs]}")
