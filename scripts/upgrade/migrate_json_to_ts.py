# -*- coding: utf-8 -*-
"""根治技术债①：把五门 JSON 源课的升级内容移植回 TS 源。
原理：升级后的 JSON content 结构固定——
  「### 核心概念与原理详解」到「### 完整案例（含手算）」之间 = 未升级时的原 JSON 原文。
校验：TS 模板体（js_unescape 后）必须与该原文一致，才允许替换为 to_ts(完整升级内容)。
"""
import sys, os, json, io
sys.path.insert(0, os.path.dirname(__file__))
from _batch34_lib import to_ts, js_unescape, find_content_block

ROOT = r"D:\Python_Project\knowledge-order"

COURSES = {
    "excel": ["src/content/chapters/excel.ts", "src/content/chapters/excel-extra.ts"],
    "methodology": ["src/content/chapters/methodology.ts",
                    "src/content/chapters/methodology-extra.ts",
                    "src/content/chapters/methodology-extra2.ts"],
    "pandas": ["src/content/chapters/pandas.ts",
               "src/content/chapters/pandas/ch1.ts", "src/content/chapters/pandas/ch2.ts",
               "src/content/chapters/pandas/ch3.ts", "src/content/chapters/pandas/ch4.ts",
               "src/content/chapters/pandas/ch5.ts"],
    "sql": ["src/content/chapters/sql.ts",
            "src/content/chapters/sql/ch1.ts", "src/content/chapters/sql/ch2.ts",
            "src/content/chapters/sql/ch3.ts", "src/content/chapters/sql/ch4.ts",
            "src/content/chapters/sql/ch5.ts", "src/content/chapters/sql/ch6.ts",
            "src/content/chapters/sql/extra.ts", "src/content/chapters/sql/extra2.ts"],
    "viz": ["src/content/chapters/viz.ts", "src/content/chapters/viz-extra.ts"],
}

SEC_START = "### 核心概念与原理详解"
SEC_END = "### 完整案例（含手算）"


def original_from_wrapped(content):
    i = content.index(SEC_START) + len(SEC_START)
    j = content.index(SEC_END, i)
    return content[i:j].strip("\n")


total = ok = mismatch = missing_ts = 0
for course_id, ts_files in COURSES.items():
    jp = os.path.join(ROOT, "content-data", "courses", course_id + ".json")
    course = json.load(io.open(jp, encoding="utf-8"))
    lessons = {l["id"]: l for ch in course["chapters"] for l in ch["lessons"]}
    ts_cache = {}
    for f in ts_files:
        ts_cache[f] = io.open(os.path.join(ROOT, f), encoding="utf-8").read()

    for lid, l in lessons.items():
        wrapped = l["content"].strip()
        if "学习目标" not in wrapped:
            print("SKIP(未包装):", lid)
            continue
        total += 1
        orig_json = original_from_wrapped(wrapped)
        target = None
        for f in ts_files:
            s = ts_cache[f]
            if "id: '%s'" % lid in s:
                target = (f, s)
                break
        if target is None:
            missing_ts += 1
            print("MISS-TS:", lid)
            continue
        f, s = target
        try:
            j, k = find_content_block(s, lid)
        except ValueError:
            missing_ts += 1
            print("NO-BLOCK:", lid)
            continue
        ts_orig = js_unescape(s[j:k]).strip()
        if ts_orig != orig_json:
            mismatch += 1
            print("MISMATCH:", lid, "| ts", len(ts_orig), "vs json", len(orig_json))
            continue
        # 校验通过：回写
        new_s = s[:j] + "\n" + to_ts(wrapped) + "\n" + s[k:]
        io.open(os.path.join(ROOT, f), "w", encoding="utf-8", newline="\n").write(new_s)
        ts_cache[f] = new_s
        ok += 1

print(f"\n迁移完成: 成功 {ok} / 总 {total} | 不一致 {mismatch} | TS 缺失 {missing_ts}")
