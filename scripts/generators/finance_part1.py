# -*- coding: utf-8 -*-
"""
Financial Statements Analysis - Part 1: Chapters 1 to 6
"""

from finance_ch1 import get_chapter_1
from finance_ch2 import get_chapter_2
from finance_ch3 import get_chapter_3
from finance_ch4 import get_chapter_4
from finance_ch5 import get_chapter_5
from finance_ch6 import get_chapter_6

def get_chapters_1_to_6():
    return [
        get_chapter_1(),
        get_chapter_2(),
        get_chapter_3(),
        get_chapter_4(),
        get_chapter_5(),
        get_chapter_6(),
    ]

if __name__ == "__main__":
    chs = get_chapters_1_to_6()
    print(f"Loaded {len(chs)} chapters: {[ch['title'] for ch in chs]}")
