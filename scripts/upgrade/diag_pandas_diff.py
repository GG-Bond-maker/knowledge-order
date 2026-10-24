# -*- coding: utf-8 -*-
"""诊断 pandas.ts 5 节的单字符差异。"""
import sys, os, json, io
sys.path.insert(0, os.path.dirname(__file__))
from _batch34_lib import js_unescape
from migrate_special_formats import find_lesson_value, original_from_wrapped

ROOT = r"D:\Python_Project\knowledge-order"
c = json.load(io.open(ROOT + "/content-data/courses/pandas.json", encoding="utf-8"))
jl = {l["id"]: l for ch in c["chapters"] for l in ch["lessons"]}
ts = io.open(ROOT + "/src/content/chapters/pandas.ts", encoding="utf-8").read()

for lid in ["pandas-l-1-1", "pandas-l-2-1"]:
    # 手动定位（pandas.ts 的 id 格式待探）
    import re
    m = re.search(r"id:\s*['\"]" + lid + "['\"]", ts)
    if not m:
        print(lid, ": TS 中无此 id"); continue
    ci = ts.find("content:", m.end())
    ts_text, end, kind = find_lesson_value(ts, lid)
    orig = original_from_wrapped(jl[lid]["content"])
    print(f"== {lid} kind={kind} ts={len(ts_text)} json={len(orig)}")
    for k in range(min(len(ts_text), len(orig))):
        if ts_text[k] != orig[k]:
            print("  diff@", k, "ts:", repr(ts_text[max(0,k-25):k+25]))
            print("           json:", repr(orig[max(0,k-25):k+25]))
            break
    else:
        longer = ts_text if len(ts_text) > len(orig) else orig
        which = "ts" if len(ts_text) > len(orig) else "json"
        print("  共同前缀；较长方 =", which, "尾部:", repr(longer[len(orig)-5 if which=='json' else len(orig)-5:][:40]))
