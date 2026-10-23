# -*- coding: utf-8 -*-

# 1. Fix code_dbt.py
with open('scripts/code_dbt.py', 'r', encoding='utf-8') as f:
    t = f.read()
for i in range(1, 11):
    t = t.replace(f'"dbt-ch{i}":', f'"dbt-c{i}":')
with open('scripts/code_dbt.py', 'w', encoding='utf-8') as f:
    f.write(t)
print("Fixed code_dbt.py")

# 2. Fix code_airflow.py
with open('scripts/code_airflow.py', 'r', encoding='utf-8') as f:
    t = f.read()
for i in range(1, 11):
    t = t.replace(f'"airflow-ch{i}":', f'"airflow-c{i}":')
t = t.replace('"dbt-l1-4":', '"airflow-l1-4":')
with open('scripts/code_airflow.py', 'w', encoding='utf-8') as f:
    f.write(t)
print("Fixed code_airflow.py")

# 3. Fix code_stats.py
with open('scripts/code_stats.py', 'r', encoding='utf-8') as f:
    t = f.read()
t = t.replace('"stats-l1-1":', '"stats-foundations-l1-1":')
t = t.replace('"stats-l3-1":', '"stats-foundations-l3-1":')
t = t.replace('"stats-l10-1":', '"stats-foundations-l10-1":')
t = t.replace('"chapter_id": "stats-ch1"', '"chapter_id": "stats-foundations-c1"')
t = t.replace('"chapter_id": "stats-ch10"', '"chapter_id": "stats-foundations-c10"')
with open('scripts/code_stats.py', 'w', encoding='utf-8') as f:
    f.write(t)
print("Fixed code_stats.py")

# 4. Fix code_causal.py
with open('scripts/code_causal.py', 'r', encoding='utf-8') as f:
    t = f.read()
t = t.replace('"causal-l1-1":', '"causal-inference-l1-1":')
t = t.replace('"causal-l8-1":', '"causal-inference-l8-1":')
t = t.replace('"chapter_id": "causal-ch1"', '"chapter_id": "causal-inference-c1"')
t = t.replace('"chapter_id": "causal-ch8"', '"chapter_id": "causal-inference-c8"')
with open('scripts/code_causal.py', 'w', encoding='utf-8') as f:
    f.write(t)
print("Fixed code_causal.py")

# 5. Fix code_finance.py
with open('scripts/code_finance.py', 'r', encoding='utf-8') as f:
    t = f.read()
t = t.replace('"chapter_id": "finance-ch1"', '"chapter_id": "finance-c1"')
t = t.replace('"chapter_id": "finance-ch15"', '"chapter_id": "finance-c15"')
with open('scripts/code_finance.py', 'w', encoding='utf-8') as f:
    f.write(t)
print("Fixed code_finance.py")
