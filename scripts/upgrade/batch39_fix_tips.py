# -*- coding: utf-8 -*-
"""批次39：修复 112 处 tips 为字符串的数据 bug（Airflow 70 + dbt 42）。
tips 应为 [{kind, text}] 数组；字符串值转包装为 [{kind:'note', text:原串}]。
"""
import json, io

TARGETS = {
    "airflow-data-engineering": range(1, 11),
    "dbt-analytics-engineering": range(1, 11),
}
total = 0
for name in TARGETS:
    P = rf"D:\Python_Project\knowledge-order\content-data\courses\{name}.json"
    c = json.load(io.open(P, encoding="utf-8"))
    n = 0
    for ch in c["chapters"]:
        for l in ch["lessons"]:
            v = l.get("tips")
            if v is not None and not isinstance(v, list):
                if isinstance(v, str):
                    l["tips"] = [{"kind": "note", "text": v}]
                elif isinstance(v, dict):
                    l["tips"] = [v] if "kind" in v and "text" in v else [
                        {"kind": "note", "text": str(v)}]
                else:
                    l["tips"] = [{"kind": "note", "text": str(v)}]
                n += 1
    c["updatedAt"] = int(__import__("time").time() * 1000)
    json.dump(c, io.open(P, "w", encoding="utf-8", newline="\n"),
              ensure_ascii=False, indent=2)
    print(f"{name}: 修复 {n} 处 tips")
    total += n

# 全站复扫
bad = 0
import glob
for f in glob.glob(r"D:\Python_Project\knowledge-order\content-data\courses\*.json"):
    c = json.load(io.open(f, encoding="utf-8"))
    for ch in c.get("chapters", []):
        for l in ch.get("lessons", []):
            for k in ("tips", "demos"):
                v = l.get(k)
                if v is not None and not isinstance(v, list):
                    bad += 1
print("全站复扫非数组残留:", bad)
