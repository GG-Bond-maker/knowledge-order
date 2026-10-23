# -*- coding: utf-8 -*-
"""
Apache Airflow Data Engineering - Part 1: Chapters 1 to 5
"""

from airflow_ch1 import get_chapter_1
from airflow_ch2 import get_chapter_2
from airflow_ch3 import get_chapter_3
from airflow_ch4 import get_chapter_4
from airflow_ch5 import get_chapter_5

def get_chapters_1_to_5():
    return [
        get_chapter_1(),
        get_chapter_2(),
        get_chapter_3(),
        get_chapter_4(),
        get_chapter_5(),
    ]
