# -*- coding: utf-8 -*-
"""
Apache Airflow Data Engineering - Part 2: Chapters 6 to 10
"""

from airflow_ch6 import get_chapter_6
from airflow_ch7 import get_chapter_7
from airflow_ch8 import get_chapter_8
from airflow_ch9 import get_chapter_9
from airflow_ch10 import get_chapter_10

def get_chapters_6_to_10():
    return [
        get_chapter_6(),
        get_chapter_7(),
        get_chapter_8(),
        get_chapter_9(),
        get_chapter_10(),
    ]
