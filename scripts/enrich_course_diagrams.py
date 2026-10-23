# -*- coding: utf-8 -*-
"""
Enrich dbt-analytics-engineering.json and airflow-data-engineering.json with optimal diagrams.
"""

import json
import os
import sys

root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
dbt_path = os.path.join(root, "content-data", "courses", "dbt-analytics-engineering.json")
airflow_path = os.path.join(root, "content-data", "courses", "airflow-data-engineering.json")

print("Enrichment script ready.")
