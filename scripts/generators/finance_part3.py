# -*- coding: utf-8 -*-
"""
Financial Statements Analysis - Part 3: Chapters 13 to 18
"""

from finance_ch13 import get_chapter_13
from finance_ch14 import get_chapter_14
from finance_ch15 import get_chapter_15
from finance_ch16 import get_chapter_16
from finance_ch17 import get_chapter_17
from finance_ch18 import get_chapter_18

def get_chapters_13_to_18():
    return [
        get_chapter_13(),
        get_chapter_14(),
        get_chapter_15(),
        get_chapter_16(),
        get_chapter_17(),
        get_chapter_18(),
    ]

if __name__ == "__main__":
    chs = get_chapters_13_to_18()
    print(f"Loaded {len(chs)} chapters: {[ch['title'] for ch in chs]}")
