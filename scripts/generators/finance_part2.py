# -*- coding: utf-8 -*-
"""
Financial Statements Analysis - Part 2: Chapters 7 to 12
"""

from finance_ch7 import get_chapter_7
from finance_ch8 import get_chapter_8
from finance_ch9 import get_chapter_9
from finance_ch10 import get_chapter_10
from finance_ch11 import get_chapter_11
from finance_ch12 import get_chapter_12

def get_chapters_7_to_12():
    return [
        get_chapter_7(),
        get_chapter_8(),
        get_chapter_9(),
        get_chapter_10(),
        get_chapter_11(),
        get_chapter_12(),
    ]

if __name__ == "__main__":
    chs = get_chapters_7_to_12()
    print(f"Loaded {len(chs)} chapters: {[ch['title'] for ch in chs]}")
