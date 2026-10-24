# -*- coding: utf-8 -*-
"""批次37：methodology 5 节的数组格式迁移（.join 悬空预防版）。
复用 migrate_special_formats 的解析器 + join 修复。
"""
import sys, os, json, io
sys.path.insert(0, os.path.dirname(__file__))
from migrate_special_formats import find_lesson_value, original_from_wrapped
from _batch34_lib import to_ts

ROOT = r"D:\Python_Project\knowledge-order"
BT = chr(96)
P = os.path.join(ROOT, "content-data", "courses", "methodology.json")
TS = os.path.join(ROOT, "src", "content", "chapters", "methodology.ts")

course = json.load(io.open(P, encoding="utf-8"))
lessons = {l["id"]: l for ch in course["chapters"] for l in ch["lessons"]}
s = io.open(TS, encoding="utf-8").read()
norm = lambda t: " ".join(t.split())

ok = mismatch = 0
for lid in ["methodology-l-1-1", "methodology-l-1-2", "methodology-l-2-1",
            "methodology-l-2-2", "methodology-l-2-3"]:
    wrapped = lessons[lid]["content"].strip()
    orig_json = original_from_wrapped(wrapped)
    ts_text, end, kind = find_lesson_value(s, lid)
    if norm(ts_text) != norm(orig_json):
        mismatch += 1
        print("MISMATCH:", lid, len(ts_text), "vs", len(orig_json))
        continue
    ckey = s.rfind("content:", 0, end)
    # 数组可能带 .join('\n') 后缀：end 后若是 .join 则一并吞掉
    tail = s[end:end+20]
    consume_end = end
    if tail.startswith(".join("):
        consume_end = s.index(")", end) + 1
    s = s[:ckey] + "content: " + BT + "\n" + to_ts(wrapped) + "\n" + BT + s[consume_end:]
    ok += 1
    print("patched", lid)

io.open(TS, "w", encoding="utf-8", newline="\n").write(s)
# 同步预防: 数组残留 join（该方法同文件其他节）
PATTERN = BT + ".join(" + chr(39) + chr(92) + "n" + chr(39) + "),"
n = s.count(PATTERN)
if n:
    s = io.open(TS, encoding="utf-8").read().replace(PATTERN, BT + ",")
    io.open(TS, "w", encoding="utf-8", newline="\n").write(s)
    print("额外修复 .join 残留:", n)
