# -*- coding: utf-8 -*-
"""
dbt Analytics Engineering - Part 1: Chapters 1 to 5
"""

from dbt_ch1 import get_chapter_1
from dbt_ch2 import get_chapter_2
from dbt_ch3 import get_chapter_3
from dbt_ch4 import get_chapter_4
from dbt_ch5 import get_chapter_5

def get_chapters_1_to_5():
    return [
        get_chapter_1(),
        get_chapter_2(),
        get_chapter_3(),
        get_chapter_4(),
        get_chapter_5(),
    ]
