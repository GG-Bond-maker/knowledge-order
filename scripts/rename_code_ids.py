# -*- coding: utf-8 -*-
import re

# 1. Update code_dbt.py
with open('scripts/code_dbt.py', 'r', encoding='utf-8') as f:
    t = f.read()

# Replace dbt-c{i}-e11 with dbt-c{i}-code-1, and e12 with dbt-c{i}-code-2
t = re.sub(r'\"dbt-c(\d+)-e11\"', r'"dbt-c\1-code-1"', t)
t = re.sub(r'\"dbt-c(\d+)-e12\"', r'"dbt-c\1-code-2"', t)

with open('scripts/code_dbt.py', 'w', encoding='utf-8') as f:
    f.write(t)
print("Updated code_dbt.py exercise IDs")

# 2. Update code_airflow.py
with open('scripts/code_airflow.py', 'r', encoding='utf-8') as f:
    t = f.read()

t = re.sub(r'\"airflow-c(\d+)-e11\"', r'"airflow-c\1-code-1"', t)
t = re.sub(r'\"airflow-c(\d+)-e12\"', r'"airflow-c\1-code-2"', t)

with open('scripts/code_airflow.py', 'w', encoding='utf-8') as f:
    f.write(t)
print("Updated code_airflow.py exercise IDs")
