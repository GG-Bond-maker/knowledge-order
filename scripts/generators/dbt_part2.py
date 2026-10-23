# -*- coding: utf-8 -*-
"""
dbt Analytics Engineering - Part 2: Chapters 6 to 10
"""

from dbt_ch6 import get_chapter_6
from dbt_ch7 import get_chapter_7
from dbt_ch8 import get_chapter_8
from dbt_ch9 import get_chapter_9
from dbt_ch10 import get_chapter_10

def get_chapters_6_to_10():
    return [
        get_chapter_6(),
        get_chapter_7(),
        get_chapter_8(),
        get_chapter_9(),
        get_chapter_10(),
    ]
