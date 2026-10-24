# -*- coding: utf-8 -*-
"""修复批次33遗留：数组格式课程（pandas ch1-3）替换后残留的 .join('\\n') 悬空调用。
模式：content: `...模板...`.join('\n'),  ->  content: `...模板...`,
"""
import io, os

ROOT = r"D:\Python_Project\knowledge-order"
BT = chr(96)
BS = chr(92)

FILES = [
    "src/content/chapters/pandas/ch1.ts", "src/content/chapters/pandas/ch2.ts",
    "src/content/chapters/pandas/ch3.ts", "src/content/chapters/pandas/ch4.ts",
    "src/content/chapters/pandas/ch5.ts", "src/content/chapters/pandas.ts",
    "src/content/chapters/viz.ts", "src/content/chapters/viz-extra.ts",
]

PATTERN = BT + ".join(" + chr(39) + BS + "n" + chr(39) + "),"
REPLACE = BT + ","

for f in FILES:
    fp = os.path.join(ROOT, f)
    if not os.path.exists(fp):
        continue
    s = io.open(fp, encoding="utf-8").read()
    n = s.count(PATTERN)
    if n:
        s = s.replace(PATTERN, REPLACE)
        io.open(fp, "w", encoding="utf-8", newline="\n").write(s)
    print(f, "-> 修复", n, "处")
